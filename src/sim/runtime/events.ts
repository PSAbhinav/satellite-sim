export type SimEventType =
  | 'LIFTOFF'
  | 'TOWER_CLEARED'
  | 'PITCH_KICK'
  | 'SUPERSONIC'
  | 'MAX_Q'
  | 'BOOSTER_SEP'
  | 'MECO'
  | 'STAGE_SEP'
  | 'STAGE_IGNITION'
  | 'FAIRING_JETTISON'
  | 'SECO'
  | 'APOAPSIS'
  | 'BURN_ARMED'
  | 'SES_2'
  | 'SECO_2'
  | 'ORBIT_ACHIEVED'
  | 'PROPELLANT_DEPLETED'
  | 'STRUCTURAL_FAILURE'
  | 'SUBORBITAL'
  | 'REENTRY'
  | 'ESCAPE'
  | 'SCRUB';

export type EventSeverity = 'nominal' | 'callout' | 'warning' | 'critical';

export interface SimEvent {
  type: SimEventType;
  /** Mission elapsed time, s. */
  t: number;
  severity: EventSeverity;
  /** Human line for the callout feed ("Vehicle is supersonic"). */
  message: string;
  data?: Record<string, number | string>;
}

export const CALLOUTS: Record<SimEventType, { severity: EventSeverity; message: string }> = {
  LIFTOFF: { severity: 'callout', message: 'Liftoff! We have liftoff.' },
  TOWER_CLEARED: { severity: 'nominal', message: 'Vehicle has cleared the tower.' },
  PITCH_KICK: { severity: 'nominal', message: 'Beginning pitch-over maneuver.' },
  SUPERSONIC: { severity: 'callout', message: 'Vehicle is supersonic.' },
  MAX_Q: { severity: 'callout', message: 'Max-Q — maximum aerodynamic pressure.' },
  BOOSTER_SEP: { severity: 'callout', message: 'Booster separation confirmed.' },
  MECO: { severity: 'callout', message: 'MECO — main engine cutoff.' },
  STAGE_SEP: { severity: 'callout', message: 'Stage separation confirmed.' },
  STAGE_IGNITION: { severity: 'callout', message: 'Second stage ignition.' },
  FAIRING_JETTISON: { severity: 'nominal', message: 'Fairing jettison — payload exposed to space.' },
  SECO: { severity: 'callout', message: 'SECO — engine cutoff. Coasting to apoapsis.' },
  APOAPSIS: { severity: 'callout', message: 'Apoapsis reached.' },
  BURN_ARMED: { severity: 'nominal', message: 'Insertion burn armed — guidance will ignite on time.' },
  SES_2: { severity: 'callout', message: 'Second engine start — insertion burn underway.' },
  SECO_2: { severity: 'callout', message: 'SECO-2 — insertion burn complete.' },
  ORBIT_ACHIEVED: { severity: 'callout', message: 'Orbit achieved! Welcome to space.' },
  PROPELLANT_DEPLETED: { severity: 'warning', message: 'Propellant depleted.' },
  STRUCTURAL_FAILURE: { severity: 'critical', message: 'Vehicle breakup — structural limits exceeded.' },
  SUBORBITAL: { severity: 'warning', message: 'Trajectory is suborbital.' },
  REENTRY: { severity: 'critical', message: 'Vehicle re-entering the atmosphere.' },
  ESCAPE: { severity: 'warning', message: 'Escape trajectory — leaving Earth orbit.' },
  SCRUB: { severity: 'warning', message: 'Launch scrubbed.' },
};

export function makeEvent(
  type: SimEventType,
  t: number,
  data?: Record<string, number | string>,
): SimEvent {
  const c = CALLOUTS[type];
  return { type, t, severity: c.severity, message: c.message, data };
}
