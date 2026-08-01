// Exponential isothermal atmosphere — a labeled simplification (no US Standard
// Atmosphere layers). Good enough to teach drag, max-Q, and why fairings exist.

import { ATMOSPHERE_TOP, RHO0, SCALE_HEIGHT } from '../constants';

/** Air density at altitude, kg/m^3. */
export function airDensity(alt: number): number {
  if (alt >= ATMOSPHERE_TOP) return 0;
  return RHO0 * Math.exp(-Math.max(alt, 0) / SCALE_HEIGHT);
}

/** Ambient pressure ratio vs sea level (1 at SL → 0 in vacuum). Blends engine thrust. */
export function pressureRatio(alt: number): number {
  if (alt >= ATMOSPHERE_TOP) return 0;
  return Math.exp(-Math.max(alt, 0) / SCALE_HEIGHT);
}

/**
 * Speed of sound vs altitude, m/s — crude two-segment approximation
 * (340 at sea level falling to ~295 at the tropopause, constant above).
 * Only used for the Mach readout and the "vehicle is supersonic" callout.
 */
export function speedOfSound(alt: number): number {
  const a = Math.max(alt, 0);
  if (a < 11_000) return 340 - (45 * a) / 11_000;
  return 295;
}
