// Vehicle Assembly Building. Full-viewport, three fixed columns: a parts
// browser (stage tabs → family accordions → one-line rows), the vehicle,
// and the live flight budget. Only the parts column scrolls.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { InfoChip } from '@/components/InfoChip';
import { VehicleViewer } from '@/scene/VehicleViewer';
import { STAGE_PRESETS } from '@/sim/model/catalog';
import type { StageSpec } from '@/sim/model/rocket';
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
import { cn } from '@/lib/utils';

/** Group parts by program family for the accordion. */
function familyOf(s: StageSpec): string {
  const h = s.heritage ?? '';
  if (h.includes('SpaceX')) return 'SpaceX';
  if (h.includes('Apollo') || h.includes('NASA') || h.includes('Shuttle')) return 'NASA';
  if (h.includes('ULA') || h.includes('Atlas') || h.includes('Delta')) return 'ULA';
  if (h.includes('ISRO') || h.includes('LVM3')) return 'ISRO';
  if (h.includes('Ariane')) return 'Europe';
  if (h.includes('Electron')) return 'Rocket Lab';
  return 'International';
}

const FAMILY_ORDER = ['SpaceX', 'NASA', 'ULA', 'ISRO', 'Europe', 'Rocket Lab', 'International'];

function PartRow({
  part,
  fitted,
  onFit,
}: {
  part: StageSpec;
  fitted: boolean;
  onFit: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onFit();
      }}
      className={cn(
        'flex w-full cursor-pointer items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition-colors',
        fitted
          ? 'border-phosphor/60 bg-console-2'
          : 'border-transparent hover:border-line hover:bg-console-2/50',
      )}
      title={`${part.engine.name} ×${part.engineCount} · ${part.heritage ?? ''}`}
    >
      <span className={cn('size-3.5 shrink-0', fitted ? 'text-phosphor' : 'text-transparent')}>
        <Check className="size-3.5" />
      </span>
      <span className="min-w-0 flex-1 truncate text-xs text-starlight">{part.name}</span>
      <span className="telemetry shrink-0 text-[10px] text-muted-star">
        {kgToT(part.propMass).toFixed(0)}t · {part.engine.ispVac}s · {part.engineCount}×
      </span>
    </div>
  );
}

export default function Assembly() {
  const design = useMissionStore((s) => s.design);
  const siteId = useMissionStore((s) => s.siteId);
  const setStage = useMissionStore((s) => s.setStage);
  const unlockPedia = useMissionStore((s) => s.unlockPedia);
  const [slot, setSlot] = useState(0);

  // Entering the VAB unlocks the rocketry section of the Spacepedia.
  useEffect(() => unlockPedia(['build']), [unlockPedia]);

  const site = SITES[siteId];
  const dv = totalDeltaV(design);
  const need = requiredDeltaV(design.payload.target.altitude, siteRotationBonus(site));
  const margin = dv - need;
  const twr = liftoffTWR(design);
  const mass = grossMass(design);
  const twrOk = twr > 1.0;

  const partsForSlot = useMemo(() => {
    const all = Object.values(STAGE_PRESETS).filter((p) =>
      slot === 0 ? p.engine.thrustSL > 0 : p.engine.thrustVac > 0,
    );
    const groups = new Map<string, StageSpec[]>();
    for (const p of all) {
      const f = familyOf(p);
      groups.set(f, [...(groups.get(f) ?? []), p]);
    }
    return FAMILY_ORDER.filter((f) => groups.has(f)).map((f) => [f, groups.get(f)!] as const);
  }, [slot]);

  const fitted = design.stages[slot];

  return (
    <div className="grid h-[calc(100vh-3rem)] gap-2 overflow-hidden p-2 lg:grid-cols-[minmax(300px,360px)_1fr_minmax(280px,330px)]">
      {/* ── Parts browser ── */}
      <Card className="flex min-h-0 flex-col">
        <CardHeader className="pb-1">
          <CardTitle>Parts catalog</CardTitle>
          <Tabs value={String(slot)} onValueChange={(v) => setSlot(Number(v))}>
            <TabsList className="w-full">
              <TabsTrigger className="flex-1" value="0">
                Stage 1 · Booster
              </TabsTrigger>
              <TabsTrigger className="flex-1" value="1">
                Stage 2 · Upper
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto pt-0">
          <Accordion type="multiple" defaultValue={[familyOf(fitted)]}>
            {partsForSlot.map(([family, parts]) => (
              <AccordionItem key={family} value={family}>
                <AccordionTrigger>
                  {family}
                  <span className="telemetry mr-2 ml-auto pl-2 text-[10px] opacity-60">
                    {parts.length}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-0.5">
                  {parts.map((p) => (
                    <PartRow
                      key={p.id}
                      part={p}
                      fitted={fitted.id === p.id}
                      onFit={() => setStage(slot, p.id)}
                    />
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* ── The vehicle ── */}
      <Card className="flex min-h-0 flex-col">
        <CardHeader className="flex-row items-baseline justify-between pb-0">
          <CardTitle>Your vehicle</CardTitle>
          <span className="telemetry text-xs text-muted-star">
            {kgToT(mass).toFixed(1)} t on the pad · payload {design.payload.mass} kg
          </span>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-0">
          <VehicleViewer design={design} />
        </CardContent>
        {/* Fitted-part detail strip */}
        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-line p-2">
          {design.stages.map((s, i) => (
            <div key={i} className="rounded-panel bg-console-2/50 p-2">
              <div className="font-display text-[9px] uppercase tracking-wider text-muted-star">
                Stage {i + 1} — {s.heritage}
              </div>
              <div className="truncate text-xs font-semibold text-starlight">{s.name}</div>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-star">
                {s.engine.blurb}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* ── Budget ── */}
      <div className="flex min-h-0 flex-col gap-2">
        <Card className="flex-1">
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
                  (<InfoChip conceptId="rotation-bonus">{site.name.split(' ')[0]} boost</InfoChip>)
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
                value={Math.max(0, Math.min(100, (dv / need) * 100))}
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
            {margin < 0 && (
              <p className="text-xs text-muted-star">
                <span className="font-semibold text-crimson">Short on Δv.</span> You can still fly
                it — real programs learn from failed flights too — but orbit is out of reach with
                this design.
              </p>
            )}
          </CardContent>
        </Card>

        <Button asChild className="w-full" disabled={!twrOk} variant={margin >= 0 ? 'go' : 'secondary'}>
          <Link to="/payload">
            Continue to Payload Bay <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
