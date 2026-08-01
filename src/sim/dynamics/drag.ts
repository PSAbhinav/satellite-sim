import type { Vec2 } from '../math/vec2';
import { mag2, scale2, sub2 } from '../math/vec2';
import { airDensity } from '../env/atmosphere';
import { OMEGA_EARTH, R_EARTH } from '../constants';

/**
 * Velocity of the co-rotating atmosphere at position r in the launch plane.
 * The eastward ground speed Ω·|r| appears along the downrange direction
 * (perpendicular to r), signed by the launch azimuth's downrange sign and
 * scaled by cos(latitude) folded into `atmFactor` at setup.
 */
export function atmosphereVelocity(r: Vec2, downrangeSign: number, atmFactor: number): Vec2 {
  const dist = mag2(r);
  const speed = OMEGA_EARTH * dist * atmFactor;
  // Unit vector perpendicular to r pointing downrange: (r.y, -r.x)/|r| · sign.
  return scale2({ x: (r.y / dist) * downrangeSign, y: (-r.x / dist) * downrangeSign }, speed);
}

export interface DragContext {
  refArea: number;
  cd: number;
  downrangeSign: number;
  /** cos(latitude) projection of the atmosphere's rotation into the launch plane. */
  atmFactor: number;
}

/** Drag force magnitude and the airspeed used for q/Mach, relative to the rotating air. */
export function dragForce(
  r: Vec2,
  v: Vec2,
  ctx: DragContext,
): { force: Vec2; q: number; airspeed: number } {
  const alt = mag2(r) - R_EARTH;
  const rho = airDensity(alt);
  if (rho === 0) return { force: { x: 0, y: 0 }, q: 0, airspeed: mag2(v) };

  const vAtm = atmosphereVelocity(r, ctx.downrangeSign, ctx.atmFactor);
  const vRel = sub2(v, vAtm);
  const speed = mag2(vRel);
  const q = 0.5 * rho * speed * speed;
  const fMag = q * ctx.cd * ctx.refArea;
  const dir = speed > 0 ? scale2(vRel, 1 / speed) : { x: 0, y: 0 };
  return { force: scale2(dir, -fMag), q, airspeed: speed };
}
