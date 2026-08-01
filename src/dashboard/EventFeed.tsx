import { useEffect, useRef } from 'react';
import { useMissionStore } from '@/state/useMissionStore';
import { sToMinSec } from '@/sim/units';
import type { EventSeverity } from '@/sim/runtime/events';

const SEVERITY_COLOR: Record<EventSeverity, string> = {
  nominal: 'text-muted-star',
  callout: 'text-phosphor',
  warning: 'text-flame',
  critical: 'text-crimson',
};

export function EventFeed() {
  const events = useMissionStore((s) => s.events);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-panel border border-line bg-console">
      <div className="border-b border-line px-3 py-1.5 font-display text-[10px] uppercase tracking-wider text-muted-star">
        Flight events
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {events.map((e, i) => (
          <div
            key={`${e.type}-${i}`}
            className="flex gap-2 text-xs motion-safe:animate-[route-in_0.25s_ease-out]"
          >
            <span className="telemetry shrink-0 text-muted-star/70">{sToMinSec(e.t)}</span>
            <span className={SEVERITY_COLOR[e.severity]}>{e.message}</span>
          </div>
        ))}
        {!events.length && (
          <p className="p-2 text-xs text-muted-star/60">Waiting for ignition…</p>
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
}
