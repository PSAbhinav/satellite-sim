// Day/night Earth — ported from Satellite-Sim Phase 3's OrbitVisualizer with
// two fixes: the ShaderMaterial is memoized (was rebuilt every render) and the
// sun direction is driven by mission time (was Date.now()).

import { useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { OMEGA_EARTH } from '@/sim/constants';

const BASE = import.meta.env.BASE_URL;

export function Earth({ radius = 1 }: { radius?: number }) {
  const [dayMap, nightMap, cloudMap] = useLoader(THREE.TextureLoader, [
    `${BASE}textures/earth_day.jpg`,
    `${BASE}textures/earth_night.jpg`,
    `${BASE}textures/earth_clouds.jpg`,
  ]);

  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  const shaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayTexture: { value: dayMap },
          nightTexture: { value: nightMap },
          lightDirection: { value: new THREE.Vector3(1, 0, 0) },
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          void main() {
            vUv = uv;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D dayTexture;
          uniform sampler2D nightTexture;
          uniform vec3 lightDirection;
          varying vec2 vUv;
          varying vec3 vWorldNormal;
          void main() {
            float intensity = clamp(dot(normalize(vWorldNormal), normalize(lightDirection)), 0.0, 1.0);
            // Soften the terminator so cities glow through dusk.
            float blend = smoothstep(-0.08, 0.25, intensity);
            vec4 dayColor = texture2D(dayTexture, vUv);
            vec4 nightColor = texture2D(nightTexture, vUv) * 1.6;
            dayColor.rgb *= 0.9;
            gl_FragColor = mix(nightColor, dayColor, blend);
          }
        `,
      }),
    [dayMap, nightMap],
  );

  useFrame(() => {
    const t = telemetryBus.get()?.t ?? 0;
    // Earth rotates with mission time; the sun stays fixed in inertial space.
    if (earthRef.current) earthRef.current.rotation.y = OMEGA_EARTH * t;
    if (cloudsRef.current) cloudsRef.current.rotation.y = OMEGA_EARTH * t * 1.35;
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[radius, 48, 48]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.008, 48, 48]} />
        <meshPhongMaterial map={cloudMap} transparent opacity={0.28} depthWrite={false} />
      </mesh>
      {/* Thin atmosphere rim */}
      <mesh>
        <sphereGeometry args={[radius * 1.02, 48, 48]} />
        <meshBasicMaterial color="#4f7be8" transparent opacity={0.06} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}
