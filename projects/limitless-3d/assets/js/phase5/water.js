import * as THREE from 'three';

// ═══════════════════════════════════════════════════
// PHASE 5 WATER SHADER — three-tier ocean swell
// (Own copy of the phase4 water — phase4 files are read-only for us.
//  Contrast-tuned: deeper troughs, brighter moving crests, stronger shimmer.)
//
// Layer 1: Main swell  — freq ~0.22, raw amp 0.35, slow
// Layer 2: Cross wave  — freq ~0.45, raw amp 0.14, angled
// Layer 3: Surface chip — freq ~1.0,  raw amp 0.04, detail only
// ═══════════════════════════════════════════════════

export function createWater(waterSegments) {
  const waterShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorSurface: { value: new THREE.Color('#e9a6c6') },
      uColorDeep: { value: new THREE.Color('#3a2450') },
      uFresnelPower: { value: 3.2 },
      uWaveAmp: { value: 0.95 },
      uBrightness: { value: 1.0 }, // p5p: opening scene dims the whole sea
      uCameraPos: { value: new THREE.Vector3() },
    },
    vertexShader: /*glsl*/`
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      varying float vWaveHeight;
      uniform float uTime;
      uniform float uWaveAmp;
      uniform vec3 uCameraPos;

      float waveLayer(vec2 p, float t, vec2 dir, float freq, float amp, float speed, float phase) {
        float d = dot(p, dir);
        return sin(d * freq + t * speed + phase) * amp
             + cos(d * freq * 0.7 + t * speed * 1.15) * amp * 0.55;
      }

      float heightAt(vec2 xz, float t) {
        float h = 0.0;
        h += waveLayer(xz, t, vec2(0.65, 0.76),  0.22, 0.35, 0.12, 0.0);
        h += waveLayer(xz, t, vec2(-0.55, 0.84), 0.26, 0.28, 0.15, 1.8);
        h += waveLayer(xz, t, vec2(-0.82, 0.57), 0.45, 0.14, 0.22, 0.7);
        h += waveLayer(xz, t, vec2(0.40, 0.92),  0.50, 0.11, 0.19, 2.5);
        h += waveLayer(xz, t, vec2(0.33, 0.94),  0.95, 0.04, 0.32, 3.9);
        h += waveLayer(xz, t, vec2(-0.88, 0.48), 1.10, 0.03, 0.36, 1.1);
        return h;
      }

      void main() {
        vUv = uv;
        vec3 pos = position;
        float h0 = heightAt(pos.xz, uTime);
        pos.y += h0 * uWaveAmp;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        float eps = 0.25;
        float hx = heightAt(pos.xz + vec2(eps, 0.0), uTime);
        float hz = heightAt(pos.xz + vec2(0.0, eps), uTime);
        float slopeX = (hx - h0) * uWaveAmp / eps;
        float slopeZ = (hz - h0) * uWaveAmp / eps;

        vec3 approxNormal = normalize(vec3(-slopeX, 1.0, -slopeZ));
        vWorldNormal = normalize(mat3(modelMatrix) * approxNormal);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        vWaveHeight = h0 * uWaveAmp;

        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /*glsl*/`
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying vec3 vViewDir;
      varying vec2 vUv;
      varying float vWaveHeight;
      uniform vec3 uColorSurface;
      uniform vec3 uColorDeep;
      uniform float uFresnelPower;
      uniform float uBrightness;
      uniform float uTime;
      uniform vec3 uCameraPos;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(vViewDir);

        float fresnel = pow(1.0 - abs(dot(N, V)), uFresnelPower);

        vec3 lightDir = normalize(vec3(1.5, 4.5, -2.5));
        vec3 H = normalize(lightDir + V);
        float specBroad = pow(max(dot(N, H), 0.0), 28.0) * 0.22;
        float specGlint  = pow(max(dot(N, H), 0.0), 420.0) * 0.40;

        // Crest / trough coloring — widened contrast so swells read at grazing angles
        float crest = smoothstep(-0.05, 0.40, vWaveHeight);
        float trough = 1.0 - smoothstep(-0.40, 0.05, vWaveHeight);

        float crestSpec = specGlint * (0.4 + 0.6 * crest);
        float troughDarken = 1.0 - trough * 0.42;
        float crestBrighten = 1.0 + crest * 0.15;
        vec3 crestColor = mix(uColorSurface, vec3(1.0, 0.97, 0.99), 0.22);

        // Slope shading — swell faces toward the light brighten, backs darken
        float ndl = max(dot(N, normalize(vec3(0.30, 0.88, -0.35))), 0.0);

        // Travelling shimmer bands (tied to wave phase, not uniform flicker)
        float shimmer = sin(vUv.x * 80.0 + uTime * 0.9) * cos(vUv.y * 65.0 + uTime * 1.05) * 0.045;
        float streak = sin(vWorldPos.x * 2.2 + vWorldPos.z * 1.4 + uTime * 0.35) * 0.03;

        // Height-driven mix: troughs sink to deep purple, crests rise to pale pink.
        // Fresnel kept low so grazing angles still read crest/trough bands —
        // a high fresnel weight flattens the whole sea to uniform pale pink.
        vec3 baseColor = mix(uColorDeep, uColorSurface, clamp(crest * 0.72 + fresnel * 0.12 + 0.02, 0.0, 1.0));
        baseColor = mix(baseColor, crestColor, crest * 0.55);
        baseColor *= crestBrighten * troughDarken * (0.80 + 0.28 * ndl);

        vec3 color = baseColor
                   + vec3(1.0, 0.90, 0.94) * specBroad
                   + vec3(1.0, 0.95, 0.97) * crestSpec
                   + (shimmer + streak) * fresnel;

        float alpha = 0.88;
        gl_FragColor = vec4(color * uBrightness, alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });

  // ★ Rotate the GEOMETRY flat (not the mesh) so the vertex shader's local
  // pos.xz spans the sea and pos.y is world-up. (Mesh-level rotation would
  // leave local z=0 for every vertex — waves collapse to 1D streaks and the
  // displacement goes sideways. Latent bug in the phase4 original.)
  const waterGeo = new THREE.PlaneGeometry(45, 45, waterSegments, waterSegments);
  waterGeo.rotateX(-Math.PI / 2);
  const waterPlane = new THREE.Mesh(waterGeo, waterShaderMaterial);
  waterPlane.position.y = 0;
  waterPlane.receiveShadow = true;

  return { material: waterShaderMaterial, mesh: waterPlane };
}
