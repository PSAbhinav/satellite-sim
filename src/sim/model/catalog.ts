// Preset parts catalog. Numbers are loosely modeled on real hardware
// (Merlin/MVac/Rutherford/kick-stage class) so budgets read plausibly,
// but names are our own — this is not any specific vehicle.

import type { EngineSpec } from './engine';
import type { PayloadSpec } from './payload';
import type { Fairing, RocketDesign, StageSpec } from './rocket';
import { Q_MAX_DEFAULT } from '../constants';

export const ENGINES: Record<string, EngineSpec> = {
  'pyxis-sl': {
    id: 'pyxis-sl',
    name: 'Pyxis-1 (sea-level)',
    thrustSL: 845e3,
    thrustVac: 914e3,
    ispSL: 283,
    ispVac: 311,
    blurb: 'Workhorse booster engine. Strong at sea level where the air pushes back.',
  },
  'pyxis-vac': {
    id: 'pyxis-vac',
    name: 'Pyxis-V (vacuum)',
    thrustSL: 0,
    thrustVac: 934e3,
    ispSL: 0,
    ispVac: 348,
    blurb: 'Big vacuum nozzle. Useless in the atmosphere, superb in space.',
  },
  'ember': {
    id: 'ember',
    name: 'Ember (small booster)',
    thrustSL: 24e3,
    thrustVac: 26e3,
    ispSL: 280,
    ispVac: 311,
    blurb: 'Tiny 3D-printed engine for light rockets.',
  },
  'spark-kick': {
    id: 'spark-kick',
    name: 'Spark (kick stage)',
    thrustSL: 0,
    thrustVac: 66e3,
    ispSL: 0,
    ispVac: 285,
    blurb: 'One small push to round out an orbit.',
  },
};

export const STAGE_PRESETS: Record<string, StageSpec> = {
  'booster-9': {
    id: 'booster-9',
    name: 'Falcon-class Booster (9× Pyxis-1)',
    engine: ENGINES['pyxis-sl'],
    engineCount: 9,
    dryMass: 25_600,
    propMass: 411_000,
  },
  'upper-v': {
    id: 'upper-v',
    name: 'Vacuum Upper Stage (1× Pyxis-V)',
    engine: ENGINES['pyxis-vac'],
    engineCount: 1,
    dryMass: 4_000,
    propMass: 107_500,
  },
  'light-booster': {
    id: 'light-booster',
    name: 'Light Booster (9× Ember)',
    engine: ENGINES['ember'],
    engineCount: 9,
    dryMass: 950,
    propMass: 9_250,
  },
  'kick': {
    id: 'kick',
    name: 'Kick Stage (1× Spark)',
    engine: ENGINES['spark-kick'],
    engineCount: 1,
    dryMass: 350,
    propMass: 2_000,
  },
};

export const PAYLOADS: Record<string, PayloadSpec> = {
  'cubesat-3u': {
    id: 'cubesat-3u',
    name: 'StudySat 3U CubeSat',
    type: 'cubesat',
    mass: 4,
    target: { altitude: 400e3, inclinationDeg: 28.5, label: 'LEO 400 km' },
    blurb: 'A shoebox-sized student satellite. Cheap ride to low orbit.',
  },
  'imaging-150': {
    id: 'imaging-150',
    name: 'HawkEye Imaging Sat',
    type: 'imaging',
    mass: 150,
    target: { altitude: 550e3, inclinationDeg: 53, label: 'LEO 550 km' },
    blurb: 'Takes pictures of Earth. Wants a higher orbit for a wider view.',
  },
  'weather-900': {
    id: 'weather-900',
    name: 'StormWatch Weather Sat',
    type: 'weather',
    mass: 900,
    target: { altitude: 800e3, inclinationDeg: 98.6, label: 'Sun-sync 800 km' },
    blurb: 'Watches storms from a sun-synchronous orbit — heavy and high.',
  },
};

export const FAIRING_STD: Fairing = {
  mass: 1_750,
  dragArea: 2.0,
  jettisonAltitude: 110e3,
};

/** Default winnable stack: booster + vacuum upper + imaging sat. */
export function defaultDesign(): RocketDesign {
  return {
    stages: [STAGE_PRESETS['booster-9'], STAGE_PRESETS['upper-v']],
    payload: PAYLOADS['imaging-150'],
    fairing: FAIRING_STD,
    refArea: 10.8, // ~3.7 m diameter core
    dragCoefficient: 0.4,
    qMax: Q_MAX_DEFAULT,
  };
}
