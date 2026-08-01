// Chase view of the climbing rocket. The rocket stays near the origin; the sky
// fades from launch-day blue to black with real altitude, the pad drops away,
// and stars appear as the atmosphere thins.

import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { RocketDesign } from '@/sim/model/rocket';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { ProceduralRocket3D } from './ProceduralRocket3D';
import { Starfield } from './Starfield';

function LaunchPad() {
  return (
    <group position={[0, -0.1, 0]}>
      {/* Concrete apron */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[10, 40]} />
        <meshStandardMaterial color="#5a5f66" roughness={0.95} />
      </mesh>
      {/* Launch mount */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[1.1, 1.4, 0.5, 20]} />
        <meshStandardMaterial color="#3a4048" roughness={0.8} metalness={0.3} />
      </mesh>
      {/* Strongback tower */}
      <mesh position={[1.6, 5, 0]}>
        <boxGeometry args={[0.5, 10, 0.5]} />
        <meshStandardMaterial color="#2e3742" roughness={0.7} metalness={0.4} />
      </mesh>
      {[2, 4.5, 7].map((y) => (
        <mesh key={y} position={[0.95, y, 0]}>
          <boxGeometry args={[0.9, 0.12, 0.3] } />
          <meshStandardMaterial color="#2e3742" roughness={0.7} metalness={0.4} />
        </mesh>
      ))}
      {/* Lightning masts */}
      {[[-6, 4], [6, -4], [-5, -5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 4, z]}>
          <cylinderGeometry args={[0.06, 0.1, 8, 6]} />
          <meshStandardMaterial color="#67707c" roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function SceneContent({ design }: { design: RocketDesign }) {
  const rocketRef = useRef<THREE.Group>(null);
  const worldRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Group>(null);
  const { scene } = useThree();

  useFrame(() => {
    const snap = telemetryBus.get();
    if (!snap) return;
    const alt = Math.max(0, snap.altitude);

    // Sky: launch-day blue at the pad → black at ~80 km.
    const k = Math.min(1, alt / 80_000);
    const sky = new THREE.Color().lerpColors(
      new THREE.Color('#8db8e8'),
      new THREE.Color('#04060d'),
      Math.pow(k, 0.55),
    );
    scene.background = sky;
    scene.fog = k < 0.6 ? new THREE.Fog(sky, 40, 140) : null;

    // Tilt the rocket with the real flight-path angle (visual shorthand).
    if (rocketRef.current) {
      const pitch = ((90 - snap.flightPathAngleDeg) * Math.PI) / 180;
      rocketRef.current.rotation.z = -Math.min(pitch, Math.PI / 2.4) * 0.9;
    }
    // The pad + ground slide away below (log scale keeps liftoff readable).
    if (worldRef.current) {
      worldRef.current.position.y = -Math.log10(1 + alt / 8) * 4.2;
      worldRef.current.visible = alt < 45_000;
    }
    if (starsRef.current) starsRef.current.visible = k > 0.45;
  });

  return (
    <>
      <hemisphereLight args={['#bcd6f5', '#20262e', 0.7]} />
      <directionalLight position={[14, 18, 8]} intensity={1.7} />
      <group ref={starsRef} visible={false}>
        <Starfield count={2200} />
      </group>

      <group ref={rocketRef}>
        <ProceduralRocket3D design={design} />
      </group>

      <group ref={worldRef}>
        <LaunchPad />
        {/* Terrain */}
        <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[220, 48]} />
          <meshStandardMaterial color="#2c3a2b" roughness={1} />
        </mesh>
      </group>

      <OrbitControls enablePan minDistance={4} maxDistance={40} target={[0, 4, 0]} />
    </>
  );
}

export function AscentScene({ design }: { design: RocketDesign }) {
  return (
    <Canvas camera={{ position: [10, 6, 13], fov: 42 }} dpr={[1, 1.5]}>
      <SceneContent design={design} />
    </Canvas>
  );
}
