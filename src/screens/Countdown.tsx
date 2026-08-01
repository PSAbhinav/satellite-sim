import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SITES } from '@/sim/env/sites';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';
import { simController } from '@/state/simController';
import { beep, speak } from '@/lib/audio';

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

  const [count, setCount] = useState(20);
  const [running, setRunning] = useState(false);
  const [lastCall, setLastCall] = useState('Standing by for terminal count.');
  const navigated = useRef(false);

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
      if (!navigated.current) {
        navigated.current = true;
        unlockPedia(['launch']);
        simController.launch();
        navigate('/launch');
      }
      return;
    }
    const call = SEQUENCE.find((s) => s.t === count);
    if (call) {
      setLastCall(call.text);
      if (voiceOn) speak(call.text);
    }
    beep(count <= 10 ? 990 : 660, count <= 3 ? 160 : 70, 0.09);
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [running, count, navigate, unlockPedia, voiceOn]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 p-10 text-center">
      <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-star">
        {SITES[siteId].name} · {design.payload.name} · {design.payload.target.label}
      </p>

      <div className="telemetry text-8xl font-bold tabular-nums text-starlight">
        T−{String(Math.max(count, 0)).padStart(2, '0')}
        <span className="text-2xl text-muted-star">s</span>
      </div>

      <Card className="w-full">
        <CardContent className="p-4">
          <p className="font-display text-phosphor">{lastCall}</p>
        </CardContent>
      </Card>

      {!running ? (
        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link to="/site">Back to weather</Link>
          </Button>
          <Button size="lg" variant="go" onClick={() => setRunning(true)}>
            Start terminal count
          </Button>
        </div>
      ) : (
        <Button
          variant="destructive"
          onClick={() => {
            setRunning(false);
            setCount(20);
            setLastCall('Hold, hold, hold. Count reset — take your time.');
          }}
        >
          HOLD / abort count
        </Button>
      )}

      <p className="max-w-md text-xs text-muted-star">
        Real countdowns are checklists with teeth: every second maps to a task, and any station can
        call a hold. Yours is 20 seconds — savour it.
      </p>
    </div>
  );
}
