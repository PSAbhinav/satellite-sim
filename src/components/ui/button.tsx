import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-panel text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 cursor-pointer font-display",
  {
    variants: {
      variant: {
        default: 'bg-ion text-primary-foreground hover:bg-ion/85',
        go: 'bg-go/90 text-[#04180b] hover:bg-go',
        destructive: 'bg-crimson text-[#1d0505] hover:bg-crimson/85',
        outline: 'border border-line bg-transparent hover:bg-console-2 hover:text-starlight',
        secondary: 'bg-console-2 text-starlight hover:bg-console-2/70 border border-line',
        ghost: 'hover:bg-console-2 hover:text-starlight',
        link: 'text-ion underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-11 px-8 text-base',
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
