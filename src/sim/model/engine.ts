import { G0 } from '../constants';

export interface EngineSpec {
  id: string;
  name: string;
  /** Thrust at sea level, N (0 for vacuum-only engines). */
  thrustSL: number;
  /** Thrust in vacuum, N. */
  thrustVac: number;
  /** Specific impulse at sea level, s (0 for vacuum-only engines). */
  ispSL: number;
  /** Specific impulse in vacuum, s. */
  ispVac: number;
  /** Kid-friendly one-liner shown in the catalog. */
  blurb: string;
}

/** Propellant mass flow per engine, kg/s (constant; sized from vacuum performance). */
export const massFlow = (e: EngineSpec): number => e.thrustVac / (e.ispVac * G0);
