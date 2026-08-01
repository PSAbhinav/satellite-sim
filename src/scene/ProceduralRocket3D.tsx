// The player's rocket, generated from their stage config: tank length tracks
// propellant mass, bell count tracks engine count. A few hundred triangles.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RocketDesign } from '@/sim/model/rocket';
import { telemetryBus } from '@/sim/runtime/telemetryBus';

export function ProceduralRocket3D({
  design,
  display = false,
}: {
  design: RocketDesign;
  /** Showroom mode: ignore telemetry — full stack, fairing on, engines off. */
  display?: boolean;
}) {
  const plumeRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const stageHeights = design.stages.map((s) => Math.max(1.4, 0.8 * Math.cbrt(s.propMass / 1000)));
  const R = 0.35;

  useFrame(() => {
    if (display) return;
    const snap = telemetryBus.get();
    if (!snap) return;
    // Flame length breathes with thrust and rides at the bottom of whichever
    // stage is currently burning.
    if (plumeRef.current) {
      const on = snap.thrust > 0;
      plumeRef.current.visible = on;
      if (on) {
        const len = 1.2 + (snap.thrust / 8e6) * 2.5 + Math.random() * 0.25;
        plumeRef.current.scale.set(1, len, 1);
        let bottom = 0;
        for (let i = 0; i < snap.activeStage && i < stageHeights.length; i++)
          bottom += stageHeights[i];
        plumeRef.current.position.y = bottom - 0.9 * len * 0.5 - 0.35;
      }
    }
    // Hide spent stages as they separate.
    if (groupRef.current) {
      design.stages.forEach((_, i) => {
        const mesh = groupRef.current!.getObjectByName(`stage-${i}`);
        if (mesh) mesh.visible = i >= snap.activeStage;
      });
      const fairing = groupRef.current.getObjectByName('fairing');
      if (fairing) fairing.visible = snap.fairingOn;
    }
  });

  let y = 0;
  const stages = design.stages.map((s, i) => {
    const h = stageHeights[i];
    const el = (
      <group key={s.id + i} name={`stage-${i}`} position={[0, y + h / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[R, R, h, 20]} />
          <meshStandardMaterial color={i === 0 ? '#d8dde8' : '#c2c9d8'} roughness={0.55} metalness={0.25} />
        </mesh>
        {/* Engine bells */}
        {Array.from({ length: Math.min(s.engineCount, 9) }).map((_, e) => {
          const n = Math.min(s.engineCount, 9);
          const ring = n > 1 ? R * 0.55 : 0;
          const ang = (e / Math.max(n - (n > 1 ? 1 : 0), 1)) * Math.PI * 2;
          const bx = n > 1 && e > 0 ? Math.cos(ang) * ring : 0;
          const bz = n > 1 && e > 0 ? Math.sin(ang) * ring : 0;
          return (
            <mesh key={e} position={[bx, -h / 2 - 0.12, bz]}>
              <coneGeometry args={[0.09, 0.28, 12, 1, true]} />
              <meshStandardMaterial color="#3a4358" roughness={0.4} metalness={0.7} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>
    );
    y += h;
    return el;
  });

  const fairingH = 1.1;

  return (
    <group ref={groupRef}>
      {stages}
      {/* Fairing (nose) */}
      <group name="fairing" position={[0, y + fairingH / 2, 0]}>
        <mesh>
          <coneGeometry args={[R, fairingH, 20]} />
          <meshStandardMaterial color="#e8edf7" roughness={0.5} metalness={0.15} />
        </mesh>
      </group>
      {/* Exhaust plume */}
      <mesh ref={plumeRef} position={[0, -0.9, 0]} visible={false}>
        <coneGeometry args={[0.22, 1.6, 14, 1, true]} />
        <meshBasicMaterial
          color="#ffb347"
          transparent
          opacity={0.85}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
