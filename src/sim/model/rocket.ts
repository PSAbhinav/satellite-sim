import { G0, MU_EARTH, R_EARTH } from '../constants';
import { pressureRatio } from '../env/atmosphere';
import type { EngineSpec } from './engine';
import { massFlow } from './engine';
import type { PayloadSpec } from './payload';

/** Real-world appearance data so the 3D builder shows the actual hardware. */
export interface StageVisual {
  /** Body diameter, m. */
  diameterM: number;
  /** Stage length, m. */
  lengthM: number;
  hull: 'white' | 'steel' | 'orange' | 'black' | 'bronze';
  gridFins?: boolean;
  /** Dark interstage band at the top (Falcon-style). */
  interstage?: boolean;
  /** Geometry profile: capsule (Apollo/Orion) and starship provide their own
      nose, so the stack gets no fairing above them. */
  shape?: 'stage' | 'capsule' | 'starship';
}

export type StageKind = 'booster' | 'solid' | 'upper' | 'spaceship' | 'kick';

export interface StageSpec {
  id: string;
  name: string;
  kind: StageKind;
  engine: EngineSpec;
  engineCount: number;
  /** Structure-only mass, kg. */
  dryMass: number;
  /** Usable propellant, kg. */
  propMass: number;
  /** Real vehicle this stage flies on (educational metadata). */
  heritage?: string;
  visual?: StageVisual;
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
  /** Strap-on side boosters burning in parallel with stage 0. */
  boosters?: { spec: StageSpec; count: number };
  payload: PayloadSpec;
  fairing: Fairing;
  /** Aerodynamic reference area, m^2. */
  refArea: number;
  dragCoefficient: number;
  /** Structural dynamic-pressure limit, Pa. */
  qMax: number;
}

export const stageWetMass = (s: StageSpec): number => s.dryMass + s.propMass;

export const boosterCount = (d: RocketDesign): number => d.boosters?.count ?? 0;
const boosterWet = (d: RocketDesign): number =>
  d.boosters ? stageWetMass(d.boosters.spec) * d.boosters.count : 0;

export const grossMass = (d: RocketDesign): number =>
  d.payload.mass +
  d.fairing.mass +
  boosterWet(d) +
  d.stages.reduce((m, s) => m + stageWetMass(s), 0);

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

/**
 * Total Δv. With side boosters, the first burn is a parallel phase: core +
 * boosters together until the boosters run dry (thrust-weighted effective
 * Isp), then booster casings drop and the core continues.
 */
export const totalDeltaV = (d: RocketDesign): number => {
  const serial = d.stages.reduce((sum, _s, i) => sum + stageDeltaV(d, i, true), 0);
  if (!d.boosters || d.boosters.count === 0) return serial;

  const b = d.boosters.spec;
  const n = d.boosters.count;
  const core = d.stages[0];
  const mdotB = massFlow(b.engine) * b.engineCount * n;
  const mdotC = massFlow(core.engine) * core.engineCount;
  const tB = (b.propMass * n) / mdotB; // booster burn time
  const corePropInPhase1 = Math.min(core.propMass, mdotC * tB);

  const m0 = grossMass(d);
  const m1 = m0 - b.propMass * n - corePropInPhase1;
  const thrustB = b.engine.thrustVac * b.engineCount * n;
  const thrustC = core.engine.thrustVac * core.engineCount;
  const ispEff =
    (thrustB + thrustC) / ((thrustB / b.engine.ispVac + thrustC / core.engine.ispVac) || 1);
  const dvPhase1 = ispEff * G0 * Math.log(m0 / m1);

  // Core continues alone with its remaining propellant (casings dropped).
  const above0 = massAboveStage(d, 0);
  const coreRemaining = core.propMass - corePropInPhase1;
  const m2 = above0 + core.dryMass + coreRemaining;
  const m2f = above0 + core.dryMass;
  const dvCoreRest = core.engine.ispVac * G0 * Math.log(m2 / m2f);

  const upperStages = d.stages.slice(1).reduce((sum, _s, i) => sum + stageDeltaV(d, i + 1, true), 0);
  return dvPhase1 + dvCoreRest + upperStages;
};

/** Thrust-to-weight ratio at liftoff (sea-level thrust, full stack + boosters). */
export const liftoffTWR = (d: RocketDesign): number => {
  const coreThrust = d.stages[0].engine.thrustSL * d.stages[0].engineCount;
  const boosterThrust = d.boosters
    ? d.boosters.spec.engine.thrustSL * d.boosters.spec.engineCount * d.boosters.count
    : 0;
  return (coreThrust + boosterThrust) / (grossMass(d) * G0);
};

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
