// "Meanwhile, on Earth…" — the next real launch happening anywhere in the
// world, so the countdown screen connects the sim to reality.

import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { fetchNextLaunch, formatCountdown, type NextLaunch } from '@/lib/nextLaunch';

export function NextLaunchCard() {
  const [launch, setLaunch] = useState<NextLaunch | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    let alive = true;
    void fetchNextLaunch().then((l) => alive && setLaunch(l));
    const t = setInterval(() => tick((n) => n + 1), 30_000); // refresh countdown text
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (!launch) return null;

  return (
    <div className="pointer-events-none absolute right-4 top-16 w-72 rounded-panel border border-line bg-void/80 p-3 backdrop-blur">
      <div className="flex items-center gap-1.5 font-display text-[9px] uppercase tracking-[0.25em] text-flame">
        <Radio className="size-3 animate-blink" /> Next real-world launch
      </div>
      <div className="mt-1.5 truncate text-sm font-semibold text-starlight" title={launch.name}>
        {launch.name}
      </div>
      <div className="mt-0.5 text-[11px] text-muted-star">
        {launch.provider}
        {launch.location ? ` · ${launch.location}` : ''}
      </div>
      <div className="telemetry mt-1.5 text-lg text-phosphor">{formatCountdown(launch.net)}</div>
      <div className="mt-0.5 text-[9px] text-muted-star/60">Live data: Launch Library 2</div>
    </div>
  );
}
