// Warm path: sample the telemetry bus at a modest rate for text readouts.
// Never subscribe React state to the 50 Hz stream directly.

import { useEffect, useState } from 'react';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import type { SimSnapshot } from '@/sim/runtime/snapshot';

export function useTelemetry<T>(
  select: (s: SimSnapshot) => T,
  hz = 10,
): T | null {
  const [value, setValue] = useState<T | null>(() => {
    const s = telemetryBus.get();
    return s ? select(s) : null;
  });

  useEffect(() => {
    let raf = 0;
    let lastSample = 0;
    const period = 1000 / hz;
    const tick = (now: number) => {
      if (now - lastSample >= period) {
        lastSample = now;
        const s = telemetryBus.get();
        if (s) {
          const next = select(s);
          setValue((prev) =>
            JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
          );
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hz]);

  return value;
}
