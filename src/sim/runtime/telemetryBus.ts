// The hot path. Continuous telemetry never touches React state — the 3D scene
// and charts read this bus imperatively (useFrame / rAF), and text readouts
// sample it through a throttled hook. This is the fix for the old prototype's
// setState-per-frame re-render storm.

import type { SimSnapshot } from './snapshot';
import type { SimEvent } from './events';

const HISTORY_CAP = 36_000; // 12 min of ascent at 50 Hz

class TelemetryBus {
  private latest: SimSnapshot | null = null;
  /** Downsampled history for strip charts: [t, altitude, speed, accelG, q]. */
  readonly history: { t: number[]; altitude: number[]; speed: number[]; accelG: number[]; q: number[] } = {
    t: [],
    altitude: [],
    speed: [],
    accelG: [],
    q: [],
  };
  private eventLog: SimEvent[] = [];

  publish(s: SimSnapshot): void {
    this.latest = s;
    const h = this.history;
    // Record at most ~10 Hz of history for charts.
    const last = h.t.length ? h.t[h.t.length - 1] : -Infinity;
    if (s.t - last >= 0.1) {
      h.t.push(s.t);
      h.altitude.push(s.altitude);
      h.speed.push(s.speed);
      h.accelG.push(s.accelG);
      h.q.push(s.q);
      if (h.t.length > HISTORY_CAP) {
        h.t.shift();
        h.altitude.shift();
        h.speed.shift();
        h.accelG.shift();
        h.q.shift();
      }
    }
  }

  pushEvents(events: SimEvent[]): void {
    if (events.length) this.eventLog.push(...events);
  }

  get(): SimSnapshot | null {
    return this.latest;
  }

  getEvents(): readonly SimEvent[] {
    return this.eventLog;
  }

  reset(): void {
    this.latest = null;
    this.eventLog = [];
    const h = this.history;
    h.t.length = h.altitude.length = h.speed.length = h.accelG.length = h.q.length = 0;
  }
}

export const telemetryBus = new TelemetryBus();
