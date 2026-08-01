// Left-rail big readouts + right-rail gauges. Warm path: sampled ~8-12 Hz via
// useTelemetry — never subscribed to the 50 Hz stream.

import { InfoChip } from '@/components/InfoChip';
import { Progress } from '@/components/ui/progress';
import { useTelemetry } from '@/state/useTelemetry';
import { sToMinSec } from '@/sim/units';

export function BigStat({
  label,
  value,
  unit,
  conceptId,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  conceptId?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-panel border border-line bg-console-2/50 px-2 py-1.5">
      <div className="font-display text-[9px] uppercase tracking-wider text-muted-star">
        {conceptId ? <InfoChip conceptId={conceptId}>{label}</InfoChip> : label}
      </div>
      <div className={`telemetry text-lg leading-tight ${accent ? 'text-phosphor' : 'text-starlight'}`}>
        {value}
        <span className="ml-1 text-[10px] text-muted-star">{unit}</span>
      </div>
    </div>
  );
}

export function LeftRail() {
  const t = useTelemetry(
    (s) => ({
      alt: s.altitude,
      speed: s.speed,
      vs: s.verticalSpeed,
      downrange: s.downrange,
      mach: s.mach,
      g: s.accelG,
    }),
    12,
  );
  if (!t) return null;
  // Altitude & speed live on the strip charts — FIDO shows only what
  // isn't displayed anywhere else on the console.
  return (
    <div className="grid grid-cols-1 gap-1.5">
      <BigStat label="Vert. speed" value={t.vs.toFixed(0)} unit="m/s" accent />
      <BigStat label="Downrange" value={(t.downrange / 1000).toFixed(0)} unit="km" />
      <BigStat label="Mach" value={t.mach.toFixed(1)} unit="" conceptId="mach" />
      <BigStat label="G-force" value={t.g.toFixed(1)} unit="g" conceptId="g-force" />
    </div>
  );
}

export function FuelGauges() {
  const t = useTelemetry(
    (s) => ({ stages: s.stages, active: s.activeStage, q: s.q, maxQ: s.maxQSoFar, twr: s.twr }),
    8,
  );
  if (!t) return null;
  return (
    <div className="space-y-3">
      {t.stages.map((s, i) => (
        <div key={i} className="rounded-panel border border-line bg-console-2/50 p-2">
          <div className="mb-1 flex justify-between text-[9px] font-display uppercase tracking-wider">
            <span className={i === t.active ? 'text-phosphor' : 'text-muted-star'}>
              Stage {i + 1} fuel {i === t.active && '· burning'}
            </span>
            <span className="telemetry text-muted-star">{(s.fuelFrac * 100).toFixed(0)}%</span>
          </div>
          <Progress
            value={s.fuelFrac * 100}
            barClassName={i === t.active ? 'bg-flame' : 'bg-muted-star/40'}
          />
        </div>
      ))}

      <div className="rounded-panel border border-line bg-console-2/50 p-2">
        <div className="font-display text-[9px] uppercase tracking-wider text-muted-star">
          <InfoChip conceptId="max-q">Dynamic pressure</InfoChip>
        </div>
        <div className="telemetry mt-0.5 text-lg leading-tight text-starlight">
          {(t.q / 1000).toFixed(1)}
          <span className="ml-1 text-[10px] text-muted-star">/ peak {(t.maxQ / 1000).toFixed(1)} kPa</span>
        </div>
        <Progress
          className="mt-1"
          value={Math.min(100, (t.q / 40e3) * 100)}
          barClassName={t.q > 32e3 ? 'bg-crimson' : t.q > 24e3 ? 'bg-flame' : 'bg-phosphor'}
        />
      </div>

      <BigStat label="TWR" value={t.twr.toFixed(2)} unit="" conceptId="twr" />
    </div>
  );
}

export function MissionClock() {
  const t = useTelemetry((s) => s.t, 8);
  return (
    <span className="telemetry text-lg text-phosphor">{sToMinSec(t ?? 0)}</span>
  );
}
