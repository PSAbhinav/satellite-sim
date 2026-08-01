import { G0, MU_EARTH } from '../constants';
import type { Vec3 } from '../math/vec3';
import { cross3, mag3, norm3, scale3, sub3 } from '../math/vec3';
import type { OrbitalElements } from './elements';
import { apoapsisRadius } from './elements';

/**
 * The vector Δv that makes the orbit circular at the CURRENT radius: rotate
 * nothing, just match the local circular velocity along the horizontal
 * direction. Robust anywhere on the orbit (never produces an escape), and
 * naturally cheapest at apoapsis — which is exactly the lesson.
 */
export function circularizeHereDeltaV(r: Vec3, v: Vec3, mu = MU_EARTH): { dv: Vec3; mag: number } {
  const rMag = mag3(r);
  const h = cross3(r, v);
  // Horizontal (tangential) direction in the orbit plane, prograde sense:
  // h×r points along the motion for any orbit (check: r=x̂, v=ŷ ⇒ h=ẑ, h×r=ŷ).
  const tHat = norm3(cross3(h, r));
  const vDesired = scale3(tHat, Math.sqrt(mu / rMag));
  const dv = sub3(vDesired, v);
  return { dv, mag: mag3(dv) };
}

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
