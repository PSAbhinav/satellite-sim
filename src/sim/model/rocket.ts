import { G0, MU_EARTH, R_EARTH } from '../constants';
import { pressureRatio } from '../env/atmosphere';
import type { EngineSpec } from './engine';
import { massFlow } from './engine';
import type { PayloadSpec } from './payload';

export interface StageSpec {
  id: string;
  name: string;
  engine: EngineSpec;
  engineCount: number;
  /** Structure-only mass, kg. */
  dryMass: number;
  /** Usable propellant, kg. */
  propMass: number;
}

export interface Fairing {
  mass: number; // kg
  /** Extra drag reference area while attached, m^2. */
  dragArea: number;
  /** Jettison altitude, m. */
  jettisonAltitude: number;
}

export interface RocketDesign {
  stages: StageSpec[]; // index 0 = first stage (fires first)
  payload: PayloadSpec;
  fairing: Fairing;
  /** Aerodynamic reference area, m^2. */
  refArea: number;
  dragCoefficient: number;
  /** Structural dynamic-pressure limit, Pa. */
  qMax: number;
}

export const stageWetMass = (s: StageSpec): number => s.dryMass + s.propMass;

export const grossMass = (d: RocketDesign): number =>
  d.payload.mass + d.fairing.mass + d.stages.reduce((m, s) => m + stageWetMass(s), 0);

/** Mass carried above stage i: payload + fairing (if attached) + all upper stages, wet. */
export function massAboveStage(d: RocketDesign, i: number, fairingOn = true): number {
  let m = d.payload.mass + (fairingOn ? d.fairing.mass : 0);
  for (let j = i + 1; j < d.stages.length; j++) m += stageWetMass(d.stages[j]);
  return m;
}

/** Tsiolkovsky Δv for stage i: Δv = Isp · g0 · ln(m0/mf). */
export function stageDeltaV(d: RocketDesign, i: number, vac = true): number {
  const s = d.stages[i];
  const isp = vac ? s.engine.ispVac : s.engine.ispSL;
  const above = massAboveStage(d, i);
  const m0 = above + stageWetMass(s);
  const mf = above + s.dryMass;
  return isp * G0 * Math.log(m0 / mf);
}

export const totalDeltaV = (d: RocketDesign): number =>
  d.stages.reduce((sum, _s, i) => sum + stageDeltaV(d, i, true), 0);

/** Thrust-to-weight ratio at liftoff (sea-level thrust, full stack). */
export const liftoffTWR = (d: RocketDesign): number =>
  (d.stages[0].engine.thrustSL * d.stages[0].engineCount) / (grossMass(d) * G0);

/** Burn time of a stage at full throttle, s. */
export const stageBurnTime = (s: StageSpec): number =>
  s.propMass / (massFlow(s.engine) * s.engineCount);

/** Pressure-blended thrust at altitude, N (sea-level ↔ vacuum). */
export function thrustAt(s: StageSpec, throttle: number, altitude: number): number {
  const blend = pressureRatio(altitude); // 1 at sea level → 0 in vacuum
  const perEngine = s.engine.thrustSL * blend + s.engine.thrustVac * (1 - blend);
  return perEngine * s.engineCount * throttle;
}

/**
 * Rough Δv needed to reach a circular orbit at `altitude`, from `siteBonus` m/s of
 * Earth-rotation credit. Circular speed + canonical ~1.6 km/s gravity/drag losses.
 * This is the "required Δv" bar in Vehicle Assembly — an estimate, clearly labeled.
 */
export function requiredDeltaV(altitude: number, siteBonus: number): number {
  const vCirc = Math.sqrt(MU_EARTH / (R_EARTH + altitude));
  const LOSSES = 1600; // m/s, typical combined gravity + drag + steering losses to LEO
  return vCirc + LOSSES - siteBonus;
}
