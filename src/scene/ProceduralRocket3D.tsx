// The player's rocket, generated from real stage dimensions and liveries:
// Super Heavy is a fat stainless tube with grid fins, Falcon 9 is white with
// a black interstage, SLS is orange foam. 1 scene unit = 5 m.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RocketDesign, StageSpec, StageVisual } from '@/sim/model/rocket';
import { telemetryBus } from '@/sim/runtime/telemetryBus';

const M = 1 / 5; // metres → scene units

const HULLS: Record<StageVisual['hull'], { color: string; roughness: number; metalness: number }> = {
  white: { color: '#e9edf4', roughness: 0.45, metalness: 0.15 },
  steel: { color: '#b9bec6', roughness: 0.25, metalness: 0.85 },
  orange: { color: '#d9822e', roughness: 0.75, metalness: 0.05 },
  black: { color: '#22252b', roughness: 0.5, metalness: 0.4 },
  bronze: { color: '#b3906a', roughness: 0.45, metalness: 0.55 },
};

/** Fallback for stages without visual data — estimated from propellant load. */
export function visualOf(s: StageSpec): StageVisual {
  return (
    s.visual ?? {
      diameterM: 2 + Math.cbrt(s.propMass / 1000) * 0.35,
      lengthM: 8 + Math.cbrt(s.propMass / 1000) * 4,
      hull: 'white',
    }
  );
}

export const stageUnits = (s: StageSpec) => visualOf(s).lengthM * M;

/** Total stack height in scene units (stages + fairing). */
export function stackUnits(design: RocketDesign): number {
  const topDia = visualOf(design.stages[design.stages.length - 1]).diameterM * M;
  return design.stages.reduce((h, s) => h + stageUnits(s), 0) + topDia * 3.2;
}

function Stage({ s, y }: { s: StageSpec; y: number }) {
  const v = visualOf(s);
  const r = (v.diameterM / 2) * M;
  const h = v.lengthM * M;
  const hull = HULLS[v.hull];
  const bells = Math.min(s.engineCount, 9);
  const bellR = Math.min(r * 0.42, (r * 1.7) / Math.max(1, Math.ceil(Math.sqrt(bells))));

  return (
    <group name={`stage-holder`} position={[0, y + h / 2, 0]}>
      <mesh>
        <cylinderGeometry args={[r, r, h, 28]} />
        <meshStandardMaterial {...hull} />
      </mesh>
      {/* Falcon-style dark interstage band */}
      {v.interstage && (
        <mesh position={[0, h / 2 - h * 0.045, 0]}>
          <cylinderGeometry args={[r * 1.004, r * 1.004, h * 0.09, 28]} />
          <meshStandardMaterial color="#191c21" roughness={0.6} metalness={0.3} />
        </mesh>
      )}
      {/* Grid fins near the top */}
      {v.gridFins &&
        [0, 1, 2, 3].map((i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * (r + 0.06), h / 2 - h * 0.12, Math.sin(a) * (r + 0.06)]}
              rotation={[0, -a, 0]}
            >
              <boxGeometry args={[0.06, r * 0.75, r * 0.55]} />
              <meshStandardMaterial color="#3c4148" roughness={0.55} metalness={0.6} />
            </mesh>
          );
        })}
      {/* Engine skirt + bells */}
      <mesh position={[0, -h / 2 + h * 0.02, 0]}>
        <cylinderGeometry args={[r * 1.01, r * 1.03, h * 0.05, 28]} />
        <meshStandardMaterial color="#2b2f36" roughness={0.6} metalness={0.5} />
      </mesh>
      {Array.from({ length: bells }).map((_, e) => {
        const ring = bells > 1 ? r * 0.55 : 0;
        const a = (e / Math.max(bells - (bells > 1 ? 1 : 0), 1)) * Math.PI * 2;
        const bx = bells > 1 && e > 0 ? Math.cos(a) * ring : 0;
        const bz = bells > 1 && e > 0 ? Math.sin(a) * ring : 0;
        return (
          <mesh key={e} position={[bx, -h / 2 - bellR * 0.9, bz]}>
            <coneGeometry args={[bellR, bellR * 2.2, 14, 1, true]} />
            <meshStandardMaterial
              color="#3a4048"
              roughness={0.35}
              metalness={0.75}
              side={THREE.DoubleSide}
            />
          </mesh>
        );
      })}
    </group>
  );
}

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

  const layout = useMemo(() => {
    let y = 0;
    const ys = design.stages.map((s) => {
      const at = y;
      y += stageUnits(s);
      return at;
    });
    return { ys, top: y };
  }, [design]);

  const s0 = visualOf(design.stages[0]);
  const topStage = visualOf(design.stages[design.stages.length - 1]);
  const fairR = (topStage.diameterM / 2) * M;
  const fairH = fairR * 2 * 3.2;

  useFrame(() => {
    if (display) return;
    const snap = telemetryBus.get();
    if (!snap) return;
    // Flame breathes with thrust, at the bottom of the burning stage.
    if (plumeRef.current) {
      const on = snap.thrust > 0;
      plumeRef.current.visible = on;
      if (on) {
        const len = 1.2 + (snap.thrust / 8e6) * 2.5 + Math.random() * 0.25;
        plumeRef.current.scale.set(1, len, 1);
        const bottom = layout.ys[Math.min(snap.activeStage, layout.ys.length - 1)];
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

  return (
    <group ref={groupRef}>
      {design.stages.map((s, i) => (
        <group key={s.id + i} name={`stage-${i}`}>
          <Stage s={s} y={layout.ys[i]} />
        </group>
      ))}
      {/* Fairing: ogive nose sized to the top stage's diameter */}
      <group name="fairing" position={[0, layout.top + fairH / 2, 0]}>
        <mesh>
          <coneGeometry args={[fairR, fairH, 28]} />
          <meshStandardMaterial color="#e9edf4" roughness={0.45} metalness={0.15} />
        </mesh>
      </group>
      {/* Exhaust plume */}
      <mesh ref={plumeRef} position={[0, -0.9, 0]} visible={false}>
        <coneGeometry args={[(s0.diameterM / 2) * M * 0.7, 1.6, 14, 1, true]} />
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
