// Spacepedia content model. Every term in the app is a Concept with three
// explanation depths; entries unlock as the player reaches milestones.

export type AgeLevel = 'kid' | 'student' | 'engineer';

export type PediaCategory = 'rocketry' | 'flight' | 'orbit' | 'weather' | 'solar-system';

/** Progress milestones that unlock Spacepedia sections. */
export type Milestone = 'start' | 'build' | 'launch' | 'orbit' | 'solar';

export const MILESTONE_HINTS: Record<Milestone, string> = {
  start: '',
  build: 'Unlock by designing a rocket in the Vehicle Assembly Building.',
  launch: 'Unlock by launching a rocket.',
  orbit: 'Unlock by reaching orbit.',
  solar: 'Unlock by visiting the Solar System after reaching orbit.',
};

export interface Concept {
  id: string;
  term: string;
  category: PediaCategory;
  unlock: Milestone;
  /** One-line hook shown on the card and in InfoChip headers. */
  short: string;
  unit?: string;
  levels: Record<AgeLevel, string>;
  formula?: {
    /** KaTeX source. */
    tex: string;
    legend: [sym: string, meaning: string][];
  };
  related?: string[];
}
