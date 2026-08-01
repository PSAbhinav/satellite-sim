import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFrame } from '@react-three/fiber';
import { SceneCanvas } from '@/scene/SceneCanvas';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Starfield } from '@/scene/Starfield';
import { CONCEPTS } from '@/content/registry';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';

interface PlanetDef {
  id: string;
  name: string;
  color: string;
  /** Radius relative to Earth (visual, sqrt-compressed later). */
  size: number;
  /** Orbit radius in AU (log-compressed for the scene). */
  au: number;
  /** Orbital period in Earth years (drives relative motion). */
  periodY: number;
  ring?: boolean;
}

const PLANETS: PlanetDef[] = [
  { id: 'planet-mercury', name: 'Mercury', color: '#9c9188', size: 0.38, au: 0.39, periodY: 0.24 },
  { id: 'planet-venus', name: 'Venus', color: '#e8c07a', size: 0.95, au: 0.72, periodY: 0.62 },
  { id: 'planet-earth', name: 'Earth', color: '#4f7be8', size: 1.0, au: 1.0, periodY: 1.0 },
  { id: 'planet-mars', name: 'Mars', color: '#d1603d', size: 0.53, au: 1.52, periodY: 1.88 },
  { id: 'planet-jupiter', name: 'Jupiter', color: '#d8a26a', size: 3.6, au: 5.2, periodY: 11.9 },
  { id: 'planet-saturn', name: 'Saturn', color: '#e5cf9a', size: 3.1, au: 9.5, periodY: 29.5, ring: true },
  { id: 'planet-uranus', name: 'Uranus', color: '#8fd2d8', size: 1.9, au: 19.2, periodY: 84 },
  { id: 'planet-neptune', name: 'Neptune', color: '#4c6fdd', size: 1.85, au: 30.1, periodY: 165 },
];

// Log-compress distances so Neptune fits on screen while order is preserved.
const orbitRadius = (au: number) => 4 + Math.log2(1 + au) * 5.2;
const planetSize = (s: number) => 0.28 + Math.sqrt(s) * 0.32;

function Planet({ def, onSelect }: { def: PlanetDef; onSelect: (id: string) => void }) {
  const ref = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);
  const r = orbitRadius(def.au);
  const size = planetSize(def.size);
  // All planets move at Kepler-relative rates; one Earth year ≈ 60 s on screen.
  const angVel = (2 * Math.PI) / (def.periodY * 60);
  const phase0 = useMemo(() => (def.au * 7.3) % (Math.PI * 2), [def.au]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const a = phase0 + clock.elapsedTime * angVel;
    ref.current.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
  });

  return (
    <>
      {/* Orbit ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r - 0.02, r + 0.02, 128]} />
        <meshBasicMaterial color="#2a3854" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      <group ref={ref}>
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            onSelect(def.id);
          }}
          onPointerOver={() => setHover(true)}
          onPointerOut={() => setHover(false)}
        >
          <sphereGeometry args={[size, 32, 32]} />
          <meshStandardMaterial
            color={def.color}
            emissive={def.color}
            emissiveIntensity={hover ? 0.5 : 0.12}
            roughness={0.7}
          />
        </mesh>
        {def.ring && (
          <mesh rotation={[-Math.PI / 2.6, 0, 0]}>
            <ringGeometry args={[size * 1.4, size * 2.1, 48]} />
            <meshBasicMaterial color="#cbb98a" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        )}
        <Html center distanceFactor={26} style={{ pointerEvents: 'none' }}>
          <div
            className={`font-display text-[11px] uppercase tracking-wider ${
              hover ? 'text-phosphor' : 'text-muted-star'
            }`}
            style={{ transform: `translateY(${-size * 16 - 14}px)`, whiteSpace: 'nowrap' }}
          >
            {def.name}
          </div>
        </Html>
      </group>
    </>
  );
}

function Sun() {
  // Soft radial glow texture — without a map the sprite renders as a square.
  const glow = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,235,190,1)');
    grad.addColorStop(0.35, 'rgba(255,180,90,0.5)');
    grad.addColorStop(1, 'rgba(255,150,60,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.6, 32, 32]} />
        <meshBasicMaterial color="#ffd27a" />
      </mesh>
      <pointLight intensity={220} distance={120} decay={1.6} color="#fff2d5" />
      <sprite scale={[9, 9, 1]}>
        <spriteMaterial
          map={glow}
          transparent
          opacity={0.55}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </sprite>
    </group>
  );
}

export default function SolarSystem() {
  const completed = useMissionStore((s) => s.completedMissions);
  const unlockPedia = useMissionStore((s) => s.unlockPedia);
  const ageLevel = useUiStore((s) => s.ageLevel);
  const [selected, setSelected] = useState<string | null>(null);
  const unlocked = completed.includes('first-orbit');

  // Visiting the map unlocks the planetary Spacepedia entries.
  useEffect(() => {
    if (unlocked) unlockPedia(['solar']);
  }, [unlocked, unlockPedia]);

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md p-16 text-center">
        <Lock className="mx-auto size-10 text-muted-star" />
        <h1 className="mt-4 font-display text-lg font-bold">Solar System — locked</h1>
        <p className="mt-2 text-sm text-muted-star">
          Reach orbit once and the map opens up. The planets aren't going anywhere.
        </p>
        <Button asChild className="mt-6">
          <Link to="/build">Back to the program</Link>
        </Button>
      </div>
    );
  }

  const concept = selected ? CONCEPTS[selected] : null;

  return (
    <div className="relative h-[calc(100vh-3rem)]">
      <SceneCanvas camera={{ position: [0, 26, 34], fov: 50 }} >
        <color attach="background" args={['#04060d']} />
        <ambientLight intensity={0.1} />
        <Starfield count={3000} radius={300} />
        <Sun />
        {PLANETS.map((p) => (
          <Planet key={p.id} def={p} onSelect={setSelected} />
        ))}
        <OrbitControls enablePan minDistance={6} maxDistance={90} />
      </SceneCanvas>

      <div className="pointer-events-none absolute left-3 top-3 rounded-panel border border-line bg-void/80 p-3 backdrop-blur">
        <h1 className="font-display text-sm font-bold text-starlight">Solar System</h1>
        <p className="mt-1 max-w-56 text-[11px] text-muted-star">
          Click a planet for its Spacepedia entry. Left-drag to orbit the camera, right-drag to
          pan, scroll to zoom. Speeds are Kepler-true relative to each other; distances are
          compressed so Neptune fits on your screen.
        </p>
      </div>

      <Dialog open={!!concept} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          {concept && (
            <>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-phosphor">{concept.term}</DialogTitle>
                <Badge variant="ion">{ageLevel}</Badge>
              </div>
              <p className="text-xs italic text-muted-star">{concept.short}</p>
              <p className="mt-3 text-sm leading-relaxed">{concept.levels[ageLevel]}</p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
