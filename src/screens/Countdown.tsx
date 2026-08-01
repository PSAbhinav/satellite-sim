// Terminal count as a broadcast lower-third: big T-minus clock, the launch
// auto-sequence filling in as a live checklist, and hold/launch controls —
// over a full-bleed view of the vehicle on the pad. Rumble builds at T-3.

import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, CircleDot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SITES } from '@/sim/env/sites';
import { liftoffTWR } from '@/sim/model/rocket';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';
import { simController } from '@/state/simController';
import { useSimLoop } from '@/state/useSimLoop';
import { AscentScene } from '@/scene/AscentScene';
import { beep, setRumble, speak } from '@/lib/audio';
import { cn } from '@/lib/utils';

const COUNT_FROM = 20;

const SEQUENCE: { t: number; text: string; short: string }[] = [
  { t: 20, text: 'Launch auto-sequence started.', short: 'Auto-sequence' },
  { t: 15, text: 'Propellant tanks pressurized.', short: 'Tanks pressed' },
  { t: 10, text: 'Go for launch.', short: 'Go for launch' },
  { t: 6, text: 'Engine chill complete.', short: 'Engine chill' },
  { t: 3, text: 'Ignition sequence start.', short: 'Ignition' },
  { t: 0, text: 'Liftoff!', short: 'Liftoff' },
];

export default function Countdown() {
  const navigate = useNavigate();
  const design = useMissionStore((s) => s.design);
  const siteId = useMissionStore((s) => s.siteId);
  const clearFlight = useMissionStore((s) => s.clearFlight);
  const unlockPedia = useMissionStore((s) => s.unlockPedia);
  const voiceOn = useUiStore((s) => s.calloutVoiceOn);
  const musicOn = useUiStore((s) => s.musicOn);

  const [count, setCount] = useState(COUNT_FROM);
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
        setLastCall('Liftoff! We have liftoff.');
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
      {/* Cinematic slow orbit around the pad while the count runs. */}
      <AscentScene design={design} cinematic />

      {/* Mission strap, top center */}
      <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
        <p className="rounded-full border border-line/60 bg-void/70 px-4 py-1 font-display text-[11px] uppercase tracking-[0.3em] text-starlight/90 backdrop-blur">
          {SITES[siteId].name} · {design.payload.name} · {design.payload.target.label}
        </p>
      </div>

      {/* Broadcast lower-third */}
      <div className="absolute inset-x-0 bottom-0 border-t border-line bg-void/85 backdrop-blur-md">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 py-4 lg:grid-cols-[230px_1fr_auto]">
          {/* Clock */}
          <div>
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-muted-star">
              Terminal count
            </div>
            <div className="telemetry text-6xl font-bold leading-none text-phosphor">
              T−{String(Math.max(count, 0)).padStart(2, '0')}
              <span className="text-xl text-muted-star">s</span>
            </div>
            <Progress
              className="mt-2"
              value={((COUNT_FROM - Math.max(count, 0)) / COUNT_FROM) * 100}
              barClassName={count <= 3 ? 'bg-flame' : 'bg-phosphor'}
            />
          </div>

          {/* Auto-sequence checklist */}
          <div>
            <p className="mb-2 font-display text-xs text-phosphor">{lastCall}</p>
            <div className="flex flex-wrap gap-2">
              {SEQUENCE.map((s) => {
                // A step is done once the count has reached it; the next one
                // to fire (largest t below the current count) blinks amber.
                const done = running && count <= s.t && (s.t !== 0 || lifted.current);
                const isLiftoff = s.t === 0 && lifted.current;
                const nextT = Math.max(-1, ...SEQUENCE.filter((n) => n.t < count).map((n) => n.t));
                const active = running && !done && s.t === nextT;
                return (
                  <span
                    key={s.t}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1 font-display text-[10px] uppercase tracking-wider transition-colors',
                      done || isLiftoff
                        ? 'border-phosphor/50 bg-phosphor/10 text-phosphor'
                        : active
                          ? 'border-flame/50 bg-flame/10 text-flame'
                          : 'border-line bg-console-2/50 text-muted-star',
                    )}
                  >
                    {done || isLiftoff ? (
                      <Check className="size-3" />
                    ) : (
                      <CircleDot className={cn('size-3', active && 'animate-blink')} />
                    )}
                    T−{s.t} {s.short}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Controls */}
          <div className="flex gap-2">
            {!running ? (
              liftoffTWR(design) <= 1 ? (
                <>
                  <span className="max-w-52 self-center text-right text-xs text-crimson">
                    TWR {liftoffTWR(design).toFixed(2)} — thrust below weight; this vehicle cannot
                    leave the pad.
                  </span>
                  <Button asChild variant="destructive">
                    <Link to="/build">Return to Assembly</Link>
                  </Button>
                </>
              ) : (
              <>
                <Button asChild variant="secondary">
                  <Link to="/site">Back to weather</Link>
                </Button>
                <Button size="lg" variant="go" onClick={() => setRunning(true)}>
                  Start terminal count
                </Button>
              </>
              )
            ) : count > 0 ? (
              <Button
                variant="destructive"
                onClick={() => {
                  setRunning(false);
                  setCount(COUNT_FROM);
                  setRumble(0);
                  setLastCall('Hold, hold, hold. Count reset — take your time.');
                }}
              >
                HOLD / abort count
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
