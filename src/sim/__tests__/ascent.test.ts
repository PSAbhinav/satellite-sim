import { describe, expect, it } from 'vitest';
import { R_EARTH, R_EARTH_EQ } from '../constants';
import { mag2 } from '../math/vec2';
import { rotationBonus } from '../env/earth';
import { generateWeather } from '../env/weather';
import { evaluateLaunchCommit } from '../env/launchCommit';
import { SITES } from '../env/sites';
import { defaultDesign, PAYLOADS } from '../model/catalog';
import { Simulation } from '../runtime/simulation';

const runToEnd = (sim: Simulation, maxT = 1200): void => {
  sim.ignite();
  while ((sim.phase === 'ascent' || sim.phase === 'pad') && simT(sim) < maxT) {
    sim.step(0.02);
  }
};
const simT = (sim: Simulation): number => sim.snapshot().t;

describe('Earth rotation bonus', () => {
  it('≈465 m/s at the equator, ≈409 m/s at Cape latitude', () => {
    expect(rotationBonus(0, R_EARTH_EQ)).toBeGreaterThan(460);
    expect(rotationBonus(0, R_EARTH_EQ)).toBeLessThan(470);
    expect(rotationBonus(28.5, R_EARTH_EQ)).toBeGreaterThan(400);
    expect(rotationBonus(28.5, R_EARTH_EQ)).toBeLessThan(415);
  });
});

describe('full ascent (default stack, Cape, 550 km target)', () => {
  it('reaches a coast phase with apoapsis at/above target', () => {
    const sim = new Simulation();
    sim.configure({
      design: defaultDesign(),
      site: SITES.cape,
      targetAltitude: PAYLOADS['imaging-150'].target.altitude,
    });
    runToEnd(sim);

    expect(sim.phase).toBe('coast');
    const snap = sim.snapshot();
    expect(snap.orbit).toBeDefined();
    expect(snap.orbit!.apoapsisAlt).toBeGreaterThan(540e3);
    // Max-Q happened in a plausible band (10–45 kPa) at some point.
    expect(snap.maxQSoFar).toBeGreaterThan(10e3);
    expect(snap.maxQSoFar).toBeLessThan(45e3);
  });

  it('emits the expected event sequence in order', () => {
    const sim = new Simulation();
    sim.configure({
      design: defaultDesign(),
      site: SITES.cape,
      targetAltitude: 550e3,
    });
    runToEnd(sim);
    const types = sim.allEvents().map((e) => e.type);
    const order = ['LIFTOFF', 'TOWER_CLEARED', 'PITCH_KICK', 'SUPERSONIC', 'MAX_Q', 'MECO', 'STAGE_SEP', 'STAGE_IGNITION', 'SECO'] as const;
    let idx = -1;
    for (const t of order) {
      const found = types.indexOf(t);
      expect(found, `missing or out-of-order event ${t}`).toBeGreaterThan(idx);
      idx = found;
    }
  });

  it('circularizes into a stable orbit at apoapsis', () => {
    const sim = new Simulation();
    sim.configure({ design: defaultDesign(), site: SITES.cape, targetAltitude: 550e3 });
    runToEnd(sim);
    expect(sim.phase).toBe('coast');

    // Warp to apoapsis with tta-aware steps (big jumps far out, fine near it).
    let guard = 0;
    while (sim.phase === 'coast' && guard++ < 100_000) {
      const tta = sim.snapshot().orbit!.timeToApoapsisS;
      if (tta <= 5) break;
      sim.step(Math.max(0.02, Math.min(10, tta - 3)));
    }
    sim.circularize();
    expect(sim.phase).toBe('orbit');
    expect(sim.result?.outcome).toBe('orbit');
    const orbit = sim.snapshot().orbit!;
    expect(orbit.class === 'circular' || orbit.eccentricity < 0.05).toBe(true);
    expect(orbit.periapsisAlt).toBeGreaterThan(200e3);
  });

  it('is deterministic: same config twice gives identical trajectories', () => {
    const run = () => {
      const sim = new Simulation();
      sim.configure({ design: defaultDesign(), site: SITES.cape, targetAltitude: 550e3 });
      sim.ignite();
      for (let i = 0; i < 5_000; i++) sim.step(0.02);
      const s = sim.snapshot();
      return [s.altitude, s.speed, s.mass, s.q];
    };
    expect(run()).toEqual(run());
  });
});

describe('failure modes', () => {
  it('TWR < 1 never lifts off (altitude stays ~0, eventually crashes/fails)', () => {
    const d = defaultDesign();
    // Strangle the booster: 2 engines instead of 9 → TWR well under 1.
    const weak = {
      ...d,
      stages: [{ ...d.stages[0], engineCount: 2 }, d.stages[1]],
    };
    const sim = new Simulation();
    sim.configure({ design: weak, site: SITES.cape, targetAltitude: 550e3 });
    sim.ignite();
    for (let i = 0; i < 1000 && sim.phase === 'ascent'; i++) sim.step(0.02);
    expect(sim.snapshot().altitude).toBeLessThan(500);
  });

  it('a payload too heavy for the rocket ends suborbital with diagnostics', () => {
    const d = defaultDesign();
    // 60 t on a stack sized for tons-class payloads: total Δv drops well below
    // orbital requirements while TWR stays sane (heavier = gentler max-Q).
    const overloaded = {
      ...d,
      payload: { ...d.payload, mass: 70_000 },
    };
    const sim = new Simulation();
    sim.configure({ design: overloaded, site: SITES.cape, targetAltitude: 550e3 });
    runToEnd(sim);
    expect(sim.phase).toBe('failed');
    expect(sim.result?.outcome).toBe('suborbital');
  });

  it('an over-light stack breaks up at max-Q (structural limit)', () => {
    const d = defaultDesign();
    // Same thrust, far less mass → huge TWR → too fast in thick air → q > qMax.
    const overlight = {
      ...d,
      stages: [
        { ...d.stages[0], propMass: d.stages[0].propMass * 0.35 },
        { ...d.stages[1], propMass: d.stages[1].propMass * 0.2 },
      ],
    };
    const sim = new Simulation();
    sim.configure({ design: overlight, site: SITES.cape, targetAltitude: 550e3 });
    runToEnd(sim);
    expect(sim.phase).toBe('failed');
    expect(sim.result?.outcome).toBe('breakup');
  });
});

describe('weather & launch commit', () => {
  it('weather is deterministic per (site, day)', () => {
    const a = generateWeather(SITES.cape, 3);
    const b = generateWeather(SITES.cape, 3);
    expect(a).toEqual(b);
    const c = generateWeather(SITES.cape, 4);
    expect(c.seed).not.toBe(a.seed);
  });

  it('calm weather evaluates GO, storm evaluates NOGO', () => {
    // Scan days for one GO and one NOGO — both must exist within a year.
    let sawGo = false;
    let sawNogo = false;
    for (let day = 0; day < 365 && !(sawGo && sawNogo); day++) {
      const overall = evaluateLaunchCommit(generateWeather(SITES.cape, day)).overall;
      if (overall === 'GO') sawGo = true;
      if (overall === 'NOGO') sawNogo = true;
    }
    expect(sawGo).toBe(true);
    expect(sawNogo).toBe(true);
  });
});

describe('sanity: pad state', () => {
  it('starts at the surface: zero airspeed, rotation-bonus inertial speed', () => {
    const sim = new Simulation();
    sim.configure({ design: defaultDesign(), site: SITES.kourou, targetAltitude: 400e3 });
    const s = sim.snapshot();
    expect(Math.abs(s.altitude)).toBeLessThan(1);
    // Displayed (surface-relative) speed is 0 on the pad…
    expect(s.speed).toBeLessThan(1);
    // …but the inertial (ECI) speed carries Kourou's ≈463 m/s rotation bonus.
    const vEci = Math.hypot(s.vEci.x, s.vEci.y, s.vEci.z);
    expect(vEci).toBeGreaterThan(455);
    expect(vEci).toBeLessThan(470);
  });
});

describe('vec sanity', () => {
  it('mag2 of a 3-4 triangle is 5', () => {
    expect(mag2({ x: 3, y: 4 })).toBe(5);
    expect(R_EARTH).toBeGreaterThan(6.3e6);
  });
});
