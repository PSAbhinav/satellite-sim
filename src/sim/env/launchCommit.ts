// Launch-commit criteria — simplified from real NASA/USSF lightning and wind
// rules. Each rule explains its real-world basis in `basis` so the UI can teach it.

import { msToKt } from '../units';
import type { WeatherState } from './weather';

export type CommitStatus = 'GO' | 'CAUTION' | 'NOGO';

export interface RuleResult {
  id: string;
  label: string;
  status: CommitStatus;
  detail: string;
  basis: string;
}

export interface LaunchCommitResult {
  overall: CommitStatus;
  rules: RuleResult[];
}

const worst = (a: CommitStatus, b: CommitStatus): CommitStatus => {
  const rank = { GO: 0, CAUTION: 1, NOGO: 2 } as const;
  return rank[a] >= rank[b] ? a : b;
};

export function evaluateLaunchCommit(w: WeatherState): LaunchCommitResult {
  const rules: RuleResult[] = [];

  const windKt = msToKt(w.surfaceWindMs);
  rules.push({
    id: 'surface-wind',
    label: 'Surface winds',
    status: windKt > 30 ? 'NOGO' : windKt > 22 ? 'CAUTION' : 'GO',
    detail: `${windKt.toFixed(0)} kt at the pad (gusts ${msToKt(w.gustMs).toFixed(0)} kt)`,
    basis: 'Real rockets scrub around 30 kt — wind pushes the vehicle as it clears the tower.',
  });

  let maxShear = 0;
  for (let i = 1; i < w.windAloft.length; i++) {
    const dv = Math.abs(w.windAloft[i].speedMs - w.windAloft[i - 1].speedMs);
    maxShear = Math.max(maxShear, dv);
  }
  rules.push({
    id: 'wind-shear',
    label: 'Upper-level wind shear',
    status: maxShear > 30 ? 'NOGO' : maxShear > 20 ? 'CAUTION' : 'GO',
    detail: `Max layer-to-layer change ${maxShear.toFixed(0)} m/s`,
    basis: 'Sudden wind changes aloft bend the rocket right around max-Q — a top scrub reason.',
  });

  rules.push({
    id: 'lightning',
    label: 'Lightning risk',
    status: w.lightningProb > 0.35 ? 'NOGO' : w.lightningProb > 0.2 ? 'CAUTION' : 'GO',
    detail: `${(w.lightningProb * 100).toFixed(0)}% chance in the area`,
    basis: 'A rocket and its exhaust plume make a giant lightning rod (Apollo 12 was struck twice).',
  });

  const thick = w.cloudLayers.find((c) => c.topAlt - c.baseAlt > 1_400);
  rules.push({
    id: 'clouds',
    label: 'Cloud layers',
    status: thick && thick.cumulus ? 'NOGO' : thick ? 'CAUTION' : 'GO',
    detail: thick
      ? `${((thick.topAlt - thick.baseAlt) / 1000).toFixed(1)} km thick layer at ${(thick.baseAlt / 1000).toFixed(1)} km`
      : 'No significant layers',
    basis: 'Thick, cold clouds can trigger a lightning strike even without a storm.',
  });

  rules.push({
    id: 'temperature',
    label: 'Temperature',
    status: w.tempC < -5 || w.tempC > 37 ? 'NOGO' : w.tempC < 2 ? 'CAUTION' : 'GO',
    detail: `${w.tempC.toFixed(0)} °C at the pad`,
    basis: 'Cold stiffens seals (Challenger’s O-rings); heat strains propellant loading.',
  });

  return {
    overall: rules.reduce<CommitStatus>((acc, r) => worst(acc, r.status), 'GO'),
    rules,
  };
}
