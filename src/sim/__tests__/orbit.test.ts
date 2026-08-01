import { describe, expect, it } from 'vitest';
import { MU_EARTH, R_EARTH, SIDEREAL_DAY } from '../constants';
import { v3, mag3, sub3 } from '../math/vec3';
import { solveKepler } from '../math/rootfind';
import {
  elementsToState,
  period,
  specificEnergy,
  stateToElements,
} from '../orbit/elements';
import { propagateElements, timeToApoapsis, trueToEccentric, eccentricToMean } from '../orbit/kepler';
import { classify } from '../orbit/classify';
import { circularizationDeltaV } from '../orbit/maneuvers';

describe('known-answer orbital mechanics', () => {
  it('circular velocity at 400 km ≈ 7.67 km/s', () => {
    const v = Math.sqrt(MU_EARTH / (R_EARTH + 400e3));
    expect(v).toBeGreaterThan(7_660);
    expect(v).toBeLessThan(7_680);
  });

  it('ISS-altitude (~420 km) period ≈ 92.6 min', () => {
    const a = R_EARTH + 420e3;
    const T = 2 * Math.PI * Math.sqrt(a ** 3 / MU_EARTH);
    expect(T / 60).toBeGreaterThan(92);
    expect(T / 60).toBeLessThan(93.2);
  });

  it('GEO semi-major axis ≈ 42,164 km (period = sidereal day)', () => {
    const a = Math.cbrt(MU_EARTH * (SIDEREAL_DAY / (2 * Math.PI)) ** 2);
    expect(a / 1000).toBeGreaterThan(42_160);
    expect(a / 1000).toBeLessThan(42_170);
  });

  it('escape velocity at the surface ≈ 11.19 km/s', () => {
    const v = Math.sqrt((2 * MU_EARTH) / R_EARTH);
    expect(v / 1000).toBeGreaterThan(11.16);
    expect(v / 1000).toBeLessThan(11.22);
  });
});

describe('state ↔ elements round trip', () => {
  const cases = [
    {
      name: 'inclined ellipse',
      r: v3(R_EARTH + 500e3, 0, 0),
      v: v3(0, 7_400 * Math.cos(0.9), 7_400 * Math.sin(0.9)),
    },
    {
      name: 'near-circular LEO',
      r: v3(0, R_EARTH + 400e3, 0),
      v: v3(-Math.sqrt(MU_EARTH / (R_EARTH + 400e3)), 0, 0),
    },
    {
      name: 'eccentric transfer',
      r: v3(R_EARTH + 200e3, 0, 0),
      v: v3(0, 9_200, 1_000),
    },
  ];

  for (const c of cases) {
    it(`round-trips ${c.name} to <1e-6 relative`, () => {
      const el = stateToElements(c.r, c.v);
      const back = elementsToState(el);
      expect(mag3(sub3(back.r, c.r)) / mag3(c.r)).toBeLessThan(1e-6);
      expect(mag3(sub3(back.v, c.v)) / mag3(c.v)).toBeLessThan(1e-6);
    });
  }
});

describe('Kepler solver', () => {
  for (const e of [0, 0.1, 0.5, 0.9, 0.99]) {
    it(`converges for e=${e}`, () => {
      for (const M of [-2.5, -0.3, 0.1, 1.0, 3.0]) {
        const E = solveKepler(M, e);
        // Residual against the normalized mean anomaly.
        let m = M % (2 * Math.PI);
        if (m > Math.PI) m -= 2 * Math.PI;
        if (m < -Math.PI) m += 2 * Math.PI;
        expect(Math.abs(E - e * Math.sin(E) - m)).toBeLessThan(1e-9);
      }
    });
  }
});

describe('closed-form propagation', () => {
  it('conserves energy over 100 orbits to ~1e-9 relative', () => {
    const r0 = v3(R_EARTH + 300e3, 0, 0);
    const v0 = v3(0, 8_000, 2_000);
    const el0 = stateToElements(r0, v0);
    const e0 = specificEnergy(r0, v0);
    const T = period(el0);

    let el = el0;
    for (let i = 0; i < 100; i++) el = propagateElements(el, T / 3 + i);
    const { r, v } = elementsToState(el);
    expect(Math.abs((specificEnergy(r, v) - e0) / e0)).toBeLessThan(1e-9);
  });

  it('advancing by one full period returns to the same anomaly', () => {
    const el = stateToElements(v3(R_EARTH + 500e3, 0, 0), v3(0, 8_100, 500));
    const after = propagateElements(el, period(el));
    const diff = Math.abs(after.nu - el.nu) % (2 * Math.PI);
    expect(Math.min(diff, 2 * Math.PI - diff)).toBeLessThan(1e-6);
  });

  it('timeToApoapsis is half a period from periapsis', () => {
    const el = { ...stateToElements(v3(R_EARTH + 300e3, 0, 0), v3(0, 8_500, 0)), nu: 0 };
    const T = period(el);
    expect(Math.abs(timeToApoapsis(el) - T / 2)).toBeLessThan(T * 1e-6);
  });

  it('mean anomaly at periapsis is 0', () => {
    expect(eccentricToMean(trueToEccentric(0, 0.3), 0.3)).toBeCloseTo(0, 12);
  });
});

describe('classification', () => {
  it('classifies suborbital / elliptical / circular / escape', () => {
    const rLeo = R_EARTH + 400e3;
    const vCirc = Math.sqrt(MU_EARTH / rLeo);
    expect(classify(stateToElements(v3(rLeo, 0, 0), v3(0, vCirc, 0)))).toBe('circular');
    expect(classify(stateToElements(v3(rLeo, 0, 0), v3(0, vCirc * 1.1, 0)))).toBe('elliptical');
    expect(classify(stateToElements(v3(rLeo, 0, 0), v3(0, vCirc * 0.8, 0)))).toBe('suborbital');
    expect(classify(stateToElements(v3(rLeo, 0, 0), v3(0, vCirc * 1.5, 0)))).toBe('escape');
  });
});

describe('circularization', () => {
  it('matches the Hohmann second-burn formula (200→400 km transfer)', () => {
    const r1 = R_EARTH + 200e3;
    const r2 = R_EARTH + 400e3;
    const a = (r1 + r2) / 2;
    // State at apoapsis of the transfer ellipse.
    const vApo = Math.sqrt(MU_EARTH * (2 / r2 - 1 / a));
    const el = stateToElements(v3(-r2, 0, 0), v3(0, -vApo, 0));
    const expected = Math.sqrt(MU_EARTH / r2) - vApo;
    expect(Math.abs(circularizationDeltaV(el) - expected)).toBeLessThan(0.01);
  });
});
