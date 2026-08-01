import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-panel text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 cursor-pointer font-display",
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-ion to-[#5b6ce0] text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_14px_rgba(124,140,248,0.25)] hover:brightness-110',
        go: 'bg-gradient-to-b from-go to-[#2fae5f] text-[#04180b] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_4px_14px_rgba(74,222,128,0.25)] hover:brightness-110',
        destructive:
          'bg-gradient-to-b from-crimson to-[#d24a4a] text-[#1d0505] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_14px_rgba(240,106,106,0.25)] hover:brightness-110',
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
