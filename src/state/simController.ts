// Singleton owning the Simulation instance and the fixed-step clock.
// One rAF loop lives in useSimLoop; everything else reads the telemetry bus.

import { Simulation } from '@/sim/runtime/simulation';
import { SimClock } from '@/sim/runtime/clock';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import type { MissionConfig } from '@/sim/runtime/simulation';

class SimController {
  readonly sim = new Simulation();
  readonly clock = new SimClock();
  /** Time warp (1× in atmosphere; up to 1000× on orbit). */
  warp = 1;
  running = false;

  configure(cfg: MissionConfig): void {
    this.sim.configure(cfg);
    this.clock.reset();
    this.warp = 1;
    telemetryBus.reset();
    telemetryBus.publish(this.sim.snapshot());
  }

  launch(): void {
    this.sim.ignite();
    this.running = true;
  }

  /** Advance by real frame seconds; publishes to the bus. Returns drained events. */
  tick(realDt: number) {
    if (!this.running) return [];
    this.clock.advance(realDt, this.warp, (dt) => this.sim.step(dt));
    const snap = this.sim.snapshot();
    telemetryBus.publish(snap);
    const events = this.sim.drainEvents();
    telemetryBus.pushEvents(events);
    if (this.sim.phase === 'failed') this.running = false;
    return events;
  }

  circularize(): void {
    this.sim.circularize();
    telemetryBus.publish(this.sim.snapshot());
  }

  stop(): void {
    this.running = false;
  }
}

export const simController = new SimController();
