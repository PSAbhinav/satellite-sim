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
import { cn } from '@/lib/utils';

const WARPS = [1, 10, 100, 1000];
const GLASS = 'rounded-panel border border-line/60 bg-void/75 backdrop-blur-md';

export default function OrbitOps() {
  const navigate = useNavigate();
  const flightPhase = useMissionStore((s) => s.flightPhase);
  const unlockPedia = useMissionStore((s) => s.unlockPedia);
  const completeMission = useMissionStore((s) => s.completeMission);
  const design = useMissionStore((s) => s.design);

  useSimLoop(true);

  const orbit = useTelemetry((s) => s.orbit, 6);
  const phase = useTelemetry((s) => s.phase, 4);
  const burn = useTelemetry((s) => s.burn, 8);

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
    <div className="relative h-[calc(100vh-3rem)] overflow-hidden">
      {/* The orbit IS the screen */}
      <div className="absolute inset-0">
        <OrbitScene />
      </div>

      {/* Top strip: room name, MET, warp */}
      <div className={cn('absolute inset-x-3 top-3 flex items-center justify-between px-4 py-2', GLASS)}>
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

      {/* Right rail: elements + maneuver, floating over the scene */}
      <div className="absolute bottom-3 right-3 top-16 flex w-80 flex-col gap-2 overflow-y-auto">
          <Card className={cn('shrink-0', GLASS)}>
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
            <Card
              className={cn(
                'shrink-0',
                GLASS,
                burn?.burning
                  ? 'border-flame/70'
                  : burn
                    ? 'border-flame/40'
                    : nearApoapsis
                      ? 'border-phosphor/60'
                      : '',
              )}
            >
              <CardHeader>
                <CardTitle>
                  <InfoChip conceptId="circularization">Insertion burn</InfoChip>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!burn && (
                  <>
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
                    <p className="text-xs text-muted-star">
                      Guidance plans this like a real mission: burn time from the engine&apos;s
                      mass flow, ignition centered on apoapsis. Arm it and the stage relights
                      itself at T−0.
                    </p>
                    <Button className="w-full" variant="go" onClick={() => simController.armBurn()}>
                      <Flame className="size-4" /> Arm insertion burn
                    </Button>
                  </>
                )}
                {burn && !burn.burning && (
                  <>
                    <div className="py-1 text-center">
                      <div className="telemetry text-2xl font-bold text-flame">
                        {sToMinSec(-Math.max(0, burn.tToIgnitionS))}
                      </div>
                      <div className="mt-0.5 font-display text-[9px] uppercase tracking-[0.25em] text-muted-star">
                        to second engine start
                      </div>
                    </div>
                    <Row label="Planned Δv" value={`${burn.dvPlanned.toFixed(0)} m/s`} />
                    <Row label="Burn duration" value={`${burn.durationS.toFixed(0)} s`} />
                    <p className="text-xs text-muted-star">
                      Armed. Warp ahead if you like — the clock brakes on its own before ignition.
                    </p>
                  </>
                )}
                {burn?.burning && (
                  <>
                    <div className="flex items-center gap-2 text-flame">
                      <Flame className="size-4 animate-pulse" />
                      <span className="font-display text-xs uppercase tracking-wider">
                        SES-2 — burn in progress
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-console-2">
                      <div
                        className="h-full rounded-full bg-flame"
                        style={{ width: `${burn.frac * 100}%` }}
                      />
                    </div>
                    <Row
                      label="Δv delivered"
                      value={`${(burn.frac * burn.dvPlanned).toFixed(0)} / ${burn.dvPlanned.toFixed(0)} m/s`}
                    />
                    <Row
                      label="Periapsis"
                      value={`${((orbit?.periapsisAlt ?? 0) / 1000).toFixed(0)} km`}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {phase === 'orbit' && (
            <Card className={cn('shrink-0', GLASS, 'border-go/50')}>
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

      </div>

      {/* Bottom-left: the flight log, always on screen — no scrolling to find it */}
      <div className="absolute bottom-3 left-3 h-44 w-96">
        <EventFeed />
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
