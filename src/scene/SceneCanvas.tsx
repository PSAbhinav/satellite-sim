// Shared <Canvas> wrapper: survives WebGL context loss (integrated GPUs
// reclaim contexts aggressively — school laptops especially) and caps
// device-pixel-ratio for low-end GPUs.
//
// Recovery strategy: when a context dies, the renderer, its textures AND any
// EffectComposer render targets die with it — three alone can't rebuild the
// composer chain, which leaves a "restored" but permanently black canvas. So
// we remount the whole Canvas subtree (key bump): fresh context, fresh
// passes, textures re-upload. And because a pressured GPU sometimes never
// fires `webglcontextrestored` at all, a watchdog forces the remount if the
// restore hasn't arrived shortly after the loss.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, type CanvasProps } from '@react-three/fiber';

export function SceneCanvas({ children, ...props }: CanvasProps) {
  const [epoch, setEpoch] = useState(0);
  const watchdog = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(watchdog.current), []);

  const onCreated = useCallback<NonNullable<CanvasProps['onCreated']>>((state) => {
    const el = state.gl.domElement;
    el.addEventListener(
      'webglcontextlost',
      (e) => {
        e.preventDefault(); // tell the browser we want a restore
        window.clearTimeout(watchdog.current);
        watchdog.current = window.setTimeout(() => setEpoch((n) => n + 1), 1500);
      },
      false,
    );
    el.addEventListener(
      'webglcontextrestored',
      () => {
        window.clearTimeout(watchdog.current);
        setEpoch((n) => n + 1);
      },
      false,
    );
  }, []);

  return (
    <Canvas
      key={epoch}
      dpr={[1, 1.25]}
      gl={{ powerPreference: 'high-performance', antialias: true }}
      onCreated={onCreated}
      {...props}
    >
      {children}
    </Canvas>
  );
}
