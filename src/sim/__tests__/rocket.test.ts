import { describe, expect, it } from 'vitest';
import { G0 } from '../constants';
import { massFlow } from '../model/engine';
import {
  grossMass,
  liftoffTWR,
  stageBurnTime,
  stageDeltaV,
  totalDeltaV,
} from '../model/rocket';
import { defaultDesign, ENGINES, STAGE_PRESETS } from '../model/catalog';

describe('Tsiolkovsky', () => {
  it('mass ratio of e gives Δv = Isp·g0 exactly', () => {
    // Single stage, no payload/fairing: m0/mf = e ⇒ ln = 1.
    const isp = 300;
    const dry = 1_000;
    const prop = dry * (Math.E - 1);
    const d = {
      stages: [
        {
          id: 't',
          name: 't',
          engine: { ...ENGINES['pyxis-sl'], ispVac: isp },
          engineCount: 1,
          dryMass: dry,
          propMass: prop,
        },
      ],
      payload: { ...defaultDesign().payload, mass: 0 },
      fairing: { mass: 0, dragArea: 0, jettisonAltitude: 0 },
      refArea: 1,
      dragCoefficient: 0.3,
      qMax: 40e3,
    };
    expect(stageDeltaV(d, 0)).toBeCloseTo(isp * G0, 6);
  });

  it('more propellant means more Δv (monotonicity)', () => {
    const base = defaultDesign();
    const more = {
      ...base,
      stages: [
        { ...base.stages[0], propMass: base.stages[0].propMass * 1.2 },
        base.stages[1],
      ],
    };
    expect(totalDeltaV(more)).toBeGreaterThan(totalDeltaV(base));
  });
});

describe('default catalog stack', () => {
  const d = defaultDesign();

  it('has liftoff TWR in the plausible 1.2–1.8 band', () => {
    const twr = liftoffTWR(d);
    expect(twr).toBeGreaterThan(1.2);
    expect(twr).toBeLessThan(1.8);
  });

  it('has enough total Δv for LEO (> 9.0 km/s)', () => {
    expect(totalDeltaV(d)).toBeGreaterThan(9_000);
  });

  it('gross mass ≈ 550 t class', () => {
    expect(grossMass(d)).toBeGreaterThan(500_000);
    expect(grossMass(d)).toBeLessThan(620_000);
  });

  it('mass flow × burn time returns the propellant load', () => {
    const s = STAGE_PRESETS['booster-9'];
    const t = stageBurnTime(s);
    expect(massFlow(s.engine) * s.engineCount * t).toBeCloseTo(s.propMass, 6);
  });
});
