import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { InfoChip } from '@/components/InfoChip';
import { RocketSilhouette } from '@/components/RocketSilhouette';
import { STAGE_PRESETS } from '@/sim/model/catalog';
import {
  grossMass,
  liftoffTWR,
  requiredDeltaV,
  stageDeltaV,
  totalDeltaV,
} from '@/sim/model/rocket';
import { SITES, siteRotationBonus } from '@/sim/env/sites';
import { kgToT, msToKms } from '@/sim/units';
import { useMissionStore } from '@/state/useMissionStore';

export default function Assembly() {
  const design = useMissionStore((s) => s.design);
  const siteId = useMissionStore((s) => s.siteId);
  const setStage = useMissionStore((s) => s.setStage);
  const unlockPedia = useMissionStore((s) => s.unlockPedia);

  // Entering the VAB unlocks the rocketry section of the Spacepedia.
  useEffect(() => unlockPedia(['build']), [unlockPedia]);

  const site = SITES[siteId];
  const dv = totalDeltaV(design);
  const need = requiredDeltaV(design.payload.target.altitude, siteRotationBonus(site));
  const margin = dv - need;
  const twr = liftoffTWR(design);
  const mass = grossMass(design);
  const twrOk = twr > 1.0;

  return (
    <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,340px)_minmax(260px,1fr)]">
      {/* ── Parts catalog ── */}
      <div className="space-y-4">
        <h1 className="font-display text-lg font-bold">Vehicle Assembly Building</h1>
        <p className="text-sm text-muted-star">
          Pick a booster and an upper stage. Watch the{' '}
          <InfoChip conceptId="delta-v">Δv budget</InfoChip> respond — that budget decides
          whether your <InfoChip conceptId="payload-mass">payload</InfoChip> makes it to orbit.
        </p>

        {design.stages.map((stage, slot) => (
          <Card key={slot}>
            <CardHeader>
              <CardTitle>Stage {slot + 1} — {slot === 0 ? 'Booster' : 'Upper stage'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.values(STAGE_PRESETS)
                .filter((p) =>
                  slot === 0 ? p.engine.thrustSL > 0 : p.engine.thrustVac > 0,
                )
                .map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setStage(slot, p.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') setStage(slot, p.id);
                    }}
                    className={`w-full rounded-panel border p-2 text-left text-sm transition-colors cursor-pointer ${
                      stage.id === p.id
                        ? 'border-phosphor/60 bg-console-2'
                        : 'border-line hover:border-muted-star/50'
                    }`}
                  >
                    <div className="flex items-center justify-between font-display">
                      {p.name}
                      {stage.id === p.id && <Badge variant="data">fitted</Badge>}
                    </div>
                    <div className="telemetry mt-1 grid grid-cols-3 gap-1 text-[11px] text-muted-star">
                      <span>{kgToT(p.propMass).toFixed(0)} t fuel</span>
                      <span>
                        <InfoChip conceptId="isp">Isp</InfoChip> {p.engine.ispVac} s
                      </span>
                      <span>{p.engineCount}× engine</span>
                    </div>
                    <p className="mt-1 text-[11px] text-muted-star/80">{p.engine.blurb}</p>
                    {p.heritage && (
                      <p className="mt-0.5 font-display text-[10px] uppercase tracking-wider text-ion/80">
                        {p.heritage}
                      </p>
                    )}
                  </div>
                ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── The rocket ── */}
      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>Your vehicle</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col items-center justify-center">
          <RocketSilhouette design={design} />
          <p className="telemetry mt-2 text-xs text-muted-star">
            {kgToT(mass).toFixed(1)} t on the pad · payload {design.payload.mass} kg
          </p>
        </CardContent>
      </Card>

      {/* ── Budget ── */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Flight budget</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {design.stages.map((_s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-muted-star">Stage {i + 1} Δv</span>
                <span className="telemetry">{msToKms(stageDeltaV(design, i)).toFixed(2)} km/s</span>
              </div>
            ))}
            <Separator />
            <div className="flex items-center justify-between text-sm font-semibold">
              <InfoChip conceptId="delta-v">Total Δv</InfoChip>
              <span className="telemetry text-phosphor">{msToKms(dv).toFixed(2)} km/s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-star">
                Needed for {design.payload.target.label}
                <span className="ml-1 text-[10px]">
                  (incl. <InfoChip conceptId="rotation-bonus">{site.name.split(' ')[0]} boost</InfoChip>)
                </span>
              </span>
              <span className="telemetry">{msToKms(need).toFixed(2)} km/s</span>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-star">Δv margin</span>
                <span className={`telemetry ${margin >= 0 ? 'text-go' : 'text-crimson'}`}>
                  {margin >= 0 ? '+' : ''}
                  {msToKms(margin).toFixed(2)} km/s
                </span>
              </div>
              <Progress
                value={Math.max(0, Math.min(100, (dv / need) * 100 - 0))}
                barClassName={margin >= 0 ? 'bg-go' : 'bg-crimson'}
              />
            </div>

            <Separator />
            <div className="flex items-center justify-between text-sm">
              <InfoChip conceptId="twr">Liftoff TWR</InfoChip>
              <span
                className={`telemetry ${twr >= 1.2 ? 'text-go' : twrOk ? 'text-flame' : 'text-crimson'}`}
              >
                {twr.toFixed(2)}
              </span>
            </div>
            {!twrOk && (
              <p className="flex items-start gap-1 text-xs text-crimson">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                Thrust is less than weight — this rocket cannot leave the pad. Fit a stronger
                booster.
              </p>
            )}
            {twrOk && twr < 1.2 && (
              <p className="flex items-start gap-1 text-xs text-flame">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                TWR under 1.2 — it will lift off, but slowly, wasting fuel fighting gravity.
              </p>
            )}
          </CardContent>
        </Card>

        {margin < 0 && (
          <Card className="border-crimson/40">
            <CardContent className="p-3 text-xs text-muted-star">
              <span className="font-semibold text-crimson">Short on Δv.</span> You can still fly it
              to see what happens — real programs learn from failed flights too — but orbit is out
              of reach with this design.
            </CardContent>
          </Card>
        )}

        <Button asChild className="w-full" disabled={!twrOk} variant={margin >= 0 ? 'go' : 'secondary'}>
          <Link to="/payload">
            Continue to Payload Bay <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
