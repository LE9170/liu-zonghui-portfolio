import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// PHASE 5 OPENING — ported from phase2.html ENTRANCE + HERO stages
// ═══════════════════════════════════════════════════════════════
// The website opening (scroll 0–12%) is phase2's opening: dark reflective
// water, mountain rocks cradling the product container, slowly rotating
// golden triangle, entrance capsule, twinkling starfield, drifting fog
// layers. Built here as a phase5-owned module (phase2.html stays read-only).
//
// Determinism: all randomness comes from a seeded LCG — identical scene on
// every load (standing rule: deterministic + reversible).
//
// Coordinates are phase2 world coordinates: heroWorld at the origin, water
// plane at y=0 (phase5's own single water plane is reused — see
// scene-factory updateVisibility + main.js water-uniform driver).

let _seed = 0x2A5EED >>> 0;
function _rnd() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }

export function buildOpeningWorld() {
  _seed = 0x2A5EED >>> 0; // reset per build — same scene every time

  const group = new THREE.Group();
  group.name = 'openingP2';

  // ── Materials (phase2 values, verbatim) ──
  const matRockDark = new THREE.MeshStandardMaterial({ color: 0x2a2835, roughness: 0.9, metalness: 0.02 });
  const matRockMid = new THREE.MeshStandardMaterial({ color: 0x383540, roughness: 0.85, metalness: 0.05 });
  const matRockFloat = new THREE.MeshStandardMaterial({ color: 0x4a4058, roughness: 0.8, metalness: 0.08 });
  const matPearl = new THREE.MeshStandardMaterial({ color: 0xe8e0f0, roughness: 0.15, metalness: 0.05 });
  const matShell = new THREE.MeshStandardMaterial({ color: 0xf0e0d8, roughness: 0.3, metalness: 0.02 });
  const matProduct = new THREE.MeshStandardMaterial({ color: 0x1a1040, roughness: 0.35, metalness: 0.3, envMapIntensity: 0.4 });
  const matProductLabel = new THREE.MeshStandardMaterial({ color: 0x2a1860, roughness: 0.4, metalness: 0.2 });
  const matGold = new THREE.MeshStandardMaterial({ color: 0xc8a850, roughness: 0.25, metalness: 0.8, emissive: 0x1a0e00, emissiveIntensity: 0.4 });
  const matStar = new THREE.MeshBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 1 });

  // ── Shared geometries ──
  const geoIco = new THREE.IcosahedronGeometry(0.5, 1);
  const geoIcoHi = new THREE.IcosahedronGeometry(0.5, 2);
  const geoBoxTall = new THREE.BoxGeometry(0.75, 2.4, 0.75);

  // ── Golden triangle icon (entrance) ──
  const triGroup = new THREE.Group();
  triGroup.name = 'openingTri';
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 3), matGold);
    bar.rotation.y = Math.PI / 2;
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    bar.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
    triGroup.add(bar);
  }
  triGroup.position.set(0, 0.85, 0);
  triGroup.scale.setScalar(0.7);
  group.add(triGroup);

  // ── Entrance capsule button ──
  const entranceBtn = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 8, 12), matProduct);
  entranceBtn.position.set(0, -0.1, 0.15);
  group.add(entranceBtn);

  // ── Product container + label decal ──
  const productCan = new THREE.Mesh(geoBoxTall, matProduct);
  productCan.name = 'openingProduct';
  productCan.position.set(0, 0.15, 0.6);
  productCan.rotation.x = -0.12;
  productCan.castShadow = true;
  group.add(productCan);

  const productDecal = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.45, 0.04), matProductLabel);
  productDecal.position.set(0, 0.3, 0.99);
  productDecal.rotation.x = -0.12;
  group.add(productDecal);

  // ── Mountain rocks (phase2 placements, verbatim; seeded geo pick) ──
  function addRock(x, y, z, sx, sy, sz, rx, ry, rz, mat) {
    const g = _rnd() > 0.5 ? geoIcoHi : geoIco;
    const m = new THREE.Mesh(g, mat || matRockDark);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    m.rotation.set(rx || 0, ry || 0, rz || 0);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
    return m;
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

  // ── Hero rim light (phase2 heroRim port: purple point light that lifts
  //    rock/product silhouettes off the dark sea) ──
  const rimLight = new THREE.PointLight(0x8060c0, 8, 6);
  rimLight.position.set(-2, 1.5, 2);
  group.add(rimLight);

  // ── Water props (phase2 oceanWorld port — the floating rocks / pearls /
  //    shells / nutrition blocks that populate phase2's opening sea) ──
  const geoBox = new THREE.BoxGeometry(1, 1, 1);
  const geoBoxCapsule = new THREE.BoxGeometry(0.5, 0.3, 0.7);
  const geoSphereLo = new THREE.SphereGeometry(0.5, 12, 8);
  const floaters = []; // { mesh, baseY, floatPhase, floatSpeed, floatAmp, rotSpeed }

  // Floating rocks — dark mounds drifting above the waterline
  for (let i = 0; i < 22; i++) {
    const depth = _rnd(); // 0=near, 1=far
    const rock = new THREE.Mesh(
      depth > 0.6 ? geoIco : (depth > 0.3 ? geoBox : geoIcoHi),
      _rnd() > 0.5 ? matRockFloat : matRockMid
    );
    rock.position.set((_rnd() - 0.5) * 16, 0.2 + _rnd() * 3.0, -3 + _rnd() * 16);
    rock.scale.setScalar(0.15 + depth * 0.9);
    rock.rotation.set(_rnd() * Math.PI, _rnd() * Math.PI, _rnd() * Math.PI);
    rock.castShadow = true;
    rock.receiveShadow = true;
    floaters.push({ mesh: rock, baseY: rock.position.y, floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.2 + _rnd() * 0.6, floatAmp: 0.08 + _rnd() * 0.3, rotSpeed: 0.03 + _rnd() * 0.15 });
    group.add(rock);
  }
  // Pearls — small pale beads at the waterline
  for (let i = 0; i < 10; i++) {
    const pearl = new THREE.Mesh(geoSphereLo, matPearl);
    pearl.position.set((_rnd() - 0.5) * 10, 0.04 + _rnd() * 0.25, -1 + _rnd() * 11);
    pearl.scale.setScalar(0.06 + _rnd() * 0.15);
    floaters.push({ mesh: pearl, baseY: pearl.position.y, floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.4 + _rnd() * 0.8, floatAmp: 0.04 + _rnd() * 0.12, rotSpeed: 0 });
    group.add(pearl);
  }
  // Shells — upturned half-domes resting on the water
  const shellGeom = new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const shell = new THREE.Mesh(shellGeom, matShell);
    shell.position.set((_rnd() - 0.5) * 9, 0.015, -1 + _rnd() * 9);
    shell.rotation.x = Math.PI;
    floaters.push({ mesh: shell, baseY: 0.015, floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.3 + _rnd() * 0.5, floatAmp: 0.02, rotSpeed: 0 });
    group.add(shell);
  }
  // Nutrition blocks — small rounded boxes floating low
  for (let i = 0; i < 8; i++) {
    const block = new THREE.Mesh(geoBoxCapsule, matRockFloat);
    block.position.set((_rnd() - 0.5) * 11, 0.08 + _rnd() * 0.5, -1 + _rnd() * 11);
    block.rotation.set(0, _rnd() * Math.PI, 0);
    floaters.push({ mesh: block, baseY: block.position.y, floatPhase: _rnd() * Math.PI * 2, floatSpeed: 0.25 + _rnd() * 0.5, floatAmp: 0.05 + _rnd() * 0.15, rotSpeed: 0 });
    group.add(block);
  }

  // ── Starfield (100 stars, per-star transparent material so the twinkle
  //     actually reads — phase2 shared one opaque material and the twinkle
  //     was a no-op there) ──
  const starsGroup = new THREE.Group();
  starsGroup.name = 'openingStars';
  const starGeo = new THREE.SphereGeometry(0.03, 4, 3);
  for (let i = 0; i < 100; i++) {
    const star = new THREE.Mesh(starGeo, matStar.clone());
    star.position.set((_rnd() - 0.5) * 14, 2 + _rnd() * 7, -3 + _rnd() * 5);
    star.userData = { twinklePhase: _rnd() * Math.PI * 2, twinkleSpeed: 0.5 + _rnd() * 2 };
    starsGroup.add(star);
  }
  group.add(starsGroup);

  // ── Hero fog layers (translucent drifting planes) ──
  // userData.depthExclude: keeps these transparent planes out of the DOF
  // depth pre-pass (they depth-test but don't depth-write — without the
  // exclusion they would paint near-depth squares into the bokeh field).
  const fogPlanes = [];
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
    group.add(fogPlane);
    fogPlanes.push(fogPlane);
  }

  // ── Per-frame ambient animation (phase2 animate-loop port) ──
  // Driven from main.js animateAmbient; only called while the opening group
  // is visible. Pure functions of (dt, t) — deterministic and reversible.
  function update(dt, t) {
    // Triangle rotation + bob
    triGroup.rotation.z += dt * 0.25;
    triGroup.position.y = 0.85 + Math.sin(t * 1.3) * 0.12;
    // Product can float
    productCan.position.y = 0.15 + Math.sin(t * 0.7) * 0.08;
    // Stars twinkle + slow field rotation
    const sc = starsGroup.children;
    for (let i = 0; i < sc.length; i++) {
      const ud = sc[i].userData;
      sc[i].material.opacity = 0.5 + Math.sin(t * ud.twinkleSpeed + ud.twinklePhase) * 0.5;
    }
    starsGroup.rotation.y += dt * 0.02;
    // Fog drift
    for (let i = 0; i < fogPlanes.length; i++) {
      const fp = fogPlanes[i];
      fp.material.uniforms.uTime.value = t;
      fp.position.x += dt * fp.userData.driftSpeed;
      if (fp.position.x > 4) fp.position.x = -4;
    }
    // Water props bob + slow spin (phase2 floatingObjects port)
    for (let i = 0; i < floaters.length; i++) {
      const f = floaters[i];
      f.mesh.position.y = f.baseY + Math.sin(t * f.floatSpeed + f.floatPhase) * f.floatAmp;
      if (f.rotSpeed) f.mesh.rotation.y += dt * f.rotSpeed;
    }
  }

  return { group, triGroup, entranceBtn, productCan, productDecal, starsGroup, fogPlanes, floaters, update };
}
