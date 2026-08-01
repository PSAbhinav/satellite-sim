# Orbital Academy (satellite-sim)

A physics-first space program for every age, in the browser. Build a rocket from
**real flight hardware** (Falcon 9, Saturn V, PSLV, Electron…), fight the weather
through a real go/no-go poll, fly the launch from a mission-control room modeled
on the real MCC, coast to apoapsis, circularize — and unlock the Spacepedia and
Solar System as you go.

Successor to Satellite-Sim Phase 3/4: rebuilt from scratch with an actual
physics engine instead of mock telemetry.

## The physics is real

All simulation runs in the browser, in a pure-TypeScript core (`src/sim/`) with
a 36-test known-answer suite:

- **Tsiolkovsky rocket equation** per stage — Δv budgets, TWR, mass ratios
- **RK4 ascent integration** in the inertial launch plane: inverse-square
  gravity, exponential-atmosphere drag against the rotating air, pressure-blended
  thrust, gravity-turn steering at zero angle of attack
- **Closed-form Kepler propagation** on orbit (zero drift at 1000× time-warp),
  state-vector ↔ orbital-elements conversion, vector circularization burns
- **Seeded weather + launch-commit criteria** modeled on the real lightning/wind
  rules — same site + same day always gives the same briefing
- Honest failure modes: max-Q breakup, trajectory sag, reentry, propellant
  depletion, escape — each explained in the debrief at your chosen depth

Explanations adapt via the age dial: **Kid / Student / Engineer**, down to the
formulas (KaTeX) on every concept chip.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173/satellite-sim/
npm test           # physics known-answer suite
npm run build
```

## Simplifications (taught, not hidden)

Spherical Earth (no J2), no third body, isothermal atmosphere, point-mass
vehicle, impulsive burns, due-east launches (inclination = site latitude).
Each is labeled in-app where it matters.

## Credits

Earth textures derived from NASA Blue Marble imagery (via the original
Satellite-Sim repos, recompressed). Music and sound are synthesized live in
Web Audio — no audio assets. Built with React 19, three.js/R3F, zustand,
uPlot, Radix, Tailwind v4.
