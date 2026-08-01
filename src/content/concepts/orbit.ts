import type { Concept } from '../types';

export const concepts: Concept[] = [
  {
    id: 'orbital-velocity',
    term: 'Orbital velocity',
    category: 'orbit',
    unlock: 'orbit',
    short: 'Fall toward Earth forever — but move sideways so fast you keep missing it.',
    unit: 'm/s',
    levels: {
      kid: 'An orbit is the best magic trick ever: the satellite is falling the whole time, but it zooms sideways so fast (about 7.7 km every second!) that the ground curves away underneath it. It keeps missing the Earth. Forever.',
      student:
        'In orbit, gravity is the only force — the satellite falls continuously, but its huge horizontal speed makes its curved fall match Earth’s curvature. At 400 km altitude that takes ~7.67 km/s. Lower orbits need more speed; higher orbits less.',
      engineer:
        'For a circular orbit, gravity supplies exactly the centripetal acceleration: v = √(μ/r), with μ = GM⊕ = 3.986×10¹⁴ m³/s². Note the counterintuitive scaling: raising the orbit means slowing down (but costs energy to get there).',
    },
    formula: {
      tex: 'v_{circ} = \\sqrt{\\frac{\\mu}{r}}',
      legend: [
        ['\\mu', 'Earth’s gravity constant GM'],
        ['r', 'distance from Earth’s center'],
      ],
    },
    related: ['orbital-period', 'apoapsis'],
  },
  {
    id: 'apoapsis',
    term: 'Apoapsis & periapsis',
    category: 'orbit',
    unlock: 'orbit',
    short: 'The highest and lowest points of an orbit — every orbit is an ellipse.',
    levels: {
      kid: 'Orbits aren’t perfect circles — they’re squished circles called ellipses. The highest point of the loop is the apoapsis and the lowest is the periapsis. If the lowest point dips into the air… the satellite comes home the hot way!',
      student:
        'Apoapsis is where the satellite is highest and slowest; periapsis lowest and fastest (Kepler’s 2nd law). If your periapsis is inside the atmosphere (<100 km), the orbit is suborbital — you will re-enter. Circularizing means burning at apoapsis to raise the periapsis.',
      engineer:
        'r_apo = a(1+e), r_peri = a(1−e). A burn changes the orbit everywhere except where you are: prograde at apoapsis raises the opposite side (periapsis) — the basis of the Hohmann transfer and the circularization burn in this sim.',
    },
    formula: {
      tex: 'r_{apo} = a(1+e), \\quad r_{peri} = a(1-e)',
      legend: [
        ['a', 'semi-major axis (orbit size)'],
        ['e', 'eccentricity (how squished)'],
      ],
    },
    related: ['eccentricity', 'circularization'],
  },
  {
    id: 'eccentricity',
    term: 'Eccentricity',
    category: 'orbit',
    unlock: 'orbit',
    short: 'How squished your orbit is: 0 = perfect circle, near 1 = long skinny ellipse.',
    levels: {
      kid: 'Eccentricity is the squish-o-meter! Zero means your orbit is a perfect circle, like a hula hoop. Bigger numbers mean it’s squished like a rubber band pulled at one end. At 1 or more, the band snaps — you fly away and never come back!',
      student:
        'Eccentricity e measures orbit shape: e=0 circular, 0<e<1 elliptical, e≥1 escape (parabolic/hyperbolic — you leave Earth forever). Most working satellites want near-zero e so their altitude stays constant.',
      engineer:
        'e = |e⃗|, from the eccentricity vector e⃗ = (v×h)/μ − r̂. Together with a it fixes the orbit’s geometry; the sim classifies orbits by e and periapsis altitude (suborbital if r_peri < R⊕ + 100 km).',
    },
    related: ['apoapsis', 'circularization'],
  },
  {
    id: 'orbital-period',
    term: 'Orbital period',
    category: 'orbit',
    unlock: 'orbit',
    short: 'One lap around Earth: ~92 minutes up close, 24 hours far away.',
    unit: 's',
    levels: {
      kid: 'Astronauts on the space station see 16 sunrises every day, because one lap around Earth takes only 92 minutes! Satellites that are much farther away take a whole day for one lap — they seem to hover over the same spot.',
      student:
        'Period depends only on the orbit’s size (semi-major axis), not its shape: T = 2π√(a³/μ). ISS altitude → ~92.6 min. At 35,786 km, T equals one day — geostationary satellites appear parked in the sky, perfect for TV dishes that never move.',
      engineer:
        'Kepler’s third law. Since T is set by a alone, any orbit with the same energy has the same period regardless of e — this is why phasing maneuvers change a slightly to catch up or fall behind a target.',
    },
    formula: {
      tex: 'T = 2\\pi\\sqrt{\\frac{a^3}{\\mu}}',
      legend: [
        ['a', 'semi-major axis'],
        ['\\mu', 'Earth’s gravity constant'],
      ],
    },
    related: ['orbital-velocity', 'ground-track'],
  },
  {
    id: 'circularization',
    term: 'Circularization burn',
    category: 'orbit',
    unlock: 'orbit',
    short: 'One well-timed push at the top of your arc turns "almost orbit" into orbit.',
    unit: 'm/s',
    levels: {
      kid: 'After the big climb, your rocket coasts up to the tip-top of its arc. Right there, you give one more push — like pumping your legs at the top of a swing — and the arc becomes a full circle around the Earth. You’re in orbit!',
      student:
        'Ascent leaves you on an ellipse whose apoapsis touches your target altitude but whose periapsis is deep in the atmosphere. Guidance arms a burn centered on apoapsis: the engine relights (SES-2), thrust raises the periapsis second by second, and cutoff (SECO-2) comes when the orbit is round. Watch the periapsis climb while it burns.',
      engineer:
        'Δv_circ = √(μ/r_a) − v_apo, with v_apo from vis-viva at r_a. The sim flies it as a finite burn like a real upper stage: ignition at t_apo − t_burn/2 (burn centered on the node), thrust steered along the remaining-Δv vector (closed-loop guidance), mass drawn at the engine’s true ṁ = F/(Isp·g0), cutoff at residual < 2 m/s. It is the second burn of a Hohmann transfer with the ascent as the first.',
    },
    formula: {
      tex: '\\Delta v = \\sqrt{\\frac{\\mu}{r_a}} - v_{apo}',
      legend: [
        ['r_a', 'apoapsis radius'],
        ['v_{apo}', 'speed at apoapsis (vis-viva)'],
      ],
    },
    related: ['apoapsis', 'delta-v'],
  },
  {
    id: 'inclination',
    term: 'Inclination',
    category: 'orbit',
    unlock: 'orbit',
    short: 'The tilt of your orbit. Your launch site’s latitude sets the minimum.',
    unit: '°',
    levels: {
      kid: 'Some satellites circle Earth around the middle like a belt; others loop over the North and South Poles like a ring toss gone sideways. That tilt is called inclination. Fun rule: you can’t tilt LESS than the place you launched from!',
      student:
        'Inclination is the angle between the orbit plane and the equator. Launching due east gives inclination = your latitude (Cape Canaveral → 28.5°). Polar/sun-synchronous orbits (~98°) see the whole planet — ideal for weather and imaging satellites.',
      engineer:
        'i = acos(h_z/|h|). Direct-injection inclination ≥ launch latitude; plane changes cost Δv = 2v·sin(Δi/2) — brutally expensive at LEO speeds (~2.7 km/s for 20°), which is why site selection matters and doglegs are rare.',
    },
    related: ['rotation-bonus', 'ground-track'],
  },
  {
    id: 'rotation-bonus',
    term: 'Earth-rotation boost',
    category: 'orbit',
    unlock: 'launch',
    short: 'Earth spins at 465 m/s. Launch east and the planet gives you a free running start.',
    unit: 'm/s',
    levels: {
      kid: 'Surprise: you’re moving right now! The Earth spins, carrying you sideways at hundreds of metres per second. Rockets launch toward the east to use that free ride — like throwing a ball forward from a moving merry-go-round.',
      student:
        'At the equator the ground moves east at ~465 m/s; at Cape Canaveral ~409 m/s. Launching eastward, that speed counts toward your orbital velocity for free. It is why launch sites hug the equator and point their rockets over the ocean to the east.',
      engineer:
        'v_site = Ω⊕·R⊕·cos(latitude), with Ω⊕ = 7.292×10⁻⁵ rad/s. The credit applies fully only to due-east azimuths (prograde equatorial component); polar launches get none — one reason SSO missions cost more Δv.',
    },
    formula: {
      tex: 'v = \\Omega_\\oplus R_\\oplus \\cos(\\phi)',
      legend: [
        ['\\Omega_\\oplus', 'Earth’s spin rate'],
        ['\\phi', 'launch site latitude'],
      ],
    },
    related: ['inclination', 'delta-v'],
  },
  {
    id: 'ground-track',
    term: 'Ground track',
    category: 'orbit',
    unlock: 'orbit',
    short: 'The wiggly line a satellite draws over the map as Earth spins underneath it.',
    levels: {
      kid: 'Imagine your satellite holding a marker pointed at the ground while it circles. Because the Earth keeps turning underneath, the line it draws isn’t a circle — it’s a beautiful wavy pattern that slides west a little every lap!',
      student:
        'The orbit plane stays (nearly) fixed while Earth rotates inside it, so each successive pass crosses the equator further west (~22.5° per 90-minute orbit). The result is the classic sine-like ground track on world maps in every mission control room.',
      engineer:
        'Sub-satellite point = ECI position rotated into ECEF by −Ω⊕t and converted to lat/lon. Westward regression per orbit = Ω⊕·T. A geostationary orbit (T = sidereal day, i=0) collapses the track to a single point.',
    },
    related: ['orbital-period', 'inclination'],
  },
];
