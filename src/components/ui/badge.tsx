import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-medium font-display uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'border-line bg-console-2 text-muted-star',
        go: 'border-go/40 bg-go/10 text-go',
        caution: 'border-flame/40 bg-flame/10 text-flame',
        nogo: 'border-crimson/40 bg-crimson/10 text-crimson',
        data: 'border-phosphor/40 bg-phosphor/10 text-phosphor',
        ion: 'border-ion/40 bg-ion/10 text-ion',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
