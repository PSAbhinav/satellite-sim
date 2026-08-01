export type PayloadType = 'cubesat' | 'imaging' | 'weather' | 'comsat';

export interface TargetOrbit {
  /** Target circular altitude, m. */
  altitude: number;
  /** Target inclination, deg. */
  inclinationDeg: number;
  label: string;
}

export interface PayloadSpec {
  id: string;
  name: string;
  type: PayloadType;
  /** kg */
  mass: number;
  target: TargetOrbit;
  blurb: string;
}
