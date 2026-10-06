import * as THREE from 'three';

// ═══════════════════════════════════════════════════
// WATER SHADER — extracted from phase2.html lines 396-498
// ═══════════════════════════════════════════════════
// Export: createWater(waterSegments) → { material, mesh }

export function createWater(waterSegments) {
  const waterShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorSurface: { value: new THREE.Color('#e8b0c8') },
      uColorDeep: { value: new THREE.Color('#604070') },
      uFresnelPower: { value: 2.5 },
      uWaveAmp: { value: 0.25 },
      uCameraPos: { value: new THREE.Vector3() },
    },
    vertexShader: /*glsl*/`
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uWaveAmp;
      uniform vec3 uCameraPos;

      // Multi-octave wave displacement
      float wave(vec2 p, float t, float freq, float amp, float speed) {
        return sin(p.x * freq + t * speed) * cos(p.y * freq * 0.7 + t * speed * 1.3) * amp
             + sin(p.y * freq * 1.2 + t * speed * 0.8) * amp * 0.6;
      }

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Multi-frequency wave displacement
        float h = 0.0;
        h += wave(pos.xz, uTime, 0.6, 0.30, 0.5);
        h += wave(pos.xz + 5.0, uTime, 1.2, 0.15, 0.7);
        h += wave(pos.xz - 3.0, uTime, 2.0, 0.08, 1.0);
        pos.y += h * uWaveAmp;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        // Approximate normal from displacement
        float eps = 0.3;
        float hx = h - (wave((pos.xz + vec2(eps, 0.0)), uTime, 0.6, 0.30, 0.5)
                       + wave((pos.xz + vec2(eps, 0.0)) + 5.0, uTime, 1.2, 0.15, 0.7)
                       + wave((pos.xz + vec2(eps, 0.0)) - 3.0, uTime, 2.0, 0.08, 1.0)) * uWaveAmp;
        float hz = h - (wave((pos.xz + vec2(0.0, eps)), uTime, 0.6, 0.30, 0.5)
                       + wave((pos.xz + vec2(0.0, eps)) + 5.0, uTime, 1.2, 0.15, 0.7)
                       + wave((pos.xz + vec2(0.0, eps)) - 3.0, uTime, 2.0, 0.08, 1.0)) * uWaveAmp;
        vec3 approxNormal = normalize(vec3(hx, eps, hz));
        vWorldNormal = normalize(mat3(modelMatrix) * approxNormal);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /*glsl*/`
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      uniform vec3 uColorSurface;
      uniform vec3 uColorDeep;
      uniform float uFresnelPower;
      uniform float uTime;
      uniform vec3 uCameraPos;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(vViewDir);

        // Fresnel
        float fresnel = pow(1.0 - abs(dot(N, V)), uFresnelPower);

        // Specular highlight
        vec3 lightDir = normalize(vec3(2.0, 5.0, -3.0));
        vec3 H = normalize(lightDir + V);
        float spec = pow(max(dot(N, H), 0.0), 256.0) * 0.6;

        // Normal perturbation from small noise
        float n = sin(vUv.x * 40.0 + uTime * 0.8) * cos(vUv.y * 48.0 + uTime * 0.6) * 0.015;
        float spec2 = pow(max(dot(N + n, H), 0.0), 64.0) * 0.25;

        // Color: mix surface pink with deep purple based on view angle
        vec3 baseColor = mix(uColorDeep, uColorSurface, fresnel * 0.7 + 0.3);

        // Add spec
        vec3 color = baseColor + vec3(1.0, 0.85, 0.9) * (spec + spec2) * 0.5;

        // Subtle caustic-like shimmer
        float shimmer = sin(vUv.x * 80.0 + uTime) * cos(vUv.y * 60.0 + uTime * 1.1) * 0.04;
        color += shimmer * fresnel;

        gl_FragColor = vec4(color, 0.85);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  const waterPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 45, waterSegments, waterSegments),
    waterShaderMaterial
  );
  waterPlane.rotation.x = -Math.PI / 2;
  waterPlane.position.y = 0;
  waterPlane.receiveShadow = true;

  return { material: waterShaderMaterial, mesh: waterPlane };
}
