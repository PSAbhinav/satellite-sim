// The player's rocket, generated from real stage dimensions and liveries:
// Super Heavy is a fat stainless tube with grid fins, Falcon 9 is white with
// a black interstage, SLS is orange foam. 1 scene unit = 5 m.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RocketDesign, StageSpec, StageVisual } from '@/sim/model/rocket';
import { telemetryBus } from '@/sim/runtime/telemetryBus';

const M = 1 / 5; // metres → scene units

// Metalness stays moderate — without an environment map, high-metalness
// surfaces render nearly black.
const HULLS: Record<StageVisual['hull'], { color: string; roughness: number; metalness: number }> = {
  white: { color: '#e9edf4', roughness: 0.45, metalness: 0.1 },
  steel: { color: '#cdd2d9', roughness: 0.35, metalness: 0.45 },
  orange: { color: '#d9822e', roughness: 0.75, metalness: 0.05 },
  black: { color: '#2b2e34', roughness: 0.5, metalness: 0.25 },
  bronze: { color: '#b3906a', roughness: 0.45, metalness: 0.35 },
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

/** Capsules and Starship carry their own nose — no fairing above them. */
const providesNose = (s: StageSpec) => {
  const shape = visualOf(s).shape;
  return shape === 'capsule' || shape === 'starship';
};

/** Total stack height in scene units (stages + fairing when needed). */
export function stackUnits(design: RocketDesign): number {
  const top = design.stages[design.stages.length - 1];
  const fair = providesNose(top) ? 0 : visualOf(top).diameterM * M * 2.6;
  return design.stages.reduce((h, s) => h + stageUnits(s), 0) + fair;
}

/** Smooth ogive nose profile (quarter-cosine), far more rocket-like than a cone. */
function ogiveGeometry(r: number, h: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    pts.push(new THREE.Vector2(Math.max(r * Math.cos((t * Math.PI) / 2), 0.001), t * h));
  }
  return new THREE.LatheGeometry(pts, 28);
}

/** Truncated-cone capsule with a rounded shoulder (Apollo/Orion profile). */
function capsuleGeometry(r: number, h: number): THREE.LatheGeometry {
  const pts = [
    new THREE.Vector2(r, 0),
    new THREE.Vector2(r * 0.98, h * 0.08),
    new THREE.Vector2(r * 0.42, h * 0.85),
    new THREE.Vector2(r * 0.3, h * 0.97),
    new THREE.Vector2(0.001, h),
  ];
  return new THREE.LatheGeometry(pts, 28);
}

function Stage({ s, y }: { s: StageSpec; y: number }) {
  const v = visualOf(s);
  const r = (v.diameterM / 2) * M;
  const h = v.lengthM * M;
  const hull = HULLS[v.hull];
  const bells = Math.min(s.engineCount, 9);
  const bellR = Math.min(r * 0.42, (r * 1.7) / Math.max(1, Math.ceil(Math.sqrt(bells))));

  // ── Capsule spacecraft: service module + capsule + escape tower ──
  if (v.shape === 'capsule') {
    const smH = h * 0.55;
    const capH = h * 0.45;
    const towerH = capH * 1.1;
    return (
      <group name="stage-holder" position={[0, y, 0]}>
        {/* Service module */}
        <mesh position={[0, smH / 2, 0]}>
          <cylinderGeometry args={[r * 0.92, r * 0.92, smH, 28]} />
          <meshStandardMaterial {...hull} />
        </mesh>
        {/* SPS nozzle */}
        <mesh position={[0, -bellR, 0]}>
          <coneGeometry args={[bellR * 0.9, bellR * 2, 14, 1, true]} />
          <meshStandardMaterial color="#3a4048" roughness={0.35} metalness={0.75} side={THREE.DoubleSide} />
        </mesh>
        {/* Capsule (rounded truncated cone) */}
        <mesh position={[0, smH, 0]} geometry={capsuleGeometry(r * 0.92, capH)}>
          <meshStandardMaterial color="#c4c9d1" roughness={0.3} metalness={0.5} />
        </mesh>
        {/* Heat shield lip */}
        <mesh position={[0, smH + 0.01, 0]}>
          <cylinderGeometry args={[r * 0.95, r * 0.9, 0.05, 28]} />
          <meshStandardMaterial color="#5a4632" roughness={0.8} />
        </mesh>
        {/* Launch escape tower */}
        <mesh position={[0, smH + capH + towerH / 2, 0]}>
          <cylinderGeometry args={[r * 0.05, r * 0.05, towerH, 10]} />
          <meshStandardMaterial color="#d8dce2" roughness={0.5} />
        </mesh>
        <mesh position={[0, smH + capH + towerH + r * 0.14, 0]}>
          <coneGeometry args={[r * 0.12, r * 0.4, 12]} />
          <meshStandardMaterial color="#c8433a" roughness={0.6} />
        </mesh>
      </group>
    );
  }

  // ── Starship: body + ogive nose + fore/aft flaps ──
  if (v.shape === 'starship') {
    const bodyH = h * 0.7;
    const noseH = h * 0.3;
    const flap = (fy: number, fh: number) =>
      [-1, 1].map((side) => (
        <mesh key={side + fy} position={[side * (r + 0.03), fy, 0]}>
          <boxGeometry args={[0.08, fh, r * 1.1]} />
          <meshStandardMaterial color="#33373d" roughness={0.5} metalness={0.6} />
        </mesh>
      ));
    return (
      <group name="stage-holder" position={[0, y, 0]}>
        <mesh position={[0, bodyH / 2, 0]}>
          <cylinderGeometry args={[r, r, bodyH, 28]} />
          <meshStandardMaterial {...hull} />
        </mesh>
        <mesh position={[0, bodyH, 0]} geometry={ogiveGeometry(r, noseH)}>
          <meshStandardMaterial {...hull} />
        </mesh>
        {/* Aft + forward flaps */}
        {flap(bodyH * 0.14, bodyH * 0.28)}
        {flap(bodyH + noseH * 0.25, noseH * 0.5)}
        {/* Raptor bells */}
        {Array.from({ length: bells }).map((_, e) => {
          const ring = bells > 1 ? r * 0.5 : 0;
          const a = (e / Math.max(bells, 1)) * Math.PI * 2;
          return (
            <mesh key={e} position={[Math.cos(a) * ring, -bellR * 0.9, Math.sin(a) * ring]}>
              <coneGeometry args={[bellR, bellR * 2.2, 14, 1, true]} />
              <meshStandardMaterial color="#3a4048" roughness={0.35} metalness={0.75} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      </group>
    );
  }

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
  const top = design.stages[design.stages.length - 1];
  const topStage = visualOf(top);
  const fairR = (topStage.diameterM / 2) * M;
  const fairH = fairR * 2 * 2.6;
  const showFairing = !providesNose(top);

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
      const sideBoosters = groupRef.current.getObjectByName('side-boosters');
      if (sideBoosters) {
        sideBoosters.visible = snap.boosterFuelFrac !== undefined;
        // Strap-ons fire with the core: each carries its own plume, breathing
        // like the core's and gone the instant the casings drop.
        const bOn = snap.boosterFuelFrac !== undefined && snap.thrust > 0;
        sideBoosters.traverse((o) => {
          if (o.name === 'bplume') {
            o.visible = bOn;
            if (bOn) o.scale.set(1, 1.15 + (snap.thrust / 8e6) * 1.5 + Math.random() * 0.3, 1);
          }
        });
      }
    }
  });

  const bv = design.boosters ? visualOf(design.boosters.spec) : null;
  const coreR = (s0.diameterM / 2) * M;

  return (
    <group ref={groupRef}>
      {design.stages.map((s, i) => (
        <group key={s.id + i} name={`stage-${i}`}>
          <Stage s={s} y={layout.ys[i]} />
        </group>
      ))}
      {/* Strap-on side boosters around the core */}
      {design.boosters && bv && (
        <group name="side-boosters">
          {Array.from({ length: design.boosters.count }).map((_, i) => {
            const a = (i / design.boosters!.count) * Math.PI * 2;
            const br = (bv.diameterM / 2) * M;
            const bh = bv.lengthM * M;
            const off = coreR + br + 0.02;
            return (
              <group key={i} position={[Math.cos(a) * off, 0, Math.sin(a) * off]}>
                <mesh position={[0, bh / 2, 0]}>
                  <cylinderGeometry args={[br, br, bh, 20]} />
                  <meshStandardMaterial {...HULLS[bv.hull]} />
                </mesh>
                <mesh position={[0, bh, 0]} geometry={ogiveGeometry(br, br * 2.2)}>
                  <meshStandardMaterial {...HULLS[bv.hull]} />
                </mesh>
                <mesh position={[0, -br * 0.8, 0]}>
                  <coneGeometry args={[br * 0.55, br * 1.4, 12, 1, true]} />
                  <meshStandardMaterial color="#3a4048" roughness={0.35} metalness={0.6} side={THREE.DoubleSide} />
                </mesh>
                <mesh name="bplume" position={[0, -br * 1.5 - 0.7, 0]} visible={false}>
                  <coneGeometry args={[br * 0.7, 1.5, 12, 1, true]} />
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
          })}
        </group>
      )}
      {/* Fairing: smooth ogive sized to the top stage — omitted when the top
          stage is a spacecraft with its own nose. */}
      {showFairing && (
        <group name="fairing" position={[0, layout.top, 0]}>
          <mesh geometry={ogiveGeometry(fairR, fairH)}>
            <meshStandardMaterial color="#e9edf4" roughness={0.45} metalness={0.15} />
          </mesh>
        </group>
      )}
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
