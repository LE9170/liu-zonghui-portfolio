import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { quality } from '../phase3/quality-manager.js?v=20260806-p5p';
import { createScrollController } from '../phase3/scroll-controller.js?v=20260806-p5p';
import { ResponsiveController } from '../phase3/responsive.js?v=20260806-p5p';
import { setupErrorHandling, checkWebGLSupport, verifyRendererContext } from '../phase3/error-handler.js?v=20260806-p5p';
import { checkReducedMotion, setupReducedMotionListener } from '../phase3/reduced-motion.js?v=20260806-p5p';

import { getCameraAt, getShotIndex, getLocalProgress, getAllShots, getShotCount } from './camera-rig.js?v=20260806-p5p';
import { getEnvConfig, applyEnvConfig } from './chapter-controller.js?v=20260806-p5p';
import { buildPhase5Scene } from './scene-factory.js?v=20260806-p5p';
import { createDebugHUD, updateDebugHUD, setupDebugKeyboard, isDebug } from './debug-hud.js?v=20260806-p5p';
import { createPolish } from './polish.js?v=20260806-p5p';
import { createDof } from './dof.js?v=20260806-p5p';

console.log('Phase 5A.3 — 18 shots');

// ═══════════════════════════════ ERROR COLLECTOR (verification aid)
// Any runtime error / unhandled rejection is counted and surfaced as a red
// banner so headless screenshots expose failures without console access.
const __errors = [];
window.addEventListener('error', (e) => { __errors.push(String(e.message || e)); __paintErrBadge(); });
window.addEventListener('unhandledrejection', (e) => { __errors.push('rej: ' + String(e.reason)); __paintErrBadge(); });
function __paintErrBadge() {
  let b = document.getElementById('p5-err-badge');
  if (!b) {
    b = document.createElement('div'); b.id = 'p5-err-badge';
    b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:999;background:#c02020;color:#fff;font:12px monospace;padding:4px 10px;white-space:pre-wrap;';
    document.body.appendChild(b);
  }
  b.textContent = 'ERRORS(' + __errors.length + '): ' + __errors.slice(0, 3).join(' | ');
}

// ═══════════════════════════════ DOM
const canvas = document.getElementById('phase5-canvas');
const loadingScreen = document.getElementById('loading-screen');
const initErrorEl = document.getElementById('init-error');
const chapterLabel = document.getElementById('chapter-label');
const globalP = document.getElementById('global-progress');
const localP = document.getElementById('local-progress');
const mainTitle = document.getElementById('main-title');
const subtitle = document.getElementById('subtitle');
const stageTitle = document.getElementById('stage-title');
const stageSub = document.getElementById('stage-sub');
const ctaButton = document.getElementById('cta-button');
const footerPanel = document.getElementById('footer-panel');
const ingredientIcons = document.querySelectorAll('.ingredient-icon');
const benefitCards = document.querySelectorAll('.benefit-card');

const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;

// ═══════════════════════════════ MOUSE TRACKING
const mouseNDC = new THREE.Vector2(999, 999);
let mouseOnCanvas = false;
canvas.addEventListener('mousemove', (e) => { mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1; mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1; }, { passive: true });
canvas.addEventListener('mouseenter', () => { mouseOnCanvas = true; });
canvas.addEventListener('mouseleave', () => { mouseOnCanvas = false; });

// ═══════════════════════════════ ERROR
function showInitError(t, d) {
  console.error(`Phase5: ${t}`, d);
  if (loadingScreen) loadingScreen.style.display = 'none';
  if (initErrorEl) {
    initErrorEl.hidden = false;
    initErrorEl.innerHTML = `<h3>${t}</h3><pre style="font-size:0.7rem;color:#e08060;max-width:600px;overflow:auto;white-space:pre-wrap;text-align:left;margin-top:0.5rem">${d}</pre><p><button onclick="location.reload()">Retry</button></p>`;
  }
}
function hideInitError() { if (initErrorEl) initErrorEl.hidden = true; }
if (!checkWebGLSupport()) { showInitError('WebGL', 'Not supported.'); throw new Error('WebGL'); }

// ═══════════════════════════════ RENDERER
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' }); verifyRendererContext(renderer); }
catch (e) { showInitError('GPU', e.stack || e.message); throw e; }
// p5n: desktop renders at up to 2x DPR like phase2 (clarity); mobile keeps the
// quality tier cap for perf. quality-manager file itself is untouched.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? quality.dprCap : Math.max(quality.dprCap, 2)));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = quality.shadowEnabled;
if (quality.shadowEnabled) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ═══════════════════════════════ SCENE + CAMERA
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0a0a14');
scene.fog = new THREE.FogExp2(0x121020, 0.006);
const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.3, 100);
camera.position.set(0, 0.5, -9); camera.lookAt(0, 0.55, 0);

// ═══════════════════════════════ COMPOSER
let composer;
try { composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera)); const b = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.05, 0.22, 0.92); composer.addPass(b); composer.passes[composer.passes.length - 1].renderToScreen = true; }
catch (e) { showInitError('Composer', e.stack || e.message); throw e; }

// ═══════════════════════════════ LIGHTING
const ambientLight = new THREE.AmbientLight('#1a1a3a', 0.3);
const dirLight = new THREE.DirectionalLight('#ffffff', 0.5); dirLight.position.set(5, 8, 3);
const uwFill1 = new THREE.PointLight('#664488', 0.5, 12); uwFill1.position.set(-3, -2, 12);
const uwFill2 = new THREE.PointLight('#446688', 0.5, 12); uwFill2.position.set(3, -3, 16);
const uwFill3 = new THREE.PointLight('#553366', 0.5, 14); uwFill3.position.set(0, -4, 20);
scene.add(ambientLight, dirLight, uwFill1, uwFill2, uwFill3);

// ═══════════════════════════════ BUILD
let sd;
try { sd = buildPhase5Scene(); scene.add(sd.rootGroup); hideInitError(); }
catch (e) { showInitError('Scene Build', e.stack || e.message); throw e; }

// ═══════════════════════════════ OPENING-CLUSTER SHARPNESS PATCH
// The particle material/buffers are built by phase4's buildHeroWorld (phase4
// sources are read-only) — so all sharpness fixes are runtime patches here.
// Root cause of the "blurry color blobs": 80% of particles are triangle
// OUTLINES whose stroke is a fixed fraction of the point (0.015–0.05 coord
// units). At the opening distance points are only 2–6px, so the stroke is
// sub-pixel → every triangle renders as a faint soft smudge, and ~12k of them
// layer into the gray mush cloud. Fix: pass the pixel point size to the
// fragment stage and collapse small points to crisp hard-core dots; the
// original dot/triangle shapes blend back in above ~9px (near-camera shots
// keep their phase4 look). Plus luminance-desaturating the cool cyan/teal
// palette entries that opposed the pinks and read as red-cyan ghosting.
// No geometry/count/position changes.
try {
  const pmat = sd.pSys01?.material;
  if (pmat && pmat.isShaderMaterial && typeof pmat.vertexShader === 'string' && typeof pmat.fragmentShader === 'string') {
    let vs = pmat.vertexShader;
    const vsBefore = vs;
    vs = vs.replace('varying float vType;', 'varying float vType;\n  varying float vPxSize;\n  varying float vLayer;');
    vs = vs.replace('attribute float aBrightness; // mouse-driven brightness boost',
      'attribute float aBrightness; // mouse-driven brightness boost\n  attribute float aLayer; // phase5: 0=back 1=mid 2=front depth layer');
    vs = vs.replace('uniform float uPointSize;',
      'uniform float uPointSize;\n  uniform vec3 uCamLocal;  // phase5: camera pos in particle-local space\n  uniform float uCamRepel; // phase5: channel-parting strength 0..1');
    // Gentler mouse dent (local, soft, springs back — no permanent scatter)
    vs = vs.replace('float repulse = mouseInfluence * 0.18;', 'float repulse = mouseInfluence * 0.12;');
    vs = vs.replace('vBrightness = mouseInfluence * 0.45;', 'vBrightness = mouseInfluence * 0.30;');
    // Camera-approach channel: particles part ahead of the pushing camera so
    // the 3%→5.5% push reads as "entering" the cloud, not flattening it.
    vs = vs.replace('// ── 3. Scroll scatter',
      `// ── phase5 camera-repel channel (fades out as scroll scatter takes over) ──
    float p5camDist = distance(pos, uCamLocal);
    float p5camInf = (1.0 - smoothstep(0.0, 3.2, p5camDist)) * uCamRepel;
    if (p5camInf > 0.001) {
      vec3 p5away = pos - uCamLocal;
      p5away = length(p5away) < 0.0001 ? vec3(0.0, 1.0, 0.0) : normalize(p5away);
      pos += p5away * p5camInf * 1.1;
    }

    // ── 3. Scroll scatter`);
    vs = vs.replace('float baseSize = uPointSize * aSize * sizeBoost * scatterShrink * (140.0 / depth);',
      'float baseSize = uPointSize * aSize * sizeBoost * scatterShrink * (140.0 / depth) * (aLayer < 0.5 ? 0.62 : (aLayer > 1.5 ? 0.88 : 1.0));');
    vs = vs.replace('gl_PointSize = clamp(baseSize, 2.0, 22.0);',
      'gl_PointSize = clamp(baseSize, 2.0, 14.0);\n    vPxSize = gl_PointSize;\n    vLayer = aLayer;'); // p5k: 22→14 caps near-camera giants
    if (vs !== vsBefore) pmat.vertexShader = vs;
    else console.warn('phase5: particle vertex patch found no anchors (skipped)');
    // uniforms for the camera-repel channel (driven per-frame in the loop)
    pmat.uniforms.uCamLocal = pmat.uniforms.uCamLocal || { value: new THREE.Vector3(999, 999, 999) };
    pmat.uniforms.uCamRepel = pmat.uniforms.uCamRepel || { value: 0 };

    let fs = pmat.fragmentShader;
    const fsBefore = fs;
    fs = fs.replace('varying float vType;', 'varying float vType;\n  varying float vPxSize;\n  varying float vLayer;');
    fs = fs.replace('color = mix(color, vec3(1.0, 0.97, 0.9), vBrightness * 0.35);',
      `// phase5 grain fix: small points collapse to crisp hard-core dots.
    // p5k: tighter core, lower alpha (0.62), less white pull (0.16) — grains
    // stay individually readable instead of stacking into a white mass;
    // large (>9px) tunnel particles keep their shape at 0.70 alpha so the
    // fly-through never whites out the frame. Depth layers: back dimmed.
    {
      float p5d = length(uv - 0.5);
      float p5dotA = (1.0 - smoothstep(0.20, 0.38, p5d)) * 0.78;
      vec3 p5dotC = mix(vColor * 1.3, vec3(1.0), 0.30); // luminous grain, hue kept
      float p5w = smoothstep(6.0, 9.0, vPxSize);
      alpha = mix(p5dotA, alpha * 0.82, p5w);
      color = mix(p5dotC, color, p5w);
      float p5lA = vLayer < 0.5 ? 0.62 : (vLayer > 1.5 ? 0.85 : 1.0);
      alpha *= p5lA;
      color *= (vLayer < 0.5 ? 0.82 : 1.0);
      // anti-core: thin the very center so it cannot accumulate into a blob
      alpha *= mix(0.70, 1.0, smoothstep(0.02, 0.30, vDistToCenter));
    }
    color = mix(color, vec3(1.0, 0.97, 0.9), vBrightness * 0.35);`);
    // Defined cluster boundary: edge fade happens over the outer ~20% only
    fs = fs.replace('float edgeFade = 1.0 - smoothstep(0.65, 1.0, vDistToCenter);',
      'float edgeFade = 1.0 - smoothstep(0.78, 0.97, vDistToCenter);');
    if (fs !== fsBefore) { pmat.fragmentShader = fs; pmat.needsUpdate = true; }
    else console.warn('phase5: particle fragment patch found no anchors (skipped)');
  }
  const colAttr = sd.pSys01?.geometry?.attributes?.aColor;
  if (colAttr?.array) {
    const a = colAttr.array;
    for (let i = 0; i + 2 < a.length; i += 3) {
      const r = a[i], g = a[i + 1], b = a[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx > 0.001 ? (mx - mn) / mx : 0;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      const cool = b > r + 0.03; // cyan / teal / blue / violet entries
      let f = 0;
      if (cool && sat > 0.14) f = 0.38;  // p5k: partial — cyan/pink stay distinguishable (was 0.75 → all-silver fog)
      else if (sat > 0.30) f = 0.12;     // gentle tame on hot pinks / golds
      if (f > 0) {
        a[i] = r + (lum - r) * f; a[i + 1] = g + (lum - g) * f; a[i + 2] = b + (lum - b) * f;
      }
    }
    colAttr.needsUpdate = true;
  }
} catch (e) { console.warn('particle sharpness patch skipped:', e); }

// ═══════════════════════════════ VISUAL POLISH (env map, dust, streaks, glows)
let polish = null;
try { polish = createPolish(renderer, scene, camera, sd, isMobile); }
catch (e) { console.warn('polish disabled:', e); }

// ═══════════════════════════════ CINEMATIC DOF (focus follows look target)
let dof = null;
try { dof = createDof(composer, scene, camera, sd, { isMobile }); }
catch (e) { console.warn('dof disabled:', e); dof = null; }

// ═══════════════════════════════ INFRA
const scrollCtrl = createScrollController();
const responsive = new ResponsiveController(renderer, composer, camera);
const errCl = setupErrorHandling(canvas, document.getElementById('overlay'));
const preferRM = checkReducedMotion();
const motCl = setupReducedMotionListener(() => {});
const debugHUD = createDebugHUD();
setupDebugKeyboard((tp) => { const ms = document.documentElement.scrollHeight - window.innerHeight; window.scrollTo({ top: tp * ms, behavior: 'auto' }); });

// ═══════════════════════════════ ?p= DIRECT PROGRESS JUMP (verification aid)
// Headless screenshot runs cannot scroll — ?p=0.265 pins the narrative at 26.5%
// by overriding the progress source (no window scroll → fixed canvas stays put).
const _pParam = parseFloat(new URLSearchParams(window.location.search).get('p'));
if (isFinite(_pParam)) {
  const _clampP = Math.max(0, Math.min(1, _pParam));
  scrollCtrl.getProgress = () => _clampP;
}

// ═══════════════════════════════ DOM OVERLAY
// m/s = left-bottom title pair (hero, underwater, CTA chapters)
// st/ss = center-stage title pair (ocean, island, ingredients chapters) —
// matches the reference video's centered composition for those chapters.
const SHOT_DOM = {
  1:{m:'',s:''}, 2:{m:'Limitless begins here.',s:'Premium marine supplements'}, 3:{m:'',s:''},
  4:{m:'',s:'',st:'The only natural multivitamin',ss:'you will ever need.'}, 5:{m:'',s:''}, 6:{m:'',s:''},
  7:{m:'',s:'',st:'All naturally sourced marine ingredients',ss:'from Canada.'}, 8:{m:'',s:''}, 9:{m:'',s:''},
  10:{m:'The real limitless pill.',s:''}, 11:{m:'',s:''}, 12:{m:'',s:''}, 13:{m:'',s:''}, 14:{m:'',s:''}, 15:{m:'',s:''},
  16:{m:'',s:'',st:'100% wildcrafted and raw herbs.',ss:''}, 17:{m:'',s:''}, 18:{m:'A better you starts here',s:'Discover the purest marine nutrients'},
};
let _prevS = -1;
function updateDOM(p) {
  const si = getShotIndex(p);
  if (si !== _prevS) {
    _prevS = si;
    const cfg = SHOT_DOM[si + 1] || SHOT_DOM[1];
    if (chapterLabel) { chapterLabel.textContent = `Shot ${si+1}/${getShotCount()}`; chapterLabel.style.display = isDebug() ? '' : 'none'; }
    if (mainTitle) { mainTitle.textContent = cfg.m; mainTitle.classList.toggle('visible', !!cfg.m); }
    if (subtitle) { subtitle.textContent = cfg.s; subtitle.classList.toggle('visible', !!cfg.s); }
    // Auto contrast: bright-pink chapters (surface/island, shots 4–8) get dark text
    const onLight = si >= 3 && si <= 7;
    if (stageTitle) { stageTitle.textContent = cfg.st || ''; stageTitle.classList.toggle('visible', !!cfg.st); stageTitle.classList.toggle('on-light', onLight); }
    if (stageSub) { stageSub.textContent = cfg.ss || ''; stageSub.classList.toggle('visible', !!cfg.ss); stageSub.classList.toggle('on-light', onLight); }
    if (ctaButton) ctaButton.classList.toggle('visible', si === 17);
    if (footerPanel) footerPanel.classList.toggle('visible', si === 17);
  }
  if (globalP) { globalP.textContent = `${(p*100).toFixed(1)}%`; globalP.style.display = isDebug() ? '' : 'none'; }
  if (localP) { localP.textContent = `local: ${(getLocalProgress(p, si)*100).toFixed(1)}%`; localP.style.display = isDebug() ? '' : 'none'; }
  // Within-shot gating: hero title fades in shortly after the dolly starts
  // (phase2 shows "Limitless begins here." through the HERO stage).
  if (si === 1 && mainTitle) {
    const lp2 = getLocalProgress(p, si);
    const showHero = lp2 > 0.15;
    mainTitle.classList.toggle('visible', showHero);
    if (subtitle) subtitle.classList.toggle('visible', showHero);
  }
  if (ingredientIcons.length) { ingredientIcons.forEach((icon, i) => { if (si === 15) { const lp = getLocalProgress(p, si), it = Math.max(0, Math.min(1, (lp - i * 0.08) / 0.4)); icon.style.opacity = it; icon.style.transform = `translateY(${(1 - it) * 20}px) scale(${0.8 + it * 0.2})`; } else { icon.style.opacity = 0; } }); }
}

// ═══════════════════════════════ AMBIENT
// p5p opening water palette (dark phase2-style sea under the night sky —
// phase5's shader mixes crest color toward white, so the opening values are
// chosen much deeper than phase2's raw uniforms to land on the same look)
const _cOpenSurf = new THREE.Color('#3a2058'), _cOpenDeep = new THREE.Color('#0d0518');
const _cSurf = new THREE.Color('#e9a6c6'), _cDeep = new THREE.Color('#3a2450');
const _dv = new THREE.Vector3(), _dq = new THREE.Quaternion(), _ds = new THREE.Vector3();
const _nodeProj = new THREE.Vector3();
const _p5CamLocal = new THREE.Vector3(); // scratch: camera pos in particle-local space
function animateAmbient(dt, t, p) {
  if (sd.waterMat?.uniforms) {
    sd.waterMat.uniforms.uTime.value = t;
    sd.waterMat.uniforms.uCameraPos.value.copy(camera.position);
    // p5p opening (phase2 port): calm dark sea — uWaveAmp 0.25 with phase2's
    // purple palette; blend to the bright surface look across the pink wipe
    // (p 0.120–0.160), then the original surface/dive curve continues.
    const wu = sd.waterMat.uniforms;
    const OPEN_SURF = _cOpenSurf, OPEN_DEEP = _cOpenDeep, SURF = _cSurf, DEEP = _cDeep;
    if (p < 0.120) {
      wu.uWaveAmp.value = 0.25;
      wu.uColorSurface.value.copy(OPEN_SURF); wu.uColorDeep.value.copy(OPEN_DEEP);
      wu.uFresnelPower.value = 2.5;
      wu.uBrightness.value = 0.28; // night sea — kills the shader's broad spec wash
    } else if (p < 0.160) {
      const wt = (p - 0.120) / 0.040;
      wu.uWaveAmp.value = 0.25 + wt * 0.70;
      wu.uColorSurface.value.copy(OPEN_SURF).lerp(SURF, wt); wu.uColorDeep.value.copy(OPEN_DEEP).lerp(DEEP, wt);
      wu.uFresnelPower.value = 2.5 + wt * 0.7;
      wu.uBrightness.value = 0.28 + wt * 0.72;
    } else {
      wu.uColorSurface.value.copy(SURF); wu.uColorDeep.value.copy(DEEP);
      wu.uFresnelPower.value = 3.2;
      wu.uBrightness.value = 1.0;
      // Dive transition: uWaveAmp 0.95→0.75 over shot 09 (p=0.530-0.590)
      if (p < 0.530) wu.uWaveAmp.value = 0.95;
      else if (p < 0.590) { const wavT = (p - 0.530) / 0.060; wu.uWaveAmp.value = 0.95 - wavT * 0.20; }
      else wu.uWaveAmp.value = 0.75;
    }
  }
  // p5p: phase2 opening ambient animation (triangle spin, star twinkle, fog drift)
  if (sd.opening && sd.shotGroups?.[1]?.visible) sd.opening.update(dt, t);
  if (sd.g03) sd.g03.traverse(c => { const u = c.userData?.u; if (u?.uTime?.value !== undefined) u.uTime.value = t; });
  (sd.surfGroup?.children || []).forEach(ch => {
    if (!ch.isInstancedMesh || !ch.userData?.instanceData) return;
    const d = ch.userData.instanceData;
    for (let i = 0; i < d.length; i++) { const dd = d[i]; ch.getMatrixAt(i, _dummyMatrix); const dm = _dummyMatrix; dm.decompose(_dv, _dq, _ds); _dv.y = dd.bY + Math.sin(t * dd.fs + dd.fp) * dd.fa; dm.compose(_dv, _dq, _ds); ch.setMatrixAt(i, dm); }
    ch.instanceMatrix.needsUpdate = true;
  });
  if (sd.bigFish?.visible && sd.bigFish.userData.tailPivot) sd.bigFish.userData.tailPivot.rotation.y = Math.sin(t * 8) * 0.5;
  if (sd.bubbles) sd.bubbles.forEach(b => { if (!b.visible) return; b.position.y += b.userData.rs * dt; b.position.x += Math.sin(t * 2 + b.userData.wp) * b.userData.wa * dt; if (b.position.y > 5) b.position.y = -5; });
  if (sd.snS?.visible) { const a = sd.snS.geometry.attributes.position.array; for (let i = 0; i < a.length; i += 3) { a[i + 1] += dt * 0.12; a[i] += Math.sin(t + i) * dt * 0.04; if (a[i + 1] > 8) a[i + 1] = -6; } sd.snS.geometry.attributes.position.needsUpdate = true; }
  if (sd.triG?.visible) sd.triG.rotation.y += dt * 0.06;
  if (sd.benefitNodes) sd.benefitNodes.forEach(n => { if (n.visible && n.userData?.ring) n.userData.ring.rotation.z += dt * 0.25; });
  // Slow key-light drift — highlights on water/gold shift gently over time
  dirLight.position.set(5 + Math.sin(t * 0.07) * 2.2, 8, 3 + Math.cos(t * 0.05) * 2.0);
}

// ═══════════════════════════════ MAIN LOOP
const clock = new THREE.Clock();
let firstRender = true;
let bootStage = 'init';
let wd = null;
let smoothP = null;
let _fpsAcc = 0, _fpsN = 0;

function crash(stage, err) {
  if (wd) { clearTimeout(wd); wd = null; }
  showInitError('Phase 5 First Frame Failed',
    `Stage: ${stage}\n${err.message || String(err)}\n\n${err.stack || '(no stack)'}`);
}

function animate(ts) {
  requestAnimationFrame(animate);
  try {
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = ts * 0.001;

    bootStage = 'getProgress';
    const rawP = scrollCtrl.getProgress();
    // Scroll damping — exponential approach gives the whole narrative a
    // smooth-in / accelerate / smooth-settle feel instead of linear tracking.
    // Reversible (always tracks the scroll target) and converges for ?p= pins.
    if (smoothP === null) smoothP = rawP;
    smoothP += (rawP - smoothP) * (1 - Math.exp(-dt * 5.5));
    if (Math.abs(rawP - smoothP) < 0.0004) smoothP = rawP;
    const p = smoothP;

    bootStage = 'getCameraAt';
    const cs = getCameraAt(p, isMobile);

    bootStage = 'cameraUpdate';
    camera.position.copy(cs.pos); camera.lookAt(cs.look); camera.fov = cs.fov;
    if (!camera.userData.debugLookTarget) camera.userData.debugLookTarget = new THREE.Vector3();
    camera.userData.debugLookTarget.copy(cs.look);
    camera.updateProjectionMatrix();

    bootStage = 'getEnvConfig';
    const env = getEnvConfig(p);

    bootStage = 'applyEnvConfig';
    applyEnvConfig(scene, renderer, { ambient: ambientLight, directional: dirLight }, env, {
      waterUniforms: sd.waterMat?.uniforms || null,
      skyMesh: sd.skyPlane || null,
      composer,
    });

    // UW fill
    const uwT = p < 0.54 ? 0 : Math.min(1, (p - 0.54) / 0.05);
    uwFill1.intensity = 0.5 + uwT * 3; uwFill2.intensity = 0.5 + uwT * 2.5; uwFill3.intensity = 0.5 + uwT * 2.5;

    bootStage = 'updateVisibility';
    sd.updateVisibility(p);

    const si = getShotIndex(p);

    // ★ /final particle cloud: scatter via ShaderMaterial uniforms (deterministic, reversible)
    const pSys01 = sd.pSys01;
    if (pSys01?.visible && pSys01.material?.uniforms) {
      const u = pSys01.material.uniforms;
      u.uTime.value = t;

      // Scatter timeline (p5k, per user spec):
      //   0–3%       cluster hold — breathing only, camera holds
      //   3–5.5%     camera pushes in; camera-repel channel parts the cloud
      //   5.5–8.5%   scroll scatter with real crossing parallax
      //   ≥8.5%      fully scattered, group hides (sg[0].visible cutoff 0.095)
      const sStart = 0.055, sFull = 0.085;
      let sp;
      if (p < sStart) sp = 0;
      else if (p < sFull) { const tt = (p - sStart) / (sFull - sStart); sp = 1 - Math.pow(1 - tt, 2); }
      else sp = 1.0;
      u.uScatterProgress.value = Math.max(0, Math.min(1, sp));

      // Mouse tracking (only when not scattered)
      if (mouseOnCanvas && !isMobile && sp < 0.2) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouseNDC, camera);
        const proxy = sd._proxySphere;
        if (proxy) {
          const hits = raycaster.intersectObject(proxy, false);
          if (hits.length > 0) {
            const wp = hits[0].point.clone();
            proxy.worldToLocal(wp);
            u.uMouseWorld.value.copy(wp);
            u.uMouseStrength.value = Math.min(1, u.uMouseStrength.value + 0.07);
          } else {
            u.uMouseStrength.value *= 0.9;
          }
        }
      } else {
        u.uMouseStrength.value *= 0.9;
      }
      u.uPointSize.value = isMobile ? 0.23 : 0.29; // p5k: −40% vs p5i 0.38/0.48 (user: finer, distinguishable grains)

      // p5k: camera-repel channel — camera pos in particle-local space,
      // ramped in during the 3%→4.8% push, faded out as scatter takes over
      if (u.uCamLocal && u.uCamRepel) {
        pSys01.updateWorldMatrix(true, false);
        _p5CamLocal.copy(camera.position);
        pSys01.worldToLocal(_p5CamLocal);
        u.uCamLocal.value.copy(_p5CamLocal);
        const repRamp = p < 0.030 ? 0 : Math.min(1, (p - 0.030) / 0.018);
        u.uCamRepel.value = repRamp * (1 - sp * 0.85);
        u.uMouseRadius.value = 1.15; // p5k: smaller, softer mouse dent (was 1.6)
      }

      u._sp = sp;
    }

    // Shot overlap debug
    const shot01Vis = p < 0.050 ? 1 : 0;
    const shot02Vis = (p >= 0.040 && p < 0.125) ? Math.min(1, Math.max(0, (p - 0.040) / 0.015)) : 0;

    // Benefit cards — projected directly BELOW the active 3D node (matches the
    // reference: ring node with its info card centered underneath, connector up)
    bootStage = 'benefitCards';
    const inBenefits = si >= 10 && si <= 14;
    benefitCards.forEach(c => c.style.display = 'none');
    if (inBenefits) {
      const an = sd.benefitNodes?.find(n => n.userData?.act > 0.5);
      benefitCards.forEach(c => c.classList.remove('active'));
      if (an && an.userData.idx < benefitCards.length) {
        const card = benefitCards[an.userData.idx];
        if (card) {
          _nodeProj.setFromMatrixPosition(an.matrixWorld).project(camera);
          if (Number.isFinite(_nodeProj.x) && Number.isFinite(_nodeProj.y)) {
            const sx = Math.max(20, Math.min(80, (_nodeProj.x * 0.5 + 0.5) * 100));
            const sy = Math.max(24, Math.min(74, (-_nodeProj.y * 0.5 + 0.5) * 100 + 13));
            card.style.left = sx + '%';
            card.style.top = sy + '%';
          }
          card.style.display = ''; card.classList.add('active', 'below');
        }
      }
    }

    bootStage = 'updateDOM';
    updateDOM(p);

    bootStage = 'animateAmbient';
    if (!preferRM) animateAmbient(dt, t, p);

    bootStage = 'polish';
    if (polish) polish.update(dt, t, p, si, preferRM);

    bootStage = 'dof';
    if (dof) {
      // Focus = distance to the camera look target (the current subject).
      const focusDist = camera.position.distanceTo(cs.look);
      let ap = env.dofAperture ?? 0.0005;
      // Water crossing: brief soft-focus spike, recovers quickly after the plunge
      if (p > 0.540 && p < 0.580) { ap *= 1 + Math.sin(((p - 0.540) / 0.040) * Math.PI) * 1.6; }
      dof.update(dt, focusDist, ap, env.dofMaxblur ?? 0.004);
      // Sustained low FPS → drop the DOF pass once, keep everything else
      _fpsAcc += dt; _fpsN++;
      if (_fpsN >= 90) {
        const avg = _fpsAcc / _fpsN;
        if (avg > 0.028 && dof.isEnabled()) { dof.setEnabled(false); console.warn('DOF auto-disabled (perf)'); }
        _fpsAcc = 0; _fpsN = 0;
      }
    }

    // NDC screen correction (only if Box3 is valid)
    bootStage = 'screenCorrection';
    const sp = {};
    if (sd.correctVisualCenterToNDC) {
      if (si === 9 && sd.capG?.visible) {
        const testBox = new THREE.Box3().setFromObject(sd.capG);
        if (!testBox.isEmpty()) {
          const r = sd.correctVisualCenterToNDC(sd.capG, camera, 0.38, 0.06, 5);
          sp.capsule = isFinite(r.screenX) ? `x${r.screenX.toFixed(0)}% y${r.screenY.toFixed(0)}%` : 'MISSING';
        } else { sp.capsule = 'EMPTY BOX'; }
      }
      if (si === 17 && sd.triG?.visible) {
        const testBox = new THREE.Box3().setFromObject(sd.triG);
        if (!testBox.isEmpty()) {
          const r = sd.correctVisualCenterToNDC(sd.triG, camera, 0.42, 0.02, 5);
          sp.tri = isFinite(r.screenX) ? `x${r.screenX.toFixed(0)}% y${r.screenY.toFixed(0)}%` : 'MISSING';
        } else { sp.tri = 'EMPTY BOX'; }
      }
    }

    // Audit on 'a' key in debug mode
    bootStage = 'idle';

    // Particle cloud debug (from /final transplant)
    if (sd.pSys01?.material?.uniforms?.uScatterProgress) {
      const scatterProgress = sd.pSys01.material.uniforms.uScatterProgress.value;
      const mouseStrength = sd.pSys01.material.uniforms.uMouseStrength?.value ?? 0;
      const particleCount = sd.pSys01.geometry?.attributes?.position?.count ?? 0;
      sp.particle = `scat:${scatterProgress.toFixed(2)} mouse:${mouseStrength.toFixed(2)} pts:${particleCount}`;
    }

    bootStage = 'updateDebugHUD';
    if (isDebug()) updateDebugHUD(p, camera, sp);

    bootStage = 'firstRender';
    if (firstRender) { firstRender = false; if (wd) { clearTimeout(wd); wd = null; } if (loadingScreen) { loadingScreen.style.opacity = '0'; loadingScreen.style.transition = 'opacity 0.6s'; setTimeout(() => { if (loadingScreen) loadingScreen.style.display = 'none'; }, 600); }
      // Sync canvas size once the real viewport is known (headless/late-layout safe)
      responsive.handleResize();
      setTimeout(() => responsive.handleResize(), 600);
    }

    bootStage = 'composerRender';
    composer.render();
    bootStage = 'idle';
  } catch (e) {
    crash(bootStage, e);
  }
}

// ═══════════════════════════════ WATCHDOG
wd = setTimeout(() => {
  if (firstRender) {
    showInitError('Startup Timeout (8s)',
      `Last stage: ${bootStage}\n\nThe page did not complete its first render within 8 seconds.`);
  }
}, 8000);

// ═══════════════════════════════ AUDIT KEY
window.addEventListener('keydown', (e) => {
  if (e.key === 'a' && isDebug() && sd.auditAllShots) {
    const results = sd.auditAllShots(camera);
    console.table(results);
    const fails = results.filter(r => r.status === 'FAIL');
    if (fails.length) console.warn('FAILS:', fails.map(f => `Shot ${f.shot}: ${f.subjectName} (visible:${f.subjectVisible} box:${f.boxFinite} fru:${f.inFrustum})`).join('\n'));
    else console.log('All 18 shots PASS');
  }
});

// ═══════════════════════════════ START
requestAnimationFrame(animate);
console.log('Phase 5A.3 ready');
