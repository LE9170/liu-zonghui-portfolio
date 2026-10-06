import * as THREE from 'three';

/**
 * Phase 4 Particle Cloud Hero
 *
 * Replaces solid rocks/product geometry with an organic particle cloud:
 * - ~15k particles forming a brain-like lumpy shape via multi-lobe noise
 * - Triangle-outline + glowing-dot fragments via custom ShaderMaterial
 * - Ambient breathing/flow/surface-drift animation
 * - Mouse-driven local turbulence (repulsion + curl, spring-damped)
 * - Scroll-driven layer-by-layer scatter (deterministic, reversible)
 *
 * Colors: white, gold (#c8a850), purple (#8060c0), cyan (#40a0a0), pink (#d08090)
 */

// ═══════════════════════════════════════════════════
// PARTICLE DATA GENERATION
// ═══════════════════════════════════════════════════

/** Simple 3D value noise using sin-based hash */
function hash31(p) {
  const n = Math.sin(p * 127.1 + 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function noise3D(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3.0 - 2.0 * fx);
  const sy = fy * fy * (3.0 - 2.0 * fy);
  const sz = fz * fz * (3.0 - 2.0 * fz);

  const n000 = hash31(ix * 127 + iy * 311 + iz * 73);
  const n100 = hash31((ix + 1) * 127 + iy * 311 + iz * 73);
  const n010 = hash31(ix * 127 + (iy + 1) * 311 + iz * 73);
  const n110 = hash31((ix + 1) * 127 + (iy + 1) * 311 + iz * 73);
  const n001 = hash31(ix * 127 + iy * 311 + (iz + 1) * 73);
  const n101 = hash31((ix + 1) * 127 + iy * 311 + (iz + 1) * 73);
  const n011 = hash31(ix * 127 + (iy + 1) * 311 + (iz + 1) * 73);
  const n111 = hash31((ix + 1) * 127 + (iy + 1) * 311 + (iz + 1) * 73);

  const nx00 = n000 + (n100 - n000) * sx;
  const nx10 = n010 + (n110 - n010) * sx;
  const nx01 = n001 + (n101 - n001) * sx;
  const nx11 = n011 + (n111 - n011) * sx;

  const nxy0 = nx00 + (nx10 - nx00) * sy;
  const nxy1 = nx01 + (nx11 - nx01) * sy;

  return nxy0 + (nxy1 - nxy0) * sz;
}

function fbm(x, y, z, octaves = 3) {
  let val = 0, amp = 0.5, freq = 1.0, total = 0;
  for (let i = 0; i < octaves; i++) {
    val += noise3D(x * freq, y * freq, z * freq) * amp;
    total += amp;
    amp *= 0.5;
    freq *= 2.0;
  }
  return val / total;
}

/**
 * Multi-lobe density field — organic cloud shape
 * Uses 4 overlapping ellipsoids of different sizes/positions + fbm noise
 */
function densityField(x, y, z) {
  // Primary lobe (center)
  const d1 = (x * x) / 1.6 + (y * y) / 1.0 + (z * z) / 1.4;
  // Upper-left protrusion
  const d2 = ((x + 0.5) * (x + 0.5)) / 0.6 + ((y - 0.35) * (y - 0.35)) / 0.4 + (z * z) / 0.5;
  // Right lobe
  const d3 = ((x - 0.6) * (x - 0.6)) / 0.5 + ((y + 0.1) * (y + 0.1)) / 0.5 + ((z - 0.2) * (z - 0.2)) / 0.5;
  // Lower lobe
  const d4 = (x * x) / 0.7 + ((y + 0.5) * (y + 0.5)) / 0.5 + ((z + 0.1) * (z + 0.1)) / 0.6;

  // Take minimum distance to any lobe (union of ellipsoids)
  const combined = Math.min(d1, Math.min(d2, Math.min(d3, d4)));

  // Add fbm noise for organic surface detail
  const n = fbm(x * 2.5, y * 2.5, z * 2.5, 3) * 0.35;

  return combined - 0.22 + n;
}

/**
 * Pick a color from the palette based on position and noise
 */
const PALETTE = [
  new THREE.Color('#faf6f0'), // white
  new THREE.Color('#f0e8d0'), // warm white
  new THREE.Color('#e0d0a8'), // muted gold
  new THREE.Color('#d8b860'), // gold
  new THREE.Color('#a888e0'), // purple
  new THREE.Color('#c098e8'), // light purple
  new THREE.Color('#50b8c0'), // cyan
  new THREE.Color('#78d0c8'), // light cyan
  new THREE.Color('#e898a8'), // pink
  new THREE.Color('#f0d8e0'), // light pink
];

function pickColor(x, y, z, rng) {
  const n = fbm(x * 1.5 + 5.0, y * 1.5 + 5.0, z * 1.5 + 5.0, 2);
  const idx = Math.floor(((n * 0.5 + 0.5) * PALETTE.length + rng * 2) % PALETTE.length);
  return PALETTE[Math.min(idx, PALETTE.length - 1)];
}

// ═══════════════════════════════════════════════════
// CUSTOM SHADER MATERIAL
// ═══════════════════════════════════════════════════

const vertexShader = /*glsl*/`
  attribute vec3 aBasePos;
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aRotation;
  attribute float aType;       // 0=dot, 1=triangle outline, 2=triangle fill
  attribute vec3 aScatterDir;
  attribute float aScatterDelay;
  attribute float aNoiseSeed;
  attribute float aBrightness; // mouse-driven brightness boost

  varying vec3 vColor;
  varying float vType;
  varying float vRotation;
  varying float vBrightness;
  varying float vDistToCenter;
  varying float vNearFade;

  uniform float uTime;
  uniform float uScatterProgress;
  uniform vec3 uMouseWorld;
  uniform float uMouseStrength;
  uniform float uMouseRadius;
  uniform float uPointSize;

  // ── Ambient noise displacement ──
  float hash(float n) { return fract(sin(n) * 43758.5453123); }
  float noise3d(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i.x+i.y*127.0+i.z*311.0), hash(i.x+1.0+i.y*127.0+i.z*311.0), f.x),
          mix(hash(i.x+(i.y+1.0)*127.0+i.z*311.0), hash(i.x+1.0+(i.y+1.0)*127.0+i.z*311.0), f.x), f.y),
      mix(mix(hash(i.x+i.y*127.0+(i.z+1.0)*311.0), hash(i.x+1.0+i.y*127.0+(i.z+1.0)*311.0), f.x),
          mix(hash(i.x+(i.y+1.0)*127.0+(i.z+1.0)*311.0), hash(i.x+1.0+(i.y+1.0)*127.0+(i.z+1.0)*311.0), f.x), f.y), f.z
    );
  }

  void main() {
    vec3 pos = aBasePos;
    vBrightness = 0.0;
    vNearFade = 1.0;

    // ── 1. Ambient breathing + flow ──
    float breath = sin(uTime * 0.6 + aNoiseSeed * 6.28) * 0.08;
    float flowX = sin(uTime * 0.4 + aBasePos.y * 3.0 + aNoiseSeed) * 0.06;
    float flowY = cos(uTime * 0.45 + aBasePos.x * 2.5 + aNoiseSeed * 1.3) * 0.05;
    float flowZ = sin(uTime * 0.35 + aBasePos.z * 2.8 + aNoiseSeed * 0.7) * 0.05;
    float noiseDisp = noise3d(aBasePos * 2.0 + uTime * 0.3) * 0.07;

    // Guard normalize: use safe up-vector when aBasePos is at origin
    vec3 baseDir = length(aBasePos) < 0.0001 ? vec3(0.0, 1.0, 0.0) : normalize(aBasePos);
    pos.x += flowX + breath * baseDir.x * 0.5 + noiseDisp * (noise3d(aBasePos * 3.0 + 1.0) - 0.5);
    pos.y += flowY + breath * 0.6;
    pos.z += flowZ + noiseDisp * (noise3d(aBasePos * 3.0 + 2.0) - 0.5);

    // ── 2. Mouse turbulence ──
    float mouseDist = distance(aBasePos, uMouseWorld);
    float mouseInfluence = 1.0 - smoothstep(0.0, uMouseRadius, mouseDist);
    mouseInfluence *= uMouseStrength;

    if (mouseInfluence > 0.001) {
      vec3 toMouse = aBasePos - uMouseWorld;
      vec3 toBase = length(toMouse) < 0.0001 ? vec3(0.0, 1.0, 0.0) : normalize(toMouse);
      // Center repulsion (push outward from mouse) — gentler
      float repulse = mouseInfluence * 0.18;
      pos += toBase * repulse;

      // Tangential curl (swirl around mouse point) — reduced
      vec3 up = vec3(0.0, 1.0, 0.0);
      vec3 tangent = cross(toBase, up);
      float tanLen = length(tangent);
      if (tanLen < 0.0001) {
        tangent = cross(toBase, vec3(1.0, 0.0, 0.0));
        tanLen = length(tangent);
      }
      tangent = tanLen < 0.0001 ? vec3(1.0, 0.0, 0.0) : tangent / tanLen;
      vec3 bitangent = cross(toBase, tangent);
      float curl = mouseInfluence * 0.12;
      float curlAngle = uTime * 2.5 + aNoiseSeed * 10.0;
      pos += tangent * cos(curlAngle) * curl + bitangent * sin(curlAngle) * curl;

      // Perpendicular flutter — gentler
      pos += tangent * sin(aNoiseSeed * 20.0 + uTime * 3.0) * mouseInfluence * 0.04;
      pos += bitangent * cos(aNoiseSeed * 25.0 + uTime * 2.5) * mouseInfluence * 0.04;
    }

    // Brightness boost for mouse (passed to fragment) — capped
    vBrightness = mouseInfluence * 0.45;

    // ── 3. Scroll scatter (more X/Y spread, less toward camera) ──
    float scatterAmount = smoothstep(aScatterDelay, aScatterDelay + 0.35, uScatterProgress);
    // Scatter target: outward + lateral spread, limited Z toward camera
    vec3 scatterTarget = aBasePos + aScatterDir * 3.8;
    // Reduce Z component to avoid particles flying toward camera
    scatterTarget.z = aBasePos.z + aScatterDir.z * 2.0;
    pos = mix(pos, scatterTarget, scatterAmount);

    // Reduce mouse influence during scatter
    pos = mix(pos, mix(pos, scatterTarget, 1.0), scatterAmount * 0.7);

    vDistToCenter = length(aBasePos) / 2.5;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Point size: moderate mouse boost, modest scatter shrink, floor + ceiling
    float sizeBoost = 1.0 + vBrightness * 1.4;
    float scatterShrink = 1.0 - scatterAmount * 0.55;
    float depth = max(-mvPosition.z, 0.5);
    float baseSize = uPointSize * aSize * sizeBoost * scatterShrink * (140.0 / depth);
    // Fade particles approaching camera near plane (affects both brightness and alpha)
    float nearFade = smoothstep(0.5, 1.8, depth);
    vBrightness *= nearFade;
    vNearFade = nearFade;
    gl_PointSize = clamp(baseSize, 2.0, 22.0);

    vColor = aColor;
    vType = aType;
    vRotation = aRotation + uTime * 0.15;
  }
`;

const fragmentShader = /*glsl*/`
  varying vec3 vColor;
  varying float vType;
  varying float vRotation;
  varying float vBrightness;
  varying float vDistToCenter;
  varying float vNearFade;

  // Rotate 2D point around center
  vec2 rotate(vec2 uv, float angle) {
    float s = sin(angle), c = cos(angle);
    vec2 centered = uv - 0.5;
    return vec2(centered.x * c - centered.y * s, centered.y * c + centered.x * s) + 0.5;
  }

  // Signed distance to line segment
  float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  void main() {
    vec2 uv = rotate(gl_PointCoord, vRotation);

    // ── Triangle shape ──
    vec2 a = vec2(0.5, 0.88);
    vec2 b = vec2(0.08, 0.18);
    vec2 c = vec2(0.92, 0.18);

    float d1 = sdSegment(uv, a, b);
    float d2 = sdSegment(uv, b, c);
    float d3 = sdSegment(uv, c, a);
    float minEdge = min(min(d1, d2), d3);

    // Check if inside triangle (barycentric)
    float denom = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
    float ba = ((b.y - c.y) * (uv.x - c.x) + (c.x - b.x) * (uv.y - c.y)) / denom;
    float bb = ((c.y - a.y) * (uv.x - c.x) + (a.x - c.x) * (uv.y - c.y)) / denom;
    float bc = 1.0 - ba - bb;
    bool inside = ba >= 0.0 && bb >= 0.0 && bc >= 0.0;

    float alpha = 0.0;
    vec3 color = vColor;

    if (vType < 0.5) {
      // ── Type 0: glowing dot ──
      float d = length(uv - 0.5);
      alpha = 1.0 - smoothstep(0.0, 0.45, d);
      alpha *= 0.55;
      color = mix(color, vec3(1.0), 0.30);
    } else if (vType < 1.5) {
      // ── Type 1: triangle outline ──
      float outline = 1.0 - smoothstep(0.015, 0.05, minEdge);
      alpha = outline * 0.82;
      if (inside && outline < 0.1) {
        alpha = 0.12;
      }
    } else {
      // ── Type 2: filled triangle ──
      if (inside) {
        float edgeDist = 1.0 - smoothstep(0.0, 0.06, minEdge);
        alpha = 0.25 + edgeDist * 0.25;
      }
    }

    // ── Brightness boost from mouse ──
    color = mix(color, vec3(1.0, 0.97, 0.9), vBrightness * 0.35);
    alpha += vBrightness * 0.18;

    // ── Fade at cloud edges ──
    float edgeFade = 1.0 - smoothstep(0.65, 1.0, vDistToCenter);
    alpha *= edgeFade;

    // ── Near-camera fade (prevents giant particles at near plane) ──
    alpha *= vNearFade;

    // ── Scatter fade ──
    if (alpha < 0.02) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

// ═══════════════════════════════════════════════════
// BUILD FUNCTION
// ═══════════════════════════════════════════════════

/**
 * @param {object} quality — quality config with particleMult
 * @returns {{ heroWorld: THREE.Group, particleSystem: THREE.Points, particleData: Float32Array[],
 *             updateParticles: Function, proxySphere: THREE.Mesh }}
 */
export function buildHeroWorld(quality) {
  const heroWorld = new THREE.Group();

  const countMult = quality.particleMult || 1.0;
  const particleCount = Math.round(15000 * countMult);
  const particleCountClamped = Math.max(3000, Math.min(20000, particleCount));

  console.log(`Particle cloud: ${particleCountClamped} particles (quality tier: ${quality.tier})`);

  // ── Generate particle positions via rejection sampling ──
  const basePositions = new Float32Array(particleCountClamped * 3);
  const colors = new Float32Array(particleCountClamped * 3);
  const sizes = new Float32Array(particleCountClamped);
  const rotations = new Float32Array(particleCountClamped);
  const types = new Float32Array(particleCountClamped);
  const scatterDirs = new Float32Array(particleCountClamped * 3);
  const scatterDelays = new Float32Array(particleCountClamped);
  const noiseSeeds = new Float32Array(particleCountClamped);
  const brightnesses = new Float32Array(particleCountClamped);

  let accepted = 0;
  let attempts = 0;
  const maxAttempts = particleCountClamped * 30;

  while (accepted < particleCountClamped && attempts < maxAttempts) {
    attempts++;

    // Sample in a larger bounding ellipsoid (increased radius for bigger cloud)
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.pow(Math.random(), 0.5) * 2.5;

    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta) * 0.65; // slight flatten
    const z = r * Math.cos(phi) * 0.85;

    // Density check
    const density = densityField(x, y, z);
    const threshold = 0.15 + Math.random() * 0.35;

    if (density < threshold) {
      const i = accepted;
      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y + 0.3; // shift up to center
      basePositions[i * 3 + 2] = z;

      const rng = Math.random();
      const col = pickColor(x, y, z, rng);
      colors[i * 3] = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      // Three-tier size: surface (70%), interior (20%), peripheral (10%)
      let baseSz;
      const tierRand = Math.random();
      if (tierRand < 0.70) {
        baseSz = 0.28 + Math.random() * 0.16;  // surface: 0.28-0.44
      } else if (tierRand < 0.90) {
        baseSz = 0.20 + Math.random() * 0.10;  // interior: 0.20-0.30
      } else {
        baseSz = 0.14 + Math.random() * 0.08;  // peripheral: 0.14-0.22
      }
      // Rare decorative larger triangles (~2%)
      if (Math.random() < 0.02) baseSz = 0.55 + Math.random() * 0.25;
      sizes[i] = baseSz;

      rotations[i] = Math.random() * Math.PI * 2;

      // Type distribution: 80% triangle outline, 12% dot, 8% filled triangle
      const typeRand = Math.random();
      types[i] = typeRand < 0.12 ? 0.0 : (typeRand < 0.92 ? 1.0 : 2.0);

      // Scatter direction: radial + strong lateral spread, minimal Z toward camera
      const baseDir = new THREE.Vector3(x, y - 0.3, z).normalize();
      const tangent = new THREE.Vector3(-baseDir.z, 0, baseDir.x).normalize();
      const bitangent = new THREE.Vector3().crossVectors(baseDir, tangent).normalize();
      const noiseAngle = Math.random() * Math.PI * 2;
      const lateralStrength = 0.6 + Math.random() * 0.8; // strong X/Y spread
      const scatterDir = baseDir.clone()
        .add(tangent.clone().multiplyScalar(Math.cos(noiseAngle) * lateralStrength))
        .add(bitangent.clone().multiplyScalar(Math.sin(noiseAngle) * lateralStrength * 0.7))
        .normalize();

      scatterDirs[i * 3] = scatterDir.x;
      scatterDirs[i * 3 + 1] = scatterDir.y + 0.3;
      scatterDirs[i * 3 + 2] = scatterDir.z * 0.5; // halve Z to avoid camera rush

      // Scatter delay: outer particles scatter first
      const distFromCenter = Math.sqrt(x * x + y * y + z * z);
      scatterDelays[i] = 0.05 + distFromCenter / 2.5 * 0.6 + Math.random() * 0.25;

      noiseSeeds[i] = Math.random();
      brightnesses[i] = 0.0;

      accepted++;
    }
  }

  // ── Build BufferGeometry ──
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(basePositions, 3));
  geo.setAttribute('aBasePos', new THREE.BufferAttribute(basePositions, 3));
  geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aRotation', new THREE.BufferAttribute(rotations, 1));
  geo.setAttribute('aType', new THREE.BufferAttribute(types, 1));
  geo.setAttribute('aScatterDir', new THREE.BufferAttribute(scatterDirs, 3));
  geo.setAttribute('aScatterDelay', new THREE.BufferAttribute(scatterDelays, 1));
  geo.setAttribute('aNoiseSeed', new THREE.BufferAttribute(noiseSeeds, 1));
  geo.setAttribute('aBrightness', new THREE.BufferAttribute(brightnesses, 1));

  // ── Custom ShaderMaterial ──
  const material = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScatterProgress: { value: 0 },
      uMouseWorld: { value: new THREE.Vector3(999, 999, 999) },
      uMouseStrength: { value: 0 },
      uMouseRadius: { value: 1.6 },
      uPointSize: { value: 1.05 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });

  const particleSystem = new THREE.Points(geo, material);
  particleSystem.frustumCulled = false;
  particleSystem.scale.setScalar(1.6);
  particleSystem.position.set(0.4, 0.7, 0.2); // shift right + up + forward
  particleSystem.renderOrder = 1;
  heroWorld.add(particleSystem);

  // ── Golden triangle icon (entrance — kept for brand recognition) ──
  const matGold = new THREE.MeshStandardMaterial({
    color: 0xc8a850, roughness: 0.25, metalness: 0.8,
    emissive: 0x1a0e00, emissiveIntensity: 0.4,
  });
  const triGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 3), matGold);
    bar.rotation.y = Math.PI / 2;
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    bar.position.set(Math.cos(angle) * 0.45, Math.sin(angle) * 0.45, 0);
    triGroup.add(bar);
  }
  triGroup.position.set(0, 0.7, 0);
  triGroup.scale.setScalar(0.6);
  heroWorld.add(triGroup);

  // ── Invisible proxy sphere for mouse raycasting (scaled to match larger cloud) ──
  const proxyGeo = new THREE.SphereGeometry(1.8, 16, 12);
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false, depthTest: false, depthWrite: false });
  const proxySphere = new THREE.Mesh(proxyGeo, proxyMat);
  proxySphere.position.set(0.4, 0.7, 0.2); // match particleSystem position
  proxySphere.scale.setScalar(1.6);
  proxySphere.name = 'proxySphere';
  heroWorld.add(proxySphere);

  // ── Ambient floating triangles (hollow LineLoop, 3 only, small, safe) ──
  const floaterGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const fSize = 0.20 + Math.random() * 0.20;
    const fVerts = [
      new THREE.Vector3(0, fSize * 0.8, 0),
      new THREE.Vector3(-fSize * 0.7, -fSize * 0.4, 0),
      new THREE.Vector3(fSize * 0.7, -fSize * 0.4, 0),
    ];
    const fGeo = new THREE.BufferGeometry().setFromPoints([...fVerts, fVerts[0]]);
    const fMat = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(0.12 + Math.random() * 0.1, 0.4, 0.6 + Math.random() * 0.3),
      transparent: true,
      opacity: 0.18 + Math.random() * 0.12,
      depthWrite: false,
    });
    const floater = new THREE.LineLoop(fGeo, fMat);
    floater.position.set(
      (Math.random() - 0.5) * 2.0,
      0.5 + (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 1.5
    );
    floater.userData = {
      baseOpacity: fMat.opacity,
      floatPhase: Math.random() * Math.PI * 2, // ← WAS MISSING — root cause
      floatSpeed: 0.15 + Math.random() * 0.25,
      floatRadius: 0.3 + Math.random() * 0.5,
      floatRadiusZ: 0.10 + Math.random() * 0.15,
      basePos: floater.position.clone(),
      rotSpeed: (Math.random() - 0.5) * 0.2,
    };
    floaterGroup.add(floater);
  }
  heroWorld.add(floaterGroup);

  // ── Store references ──
  heroWorld.userData = {
    triGroup,
    particleSystem,
    proxySphere,
    floaterGroup,
    scatterProgress: 0,
    mouseTarget: new THREE.Vector3(999, 999, 999),
    mouseCurrent: new THREE.Vector3(999, 999, 999),
    mouseStrength: 0,
    mouseStrengthTarget: 0,
    // Per-frame particle update function
    getParticleSystem: () => particleSystem,
    getProxySphere: () => proxySphere,
    getFloaterGroup: () => floaterGroup,
    setScatterProgress: (v) => { heroWorld.userData.scatterProgress = v; },
    setMouseTarget: (v) => { heroWorld.userData.mouseTarget.copy(v); heroWorld.userData.mouseStrengthTarget = 1.0; },
    clearMouseTarget: () => { heroWorld.userData.mouseStrengthTarget = 0.0; },
  };

  return heroWorld;
}
