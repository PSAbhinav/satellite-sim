// Mission Control — laid out like a real MCC: the front-wall "big board"
// (world map + mission clocks) on top, discipline consoles below (FIDO =
// flight dynamics, BOOSTER = propulsion), and the Flight Director loop
// running across the bottom.

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';
import { useSimLoop } from '@/state/useSimLoop';
import { useTelemetry } from '@/state/useTelemetry';
import { simController } from '@/state/simController';
import { SITES } from '@/sim/env/sites';
import { sToMinSec } from '@/sim/units';
import { AscentScene } from '@/scene/AscentScene';
import { StripChart } from '@/dashboard/StripChart';
import { EventFeed } from '@/dashboard/EventFeed';
import { FuelGauges, LeftRail } from '@/dashboard/Readouts';
import { GroundTrackMap } from '@/dashboard/GroundTrackMap';
import { InfoChip } from '@/components/InfoChip';
import { chime, setRumble, speak, stopRumble } from '@/lib/audio';

function ConsoleLabel({ station, desc }: { station: string; desc: string }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-line px-2 py-1">
      <span className="font-display text-[11px] font-bold tracking-[0.2em] text-phosphor">
        {station}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-star">{desc}</span>
    </div>
  );
}

function BigBoardClocks() {
  const t = useTelemetry((s) => ({ t: s.t, phase: s.phase, alt: s.altitude, v: s.speed }), 10);
  return (
    <div className="flex h-full flex-col justify-center gap-1 px-3">
      <div className="font-display text-[10px] uppercase tracking-[0.25em] text-muted-star">
        Mission elapsed time
      </div>
      <div className="telemetry text-4xl font-bold text-phosphor">{sToMinSec(t?.t ?? 0)}</div>
      <div className="mt-1 flex gap-4 text-[11px] text-muted-star">
        <span>
          PHASE{' '}
          <span className="font-display uppercase text-starlight">
            {t?.phase === 'ascent' ? 'Powered flight' : (t?.phase ?? 'pad')}
          </span>
        </span>
      </div>
      <div className="telemetry mt-1 flex gap-4 text-xs text-muted-star">
        <span>ALT {(Math.max(0, t?.alt ?? 0) / 1000).toFixed(1)} km</span>
        <span>VEL {((t?.v ?? 0) / 1000).toFixed(2)} km/s</span>
      </div>
    </div>
  );
}

export default function Launch() {
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

  // Engine rumble follows thrust (louder low in the atmosphere, where the
  // roar actually reaches your ears).
  const rumble = useTelemetry(
    (s) => (s.thrust > 0 ? Math.min(1, s.thrust / 8e6) * Math.max(0.25, 1 - s.altitude / 60_000) : 0),
    5,
  );
  useEffect(() => {
    if (musicOn) setRumble(rumble ?? 0);
    else setRumble(0);
  }, [rumble, musicOn]);
  useEffect(() => () => stopRumble(), []);

  // Phase routing: coast → orbit ops (circularization); failed → debrief.
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
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-1.5 overflow-hidden p-1.5">
      {/* ── THE BIG BOARD — front wall: clocks + world map + status ── */}
      <div className="grid h-36 shrink-0 grid-cols-[220px_1fr_190px] gap-1.5">
        <div className="rounded-panel border border-line bg-console">
          <BigBoardClocks />
        </div>
        <div className="overflow-hidden rounded-panel border border-line bg-console">
          <GroundTrackMap siteLat={site.latDeg} siteLon={site.lonDeg} />
        </div>
        <div className="flex flex-col rounded-panel border border-line bg-console p-2">
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-muted-star">
            <InfoChip conceptId="mission-control">Flight control</InfoChip>
          </span>
          <div className="mt-2 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted-star">RANGE</span>
              <span className="text-go">GO</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-star">SITE</span>
              <span className="telemetry text-starlight">{site.name.split(' ')[0].toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-star">STATUS</span>
              <span className="font-display uppercase text-phosphor">
                {flightPhase === 'ascent' ? 'FLYING' : flightPhase}
              </span>
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1 pt-2" title="Physics warp">
            <span className="text-[10px] text-muted-star">WARP</span>
            {[1, 2, 4].map((w) => (
              <button
                key={w}
                onClick={() => (simController.warp = w)}
                className="telemetry rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-muted-star hover:text-phosphor cursor-pointer"
              >
                {w}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Console row: FIDO | vehicle view | BOOSTER ── */}
      <div className="grid min-h-0 flex-1 gap-1.5 lg:grid-cols-[190px_1fr_230px]">
        <div className="order-2 flex min-h-0 flex-col rounded-panel border border-line bg-console lg:order-1">
          <ConsoleLabel station="FIDO" desc="Flight dynamics" />
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5">
            <LeftRail />
          </div>
        </div>

        <div className="order-1 min-h-[160px] overflow-hidden rounded-panel border border-line lg:order-2">
          <AscentScene design={design} />
        </div>

        <div className="order-3 flex min-h-0 flex-col rounded-panel border border-line bg-console">
          <ConsoleLabel station="BOOSTER" desc="Propulsion & loads" />
          <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5">
            <FuelGauges />
          </div>
        </div>
      </div>

      {/* ── Trench: strip charts ── */}
      <div className="grid shrink-0 gap-1.5 sm:grid-cols-3">
        <StripChart metric="altitude" label="Altitude" unit="km" color="#22A385" scale={1000} />
        <StripChart metric="speed" label="Speed" unit="m/s" color="#5F72E8" />
        <StripChart metric="accelG" label="Acceleration" unit="g" color="#BC7A0F" />
      </div>

      {/* ── Flight Director loop ── */}
      <div className="h-24 shrink-0">
        <EventFeed />
      </div>
    </div>
  );
}
