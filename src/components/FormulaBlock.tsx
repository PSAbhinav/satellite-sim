import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useMemo } from 'react';
import type { Concept } from '@/content/types';

/** Renders a concept's formula with its plain-language legend. */
export function FormulaBlock({ formula }: { formula: NonNullable<Concept['formula']> }) {
  const html = useMemo(
    () => katex.renderToString(formula.tex, { throwOnError: false, displayMode: true }),
    [formula.tex],
  );
  return (
    <div className="rounded-panel border border-line bg-void/60 p-3">
      <div className="text-phosphor" dangerouslySetInnerHTML={{ __html: html }} />
      <dl className="mt-2 space-y-1">
        {formula.legend.map(([sym, meaning]) => (
          <div key={sym} className="flex gap-2 text-xs text-muted-star">
            <dt
              className="telemetry text-starlight/80 min-w-10"
              dangerouslySetInnerHTML={{
                __html: katex.renderToString(sym, { throwOnError: false }),
              }}
            />
            <dd>{meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
