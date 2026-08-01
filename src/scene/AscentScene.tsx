// Chase view of the climbing rocket. The rocket stays near the origin; the sky
// fades from blue to black with real altitude, the ground drops away early,
// and stars appear as the atmosphere thins.

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { RocketDesign } from '@/sim/model/rocket';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { ProceduralRocket3D } from './ProceduralRocket3D';
import { Starfield } from './Starfield';

function SceneContent({ design }: { design: RocketDesign }) {
  const rocketRef = useRef<THREE.Group>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const starsRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  useFrame(() => {
    const snap = telemetryBus.get();
    if (!snap) return;
    const alt = snap.altitude;

    // Sky: blue at the pad → black at ~80 km.
    const k = Math.min(1, alt / 80_000);
    const sky = new THREE.Color().lerpColors(
      new THREE.Color('#7fb2e5'),
      new THREE.Color('#05070f'),
      Math.pow(k, 0.6),
    );
    scene.background = sky;

    // Tilt the rocket with the real flight-path angle (visual shorthand).
    if (rocketRef.current) {
      const pitch = ((90 - snap.flightPathAngleDeg) * Math.PI) / 180;
      rocketRef.current.rotation.z = -Math.min(pitch, Math.PI / 2.4) * 0.9;
    }
    // Ground slides away below (log scale keeps early liftoff readable).
    if (groundRef.current) {
      groundRef.current.position.y = -1.2 - Math.log10(1 + alt / 10) * 3.2;
      groundRef.current.visible = alt < 60_000;
    }
    if (starsRef.current) starsRef.current.visible = k > 0.5;
  });

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[8, 12, 6]} intensity={1.6} />
      <group ref={starsRef} visible={false}>
        <Starfield count={2200} />
      </group>

      <group ref={rocketRef} position={[0, -1.5, 0]}>
        <ProceduralRocket3D design={design} />
      </group>

      {/* Launch pad + ground */}
      <mesh ref={groundRef} position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color="#243021" roughness={1} />
      </mesh>

      <OrbitControls
        enablePan
        enableZoom
        minDistance={3}
        maxDistance={30}
        target={[0, 1.2, 0]}
      />
    </>
  );
}

export function AscentScene({ design }: { design: RocketDesign }) {
  return (
    <Canvas camera={{ position: [5.5, 2.5, 7], fov: 45 }} dpr={[1, 1.5]}>
      <SceneContent design={design} />
    </Canvas>
  );
}
