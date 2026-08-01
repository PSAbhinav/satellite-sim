import type { Concept } from '../types';

export const concepts: Concept[] = [
  {
    id: 'delta-v',
    term: 'Delta-v (Δv)',
    category: 'rocketry',
    unlock: 'start',
    short: 'How much a rocket can change its speed — its "fuel budget" for the whole trip.',
    unit: 'm/s',
    levels: {
      kid: 'Think of Δv as the size of your rocket’s piggy bank, but for speed instead of money. Going to orbit "costs" about 9,400 speed-points. If your piggy bank holds less, you can’t buy the trip — no matter how brave your rocket is!',
      student:
        'Delta-v is the total change in velocity a rocket can produce. Reaching low Earth orbit costs roughly 9.4 km/s: ~7.7 km/s of orbital speed plus ~1.6 km/s lost to gravity and air drag on the way up. Your design must carry at least that much Δv or it physically cannot reach orbit.',
      engineer:
        'Δv is the integral of thrust acceleration over the burn and the standard budget currency of mission design. It is computed per stage from the Tsiolkovsky equation and summed. LEO insertion budgets ≈ 9.3–9.6 km/s from sea level, dominated by circular velocity at target altitude plus gravity/drag/steering losses, minus the launch-site rotation credit.',
    },
    formula: {
      tex: '\\Delta v = I_{sp}\\, g_0 \\ln\\left(\\frac{m_0}{m_f}\\right)',
      legend: [
        ['I_{sp}', 'engine efficiency (specific impulse, seconds)'],
        ['g_0', 'standard gravity, 9.81 m/s²'],
        ['m_0', 'mass with fuel (wet)'],
        ['m_f', 'mass without fuel (dry)'],
      ],
    },
    related: ['isp', 'staging', 'twr'],
  },
  {
    id: 'isp',
    term: 'Specific impulse (Isp)',
    category: 'rocketry',
    unlock: 'start',
    short: 'Engine efficiency — how much push you get from each kilogram of fuel.',
    unit: 's',
    levels: {
      kid: 'Isp is like a car’s "kilometres per litre", but for rockets. An engine with a bigger Isp squeezes more push out of every drop of fuel, so your rocket can go further on the same tank.',
      student:
        'Specific impulse measures how efficiently an engine turns propellant into thrust — the number of seconds one kilogram of propellant can produce one kilogram-force of thrust. Sea-level engines reach ~280–310 s; vacuum engines ~340–360 s because their big nozzles work better without air pushing back.',
      engineer:
        'Isp = thrust / (mass flow × g0) = effective exhaust velocity / g0. It varies with ambient pressure: nozzle expansion optimized for vacuum over-expands at sea level. That is why upper stages use large expansion-ratio nozzles (MVac-class ≈ 348 s) while boosters trade Isp for sea-level thrust.',
    },
    formula: {
      tex: 'I_{sp} = \\frac{F}{\\dot{m}\\, g_0}',
      legend: [
        ['F', 'thrust (newtons)'],
        ['\\dot{m}', 'propellant burned per second (kg/s)'],
        ['g_0', 'standard gravity'],
      ],
    },
    related: ['delta-v', 'thrust'],
  },
  {
    id: 'twr',
    term: 'Thrust-to-weight ratio (TWR)',
    category: 'rocketry',
    unlock: 'start',
    short: 'Push vs weight. Below 1.0, your rocket sits on the pad and burns fuel for nothing.',
    levels: {
      kid: 'Imagine trying to jump while wearing a backpack full of rocks. If your legs push harder than the backpack pulls down, you jump! TWR is that contest for rockets — the engines must beat the rocket’s weight, or it just sits there making noise.',
      student:
        'TWR = thrust ÷ weight. At liftoff it must exceed 1.0 or the rocket cannot leave the pad. Real launchers lift off around 1.2–1.5: enough to climb briskly, not so much that the atmosphere batters the vehicle (see Max-Q). TWR rises during flight as fuel burns off.',
      engineer:
        'TWR(t) = F(h) / (m(t)·g). Liftoff TWR uses sea-level thrust. Low TWR increases gravity losses (longer fighting gravity); high TWR increases aero loads and peak q. Upper stages can run TWR < 1 in vacuum since they only need horizontal acceleration, not to hold their own weight.',
    },
    formula: {
      tex: '\\mathrm{TWR} = \\frac{F}{m\\, g_0}',
      legend: [
        ['F', 'total thrust'],
        ['m', 'current vehicle mass'],
        ['g_0', 'standard gravity'],
      ],
    },
    related: ['thrust', 'max-q', 'delta-v'],
  },
  {
    id: 'thrust',
    term: 'Thrust',
    category: 'rocketry',
    unlock: 'start',
    short: 'The push. Hot gas goes down, rocket goes up — Newton’s third law at full volume.',
    unit: 'N',
    levels: {
      kid: 'Blow up a balloon and let it go — it zooms because air rushes out one way and the balloon shoots the other way. A rocket engine is a very serious, very hot balloon that does this on purpose, non-stop.',
      student:
        'Thrust is the reaction force from throwing exhaust mass backward at high speed (Newton’s third law). It equals mass flow × exhaust velocity, plus a pressure term at the nozzle exit. Nine Pyxis-class engines produce ~7,600 kN at sea level — enough to lift ~550 tonnes and accelerate.',
      engineer:
        'F = ṁ·ve + (pe − pa)·Ae. Ambient pressure pa reduces net thrust at sea level, which is why vacuum thrust exceeds sea-level thrust for the same engine. The sim blends thrust between SL and vacuum values with an exponential pressure ratio.',
    },
    formula: {
      tex: 'F = \\dot{m}\\, v_e + (p_e - p_a)A_e',
      legend: [
        ['\\dot{m}', 'exhaust mass flow'],
        ['v_e', 'exhaust velocity'],
        ['p_e, p_a', 'exit and ambient pressure'],
        ['A_e', 'nozzle exit area'],
      ],
    },
    related: ['isp', 'twr'],
  },
  {
    id: 'staging',
    term: 'Staging',
    category: 'rocketry',
    unlock: 'build',
    short: 'Drop the empty parts. Dead weight is the enemy of Δv.',
    levels: {
      kid: 'Imagine running a race carrying an empty lunchbox. Silly, right? Rockets agree! When a fuel tank is empty, the rocket drops it so it doesn’t have to carry useless weight all the way to space.',
      student:
        'A rocket that kept its empty tanks would waste enormous energy hauling dead mass. Staging discards empty structure mid-flight, so the remaining engines push a lighter vehicle. Two stages roughly double the payload a rocket can deliver versus one big stage with the same fuel.',
      engineer:
        'Staging raises the effective mass ratio: Δv_total = Σ Isp,i·g0·ln(m0,i/mf,i), where each stage’s m0 excludes previously dropped structure. The optimum split balances stage dry-mass fractions and Isp differences (vacuum upper stages benefit from high-expansion nozzles).',
    },
    related: ['delta-v', 'payload-mass'],
  },
  {
    id: 'payload-mass',
    term: 'Payload mass',
    category: 'rocketry',
    unlock: 'build',
    short: 'Every extra kilogram of satellite costs many kilograms of rocket.',
    unit: 'kg',
    levels: {
      kid: 'A rocket is like a delivery truck where the package is tiny and the fuel is HUGE. Adding one more toy to the package means adding a whole backpack of fuel to carry it. Heavy satellites need monster rockets!',
      student:
        'Payload sits at the very top of the rocket equation: every kilogram must be accelerated by every stage, so it reduces the Δv of all of them at once. That is why a 550-tonne rocket may deliver only a few tonnes to orbit — a payload fraction of well under 5%.',
      engineer:
        'Payload mass enters mf and m0 of every stage, so ∂Δv/∂m_payload compounds across the stack. Overloading shows up as a Δv shortfall or trajectory sag: the upper stage cannot sustain vertical speed, the vehicle falls back and breaks up in the lower atmosphere.',
    },
    related: ['delta-v', 'staging'],
  },
];
