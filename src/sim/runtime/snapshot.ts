import type { Vec3 } from '../math/vec3';
import type { OrbitClass } from '../orbit/classify';

export type FlightPhase = 'pad' | 'ascent' | 'coast' | 'orbit' | 'failed';

export interface StageTelemetry {
  fuelFrac: number;
  propRemaining: number;
  thrust: number;
}

/** One telemetry frame. Published to the (non-React) telemetry bus every step. */
export interface SimSnapshot {
  t: number;
  phase: FlightPhase;
  // Flight dynamics (SI).
  altitude: number;
  speed: number;
  verticalSpeed: number;
  downrange: number;
  mass: number;
  thrust: number;
  twr: number;
  q: number;
  maxQSoFar: number;
  mach: number;
  accelG: number;
  flightPathAngleDeg: number;
  throttle: number;
  activeStage: number;
  stages: StageTelemetry[];
  fairingOn: boolean;
  // 3D position (ECI, m) for the scene + ground track.
  rEci: Vec3;
  vEci: Vec3;
  // Orbit info (valid once out of the atmosphere / in coast+orbit).
  orbit?: {
    class: OrbitClass;
    apoapsisAlt: number;
    periapsisAlt: number;
    eccentricity: number;
    inclinationDeg: number;
    periodS: number;
    timeToApoapsisS: number;
    /** Δv needed to circularize at apoapsis, m/s. */
    circDv: number;
    /** Δv available in the current stage, m/s. */
    availDv: number;
  };
  subpoint?: { latDeg: number; lonDeg: number };
}
