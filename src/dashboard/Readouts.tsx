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
    <div className="rounded-panel border border-line bg-console px-3 py-2">
      <div className="font-display text-[10px] uppercase tracking-wider text-muted-star">
        {conceptId ? <InfoChip conceptId={conceptId}>{label}</InfoChip> : label}
      </div>
      <div className={`telemetry text-xl ${accent ? 'text-phosphor' : 'text-starlight'}`}>
        {value}
        <span className="ml-1 text-xs text-muted-star">{unit}</span>
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
  return (
    <div className="space-y-2">
      <BigStat label="Altitude" value={(t.alt / 1000).toFixed(1)} unit="km" accent />
      <BigStat label="Speed" value={(t.speed / 1000).toFixed(2)} unit="km/s" />
      <BigStat label="Vert. speed" value={t.vs.toFixed(0)} unit="m/s" />
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
        <div key={i} className="rounded-panel border border-line bg-console p-2">
          <div className="mb-1 flex justify-between text-[10px] font-display uppercase tracking-wider">
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

      <div className="rounded-panel border border-line bg-console p-2">
        <div className="mb-1 flex justify-between text-[10px] font-display uppercase tracking-wider">
          <span className="text-muted-star">
            <InfoChip conceptId="max-q">Dyn. pressure</InfoChip>
          </span>
          <span className="telemetry text-muted-star">
            {(t.q / 1000).toFixed(1)} / peak {(t.maxQ / 1000).toFixed(1)} kPa
          </span>
        </div>
        <Progress
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
