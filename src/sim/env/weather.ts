// Seeded deterministic weather. Same (site, day) always produces the same
// briefing, so "wait for the next launch window" is honest — the player is
// rolling forward to a genuinely different (but reproducible) day.

import { hashSeed, mulberry32 } from '../math/rng';
import type { LaunchSite } from './sites';

export interface WindLayer {
  altitude: number; // m
  speedMs: number;
  dirDeg: number;
}

export interface CloudLayer {
  baseAlt: number; // m
  topAlt: number; // m
  /** 0..8 oktas coverage. */
  coverage: number;
  cumulus: boolean;
}

export interface WeatherState {
  seed: number;
  dayIndex: number;
  surfaceWindMs: number;
  gustMs: number;
  windAloft: WindLayer[];
  cloudLayers: CloudLayer[];
  /** 0..1 probability of lightning in the area. */
  lightningProb: number;
  tempC: number;
  precip: boolean;
}

export function generateWeather(site: LaunchSite, dayIndex: number): WeatherState {
  const seed = hashSeed(site.id, dayIndex);
  const rnd = mulberry32(seed);

  const stormy = rnd() < site.stormBias;
  const surfaceWindMs = 2 + rnd() * (stormy ? 16 : 9);
  const gustMs = surfaceWindMs * (1.2 + rnd() * 0.6);

  const jetSpeed = 20 + rnd() * (stormy ? 55 : 35);
  const baseDir = rnd() * 360;
  const windAloft: WindLayer[] = [
    { altitude: 0, speedMs: surfaceWindMs, dirDeg: baseDir },
    { altitude: 3_000, speedMs: surfaceWindMs + 5 + rnd() * 10, dirDeg: baseDir + rnd() * 30 - 15 },
    { altitude: 8_000, speedMs: jetSpeed * 0.7, dirDeg: baseDir + rnd() * 40 - 20 },
    { altitude: 11_000, speedMs: jetSpeed, dirDeg: baseDir + rnd() * 40 - 20 },
    { altitude: 16_000, speedMs: jetSpeed * 0.5, dirDeg: baseDir + rnd() * 60 - 30 },
  ];

  const cloudLayers: CloudLayer[] = [];
  if (rnd() < (stormy ? 0.9 : 0.5)) {
    const base = 500 + rnd() * 2_000;
    cloudLayers.push({
      baseAlt: base,
      topAlt: base + 300 + rnd() * (stormy ? 9_000 : 2_000),
      coverage: Math.round(1 + rnd() * 7),
      cumulus: stormy && rnd() < 0.7,
    });
  }

  return {
    seed,
    dayIndex,
    surfaceWindMs,
    gustMs,
    windAloft,
    cloudLayers,
    lightningProb: stormy ? 0.15 + rnd() * 0.6 : rnd() * 0.12,
    tempC: 12 + rnd() * 22 - Math.abs(site.latDeg) * 0.15,
    precip: stormy && rnd() < 0.5,
  };
}
