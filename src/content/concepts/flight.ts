import type { Concept } from '../types';

export const concepts: Concept[] = [
  {
    id: 'max-q',
    term: 'Max-Q',
    category: 'flight',
    unlock: 'launch',
    short: 'The moment the air squeezes the rocket hardest. Survive this and space gets easier.',
    unit: 'Pa',
    levels: {
      kid: 'Stick your hand out of a car window — the faster the car, the harder the wind pushes. A rocket feels that too! Max-Q is the moment the wind pushes hardest. After that the air gets thinner and thinner until there’s no wind at all.',
      student:
        'Dynamic pressure q = ½·ρ·v² grows with speed but shrinks as air density drops with altitude. Early in flight speed wins; later thin air wins. The peak — Max-Q, usually 10–15 km up — is the worst structural squeeze of the flight. Exceed the vehicle’s limit and it breaks apart.',
      engineer:
        'q(t) = ½ρ(h)v². With exponential density and increasing v, dq/dt = 0 typically at ~30–35 kPa for medium-lift vehicles. Real vehicles throttle down through Max-Q to cap structural and bending loads (aero moments scale with q·α).',
    },
    formula: {
      tex: 'q = \\tfrac{1}{2}\\rho v^2',
      legend: [
        ['\\rho', 'air density (falls with altitude)'],
        ['v', 'speed through the air'],
      ],
    },
    related: ['drag', 'mach', 'twr'],
  },
  {
    id: 'drag',
    term: 'Atmospheric drag',
    category: 'flight',
    unlock: 'launch',
    short: 'Air resistance — the price of flying through the atmosphere instead of above it.',
    unit: 'N',
    levels: {
      kid: 'Try running in a swimming pool. The water pushes back, right? Air does the same to rockets — just gentler. Rockets are pointy so they can slice through the air instead of shoving it.',
      student:
        'Drag = ½·ρ·v²·Cd·A: it grows with the square of speed, the density of air, the drag coefficient (shape) and cross-section area. It steals ~100–150 m/s of Δv on a typical ascent — one reason rockets climb above the atmosphere before building horizontal speed.',
      engineer:
        'The sim computes drag against the co-rotating atmosphere (v_rel = v − Ω×r) with a fixed Cd and reference area, plus fairing area while attached. Exponential isothermal density (H = 8.5 km). Above ~140 km density is treated as zero.',
    },
    formula: {
      tex: 'F_D = \\tfrac{1}{2}\\rho v^2 C_D A',
      legend: [
        ['C_D', 'drag coefficient (shape)'],
        ['A', 'cross-section area'],
      ],
    },
    related: ['max-q', 'fairing'],
  },
  {
    id: 'mach',
    term: 'Mach number',
    category: 'flight',
    unlock: 'launch',
    short: 'Your speed measured in "speeds of sound". Mach 1 = you outrun your own noise.',
    levels: {
      kid: 'Sound travels fast — but rockets travel faster! When a rocket reaches Mach 1, it flies quicker than its own roar. People below hear a BOOM when the sound finally catches up.',
      student:
        'Mach = speed ÷ local speed of sound (~340 m/s at sea level, less higher up where it is colder). Passing Mach 1 ("going supersonic") happens about a minute into flight and changes how air flows around the vehicle — shockwaves form.',
      engineer:
        'M = v_rel/a(h), with a ≈ √(γRT). Transonic flow (M 0.8–1.2) produces the highest drag coefficients and buffet; callouts flag it because it closely precedes Max-Q on most ascent profiles.',
    },
    related: ['max-q', 'drag'],
  },
  {
    id: 'gravity-turn',
    term: 'Gravity turn',
    category: 'flight',
    unlock: 'launch',
    short: 'Tip over a little, then let gravity steer you into a smooth curve to orbit.',
    levels: {
      kid: 'Rockets don’t fly straight up to space — space is sideways! The rocket climbs a bit, leans over a tiny bit, and then gravity gently bends its path until it’s flying sideways super fast. Like a ball thrown so hard it never comes down.',
      student:
        'Orbit is about horizontal speed, not height. A rocket climbs vertically to clear the thick air, "kicks" a few degrees over, then follows its own velocity vector while gravity curves the path toward horizontal. Done right, the rocket ends up moving sideways at ~7.7 km/s just as it reaches its target altitude.',
      engineer:
        'After the pitch kick, thrust tracks the velocity vector so angle of attack ≈ 0 (minimizing aero loads); gravity provides the pitch rate: dγ/dt = −(g − v²/r)·cos γ / v. Kick timing/angle trades gravity losses against q — too shallow sags back into the atmosphere, too steep wastes Δv lofting.',
    },
    related: ['twr', 'max-q', 'orbital-velocity'],
  },
  {
    id: 'g-force',
    term: 'G-force',
    category: 'flight',
    unlock: 'launch',
    short: 'How hard acceleration squishes you into your seat, measured in Earth-gravities.',
    unit: 'g',
    levels: {
      kid: 'When a rollercoaster shoots forward, you feel squished into the seat — that’s g-force! Astronauts feel about 3 g at launch: like two friends your own weight sitting on your chest. Trained astronauts just smile through it.',
      student:
        'One g is normal Earth gravity. During ascent, thrust on an ever-lighter rocket pushes acceleration up to ~3–4 g before engine cutoff. Crewed vehicles throttle to keep it comfortable; satellites are built to survive whatever their ride dishes out.',
      engineer:
        'Felt g = |a_thrust + a_drag|/g0 (gravity itself is not "felt" — free fall is 0 g). Peak typically arrives just before MECO when the mass is lowest. The sim reports felt acceleration, so orbit shows 0 g even though gravity is very much still there.',
    },
    related: ['twr', 'thrust'],
  },
  {
    id: 'fairing',
    term: 'Payload fairing',
    category: 'flight',
    unlock: 'launch',
    short: 'The nose-cone shell that shields the satellite, then splits away when air runs out.',
    levels: {
      kid: 'The satellite rides inside a smooth egg-shell nose so the rushing wind can’t hurt it. Once the rocket is above the air, the shell pops off in two halves — the satellite peeks out for the first time!',
      student:
        'The fairing streamlines the rocket and protects the payload from aerodynamic pressure and heating. Around 110 km, where the air is essentially gone, it is jettisoned — carrying it further would waste Δv on dead mass.',
      engineer:
        'Fairing separation altitude trades residual q heating (needs to be low enough) against carrying its mass longer (Δv penalty in every subsequent second of burn). In the sim it adds drag area and mass until its jettison altitude.',
    },
    related: ['drag', 'staging'],
  },
  {
    id: 'mission-control',
    term: 'Mission Control Center',
    category: 'flight',
    unlock: 'launch',
    short: 'The room that flies the rocket after it leaves the pad — one screen per specialist.',
    levels: {
      kid: 'A rocket has one pilot on board (sometimes none!) but a whole room of helpers on the ground. Each desk watches one thing — fuel, path, weather — and the big screen up front shows where the rocket is flying over the Earth. The boss is called the Flight Director, and everyone answers "GO!" or "NO-GO!" when asked.',
      student:
        'A Mission Control Center is organized by discipline: FIDO tracks the trajectory, BOOSTER watches propulsion, GNC the guidance, SURGEON the crew, while the Flight Director runs the room and CAPCOM is the single voice talking to the vehicle. The front wall shows the ground track on a world map plus mission clocks — the layout this dashboard copies.',
      engineer:
        'The classic MOCR/FCR layout: tiered console rows ("the trench" is the front row of trajectory operators), voice loops keyed by discipline, and go/no-go polls at decision gates (launch commit, TLI, deorbit). Modern rooms (SpaceX Hawthorne, JSC FCR-1) keep the same information architecture: role-scoped telemetry consoles + shared situational big board.',
    },
    related: ['launch-window'],
  },
  {
    id: 'launch-window',
    term: 'Launch window & scrubs',
    category: 'weather',
    unlock: 'launch',
    short: 'Rockets wait for the sky to say yes. A scrub is a "not today", not a failure.',
    levels: {
      kid: 'Even the mightiest rocket is scared of storms! If the wind is too pushy or lightning is nearby, mission control says "scrub!" and everyone tries again another day. It’s like recess being moved because of rain — annoying but smart.',
      student:
        'Launch commit criteria are strict weather rules: surface winds (~30 kt limit), lightning within ~10 nautical miles, thick cold cloud layers, wind shear aloft. Any violation scrubs the launch. Apollo 12 was struck by lightning twice on ascent — the rules exist because of days like that.',
      engineer:
        'Each criterion maps to a physical failure mode: ground winds → tower recontact and drift; shear layers → bending loads at high q; charged/thick clouds → triggered lightning (the vehicle plume is conductive); temperature bounds → seal and propellant conditioning limits (Challenger).',
    },
    related: ['max-q'],
  },
];
