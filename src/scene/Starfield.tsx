// Real night sky: the ESO/S. Brunier all-sky Milky Way panorama (CC BY 4.0)
// as the skybox — an actual photograph of the galaxy, gold core, dust lanes,
// Magellanic Clouds — plus procedural stars with real color temperatures
// (blue giants → red dwarfs) floating in front for parallax depth.

import { useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { mulberry32 } from '@/sim/math/rng';

const BASE = import.meta.env.BASE_URL;

/** The galaxy itself — ESO/S. Brunier 360° panorama, CC BY 4.0. */
function MilkyWay({ radius }: { radius: number }) {
  const map = useLoader(THREE.TextureLoader, `${BASE}textures/milkyway_eso.jpg`);
  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ map, side: THREE.BackSide, depthWrite: false });
    // The pano is a true astronomical exposure — dark by design. Lift it so
    // the band and its colors read on a consumer screen.
    m.color.setRGB(1.65, 1.65, 1.65);
    return m;
  }, [map]);
  useEffect(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 4;
    map.needsUpdate = true;
  }, [map]);
  return (
    <mesh rotation={[0.35, 0, 0.4]} material={material}>
      <sphereGeometry args={[radius * 1.15, 48, 48]} />
    </mesh>
  );
}

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
      <MilkyWay radius={radius} />
      <points geometry={geometry}>
        <pointsMaterial vertexColors size={1.6} sizeAttenuation={false} depthWrite={false} />
      </points>
    </group>
  );
}
