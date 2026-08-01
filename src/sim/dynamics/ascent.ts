// Ascent equations of motion, integrated with RK4 in the inertial launch plane.
// State is Earth-centered: gravity is a clean inverse-square vector and the
// terminal (r, v) is directly a valid two-body state for the orbit layer.

import type { Vec2 } from '../math/vec2';
import { add2, mag2, scale2, sub2 } from '../math/vec2';
import { G0, R_EARTH } from '../constants';
import { gravityAccel } from '../env/gravity';
import { speedOfSound } from '../env/atmosphere';
import { massFlow } from '../model/engine';
import type { RocketDesign } from '../model/rocket';
import { massAboveStage, thrustAt } from '../model/rocket';
import type { DragContext } from './drag';
import { atmosphereVelocity, dragForce } from './drag';
import type { PitchProgram } from './steering';
import { thrustDirection } from './steering';

export interface AscentState {
  t: number;
  r: Vec2;
  v: Vec2;
  stageIndex: number;
  propRemaining: number; // kg in current stage
  fairingOn: boolean;
  throttle: number;
  engineOn: boolean;
}

export interface AscentDerived {
  altitude: number;
  speed: number;
  verticalSpeed: number;
  airspeed: number;
  mass: number;
  thrust: number;
  twr: number;
  q: number;
  mach: number;
  /** Felt (non-gravitational) acceleration in g. */
  accelG: number;
  flightPathAngleDeg: number;
}

export interface AscentContext {
  design: RocketDesign;
  prog: PitchProgram;
  drag: DragContext;
}

export function currentMass(s: AscentState, d: RocketDesign): number {
  if (s.stageIndex >= d.stages.length) {
    return d.payload.mass + (s.fairingOn ? d.fairing.mass : 0);
  }
  const stage = d.stages[s.stageIndex];
  return massAboveStage(d, s.stageIndex, s.fairingOn) + stage.dryMass + s.propRemaining;
}

/** Total acceleration + bookkeeping at a given (r, v, mass) point. */
function accelAt(
  s: AscentState,
  r: Vec2,
  v: Vec2,
  prop: number,
  ctx: AscentContext,
): { a: Vec2; feltA: Vec2; q: number; airspeed: number; thrust: number; mass: number } {
  const d = ctx.design;
  const alt = mag2(r) - R_EARTH;
  const stageDone = s.stageIndex >= d.stages.length;
  const stage = stageDone ? null : d.stages[s.stageIndex];

  const state = { ...s, propRemaining: prop };
  const mass = currentMass(state, d);

  let aThrust: Vec2 = { x: 0, y: 0 };
  let thrust = 0;
  if (stage && s.engineOn && prop > 0 && s.throttle > 0) {
    thrust = thrustAt(stage, s.throttle, alt);
    // Steer along the AIR-relative velocity (zero angle of attack).
    const vRel = sub2(v, atmosphereVelocity(r, ctx.drag.downrangeSign, ctx.drag.atmFactor));
    const dir = thrustDirection(r, vRel, alt, ctx.drag.downrangeSign, ctx.prog);
    aThrust = scale2(dir, thrust / mass);
  }

  const { force, q, airspeed } = dragForce(r, v, ctx.drag);
  const aDrag = scale2(force, 1 / mass);
  const aGrav = gravityAccel(r);

  return {
    a: add2(add2(aThrust, aDrag), aGrav),
    feltA: add2(aThrust, aDrag),
    q,
    airspeed,
    thrust,
    mass,
  };
}

/**
 * One RK4 step of dt seconds. Callers are responsible for splitting steps at
 * discrete events (staging, depletion) — see runtime/simulation.ts.
 */
export function rk4Step(s: AscentState, ctx: AscentContext, dt: number): AscentState {
  const d = ctx.design;
  const stage = s.stageIndex < d.stages.length ? d.stages[s.stageIndex] : null;
  const burning = !!stage && s.engineOn && s.propRemaining > 0 && s.throttle > 0;
  const mdot = burning && stage ? massFlow(stage.engine) * stage.engineCount * s.throttle : 0;

  const prop = (dtx: number) => Math.max(0, s.propRemaining - mdot * dtx);

  const k1 = accelAt(s, s.r, s.v, prop(0), ctx);
  const r2 = add2(s.r, scale2(s.v, dt / 2));
  const v2 = add2(s.v, scale2(k1.a, dt / 2));
  const k2 = accelAt(s, r2, v2, prop(dt / 2), ctx);
  const r3 = add2(s.r, scale2(v2, dt / 2));
  const v3 = add2(s.v, scale2(k2.a, dt / 2));
  const k3 = accelAt(s, r3, v3, prop(dt / 2), ctx);
  const r4 = add2(s.r, scale2(v3, dt));
  const v4 = add2(s.v, scale2(k3.a, dt));
  const k4 = accelAt(s, r4, v4, prop(dt), ctx);

  const rNext = add2(
    s.r,
    scale2(add2(add2(s.v, scale2(add2(v2, v3), 2)), v4), dt / 6),
  );
  const vNext = add2(
    s.v,
    scale2(add2(add2(k1.a, scale2(add2(k2.a, k3.a), 2)), k4.a), dt / 6),
  );

  return {
    ...s,
    t: s.t + dt,
    r: rNext,
    v: vNext,
    propRemaining: prop(dt),
  };
}

/** Seconds until the current stage's propellant runs dry at current throttle (Infinity if coasting). */
export function timeToDepletion(s: AscentState, d: RocketDesign): number {
  if (s.stageIndex >= d.stages.length || !s.engineOn || s.throttle <= 0) return Infinity;
  const stage = d.stages[s.stageIndex];
  const mdot = massFlow(stage.engine) * stage.engineCount * s.throttle;
  return mdot > 0 ? s.propRemaining / mdot : Infinity;
}

export function computeDerived(s: AscentState, ctx: AscentContext): AscentDerived {
  const { feltA, q, airspeed, thrust, mass } = accelAt(s, s.r, s.v, s.propRemaining, ctx);
  const alt = mag2(s.r) - R_EARTH;
  const speed = mag2(s.v);
  const rHat = scale2(s.r, 1 / mag2(s.r));
  const verticalSpeed = s.v.x * rHat.x + s.v.y * rHat.y;
  // Flight-path angle relative to the AIR (what a pilot/telemetry shows):
  // straight up at liftoff even though the inertial velocity is mostly the
  // Earth-rotation speed.
  const horizAir = Math.sqrt(Math.max(0, airspeed * airspeed - verticalSpeed * verticalSpeed));
  return {
    altitude: alt,
    speed,
    verticalSpeed,
    airspeed,
    mass,
    thrust,
    twr: thrust / (mass * G0),
    q,
    mach: airspeed / speedOfSound(alt),
    accelG: mag2(feltA) / G0,
    flightPathAngleDeg: (Math.atan2(verticalSpeed, horizAir) * 180) / Math.PI,
  };
}
