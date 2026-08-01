// Mission Control, broadcast cut: the flight view fills the screen and every
// instrument floats over it as glass — SpaceX-webcast bottom band with big
// speed/altitude numbers, center MET clock, milestone pips that light as
// events fire, and stage fuel bars.

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';
import { useSimLoop } from '@/state/useSimLoop';
import { useTelemetry } from '@/state/useTelemetry';
import { simController } from '@/state/simController';
import { SITES } from '@/sim/env/sites';
import { sToMinSec } from '@/sim/units';
import type { SimEventType } from '@/sim/runtime/events';
import { AscentScene } from '@/scene/AscentScene';
import { StripChart } from '@/dashboard/StripChart';
import { EventFeed } from '@/dashboard/EventFeed';
import { GroundTrackMap } from '@/dashboard/GroundTrackMap';
import { chime, setRumble, speak, stopRumble } from '@/lib/audio';
import { cn } from '@/lib/utils';

const GLASS = 'rounded-panel border border-line/60 bg-void/70 backdrop-blur-md';

const MILESTONES: { type: SimEventType; label: string }[] = [
  { type: 'LIFTOFF', label: 'Liftoff' },
  { type: 'MAX_Q', label: 'Max-Q' },
  { type: 'BOOSTER_SEP', label: 'Boosters' },
  { type: 'MECO', label: 'MECO' },
  { type: 'STAGE_SEP', label: 'Stage sep' },
  { type: 'FAIRING_JETTISON', label: 'Fairing' },
  { type: 'SECO', label: 'SECO' },
  { type: 'APOAPSIS', label: 'Apoapsis' },
];

export default function Launch() {
  // Guard lives in a hook-free wrapper so the console's hooks never render
  // conditionally.
  if (!simController.running && simController.sim.phase === 'pad') {
    return <NoActiveMission />;
  }
  return <LaunchConsole />;
}

function NoActiveMission() {
  return (
    <div className="flex h-[calc(100vh-3rem)] items-center justify-center p-6">
      <div className="max-w-md rounded-panel border border-line bg-console p-8 text-center">
        <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-star">
          Mission Control
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-starlight">
          No vehicle on the pad
        </h1>
        <p className="mt-3 text-sm text-muted-star">
          This room comes alive during a flight — live telemetry, callouts, the works. Roll a
          rocket out first.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            to="/build"
            className="rounded-panel border border-line bg-console-2 px-4 py-2 font-display text-xs uppercase tracking-wider text-starlight hover:bg-console-2/70"
          >
            Build a rocket
          </Link>
          <Link
            to="/countdown"
            className="rounded-panel bg-go/90 px-4 py-2 font-display text-xs uppercase tracking-wider text-[#04180b] hover:bg-go"
          >
            Go to countdown
          </Link>
        </div>
      </div>
    </div>
  );
}

function BigNumber({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="px-4 text-center">
      <div className="telemetry text-3xl font-bold leading-none text-starlight">{value}</div>
      <div className="mt-1 font-display text-[9px] uppercase tracking-[0.3em] text-muted-star">
        {label} <span className="normal-case">({unit})</span>
      </div>
    </div>
  );
}

function FuelBar({ label, frac, burning }: { label: string; frac: number; burning: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={cn(
          'w-14 shrink-0 text-right font-display text-[9px] uppercase tracking-wider',
          burning ? 'text-flame' : 'text-muted-star',
        )}
      >
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-console-2">
        <div
          className={cn('h-full rounded-full', burning ? 'bg-flame' : 'bg-muted-star/40')}
          style={{ width: `${Math.max(0, Math.min(100, frac * 100))}%` }}
        />
      </div>
      <span className="telemetry w-8 shrink-0 text-[10px] text-muted-star">
        {(frac * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function BottomBand() {
  const t = useTelemetry(
    (s) => ({
      t: s.t,
      speed: s.speed,
      alt: s.altitude,
      stages: s.stages,
      active: s.activeStage,
      booster: s.boosterFuelFrac,
      phase: s.phase,
    }),
    12,
  );
  const events = useMissionStore((s) => s.events);
  const fired = new Set(events.map((e) => e.type));
  if (!t) return null;

  return (
    <div className={cn('absolute inset-x-3 bottom-3 px-5 py-3', GLASS)}>
      <div className="flex items-center gap-4">
        {/* Left: the two numbers every webcast leads with */}
        <div className="flex divide-x divide-line/60">
          <BigNumber label="Speed" value={(t.speed * 3.6).toFixed(0)} unit="km/h" />
          <BigNumber label="Altitude" value={(Math.max(0, t.alt) / 1000).toFixed(1)} unit="km" />
        </div>

        {/* Center: MET + milestone rail */}
        <div className="min-w-0 flex-1 text-center">
          <div className="telemetry text-2xl font-bold leading-none text-phosphor">
            {sToMinSec(t.t)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-1 overflow-hidden">
            {MILESTONES.filter(
              (m) => m.type !== 'BOOSTER_SEP' || t.booster !== undefined || fired.has('BOOSTER_SEP'),
            ).map((m, i, arr) => (
              <div key={m.type} className="flex items-center gap-1">
                <span
                  className={cn(
                    'whitespace-nowrap font-display text-[9px] uppercase tracking-wider',
                    fired.has(m.type) ? 'text-phosphor' : 'text-muted-star/50',
                  )}
                >
                  <span
                    className={cn(
                      'mr-1 inline-block size-1.5 rounded-full align-middle',
                      fired.has(m.type) ? 'bg-phosphor' : 'bg-muted-star/30',
                    )}
                  />
                  {m.label}
                </span>
                {i < arr.length - 1 && <span className="h-px w-3 bg-line/80" />}
              </div>
            ))}
          </div>
        </div>

        {/* Right: propellant */}
        <div className="w-56 shrink-0 space-y-1">
          {t.booster !== undefined && <FuelBar label="Boosters" frac={t.booster} burning />}
          {t.stages.map((s, i) => (
            <FuelBar key={i} label={`Stage ${i + 1}`} frac={s.fuelFrac} burning={i === t.active} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusCluster() {
  const t = useTelemetry((s) => ({ q: s.q, maxQ: s.maxQSoFar, twr: s.twr, g: s.accelG, mach: s.mach }), 8);
  if (!t) return null;
  const chip = (label: string, value: string, hot = false) => (
    <div className={cn('flex items-baseline justify-between gap-3 px-3 py-1.5', GLASS)}>
      <span className="font-display text-[9px] uppercase tracking-wider text-muted-star">{label}</span>
      <span className={cn('telemetry text-sm', hot ? 'text-flame' : 'text-starlight')}>{value}</span>
    </div>
  );
  return (
    <div className="absolute right-3 top-3 flex w-44 flex-col gap-1.5">
      {chip('Dyn. press', `${(t.q / 1000).toFixed(1)} kPa`, t.q > 30e3)}
      {chip('Mach', t.mach.toFixed(1))}
      {chip('TWR', t.twr.toFixed(2))}
      {chip('G-force', `${t.g.toFixed(1)} g`)}
    </div>
  );
}

function LaunchConsole() {
  const navigate = useNavigate();
  const design = useMissionStore((s) => s.design);
  const siteId = useMissionStore((s) => s.siteId);
  const flightPhase = useMissionStore((s) => s.flightPhase);
  const events = useMissionStore((s) => s.events);
  const voiceOn = useUiStore((s) => s.calloutVoiceOn);
  const musicOn = useUiStore((s) => s.musicOn);
  const site = SITES[siteId];

  useSimLoop(true);

  // Audio side-effects for new events.
  useEffect(() => {
    const last = events[events.length - 1];
    if (!last) return;
    if (musicOn) chime(last.severity !== 'critical' && last.severity !== 'warning');
    if (voiceOn) speak(last.message);
  }, [events, voiceOn, musicOn]);

  // Engine rumble follows thrust.
  const rumble = useTelemetry(
    (s) => (s.thrust > 0 ? Math.min(1, s.thrust / 8e6) * Math.max(0.25, 1 - s.altitude / 60_000) : 0),
    5,
  );
  useEffect(() => {
    if (musicOn) setRumble(rumble ?? 0);
    else setRumble(0);
  }, [rumble, musicOn]);
  useEffect(() => () => stopRumble(), []);

  // Phase routing: coast → orbit ops; failed → debrief.
  useEffect(() => {
    if (flightPhase === 'coast' || flightPhase === 'orbit') {
      const t = setTimeout(() => navigate('/orbit'), 2500);
      return () => clearTimeout(t);
    }
    if (flightPhase === 'failed') {
      const t = setTimeout(() => navigate('/debrief'), 3000);
      return () => clearTimeout(t);
    }
  }, [flightPhase, navigate]);

  return (
    <div className="relative h-[calc(100vh-3rem)] overflow-hidden">
      {/* The flight IS the screen */}
      <AscentScene design={design} />

      {/* Top-left: ground track + site */}
      <div className={cn('absolute left-3 top-3 w-80 overflow-hidden', GLASS)}>
        <div className="flex items-center justify-between px-3 py-1.5">
          <span className="font-display text-[9px] uppercase tracking-[0.25em] text-muted-star">
            Ground track
          </span>
          <span className="font-display text-[9px] uppercase tracking-wider text-phosphor">
            {site.name.split(' ')[0]}
          </span>
        </div>
        <div className="h-32">
          <GroundTrackMap
            siteLat={site.latDeg}
            siteLon={site.lonDeg}
            targetAltitude={design.payload.target.altitude}
          />
        </div>
      </div>

      {/* Right: loads cluster */}
      <StatusCluster />

      {/* Right-middle: warp */}
      <div className={cn('absolute right-3 top-44 flex items-center gap-1 px-3 py-1.5', GLASS)}>
        <span className="font-display text-[9px] uppercase tracking-wider text-muted-star">Warp</span>
        {[1, 2, 4].map((w) => (
          <button
            key={w}
            onClick={() => (simController.warp = w)}
            className="telemetry cursor-pointer rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-muted-star hover:text-phosphor"
          >
            {w}×
          </button>
        ))}
      </div>

      {/* Left: charts stack */}
      <div className="absolute left-3 top-44 w-64 space-y-1.5">
        <StripChart metric="altitude" label="Altitude" unit="km" color="#22A385" scale={1000} height={64} />
        <StripChart metric="speed" label="Speed" unit="m/s" color="#5F72E8" height={64} />
        <StripChart metric="accelG" label="Accel" unit="g" color="#BC7A0F" height={64} />
      </div>

      {/* Bottom-right: flight director loop */}
      <div className="absolute bottom-28 right-3 h-32 w-80">
        <EventFeed />
      </div>

      {/* The broadcast band */}
      <BottomBand />
    </div>
  );
}
