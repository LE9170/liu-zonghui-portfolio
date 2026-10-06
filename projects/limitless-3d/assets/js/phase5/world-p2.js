import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// PHASE 5 — FULL PHASE2 WORLD PORT (p5q)
// ═══════════════════════════════════════════════════════════════
// User directive: fuse ALL of phase2.html into the site (not just the
// opening). This module is the complete phase2 experience as a
// phase5-owned world: heroWorld + oceanWorld + underwater + final CTA,
// phase2's water shader, full light rig, 16-keyframe camera path, and
// phase2's scene-state machine — all driven by the same 0–1 scroll
// progress. phase2.html itself stays read-only.
//
// Determinism: seeded LCG for every random placement (identical scene on
// every load). All per-frame state is a pure function of (dt, t, p).

let _seed = 0x2A5EED >>> 0;
function _rnd() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }

// ── phase2 camera keyframes (verbatim) ──
const CAM_KEYS = [
  { t: 0.00, pos: [0, 0.5, -9],     look: [0, 0.55, 0],    fov: 40 },
  { t: 0.03, pos: [0, 0.6, -7.5],   look: [0, 0.6, 0],     fov: 40 },
  { t: 0.12, pos: [0.4, 1.0, -4.5], look: [0.4, 0.7, 0.3], fov: 41 },
  { t: 0.15, pos: [4.5, 1.6, -3.5], look: [2.5, 0.2, 2.5], fov: 42 },
  { t: 0.25, pos: [3, 2.0, -1],     look: [0.5, 0.0, 4],   fov: 42 },
  { t: 0.35, pos: [1, 1.8, -0.5],   look: [-1, -0.1, 5],   fov: 43 },
  { t: 0.45, pos: [-1, 1.3, 0.5],   look: [-1.5, -0.1, 6.5], fov: 43 },
  { t: 0.55, pos: [-1.5, 0.6, 1.5], look: [-1.5, -0.4, 8],   fov: 44 },
  { t: 0.57, pos: [-1, 0.0, 2],     look: [-0.5, -0.5, 8], fov: 44 },
  { t: 0.59, pos: [-0.5, -2.5, 2.5], look: [0, -2.5, 7],    fov: 43 },
  { t: 0.65, pos: [1, -3.0, 5],     look: [1, -2.8, 9],     fov: 43 },
  { t: 0.73, pos: [-0.5, -3.2, 8],  look: [-0.5, -2.9, 11], fov: 44 },
  { t: 0.81, pos: [0.5, -3.5, 11],  look: [0.5, -3.2, 14],  fov: 44 },
  { t: 0.86, pos: [0, -4.0, 12],    look: [0, -3.8, 15],    fov: 43 },
  { t: 0.91, pos: [0, -4.2, 12.5],  look: [0, -4.0, 15.5],  fov: 42 },
  { t: 1.00, pos: [0, -3.5, 13],    look: [0, -3.2, 15],    fov: 41 },
];

// phase2 stage ranges (for DOM/labels)
const STAGES = [
  { name: 'ENTRANCE',     range: [0.00, 0.03] },
  { name: 'HERO',         range: [0.03, 0.12] },
  { name: 'TRANSITION',   range: [0.12, 0.15] },
  { name: 'SURFACE',      range: [0.15, 0.35] },
  { name: 'CORAL ISLAND', range: [0.35, 0.55] },
  { name: 'DIVE',         range: [0.55, 0.59] },
  { name: 'UNDERWATER',   range: [0.59, 0.81] },
  { name: 'PROOF',        range: [0.81, 0.91] },
  { name: 'FINAL CTA',    range: [0.91, 1.00] },
];

// Benefit node data (phase2 verbatim)
const BENEFIT_NODES = [
  { label: 'energy',      title: 'Energy Levels',      pos: [1.0, -2.8, 6.5],  color: 0xd8b0f0, peak: 0.650 },
  { label: 'cognitive',   title: 'Cognitive Function', pos: [-0.8, -3.1, 8.5], color: 0xb0c8f0, peak: 0.690 },
  { label: 'skin',        title: 'Skin Health',        pos: [1.5, -2.7, 10.5], color: 0xf0b0c8, peak: 0.730 },
  { label: 'respiratory', title: 'Respiratory Health', pos: [-1.0, -3.0, 12.5], color: 0xb8f0d0, peak: 0.770 },
  { label: 'digestive',   title: 'Digestive Health',   pos: [1.2, -2.9, 14.5], color: 0xf0d8b0, peak: 0.805 },
];

export function buildWorldP2({ isMobile = false } = {}) {
  _seed = 0x2A5EED >>> 0; // reset per build — same scene every time
  const waterSegments = isMobile ? 40 : 80;
  const particleCount = isMobile ? 120 : 300;
  const bubbleCount = isMobile ? 8 : 20;

  const root = new THREE.Group();
  root.name = 'worldP2';
  const heroWorld = new THREE.Group(); heroWorld.name = 'p2Hero';
  const oceanWorld = new THREE.Group(); oceanWorld.name = 'p2Ocean';
  root.add(heroWorld, oceanWorld);

  // ══ MATERIALS (phase2 values, verbatim) ══
  const matRockDark = new THREE.MeshStandardMaterial({ color: 0x2a2835, roughness: 0.9, metalness: 0.02 });
  const matRockMid = new THREE.MeshStandardMaterial({ color: 0x383540, roughness: 0.85, metalness: 0.05 });
  const matProduct = new THREE.MeshStandardMaterial({ color: 0x1a1040, roughness: 0.35, metalness: 0.3, envMapIntensity: 0.4 });
  const matProductLabel = new THREE.MeshStandardMaterial({ color: 0x2a1860, roughness: 0.4, metalness: 0.2 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xc8a850, roughness: 0.25, metalness: 0.8, emissive: 0x1a0e00, emissiveIntensity: 0.4 });
  const matStar = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 1 });
  const matSky = new THREE.MeshStandardMaterial({ color: 0x6a5080, roughness: 0.9, side: THREE.DoubleSide });
  const matRockFloat = new THREE.MeshStandardMaterial({ color: 0x4a4058, roughness: 0.8, metalness: 0.08 });
  const matPearl = new THREE.MeshStandardMaterial({ color: 0xe8e0f0, roughness: 0.15, metalness: 0.05 });
  const matShell = new THREE.MeshStandardMaterial({ color: 0xf0e0d8, roughness: 0.3, metalness: 0.02 });
  const matSeabed = new THREE.MeshStandardMaterial({ color: 0x3a3050, roughness: 0.95, metalness: 0.0 });
  const matReef = new THREE.MeshStandardMaterial({ color: 0x282040, roughness: 0.9, metalness: 0.02 });
  const matCapsule = new THREE.MeshStandardMaterial({ color: 0x9080b0, roughness: 0.25, metalness: 0.4 });
  const matCapsuleInner = new THREE.MeshStandardMaterial({ color: 0x706090, roughness: 0.3, metalness: 0.3 });
  const matCoreGlass = new THREE.MeshPhysicalMaterial({ color: 0xd8d0ff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.4, envMapIntensity: 0.8, clearcoat: 0.2, clearcoatRoughness: 0.1 });
  const matBenefitRing = new THREE.MeshStandardMaterial({ color: 0xb0a8d8, roughness: 0.2, metalness: 0.3, emissive: 0x080418, emissiveIntensity: 0.5 });
  const matTriGold = new THREE.MeshStandardMaterial({ color: 0xd4b860, roughness: 0.15, metalness: 0.85, emissive: 0x1a0e00, emissiveIntensity: 0.5 });
  const matTriCopper = new THREE.MeshStandardMaterial({ color: 0xc87850, roughness: 0.2, metalness: 0.8, emissive: 0x100502, emissiveIntensity: 0.35 });
  const matTriSilver = new THREE.MeshStandardMaterial({ color: 0xc8c0d0, roughness: 0.2, metalness: 0.75, emissive: 0x050508, emissiveIntensity: 0.2 });

  // ══ SHARED GEOMETRIES ══
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geoBoxTall = new THREE.BoxGeometry(0.75, 2.4, 0.75);
  const geoBoxCapsule = new THREE.BoxGeometry(0.5, 0.3, 0.7);
  const geoSphere = new THREE.SphereGeometry(0.5, 24, 16);
  const geoSphereLo = new THREE.SphereGeometry(0.5, 12, 8);
  const geoIco = new THREE.IcosahedronGeometry(0.5, 1);
  const geoIcoHi = new THREE.IcosahedronGeometry(0.5, 2);
  const geoCyl = new THREE.CylinderGeometry(0.25, 0.3, 1.4, 12);
  const geoTorus = new THREE.TorusGeometry(0.5, 0.04, 12, 28);

  // ══ WATER (phase2 shader, verbatim) — THE single main water plane ══
  const waterMat = new THREE.ShaderMaterial({
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
      float wave(vec2 p, float t, float freq, float amp, float speed) {
        return sin(p.x * freq + t * speed) * cos(p.y * freq * 0.7 + t * speed * 1.3) * amp
             + sin(p.y * freq * 1.2 + t * speed * 0.8) * amp * 0.6;
      }
      void main() {
        vUv = uv;
        vec3 pos = position;
        float h = 0.0;
        h += wave(pos.xz, uTime, 0.6, 0.30, 0.5);
        h += wave(pos.xz + 5.0, uTime, 1.2, 0.15, 0.7);
        h += wave(pos.xz - 3.0, uTime, 2.0, 0.08, 1.0);
        pos.y += h * uWaveAmp;
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
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
        float fresnel = pow(1.0 - abs(dot(N, V)), uFresnelPower);
        vec3 lightDir = normalize(vec3(2.0, 5.0, -3.0));
        vec3 H = normalize(lightDir + V);
        float spec = pow(max(dot(N, H), 0.0), 256.0) * 0.6;
        float n = sin(vUv.x * 40.0 + uTime * 0.8) * cos(vUv.y * 48.0 + uTime * 0.6) * 0.015;
        float spec2 = pow(max(dot(N + n, H), 0.0), 64.0) * 0.25;
        vec3 baseColor = mix(uColorDeep, uColorSurface, fresnel * 0.7 + 0.3);
        vec3 color = baseColor + vec3(1.0, 0.85, 0.9) * (spec + spec2) * 0.5;
        float shimmer = sin(vUv.x * 80.0 + uTime) * cos(vUv.y * 60.0 + uTime * 1.1) * 0.04;
        color += shimmer * fresnel;
        gl_FragColor = vec4(color, 0.85);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const waterGeo = new THREE.PlaneGeometry(45, 45, waterSegments, waterSegments);
  // phase2 rotates the MESH; port rotates the GEOMETRY so local pos.xz spans
  // the sea (the mesh-rotation variant collapses the wave field — known
  // latent bug, same fix as phase5's own water).
  waterGeo.rotateX(-Math.PI / 2);
  const waterPlane = new THREE.Mesh(waterGeo, waterMat);
  waterPlane.position.y = 0;
  waterPlane.receiveShadow = true;
  oceanWorld.add(waterPlane);

  // ══ HERO WORLD (opening — same content as p5p's opening-p2 port) ══
  const triGroup = new THREE.Group(); triGroup.name = 'p2Tri';
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 3), matGold);
    bar.rotation.y = Math.PI / 2;
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    bar.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
    triGroup.add(bar);
  }
  triGroup.position.set(0, 0.85, 0); triGroup.scale.setScalar(0.7);
  heroWorld.add(triGroup);

  const entranceBtn = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 8, 12), matProduct);
  entranceBtn.position.set(0, -0.1, 0.15); heroWorld.add(entranceBtn);

  const productCan = new THREE.Mesh(geoBoxTall, matProduct);
  productCan.name = 'openingProduct';
  productCan.position.set(0, 0.15, 0.6); productCan.rotation.x = -0.12; productCan.castShadow = true;
  heroWorld.add(productCan);
  const productDecal = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.45, 0.04), matProductLabel);
  productDecal.position.set(0, 0.3, 0.99); productDecal.rotation.x = -0.12;
  heroWorld.add(productDecal);

  function addRock(x, y, z, sx, sy, sz, rx, ry, rz, mat) {
    const g = _rnd() > 0.5 ? geoIcoHi : geoIco;
    const m = new THREE.Mesh(g, mat || matRockDark);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true; m.receiveShadow = true;
    heroWorld.add(m); return m;
  }
  addRock(-1.2, -0.5, 0.2, 1.6, 1.2, 1.2, 0.1, 0.3, 0.2, matRockMid);
  addRock(1.3, -0.6, 0.1, 1.5, 1.1, 1.3, -0.1, -0.4, -0.15);
  addRock(-0.8, -1.0, -0.2, 2.0, 1.0, 1.4, 0, 0.1, 0);
  addRock(1.0, -0.9, -0.3, 1.8, 1.1, 1.2, -0.05, -0.2, 0.1, matRockMid);
  addRock(0, -1.3, 0.5, 2.2, 1.3, 1.5, 0, 0, 0);
  addRock(-1.5, -1.2, 0.4, 1.4, 0.9, 1.0, 0.15, 0.5, -0.1);
  addRock(1.6, -1.1, 0.3, 1.3, 1.0, 1.1, -0.1, -0.3, 0.15);
  addRock(-0.3, -1.6, 0.8, 2.5, 1.0, 1.8, 0, 0, 0);
  addRock(0.5, -1.5, 0.6, 2.0, 0.9, 1.6, 0.05, -0.15, 0);

  const starsGroup = new THREE.Group(); starsGroup.name = 'p2Stars';
  const starGeo = new THREE.SphereGeometry(0.03, 4, 3);
  for (let i = 0; i < 100; i++) {
    const star = new THREE.Mesh(starGeo, matStar.clone());
    star.position.set((_rnd() - 0.5) * 14, 2 + _rnd() * 7, -3 + _rnd() * 5);
    star.userData = { twinklePhase: _rnd() * Math.PI * 2, twinkleSpeed: 0.5 + _rnd() * 2 };
    starsGroup.add(star);
  }
  heroWorld.add(starsGroup);

  const heroFogLayers = [];
  for (let i = 0; i < 4; i++) {
    const fogMat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.075 + i * 0.022 }, uColor: { value: new THREE.Color().setHSL(0.75, 0.42, 0.20 + i * 0.09) } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float uTime; uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;\n        void main() { float edge = smoothstep(0.0, 0.22, vUv.x) * smoothstep(1.0, 0.78, vUv.x); float alpha = uOpacity * edge * (0.4 + 0.6 * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y)); gl_FragColor = vec4(uColor, alpha); }',
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    const fogPlane = new THREE.Mesh(new THREE.PlaneGeometry(7, 3), fogMat);
    fogPlane.position.set(0, -0.3, 1.5 + i * 1.3);
    fogPlane.rotation.x = -0.1;
    fogPlane.userData.depthExclude = true;
    fogPlane.userData.driftSpeed = 0.04 + i * 0.02;
    heroWorld.add(fogPlane);
    heroFogLayers.push(fogPlane);
  }

  // ══ OCEAN SURFACE PROPS ══
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(45, 10), matSky);
  skyPlane.position.set(0, 5, -10);
  oceanWorld.add(skyPlane);

  const horizonGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 3),
    new THREE.ShaderMaterial({
      uniforms: { uColor1: { value: new THREE.Color('#e898b8') }, uColor2: { value: new THREE.Color('#604070') } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 uColor1; uniform vec3 uColor2; varying vec2 vUv;\n        void main() { gl_FragColor = vec4(mix(uColor2, uColor1, vUv.y), 0.35); }',
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  horizonGlow.position.set(0, 0.15, -9.5);
  oceanWorld.add(horizonGlow);

  const floatingObjects = [];
  for (let i = 0; i < 22; i++) {
    const depth = _rnd();
    const rock = new THREE.Mesh(depth > 0.6 ? geoIco : (depth > 0.3 ? geoBox : geoIcoHi), _rnd() > 0.5 ? matRockFloat : matRockMid);
    rock.position.set((_rnd() - 0.5) * 16, 0.2 + _rnd() * 3.0, -3 + _rnd() * 16);
    rock.scale.setScalar(0.15 + depth * 0.9);
    rock.rotation.set(_rnd() * Math.PI, _rnd() * Math.PI, _rnd() * Math.PI);
    rock.castShadow = true; rock.receiveShadow = true;
    rock.userData = { depth, floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.2 + _rnd() * 0.6, floatAmp: 0.08 + _rnd() * 0.3, rotSpeed: 0.03 + _rnd() * 0.15, baseY: rock.position.y };
    oceanWorld.add(rock);
    floatingObjects.push(rock);
  }
  for (let i = 0; i < 10; i++) {
    const pearl = new THREE.Mesh(geoSphereLo, matPearl);
    pearl.position.set((_rnd() - 0.5) * 10, 0.04 + _rnd() * 0.25, -1 + _rnd() * 11);
    pearl.scale.setScalar(0.06 + _rnd() * 0.15);
    pearl.userData = { floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.4 + _rnd() * 0.8, floatAmp: 0.04 + _rnd() * 0.12, baseY: pearl.position.y, rotSpeed: 0 };
    oceanWorld.add(pearl);
    floatingObjects.push(pearl);
  }
  const shellGeom = new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const shell = new THREE.Mesh(shellGeom, matShell);
    shell.position.set((_rnd() - 0.5) * 9, 0.015, -1 + _rnd() * 9);
    shell.rotation.x = Math.PI;
    shell.userData = { floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.3 + _rnd() * 0.5, floatAmp: 0.02, baseY: 0.015, rotSpeed: 0 };
    oceanWorld.add(shell);
    floatingObjects.push(shell);
  }
  for (let i = 0; i < 8; i++) {
    const block = new THREE.Mesh(geoBoxCapsule, matRockFloat);
    block.position.set((_rnd() - 0.5) * 11, 0.08 + _rnd() * 0.5, -1 + _rnd() * 11);
    block.rotation.set(0, _rnd() * Math.PI, 0);
    block.userData = { floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.25 + _rnd() * 0.5, floatAmp: 0.05 + _rnd() * 0.15, baseY: block.position.y, rotSpeed: 0 };
    oceanWorld.add(block);
    floatingObjects.push(block);
  }

  // ══ CORAL ISLAND ══
  const coralIsland = new THREE.Group();
  coralIsland.position.set(-1.5, 0.05, 9);
  const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 0.4, 10), matRockMid);
  islandBase.position.y = -0.05; islandBase.receiveShadow = true;
  coralIsland.add(islandBase);
  const coralColors = [0xd06880, 0xe08860, 0xd89050, 0xc0a040, 0xa0c060];
  for (let i = 0; i < 25; i++) {
    const color = coralColors[Math.floor(_rnd() * coralColors.length)];
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.03, emissive: color, emissiveIntensity: 0.1 });
    const coral = new THREE.Mesh(_rnd() > 0.5 ? geoCyl : geoIco, mat);
    const angle = _rnd() * Math.PI * 2, r = 0.15 + _rnd() * 1.4;
    coral.position.set(Math.cos(angle) * r, 0.15 + _rnd() * 0.8, Math.sin(angle) * r);
    coral.scale.setScalar(0.25 + _rnd() * 0.5);
    coral.rotation.set(_rnd() * 0.5, _rnd() * Math.PI, _rnd() * 0.5);
    coral.castShadow = true;
    coral.userData = { swayPhase: _rnd() * Math.PI * 2, swaySpeed: 0.3 + _rnd() * 0.5, baseRotY: coral.rotation.y };
    coralIsland.add(coral);
  }
  oceanWorld.add(coralIsland);

  // ══ FISH ══
  const fishes = [];
  function createFish(scale, x, y, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.25, 0.35), new THREE.MeshStandardMaterial({ color: 0xf0a870, roughness: 0.35, metalness: 0.05 }));
    group.add(body);
    const tailPivot = new THREE.Group(); tailPivot.position.x = -0.55;
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 0.06), new THREE.MeshStandardMaterial({ color: 0xf0b890, roughness: 0.3, metalness: 0.02, transparent: true, opacity: 0.85 }));
    tail.position.x = -0.12; tailPivot.add(tail); group.add(tailPivot);
    const dorsal = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.03), new THREE.MeshStandardMaterial({ color: 0xf0c0a0, roughness: 0.3, metalness: 0.02, transparent: true, opacity: 0.75 }));
    dorsal.position.set(0, 0.16, 0); group.add(dorsal);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(0.4, 0.04, 0.14); group.add(eye);
    group.position.set(x, y, z); group.scale.setScalar(scale);
    group.userData = { swimPhase: _rnd() * Math.PI * 2, swimSpeed: 0.08 + _rnd() * 0.2, swimRadius: 2 + _rnd() * 5, baseX: x, baseY: y, baseZ: z, tailPivot };
    oceanWorld.add(group); fishes.push(group);
    return group;
  }
  for (let i = 0; i < 6; i++) createFish(0.3 + _rnd() * 0.4, (_rnd() - 0.5) * 10, 0.3 + _rnd() * 1.8, -1 + _rnd() * 10);
  createFish(1.5, 6, 0.6, 3); // hero fish

  // ══ UNDERWATER ══
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(30, 45, 25, 30), matSeabed);
  seabed.rotation.x = -Math.PI / 2; seabed.position.y = -5; seabed.receiveShadow = true;
  oceanWorld.add(seabed);
  for (let i = 0; i < 30; i++) {
    const bump = new THREE.Mesh(new THREE.SphereGeometry(0.15, 4, 3), matSeabed);
    bump.position.set((_rnd() - 0.5) * 12, -4.92, -1 + _rnd() * 22);
    bump.scale.set(1 + _rnd() * 2, 0.1 + _rnd() * 0.2, 1 + _rnd() * 2);
    oceanWorld.add(bump);
  }
  for (let i = 0; i < 16; i++) {
    const rock = new THREE.Mesh(geoIco, matReef);
    rock.position.set(-4.5 - _rnd() * 2, -5 + i * 0.7, -2 + i * 1.6);
    rock.scale.setScalar(0.8 + _rnd() * 1.6); rock.rotation.set(_rnd(), _rnd(), _rnd());
    rock.castShadow = true; rock.receiveShadow = true;
    oceanWorld.add(rock);
  }
  for (let i = 0; i < 16; i++) {
    const rock = new THREE.Mesh(geoIco, matReef);
    rock.position.set(4.5 + _rnd() * 2, -5 + i * 0.8, -2 + i * 1.5);
    rock.scale.setScalar(0.7 + _rnd() * 1.5); rock.rotation.set(_rnd(), _rnd(), _rnd());
    rock.castShadow = true; rock.receiveShadow = true;
    oceanWorld.add(rock);
  }
  const uwCoralColors = [0xc04080, 0xd06070, 0xe08050, 0xc050a0, 0xb040c0];
  for (let i = 0; i < 35; i++) {
    const color = uwCoralColors[Math.floor(_rnd() * uwCoralColors.length)];
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.03, emissive: color, emissiveIntensity: 0.2 });
    const c = new THREE.Mesh(_rnd() > 0.5 ? geoCyl : geoIco, mat);
    c.position.set((_rnd() - 0.5) * 8, -5 + _rnd() * 1.0, -2 + _rnd() * 20);
    c.scale.setScalar(0.2 + _rnd() * 0.7);
    c.receiveShadow = true;
    c.userData = { swayPhase: _rnd() * Math.PI * 2, swaySpeed: 0.3 + _rnd() * 0.6, baseRotY: c.rotation.y };
    oceanWorld.add(c);
  }
  for (let i = 0; i < 5; i++) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2 + _rnd() * 3, 8), matReef);
    pillar.position.set((_rnd() - 0.5) * 6, -4 + _rnd() * 0.8, 2 + i * 4);
    pillar.receiveShadow = true;
    oceanWorld.add(pillar);
  }

  // ══ CAPSULE (underwater product) ══
  const capsuleGroup = new THREE.Group();
  capsuleGroup.position.set(0.3, -2.6, 3.5);
  const capTopBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), matCapsule);
  capTopBody.position.y = 0.2; capsuleGroup.add(capTopBody);
  const capTopDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), matCapsule);
  capTopDome.position.y = 0.575; capsuleGroup.add(capTopDome);
  const capBotBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), matCapsuleInner);
  capBotBody.position.y = -0.7; capsuleGroup.add(capBotBody);
  const capBotDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), matCapsuleInner);
  capBotDome.position.y = -1.075; capsuleGroup.add(capBotDome);
  const coreSphereMesh = new THREE.Mesh(geoSphere, matCoreGlass);
  coreSphereMesh.position.y = -0.35; coreSphereMesh.scale.setScalar(0.65);
  capsuleGroup.add(coreSphereMesh);
  for (let i = 0; i < 10; i++) {
    const bit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: 0xd04060, roughness: 0.4, emissive: 0x200510, emissiveIntensity: 0.5 }));
    bit.position.set((_rnd() - 0.5) * 0.35, -0.35 + (_rnd() - 0.5) * 0.4, (_rnd() - 0.5) * 0.35);
    capsuleGroup.add(bit);
  }
  oceanWorld.add(capsuleGroup);

  // ══ BENEFIT NODES ══
  const benefitNodes = [];
  BENEFIT_NODES.forEach((data, idx) => {
    const node = new THREE.Group();
    node.position.set(...data.pos);
    const ring = new THREE.Mesh(geoTorus, matBenefitRing);
    ring.name = 'benefitRing'; ring.scale.setScalar(0.7);
    node.add(ring);
    const bubble = new THREE.Mesh(geoSphereLo, new THREE.MeshPhysicalMaterial({ color: data.color, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.35, envMapIntensity: 0.5 }));
    bubble.scale.setScalar(0.45);
    node.add(bubble);
    for (let j = 0; j < 4; j++) {
      const bit = new THREE.Mesh(new THREE.IcosahedronGeometry(0.06, 0), new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.3, emissive: data.color, emissiveIntensity: 0.4 }));
      bit.position.set((_rnd() - 0.5) * 0.2, (_rnd() - 0.5) * 0.2, (_rnd() - 0.5) * 0.2);
      node.add(bit);
    }
    node.userData = { idx, nm: data.title, label: data.label, peak: data.peak, act: 0, ring };
    oceanWorld.add(node);
    benefitNodes.push(node);
  });

  // ══ FINAL CTA: NESTED TRIANGLES ══
  const finalTriGroup = new THREE.Group();
  finalTriGroup.position.set(0, -3.2, 15);
  const triMats = [matTriGold, matTriCopper, matTriSilver, matTriGold];
  for (let t = 0; t < 4; t++) {
    const size = 1.7 - t * 0.32;
    const tri = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, size, 3), triMats[t]);
      bar.rotation.y = Math.PI / 2;
      const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const radius = size * 0.55;
      bar.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      tri.add(bar);
    }
    tri.rotation.z = t * 0.08;
    tri.rotation.y = t * 0.05;
    finalTriGroup.add(tri);
  }
  oceanWorld.add(finalTriGroup);

  // ══ MARINE SNOW + BUBBLES ══
  const particlesPos = new Float32Array(particleCount * 3);
  const particlesVel = new Float32Array(particleCount);
  for (let i = 0; i < particleCount; i++) {
    particlesPos[i * 3] = (_rnd() - 0.5) * 16;
    particlesPos[i * 3 + 1] = -5 + _rnd() * 14;
    particlesPos[i * 3 + 2] = -3 + _rnd() * 28;
    particlesVel[i] = 0.1 + _rnd() * 0.5;
  }
  const particlesGeo = new THREE.BufferGeometry();
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlesPos, 3));
  const particleSystem = new THREE.Points(particlesGeo, new THREE.PointsMaterial({ color: 0xccccdd, size: 0.05, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false }));
  oceanWorld.add(particleSystem);

  const bubbles = [];
  for (let i = 0; i < bubbleCount; i++) {
    const bub = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + _rnd() * 0.08, 6, 4),
      new THREE.MeshPhysicalMaterial({ color: 0xd8d0f8, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.3 })
    );
    bub.position.set((_rnd() - 0.5) * 10, -5 + _rnd() * 10, -2 + _rnd() * 22);
    bub.userData = { riseSpeed: 0.15 + _rnd() * 0.4, wobbleAmp: 0.1 + _rnd() * 0.3, wobblePhase: _rnd() * Math.PI * 2 };
    oceanWorld.add(bub);
    bubbles.push(bub);
  }

  // ══ LIGHT RIG (phase2 verbatim; ambient stays owned by main.js) ══
  const heroKey = new THREE.DirectionalLight(0xffeedd, 3.0);
  heroKey.position.set(5, 8, -5);
  root.add(heroKey);
  const heroRim = new THREE.PointLight(0x8060c0, 8, 6);
  heroRim.position.set(-2, 1.5, 2);
  root.add(heroRim);
  const sunLight = new THREE.DirectionalLight(0xfff0e8, 2.0);
  sunLight.position.set(8, 10, 2);
  root.add(sunLight);
  const uwKey = new THREE.DirectionalLight(0x9988cc, 1.8);
  uwKey.position.set(4, 2, 8);
  root.add(uwKey);
  const uwFill = new THREE.PointLight(0xcc4488, 5, 8);
  uwFill.position.set(-2, -3, 7);
  root.add(uwFill);
  const uwFill2 = new THREE.PointLight(0x8844aa, 4, 8);
  uwFill2.position.set(2, -3.5, 12);
  root.add(uwFill2);
  const finalKey = new THREE.PointLight(0xffd8a0, 6, 8);
  finalKey.position.set(0, -2, 13);
  root.add(finalKey);
  const finalRim = new THREE.PointLight(0x8899cc, 4, 6);
  finalRim.position.set(0, -4, 16);
  root.add(finalRim);

  // ══ CAMERA (phase2 keyframe lerp with inOutQuad, verbatim) ══
  const _cA = new THREE.Vector3(), _cB = new THREE.Vector3();
  function cameraAt(progress, mobile = false) {
    const p = Math.max(0, Math.min(1, progress));
    let lo = 0, hi = CAM_KEYS.length - 1;
    for (let i = 0; i < CAM_KEYS.length - 1; i++) {
      if (p >= CAM_KEYS[i].t && p <= CAM_KEYS[i + 1].t) { lo = i; hi = i + 1; break; }
    }
    const kLo = CAM_KEYS[lo], kHi = CAM_KEYS[hi];
    const range = kHi.t - kLo.t;
    const localT = range > 0 ? (p - kLo.t) / range : 0;
    const t = localT < 0.5 ? 2 * localT * localT : 1 - Math.pow(-2 * localT + 2, 2) / 2;
    const pos = _cA.set(...kLo.pos).clone().lerp(_cB.set(...kHi.pos), t);
    const look = _cA.set(...kLo.look).clone().lerp(_cB.set(...kHi.look), t);
    const fov = kLo.fov + (kHi.fov - kLo.fov) * t;
    if (mobile) { pos.y += 0.3; look.y += 0.4; }
    return { pos, look, fov: isFinite(fov) ? fov : 42 };
  }

  // ══ SCENE STATE (phase2 updateSceneState, verbatim values) ══
  const _cBgSurface = new THREE.Color(0x0a0a14), _cBgDeep = new THREE.Color(0x060420);
  const _cFogSurface = new THREE.Color(0x121020), _cFogDeep = new THREE.Color(0x080420);
  const _cAmbSurface = new THREE.Color(0x334455), _cAmbDeep = new THREE.Color(0x1a1040);
  const _tmp1 = new THREE.Color(), _tmp2 = new THREE.Color(), _tmp3 = new THREE.Color();

  function applyEnv(progress, { scene, ambientLight }) {
    const p = progress;
    if (p < 0.55) {
      scene.background = _cBgSurface;
      if (scene.fog) { scene.fog.color.copy(_cFogSurface); scene.fog.density = 0.006; }
      if (ambientLight) { ambientLight.color.copy(_cAmbSurface); ambientLight.intensity = 0.8; }
      heroKey.intensity = 3.0; heroKey.color.set(0xffeedd);
      heroRim.intensity = 8;
      sunLight.intensity = 2.0;
      uwKey.intensity = 0.3;
      uwFill.intensity = 1.5;
      uwFill2.intensity = 1.0;
      waterMat.uniforms.uFresnelPower.value = 2.5;
      waterMat.uniforms.uColorSurface.value.set('#e8b0c8');
      waterMat.uniforms.uColorDeep.value.set('#604070');
      waterMat.uniforms.uWaveAmp.value = 0.25;
    } else if (p < 0.59) {
      const t = (p - 0.55) / 0.04;
      scene.background = _tmp1.copy(_cBgSurface).lerp(_cBgDeep, t);
      if (scene.fog) { scene.fog.color.copy(_tmp2.copy(_cFogSurface).lerp(_cFogDeep, t)); scene.fog.density = 0.006 + t * 0.012; }
      if (ambientLight) { ambientLight.color.copy(_tmp3.copy(_cAmbSurface).lerp(_cAmbDeep, t)); ambientLight.intensity = 0.8 - t * 0.3; }
      heroKey.intensity = 3.0 * (1 - t);
      heroRim.intensity = 8 * (1 - t);
      sunLight.intensity = 2.0 * (1 - t);
      uwKey.intensity = 0.3 + t * 1.5;
      uwFill.intensity = 1.5 + t * 3.5;
      uwFill2.intensity = 1.0 + t * 3.0;
      waterMat.uniforms.uFresnelPower.value = 2.5 - t * 1.0;
      waterMat.uniforms.uColorSurface.value.set('#e8b0c8');
      waterMat.uniforms.uColorDeep.value.set('#604070');
      waterMat.uniforms.uWaveAmp.value = 0.25 - t * 0.15;
    } else {
      scene.background = _cBgDeep;
      if (scene.fog) { scene.fog.color.copy(_cFogDeep); scene.fog.density = 0.018; }
      if (ambientLight) { ambientLight.color.copy(_cAmbDeep); ambientLight.intensity = 0.5; }
      heroKey.intensity = 0;
      heroRim.intensity = 0;
      sunLight.intensity = 0;
      uwKey.intensity = 1.8;
      uwFill.intensity = 5;
      uwFill2.intensity = 4;
      waterMat.uniforms.uFresnelPower.value = 1.5;
      waterMat.uniforms.uColorSurface.value.set('#403058');
      waterMat.uniforms.uColorDeep.value.set('#302048');
      waterMat.uniforms.uWaveAmp.value = 0.1;
    }
    if (p > 0.88) {
      const ft = (p - 0.88) / 0.12;
      finalKey.intensity = 6 * ft;
      finalRim.intensity = 4 * ft;
    } else {
      finalKey.intensity = 0;
      finalRim.intensity = 0;
    }
  }

  // ══ PER-PROGRESS STATE (visibility + benefit node activation) ══
  function setProgress(p) {
    heroWorld.visible = p < 0.18;
    for (let i = 0; i < benefitNodes.length; i++) {
      const n = benefitNodes[i];
      const act = Math.max(0, Math.min(1, 1 - Math.abs(p - n.userData.peak) / 0.022));
      n.userData.act = act;
      const s = 0.85 + act * 0.35;
      n.scale.setScalar(s);
    }
  }

  // ══ AMBIENT ANIMATION (phase2 animate loop, verbatim behaviors) ══
  function update(dt, t, p, camera) {
    waterMat.uniforms.uTime.value = t;
    if (camera) waterMat.uniforms.uCameraPos.value.copy(camera.position);

    if (heroWorld.visible) {
      triGroup.rotation.z += dt * 0.25;
      triGroup.position.y = 0.85 + Math.sin(t * 1.3) * 0.12;
      productCan.position.y = 0.15 + Math.sin(t * 0.7) * 0.08;
      const sc = starsGroup.children;
      for (let i = 0; i < sc.length; i++) {
        const ud = sc[i].userData;
        sc[i].material.opacity = 0.5 + Math.sin(t * ud.twinkleSpeed + ud.twinklePhase) * 0.5;
      }
      starsGroup.rotation.y += dt * 0.02;
      for (let i = 0; i < heroFogLayers.length; i++) {
        const fp = heroFogLayers[i];
        fp.material.uniforms.uTime.value = t;
        fp.position.x += dt * fp.userData.driftSpeed;
        if (fp.position.x > 4) fp.position.x = -4;
      }
    }

    for (let i = 0; i < floatingObjects.length; i++) {
      const r = floatingObjects[i], ud = r.userData;
      r.position.y = ud.baseY + Math.sin(t * ud.floatSpeed + ud.floatPhase) * ud.floatAmp;
      if (ud.rotSpeed) r.rotation.y += dt * ud.rotSpeed;
    }

    coralIsland.children.forEach(c => {
      if (c.userData && c.userData.swayPhase !== undefined) {
        c.rotation.y = c.userData.baseRotY + Math.sin(t * c.userData.swaySpeed + c.userData.swayPhase) * 0.08;
      }
    });
    oceanWorld.children.forEach(c => {
      if (c.userData && c.userData.swayPhase !== undefined && c.parent === oceanWorld) {
        c.rotation.y = c.userData.baseRotY + Math.sin(t * c.userData.swaySpeed + c.userData.swayPhase) * 0.08;
      }
    });

    for (let i = 0; i < fishes.length; i++) {
      const fish = fishes[i], ud = fish.userData;
      fish.position.x = ud.baseX + Math.cos(t * ud.swimSpeed + ud.swimPhase) * ud.swimRadius;
      fish.position.z = ud.baseZ + Math.sin(t * ud.swimSpeed + ud.swimPhase) * ud.swimRadius * 0.6;
      fish.position.y = ud.baseY + Math.sin(t * 0.4 + ud.swimPhase) * 0.25;
      fish.rotation.y = -t * ud.swimSpeed - ud.swimPhase + Math.PI / 2;
      if (ud.tailPivot) ud.tailPivot.rotation.y = Math.sin(t * 7 + ud.swimPhase) * 0.4;
    }

    capsuleGroup.position.y = -2.6 + Math.sin(t * 0.6) * 0.15;

    for (let i = 0; i < benefitNodes.length; i++) {
      const ring = benefitNodes[i].userData.ring;
      if (ring) ring.rotation.z += dt * 0.3;
    }

    finalTriGroup.rotation.y += dt * 0.1;

    const pArr = particleSystem.geometry.attributes.position.array;
    for (let i = 0; i < particleCount; i++) {
      pArr[i * 3 + 1] += dt * particlesVel[i];
      if (pArr[i * 3 + 1] > 8) pArr[i * 3 + 1] = -5;
      pArr[i * 3] += Math.sin(t * 0.4 + i * 0.1) * dt * 0.15;
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;

    for (let i = 0; i < bubbles.length; i++) {
      const b = bubbles[i];
      b.position.y += dt * b.userData.riseSpeed;
      if (b.position.y > 6) b.position.y = -5;
      b.position.x += Math.sin(t * 1.5 + b.userData.wobblePhase) * dt * b.userData.wobbleAmp;
    }
  }

  function stageOf(p) {
    for (const s of STAGES) { if (p >= s.range[0] && p <= s.range[1]) return s.name; }
    return STAGES[0].name;
  }

  return {
    rootGroup: root, heroWorld, oceanWorld,
    waterPlane, waterMat, capsuleGroup, benefitNodes, finalTriGroup, coralIsland,
    cameraAt, applyEnv, setProgress, update, stageOf,
    stages: STAGES,
  };
}
