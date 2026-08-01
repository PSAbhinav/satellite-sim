// The phase orchestrator. Owns all mutable flight state and ties together
// ascent (RK4) → coast (closed-form Kepler) → circularization → orbit.
// Pure TS: no React, no Three, no wall-clock time, no Math.random().

import { DEG, R_EARTH, RAD } from '../constants';
import type { Vec2 } from '../math/vec2';
import type { Vec3 } from '../math/vec3';
import { mag3 } from '../math/vec3';
import type { RocketDesign } from '../model/rocket';
import type { LaunchSite } from '../env/sites';
import { subSatellitePoint } from '../env/earth';
import { atmosphereVelocity } from '../dynamics/drag';
import type { AscentContext, AscentState } from '../dynamics/ascent';
import { computeDerived, rk4Step, timeToDepletion } from '../dynamics/ascent';
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
      fairingOn: true,
      throttle: 1,
      engineOn: false,
    };
    this.ctx = { design: cfg.design, prog: DEFAULT_PITCH_PROGRAM, drag };
  }

  ignite(): void {
    if (!this.ascent || this.phase !== 'pad') return;
    this.ascent.engineOn = true;
    this.phase = 'ascent';
    this.emit('LIFTOFF');
  }

  /** Player-triggered circularization burn (cheapest at apoapsis). */
  circularize(): void {
    if (this.phase !== 'coast' || !this.elements || !this.cfg) return;
    // Propagate to *now* — the burn happens where the vehicle actually is,
    // not where it was at SECO.
    const elNow = propagateElements(this.elements, this.t - this.elementsSetAtT);
    const { r, v } = elementsToState(elNow);
    // Vector burn to the local circular velocity — safe anywhere on the orbit.
    const { dv: dvVec, mag: dvNeed } = circularizeHereDeltaV(r, v);
    const stage = this.cfg.design.stages[this.cfg.design.stages.length - 1];
    const dvAvail = availableDeltaV(stage.engine.ispVac, this.orbitMass, this.orbitProp);
    const dv = Math.min(dvNeed, dvAvail);

    const frac = dvNeed > 0 ? dv / dvNeed : 0;
    const vNew = {
      x: v.x + dvVec.x * frac,
      y: v.y + dvVec.y * frac,
      z: v.z + dvVec.z * frac,
    };
    const propUsed = propForDeltaV(stage.engine.ispVac, this.orbitMass, dv);
    this.orbitMass -= propUsed;
    this.orbitProp = Math.max(0, this.orbitProp - propUsed);

    this.elements = stateToElements(r, vNew);
    this.elementsSetAtT = this.t;
    this.emit('CIRCULARIZATION_BURN', { dv: Math.round(dv) });

    const cls = classify(this.elements);
    if (cls === 'circular' || cls === 'elliptical') {
      this.phase = 'orbit';
      this.emit('ORBIT_ACHIEVED');
      this.finish('orbit');
    } else if (dvAvail < dvNeed) {
      this.phase = 'orbit'; // still flying, but the result records the shortfall
      this.finish(cls === 'suborbital' ? 'suborbital' : 'orbit', dvNeed - dvAvail);
    }
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

    // Split the step at propellant depletion so RK4 never integrates across it.
    let remaining = dt;
    while (remaining > 1e-9) {
      const tDep = timeToDepletion(this.ascent, d);
      const sub = Math.min(remaining, tDep > 0 ? tDep : remaining);
      this.ascent = rk4Step(this.ascent, this.ctx, sub);
      remaining -= sub;
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

  private stepOrbit(_dt: number): void {
    if (!this.elements) return;
    const dtSince = this.t - this.elementsSetAtT;
    const elNow = propagateElements(this.elements, dtSince);

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
      timeToApoapsis(elNow) < 2 &&
      !this.recentlyFlagged('APOAPSIS', 30)
    ) {
      this.emit('APOAPSIS');
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
      speed: der.speed,
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
    const el = propagateElements(this.elements!, this.t - this.elementsSetAtT);
    const { r, v } = elementsToState(el);
    const d = this.cfg!.design;
    const lastStage = d.stages[d.stages.length - 1];
    const speed = mag3(v);
    const alt = mag3(r) - R_EARTH;
    const dvNeed = circularizeHereDeltaV(r, v).mag;
    const dvAvail = availableDeltaV(lastStage.engine.ispVac, this.orbitMass, this.orbitProp);

    const stages: StageTelemetry[] = d.stages.map((st, i) => ({
      fuelFrac: i === d.stages.length - 1 ? this.orbitProp / st.propMass : 0,
      propRemaining: i === d.stages.length - 1 ? this.orbitProp : 0,
      thrust: 0,
    }));

    return {
      t: this.t,
      phase: this.phase,
      altitude: alt,
      speed,
      verticalSpeed: 0,
      downrange: 0,
      mass: this.orbitMass,
      thrust: 0,
      twr: 0,
      q: 0,
      maxQSoFar: this.maxQ,
      mach: 0,
      accelG: 0,
      flightPathAngleDeg: 0,
      throttle: 0,
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
      subpoint: subSatellitePoint(r, this.t),
    };
  }

  /** Full orbit path points (ECI) for rendering the orbit line, n samples. */
  orbitPathPoints(n = 128): Vec3[] {
    if (!this.elements) return [];
    const pts: Vec3[] = [];
    for (let k = 0; k <= n; k++) {
      const nu = (2 * Math.PI * k) / n;
      const { r } = elementsToState({ ...this.elements, nu });
      pts.push(r);
    }
    return pts;
  }
}
