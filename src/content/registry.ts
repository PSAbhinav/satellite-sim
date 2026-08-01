// Auto-registry: every module in ./concepts/ that exports `concepts` is
// merged. Adding a concept = adding an entry to one of those files (or a new
// file — no registration step).

import type { Concept, Milestone } from './types';

const modules = import.meta.glob<{ concepts: Concept[] }>('./concepts/*.ts', {
  eager: true,
});

export const ALL_CONCEPTS: Concept[] = Object.values(modules).flatMap((m) => m.concepts);

export const CONCEPTS: Record<string, Concept> = Object.fromEntries(
  ALL_CONCEPTS.map((c) => [c.id, c]),
);

export function conceptsByCategory(): Map<string, Concept[]> {
  const map = new Map<string, Concept[]>();
  for (const c of ALL_CONCEPTS) {
    const list = map.get(c.category) ?? [];
    list.push(c);
    map.set(c.category, list);
  }
  return map;
}

export function isUnlocked(c: Concept, unlocked: string[]): boolean {
  return c.unlock === 'start' || unlocked.includes(c.unlock);
}

export const CATEGORY_LABELS: Record<string, string> = {
  rocketry: 'Rocketry',
  flight: 'Flight & Ascent',
  orbit: 'Orbital Mechanics',
  weather: 'Weather & Launch Rules',
  'solar-system': 'The Solar System',
};

export const MILESTONES: Milestone[] = ['start', 'build', 'launch', 'orbit', 'solar'];
