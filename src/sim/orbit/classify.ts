import { H_ATM, R_EARTH } from '../constants';
import type { OrbitalElements } from './elements';
import { apoapsisRadius, periapsisRadius } from './elements';

export type OrbitClass = 'suborbital' | 'elliptical' | 'circular' | 'escape';

export function classify(el: OrbitalElements): OrbitClass {
  if (el.e >= 1 || el.a <= 0 || !Number.isFinite(el.a)) return 'escape';
  if (periapsisRadius(el) < R_EARTH + H_ATM) return 'suborbital';
  if (el.e < 1e-3) return 'circular';
  return 'elliptical';
}

export const apoapsisAltitude = (el: OrbitalElements): number => apoapsisRadius(el) - R_EARTH;
export const periapsisAltitude = (el: OrbitalElements): number => periapsisRadius(el) - R_EARTH;
