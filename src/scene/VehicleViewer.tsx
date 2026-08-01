// VAB showroom: the player's exact configuration as a slowly turning 3D
// vehicle — swap a part in the catalog and the stack rebuilds instantly.

import { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import type { RocketDesign } from '@/sim/model/rocket';
import { ProceduralRocket3D, stackUnits } from './ProceduralRocket3D';
import { SceneCanvas } from './SceneCanvas';

export function VehicleViewer({ design }: { design: RocketDesign }) {
  // The builder's own height math — keeps the camera fit exact.
  const totalH = useMemo(() => stackUnits(design), [design]);
  const dist = totalH * 1.35 + 2.5;

  return (
    // Remount on size change so the camera refits the new stack.
    <SceneCanvas
      key={totalH.toFixed(2)}
      camera={{ position: [dist * 0.72, totalH * 0.08, dist * 0.7], fov: 40 }}
      style={{ background: 'transparent' }}
    >
      <hemisphereLight args={['#e8eef8', '#1a2233', 0.9]} />
      <directionalLight position={[6, 10, 8]} intensity={2.0} color="#fff4e2" />
      {/* Faint console-teal rim so the hull reads against the dark panel. */}
      <directionalLight position={[-8, 2, -6]} intensity={0.3} color="#5ee6c8" />

      <group position={[0, -totalH / 2, 0]}>
        <ProceduralRocket3D design={design} display />
        {/* Display stand */}
        <mesh position={[0, -0.28, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 48]} />
          <meshStandardMaterial color="#111b30" roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.26, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[2.05, 2.2, 48]} />
          <meshBasicMaterial color="#5ee6c8" transparent opacity={0.35} />
        </mesh>
      </group>

      <OrbitControls
        autoRotate
        autoRotateSpeed={1.1}
        enablePan={false}
        minDistance={3}
        maxDistance={dist * 2}
        maxPolarAngle={Math.PI / 2 + 0.15}
      />
    </SceneCanvas>
  );
}
