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

// ONE sun for the whole scene: the visible disc, the directional light, and
// the Earth shader's terminator all derive from this direction — so day/night
// on the globe always points at the sun you can actually see.
const SUN_DIR = new THREE.Vector3(1, 0.22, 0.38).normalize();
const SUN_DIST = 330;

/** The Sun, visible from orbit: a hot disc + layered additive glow. Bloom
    picks up the >1 emissive color and gives it the webcam-flare look. */
function Sun() {
  const glowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,244,214,1)');
    grad.addColorStop(0.25, 'rgba(255,214,140,0.55)');
    grad.addColorStop(0.6, 'rgba(255,180,90,0.16)');
    grad.addColorStop(1, 'rgba(255,160,70,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  const pos = useMemo(() => SUN_DIR.clone().multiplyScalar(SUN_DIST), []);
  const coreMat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial();
    m.color.setRGB(4, 3.6, 3); // >1 so Bloom flares it
    return m;
  }, []);
  return (
    <group position={pos}>
      <mesh material={coreMat}>
        {/* Real angular size would be ~1.5 units at this distance; drawn a
            touch larger for presence. */}
        <sphereGeometry args={[2.6, 24, 24]} />
      </mesh>
      <sprite scale={[46, 46, 1]}>
        <spriteMaterial
          map={glowTex}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
    </group>
  );
}

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
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[SUN_DIR.x * 50, SUN_DIR.y * 50, SUN_DIR.z * 50]}
        intensity={2.2}
        color="#fff4dc"
      />
      <Starfield />
      <Sun />
      <Earth sunDirection={SUN_DIR} />
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
