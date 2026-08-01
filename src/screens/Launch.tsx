import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';
import { useSimLoop } from '@/state/useSimLoop';
import { AscentScene } from '@/scene/AscentScene';
import { StripChart } from '@/dashboard/StripChart';
import { EventFeed } from '@/dashboard/EventFeed';
import { FuelGauges, LeftRail, MissionClock } from '@/dashboard/Readouts';
import { chime, speak } from '@/lib/audio';

export default function Launch() {
  const navigate = useNavigate();
  const design = useMissionStore((s) => s.design);
  const flightPhase = useMissionStore((s) => s.flightPhase);
  const events = useMissionStore((s) => s.events);
  const voiceOn = useUiStore((s) => s.calloutVoiceOn);
  const musicOn = useUiStore((s) => s.musicOn);

  useSimLoop(true);

  // Audio side-effects for new events.
  useEffect(() => {
    const last = events[events.length - 1];
    if (!last) return;
    if (musicOn) chime(last.severity !== 'critical' && last.severity !== 'warning');
    if (voiceOn) speak(last.message);
  }, [events, voiceOn, musicOn]);

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
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-2 p-2">
      {/* Console header */}
      <div className="flex items-center justify-between rounded-panel border border-line bg-console px-3 py-1.5">
        <span className="font-display text-xs uppercase tracking-[0.25em] text-muted-star">
          Mission Control · Ascent
        </span>
        <MissionClock />
        <span className="font-display text-xs uppercase tracking-wider text-phosphor">
          {flightPhase === 'ascent' ? 'FLYING' : flightPhase.toUpperCase()}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[170px_1fr_240px]">
        {/* Left rail: big readouts */}
        <div className="order-2 lg:order-1">
          <LeftRail />
        </div>

        {/* Center: 3D + strip charts */}
        <div className="order-1 flex min-h-0 flex-col gap-2 lg:order-2">
          <div className="min-h-[240px] flex-1 overflow-hidden rounded-panel border border-line">
            <AscentScene design={design} />
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <StripChart metric="altitude" label="Altitude" unit="km" color="#22A385" scale={1000} />
            <StripChart metric="speed" label="Speed" unit="m/s" color="#5F72E8" />
            <StripChart metric="accelG" label="Acceleration" unit="g" color="#BC7A0F" />
          </div>
        </div>

        {/* Right rail: gauges + events */}
        <div className="order-3 flex min-h-0 flex-col gap-2">
          <FuelGauges />
          <div className="min-h-[140px] flex-1">
            <EventFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
