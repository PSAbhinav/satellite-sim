import { G0, MU_EARTH } from '../constants';
import type { OrbitalElements } from './elements';
import { apoapsisRadius } from './elements';

/**
 * Prograde Δv needed at apoapsis to circularize there. Vis-viva at apoapsis vs
 * circular speed at that radius.
 */
export function circularizationDeltaV(el: OrbitalElements, mu = MU_EARTH): number {
  const ra = apoapsisRadius(el);
  const vApo = Math.sqrt(mu * (2 / ra - 1 / el.a));
  const vCirc = Math.sqrt(mu / ra);
  return vCirc - vApo;
}

/** Δv available from remaining propellant via Tsiolkovsky, m/s. */
export function availableDeltaV(ispVac: number, massNow: number, propRemaining: number): number {
  if (propRemaining <= 0 || massNow <= propRemaining) return 0;
  return ispVac * G0 * Math.log(massNow / (massNow - propRemaining));
}

/** Propellant consumed to produce dv from massNow (inverse Tsiolkovsky), kg. */
export function propForDeltaV(ispVac: number, massNow: number, dv: number): number {
  return massNow * (1 - Math.exp(-dv / (ispVac * G0)));
}
