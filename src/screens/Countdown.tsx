// Terminal count over a live view of the pad: the vehicle stands fueled, the
// rumble builds at T-3 (ignition sequence), and liftoff happens in-scene
// before mission control takes over.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SITES } from '@/sim/env/sites';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';
import { simController } from '@/state/simController';
import { useSimLoop } from '@/state/useSimLoop';
import { AscentScene } from '@/scene/AscentScene';
import { beep, setRumble, speak } from '@/lib/audio';

const SEQUENCE: { t: number; text: string }[] = [
  { t: 20, text: 'Launch auto-sequence started.' },
  { t: 15, text: 'Propellant tanks pressurized.' },
  { t: 10, text: 'Go for launch.' },
  { t: 6, text: 'Engine chill complete.' },
  { t: 3, text: 'Ignition sequence start.' },
];

export default function Countdown() {
  const navigate = useNavigate();
  const design = useMissionStore((s) => s.design);
  const siteId = useMissionStore((s) => s.siteId);
  const clearFlight = useMissionStore((s) => s.clearFlight);
  const unlockPedia = useMissionStore((s) => s.unlockPedia);
  const voiceOn = useUiStore((s) => s.calloutVoiceOn);
  const musicOn = useUiStore((s) => s.musicOn);

  const [count, setCount] = useState(20);
  const [running, setRunning] = useState(false);
  const [lastCall, setLastCall] = useState('Standing by for terminal count.');
  const lifted = useRef(false);

  useSimLoop(true);

  // Configure the simulation while we sit on the pad.
  useEffect(() => {
    clearFlight();
    simController.configure({
      design,
      site: SITES[siteId],
      targetAltitude: design.payload.target.altitude,
    });
  }, [design, siteId, clearFlight]);

  useEffect(() => {
    if (!running) return;
    if (count <= 0) {
      if (!lifted.current) {
        lifted.current = true;
        unlockPedia(['launch']);
        simController.launch();
        setLastCall('Liftoff!');
        // Let the ignition play out on the pad before mission control.
        const t = setTimeout(() => navigate('/launch'), 2600);
        return () => clearTimeout(t);
      }
      return;
    }
    const call = SEQUENCE.find((s) => s.t === count);
    if (call) {
      setLastCall(call.text);
      if (voiceOn) speak(call.text);
    }
    if (musicOn && count <= 3) setRumble(0.12 * (4 - count)); // engines spooling
    beep(count <= 10 ? 990 : 660, count <= 3 ? 160 : 70, 0.09);
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [running, count, navigate, unlockPedia, voiceOn, musicOn]);

  return (
    <div className="relative h-[calc(100vh-3rem)] overflow-hidden">
      <AscentScene design={design} />

      {/* Overlay: clock + callout, mission-control style. */}
      <div className="pointer-events-none absolute inset-x-0 top-6 flex flex-col items-center gap-2">
        <p className="font-display text-[11px] uppercase tracking-[0.3em] text-starlight/80 [text-shadow:0_1px_8px_rgba(0,0,0,0.8)]">
          {SITES[siteId].name} · {design.payload.name} · {design.payload.target.label}
        </p>
        <div className="telemetry rounded-panel border border-line/60 bg-void/70 px-8 py-3 text-7xl font-bold tabular-nums text-starlight backdrop-blur">
          T−{String(Math.max(count, 0)).padStart(2, '0')}
          <span className="text-2xl text-muted-star">s</span>
        </div>
        <p className="rounded-panel bg-void/70 px-4 py-1 font-display text-phosphor backdrop-blur">
          {lastCall}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-center gap-3">
        {!running ? (
          <>
            <Button asChild variant="secondary">
              <Link to="/site">Back to weather</Link>
            </Button>
            <Button size="lg" variant="go" onClick={() => setRunning(true)}>
              Start terminal count
            </Button>
          </>
        ) : count > 0 ? (
          <Button
            variant="destructive"
            onClick={() => {
              setRunning(false);
              setCount(20);
              setRumble(0);
              setLastCall('Hold, hold, hold. Count reset — take your time.');
            }}
          >
            HOLD / abort count
          </Button>
        ) : null}
      </div>
    </div>
  );
}
