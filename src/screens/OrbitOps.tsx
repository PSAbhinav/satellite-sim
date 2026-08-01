import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Flame, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoChip } from '@/components/InfoChip';
import { OrbitScene } from '@/scene/OrbitScene';
import { EventFeed } from '@/dashboard/EventFeed';
import { MissionClock } from '@/dashboard/Readouts';
import { useSimLoop } from '@/state/useSimLoop';
import { useTelemetry } from '@/state/useTelemetry';
import { useMissionStore } from '@/state/useMissionStore';
import { simController } from '@/state/simController';
import { sToMinSec } from '@/sim/units';

const WARPS = [1, 10, 100, 1000];

export default function OrbitOps() {
  const navigate = useNavigate();
  const flightPhase = useMissionStore((s) => s.flightPhase);
  const unlockPedia = useMissionStore((s) => s.unlockPedia);
  const completeMission = useMissionStore((s) => s.completeMission);
  const design = useMissionStore((s) => s.design);

  useSimLoop(true);

  const orbit = useTelemetry((s) => s.orbit, 6);
  const phase = useTelemetry((s) => s.phase, 4);

  // Reaching a stable orbit unlocks the orbit Spacepedia section + solar system.
  useEffect(() => {
    if (flightPhase === 'orbit') {
      unlockPedia(['orbit']);
      completeMission('first-orbit');
    }
  }, [flightPhase, unlockPedia, completeMission]);

  useEffect(() => {
    if (flightPhase === 'failed') navigate('/debrief');
  }, [flightPhase, navigate]);

  const nearApoapsis = (orbit?.timeToApoapsisS ?? Infinity) < 30;
  const canBurn = phase === 'coast' && !!orbit;
  const enough = (orbit?.availDv ?? 0) >= (orbit?.circDv ?? Infinity);

  return (
    <div className="flex h-[calc(100vh-3rem)] flex-col gap-2 p-2">
      <div className="flex items-center justify-between rounded-panel border border-line bg-console px-3 py-1.5">
        <span className="font-display text-xs uppercase tracking-[0.25em] text-muted-star">
          Mission Control · {phase === 'orbit' ? 'On orbit' : 'Orbit insertion'}
        </span>
        <MissionClock />
        <div className="flex items-center gap-1">
          <Gauge className="size-3.5 text-muted-star" />
          {WARPS.map((w) => (
            <button
              key={w}
              onClick={() => (simController.warp = w)}
              className="telemetry rounded-sm border border-line px-1.5 py-0.5 text-[10px] text-muted-star hover:text-phosphor cursor-pointer"
            >
              {w}×
            </button>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[1fr_280px]">
        <div className="min-h-[300px] overflow-hidden rounded-panel border border-line">
          <OrbitScene />
        </div>

        <div className="flex min-h-0 flex-col gap-2">
          <Card>
            <CardHeader>
              <CardTitle>Orbital elements</CardTitle>
            </CardHeader>
            <CardContent className="telemetry space-y-1.5 text-sm">
              {orbit ? (
                <>
                  <Row label={<InfoChip conceptId="apoapsis">Apoapsis</InfoChip>} value={`${(orbit.apoapsisAlt / 1000).toFixed(0)} km`} />
                  <Row
                    label="Periapsis"
                    value={`${(orbit.periapsisAlt / 1000).toFixed(0)} km`}
                    warn={orbit.periapsisAlt < 100e3}
                  />
                  <Row label={<InfoChip conceptId="eccentricity">Eccentricity</InfoChip>} value={orbit.eccentricity.toFixed(4)} />
                  <Row label={<InfoChip conceptId="inclination">Inclination</InfoChip>} value={`${orbit.inclinationDeg.toFixed(1)}°`} />
                  <Row label={<InfoChip conceptId="orbital-period">Period</InfoChip>} value={`${(orbit.periodS / 60).toFixed(1)} min`} />
                  <Row label="Orbit class" value={orbit.class} />
                  {phase === 'coast' && (
                    <Row label="Time to apoapsis" value={sToMinSec(orbit.timeToApoapsisS)} />
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-star">Acquiring orbit solution…</p>
              )}
            </CardContent>
          </Card>

          {canBurn && (
            <Card className={nearApoapsis ? 'border-phosphor/60' : ''}>
              <CardHeader>
                <CardTitle>
                  <InfoChip conceptId="circularization">Circularization burn</InfoChip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="telemetry flex justify-between text-sm">
                  <span className="text-muted-star">Δv needed</span>
                  <span>{orbit!.circDv.toFixed(0)} m/s</span>
                </div>
                <div className="telemetry flex justify-between text-sm">
                  <span className="text-muted-star">Δv available</span>
                  <span className={enough ? 'text-go' : 'text-crimson'}>
                    {orbit!.availDv.toFixed(0)} m/s
                  </span>
                </div>
                {!nearApoapsis && (
                  <p className="text-xs text-muted-star">
                    Wait for apoapsis — a burn there raises your periapsis most efficiently. Use
                    time-warp above.
                  </p>
                )}
                <Button
                  className="w-full"
                  variant={nearApoapsis ? 'go' : 'secondary'}
                  onClick={() => {
                    simController.warp = 1;
                    simController.circularize();
                  }}
                >
                  <Flame className="size-4" /> Execute burn
                </Button>
              </CardContent>
            </Card>
          )}

          {phase === 'orbit' && (
            <Card className="border-go/50">
              <CardContent className="p-4 text-center">
                <Badge variant="go">ORBIT ACHIEVED</Badge>
                <p className="mt-2 text-xs text-muted-star">
                  {design.payload.name} is on station. The Solar System explorer is now unlocked.
                </p>
                <div className="mt-3 flex justify-center gap-2">
                  <Button asChild size="sm" variant="secondary">
                    <Link to="/solar-system">Solar System</Link>
                  </Button>
                  <Button asChild size="sm">
                    <Link to="/debrief">Mission debrief</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="min-h-[120px] flex-1">
            <EventFeed />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  warn,
}: {
  label: React.ReactNode;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-star">{label}</span>
      <span className={warn ? 'text-crimson' : 'text-starlight'}>{value}</span>
    </div>
  );
}
