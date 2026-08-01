// The single rAF driver bridging sim → React. Continuous data goes to the
// telemetry bus (no re-renders); discrete events/phase changes go to zustand.

import { useEffect } from 'react';
import { simController } from './simController';
import { useMissionStore } from './useMissionStore';

export function useSimLoop(active: boolean): void {
  const pushEvents = useMissionStore((s) => s.pushEvents);
  const setFlightPhase = useMissionStore((s) => s.setFlightPhase);
  const setResult = useMissionStore((s) => s.setResult);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    let last = performance.now();
    let lastPhase = simController.sim.phase;

    const frame = (now: number) => {
      const realDt = (now - last) / 1000;
      last = now;
      const events = simController.tick(realDt);
      if (events.length) pushEvents(events);
      if (simController.sim.phase !== lastPhase) {
        lastPhase = simController.sim.phase;
        setFlightPhase(lastPhase);
      }
      if (simController.sim.result) setResult(simController.sim.result);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [active, pushEvents, setFlightPhase, setResult]);
}
