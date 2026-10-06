import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// PHASE 5 VISUAL POLISH
// ═══════════════════════════════════════════════════════════════
//
// Self-contained art-direction layer, additive only — no structural changes:
//   1. PMREM studio environment map → real reflections on gold/glass/pearl
//   2. Drifting dust-mote Points → background depth in dark/underwater chapters
//   3. Camera-attached light-streak sweep on shot change → scene "connection"
//   4. Additive glow sprites on hero objects (capsule core, benefit nodes,
//      golden triangle) → soft bloom-friendly halos
//
// Everything here is shader/instancing/sprite based — no new model load.

// ── Procedural soft-dot texture (shared by glows; dust uses shader falloff) ──
function makeGlowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.12)');
  grad.addColorStop(1.0, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ══ 1. ENVIRONMENT MAP ══
// A tiny "studio": gradient dome (deep purple floor → dusty pink horizon →
// soft violet zenith) plus three emissive panels acting as key/fill/rim.
// PMREM-filtered once at init; drives every PBR material's reflections.
export function setupEnvironment(renderer, scene) {
  const envScene = new THREE.Scene();

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(50, 24, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP;
        void main(){
          float h = normalize(vP).y * 0.5 + 0.5;
          vec3 bot = vec3(0.10, 0.06, 0.20);
          vec3 mid = vec3(0.55, 0.38, 0.52);
          vec3 top = vec3(0.30, 0.24, 0.48);
          vec3 col = h < 0.5 ? mix(bot, mid, h * 2.0) : mix(mid, top, (h - 0.5) * 2.0);
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  envScene.add(dome);

  const panel = (color, x, y, z, w, h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); envScene.add(m);
  };
  panel(new THREE.Color(2.2, 1.6, 0.9), 18, 22, 10, 16, 8);   // warm gold key (feeds the triangle)
  panel(new THREE.Color(0.7, 0.9, 1.8), -20, 10, 6, 14, 10);   // cool lavender fill
  panel(new THREE.Color(1.8, 1.1, 1.4), 0, -14, 18, 18, 6);    // pink low rim (sea bounce)

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(envScene, 0.08);
  scene.environment = envRT.texture;
  pmrem.dispose();

  // Per-material reflection strength: metals drink the env, matte rock sips.
  const seen = new Set();
  scene.traverse(o => {
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    for (const m of mats) {
      if (!m || !m.isMeshStandardMaterial || seen.has(m)) continue;
      seen.add(m);
      const metal = m.metalness ?? 0;
      m.envMapIntensity = metal > 0.7 ? 1.5 : metal > 0.3 ? 1.0 : m.roughness < 0.2 ? 0.9 : 0.45;
    }
  });
}

// ══ 2. DUST MOTES ══
// One Points cloud spread along the whole camera path (z −16…32). Drift is
// fully GPU-side (sinusoidal wobble from a per-point seed) — zero CPU updates.
export function createDust(isMobile) {
  const N = isMobile ? 350 : 900;
  const pos = new Float32Array(N * 3), seed = new Float32Array(N);
  let s = 0xC0FFEE;
  const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < N; i++) {
    pos[i * 3] = -14 + rnd() * 28;
    pos[i * 3 + 1] = -7 + rnd() * 12;
    pos[i * 3 + 2] = -16 + rnd() * 48;
    seed[i] = rnd() * 100;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uColor: { value: new THREE.Color('#cabdF0') },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute float aSeed;
      uniform float uTime;
      varying float vA;
      void main(){
        vec3 p = position;
        p.x += sin(uTime * 0.11 + aSeed * 1.7) * 0.7;
        p.y += sin(uTime * 0.08 + aSeed * 2.3) * 0.5;
        p.z += cos(uTime * 0.09 + aSeed * 2.9) * 0.7;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        float sz = mix(0.025, 0.11, fract(aSeed * 0.731));
        gl_PointSize = sz * 800.0 / max(0.5, -mv.z);
        vA = mix(0.25, 1.0, fract(aSeed * 0.377));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main(){
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.04, d) * uOpacity * vA;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor, a);
      }`,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 5;
  return points;
}

// Chapter-aware dust density: starfield in dark chapters, near-invisible on
// the bright pastel sea, drifting plankton underwater.
function dustOpacityFor(p) {
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  let o = 0.12;                                    // p5k: opening must read as ONE cluster — dust is a whisper, not a starfield (was 0.5)
  o = o + (0.10 - o) * ss(0.155, 0.20, p);         // fade down onto the pink sea
  o = o + (0.42 - o) * ss(0.53, 0.59, p);          // plankton after the dive
  o = o + (0.30 - o) * ss(0.90, 0.96, p);          // calm sparkle for the finale
  return o;
}

// ══ 3. LIGHT-STREAK TRANSITION ══
// Camera-attached additive plane; a soft diagonal band sweeps across the frame
// in ~0.45 s whenever the shot index changes. Glues scene cuts together.
export function createLightStreak(camera) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 1 } },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform float uT;
      varying vec2 vUv;
      void main(){
        float cx = mix(-0.35, 1.35, uT);
        float d = abs(vUv.x - cx + (vUv.y - 0.5) * 0.35);
        float band = smoothstep(0.32, 0.0, d);
        float env = sin(clamp(uT, 0.0, 1.0) * 3.14159);
        vec3 col = vec3(1.0, 0.92, 0.97) * band;
        gl_FragColor = vec4(col, band * env * 0.22);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(7, 4), mat);
  mesh.position.set(0, 0, -2.2);
  mesh.renderOrder = 999;
  mesh.visible = false;
  camera.add(mesh);
  return mesh;
}

// ══ 4. GLOW SPRITES ══
function addGlow(parent, tex, color, scale, opacity, y = 0) {
  const sm = new THREE.SpriteMaterial({
    map: tex, color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const sp = new THREE.Sprite(sm);
  sp.scale.setScalar(scale);
  sp.position.y = y;
  sp.userData.baseOpacity = opacity;
  parent.add(sp);
  return sp;
}

// ══ ASSEMBLY ══
export function createPolish(renderer, scene, camera, sd, isMobile) {
  setupEnvironment(renderer, scene);

  const glowTex = makeGlowTexture();

  const dust = createDust(isMobile);
  scene.add(dust);

  const streak = createLightStreak(camera);
  scene.add(camera); // required so the camera-attached streak renders

  // Hero-object halos
  const glows = [];
  if (sd.capG) glows.push(addGlow(sd.capG, glowTex, 0xbfa8ff, 2.6, 0.42, -0.2));
  (sd.benefitNodes || []).forEach((n, i) => {
    const cols = [0xffc070, 0x80a0ff, 0xffc8e0, 0x80e0b8, 0xd0a8ff];
    glows.push(addGlow(n, glowTex, cols[i % cols.length], 2.0, 0.30));
  });
  if (sd.triG) glows.push(addGlow(sd.triG, glowTex, 0xffd88a, 4.2, 0.26));
  if (sd.shellGroup) glows.push(addGlow(sd.shellGroup, glowTex, 0xfff0dd, 1.5, 0.35, 0.15));

  let lastSi = -1;
  let streakT = 1; // idle

  function update(dt, t, p, si, preferRM) {
    // Dust
    dust.material.uniforms.uTime.value = t;
    dust.material.uniforms.uOpacity.value = dustOpacityFor(p);

    // Light streak: restart on shot change, sweep in 0.45 s
    if (si !== lastSi) { if (lastSi !== -1 && !preferRM) streakT = 0; lastSi = si; }
    if (streakT < 1) {
      streakT = Math.min(1, streakT + dt / 0.45);
      streak.material.uniforms.uT.value = streakT;
      streak.visible = streakT < 1;
    } else if (streak.visible) {
      streak.visible = false;
    }

    // Gentle halo breathing (dimmed by the shot crossfade so glows never pop)
    for (let i = 0; i < glows.length; i++) {
      const g = glows[i];
      if (!g.parent.visible) continue;
      let anc = g.parent, fade = 1;
      while (anc) { if (anc.userData?._fade !== undefined) { fade = anc.userData._fade; break; } anc = anc.parent; }
      g.material.opacity = g.userData.baseOpacity * (0.85 + 0.15 * Math.sin(t * 1.3 + i * 1.7)) * fade;
    }
  }

  return { update };
}
