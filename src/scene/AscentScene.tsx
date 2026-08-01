// Launch view. A coastal pad (ocean to the east, like every real range),
// truss tower, tank farm, liftoff smoke and sun haze; the sky fades from
// launch-day blue to black with real altitude and the world drops away.

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { SceneCanvas } from './SceneCanvas';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { RocketDesign } from '@/sim/model/rocket';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { ProceduralRocket3D } from './ProceduralRocket3D';
import { Starfield } from './Starfield';
import { Earth } from './Earth';

function softDiscTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function LaunchComplex() {
  const puff = useMemo(softDiscTexture, []);
  return (
    <group>
      {/* Ocean to the horizon */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[900, 48]} />
        <meshStandardMaterial color="#1d4e73" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* The cape: sandy island the pad sits on */}
      <mesh position={[-25, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[95, 48]} />
        <meshStandardMaterial color="#4a5c3a" roughness={1} />
      </mesh>
      <mesh position={[30, -0.31, 10]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[38, 32]} />
        <meshStandardMaterial color="#8d886a" roughness={1} />
      </mesh>

      {/* Concrete apron + flame trench */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[12, 40]} />
        <meshStandardMaterial color="#767b82" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <cylinderGeometry args={[1.3, 1.7, 0.5, 20]} />
        <meshStandardMaterial color="#3a4048" roughness={0.8} metalness={0.3} />
      </mesh>

      {/* Strongback truss tower */}
      <group position={[1.9, 0, 0]}>
        {[[-0.28, -0.28], [0.28, -0.28], [-0.28, 0.28], [0.28, 0.28]].map(([x, z], i) => (
          <mesh key={i} position={[x, 5.6, z]}>
            <boxGeometry args={[0.14, 11.2, 0.14]} />
            <meshStandardMaterial color="#9aa2ad" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
        {[1.4, 2.8, 4.2, 5.6, 7, 8.4, 9.8].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.72, 0.1, 0.72]} />
            <meshStandardMaterial color="#7e8894" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
        {/* Crew/service arms toward the vehicle */}
        {[3.2, 6.4].map((y) => (
          <mesh key={y} position={[-0.95, y, 0]}>
            <boxGeometry args={[1.3, 0.14, 0.4]} />
            <meshStandardMaterial color="#7e8894" roughness={0.6} metalness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Propellant tank farm */}
      {[[-7, 3], [-8.5, 0.5], [-7, -2.5]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.7, 0.7, 1.8, 16]} />
            <meshStandardMaterial color="#e8e9ea" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[0, 1.95, 0]}>
            <sphereGeometry args={[0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e8e9ea" roughness={0.4} metalness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Lightning masts */}
      {[[-5.5, 5.5], [6, -5], [5.5, 5.5], [-6, -5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 5.5, z]}>
          <cylinderGeometry args={[0.05, 0.12, 11, 6]} />
          <meshStandardMaterial color="#aab2bc" roughness={0.7} />
        </mesh>
      ))}

      {/* Distant cumulus */}
      {[[-90, 26, -140], [120, 34, -110], [40, 22, -170], [-150, 30, 60]].map((p, i) => (
        <sprite key={i} position={p as [number, number, number]} scale={[60, 26, 1]}>
          <spriteMaterial map={puff} color="#f4f7fb" transparent opacity={0.8} depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

/** Billowing smoke at the pad during the first seconds of flight. */
function LiftoffSmoke() {
  const puff = useMemo(softDiscTexture, []);
  const group = useRef<THREE.Group>(null);
  const seeds = useMemo(
    () => Array.from({ length: 14 }, (_, i) => ({ a: (i / 14) * Math.PI * 2, s: 0.6 + (i % 5) * 0.17 })),
    [],
  );

  useFrame(({ clock }) => {
    const snap = telemetryBus.get();
    if (!group.current) return;
    const active = !!snap && snap.thrust > 0 && snap.altitude < 900;
    group.current.visible = active;
    if (!active) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((spr, i) => {
      const seed = seeds[i];
      const phase = (t * seed.s + i * 0.53) % 3;
      const dist = 1.2 + phase * 4.5;
      spr.position.set(Math.cos(seed.a) * dist, 0.25 + phase * 0.75, Math.sin(seed.a) * dist);
      const sc = 1.4 + phase * 2.4;
      spr.scale.set(sc, sc, 1);
      (spr as THREE.Sprite).material.opacity = Math.max(0, 0.55 - phase * 0.19);
    });
  });

  return (
    <group ref={group} visible={false}>
      {seeds.map((_, i) => (
        <sprite key={i}>
          <spriteMaterial map={puff} color="#d9dce0" transparent depthWrite={false} />
        </sprite>
      ))}
    </group>
  );
}

function SceneContent({ design, cinematic }: { design: RocketDesign; cinematic?: boolean }) {
  const rocketRef = useRef<THREE.Group>(null);
  const worldRef = useRef<THREE.Group>(null);
  const starsRef = useRef<THREE.Group>(null);
  const earthRef = useRef<THREE.Group>(null);
  const { scene } = useThree();
  const sunTex = useMemo(softDiscTexture, []);

  // Stylized planet below the vehicle once the pad diorama fades out.
  const EARTH_R = 3000;

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
    scene.fog = k < 0.6 ? new THREE.Fog(sky, 60, 400) : null;

    // Tilt with the air-relative flight-path angle (upright on the pad).
    if (rocketRef.current) {
      const pitch = ((90 - snap.flightPathAngleDeg) * Math.PI) / 180;
      rocketRef.current.rotation.z = -Math.min(Math.max(pitch, 0), Math.PI / 2.2);
    }
    // The pad diorama slides away below (log scale keeps liftoff readable).
    if (worldRef.current) {
      worldRef.current.position.y = -Math.log10(1 + alt / 8) * 4.2;
      worldRef.current.visible = alt < 25_000;
    }
    // From ~20 km up, the real view takes over: Earth's limb below, curving
    // away as altitude grows. Keep the globe far enough that its texture
    // reads as terrain, never as magnified pixels (min ~450 units standoff).
    if (earthRef.current) {
      earthRef.current.visible = alt > 18_000;
      earthRef.current.position.y = -(EARTH_R + 450 + (alt / 1000) * 2.6);
    }
    if (starsRef.current) starsRef.current.visible = k > 0.45;
  });

  return (
    <>
      <hemisphereLight args={['#cfe2fa', '#2a3328', 0.75]} />
      <directionalLight position={[60, 80, 30]} intensity={1.9} color="#fff4e0" />
      {/* Sun glare */}
      <sprite position={[210, 260, 90]} scale={[70, 70, 1]}>
        <spriteMaterial
          map={sunTex}
          color="#fff2cf"
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>

      <group ref={starsRef} visible={false}>
        <Starfield count={2200} />
      </group>

      <group ref={rocketRef}>
        <ProceduralRocket3D design={design} />
      </group>

      <group ref={worldRef}>
        <LaunchComplex />
        <LiftoffSmoke />
      </group>

      <group ref={earthRef} visible={false}>
        <Earth radius={EARTH_R} />
      </group>

      {/* maxPolarAngle keeps the camera above the horizon — no under-ground views. */}
      <OrbitControls
        enablePan
        minDistance={4}
        maxDistance={60}
        target={[0, 4, 0]}
        maxPolarAngle={Math.PI / 2 - 0.06}
        autoRotate={cinematic}
        autoRotateSpeed={0.6}
      />
    </>
  );
}

export function AscentScene({
  design,
  cinematic = false,
}: {
  design: RocketDesign;
  /** Slow auto-orbit around the pad — used during the countdown. */
  cinematic?: boolean;
}) {
  return (
    <SceneCanvas camera={{ position: [11, 5.5, 14], fov: 40, far: 30000 }}>
      <SceneContent design={design} cinematic={cinematic} />
    </SceneCanvas>
  );
}
