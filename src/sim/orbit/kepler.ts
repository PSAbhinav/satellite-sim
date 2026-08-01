// Closed-form two-body propagation via Kepler's equation. Zero drift and O(1)
// at any time offset — this is what makes 1000× time-warp exact instead of an
// integrator slowly spiraling the orbit.

import { MU_EARTH } from '../constants';
import { solveKepler } from '../math/rootfind';
import type { OrbitalElements } from './elements';
import { period } from './elements';

/** True anomaly → eccentric anomaly, rad. */
export function trueToEccentric(nu: number, e: number): number {
  return Math.atan2(Math.sqrt(1 - e * e) * Math.sin(nu), e + Math.cos(nu));
}

/** Eccentric anomaly → true anomaly, rad. */
export function eccentricToTrue(E: number, e: number): number {
  return Math.atan2(Math.sqrt(1 - e * e) * Math.sin(E), Math.cos(E) - e);
}

/** Eccentric anomaly → mean anomaly, rad. */
export const eccentricToMean = (E: number, e: number): number => E - e * Math.sin(E);

/**
 * Propagate elliptical elements forward by dt seconds (elements are unchanged
 * except true anomaly). Caller guarantees e < 1.
 */
export function propagateElements(el: OrbitalElements, dt: number, mu = MU_EARTH): OrbitalElements {
  const n = Math.sqrt(mu / (el.a * el.a * el.a)); // mean motion
  const E0 = trueToEccentric(el.nu, el.e);
  const M0 = eccentricToMean(E0, el.e);
  const M = M0 + n * dt;
  const E = solveKepler(M, el.e);
  return { ...el, nu: normalizeAngle(eccentricToTrue(E, el.e)) };
}

/** Time from current position to next periapsis passage, s. */
export function timeToPeriapsis(el: OrbitalElements, mu = MU_EARTH): number {
  const T = period(el, mu);
  const E = trueToEccentric(el.nu, el.e);
  const M = eccentricToMean(E, el.e);
  const frac = normalizeAngle(M) / (2 * Math.PI); // fraction of period since periapsis
  return T * (1 - frac);
}

/** Time from current position to next apoapsis passage, s. */
export function timeToApoapsis(el: OrbitalElements, mu = MU_EARTH): number {
  const T = period(el, mu);
  const tp = timeToPeriapsis(el, mu);
  // Apoapsis is half a period before periapsis.
  const ta = tp - T / 2;
  return ta > 0 ? ta : ta + T;
}

export function normalizeAngle(a: number): number {
  let x = a % (2 * Math.PI);
  if (x < 0) x += 2 * Math.PI;
  return x;
}
