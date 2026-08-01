import { Link } from 'react-router-dom';
import { ArrowRight, Camera, CloudSun, GraduationCap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InfoChip } from '@/components/InfoChip';
import { PAYLOADS } from '@/sim/model/catalog';
import { requiredDeltaV, totalDeltaV } from '@/sim/model/rocket';
import { SITES, siteRotationBonus } from '@/sim/env/sites';
import { msToKms } from '@/sim/units';
import { useMissionStore } from '@/state/useMissionStore';

const ICONS: Record<string, typeof Camera> = {
  'cubesat-3u': GraduationCap,
  'imaging-150': Camera,
  'weather-900': CloudSun,
};

export default function PayloadBay() {
  const design = useMissionStore((s) => s.design);
  const payloadId = useMissionStore((s) => s.payloadId);
  const setPayload = useMissionStore((s) => s.setPayload);
  const siteId = useMissionStore((s) => s.siteId);
  const site = SITES[siteId];

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="font-display text-lg font-bold">Payload Bay</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-star">
        The passenger decides the trip. Each satellite needs a different orbit — and a heavier
        satellite or a higher orbit costs more <InfoChip conceptId="delta-v">Δv</InfoChip>. Choose
        who rides on top.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Object.values(PAYLOADS).map((p) => {
          const Icon = ICONS[p.id] ?? Camera;
          const selected = payloadId === p.id;
          // What would the budget look like with this payload fitted?
          const trial = { ...design, payload: p };
          const margin =
            totalDeltaV(trial) - requiredDeltaV(p.target.altitude, siteRotationBonus(site));
          return (
            <button key={p.id} onClick={() => setPayload(p.id)} className="text-left cursor-pointer">
              <Card
                className={`h-full transition-colors ${
                  selected ? 'border-phosphor/60 bg-console-2' : 'hover:border-muted-star/50'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <Icon className="size-6 text-ion" />
                    {selected && <Badge variant="data">in the bay</Badge>}
                  </div>
                  <div className="mt-3 font-display font-semibold">{p.name}</div>
                  <p className="mt-1 text-xs text-muted-star">{p.blurb}</p>
                  <div className="telemetry mt-3 space-y-1 text-[11px] text-muted-star">
                    <div className="flex justify-between">
                      <span>Mass</span>
                      <span>{p.mass} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Target orbit</span>
                      <span>{p.target.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>
                        <InfoChip conceptId="inclination">Inclination</InfoChip>
                      </span>
                      <span>{p.target.inclinationDeg}°</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Δv margin</span>
                      <span className={margin >= 0 ? 'text-go' : 'text-crimson'}>
                        {margin >= 0 ? '+' : ''}
                        {msToKms(margin).toFixed(2)} km/s
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button asChild variant="secondary">
          <Link to="/build">Back to Assembly</Link>
        </Button>
        <Button asChild variant="go">
          <Link to="/site">
            Continue to Launch Site <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
