// The rocket you configured, drawn to (rough) scale — stage heights track
// propellant mass, engine bells track engine count. Your choices, made visible.

import type { RocketDesign } from '@/sim/model/rocket';

export function RocketSilhouette({ design, burnStage }: { design: RocketDesign; burnStage?: number }) {
  const W = 120;
  const bodyW = 44;
  const x0 = (W - bodyW) / 2;
  // Height of each stage ∝ cube-root of prop mass (visual, not literal).
  const heights = design.stages.map((s) => Math.max(30, 16 * Math.cbrt(s.propMass / 1000)));
  const fairingH = 42;
  const totalH = heights.reduce((a, b) => a + b, 0) + fairingH + 22;

  let y = 10 + fairingH;
  const stageRects = design.stages
    .slice()
    .reverse()
    .map((s, revIdx) => {
      const i = design.stages.length - 1 - revIdx;
      const h = heights[i];
      const rect = { i, y, h, s };
      y += h;
      return rect;
    });

  return (
    <svg
      viewBox={`0 0 ${W} ${totalH + 20}`}
      className="mx-auto h-full max-h-[420px]"
      role="img"
      aria-label="Your rocket"
    >
      {/* Fairing (ogive nose) */}
      <path
        d={`M ${x0} ${10 + fairingH} Q ${x0} ${14} ${W / 2} 6 Q ${W - x0} ${14} ${W - x0} ${10 + fairingH} Z`}
        fill="#1c2942"
        stroke="#7c8cf8"
        strokeWidth="1"
      />
      <circle cx={W / 2} cy={10 + fairingH * 0.55} r="6" fill="#5ee6c8" opacity="0.85" />

      {stageRects.map(({ i, y: sy, h, s }) => (
        <g key={s.id + i}>
          <rect
            x={x0}
            y={sy}
            width={bodyW}
            height={h}
            fill={burnStage === i ? '#22314f' : '#141e33'}
            stroke={burnStage === i ? '#f5a524' : '#2a3854'}
            strokeWidth="1"
            rx="3"
          />
          {/* Interstage line */}
          <line x1={x0} y1={sy} x2={x0 + bodyW} y2={sy} stroke="#0d1526" strokeWidth="2" />
          {/* Engine bells */}
          {Array.from({ length: Math.min(s.engineCount, 9) }).map((_, e) => {
            const cols = Math.min(s.engineCount, 3);
            const col = e % cols;
            const row = Math.floor(e / cols);
            const bw = bodyW / (cols + 1);
            return (
              <path
                key={e}
                d={`M ${x0 + bw * (col + 0.7)} ${sy + h} l ${bw * 0.6} 0 l ${bw * 0.15} 7 l ${-bw * 0.9} 0 Z`}
                fill="#2a3854"
                stroke="#4a5a7a"
                strokeWidth="0.6"
                transform={`translate(0 ${row * 2})`}
              />
            );
          })}
          <text
            x={W - x0 + 6}
            y={sy + h / 2}
            fill="#8b96ad"
            fontSize="7"
            fontFamily="Chakra Petch, sans-serif"
            dominantBaseline="middle"
          >
            S{i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
