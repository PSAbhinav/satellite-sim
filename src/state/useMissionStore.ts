// Cold-path store: discrete mission state that changes a few times per flight.
// Continuous telemetry never lives here — see sim/runtime/telemetryBus.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RocketDesign } from '@/sim/model/rocket';
import type { WeatherState } from '@/sim/env/weather';
import type { LaunchCommitResult } from '@/sim/env/launchCommit';
import type { SimEvent } from '@/sim/runtime/events';
import type { FlightPhase } from '@/sim/runtime/snapshot';
import type { MissionResult } from '@/sim/runtime/simulation';
import { defaultDesign, PAYLOADS, STAGE_PRESETS } from '@/sim/model/catalog';

export type CampaignStep =
  | 'home'
  | 'build'
  | 'payload'
  | 'site'
  | 'countdown'
  | 'launch'
  | 'orbit'
  | 'debrief';

interface MissionState {
  // Campaign progress (persisted).
  design: RocketDesign;
  payloadId: string;
  siteId: string;
  weatherDay: number;
  unlockedPedia: string[];
  completedMissions: string[];

  // Live flight state (cold path; reset per flight, not persisted).
  flightPhase: FlightPhase;
  events: SimEvent[];
  weather: WeatherState | null;
  commit: LaunchCommitResult | null;
  result: MissionResult | null;

  setStage: (slot: number, presetId: string) => void;
  setBoosters: (presetId: string | null, count: number) => void;
  setPayload: (id: string) => void;
  setSite: (id: string) => void;
  nextWeatherDay: () => void;
  setWeather: (w: WeatherState, c: LaunchCommitResult) => void;
  setFlightPhase: (p: FlightPhase) => void;
  pushEvents: (e: SimEvent[]) => void;
  clearFlight: () => void;
  setResult: (r: MissionResult | null) => void;
  unlockPedia: (ids: string[]) => void;
  completeMission: (id: string) => void;
}

export const useMissionStore = create<MissionState>()(
  persist(
    (set) => ({
      design: defaultDesign(),
      payloadId: 'imaging-150',
      siteId: 'cape',
      weatherDay: 0,
      unlockedPedia: [],
      completedMissions: [],

      flightPhase: 'pad',
      events: [],
      weather: null,
      commit: null,
      result: null,

      setStage: (slot, presetId) =>
        set((s) => {
          const stages = [...s.design.stages];
          stages[slot] = STAGE_PRESETS[presetId];
          return { design: { ...s.design, stages } };
        }),
      setBoosters: (presetId, count) =>
        set((s) => ({
          design: {
            ...s.design,
            boosters: presetId ? { spec: STAGE_PRESETS[presetId], count } : undefined,
          },
        })),
      setPayload: (id) =>
        set((s) => ({
          payloadId: id,
          design: { ...s.design, payload: PAYLOADS[id] },
        })),
      setSite: (siteId) => set({ siteId }),
      nextWeatherDay: () => set((s) => ({ weatherDay: s.weatherDay + 1 })),
      setWeather: (weather, commit) => set({ weather, commit }),
      setFlightPhase: (flightPhase) => set({ flightPhase }),
      pushEvents: (e) => set((s) => ({ events: [...s.events, ...e] })),
      clearFlight: () =>
        set({ flightPhase: 'pad', events: [], result: null }),
      setResult: (result) => set({ result }),
      unlockPedia: (ids) =>
        set((s) => ({
          unlockedPedia: [...new Set([...s.unlockedPedia, ...ids])],
        })),
      completeMission: (id) =>
        set((s) => ({
          completedMissions: [...new Set([...s.completedMissions, id])],
        })),
    }),
    {
      name: 'satsim.mission',
      version: 2,
      // v2 replaced the fictional parts catalog with real hardware — old saved
      // designs reference retired presets, so reset the vehicle (keep unlocks).
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        const base = {
          design: defaultDesign(),
          payloadId: 'imaging-150',
          siteId: (p.siteId as string) ?? 'cape',
          weatherDay: (p.weatherDay as number) ?? 0,
          unlockedPedia: (p.unlockedPedia as string[]) ?? [],
          completedMissions: (p.completedMissions as string[]) ?? [],
        };
        if (version < 2) return base;
        return { ...base, design: (p.design as RocketDesign) ?? base.design, payloadId: (p.payloadId as string) ?? base.payloadId };
      },
      // Only campaign progress persists; live flight state is per-session.
      partialize: (s) => ({
        design: s.design,
        payloadId: s.payloadId,
        siteId: s.siteId,
        weatherDay: s.weatherDay,
        unlockedPedia: s.unlockedPedia,
        completedMissions: s.completedMissions,
      }),
    },
  ),
);
