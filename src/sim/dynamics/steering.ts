// Pitch program: vertical rise → small pitch kick → velocity-following gravity
// turn. Steering returns a unit thrust direction in the inertial launch plane,
// where "up" is radial (away from Earth's center) and "downrange" is prograde.

import type { Vec2 } from '../math/vec2';
import { add2, mag2, norm2, rot2, scale2 } from '../math/vec2';
import { DEG } from '../constants';

export interface PitchProgram {
  /** Altitude to begin the pitch-over, m. */
  kickAltitude: number;
  /** Pitch-over angle away from vertical, deg. */
  kickDeg: number;
  /** Altitude after which thrust simply follows the velocity vector, m. */
  followAltitude: number;
}

export const DEFAULT_PITCH_PROGRAM: PitchProgram = {
  kickAltitude: 1_200,
  kickDeg: 6,
  followAltitude: 12_000,
};

export function thrustDirection(
  r: Vec2,
  v: Vec2,
  altitude: number,
  downrangeSign: number,
  prog: PitchProgram,
): Vec2 {
  const up = norm2(r);

  if (altitude < prog.kickAltitude) return up;

  if (altitude < prog.followAltitude || mag2(v) < 50) {
    // Kicked over: tilt "up" toward downrange by kickDeg. Downrange is up
    // rotated -90°·downrangeSign, so the tilt is a rotation by -kickDeg·sign.
    return rot2(up, -prog.kickDeg * DEG * downrangeSign);
  }

  // Gravity turn: follow the velocity vector (with a tiny upward bias so the
  // turn never dives before the atmosphere thins).
  const prograde = norm2(v);
  return norm2(add2(prograde, scale2(up, 0.02)));
}
