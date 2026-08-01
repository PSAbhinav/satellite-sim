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
    // Auto-brake the warp near apoapsis / burn ignition so the player can't
    // skip the maneuver at 1000× (the orbit would coast on into reentry).
    let warp = this.warp;
    const prev = telemetryBus.get();
    const tta = prev?.orbit?.timeToApoapsisS;
    const burn = prev?.burn;
    if (burn?.burning) {
      warp = 1;
      this.warp = 1; // the burn plays out in real time, like a real webcast
    } else if (burn?.armed && burn.tToIgnitionS > 0.5 && burn.tToIgnitionS < warp * 2) {
      warp = Math.max(1, burn.tToIgnitionS / 2);
    } else if (
      this.sim.phase === 'coast' &&
      !burn &&
      tta !== undefined &&
      tta > 0.5 &&
      tta < warp * 2
    ) {
      warp = Math.max(1, tta / 2);
    }
    this.clock.advance(realDt, warp, (dt) => this.sim.step(dt));
    const snap = this.sim.snapshot();
    telemetryBus.publish(snap);
    const events = this.sim.drainEvents();
    telemetryBus.pushEvents(events);
    // Apoapsis or engine relight drops warp to 1× — that's the burn window.
    if (events.some((e) => e.type === 'APOAPSIS' || e.type === 'SES_2')) this.warp = 1;
    if (this.sim.phase === 'failed') this.running = false;
    return events;
  }

  armBurn(): void {
    this.sim.armInsertionBurn();
    telemetryBus.publish(this.sim.snapshot());
  }

  stop(): void {
    this.running = false;
  }
}

export const simController = new SimController();

// Debug/E2E handle.
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__sim = simController;
}
