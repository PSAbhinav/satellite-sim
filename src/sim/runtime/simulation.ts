// The phase orchestrator. Owns all mutable flight state and ties together
// ascent (RK4) → coast (closed-form Kepler) → circularization → orbit.
// Pure TS: no React, no Three, no wall-clock time, no Math.random().

import { DEG, G0, MU_EARTH, R_EARTH, RAD } from '../constants';
import type { Vec2 } from '../math/vec2';
import type { Vec3 } from '../math/vec3';
import { mag3 } from '../math/vec3';
import type { RocketDesign } from '../model/rocket';
import { liftoffTWR } from '../model/rocket';
import type { LaunchSite } from '../env/sites';
import { subSatellitePoint } from '../env/earth';
import { atmosphereVelocity } from '../dynamics/drag';
import type { AscentContext, AscentState } from '../dynamics/ascent';
import {
  computeDerived,
  rk4Step,
  timeToBoosterDepletion,
  timeToDepletion,
} from '../dynamics/ascent';
import { DEFAULT_PITCH_PROGRAM } from '../dynamics/steering';
import type { OrbitalElements } from '../orbit/elements';
import {
  elementsToState,
  periapsisRadius,
  period as orbitPeriod,
  stateToElements,
} from '../orbit/elements';
import { propagateElements, timeToApoapsis } from '../orbit/kepler';
import { classify } from '../orbit/classify';
import {
  availableDeltaV,
  circularizationDeltaV,
  circularizeHereDeltaV,
  propForDeltaV,
} from '../orbit/maneuvers';
import type { SimEvent } from './events';
import { makeEvent } from './events';
import type { FlightPhase, SimSnapshot, StageTelemetry } from './snapshot';

export interface MissionConfig {
  design: RocketDesign;
  site: LaunchSite;
  /** Target circular orbit altitude, m. */
  targetAltitude: number;
}

export interface MissionResult {
  outcome: 'orbit' | 'suborbital' | 'breakup' | 'escape' | 'crash';
  finalOrbit?: {
    apoapsisAlt: number;
    periapsisAlt: number;
    eccentricity: number;
    periodS: number;
  };
  targetAltitude: number;
  maxQ: number;
  maxG: number;
  dvShortfall?: number;
}

/**
 * Lift a launch-plane 2D vector into ECI: rotate about X by the inclination,
 * then about Z so the pad sits at the launch site's real longitude at t=0 —
 * the orbit must start over the actual spaceport, not a random meridian.
 */
function liftTo3D(p: Vec2, incRad: number, lonRad: number): Vec3 {
  // Mirror the 2D x so downrange maps to EASTWARD (prograde) motion — without
  // it the lifted orbit is retrograde (i = 180° − latitude).
  const x = -p.x;
  const y = p.y * Math.cos(incRad);
  const z = p.y * Math.sin(incRad);
  const c = Math.cos(lonRad);
  const s = Math.sin(lonRad);
  return {
    x: x * c - y * s,
    y: x * s + y * c,
    z,
  };
}

export class Simulation {
  phase: FlightPhase = 'pad';
  private cfg: MissionConfig | null = null;
  private ascent: AscentState | null = null;
  private ctx: AscentContext | null = null;
  private incRad = 0;
  private lonRad = 0;

  // Coast/orbit state (closed-form propagation).
  private elements: OrbitalElements | null = null;
  private elementsSetAtT = 0;
  private orbitMass = 0;
  private orbitProp = 0;

  // Orbit-insertion burn: planned, armed, then flown as a real finite burn.
  private burnPlan: { tIgnite: number; duration: number; dvTarget: number } | null = null;
  private burning = false;
  private burnDvDone = 0;
  // During the burn the raw state vector is integrated (Kepler doesn't hold
  // under thrust); handed back to closed-form elements at SECO-2.
  private burnR: Vec3 | null = null;
  private burnV: Vec3 | null = null;

  private t = 0;
  private downrangeAngle0 = 0;
  private maxAltitude = 0;
  private maxQ = 0;
  private maxG = 0;
  private prevQ = 0;
  private qFalling = false;
  private prevMach = 0;
  private events: SimEvent[] = [];
  private drainedCount = 0;
  result: MissionResult | null = null;

  configure(cfg: MissionConfig): void {
    this.cfg = cfg;
    this.phase = 'pad';
    this.t = 0;
    this.maxAltitude = 0;
    this.maxQ = 0;
    this.maxG = 0;
    this.prevQ = 0;
    this.qFalling = false;
    this.prevMach = 0;
    this.events = [];
    this.drainedCount = 0;
    this.result = null;
    this.elements = null;
    this.burnPlan = null;
    this.burning = false;
    this.burnDvDone = 0;
    this.burnR = null;
    this.burnV = null;

    const lat = cfg.site.latDeg * DEG;
    this.incRad = Math.abs(lat); // due-east launch: inclination = |latitude|
    // The lifted pad point sits at lon 90°; rotate it onto the real site.
    this.lonRad = (cfg.site.lonDeg - 90) * DEG;
    const atmFactor = Math.cos(lat);

    const r0: Vec2 = { x: 0, y: R_EARTH };
    this.downrangeAngle0 = Math.atan2(r0.y, r0.x);
    const drag = {
      refArea: cfg.design.refArea,
      cd: cfg.design.dragCoefficient,
      downrangeSign: 1,
      atmFactor,
    };
    // Sitting on the pad, the vehicle already moves with the rotating Earth —
    // this is the site's free Δv.
    const v0 = atmosphereVelocity(r0, 1, atmFactor);

    this.ascent = {
      t: 0,
      r: r0,
      v: v0,
      stageIndex: 0,
      propRemaining: cfg.design.stages[0].propMass,
      boosterProp: cfg.design.boosters
        ? cfg.design.boosters.spec.propMass * cfg.design.boosters.count
        : 0,
      boostersOn: !!cfg.design.boosters && cfg.design.boosters.count > 0,
      fairingOn: true,
      throttle: 1,
      engineOn: false,
    };
    // Adapt the gravity-turn profile to the vehicle: hot rockets (high TWR)
    // must stay vertical longer to exit dense air before speed builds; weak
    // ones need it to gain vertical speed before bending. The default is
    // tuned for Falcon-9-class TWR ≈ 1.45.
    const twr = liftoffTWR(cfg.design);
    const dev = Math.min(Math.abs(twr - 1.45), 1.2);
    const prog = {
      kickAltitude: DEFAULT_PITCH_PROGRAM.kickAltitude * (1 + dev * 2),
      kickDeg: Math.max(5, DEFAULT_PITCH_PROGRAM.kickDeg - dev * 12),
      followAltitude: DEFAULT_PITCH_PROGRAM.followAltitude * (1 + dev * 1.8),
    };
    this.ctx = { design: cfg.design, prog, drag };
  }

  ignite(): void {
    if (!this.ascent || this.phase !== 'pad') return;
    this.ascent.engineOn = true;
    this.phase = 'ascent';
    this.emit('LIFTOFF');
  }

  /**
   * Plan and arm the orbit-insertion burn — the way real missions do it.
   * Guidance computes the Δv, derives the burn duration from the engine's
   * true mass flow (no impulsive magic), and picks an ignition time that
   * centers the burn on apoapsis. The vehicle then relights automatically at
   * T-0 (SES-2) and steers along the remaining-Δv vector until cutoff.
   */
  armInsertionBurn(): void {
    if (this.phase !== 'coast' || !this.elements || !this.cfg || this.burnPlan) return;
    const elNow = propagateElements(this.elements, this.t - this.elementsSetAtT);
    const stage = this.cfg.design.stages[this.cfg.design.stages.length - 1];
    const dvNeed = circularizationDeltaV(elNow);
    const dvAvail = availableDeltaV(stage.engine.ispVac, this.orbitMass, this.orbitProp);
    const dvTarget = Math.min(dvNeed, dvAvail);

    const thrust = stage.engine.thrustVac * stage.engineCount;
    const mdot = thrust / (stage.engine.ispVac * G0);
    const duration = propForDeltaV(stage.engine.ispVac, this.orbitMass, dvTarget) / mdot;
    // Center the burn on the node: ignite half the burn duration early.
    const tIgnite = this.t + Math.max(0, timeToApoapsis(elNow) - duration / 2);

    this.burnPlan = { tIgnite, duration, dvTarget };
    this.burnDvDone = 0;
    this.emit('BURN_ARMED', {
      dv: Math.round(dvNeed),
      durationS: Math.round(duration),
      ignitionInS: Math.round(tIgnite - this.t),
    });
  }

  /** Advance the simulation by dt seconds (called from the fixed-step clock). */
  step(dt: number): void {
    if (this.phase === 'ascent') this.stepAscent(dt);
    else if (this.phase === 'coast' || this.phase === 'orbit') this.stepOrbit(dt);
    this.t += dt;
  }

  private stepAscent(dt: number): void {
    if (!this.ascent || !this.ctx || !this.cfg) return;
    const d = this.cfg.design;

    // Split the step at propellant/booster depletion so RK4 never integrates
    // across a discontinuity.
    let remaining = dt;
    while (remaining > 1e-9) {
      const tDep = Math.min(
        timeToDepletion(this.ascent, d),
        timeToBoosterDepletion(this.ascent, d),
      );
      const sub = Math.min(remaining, tDep > 0 ? tDep : remaining);
      this.ascent = rk4Step(this.ascent, this.ctx, sub);
      remaining -= sub;
      if (this.ascent.boostersOn && this.ascent.boosterProp <= 1e-6) {
        this.ascent.boostersOn = false; // casings drop
        this.emit('BOOSTER_SEP');
      }
      if (this.ascent.propRemaining <= 1e-6 && this.ascent.engineOn) this.handleBurnout();
      if (this.phase !== 'ascent') return;
    }

    const der = computeDerived(this.ascent, this.ctx);
    this.maxG = Math.max(this.maxG, der.accelG);

    // Threshold events.
    if (der.altitude > 150 && !this.flagged('TOWER_CLEARED')) this.emit('TOWER_CLEARED');
    if (
      der.altitude > this.ctx.prog.kickAltitude &&
      !this.flagged('PITCH_KICK')
    )
      this.emit('PITCH_KICK');
    if (der.mach >= 1 && this.prevMach < 1) this.emit('SUPERSONIC');
    this.prevMach = der.mach;

    // Max-Q: dq/dt sign flip.
    if (der.q > this.maxQ) this.maxQ = der.q;
    if (!this.qFalling && this.prevQ > 1_000 && der.q < this.prevQ) {
      this.qFalling = true;
      this.emit('MAX_Q', { q: Math.round(this.maxQ) });
    }
    this.prevQ = der.q;

    // Structural failure. Ascending = classic max-Q overspeed breakup;
    // descending = a suborbital flight ending in reentry breakup — different
    // lesson, different debrief.
    if (der.q > d.qMax) {
      if (der.verticalSpeed < 0) {
        this.emit('REENTRY', { q: Math.round(der.q) });
        this.emit('SUBORBITAL', {
          apoapsisKm: Math.round(this.maxAltitude / 1000),
          destroyedOnReentry: 1,
        });
        this.phase = 'failed';
        this.finish('suborbital');
      } else {
        this.emit('STRUCTURAL_FAILURE', { q: Math.round(der.q), qMax: d.qMax });
        this.phase = 'failed';
        this.finish('breakup');
      }
      return;
    }
    this.maxAltitude = Math.max(this.maxAltitude, der.altitude);

    // Fairing jettison.
    if (this.ascent.fairingOn && der.altitude >= d.fairing.jettisonAltitude) {
      this.ascent.fairingOn = false;
      this.emit('FAIRING_JETTISON');
    }

    // Crash (fell back).
    if (der.altitude < 0) {
      this.emit('REENTRY');
      this.phase = 'failed';
      this.finish('crash');
      return;
    }

    // Guidance cutoff: apoapsis reached target → SECO, hand off to coast.
    const el = this.currentElementsFromAscent();
    if (
      el.e < 1 &&
      el.a > 0 &&
      el.a * (1 + el.e) - R_EARTH >= this.cfg.targetAltitude &&
      this.ascent.stageIndex === d.stages.length - 1
    ) {
      this.ascent.engineOn = false;
      this.emit('SECO');
      this.enterCoast(el);
    }
  }

  private handleBurnout(): void {
    if (!this.ascent || !this.cfg) return;
    const d = this.cfg.design;
    // Strap-ons never ride past core staging — jettison with the core.
    if (this.ascent.boostersOn) {
      this.ascent.boostersOn = false;
      this.emit('BOOSTER_SEP');
    }
    const isLast = this.ascent.stageIndex >= d.stages.length - 1;

    if (!isLast) {
      this.emit('MECO');
      this.emit('STAGE_SEP');
      this.ascent.stageIndex += 1;
      this.ascent.propRemaining = d.stages[this.ascent.stageIndex].propMass;
      this.emit('STAGE_IGNITION');
      return;
    }

    // Last stage dry before reaching the target.
    this.emit('PROPELLANT_DEPLETED');
    const el = this.currentElementsFromAscent();
    const cls = classify(el);
    if (cls === 'suborbital') {
      this.emit('SUBORBITAL', {
        apoapsisKm: Math.round((el.a * (1 + el.e) - R_EARTH) / 1000),
        perigeeKm: Math.round((periapsisRadius(el) - R_EARTH) / 1000),
      });
      this.phase = 'failed';
      this.finish('suborbital');
    } else if (cls === 'escape') {
      this.emit('ESCAPE');
      this.phase = 'failed';
      this.finish('escape');
    } else {
      // Made some orbit without the planned margin — coast anyway.
      this.ascent.engineOn = false;
      this.emit('SECO');
      this.enterCoast(el);
    }
  }

  private enterCoast(el: OrbitalElements): void {
    if (!this.ascent || !this.ctx || !this.cfg) return;
    this.phase = 'coast';
    this.elements = el;
    this.elementsSetAtT = this.t;
    const d = this.cfg.design;
    const lastStage = d.stages[d.stages.length - 1];
    this.orbitProp = this.ascent.propRemaining;
    this.orbitMass =
      d.payload.mass + lastStage.dryMass + this.ascent.propRemaining +
      (this.ascent.fairingOn ? d.fairing.mass : 0);
  }

  private stepOrbit(dt: number): void {
    if (!this.elements) return;

    if (this.burning) {
      this.stepBurn(dt);
      return;
    }

    const dtSince = this.t - this.elementsSetAtT;
    const elNow = propagateElements(this.elements, dtSince);

    // Armed burn reaching its ignition time → SES-2: switch from closed-form
    // Kepler to numeric integration under thrust.
    if (this.burnPlan && this.burnDvDone === 0 && this.t + dt >= this.burnPlan.tIgnite) {
      const { r, v } = elementsToState(elNow);
      this.burnR = r;
      this.burnV = v;
      this.burning = true;
      this.emit('SES_2');
      this.stepBurn(dt);
      return;
    }

    // Reentry check: a coasting "orbit" that DESCENDS into the atmosphere ends
    // there — no Keplering through the planet. (Climbing out through 90 km
    // right after a low SECO is fine.)
    const { r, v } = elementsToState(elNow);
    const descending = r.x * v.x + r.y * v.y + r.z * v.z < 0;
    if (descending && mag3(r) < R_EARTH + 90e3) {
      this.emit('REENTRY');
      this.phase = 'failed';
      this.finish('suborbital');
      return;
    }

    if (
      this.phase === 'coast' &&
      !this.burnPlan &&
      timeToApoapsis(elNow) < 2 &&
      !this.recentlyFlagged('APOAPSIS', 30)
    ) {
      this.emit('APOAPSIS');
    }
  }

  /**
   * Finite insertion burn: inverse-square gravity + thrust steered along the
   * remaining circularization Δv vector (closed-loop guidance, like a real
   * upper stage), semi-implicit Euler at 50 ms substeps. Mass drains at the
   * engine's true mdot; cutoff when the residual Δv is spent or the tanks run
   * dry.
   */
  private stepBurn(dt: number): void {
    const d = this.cfg!.design;
    const stage = d.stages[d.stages.length - 1];
    const thrust = stage.engine.thrustVac * stage.engineCount;
    const mdot = thrust / (stage.engine.ispVac * G0);
    let r = this.burnR!;
    let v = this.burnV!;
    let remaining = dt;

    while (remaining > 1e-9) {
      const h = Math.min(0.05, remaining);
      remaining -= h;

      const need = circularizeHereDeltaV(r, v);
      if (need.mag < 2) {
        this.endBurn(r, v, 'nominal');
        return;
      }
      const aT = thrust / this.orbitMass;
      const ux = need.dv.x / need.mag;
      const uy = need.dv.y / need.mag;
      const uz = need.dv.z / need.mag;
      const rm = mag3(r);
      const g = -MU_EARTH / (rm * rm * rm);
      v = {
        x: v.x + (g * r.x + aT * ux) * h,
        y: v.y + (g * r.y + aT * uy) * h,
        z: v.z + (g * r.z + aT * uz) * h,
      };
      r = { x: r.x + v.x * h, y: r.y + v.y * h, z: r.z + v.z * h };
      this.orbitMass -= mdot * h;
      this.orbitProp -= mdot * h;
      this.burnDvDone += aT * h;

      if (this.orbitProp <= 0) {
        this.orbitProp = 0;
        this.emit('PROPELLANT_DEPLETED');
        this.endBurn(r, v, 'depleted');
        return;
      }
    }
    this.burnR = r;
    this.burnV = v;
  }

  private endBurn(r: Vec3, v: Vec3, how: 'nominal' | 'depleted'): void {
    this.burning = false;
    this.burnR = null;
    this.burnV = null;
    this.elements = stateToElements(r, v);
    this.elementsSetAtT = this.t;
    this.emit('SECO_2', { dv: Math.round(this.burnDvDone) });

    const cls = classify(this.elements);
    const residual = circularizeHereDeltaV(r, v).mag;
    if (cls === 'circular' || cls === 'elliptical') {
      this.phase = 'orbit';
      this.emit('ORBIT_ACHIEVED');
      this.finish('orbit', how === 'depleted' && residual > 2 ? residual : undefined);
    } else {
      this.phase = 'orbit'; // still flying, but the result records the shortfall
      this.finish(cls === 'suborbital' ? 'suborbital' : 'orbit', residual);
    }
  }

  /** In-plane 2D ascent state → 3D orbital elements via the launch-plane lift. */
  private currentElementsFromAscent(): OrbitalElements {
    const s = this.ascent!;
    const r3 = liftTo3D(s.r, this.incRad, this.lonRad);
    const v3 = liftTo3D(s.v, this.incRad, this.lonRad);
    return stateToElements(r3, v3);
  }

  private finish(outcome: MissionResult['outcome'], dvShortfall?: number): void {
    const el =
      this.elements ?? (this.ascent ? this.currentElementsFromAscent() : null);
    this.result = {
      outcome,
      targetAltitude: this.cfg?.targetAltitude ?? 0,
      maxQ: this.maxQ,
      maxG: this.maxG,
      dvShortfall,
      finalOrbit:
        el && el.e < 1 && el.a > 0
          ? {
              apoapsisAlt: el.a * (1 + el.e) - R_EARTH,
              periapsisAlt: periapsisRadius(el) - R_EARTH,
              eccentricity: el.e,
              periodS: orbitPeriod(el),
            }
          : undefined,
    };
  }

  private flagged(type: SimEvent['type']): boolean {
    return this.events.some((e) => e.type === type);
  }

  private recentlyFlagged(type: SimEvent['type'], withinS: number): boolean {
    return this.events.some((e) => e.type === type && this.t - e.t < withinS);
  }

  private emit(type: SimEvent['type'], data?: Record<string, number | string>): void {
    this.events.push(makeEvent(type, this.t, data));
  }

  /** Drain events accumulated since the last call (cold path → React store). */
  drainEvents(): SimEvent[] {
    const out = this.events.slice(this.drainedCount);
    this.drainedCount = this.events.length;
    return out;
  }

  /** Full event log (kept for the debrief timeline). */
  allEvents(): readonly SimEvent[] {
    return this.events;
  }

  snapshot(): SimSnapshot {
    if (this.phase === 'coast' || this.phase === 'orbit') return this.orbitSnapshot();
    return this.ascentSnapshot();
  }

  private ascentSnapshot(): SimSnapshot {
    const s = this.ascent!;
    const ctx = this.ctx!;
    const d = this.cfg!.design;
    const der = computeDerived(s, ctx);
    const angle = Math.atan2(s.r.y, s.r.x);
    const downrange = Math.abs(angle - this.downrangeAngle0) * R_EARTH;
    const rEci = liftTo3D(s.r, this.incRad, this.lonRad);
    const vEci = liftTo3D(s.v, this.incRad, this.lonRad);

    const stages: StageTelemetry[] = d.stages.map((st, i) => ({
      fuelFrac:
        i < s.stageIndex ? 0 : i === s.stageIndex ? s.propRemaining / st.propMass : 1,
      propRemaining: i < s.stageIndex ? 0 : i === s.stageIndex ? s.propRemaining : st.propMass,
      thrust: i === s.stageIndex ? der.thrust : 0,
    }));

    const el = this.currentElementsFromAscent();
    const showOrbit = der.altitude > 40_000 && el.e < 1 && el.a > 0;

    return {
      t: this.t,
      phase: this.phase,
      altitude: der.altitude,
      // Ascent telemetry shows surface-relative speed, like a real webcast —
      // starting from 0 on the pad instead of the Earth-rotation 400 m/s.
      speed: der.airspeed,
      verticalSpeed: der.verticalSpeed,
      downrange,
      mass: der.mass,
      thrust: der.thrust,
      twr: der.twr,
      q: der.q,
      maxQSoFar: this.maxQ,
      mach: der.mach,
      accelG: der.accelG,
      flightPathAngleDeg: der.flightPathAngleDeg,
      throttle: s.throttle,
      activeStage: s.stageIndex,
      stages,
      boosterFuelFrac:
        s.boostersOn && d.boosters
          ? s.boosterProp / (d.boosters.spec.propMass * d.boosters.count)
          : undefined,
      fairingOn: s.fairingOn,
      rEci,
      vEci,
      orbit: showOrbit
        ? {
            class: classify(el),
            apoapsisAlt: el.a * (1 + el.e) - R_EARTH,
            periapsisAlt: periapsisRadius(el) - R_EARTH,
            eccentricity: el.e,
            inclinationDeg: el.i * RAD,
            periodS: el.e < 1 ? orbitPeriod(el) : 0,
            timeToApoapsisS: el.e < 1 ? timeToApoapsis(el) : 0,
            circDv: el.e < 1 ? circularizationDeltaV(el) : 0,
            availDv: 0,
          }
        : undefined,
      subpoint: subSatellitePoint(rEci, this.t),
    };
  }

  private orbitSnapshot(): SimSnapshot {
    const d = this.cfg!.design;
    const lastStage = d.stages[d.stages.length - 1];
    // Under thrust the truth lives in the integrated state vector, not the
    // (stale) Kepler elements.
    const live =
      this.burning && this.burnR && this.burnV
        ? { r: this.burnR, v: this.burnV }
        : elementsToState(propagateElements(this.elements!, this.t - this.elementsSetAtT));
    const { r, v } = live;
    const el = this.burning ? stateToElements(r, v) : propagateElements(this.elements!, this.t - this.elementsSetAtT);
    const speed = mag3(v);
    const alt = mag3(r) - R_EARTH;
    // Pre-burn, quote the cost of the burn guidance will actually plan (at
    // apoapsis — the cheapest point); while burning, the live residual.
    const dvNeed = this.burning
      ? circularizeHereDeltaV(r, v).mag
      : el.e < 1 && el.a > 0
        ? circularizationDeltaV(el)
        : circularizeHereDeltaV(r, v).mag;
    const dvAvail = availableDeltaV(lastStage.engine.ispVac, this.orbitMass, this.orbitProp);
    const thrustNow = this.burning ? lastStage.engine.thrustVac * lastStage.engineCount : 0;
    const gNow = thrustNow > 0 ? thrustNow / (this.orbitMass * G0) : 0;

    const stages: StageTelemetry[] = d.stages.map((st, i) => ({
      fuelFrac: i === d.stages.length - 1 ? this.orbitProp / st.propMass : 0,
      propRemaining: i === d.stages.length - 1 ? this.orbitProp : 0,
      thrust: i === d.stages.length - 1 ? thrustNow : 0,
    }));

    return {
      t: this.t,
      phase: this.phase,
      altitude: alt,
      speed,
      verticalSpeed: 0,
      downrange: 0,
      mass: this.orbitMass,
      thrust: thrustNow,
      twr: gNow,
      q: 0,
      maxQSoFar: this.maxQ,
      mach: 0,
      accelG: gNow,
      flightPathAngleDeg: 0,
      throttle: this.burning ? 1 : 0,
      activeStage: d.stages.length - 1,
      stages,
      fairingOn: false,
      rEci: r,
      vEci: v,
      orbit: {
        class: classify(el),
        apoapsisAlt: el.a * (1 + el.e) - R_EARTH,
        periapsisAlt: periapsisRadius(el) - R_EARTH,
        eccentricity: el.e,
        inclinationDeg: el.i * RAD,
        periodS: orbitPeriod(el),
        timeToApoapsisS: timeToApoapsis(el),
        circDv: dvNeed,
        availDv: dvAvail,
      },
      burn: this.burnPlan
        ? {
            armed: true,
            burning: this.burning,
            tToIgnitionS: this.burnPlan.tIgnite - this.t,
            durationS: this.burnPlan.duration,
            dvPlanned: this.burnPlan.dvTarget,
            frac:
              this.burnPlan.dvTarget > 0
                ? Math.min(1, this.burnDvDone / this.burnPlan.dvTarget)
                : 0,
          }
        : undefined,
      subpoint: subSatellitePoint(r, this.t),
    };
  }

  /**
   * Full orbit path points (ECI) for rendering the orbit line, n samples.
   * Under thrust the osculating orbit is recomputed from the live integrated
   * state each call, so the drawn ellipse visibly grows through the burn.
   */
  orbitPathPoints(n = 128): Vec3[] {
    const el =
      this.burning && this.burnR && this.burnV
        ? stateToElements(this.burnR, this.burnV)
        : this.elements;
    if (!el || el.e >= 1 || el.a <= 0) return [];
    const pts: Vec3[] = [];
    for (let k = 0; k <= n; k++) {
      const nu = (2 * Math.PI * k) / n;
      const { r } = elementsToState({ ...el, nu });
      pts.push(r);
    }
    return pts;
  }
}
