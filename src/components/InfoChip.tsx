// Every stat/term in the app wears one of these: tap/click for the Spacepedia
// explanation at the current age level, with the formula when there is one.

import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CONCEPTS } from '@/content/registry';
import { useUiStore } from '@/state/useUiStore';
import { FormulaBlock } from './FormulaBlock';
import { cn } from '@/lib/utils';

export function InfoChip({
  conceptId,
  children,
  className,
}: {
  conceptId: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const ageLevel = useUiStore((s) => s.ageLevel);
  const concept = CONCEPTS[conceptId];
  if (!concept) return <>{children}</>;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex items-center gap-1 cursor-help border-b border-dotted border-muted-star/50 hover:border-phosphor hover:text-phosphor transition-colors',
            className,
          )}
        >
          {children ?? concept.term}
          <CircleHelp className="size-3 opacity-40 group-hover:opacity-100" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-h-96 overflow-y-auto">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display font-semibold text-phosphor">{concept.term}</h3>
          <Badge variant="ion">{ageLevel}</Badge>
        </div>
        <p className="mt-1 text-xs text-muted-star italic">{concept.short}</p>
        <p className="mt-3 text-sm leading-relaxed">{concept.levels[ageLevel]}</p>
        {concept.formula && ageLevel !== 'kid' && (
          <div className="mt-3">
            <FormulaBlock formula={concept.formula} />
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
