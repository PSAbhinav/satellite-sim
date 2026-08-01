import { MU_EARTH } from '../constants';
import type { Vec2 } from '../math/vec2';
import { mag2, scale2 } from '../math/vec2';

/** Inverse-square gravity acceleration at Earth-centered position r, m/s^2. */
export function gravityAccel(r: Vec2): Vec2 {
  const dist = mag2(r);
  return scale2(r, -MU_EARTH / (dist * dist * dist));
}
