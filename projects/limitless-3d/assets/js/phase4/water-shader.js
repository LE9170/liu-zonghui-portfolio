import * as THREE from 'three';

// ═══════════════════════════════════════════════════
// PHASE 4 WATER SHADER — three-tier ocean swell
//
// Layer 1: Main swell  — freq ~0.22, raw amp 0.35, slow
// Layer 2: Cross wave  — freq ~0.45, raw amp 0.14, angled
// Layer 3: Surface chip — freq ~1.0,  raw amp 0.04, detail only
//
// Unified heightAt() → consistent normals (fixed unit mismatch)
// Single uWaveAmp at end: surface ~0.95, underwater ~0.75
// ═══════════════════════════════════════════════════

export function createWater(waterSegments) {
  const waterShaderMaterial = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorSurface: { value: new THREE.Color('#f0b8d0') },
      uColorDeep: { value: new THREE.Color('#604070') },
      uFresnelPower: { value: 2.5 },
      uWaveAmp: { value: 0.95 },
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

      // ── Unified per-layer wave (Gerster-style) ──
      float waveLayer(vec2 p, float t, vec2 dir, float freq, float amp, float speed, float phase) {
        float d = dot(p, dir);
        return sin(d * freq + t * speed + phase) * amp
             + cos(d * freq * 0.7 + t * speed * 1.15) * amp * 0.55;
      }

      // ── Unified height at any point (all 3 layers) ──
      float heightAt(vec2 xz, float t) {
        float h = 0.0;
        // Layer 1: main swell — long wavelength, dominant
        h += waveLayer(xz, t, vec2(0.65, 0.76),  0.22, 0.35, 0.12, 0.0);
        h += waveLayer(xz, t, vec2(-0.55, 0.84), 0.26, 0.28, 0.15, 1.8);
        // Layer 2: cross waves — medium, angled to main
        h += waveLayer(xz, t, vec2(-0.82, 0.57), 0.45, 0.14, 0.22, 0.7);
        h += waveLayer(xz, t, vec2(0.40, 0.92),  0.50, 0.11, 0.19, 2.5);
        // Layer 3: surface chip — high freq, tiny amp, detail only
        h += waveLayer(xz, t, vec2(0.33, 0.94),  0.95, 0.04, 0.32, 3.9);
        h += waveLayer(xz, t, vec2(-0.88, 0.48), 1.10, 0.03, 0.36, 1.1);
        return h;
      }

      void main() {
        vUv = uv;
        vec3 pos = position;

        // ── Compute height at current position ──
        float h0 = heightAt(pos.xz, uTime);

        // ── Apply displacement (single uWaveAmp at the end) ──
        pos.y += h0 * uWaveAmp;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;

        // ── Correct normal via central differences ──
        float eps = 0.25;
        float hx = heightAt(pos.xz + vec2(eps, 0.0), uTime);
        float hz = heightAt(pos.xz + vec2(0.0, eps), uTime);

        // Slope of the displaced surface: dh/dx = (hx-h0)*uWaveAmp/eps
        float slopeX = (hx - h0) * uWaveAmp / eps;
        float slopeZ = (hz - h0) * uWaveAmp / eps;

        vec3 approxNormal = normalize(vec3(-slopeX, 1.0, -slopeZ));
        vWorldNormal = normalize(mat3(modelMatrix) * approxNormal);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        vViewDir = normalize(-mvPosition.xyz);

        // Pass wave height to fragment for color modulation
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
      uniform float uTime;
      uniform vec3 uCameraPos;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(vViewDir);

        // Fresnel: surface-pink ↔ deep-purple
        float fresnel = pow(1.0 - abs(dot(N, V)), uFresnelPower);

        // Specular: one broad band for diffuse sheen, one tight for sun glint
        vec3 lightDir = normalize(vec3(1.5, 4.5, -2.5));
        vec3 H = normalize(lightDir + V);
        float specBroad = pow(max(dot(N, H), 0.0), 28.0) * 0.22;
        float specGlint  = pow(max(dot(N, H), 0.0), 420.0) * 0.40;

        // ── Crest / trough coloring ──
        // vWaveHeight ranges approx -0.45 to +0.45 after uWaveAmp
        float crest = smoothstep(0.05, 0.35, vWaveHeight);       // 0 on troughs, 1 on peaks
        float trough = 1.0 - smoothstep(-0.35, 0.05, vWaveHeight); // 1 in valleys, 0 elsewhere

        // Specular concentrates on crests
        float crestSpec = specGlint * (0.5 + 0.5 * crest);

        // Troughs are darker and deeper purple
        float troughDarken = 1.0 - trough * 0.22;

        // Crests are slightly brighter and pinker
        float crestBrighten = 1.0 + crest * 0.18;
        vec3 crestColor = mix(uColorDeep, uColorSurface, 0.85); // pinker at peaks

        // Subtle shimmer on surface
        float shimmer = sin(vUv.x * 80.0 + uTime * 0.9) * cos(vUv.y * 65.0 + uTime * 1.05) * 0.02;

        // Base color: Fresnel blend, then modulate by height
        vec3 baseColor = mix(uColorDeep, uColorSurface, fresnel * 0.55 + 0.40);
        baseColor = mix(baseColor, crestColor, crest * 0.5);     // pinker at peaks
        baseColor *= crestBrighten * troughDarken;

        // Composite
        vec3 color = baseColor
                   + vec3(1.0, 0.90, 0.94) * specBroad
                   + vec3(1.0, 0.95, 0.97) * crestSpec
                   + shimmer * fresnel;

        float alpha = 0.88;

        gl_FragColor = vec4(color, alpha);
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
