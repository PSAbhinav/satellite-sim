import { Link } from 'react-router-dom';
import { ArrowRight, Award, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoChip } from '@/components/InfoChip';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';

// "Why did this happen?" — matched on the mission result, with the numbers
// that caused it and the screen where the fix lives.
const EXPLAINERS: Record<
  string,
  {
    title: string;
    kid: string;
    student: string;
    engineer: string;
    fixes: { label: string; to: string }[];
    concept: string;
  }
> = {
  suborbital: {
    title: 'Why did my rocket fall back?',
    kid: 'Your rocket ran out of speed-money! Reaching orbit costs about 9,400 speed-points and your rocket’s piggy bank came up short. Try a bigger fuel tank, a lighter satellite — or both.',
    student:
      'The vehicle’s total Δv was less than the ~9.4 km/s that orbit demands, so it arced back into the atmosphere like a very ambitious cannonball. More propellant, a lighter payload, or a more efficient upper stage closes the gap.',
    engineer:
      'Δv budget < required. Check the per-stage Tsiolkovsky terms in Assembly: raising stage-2 propellant helps most (it benefits from vacuum Isp), and payload mass multiplies through every stage’s mass ratio. A sagging trajectory that re-enters under power also indicates upper-stage TWR too low for the lofted profile.',
    fixes: [
      { label: 'Rework the vehicle', to: '/build' },
      { label: 'Pick a lighter payload', to: '/payload' },
    ],
    concept: 'delta-v',
  },
  breakup: {
    title: 'Why did my rocket break apart?',
    kid: 'Your rocket went too fast while the air was still thick — like sticking your hand out of a speeding car, but a million times stronger. The wind squeezed it until it snapped. Heavier rockets push through the air more gently!',
    student:
      'Dynamic pressure (q = ½ρv²) exceeded the structural limit of 40 kPa. That happens when the vehicle is too fast too low — usually a very light stack with high TWR accelerating hard through the dense lower atmosphere.',
    engineer:
      'q > qMax during ascent. Reduce low-altitude acceleration: heavier propellant load, fewer engines, or (in real vehicles) a throttle bucket through Max-Q. Note the failure altitude — if it happened on descent, the real issue was a suborbital trajectory falling back into the atmosphere.',
    fixes: [{ label: 'Rework the vehicle', to: '/build' }],
    concept: 'max-q',
  },
  escape: {
    title: 'Where did my rocket go?!',
    kid: 'Your rocket was TOO powerful — it waved goodbye to Earth and is now heading for deep space! To stay in orbit you have to stop pushing at just the right speed.',
    student:
      'The vehicle exceeded escape velocity (~11.2 km/s at Earth’s surface): its trajectory became hyperbolic and it left Earth’s gravity well entirely. Orbits need enough speed to miss the Earth, but not so much that gravity can never bend you back.',
    engineer:
      'e ≥ 1 at cutoff — specific orbital energy went positive. Guidance cutoff (SECO at target apoapsis) should have prevented this; with a manual profile, cut thrust once apoapsis reaches target.',
    fixes: [{ label: 'Fly again', to: '/countdown' }],
    concept: 'eccentricity',
  },
  crash: {
    title: 'Why did it come straight back down?',
    kid: 'The rocket didn’t tip over enough to fly sideways, so up it went… and down it came. Space is sideways, remember!',
    student:
      'The trajectory never built horizontal speed — orbit requires ~7.7 km/s sideways, not just altitude. The gravity turn exists precisely to convert a vertical climb into horizontal velocity.',
    engineer:
      'Flight-path angle stayed too steep; check the pitch program and TWR. Insufficient horizontal velocity at burnout leaves a ballistic arc regardless of apogee.',
    fixes: [{ label: 'Rework the vehicle', to: '/build' }],
    concept: 'gravity-turn',
  },
  orbit: {
    title: 'Flawless flight!',
    kid: 'YOU DID IT! Your satellite is circling the Earth right now, falling forever and always missing. That is real rocket science — and you just did it.',
    student:
      'Ascent, staging, coast and circularization all nominal. Your satellite is in a stable orbit — compare your final elements against the target and see how tight you can make the next insertion.',
    engineer:
      'Insertion complete. Grade yourself on apoapsis/periapsis error vs target, residual Δv margin, and peak q/g. Next challenge: a heavier payload, a higher orbit, or a sun-synchronous inclination.',
    fixes: [
      { label: 'Explore the Solar System', to: '/solar-system' },
      { label: 'Fly a new mission', to: '/build' },
    ],
    concept: 'circularization',
  },
};

export default function Debrief() {
  const result = useMissionStore((s) => s.result);
  const design = useMissionStore((s) => s.design);
  const ageLevel = useUiStore((s) => s.ageLevel);

  if (!result) {
    return (
      <div className="mx-auto max-w-lg p-10 text-center">
        <p className="text-muted-star">No flight on record yet.</p>
        <Button asChild className="mt-4">
          <Link to="/build">Start a mission</Link>
        </Button>
      </div>
    );
  }

  const ex = EXPLAINERS[result.outcome];
  const success = result.outcome === 'orbit';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <Award className={`size-8 ${success ? 'text-go' : 'text-flame'}`} />
        <div>
          <h1 className="font-display text-xl font-bold">Mission debrief</h1>
          <Badge variant={success ? 'go' : 'nogo'}>
            {success ? 'MISSION SUCCESS' : `OUTCOME: ${result.outcome.toUpperCase()}`}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Flight record — {design.payload.name}</CardTitle>
        </CardHeader>
        <CardContent className="telemetry grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <Stat label="Peak dynamic pressure" value={`${(result.maxQ / 1000).toFixed(1)} kPa`} />
          <Stat label="Peak acceleration" value={`${result.maxG.toFixed(1)} g`} />
          <Stat
            label="Apoapsis"
            value={result.finalOrbit ? `${(result.finalOrbit.apoapsisAlt / 1000).toFixed(0)} km` : '—'}
          />
          <Stat
            label="Periapsis"
            value={
              result.finalOrbit ? `${(result.finalOrbit.periapsisAlt / 1000).toFixed(0)} km` : '—'
            }
          />
        </CardContent>
      </Card>

      <Card className={success ? 'border-go/40' : 'border-flame/40'}>
        <CardHeader>
          <CardTitle>{ex.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed">{ex[ageLevel]}</p>
          <p className="text-xs text-muted-star">
            Read more: <InfoChip conceptId={ex.concept} />
          </p>
          {result.dvShortfall && (
            <p className="telemetry text-xs text-crimson">
              Δv shortfall at the final burn: {result.dvShortfall.toFixed(0)} m/s
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {ex.fixes.map((f) => (
              <Button key={f.to} asChild variant={success ? 'go' : 'default'} size="sm">
                <Link to={f.to}>
                  {f.label} <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            ))}
            <Button asChild variant="secondary" size="sm">
              <Link to="/countdown">
                <RotateCcw className="size-3.5" /> Fly the same rocket again
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-display text-[10px] uppercase tracking-wider text-muted-star">
        {label}
      </div>
      <div className="text-lg text-starlight">{value}</div>
    </div>
  );
}
