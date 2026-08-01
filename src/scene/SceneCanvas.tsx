// Shared <Canvas> wrapper: recovers from WebGL context loss (integrated GPUs
// reclaim contexts aggressively — without this the scene goes blank white)
// and caps device-pixel-ratio for school-laptop GPUs.

import { Canvas, type CanvasProps } from '@react-three/fiber';

export function SceneCanvas({ children, ...props }: CanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.25]}
      gl={{ powerPreference: 'high-performance', antialias: true }}
      onCreated={({ gl }) => {
        const el = gl.domElement;
        el.addEventListener(
          'webglcontextlost',
          (e) => {
            e.preventDefault(); // allow the browser to restore it
            window.setTimeout(() => {
              try {
                gl.forceContextRestore();
              } catch {
                /* browser will fire webglcontextrestored on its own */
              }
            }, 400);
          },
          false,
        );
      }}
      {...props}
    >
      {children}
    </Canvas>
  );
}
