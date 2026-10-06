import * as THREE from 'three';
import { quality } from '../phase3/quality-manager.js?v=20260806-p5p';
import { geoBox, geoSphere, geoSphereLo, geoIco, geoIcoHi, geoCyl, geoPlane, _dummyMatrix, _dummyPos, _dummyQuat, _dummyScale } from '../phase3/geometries.js?v=20260806-p5p';
import { createWater } from './water.js?v=20260806-p5p';
import { buildHeroWorld } from '../phase4/scene-hero.js?v=20260806-p5p';
import { getCameraAt, getAllShots } from './camera-rig.js?v=20260806-p5p';
import { buildOpeningWorld } from './opening-p2.js?v=20260806-p5p';

const _wUp = new THREE.Vector3(0, 1, 0);

let _s = 0xBEEF; function _r() { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff; }
function _rr(a, b) { return a + _r() * (b - a); }
function M(c, o = {}) { return new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.7, metalness: o.m ?? 0.05, transparent: o.t ?? false, opacity: o.o ?? 1, depthWrite: o.dw ?? true, emissive: o.e ?? 0, emissiveIntensity: o.ei ?? 0, side: o.ds ? THREE.DoubleSide : THREE.FrontSide }); }
function Q(geo, mat, x, y, z, sx = 1, sy = sx, sz = sx) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.castShadow = true; m.receiveShadow = true; return m; }

const mRock = M(0x5c5674, { r: 0.8, e: 0x161028, ei: 0.45 }), mRockD = M(0x4a4462, { r: 0.85, e: 0x100c22, ei: 0.45 });
const mGold = M(0xc8a850, { r: 0.22, m: 0.9, e: 0x8a5a10, ei: 0.65 });
const mGoldB = M(0xd4af37, { r: 0.16, m: 0.95, e: 0xa06a10, ei: 0.7 });
const mGoldE = new THREE.MeshBasicMaterial({ color: 0xd4af37 });
const mPearl = M(0xf8f0e8, { r: 0.08 }), mPearlGlow = new THREE.MeshBasicMaterial({ color: 0xfff8f0 });
const mShell = M(0xf0d8d0, { r: 0.3, m: 0.02 }), mShellIn = M(0xfce8e0, { r: 0.25, t: true, o: 0.7, dw: false });
const mFish = M(0xe08a94, { r: 0.55, m: 0.05, e: 0x401418, ei: 0.5 }), mFishFin = M(0xe8949e, { r: 0.5, t: true, o: 0.88, e: 0x3a1216, ei: 0.4 });
const mCapsule = M(0xa898c8, { r: 0.14, m: 0.55, e: 0x282050, ei: 0.6 }), mCapsuleI = M(0x8880b0, { r: 0.18, m: 0.45, e: 0x1c1638, ei: 0.5 });
const mCoreGlass = M(0xd0c0f0, { r: 0.08, t: true, o: 0.55, dw: false });
const mSeabed = M(0x77688a, { r: 0.95 }), mReef = M(0x352a50, { r: 0.85 }), mReefDark = M(0x281e40, { r: 0.88 });
const mNutrient = M(0xe8d8c0, { r: 0.4, m: 0.05 });
const mCoralP = M(0xd98a92, { r: 0.55 }), mCoralO = M(0xdc9a76, { r: 0.55 }), mCoralY = M(0xd6b489, { r: 0.55 });
const mPlant = M(0xd04060, { r: 0.38, e: 0x200510, ei: 0.55 });
const mEnergyC = M(0xf0a030, { r: 0.15, e: 0x401000, ei: 0.7 });
const mCogC = M(0x6080e0, { r: 0.15, e: 0x001030, ei: 0.7 });
const mSkinC = M(0xf0c0d8, { r: 0.12, e: 0x200810, ei: 0.6 });
const mRespC = M(0x60d0a0, { r: 0.15, e: 0x001008, ei: 0.6 });
const mDigC = M(0xd0a0f0, { r: 0.15, e: 0x100820, ei: 0.6 });
const mBenS = M(0xd8e4ff, { r: 0.05, t: true, o: 0.5, dw: false, e: 0x304080, ei: 0.5 });
const mBenR = M(0xe0d8ff, { r: 0.08, m: 0.2, e: 0x201040, ei: 0.6 });

function triEdge(vA, vB, r, mat) { const m = new THREE.Vector3().addVectors(vA, vB).multiplyScalar(0.5); const d = new THREE.Vector3().subVectors(vB, vA); const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 3), mat); b.position.copy(m); b.setRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return b; }
function buildTri(rad, br, mat) { const g = new THREE.Group(), h = rad * 0.866; g.add(triEdge(new THREE.Vector3(0, rad, 0), new THREE.Vector3(-h, -rad * 0.5, 0), br, mat)); g.add(triEdge(new THREE.Vector3(-h, -rad * 0.5, 0), new THREE.Vector3(h, -rad * 0.5, 0), br, mat)); g.add(triEdge(new THREE.Vector3(h, -rad * 0.5, 0), new THREE.Vector3(0, rad, 0), br, mat)); return g; }

// Camera safety samples
const _cS = [];
(() => { const k = [[0,0.5,-9],[0,0.55,-8.3],[0.4,1,-4.5],[4.5,1.6,-3.5],[-1,0.82,0.5],[-1.5,0.6,1.5],[-0.5,-2.5,11.5],[1,-3,13],[-0.5,-3.2,16],[0.5,-3.5,19],[0,-4,22],[0,-3.5,23.5]]; for (let i = 0; i < k.length - 1; i++) for (let j = 0; j <= 30; j++) { const t = j / 30; _cS.push([k[i][0]+(k[i+1][0]-k[i][0])*t, k[i][1]+(k[i+1][1]-k[i][1])*t, k[i][2]+(k[i+1][2]-k[i][2])*t]); } })();
function _cd(x, y, z) { let d = 1e9; for (const c of _cS) { const dx = x - c[0], dy = y - c[1], dz = z - c[2]; d = Math.min(d, Math.sqrt(dx*dx+dy*dy+dz*dz)); } return d; }
function _safe(x, y, z, r = 0.5, cl = 2.0) { return _cd(x, y, z) >= (r + cl); }
function _sPos(xR, yR, zR, r = 0.5, cl = 2.0) { for (let a = 0; a < 80; a++) { const x = _rr(xR[0], xR[1]), y = _rr(yR[0], yR[1]), z = _rr(zR[0], zR[1]); if (_safe(x, y, z, r, cl)) return [x, y, z]; } return [xR[1], yR[1], zR[0]]; }

function camAt(prog) { const cs = getCameraAt(prog, false); return { pos: cs.pos.clone(), look: cs.look.clone(), fov: cs.fov, aspect: 1.78 }; }
function placeAtScreen(cam, ndcX, ndcY, dist) { const v = new THREE.Vector3().copy(cam.look).sub(cam.pos).normalize(); const r = new THREE.Vector3().crossVectors(_wUp, v).normalize(); if (r.length() < 0.001) r.set(1, 0, 0); const u = new THREE.Vector3().crossVectors(v, r).normalize(); const hH = dist * Math.tan((cam.fov * Math.PI) / 360), hW = hH * 1.78; return cam.pos.clone().addScaledVector(v, dist).addScaledVector(r, ndcX * hW).addScaledVector(u, ndcY * hH); }

// ══ ITERATIVE NDC CORRECTION ══
function correctVisualCenterToNDC(root, camera, tgtX, tgtY, maxIt = 5) {
  const box = new THREE.Box3(), vc = new THREE.Vector3(), ndc = new THREE.Vector3();
  const dl = new THREE.Vector3(), r = new THREE.Vector3(), u = new THREE.Vector3(), vd = new THREE.Vector3(), to = new THREE.Vector3();
  for (let it = 0; it < maxIt; it++) {
    root.updateMatrixWorld(true); box.setFromObject(root);
    if (box.isEmpty()) return { screenX: NaN, screenY: NaN, ndcX: NaN, ndcY: NaN };
    box.getCenter(vc); ndc.copy(vc).project(camera);
    if (!isFinite(ndc.x) || !isFinite(ndc.y)) break;
    const ex = tgtX - ndc.x, ey = tgtY - ndc.y;
    if (Math.abs(ex) < 0.01 && Math.abs(ey) < 0.01) break;
    camera.getWorldDirection(vd); r.crossVectors(vd, camera.up).normalize(); u.crossVectors(r, vd).normalize();
    to.copy(vc).sub(camera.position); const d = to.dot(vd); if (d < 0.1) break;
    const hH = d * Math.tan((camera.fov * Math.PI) / 360), hW = hH * camera.aspect;
    dl.set(0, 0, 0).addScaledVector(r, ex * hW).addScaledVector(u, ey * hH); root.position.add(dl);
  }
  root.updateMatrixWorld(true); box.setFromObject(root); box.getCenter(vc); ndc.copy(vc).project(camera);
  root.userData._lp = root.position.clone();
  return { ndcX: ndc.x, ndcY: ndc.y, screenX: ((ndc.x + 1) / 2) * 100, screenY: ((1 - ndc.y) / 2) * 100 };
}
function chkPosOver(root) { return root.userData._lp && !root.position.equals(root.userData._lp); }

// ═══════════════════════════════════════════════════════════════
// BUILD
// ═══════════════════════════════════════════════════════════════
export function buildPhase5Scene() {
  const root = new THREE.Group();
  const shots = getAllShots();
  const sg = Array.from({ length: 18 }, (_, i) => { const g = new THREE.Group(); g.name = 's' + String(i + 1).padStart(2, '0'); root.add(g); return g; });

  // ══ S01: PARTICLE CLOUD (transplanted from /final phase4/scene-hero.js) ══
  // ★ /final particle cloud: triangle-outline particles, organic cloud shape,
  //     multi-lobe density field, custom ShaderMaterial with scatter support.
  // p5k: fixed seed (identical cluster every refresh) + count pinned to 4500
  // (was 15000·quality.particleMult = 9000 on the user's medium tier — the
  // overlap that read as white fog). phase4 source stays read-only: the seed
  // wraps the build call, the count goes in as a quality override.
  let _p5Seed = 0xC1A57E9 >>> 0;
  const _origRandom = Math.random;
  Math.random = function () { _p5Seed = (_p5Seed * 1664525 + 1013904223) >>> 0; return _p5Seed / 4294967296; };
  let heroWorld;
  try { heroWorld = buildHeroWorld({ ...quality, particleMult: 0.30 }); }
  finally { Math.random = _origRandom; }
  const pSys = heroWorld.userData?.particleSystem || null;
  const triGroup01 = heroWorld.userData?.triGroup || null;
  const proxySphere = heroWorld.userData?.proxySphere || null;
  const floaterGroup = heroWorld.userData?.floaterGroup || null;

  // Dispose unused hero children (rocks, stars, fog, product, etc.) — keep only particles
  const keepSet = new Set([pSys, triGroup01, proxySphere, floaterGroup].filter(Boolean));
  const toRemove = [];
  heroWorld.traverse(c => { if (c !== heroWorld && !keepSet.has(c) && c.parent) toRemove.push({ child: c, parent: c.parent }); });
  toRemove.forEach(({ child, parent }) => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
      else child.material.dispose();
    }
    parent.remove(child);
  });

  // Position cloud at Shot 01 center: Phase 5 cloud world center (0, 0.7, -9.0)
  // heroWorld origin sits at (-0.4, 0, -9.2); pSys local offset (0.4, 0.7, 0.2)
  // lands exactly on the world target. p5k scale 1.15 → cluster ~26-30% of
  // viewport width from the Shot 01 hold distance (was 0.9 ≈ 20%).
  heroWorld.position.set(-0.4, 0.0, -9.2);
  if (pSys) {
    pSys.scale.setScalar(1.15);

    // ── p5k cluster reshape (runtime edit of the transplanted geometry) ──
    // 1) Core-thinning radius remap: r → r^0.75 pushes inner particles
    //    outward, so the center stays grains-on-dark instead of collapsing
    //    into a solid white blob. Boundary stays at r=2.5 (pow keeps max).
    // 2) aLayer depth attribute vs the camera approach axis (local −z faces
    //    the Shot-01 camera): front 8% parallax layer, mid 62% main
    //    silhouette, back 30% dimmer/smaller. Read by the shader patch in
    //    main.js.
    const posAttr = pSys.geometry.getAttribute('aBasePos'); // same buffer as 'position'
    if (posAttr?.array) {
      const arr = posAttr.array, n = posAttr.count, cy = 0.3; // 0.3 = generation-time y offset
      for (let i = 0; i < n; i++) {
        const ix = i * 3, x = arr[ix], y = arr[ix + 1] - cy, z = arr[ix + 2];
        const r = Math.sqrt(x * x + y * y + z * z);
        if (r > 1e-5) {
          const k = (Math.pow(r / 2.5, 0.75) * 2.5) / r;
          arr[ix] = x * k; arr[ix + 1] = y * k + cy; arr[ix + 2] = z * k;
        }
      }
      posAttr.needsUpdate = true;
      const posAttr2 = pSys.geometry.getAttribute('position');
      if (posAttr2 && posAttr2 !== posAttr) posAttr2.needsUpdate = true;

      const layers = new Float32Array(n).fill(1);
      const order = Array.from({ length: n }, (_, i) => i).sort((a, b) => arr[a * 3 + 2] - arr[b * 3 + 2]);
      const nF = Math.round(n * 0.08), nB = Math.round(n * 0.30);
      for (let k = 0; k < nF; k++) layers[order[k]] = 2;          // nearest 8% — front parallax
      for (let k = n - nB; k < n; k++) layers[order[k]] = 0;       // farthest 30% — dim back
      pSys.geometry.setAttribute('aLayer', new THREE.BufferAttribute(layers, 1));
    }
  }
  // Entrance triangle: SAME local offset as pSys (0.4,0.7,0.2) → world (0,0.7,-9).
  // (Was set to local (0,0.7,-9) = world z≈-18.2, i.e. right on the camera → giant triangle bug.)
  if (triGroup01) { triGroup01.position.set(0.4, 0.7, 0.2); triGroup01.scale.setScalar(0.5); }
  // Proxy sphere for mouse: same transform as pSys so worldToLocal matches aBasePos space
  if (proxySphere) { proxySphere.position.set(0.4, 0.7, 0.2); proxySphere.scale.setScalar(1.15); }
  sg[0].add(heroWorld);
  const entTri = triGroup01;

  // ══ S01+S02: OPENING — phase2.html ENTRANCE + HERO port ══
  // p5p: the particle cluster/tunnel opening was replaced by phase2's
  // opening (user directive: 开头替换成 phase2.html). The transplanted
  // particle system above stays built (main.js guards on it) but sg[0] is
  // never shown; sg[1] now carries the phase2 heroWorld port and is visible
  // from p=0 until the pink wipe takes over at 0.120.
  const opening = buildOpeningWorld();
  sg[1].add(opening.group);

  // ══ S03: PINK FOG WIPE ══
  // ★ Directional sweep: each plane is a soft blob that enters from the RIGHT and
  // sweeps LEFT as uProgress advances (matches the rightward camera truck).
  // sin envelope → full coverage only near mid-shot, brief by construction.
  const occP = [];
  for (let i = 0; i < 3; i++) {
    const om = new THREE.ShaderMaterial({
      uniforms: { uProgress: { value: 0 }, uIndex: { value: i } },
      vertexShader: 'varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: 'uniform float uProgress,uIndex; varying vec2 vUv; void main(){ float pt=clamp(uProgress*1.35-0.12-uIndex*0.09,0.0,1.0); float env=sin(pt*3.14159); float cx=1.45-pt*1.9+sin(uIndex*1.8)*0.12; float cy=0.5+cos(uIndex*2.2)*0.18; float d=length((vUv-vec2(cx,cy))*vec2(1.15,1.5)); float a=smoothstep(1.0,0.1,d)*env*0.88; gl_FragColor=vec4(mix(vec3(.94,.74,.86),vec3(.84,.55,.74),vUv.y),a); }',
      transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide,
    });
    const op = new THREE.Mesh(new THREE.PlaneGeometry(20, 15), om);
    op.position.set(0, 0, 1.8 + i * 0.15); // Centered, very close to camera
    op.renderOrder = 999; op.material.depthTest = false;
    op.userData = { u: om.uniforms };
    sg[2].add(op); occP.push(op);
  }

  // ══ WATER + SKY (S04–S09 shared) ══
  const { material: wMat, mesh: wPlane } = createWater(quality.waterSegments || 80); wPlane.name = 'waterPlane';
  const skyM = new THREE.ShaderMaterial({ uniforms: { uTop: { value: new THREE.Color('#f2c8de') }, uBot: { value: new THREE.Color('#e8a8c8') } }, vertexShader: 'varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform vec3 uTop,uBot; varying vec2 vUv; void main(){ gl_FragColor=vec4(mix(uBot,uTop,vUv.y),1.); }', side: THREE.DoubleSide, dw: false });
  // Sky backdrop sits far AHEAD (+z) — the surface camera travels 0→+11 looking +z.
  // Oversized so frustum never catches an edge; bottom dips below the horizon line.
  const skyPl = new THREE.Mesh(new THREE.PlaneGeometry(140, 34), skyM); skyPl.position.set(0, 5, 40);
  const surfGrp = new THREE.Group(); surfGrp.name = 'surf'; surfGrp.add(skyPl); root.add(surfGrp);
  // p5p: the water plane lives on root (not inside surfGrp) so it can stay
  // visible during the phase2 opening (dark reflective sea) without also
  // revealing the bright pink sky backdrop. Still the single main water plane.
  root.add(wPlane);

  // Floater helper — bobbing AT the waterline (half-submerged), never flying above horizon
  function mkFl(n, geo, mat, zMin, zMax, yB, r = 0.35) { const m = new THREE.InstancedMesh(geo, mat, n); m.castShadow = m.receiveShadow = true; const d = []; for (let i = 0; i < n; i++) { const [x, y, z] = _sPos([-7, 7], [yB + 0.05, yB + 0.45], [zMin, zMax], r); const s = _rr(0.2, 0.8); _dummyPos.set(x, y, z); _dummyQuat.setFromEuler(new THREE.Euler(_r() * Math.PI, _r() * Math.PI, _r() * Math.PI)); _dummyScale.set(s, s, s); _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale); m.setMatrixAt(i, _dummyMatrix); d.push({ bX: x, bY: y, bZ: z, fs: 0.3 + _r() * 0.6, fp: _r() * Math.PI * 2, fa: 0.08 + _r() * 0.2 }); } m.instanceMatrix.needsUpdate = true; m.userData.instanceData = d; return m; }

  // ══ S04: FLOATERS ══ pastel stones/pearls on a bright pink sea — no dark silhouettes
  const mFlA = M(0x6a5c80, { r: 0.8 }), mFlB = M(0x5c4e70, { r: 0.85 }), mFlC = M(0x7a6c90, { r: 0.75 });
  sg[3].add(mkFl(8, geoIcoHi, mFlA, -3, 2, 0.1), mkFl(6, geoIco, mFlB, 2, 7, 0.15), mkFl(4, geoIco, mFlC, 7, 13, 0.2));
  const np04 = mkFl(5, geoSphereLo, mPearl, -1, 3, 0.05, 0.2); np04.userData.instanceData.forEach(d => { d.fa *= 0.5; d.bY = 0.05; }); sg[3].add(np04);
  sg[3].add(mkFl(3, geoSphereLo, mPearl, 7, 12, 0.05, 0.2));

  // ══ S05: SHELL & PEARL ══
  // ★ Two distinct shell halves (top/bottom), clearly separated, pearl nestled between
  const shellGrp = new THREE.Group(); shellGrp.name = 'shellGroup';
  // Top half — larger, arched upward, pinkish-cream matte (emissive lifts the camera-facing dark side)
  const mShellTop = M(0xf0d8c8, { r: 0.28, m: 0.02, e: 0x6a4a3a, ei: 0.45 });
  const shTop = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 0.85, 0, Math.PI * 0.7), mShellTop);
  shTop.scale.set(1.3, 0.45, 1.1); shTop.position.set(0, 0.22, 0.05); shTop.rotation.set(0.1, 0, 0.05); shellGrp.add(shTop);
  // Bottom half — slightly smaller, tilted open
  const mShellBot = M(0xe8c8b8, { r: 0.3, m: 0.02, e: 0x5a4032, ei: 0.45 });
  const shBot = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 0.8, 0, Math.PI * 0.65), mShellBot);
  shBot.scale.set(1.2, 0.4, 1.0); shBot.position.set(0, 0.0, -0.08); shBot.rotation.set(-0.35, 0, -0.05); shellGrp.add(shBot);
  // Inner glow — warm highlight inside the opening
  const shIn = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 6), M(0xfce8d8, { r: 0.2, t: true, o: 0.55, dw: false }));
  shIn.scale.set(1.0, 0.25, 0.7); shIn.position.set(0, 0.10, 0.0); shellGrp.add(shIn);
  // Pearl — bright, prominent, soft glow
  const pearl = new THREE.Mesh(geoSphereLo, new THREE.MeshBasicMaterial({ color: 0xfff8f0 }));
  pearl.scale.setScalar(0.3); pearl.position.set(0, 0.15, 0.05); shellGrp.add(pearl);
  // Pearl halo — subtle outer glow
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), M(0xfff8e8, { r: 0, t: true, o: 0.18, dw: false }));
  halo.position.copy(pearl.position); shellGrp.add(halo);
  // Position shell in right foreground, camera passes from left
  // ★ Position shell using camera-relative anchor at 26.5% (Shot 05 vfy)
  const cam05 = camAt(0.265);
  const shellPos = placeAtScreen(cam05, 0.35, 0.02, 3.8);
  shellGrp.position.copy(shellPos);
  shellGrp.scale.setScalar(1.5); // readable subject at the passing distance (was lost small)
  shellGrp.lookAt(cam05.pos);
  shellGrp.rotateX(-0.55); // tip the opening toward the low passing camera so the pearl reads
  shellGrp.userData = { ndcTarget: { x: 0.35, y: 0.02 }, dist: 3.8 };
  sg[4].add(shellGrp);
  // ★ No balance shell — removed clutter.

  // ══ S06: NUTRIENT FRAGMENTS ══
  // ★ Capsule fragments, thin crystal slices, small pearls — clear hierarchy, not uniform
  // ★ Screen-anchored to the Shot-06 camera (same pattern as the shell) so the
  //   subject is guaranteed on-frame above the near swell band.
  const cam06 = camAt(0.335);
  // Near group (2 large fragments, fast parallax)
  for (let i = 0; i < 2; i++) {
    const frag = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.35, 4, 8), M(0xe8d0b0, { r: 0.35, m: 0.08, e: 0x4a3820, ei: 0.4 }));
    frag.position.copy(placeAtScreen(cam06, i === 0 ? -0.40 : 0.36, i === 0 ? 0.10 : -0.02, i === 0 ? 2.7 : 3.4));
    frag.rotation.set(_rr(0, 1), _rr(0, Math.PI), _rr(0, 1)); frag.scale.setScalar(_rr(0.9, 1.3));
    sg[5].add(frag);
  }
  // Mid group (4 thin crystal slices, distributed along diagonal)
  for (let i = 0; i < 4; i++) {
    const slice = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.25), M(0xd8c8b0, { r: 0.3, m: 0.1, t: true, o: 0.75, dw: false, e: 0x3a2c1a, ei: 0.35 }));
    const sp6 = placeAtScreen(cam06, -0.55 + i * 0.36, 0.28 - (i % 2) * 0.22, 2.4 + i * 0.7);
    slice.position.copy(sp6);
    slice.rotation.set(_rr(0.3, 0.8), _rr(0, Math.PI * 2), _rr(0.2, 0.7));
    slice.scale.set(_rr(0.6, 1.3), 1, _rr(0.8, 1.5));
    sg[5].add(slice);
  }
  // Far group (6 small pearls/spheres, distant slow parallax)
  const farPearls = new THREE.InstancedMesh(geoSphereLo, M(0xf0e0d0, { r: 0.2, m: 0.05 }), 6);
  for (let i = 0; i < 6; i++) {
    const [x, y, z] = _sPos([-5, 5], [0.1, 1.0], [3, 8], 0.15, 3.0);
    const s = _rr(0.12, 0.3); _dummyPos.set(x, y, z); _dummyQuat.identity(); _dummyScale.set(s, s, s);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale); farPearls.setMatrixAt(i, _dummyMatrix);
  }
  farPearls.instanceMatrix.needsUpdate = true; farPearls.userData.instanceData = []; sg[5].add(farPearls);
  // No random cylinders — removed clutter. Clean fragments only.

  // ══ S07: CORAL ISLAND ══
  // ★ Restyled: tapered coral sticks in dusty coral tones (was bright plastic
  //   cylinders), smaller footprint shifted right so the stage copy stays clear.
  const island = new THREE.Group(); island.name = 'island'; island.position.set(-0.3, 0.05, 9.8); island.scale.setScalar(0.75);
  island.add(Q(new THREE.CylinderGeometry(1.8, 2.4, 0.4, 10), M(0xa08070, { r: 0.85 }), 0, -0.05, 0));
  const coralStickGeo = new THREE.CylinderGeometry(0.35, 1.0, 1.0, 6); // tapers upward — unit height, scaled per-instance
  for (let i = 0; i < 20; i++) { const a = _r() * Math.PI * 2, rd = 0.2 + _r() * 1.6; const st = Q(coralStickGeo, [mCoralP, mCoralO, mCoralY][Math.floor(_r() * 3)], Math.cos(a) * rd, 0.15 + _r() * 0.55, Math.sin(a) * rd, _rr(0.25, 0.5), _rr(0.3, 0.8), _rr(0.25, 0.5)); st.rotation.set(_rr(-0.12, 0.12), _r() * Math.PI, _rr(-0.12, 0.12)); island.add(st); }
  const foamR = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.07, 8, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, t: true, o: 0.18, dw: false })); foamR.rotation.x = Math.PI / 2; foamR.position.y = 0.02; island.add(foamR);
  sg[6].add(island);
  const refl = new THREE.Group(); refl.position.set(-0.3, -0.05, 9.8); refl.scale.setScalar(0.75); refl.add(Q(new THREE.CylinderGeometry(1.8, 2.4, 0.4, 10), M(0xa08070, { r: 0.95, t: true, o: 0.15, dw: false }), 0, -0.05, 0, 1, -1, 1)); sg[6].add(refl);

  // ══ S08: BIG FISH ══
  const bigFish = new THREE.Group(); bigFish.name = 'bigFish';
  const fBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 8), mFish); fBody.rotation.z = Math.PI / 2; bigFish.add(fBody);
  const fHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), mFish); fHead.position.set(0.5, 0, 0); bigFish.add(fHead);
  const fTP = new THREE.Group(); fTP.position.set(-0.45, 0, 0); const fTF = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.34, 0.03), mFishFin); fTF.position.set(-0.08, 0, 0); fTP.add(fTF); bigFish.add(fTP);
  bigFish.add(Q(new THREE.BoxGeometry(0.12, 0.03, 0.1), mFishFin, 0, 0.19, 0));
  bigFish.add(Q(new THREE.SphereGeometry(0.04, 6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }), 0.55, 0.04, 0.13));
  bigFish.scale.setScalar(2.1); // ★ Reads as a large silhouette crossing the frame
  bigFish.position.set(6, 0.5, 9); bigFish.visible = false;
  bigFish.userData = { tailPivot: fTP };
  sg[7].add(bigFish);

  // ══ S09: WATER CROSSING ══
  const causticP = new THREE.Mesh(new THREE.PlaneGeometry(25, 25), new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 } }, vertexShader: 'varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform float uTime; varying vec2 vUv; void main(){ float c=sin(vUv.x*30.+uTime*1.5)*cos(vUv.y*25.-uTime*1.2)*.15; gl_FragColor=vec4(vec3(.6,.4,.8)+c,.1); }', transparent: true, depthWrite: false, side: THREE.DoubleSide })); causticP.rotation.x = -Math.PI / 2; causticP.position.y = -0.5; causticP.renderOrder = 1; sg[8].add(causticP);

  // ══ S10: CAPSULE ══
  for (let side = -1; side <= 1; side += 2) { const m2 = new THREE.InstancedMesh(geoIco, mReef, 6); for (let i = 0; i < 6; i++) { const s = _rr(0.5, 1.0); _dummyPos.set(side * (3.5 + _r() * 1.5), -5.5 + i * 0.6, 10 + i * 1.5); _dummyQuat.setFromEuler(new THREE.Euler(_r() * 0.3, _r() * Math.PI, _r() * 0.3)); _dummyScale.set(s, s, s); _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale); m2.setMatrixAt(i, _dummyMatrix); } m2.instanceMatrix.needsUpdate = true; m2.castShadow = true; sg[9].add(m2); }
  const bGeo = new THREE.CylinderGeometry(0.08, 0.8, 9, 8, 1, true); const bMFn = () => new THREE.MeshBasicMaterial({ color: 0x9988cc, t: true, o: 0.06, dw: false, side: THREE.DoubleSide });
  const b1 = new THREE.Mesh(bGeo, bMFn()); b1.position.set(4, 2, 12); b1.rotation.z = 0.5; sg[9].add(b1);
  const b2 = new THREE.Mesh(bGeo.clone(), bMFn()); b2.position.set(-3, 2, 13); b2.rotation.z = -0.4; sg[9].add(b2);
  const capG = new THREE.Group(); capG.name = 'capG';
  capG.add(Q(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), mCapsule, 0, 0.2, 0));
  capG.add(Q(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mCapsule, 0, 0.575, 0));
  capG.add(Q(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), mCapsuleI, 0, -0.7, 0));
  capG.add(Q(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mCapsuleI, 0, -1.075, 0));
  const coreS = new THREE.Mesh(geoSphere, mCoreGlass); coreS.position.y = -0.35; coreS.scale.setScalar(0.65); capG.add(coreS);
  for (let i = 0; i < 8; i++) capG.add(Q(new THREE.IcosahedronGeometry(0.06, 0), mPlant, _rr(-0.35, 0.35), -0.35 + _rr(-0.4, 0.4), _rr(-0.35, 0.35)));
  capG.scale.setScalar(0.55);
  const capLight = new THREE.PointLight(0xb0a0ff, 4, 8); capLight.position.set(0.6, 0.6, 0.8); capG.add(capLight);
  const cCam = camAt(0.615); const cPos = placeAtScreen(cCam, 0.38, 0.06, 3.5); capG.position.copy(cPos); capG.updateMatrixWorld(true);
  sg[9].add(capG);

  // ══ S11–S15: BENEFIT NODES ══
  const ndDefs = [
    { nm:'Energy Levels',      cm: mEnergyC, cg: new THREE.IcosahedronGeometry(0.22, 1), ndc:{x:-0.08,y:0.04} },
    { nm:'Cognitive Function', cm: mCogC,    cg: new THREE.TetrahedronGeometry(0.2, 1),  ndc:{x:0.06,y:-0.02} },
    { nm:'Skin Health',        cm: mSkinC,   cg: new THREE.SphereGeometry(0.2, 12, 8),   ndc:{x:-0.10,y:0.02} },
    { nm:'Respiratory Health', cm: mRespC,   cg: new THREE.TorusKnotGeometry(0.18, 0.06, 40, 8), ndc:{x:0.04,y:0.03} },
    { nm:'Digestive Health',   cm: mDigC,    cg: new THREE.TorusGeometry(0.18, 0.06, 12, 16), ndc:{x:-0.06,y:-0.02} },
  ];
  const bn = [];
  ndDefs.forEach((def, idx) => {
    const ng = new THREE.Group(); ng.name = 'bn' + idx;
    const coreM = new THREE.Mesh(def.cg, def.cm); coreM.scale.setScalar(1.6); ng.add(coreM);
    const sp = new THREE.Mesh(geoSphere, mBenS.clone()); sp.scale.setScalar(0.7); ng.add(sp);
    const rn = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 16, 32), mBenR.clone()); rn.name = 'ring'; ng.add(rn);
    ng.scale.setScalar(0.7); ng.userData = { idx, nm: def.nm, sphere: sp, ring: rn, act: 0 };
    bn.push(ng); sg[10 + idx].add(ng);
  });
  const cb1 = Q(geoCyl, mReef, 2.5, -2.8, 15.2, 0.5, 1.5, 0.3); cb1.visible = false; sg[11].add(cb1);
  const cb2 = Q(geoCyl, mReefDark, -1.8, -3.5, 18.8, 0.4, 1.8, 0.4); cb2.visible = false; sg[14].add(cb2);

  // ══ S16: INGREDIENTS ══
  for (let i = 0; i < 2; i++) { const hz = new THREE.Mesh(new THREE.PlaneGeometry(18, 12), new THREE.ShaderMaterial({ uniforms: { uColor: { value: new THREE.Color().setHSL(0.75, 0.3, 0.2 + i * 0.1) } }, vertexShader: 'varying vec2 vUv; void main() { vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'uniform vec3 uColor; varying vec2 vUv; void main(){ float a=.08*(1.-length(vUv-.5)*1.5); gl_FragColor=vec4(uColor,max(0.,a)); }', transparent: true, depthWrite: false, side: THREE.DoubleSide })); hz.position.set(0, -2.5 + i * 1.5, 21 + i * 2); sg[15].add(hz); }
  const ingA = [];
  const ingCols = [0xa0d8b0, 0xe0c090, 0xc8b8e0, 0x90c8d8, 0xe0a8b0, 0xb8d890];
  for (let i = 0; i < 6; i++) { const a = new THREE.Mesh(geoSphereLo, new THREE.MeshBasicMaterial({ color: ingCols[i], t: true, o: 0.85, dw: false })); a.position.set((i - 2.5) * 1.05, -3.9 + Math.sin(i * 0.8) * 0.5, 17.6 + Math.cos(i * 0.6) * 0.8); a.scale.setScalar(0.16); a.userData = { ing: i }; sg[15].add(a); ingA.push(a); }

  // ══ S17: FINAL REVEAL ══
  const rSbd = new THREE.Mesh(new THREE.PlaneGeometry(25, 30, 15, 15), M(0x1a1530, { r: 0.92 })); rSbd.rotation.x = -Math.PI / 2; rSbd.position.y = -5.38; rSbd.receiveShadow = true; sg[16].add(rSbd); // -5.38: clears the shared uw seabed at -5.5 (z-fight stripes)
  const rfBlk = Q(geoIcoHi, mReefDark, 3.5, -3.5, 22, 2.5, 3.0, 2.0); rfBlk.name = 'reefBlock'; sg[16].add(rfBlk);
  for (let side = -1; side <= 1; side += 2) { const m2 = new THREE.InstancedMesh(geoIco, mReef, 4); for (let i = 0; i < 4; i++) { const x = side * (5 + _r() * 2), y = -5 + _r() * 1.5, z = 20 + i * 2, s = _rr(0.5, 1.0); _dummyPos.set(x, y, z); _dummyQuat.setFromEuler(new THREE.Euler(_r() * 0.3, _r() * Math.PI, _r() * 0.3)); _dummyScale.set(s, s, s); _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale); m2.setMatrixAt(i, _dummyMatrix); } m2.instanceMatrix.needsUpdate = true; sg[16].add(m2); }

  // ══ S18: FINAL CTA ══
  const fS = new THREE.Mesh(new THREE.PlaneGeometry(20, 20, 12, 12), M(0x181230, { r: 0.92 })); fS.rotation.x = -Math.PI / 2; fS.position.y = -5.3; fS.receiveShadow = true; sg[17].add(fS);
  const triG = new THREE.Group(); triG.name = 'triG';
  const tM = [mGoldB, mGold, M(0xb89060, { r: 0.3, m: 0.8, e: 0x6a4a10, ei: 0.8 }), mGoldB];
  for (let t = 0; t < 4; t++) triG.add(buildTri(0.9 - t * 0.18, 0.03, tM[t]));
  // Gold key light — the mark must glow from afar during the S17 approach
  const triLight = new THREE.PointLight(0xffd88a, 7, 16, 1.6); triLight.position.set(0, 0.6, 1.2); triG.add(triLight);
  // ★ Rock plinth + coral accents under the golden mark (reference: the golden
  //   pyramid STANDS on dark rocks with pink coral — grounded, not floating)
  const triBase = Q(geoIcoHi, mReefDark, 0, -1.5, 0, 1.7, 1.05, 1.5); triBase.rotation.set(0.2, 0.6, 0.1); triG.add(triBase);
  const triBase2 = Q(geoIco, mReef, 1.05, -1.75, 0.35, 0.85, 0.6, 0.75); triBase2.rotation.set(0.1, 1.2, 0.3); triG.add(triBase2);
  const triBase3 = Q(geoIco, mReef, -0.95, -1.8, -0.2, 0.7, 0.5, 0.65); triBase3.rotation.set(-0.2, 0.4, -0.15); triG.add(triBase3);
  for (let ci = 0; ci < 5; ci++) { const ca = -0.6 + ci * 0.28; triG.add(Q(geoCyl, [mCoralP, mCoralO, mCoralY][ci % 3], -1.15 + Math.cos(ca) * 0.35, -1.45 + _r() * 0.25, 0.3 + Math.sin(ca) * 0.3, _rr(0.2, 0.35), _rr(0.35, 0.7), _rr(0.2, 0.35))); }
  const cTri = camAt(0.975); const tP = placeAtScreen(cTri, 0.42, 0.02, 5.2); triG.position.copy(tP); triG.lookAt(cTri.pos); triG.updateMatrixWorld(true);
  root.add(triG); // ★ NOT sg[17]: the group is hidden until the 0.938 crossfade, which
                  // made the "S17 far-away reveal" impossible (triangle invisible at 0.910–0.938).
                  // On root it is driven solely by triG.visible below.

  // ══ UW SHARED (S09+ background) ══
  const uwSh = new THREE.Group(); uwSh.name = 'uwSh';
  uwSh.add(Q(new THREE.PlaneGeometry(40, 60, 20, 20), mSeabed, 0, -5.5, 0)); // seabed as child via Q with y offset
  // Wait, Q already sets position. Let me use it differently:
  // Actually the Q above puts it at (0,-5.5,0) with scale 1,1,1. But rotation needs to be set separately.
  // Let me just redo this part:
  uwSh.clear();
  const sbd = new THREE.Mesh(new THREE.PlaneGeometry(40, 60, 20, 20), mSeabed); sbd.rotation.x = -Math.PI / 2; sbd.position.y = -5.5; uwSh.add(sbd);
  const snC = Math.round(200 * (quality.particleMult || 1)); const snG = new THREE.BufferGeometry(); const snP = new Float32Array(snC * 3);
  for (let i = 0; i < snC; i++) { snP[i * 3] = _rr(-15, 15); snP[i * 3 + 1] = _rr(-6, 8); snP[i * 3 + 2] = _rr(-5, 35); } snG.setAttribute('position', new THREE.BufferAttribute(snP, 3));
  const snS = new THREE.Points(snG, new THREE.PointsMaterial({ color: 0xccccdd, size: 0.06, t: true, o: 0.3, blend: THREE.AdditiveBlending, dw: false })); uwSh.add(snS);
  const bubs = [];
  for (let i = 0; i < 18; i++) { const [bx, by, bz] = _sPos([-6, 6], [-5, 6], [0, 30], 0.1, 1.5); const b = new THREE.Mesh(new THREE.SphereGeometry(0.04 + _r() * 0.08, 6, 4), new THREE.MeshPhysicalMaterial({ color: 0xe0d8f8, roughness: 0.05, t: true, o: 0.25 })); b.position.set(bx, by, bz); b.userData = { rs: 0.15 + _r() * 0.4, wa: 0.1 + _r() * 0.3, wp: _r() * Math.PI * 2 }; uwSh.add(b); bubs.push(b); }
  root.add(uwSh);

  // ═══════════════════════════════════════════════════════════════
  // SHOT CROSSFADE PREP
  // Clone per-group materials so adjacent shots can dissolve through each
  // other (module-level materials are shared across groups and cannot fade
  // independently). ShaderMaterials are skipped — they carry their own fade
  // uniforms; cloning would sever the userData.u uniform references.
  // ═══════════════════════════════════════════════════════════════
  const XFADE = 0.012; // crossfade band width in global progress
  const groupFaders = sg.map(() => null);
  for (let i = 2; i < sg.length; i++) {
    const mats = [], lights = [];
    sg[i].traverse(c => {
      if (c.isLight) { lights.push({ l: c, base: c.intensity }); return; }
      if (!c.material || c.material.isShaderMaterial || c.userData?.u) return;
      const cl = c.material.clone();
      cl.userData.baseOpacity = c.material.opacity;
      cl.userData.baseTransparent = c.material.transparent;
      c.material = cl;
      if (!mats.includes(cl)) mats.push(cl);
    });
    groupFaders[i] = { mats, lights };
  }

  // ═══════════════════════════════════════════════════════════════
  // VISIBILITY UPDATE
  // ═══════════════════════════════════════════════════════════════
  function updateVisibility(p) {
    // Find current shot using half-open rule
    let si = 0;
    for (let i = 0; i < shots.length; i++) {
      const isLast = (i === shots.length - 1);
      if (p >= shots[i].s && (isLast ? p <= shots[i].e : p < shots[i].e)) { si = i; break; }
    }
    // ★ p5p: phase2 opening replaces the particle cluster/tunnel —
    // sg[0] (transplanted particle cloud) stays built but never renders;
    // sg[1] (phase2 heroWorld port) is visible from p=0 until the pink wipe.
    sg[0].visible = false;
    sg[1].visible = p < 0.125;
    // Crossfaded visibility for shots 3–18: smoothstep dissolve across a
    // narrow band around each boundary instead of a hard cut.
    for (let i = 2; i < sg.length; i++) {
      const s = shots[i];
      let f = 0;
      if (p > s.s - XFADE && p < s.e + XFADE) {
        const fin = Math.min(1, Math.max(0, (p - (s.s - XFADE)) / XFADE));
        const fout = Math.min(1, Math.max(0, ((s.e + XFADE) - p) / XFADE));
        f = Math.min(fin, fout);
        f = f * f * (3 - 2 * f);
      }
      sg[i].visible = f > 0.003;
      sg[i].userData._fade = f;
      const gf = groupFaders[i];
      if (gf) {
        for (const m of gf.mats) { m.opacity = m.userData.baseOpacity * f; m.transparent = m.userData.baseTransparent || f < 0.995; }
        for (const li of gf.lights) li.l.intensity = li.base * Math.max(f, 0.001);
      }
    }
    // Entrance triangle of the old particle opening: retired (p5p)
    triGroup01.visible = false;

    // p5p: the coral island doubles as the phase2 opening backdrop (the warm
    // coral accents on the horizon in phase2's ENTRANCE/HERO frames). The
    // crossfade loop above zeroes it at p<0.125, so restore it here.
    if (p < 0.125) {
      sg[6].visible = true; sg[6].userData._fade = 1;
      const gf6 = groupFaders[6];
      if (gf6) {
        for (const m of gf6.mats) { m.opacity = m.userData.baseOpacity; m.transparent = m.userData.baseTransparent; }
        for (const li of gf6.lights) li.l.intensity = li.base;
      }
    }

    // Water plane: visible from the phase2 opening (dark reflective sea at
    // y=0) through the surface chapters, hidden once the dive completes.
    wPlane.visible = p < 0.595;
    surfGrp.visible = p >= 0.155 && p < 0.600;
    // Sky backdrop only above the surface — hide once the dive begins
    skyPl.visible = p < 0.545;

    // Big fish: S08 only
    bigFish.visible = p >= 0.450 && p < 0.530;
    if (bigFish.visible) {
      const ft = (p - 0.450) / 0.080;
      bigFish.position.set(6 + (-5 - 6) * ft, 0.5 + (0.3 - 0.5) * ft, 9 + (10 - 9) * ft);
      bigFish.lookAt(bigFish.position.x - 1.5, bigFish.position.y, bigFish.position.z);
    }

    // Pink fog S03 — directional sweep driven directly by local progress
    if (sg[2].visible) { const lt = Math.max(0, Math.min(1, (p - 0.120) / 0.040)); occP.forEach((op) => { op.userData.u.uProgress.value = lt; }); }

    // Caustic S09
    causticP.visible = p >= 0.530 && p < 0.590;

    // Capsule: S10–S12 — discovered small in the distance, grows as camera nears
    capG.visible = p >= 0.590 && p < 0.715;
    if (capG.visible) {
      const ct = Math.max(0, Math.min(1, (p - 0.590) / 0.050));
      const ce = ct * ct * (3 - 2 * ct);
      capG.scale.setScalar(0.34 + 0.21 * ce);
    }

    // Benefit nodes: each visible only during its shot
    bn.forEach((n, idx) => { n.visible = si === (10 + idx); });
    // Activation in its shot
    bn.forEach((n, idx) => {
      if (!n.visible) { n.userData.act = 0; return; }
      const s = shots[10 + idx];
      const mid = (s.s + s.e) / 2;
      const act = Math.max(0, Math.min(1, 1 - Math.abs(p - mid) / 0.020));
      const gFade = sg[10 + idx].userData._fade ?? 1;
      n.scale.setScalar(0.5 + act * 0.6);
      n.userData.sphere.material.opacity = (0.22 + act * 0.55) * gFade;
      n.userData.ring.visible = act > 0.3;
      n.userData.act = act;
    });

    // Coral branches (brief occlusion)
    cb1.visible = p >= 0.673 && p < 0.680;
    cb2.visible = p >= 0.780 && p < 0.787;

    // Reef block S17→S18
    rfBlk.visible = p >= 0.910 && p < 0.930;

    // Triangle: S17 far-away reveal → S18 full-size settle
    triG.visible = p >= 0.910;
    if (triG.visible) {
      const gt = Math.max(0, Math.min(1, (p - 0.910) / 0.045));
      const ge = gt * gt * (3 - 2 * gt);
      triG.scale.setScalar(0.78 + 0.22 * ge);
      triLight.intensity = 7 * Math.min(1, (p - 0.910) / 0.025); // soft ramp-in, no pop
    }

    // Particle fade during scatter: handled by main.js animation loop

    // UW shared
    uwSh.visible = p >= 0.530;
    if (uwSh.visible) snS.material.opacity = 0.3 * Math.min(1, (p - 0.530) / 0.04);
  }

  // ══ AUDIT ══
  // Subject map: shot index → actual subject object
  const subjMap = {
    0: opening.productCan, 1: opening.productCan, 2: occP, 3: sg[3], 4: shellGrp, 5: sg[5],
    6: island, 7: bigFish, 8: wPlane, 9: capG,
    10: bn[0], 11: bn[1], 12: bn[2], 13: bn[3], 14: bn[4],
    15: ingA, 16: rfBlk, 17: triG,
  };

  function auditAllShots(camera) {
    const results = [];
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i]; const p = s.vfy;
      updateVisibility(p);
      root.updateMatrixWorld(true);
      const cs = getCameraAt(p, false);
      const subj = subjMap[i] || null;
      const subjName = s.sub || 'none';
      const vis = subj ? (Array.isArray(subj) ? subj.length > 0 && subj[0].visible : subj.visible) : false;
      const box = new THREE.Box3(); let boxOk = false, inFru = false, sx = NaN, sy = NaN;
      if (vis && subj) {
        const target = Array.isArray(subj) ? subj[0] : subj;
        box.setFromObject(target); boxOk = !box.isEmpty() && isFinite(box.min.x);
        if (boxOk) { const vc = box.getCenter(new THREE.Vector3()); vc.project(camera); if (isFinite(vc.x) && vc.z > 0 && vc.z < 1) { inFru = Math.abs(vc.x) < 1.2 && Math.abs(vc.y) < 1.2; sx = ((vc.x + 1) / 2) * 100; sy = ((1 - vc.y) / 2) * 100; } }
      }
      const camOk = isFinite(cs.pos.x) && isFinite(cs.look.x) && isFinite(cs.fov);
      const ok = camOk && vis && boxOk && inFru && isFinite(sx);
      results.push({ shot: i + 1, name: s.n, progress: p, resolvedShot: getShotIdx(p) + 1, cameraFinite: camOk, targetFinite: isFinite(cs.look.x), subjectName: subjName, subjectVisible: vis, boxFinite: boxOk, inFrustum: inFru, screenX: isFinite(sx) ? sx.toFixed(1) : '-', screenY: isFinite(sy) ? sy.toFixed(1) : '-', status: ok ? 'PASS' : 'FAIL' });
    }
    return results;
  }

  function getShotIdx(p) { for (let i = 0; i < shots.length; i++) { const isLast = (i === shots.length - 1); if (p >= shots[i].s && (isLast ? p <= shots[i].e : p < shots[i].e)) return i; } return 0; }

  return {
    rootGroup: root, updateVisibility, auditAllShots,
    waterMat: wMat, waterPlane: wPlane, skyPlane: skyPl, surfGroup: surfGrp,
    shotGroups: sg, occPlanes: occP, bigFish, island, refl, foamRing: foamR,
    capG, benefitNodes: bn, triG, snS, bubbles: bubs, causticP,
    correctVisualCenterToNDC, checkPositionOverwrite: chkPosOver, camAt,
    ingAnchors: ingA, reefBlock: rfBlk, g02: sg[1], g03: sg[2], g07: sg[6], g16: sg[15], pSys01: pSys,
    _heroWrapper: heroWorld, _proxySphere: proxySphere, _triGroup: triGroup01,
    opening, // p5p: phase2 ENTRANCE+HERO port ({group, triGroup, productCan, starsGroup, fogPlanes, update})
    // For audit
    shellGroup: shellGrp, sg5: sg[5],
  };
}
