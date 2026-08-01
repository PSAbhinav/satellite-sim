// Procedural starfield + nebula glow. Thousands of stars with real-ish color
// temperatures (blue giants → red dwarfs) and a few soft galaxy-colored washes.
// Deterministic (seeded) and a few KB of code instead of megabytes of texture.

import { useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '@/sim/math/rng';

const STAR_COLORS = [
  [0.62, 0.72, 1.0], // O/B blue
  [0.75, 0.82, 1.0], // A blue-white
  [1.0, 1.0, 1.0], // F white
  [1.0, 0.96, 0.83], // G yellow (the Sun)
  [1.0, 0.85, 0.65], // K orange
  [1.0, 0.72, 0.55], // M red
];

export function Starfield({ count = 3500, radius = 400 }: { count?: number; radius?: number }) {
  const { positions, colors, sizes } = useMemo(() => {
    const rnd = mulberry32(0xc0ffee);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      // Uniform on a sphere shell.
      const u = rnd() * 2 - 1;
      const phi = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      positions[i * 3] = radius * s * Math.cos(phi);
      positions[i * 3 + 1] = radius * u;
      positions[i * 3 + 2] = radius * s * Math.sin(phi);
      // Weight toward cooler colors like the real sky.
      const c = STAR_COLORS[Math.min(5, Math.floor(rnd() * rnd() * 6))];
      const brightness = 0.4 + rnd() * 0.6;
      colors[i * 3] = c[0] * brightness;
      colors[i * 3 + 1] = c[1] * brightness;
      colors[i * 3 + 2] = c[2] * brightness;
      sizes[i] = rnd() < 0.03 ? 3.2 : 1.4 + rnd() * 1.2;
    }
    return { positions, colors, sizes };
  }, [count, radius]);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [positions, colors, sizes]);

  return (
    <group>
      <points geometry={geometry}>
        <pointsMaterial vertexColors size={1.6} sizeAttenuation={false} depthWrite={false} />
      </points>
      <NebulaWash />
    </group>
  );
}

/** Soft radial-gradient sprites in galaxy colors — teal, violet, magenta. */
function NebulaWash() {
  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.25)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    return t;
  }, []);

  const clouds: { pos: [number, number, number]; color: string; scale: number; opacity: number }[] = [
    { pos: [-260, 90, -240], color: '#7c8cf8', scale: 320, opacity: 0.10 },
    { pos: [280, -60, -200], color: '#5ee6c8', scale: 260, opacity: 0.07 },
    { pos: [60, 200, -300], color: '#c471ed', scale: 300, opacity: 0.08 },
    { pos: [-120, -220, -180], color: '#3b5bd9', scale: 240, opacity: 0.09 },
  ];

  return (
    <>
      {clouds.map((n, i) => (
        <sprite key={i} position={n.pos} scale={[n.scale, n.scale, 1]}>
          <spriteMaterial
            map={texture}
            color={n.color}
            transparent
            opacity={n.opacity}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </>
  );
}
