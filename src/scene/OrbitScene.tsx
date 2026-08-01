// Map view: Earth to scale (1 unit = 1 Earth radius), live satellite from the
// sim's ECI state, full orbit line, and a fading trail. Left-drag rotates,
// right-drag pans, scroll zooms (OrbitControls).

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SceneCanvas } from './SceneCanvas';
import { Line, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { useUiStore } from '@/state/useUiStore';
import * as THREE from 'three';
import { R_EARTH } from '@/sim/constants';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { simController } from '@/state/simController';
import { useTelemetry } from '@/state/useTelemetry';
import { Earth } from './Earth';
import { Starfield } from './Starfield';

const SCALE = 1 / R_EARTH;
const TRAIL_LEN = 240;

/** Sim frame (orbital plane = xy) → render frame (y-up): (x, y, z) → (x, z, y). */
const toScene = (p: { x: number; y: number; z: number }): [number, number, number] => [
  p.x * SCALE,
  p.z * SCALE,
  p.y * SCALE,
];

function Satellite() {
  const ref = useRef<THREE.Group>(null);
  const trail = useMemo(() => new Float32Array(TRAIL_LEN * 3), []);
  const trailCount = useRef(0);
  const frame = useRef(0);

  const trailGeometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(trail, 3));
    g.setDrawRange(0, 0);
    return g;
  }, [trail]);

  const trailLine = useMemo(
    () =>
      new THREE.Line(
        trailGeometry,
        new THREE.LineBasicMaterial({ color: '#5ee6c8', transparent: true, opacity: 0.65 }),
      ),
    [trailGeometry],
  );

  useFrame(() => {
    const snap = telemetryBus.get();
    if (!snap || !ref.current) return;
    const [x, y, z] = toScene(snap.rEci);
    ref.current.position.set(x, y, z);

    if (frame.current++ % 4 === 0) {
      const n = trailCount.current;
      if (n < TRAIL_LEN) {
        trail.set([x, y, z], n * 3);
        trailCount.current++;
      } else {
        trail.copyWithin(0, 3);
        trail.set([x, y, z], (TRAIL_LEN - 1) * 3);
      }
      trailGeometry.setDrawRange(0, trailCount.current);
      trailGeometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <group ref={ref}>
        <mesh>
          <boxGeometry args={[0.03, 0.03, 0.05]} />
          <meshStandardMaterial color="#e8edf7" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0.06, 0, 0]}>
          <boxGeometry args={[0.09, 0.001, 0.03]} />
          <meshStandardMaterial color="#2c4a8f" metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh position={[-0.06, 0, 0]}>
          <boxGeometry args={[0.09, 0.001, 0.03]} />
          <meshStandardMaterial color="#2c4a8f" metalness={0.7} roughness={0.3} />
        </mesh>
        <pointLight intensity={0.15} distance={0.6} color="#5ee6c8" />
      </group>
      <primitive object={trailLine} />
    </>
  );
}

function OrbitPath() {
  // Orbit shape only changes on burns — sampling at 2 Hz through React is cheap.
  const stamp = useTelemetry((s) => `${s.orbit?.eccentricity ?? 0}|${s.orbit?.apoapsisAlt ?? 0}`, 2);
  const points = useMemo(() => {
    const raw = simController.sim.orbitPathPoints(160);
    return raw.map(toScene);
  }, [stamp]); // eslint-disable-line react-hooks/exhaustive-deps

  if (points.length < 2) return null;
  return <Line points={points} color="#7c8cf8" lineWidth={1.5} transparent opacity={0.8} />;
}

export function OrbitScene() {
  const lowGraphics = useUiStore((s) => s.lowGraphics);
  return (
    <SceneCanvas camera={{ position: [0, 1.8, 3.6], fov: 45 }}>
      <color attach="background" args={['#05070f']} />
      <ambientLight intensity={0.25} />
      <directionalLight position={[50, 0, 20]} intensity={2} />
      <Starfield />
      <Earth />
      <Satellite />
      <OrbitPath />
      <OrbitControls enablePan minDistance={1.4} maxDistance={20} />
      {!lowGraphics && (
        <EffectComposer>
          <Bloom intensity={0.5} luminanceThreshold={0.8} mipmapBlur />
        </EffectComposer>
      )}
    </SceneCanvas>
  );
}
