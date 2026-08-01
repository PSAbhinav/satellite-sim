// State vector ↔ Keplerian elements (3D). The ascent's 2D launch-plane state is
// lifted into 3D before entering this layer, so inclination/RAAN are meaningful.

import { MU_EARTH } from '../constants';
import type { Vec3 } from '../math/vec3';
import { add3, cross3, dot3, mag3, norm3, scale3, sub3 } from '../math/vec3';

export interface OrbitalElements {
  /** Semi-major axis, m (negative for hyperbolic). */
  a: number;
  e: number;
  /** Inclination, rad. */
  i: number;
  /** Right ascension of ascending node, rad. */
  raan: number;
  /** Argument of periapsis, rad. */
  argp: number;
  /** True anomaly, rad. */
  nu: number;
}

const EPS = 1e-11;

export function stateToElements(r: Vec3, v: Vec3, mu = MU_EARTH): OrbitalElements {
  const rMag = mag3(r);
  const vMag = mag3(v);

  const h = cross3(r, v);
  const hMag = mag3(h);
  const n = cross3({ x: 0, y: 0, z: 1 }, h); // node vector
  const nMag = mag3(n);

  // Eccentricity vector.
  const eVec = sub3(
    scale3(cross3(v, h), 1 / mu),
    scale3(r, 1 / rMag),
  );
  const e = mag3(eVec);

  const energy = (vMag * vMag) / 2 - mu / rMag;
  const a = Math.abs(energy) < EPS ? Infinity : -mu / (2 * energy);

  const i = Math.acos(Math.min(1, Math.max(-1, h.z / hMag)));

  let raan = 0;
  if (nMag > EPS) {
    raan = Math.acos(Math.min(1, Math.max(-1, n.x / nMag)));
    if (n.y < 0) raan = 2 * Math.PI - raan;
  }

  let argp = 0;
  if (nMag > EPS && e > EPS) {
    argp = Math.acos(Math.min(1, Math.max(-1, dot3(n, eVec) / (nMag * e))));
    if (eVec.z < 0) argp = 2 * Math.PI - argp;
  } else if (e > EPS) {
    // Equatorial: measure periapsis from +X.
    argp = Math.atan2(eVec.y, eVec.x);
    if (argp < 0) argp += 2 * Math.PI;
  }

  let nu: number;
  if (e > EPS) {
    nu = Math.acos(Math.min(1, Math.max(-1, dot3(eVec, r) / (e * rMag))));
    if (dot3(r, v) < 0) nu = 2 * Math.PI - nu;
  } else {
    // Circular: measure from the node (or +X if equatorial).
    const ref = nMag > EPS ? n : { x: 1, y: 0, z: 0 };
    nu = Math.acos(Math.min(1, Math.max(-1, dot3(ref, r) / (mag3(ref) * rMag))));
    const upComponent = nMag > EPS ? r.z : cross3(ref, r).z;
    if (upComponent < 0) nu = 2 * Math.PI - nu;
  }

  return { a, e, i, raan, argp, nu };
}

export function elementsToState(el: OrbitalElements, mu = MU_EARTH): { r: Vec3; v: Vec3 } {
  const { a, e, i, raan, argp, nu } = el;
  const p = a * (1 - e * e); // semi-latus rectum

  const rMag = p / (1 + e * Math.cos(nu));

  // Perifocal frame.
  const rPf = {
    x: rMag * Math.cos(nu),
    y: rMag * Math.sin(nu),
    z: 0,
  };
  const vScale = Math.sqrt(mu / p);
  const vPf = {
    x: -vScale * Math.sin(nu),
    y: vScale * (e + Math.cos(nu)),
    z: 0,
  };

  return { r: perifocalToEci(rPf, i, raan, argp), v: perifocalToEci(vPf, i, raan, argp) };
}

/** Rotate a perifocal-frame vector into ECI via Rz(raan)·Rx(i)·Rz(argp). */
export function perifocalToEci(p: Vec3, i: number, raan: number, argp: number): Vec3 {
  const cO = Math.cos(raan);
  const sO = Math.sin(raan);
  const ci = Math.cos(i);
  const si = Math.sin(i);
  const cw = Math.cos(argp);
  const sw = Math.sin(argp);

  return {
    x: (cO * cw - sO * sw * ci) * p.x + (-cO * sw - sO * cw * ci) * p.y + sO * si * p.z,
    y: (sO * cw + cO * sw * ci) * p.x + (-sO * sw + cO * cw * ci) * p.y + -cO * si * p.z,
    z: sw * si * p.x + cw * si * p.y + ci * p.z,
  };
}

export const apoapsisRadius = (el: OrbitalElements): number => el.a * (1 + el.e);
export const periapsisRadius = (el: OrbitalElements): number => el.a * (1 - el.e);

/** Orbital period, s (elliptical only). */
export const period = (el: OrbitalElements, mu = MU_EARTH): number =>
  2 * Math.PI * Math.sqrt((el.a * el.a * el.a) / mu);

/** Specific orbital energy, J/kg. */
export const specificEnergy = (r: Vec3, v: Vec3, mu = MU_EARTH): number =>
  (mag3(v) * mag3(v)) / 2 - mu / mag3(r);

/** Unit vectors for radial/prograde at a state (used for burns and rendering). */
export function progradeDir(v: Vec3): Vec3 {
  return norm3(v);
}

export function applyPrograde(v: Vec3, dv: number): Vec3 {
  return add3(v, scale3(progradeDir(v), dv));
}
