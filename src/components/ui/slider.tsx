import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { cn } from '@/lib/utils';

function Slider({ className, ...props }: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      className={cn('relative flex w-full touch-none select-none items-center', className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-console-2">
        <SliderPrimitive.Range className="absolute h-full bg-ion" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block size-4 rounded-full border border-ion bg-starlight shadow transition-colors focus-visible:outline-2 focus-visible:outline-ion disabled:pointer-events-none" />
    </SliderPrimitive.Root>
  );
}

export { Slider };
