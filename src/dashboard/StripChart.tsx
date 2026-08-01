// Live strip chart on uPlot: canvas-based, imperative setData from the
// telemetry ring buffer — zero React re-renders on the hot path.
// Single series per chart; the title names it (no legend needed).

import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import { telemetryBus } from '@/sim/runtime/telemetryBus';

const GRID = { stroke: '#1a2438', width: 1 } as const;
const TICK = { stroke: '#1a2438', width: 1, size: 4 } as const;
const AXIS_FONT = '10px "JetBrains Mono Variable", monospace';

export function StripChart({
  metric,
  label,
  unit,
  color,
  scale = 1,
  windowS = 120,
}: {
  metric: 'altitude' | 'speed' | 'accelG' | 'q';
  label: string;
  unit: string;
  color: string;
  /** Display divisor (e.g. 1000 for km). */
  scale?: number;
  windowS?: number;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const opts: uPlot.Options = {
      width: host.clientWidth,
      height: 130,
      padding: [8, 8, 0, 0],
      cursor: { y: false, points: { size: 6 } },
      legend: { show: false },
      scales: { x: { time: false } },
      axes: [
        {
          stroke: '#8b96ad',
          grid: GRID,
          ticks: TICK,
          font: AXIS_FONT,
          values: (_u, ticks) => ticks.map((t) => `${Math.round(t)}s`),
        },
        {
          stroke: '#8b96ad',
          grid: GRID,
          ticks: TICK,
          font: AXIS_FONT,
          size: 46,
        },
      ],
      series: [
        {},
        {
          stroke: color,
          width: 2,
          points: { show: false },
        },
      ],
    };

    const plot = new uPlot(opts, [[0], [0]], host);
    plotRef.current = plot;

    let raf = 0;
    let last = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      if (now - last < 66) return; // ~15 fps repaint is plenty for charts
      last = now;
      const h = telemetryBus.history;
      if (!h.t.length) return;
      const tEnd = h.t[h.t.length - 1];
      const tStart = Math.max(0, tEnd - windowS);
      let i0 = 0;
      while (i0 < h.t.length && h.t[i0] < tStart) i0++;
      const xs = h.t.slice(i0);
      const ys = h[metric].slice(i0).map((v) => v / scale);
      plot.setData([xs, ys]);
      if (valueRef.current && ys.length) {
        valueRef.current.textContent = ys[ys.length - 1].toFixed(scale === 1 ? 1 : 1);
      }
    };
    raf = requestAnimationFrame(tick);

    const onResize = () => plot.setSize({ width: host.clientWidth, height: 130 });
    const ro = new ResizeObserver(onResize);
    ro.observe(host);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      plot.destroy();
      plotRef.current = null;
    };
  }, [metric, color, scale, windowS]);

  return (
    <div className="rounded-panel border border-line bg-console p-2">
      <div className="mb-1 flex items-baseline justify-between px-1">
        <span className="font-display text-[10px] uppercase tracking-wider text-muted-star">
          {label}
        </span>
        <span className="telemetry text-sm text-starlight">
          <span ref={valueRef}>0</span>
          <span className="ml-1 text-[10px] text-muted-star">{unit}</span>
        </span>
      </div>
      <div ref={hostRef} />
    </div>
  );
}
