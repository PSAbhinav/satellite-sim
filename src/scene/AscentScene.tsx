// Launch view. A coastal pad (ocean to the east, like every real range),
// truss tower, tank farm, liftoff smoke and sun haze; the sky fades from
// launch-day blue to black with real altitude and the world drops away.

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { SceneCanvas } from './SceneCanvas';
import { OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useUiStore } from '@/state/useUiStore';
import type { RocketDesign } from '@/sim/model/rocket';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { ProceduralRocket3D } from './ProceduralRocket3D';
import { Starfield } from './Starfield';
import { Earth } from './Earth';

// Direction TO this scene's sun (the glare sprite at [210,260,90] and the
// directional light both sit along it) — shared with the Earth terminator.
const ASCENT_SUN_DIR = new THREE.Vector3(210, 260, 90).normalize();

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

/** Height of the launch table the vehicle stands on (engine bells visible under it). */
export const TABLE_H = 1.4;

const STEEL = { color: '#8d97a3', roughness: 0.55, metalness: 0.5 };
const CONCRETE = { color: '#7d838c', roughness: 0.95, metalness: 0 };

function LaunchComplex() {
  const puff = useMemo(softDiscTexture, []);
  return (
    <group>
      {/* Ocean to the horizon */}
      <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[900, 48]} />
        <meshStandardMaterial color="#1d4e73" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* The cape: island the complex sits on */}
      <mesh position={[-25, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[120, 48]} />
        <meshStandardMaterial color="#4a5c3a" roughness={1} />
      </mesh>

      {/* Concrete apron + crawler road */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[26, 48]} />
        <meshStandardMaterial {...CONCRETE} />
      </mesh>
      <mesh position={[-32, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[40, 6]} />
        <meshStandardMaterial color="#6d737c" roughness={1} />
      </mesh>

      {/* Flame trench: recessed pit + wedge deflector, running east-west */}
      <mesh position={[0, -0.65, 0]}>
        <boxGeometry args={[14, 1.3, 4.4]} />
        <meshStandardMaterial color="#33373d" roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[1.8, 1.8, 4.2]} />
        <meshStandardMaterial color="#4a4f57" roughness={0.9} />
      </mesh>

      {/* Elevated launch table: open frame on four hold-down legs */}
      {[[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]].map(([x, z], i) => (
        <mesh key={i} position={[x, TABLE_H / 2, z]}>
          <boxGeometry args={[0.55, TABLE_H, 0.55]} />
          <meshStandardMaterial {...CONCRETE} />
        </mesh>
      ))}
      {/* Table top is a frame with a central exhaust opening — the engine
          bells hang through it over the trench. */}
      {[
        { pos: [0, TABLE_H - 0.09, 1.75] as const, size: [4.4, 0.18, 0.9] as const },
        { pos: [0, TABLE_H - 0.09, -1.75] as const, size: [4.4, 0.18, 0.9] as const },
        { pos: [1.75, TABLE_H - 0.09, 0] as const, size: [0.9, 0.18, 2.6] as const },
        { pos: [-1.75, TABLE_H - 0.09, 0] as const, size: [0.9, 0.18, 2.6] as const },
      ].map((b, i) => (
        <mesh key={i} position={b.pos as unknown as [number, number, number]}>
          <boxGeometry args={b.size as unknown as [number, number, number]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      ))}

      {/* Fixed service tower with platforms, top crane and red beacon section */}
      <group position={[3.6, 0, 0]}>
        {[[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]].map(([x, z], i) => (
          <mesh key={i} position={[x, 9, z]}>
            <boxGeometry args={[0.22, 18, 0.22]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
        ))}
        {Array.from({ length: 9 }, (_, i) => 2 + i * 1.9).map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[1.2, 0.14, 1.2]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
        ))}
        {[4.5, 8.5, 12.5].map((y) => (
          <mesh key={y} position={[-1.4, y, 0]}>
            <boxGeometry args={[1.9, 0.16, 0.5]} />
            <meshStandardMaterial {...STEEL} />
          </mesh>
        ))}
        {/* Crane boom + red top */}
        <mesh position={[0, 18.2, 0]}>
          <boxGeometry args={[1.1, 0.5, 1.1]} />
          <meshStandardMaterial color="#b8433a" roughness={0.6} />
        </mesh>
        <mesh position={[-1.8, 18.6, 0]} rotation={[0, 0, -0.12]}>
          <boxGeometry args={[4, 0.22, 0.3]} />
          <meshStandardMaterial color="#b8433a" roughness={0.6} />
        </mesh>
      </group>

      {/* Water tower (sound-suppression) — the classic pad landmark */}
      <group position={[-7, 0, 6]}>
        <mesh position={[0, 4, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 8, 12]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[0, 8.8, 0]}>
          <sphereGeometry args={[1.7, 20, 16]} />
          <meshStandardMaterial color="#dfe3e8" roughness={0.4} metalness={0.15} />
        </mesh>
      </group>

      {/* Propellant tank farm, set back from the pad */}
      {[[-12, -6], [-14.5, -3.5], [-12, -1]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 1.6, 0]}>
            <cylinderGeometry args={[1.2, 1.2, 3.2, 18]} />
            <meshStandardMaterial color="#e8e9ea" roughness={0.4} metalness={0.2} />
          </mesh>
          <mesh position={[0, 3.4, 0]}>
            <sphereGeometry args={[1.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#e8e9ea" roughness={0.4} metalness={0.2} />
          </mesh>
        </group>
      ))}
      {/* Bunker */}
      <mesh position={[10, 0.5, -9]}>
        <boxGeometry args={[3, 1, 2]} />
        <meshStandardMaterial {...CONCRETE} />
      </mesh>

      {/* Four tall lightning towers around the pad */}
      {[[-9, 9], [9, -9], [9, 9], [-9, -9]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 8, 0]}>
            <cylinderGeometry args={[0.09, 0.22, 16, 8]} />
            <meshStandardMaterial color="#aab2bc" roughness={0.7} />
          </mesh>
          <mesh position={[0, 16.2, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 1.6, 6]} />
            <meshStandardMaterial color="#d8dce2" roughness={0.5} />
          </mesh>
        </group>
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
      // Steam blasts sideways out of both ends of the flame trench.
      const side = i % 2 === 0 ? 1 : -1;
      spr.position.set(
        side * (2.6 + phase * 6),
        0.3 + phase * 0.9,
        Math.sin(seed.a) * 1.4,
      );
      const sc = 1.6 + phase * 3;
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
  // drei's OrbitControls instance (typed loosely; we only touch target/update).
  const controlsRef = useRef<{ target: THREE.Vector3; update: () => void } | null>(null);
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
    // Near the pad the world moves at TRUE scale (1 unit = 5 m) so clearing
    // the tower LOOKS like clearing the tower; beyond 400 m distance
    // compresses logarithmically so the diorama stays in frame longer.
    if (worldRef.current) {
      const NEAR = 400; // metres of true-scale motion
      const nearOff = Math.min(alt, NEAR) / 5;
      const farOff = alt > NEAR ? Math.log10(1 + (alt - NEAR) / 50) * 30 : 0;
      worldRef.current.position.y = -(nearOff + farOff);
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

    // Broadcast framing: as the vehicle leaves the atmosphere, ease the shot
    // downward so the Earth limb below stays in frame instead of empty sky.
    if (controlsRef.current) {
      const t = Math.min(1, Math.max(0, (alt - 18_000) / 100_000));
      const targetY = 4 - t * 16; // 4 at the pad → -12 in space
      controlsRef.current.target.y += (targetY - controlsRef.current.target.y) * 0.03;
      controlsRef.current.update();
    }
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

      {/* Vehicle stands on the launch table — bells visible above the trench. */}
      <group ref={rocketRef} position={[0, TABLE_H, 0]}>
        <ProceduralRocket3D design={design} />
      </group>

      <group ref={worldRef}>
        <LaunchComplex />
        <LiftoffSmoke />
      </group>

      <group ref={earthRef} visible={false}>
        {/* Terminator matches this scene's own sun (the glare sprite / light). */}
        <Earth radius={EARTH_R} sunDirection={ASCENT_SUN_DIR} />
      </group>

      {/* maxPolarAngle keeps the camera above the horizon — no under-ground views. */}
      <OrbitControls
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={controlsRef as any}
        enablePan
        minDistance={5}
        maxDistance={90}
        target={[0, 6, 0]}
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
  const lowGraphics = useUiStore((s) => s.lowGraphics);
  return (
    <SceneCanvas camera={{ position: [16, 8, 20], fov: 40, far: 30000 }}>
      <SceneContent design={design} cinematic={cinematic} />
      {/* Bloom makes the exhaust plume and sun actually glow. */}
      {!lowGraphics && (
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.75} mipmapBlur />
        </EffectComposer>
      )}
    </SceneCanvas>
  );
}
