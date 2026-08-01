// Fixed-timestep accumulator ("fix your timestep"). Physics runs at a constant
// dt regardless of display frame rate; render frames may run 0..N steps.

export class SimClock {
  private acc = 0;

  constructor(
    readonly fixedDt = 0.02,
    /** Clamp on real frame time so a background tab doesn't spiral. */
    readonly maxFrame = 0.25,
    /** Hard cap on physics steps per frame at high warp. */
    readonly maxStepsPerFrame = 400,
  ) {}

  /** Advance by realDt seconds of wall time at the given warp. Returns steps run. */
  advance(realDt: number, warp: number, step: (dt: number) => void): number {
    this.acc += Math.min(realDt, this.maxFrame) * warp;
    let steps = 0;
    while (this.acc >= this.fixedDt && steps < this.maxStepsPerFrame) {
      step(this.fixedDt);
      this.acc -= this.fixedDt;
      steps++;
    }
    // Drop any remainder beyond the cap (visible only at extreme warp).
    if (this.acc >= this.fixedDt) this.acc = 0;
    return steps;
  }

  reset(): void {
    this.acc = 0;
  }
}
