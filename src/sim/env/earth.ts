import { DEG, OMEGA_EARTH, RAD } from '../constants';
import type { Vec3 } from '../math/vec3';

/** Earth rotation angle since sim epoch, rad. */
export const earthRotationAngle = (tSinceEpoch: number): number =>
  (OMEGA_EARTH * tSinceEpoch) % (2 * Math.PI);

/** Rotate an ECI position into ECEF at time t. */
export function eciToEcef(r: Vec3, tSinceEpoch: number): Vec3 {
  const ang = -earthRotationAngle(tSinceEpoch);
  const c = Math.cos(ang);
  const s = Math.sin(ang);
  return { x: r.x * c - r.y * s, y: r.x * s + r.y * c, z: r.z };
}

/** Spherical-Earth geodetic conversion (fine for an educational ground track). */
export function ecefToLatLon(r: Vec3): { latDeg: number; lonDeg: number } {
  const lon = Math.atan2(r.y, r.x);
  const lat = Math.atan2(r.z, Math.hypot(r.x, r.y));
  return { latDeg: lat * RAD, lonDeg: lon * RAD };
}

/** Sub-satellite point for an ECI position at time t. */
export function subSatellitePoint(rEci: Vec3, tSinceEpoch: number): { latDeg: number; lonDeg: number } {
  return ecefToLatLon(eciToEcef(rEci, tSinceEpoch));
}

/** Eastward inertial speed of the ground at a latitude — the launch "rotation bonus", m/s. */
export const rotationBonus = (latDeg: number, rEq: number): number =>
  OMEGA_EARTH * rEq * Math.cos(latDeg * DEG);
