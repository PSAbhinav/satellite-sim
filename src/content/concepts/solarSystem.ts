import type { Concept } from '../types';

// Planet entries unlock with the Solar System explorer. Facts kept to ones a
// mission designer actually cares about (gravity, day, atmosphere) plus one
// hook per age level.

export const concepts: Concept[] = [
  {
    id: 'planet-mercury',
    term: 'Mercury',
    category: 'solar-system',
    unlock: 'solar',
    short: 'Smallest planet, closest to the Sun. A year here lasts just 88 days.',
    levels: {
      kid: 'Mercury is the Sun’s closest neighbour, and it’s in a hurry — its whole year lasts only 88 days! Daytime is oven-hot and nighttime freezing, because it has almost no air blanket to hold the warmth.',
      student:
        'Mercury orbits at 0.39 AU, racing around the Sun every 88 days (Kepler’s 3rd law: closer = faster). With no real atmosphere, surface temperature swings from 430 °C in daylight to −180 °C at night. Gravity is 0.38 g.',
      engineer:
        'Getting to Mercury is oddly expensive: you must shed most of Earth’s orbital velocity to fall inward, so missions like BepiColombo use years of gravity assists. Its 3:2 spin–orbit resonance means one solar day lasts two Mercury years.',
    },
    related: ['orbital-period'],
  },
  {
    id: 'planet-venus',
    term: 'Venus',
    category: 'solar-system',
    unlock: 'solar',
    short: 'Earth’s evil twin: same size, but 460 °C under crushing acid clouds.',
    levels: {
      kid: 'Venus looks like a lovely bright star, but don’t be fooled — it’s hotter than a pizza oven, its clouds are made of acid, and the air presses down like being 900 metres underwater. Even robots only survive minutes there!',
      student:
        'Venus is nearly Earth-sized (0.9 g) but a runaway greenhouse effect turned its CO₂ atmosphere into a 92-bar furnace at ~460 °C — hotter than Mercury despite being farther out. It also spins backwards, and slower than it orbits: a day outlasts a year.',
      engineer:
        'Venus is a cautionary climate dataset: albedo 0.75 yet surface radiative equilibrium destroyed by CO₂ opacity. Aerobraking-friendly upper atmosphere (~50 km alt is 1 bar, 60 °C) makes cloud-level probes far more tractable than landers.',
    },
    related: ['planet-earth'],
  },
  {
    id: 'planet-earth',
    term: 'Earth',
    category: 'solar-system',
    unlock: 'solar',
    short: 'Home. The only place we know with liquid-water oceans and a breathable sky.',
    levels: {
      kid: 'You are standing on a giant spaceship right now! Earth carries all of us around the Sun at 30 km every second — a hundred times faster than a jet plane — and its magnetic shield and cozy air keep everyone aboard safe.',
      student:
        'Earth orbits at 1 AU (150 million km) with a 23.4° axial tilt that gives us seasons. Its magnetic field deflects the solar wind, its ozone filters UV, and its atmosphere burns up ~100 tonnes of meteors daily. All your rockets so far have launched from here.',
      engineer:
        'Reference values used throughout this sim: μ = 3.986×10¹⁴ m³/s², R = 6,371 km, surface rotation 465 m/s at the equator, sidereal day 86,164 s. LEO decay from residual atmosphere below ~500 km sets satellite lifetimes without reboost.',
    },
    related: ['rotation-bonus', 'ground-track'],
  },
  {
    id: 'planet-mars',
    term: 'Mars',
    category: 'solar-system',
    unlock: 'solar',
    short: 'The rusty planet — thin air, huge volcanoes, and humanity’s next big destination.',
    levels: {
      kid: 'Mars is red because it’s literally rusty! It has the tallest volcano in the whole solar system (three times Everest!) and dust storms that can cover the entire planet. One day robots there might get human neighbours.',
      student:
        'Mars has 0.38 g, a thin CO₂ atmosphere (~0.6% of Earth’s), and a 24.6-hour day. Its atmosphere is thick enough to burn you up on entry but too thin for parachutes alone — landing is famously hard ("seven minutes of terror").',
      engineer:
        'Hohmann windows to Mars open every ~26 months (synodic period); transfer Δv from LEO ≈ 3.6 km/s + capture. Entry-descent-landing combines aeroshell, supersonic parachute and propulsive terminal descent (or skycranes) due to the thin-but-present atmosphere.',
    },
    related: ['circularization'],
  },
  {
    id: 'planet-jupiter',
    term: 'Jupiter',
    category: 'solar-system',
    unlock: 'solar',
    short: 'King of planets: all the others would fit inside it, twice over.',
    levels: {
      kid: 'Jupiter is so gigantic that 1,300 Earths could squeeze inside! Its famous Great Red Spot is a storm bigger than our whole planet that has raged for centuries. It also guards Earth by vacuuming up comets with its huge gravity.',
      student:
        'A gas giant of hydrogen and helium with 2.5× the mass of all other planets combined. No solid surface to land on. Its four big Galilean moons — volcanic Io, icy-ocean Europa, giant Ganymede, cratered Callisto — are worlds in their own right.',
      engineer:
        'Jupiter is the solar system’s gravity-assist engine: Voyager, Cassini, and New Horizons all borrowed its orbital momentum. Its radiation belts (trapped by a magnetosphere 20,000× Earth’s) drive spacecraft shielding mass budgets; Europa Clipper flies elliptical orbits to dodge them.',
    },
    related: ['planet-saturn'],
  },
  {
    id: 'planet-saturn',
    term: 'Saturn',
    category: 'solar-system',
    unlock: 'solar',
    short: 'The ringed jewel — its rings are billions of ice chunks, each on its own orbit.',
    levels: {
      kid: 'Saturn’s rings look solid, but they’re actually billions of ice cubes and snowballs, from tiny pebbles to school buses, all circling in a line so thin that from the side the rings almost disappear! Saturn is also so light it could float in a giant bathtub.',
      student:
        'The rings span 280,000 km but are mostly under 100 m thick — proportionally thinner than paper. Each particle obeys Kepler’s laws: inner ring ice orbits faster than outer. Saturn’s moon Titan has lakes of liquid methane and a thicker atmosphere than Earth’s.',
      engineer:
        'Ring dynamics are an orbital-mechanics textbook: shepherd moons confine edges via resonances; the Cassini Division is a 2:1 resonance with Mimas. Cassini ended in 2017 with a deliberate atmospheric entry to protect Titan and Enceladus from contamination.',
    },
    related: ['planet-jupiter', 'orbital-period'],
  },
  {
    id: 'planet-uranus',
    term: 'Uranus',
    category: 'solar-system',
    unlock: 'solar',
    short: 'The sideways planet — it rolls around the Sun on its side like a barrel.',
    levels: {
      kid: 'Every planet spins like a top — except Uranus, which got knocked over long ago and now rolls on its side like a barrel! That means its poles get 42 years of daylight followed by 42 years of night. Imagine THAT bedtime schedule.',
      student:
        'Uranus’s axis is tilted 98°, probably from a giant ancient impact. It is an "ice giant" — water, ammonia and methane around a rocky core — and the methane makes it teal. It has faint rings and 27 known moons, all visited only once (Voyager 2, 1986).',
      engineer:
        'The extreme obliquity makes seasonal atmospheric forcing unlike any other planet. A Uranus orbiter is a top decadal-survey priority; trajectory studies lean on Jupiter assists with ~13-year cruises — payload mass budgets dominated by RTG power at 19 AU.',
    },
    related: ['planet-neptune'],
  },
  {
    id: 'planet-neptune',
    term: 'Neptune',
    category: 'solar-system',
    unlock: 'solar',
    short: 'The farthest planet, found with math before telescopes — home to 2,000 km/h winds.',
    levels: {
      kid: 'Neptune was discovered by MATH! Astronomers noticed Uranus wobbling and calculated that a hidden planet must be tugging it — and there Neptune was, right where the numbers said. It’s deep blue with the fastest winds anywhere: 2,000 km/h!',
      student:
        'Neptune sits at 30 AU; sunlight there is 900× dimmer than on Earth, yet it radiates more heat than it receives and drives supersonic winds. Its moon Triton orbits backwards — almost certainly a captured Kuiper Belt object, slowly spiraling inward.',
      engineer:
        'Its 1846 discovery from Uranus’s residuals (Le Verrier/Adams) is the classic triumph of perturbation theory — the same math behind modern precision orbit determination. Voyager 2 remains the only visitor (1989); Triton’s retrograde orbit dooms it to tidal breakup in ~3.6 Gyr.',
    },
    related: ['planet-uranus'],
  },
];
