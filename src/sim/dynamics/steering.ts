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

// Tuned so a Falcon-9-class stack flies a realistic lofted-but-bent profile:
// SECO leaves a few hundred m/s of circularization, not several km/s.
export const DEFAULT_PITCH_PROGRAM: PitchProgram = {
  kickAltitude: 350,
  kickDeg: 14,
  followAltitude: 7_000,
};

/**
 * @param vRel velocity relative to the rotating atmosphere — the gravity turn
 * must follow the AIR-relative vector (zero angle of attack), not inertial
 * velocity. Following inertial velocity (which starts with ~400 m/s of
 * Earth-rotation speed) pitches the vehicle over far too early and the
 * trajectory sags back into the atmosphere.
 */
export function thrustDirection(
  r: Vec2,
  vRel: Vec2,
  altitude: number,
  downrangeSign: number,
  prog: PitchProgram,
): Vec2 {
  const up = norm2(r);

  if (altitude < prog.kickAltitude) return up;

  if (altitude < prog.followAltitude || mag2(vRel) < 50) {
    // Kicked over: tilt "up" toward downrange by kickDeg. Downrange is up
    // rotated -90°·downrangeSign, so the tilt is a rotation by -kickDeg·sign.
    return rot2(up, -prog.kickDeg * DEG * downrangeSign);
  }

  // Gravity turn: follow the air-relative velocity vector (with a small upward
  // bias so the turn never dives before the atmosphere thins).
  const prograde = norm2(vRel);
  return norm2(add2(prograde, scale2(up, 0.03)));
}
