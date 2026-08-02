// Day/night Earth — ported from Satellite-Sim Phase 3's OrbitVisualizer with
// two fixes: the ShaderMaterial is memoized (was rebuilt every render) and the
// sun direction is driven by mission time (was Date.now()).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { OMEGA_EARTH } from '@/sim/constants';

const BASE = import.meta.env.BASE_URL;

export function Earth({
  radius = 1,
  sunDirection,
}: {
  radius?: number;
  /** World-space direction TO the sun; drives the day/night terminator so it
      always agrees with wherever the scene draws its sun. */
  sunDirection?: THREE.Vector3;
}) {
  const [dayMap, nightMap, cloudMap] = useLoader(THREE.TextureLoader, [
    `${BASE}textures/earth_day.jpg`,
    `${BASE}textures/earth_night.jpg`,
    `${BASE}textures/earth_clouds.jpg`,
  ]);

  const earthRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Sharp at oblique angles and correct color: anisotropy + sRGB decode.
  useEffect(() => {
    for (const t of [dayMap, nightMap, cloudMap]) {
      t.anisotropy = 8;
      t.colorSpace = THREE.SRGBColorSpace;
      t.needsUpdate = true;
    }
  }, [dayMap, nightMap, cloudMap]);

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

  // Keep the terminator glued to the scene's sun.
  useEffect(() => {
    if (sunDirection) {
      (shaderMaterial.uniforms.lightDirection.value as THREE.Vector3).copy(sunDirection);
    }
  }, [shaderMaterial, sunDirection]);

  useFrame(({ clock }) => {
    const t = telemetryBus.get()?.t ?? 0;
    // Earth rotates with mission time; the sun stays fixed in inertial space.
    if (earthRef.current) earthRef.current.rotation.y = OMEGA_EARTH * t;
    // Clouds ride with the planet plus a gentle drift of their own — the
    // living-planet touch from the Phase-3 original (real cloud motion would
    // be imperceptible at 1×).
    if (cloudsRef.current)
      cloudsRef.current.rotation.y = OMEGA_EARTH * t * 1.35 + clock.elapsedTime * 0.008;
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[radius, 48, 48]} />
        <primitive object={shaderMaterial} attach="material" />
      </mesh>
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[radius * 1.008, 48, 48]} />
        <meshPhongMaterial map={cloudMap} transparent opacity={0.34} depthWrite={false} />
      </mesh>
      {/* Atmosphere: fresnel rim glow — brightest at the limb, like the real
          scattering halo in orbital photography. */}
      <mesh>
        <sphereGeometry args={[radius * 1.025, 48, 48]} />
        <primitive object={atmosphereMaterial} attach="material" />
      </mesh>
    </group>
  );
}

const atmosphereMaterial = new THREE.ShaderMaterial({
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  side: THREE.FrontSide,
  uniforms: { glowColor: { value: new THREE.Color('#5a8cff') } },
  vertexShader: /* glsl */ `
    varying vec3 vNormal;
    varying vec3 vPosView;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vPosView = mv.xyz;
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform vec3 glowColor;
    varying vec3 vNormal;
    varying vec3 vPosView;
    void main() {
      vec3 viewDir = normalize(-vPosView);
      float rim = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 3.0);
      gl_FragColor = vec4(glowColor, rim * 0.9);
    }
  `,
});
