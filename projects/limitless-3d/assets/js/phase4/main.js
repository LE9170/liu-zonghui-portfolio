import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
// ── Phase 3 infrastructure (imported, NOT copied) ──
import { quality } from '../phase3/quality-manager.js';
import { getCameraAt } from '../phase3/camera-path.js';
import { createScrollController } from '../phase3/scroll-controller.js';
import { ResponsiveController } from '../phase3/responsive.js';
import { AmbientAnimator } from '../phase3/ambient-animator.js';
import { setupErrorHandling, checkWebGLSupport, verifyRendererContext } from '../phase3/error-handler.js';
import { checkReducedMotion, setupReducedMotionListener } from '../phase3/reduced-motion.js';
import { createBenefitNodes, updateBenefitNodes } from '../phase3/benefit-nodes.js';
import { _dummyMatrix, _dummyPos, _dummyQuat, _dummyScale } from '../phase3/geometries.js';

// ── Phase 4 refined modules (new for visual changes) ──
import { buildHeroWorld } from './scene-hero.js';
import { buildOceanWorld } from './scene-ocean.js';
import { createLighting, updateLightingForProgress } from './lighting.js';
import { VignetteShader, FilmGrainShader } from '../phase3/post-processing.js';

console.log(`Phase 4 starting — Quality tier: ${quality.tier}`);

// ═══════════════════════════════════════════════════
// DOM REFS
// ═══════════════════════════════════════════════════
const canvas = document.getElementById('phase2-canvas');
const overlay = document.getElementById('overlay');
const stageLabel = document.getElementById('stageLabel');
const progressRing = document.getElementById('progressRing');
const loadingScreen = document.getElementById('loading-screen');
const initErrorEl = document.getElementById('init-error');
const stageTexts = overlay ? overlay.querySelectorAll('.stage-text') : [];
const benefitCardEls = overlay ? overlay.querySelectorAll('.benefit-card') : [];

// ═══════════════════════════════════════════════════
// DEBUG MODE: show stage label only with ?debug=1
// ═══════════════════════════════════════════════════
const urlParams = new URLSearchParams(window.location.search);
const isDebugMode = urlParams.get('debug') === '1';
if (stageLabel) {
  stageLabel.style.display = isDebugMode ? '' : 'none';
}
if (progressRing) {
  if (!isDebugMode) {
    progressRing.parentElement.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════
// DIAGNOSTIC MODES (?diag=raw|nobloom|noshadow|notransparent)
// ═══════════════════════════════════════════════════
const diagMode = urlParams.get('diag') || 'none';
const diagLabel = document.createElement('div');
diagLabel.style.cssText = 'position:fixed;top:8px;left:8px;z-index:200;color:#ff0;font:12px monospace;background:rgba(0,0,0,0.8);padding:2px 6px;pointer-events:none;';
if (diagMode !== 'none') {
  diagLabel.textContent = 'DIAG: ' + diagMode;
  document.body.appendChild(diagLabel);
}
const DIAG_RAW           = diagMode === 'raw';
const DIAG_NOBLOOM       = diagMode === 'nobloom';
const DIAG_NOSHADOW      = diagMode === 'noshadow';
const DIAG_NOTRANSPARENT = diagMode === 'notransparent';

// ═══════════════════════════════════════════════════
// DEVICE DETECTION
// ═══════════════════════════════════════════════════
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
const dprCap = quality.dprCap;

// ═══════════════════════════════════════════════════
// MOUSE TRACKING (for particle cloud hero)
// ═══════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouseNDC = new THREE.Vector2();
const _mouseWorldTarget = new THREE.Vector3(999, 999, 999);
const _mouseWorldCurrent = new THREE.Vector3(999, 999, 999);
let mouseOnCanvas = false;
let mouseStrengthTarget = 0;
let mouseStrength = 0;

function updateMouseWorld(camera, heroWorld) {
  if (!heroWorld || isMobile) {
    mouseStrengthTarget = 0;
    return;
  }
  const proxy = heroWorld.userData?.getProxySphere?.();
  if (!proxy) return;

  raycaster.setFromCamera(mouseNDC, camera);
  const hits = raycaster.intersectObject(proxy, false);

  if (hits.length > 0 && mouseOnCanvas) {
    // hits[0].point is in world space — convert to proxy local space for shader
    _mouseWorldTarget.copy(hits[0].point);
    proxy.worldToLocal(_mouseWorldTarget);
    mouseStrengthTarget = 1.0;
  } else if (!mouseOnCanvas) {
    mouseStrengthTarget = Math.max(0, mouseStrengthTarget - 0.02);
  }

  // Spring-damp mouse position
  _mouseWorldCurrent.lerp(_mouseWorldTarget, 0.12);

  // Spring-damp mouse strength
  mouseStrength += (mouseStrengthTarget - mouseStrength) * 0.1;

  // Push to heroWorld userData
  if (heroWorld.userData) {
    heroWorld.userData.mouseTarget = _mouseWorldCurrent;
    heroWorld.userData.mouseStrength = mouseStrength;
  }
}

// ── Mouse event listeners ──
canvas.addEventListener('mousemove', (e) => {
  mouseNDC.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouseNDC.y = -(e.clientY / window.innerHeight) * 2 + 1;
}, { passive: true });

canvas.addEventListener('mouseenter', () => { mouseOnCanvas = true; });
canvas.addEventListener('mouseleave', () => { mouseOnCanvas = false; mouseStrengthTarget = 0; });

// Touch: no mouse interaction, just auto-breathe
if (isMobile) {
  mouseStrengthTarget = 0;
}

// ═══════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════

function showInitError(title, detail) {
  console.error(`Phase4 init error: ${title}`, detail);
  if (loadingScreen) loadingScreen.style.display = 'none';
  if (initErrorEl) {
    initErrorEl.hidden = false;
    initErrorEl.innerHTML = `
      <h3>${title}</h3>
      <p>${detail}</p>
      <p style="margin-top:1rem;font-size:0.75rem;">Open the browser console for technical details.</p>
      <button onclick="location.reload()" style="margin-top:1rem;padding:0.5rem 1.5rem;border:1px solid rgba(255,255,255,0.3);border-radius:2rem;background:transparent;color:#fff;cursor:pointer;">Retry</button>
    `;
  }
}

function hideInitError() {
  if (initErrorEl) initErrorEl.hidden = true;
}

// ── WebGL support check ──
if (!checkWebGLSupport()) {
  showInitError('WebGL Unavailable',
    'Your browser does not support WebGL. Please try a modern browser like Chrome, Firefox, or Edge.');
  throw new Error('WebGL not supported');
}

// ── Renderer creation ──
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  verifyRendererContext(renderer);
} catch (e) {
  showInitError('GPU Initialization Failed',
    'Could not create a WebGL rendering context. Your GPU drivers may be outdated or the GPU may be unavailable.');
  throw e;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = DIAG_NOSHADOW ? false : quality.shadowEnabled;
if (quality.shadowEnabled) {
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Scene & Camera ──
const scene = new THREE.Scene();
// Phase 4: deeper blue-black background #06061a
scene.background = new THREE.Color(0x06061a);
scene.fog = new THREE.FogExp2(0x0a0a14, 0.006);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.3, 80);
camera.position.set(0, 0.5, -10);
camera.lookAt(0, 0.5, 0);

// ═══════════════════════════════════════════════════
// PHASE 4 POST-PROCESSING (refined bloom/vignette/grain)
// ═══════════════════════════════════════════════════
function createPhase4Composer(renderer, scene, camera, quality) {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // DIAG_RAW: no EffectComposer at all — caller uses renderer.render() directly
  if (DIAG_RAW) return null;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Bloom — skip if DIAG_NOBLOOM or quality too low
  if (!DIAG_NOBLOOM) {
    const bloomStrength = quality.tier === 'high' ? 0.12 :
                          quality.tier === 'medium' ? 0.08 :
                          0.0;
    if (bloomStrength > 0) {
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        bloomStrength,
        0.35,
        0.92
      );
      composer.addPass(bloomPass);
    }
  }

  // Vignette
  const vignetteIntensity = quality.tier === 'high' ? 0.4 :
                            quality.tier === 'medium' ? 0.32 :
                            0.22;
  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms.intensity.value = vignetteIntensity;
  composer.addPass(vignettePass);

  // Film grain — high tier only
  if (quality.tier === 'high') {
    const grainPass = new ShaderPass(FilmGrainShader);
    grainPass.uniforms.intensity.value = 0.02;
    composer.addPass(grainPass);
  }

  composer.passes[composer.passes.length - 1].renderToScreen = true;
  return composer;
}

// ── Scene construction ──
let composer, heroWorld, oceanWorld, lightRig, benefitNodes, benefitCards;
let scrollController, responsive, animator;
let errorCleanup, motionCleanup;
let prefersReducedMotion = false;
let underwaterLightBeams = { beam1: null, beam2: null };

try {
  composer = createPhase4Composer(renderer, scene, camera, quality);

  heroWorld = buildHeroWorld(quality);
  oceanWorld = buildOceanWorld(quality);
  scene.add(oceanWorld);  // background rocks/corals — rendered first (behind)
  scene.add(heroWorld);   // particle cloud — rendered on top

  lightRig = createLighting(scene, quality);

  const bnResult = createBenefitNodes(oceanWorld);
  benefitNodes = bnResult.nodes;
  benefitCards = bnResult.cards;

  // Store benefit node ring reference for color updates
  benefitNodes.forEach(node => {
    node.userData.originalRingColor = 0xb8a8e0;
  });

  scrollController = createScrollController();
  // DIAG_NOTRANSPARENT: hide all large transparent planes
  if (DIAG_NOTRANSPARENT && oceanWorld) {
    oceanWorld.traverse(child => {
      if (child.isMesh && child.material && child.material.transparent) {
        child.visible = false;
      }
    });
  }

  responsive = new ResponsiveController(renderer, composer, camera);

  errorCleanup = setupErrorHandling(canvas, overlay);

  prefersReducedMotion = checkReducedMotion();
  motionCleanup = setupReducedMotionListener((reduced) => {
    prefersReducedMotion = reduced;
    console.log(`Phase4: prefers-reduced-motion = ${reduced}`);
  });

  animator = new AmbientAnimator();

  // Capture underwater light beam references for toggling
  if (oceanWorld.userData) {
    underwaterLightBeams.beam1 = oceanWorld.userData.lightBeam1;
    underwaterLightBeams.beam2 = oceanWorld.userData.lightBeam2;
  }

  hideInitError();
} catch (e) {
  const msg = e.message || String(e);
  if (msg.includes('import') || msg.includes('module') || msg.includes('Failed to fetch')) {
    showInitError('Module Load Failed',
      'Could not load required JavaScript modules. Check your network connection and CDN availability.');
  } else if (msg.includes('shader') || msg.includes('compile') || msg.includes('SHADER')) {
    showInitError('Shader Compilation Error',
      'A GPU shader failed to compile. This may indicate GPU driver issues or unsupported WebGL features.');
  } else if (msg.includes('WebGL') || msg.includes('context') || msg.includes('GPU')) {
    showInitError('WebGL Error',
      `A WebGL operation failed: ${msg}. Your GPU may not support required features.`);
  } else {
    showInitError('Initialization Failed',
      `An unexpected error occurred during setup: ${msg}`);
  }
  throw e;
}

// ═══════════════════════════════════════════════════
// STAGE MANAGEMENT
// ═══════════════════════════════════════════════════
const stageDefs = [
  { name: 'ENTRANCE',     id: 'entrance',    range: [0.00, 0.03] },
  { name: 'HERO',         id: 'hero',        range: [0.03, 0.12] },
  { name: 'TRANSITION',   id: null,          range: [0.12, 0.15] },
  { name: 'SURFACE',      id: 'surface',     range: [0.15, 0.35] },
  { name: 'CORAL ISLAND', id: 'island',      range: [0.35, 0.55] },
  { name: 'DIVE',         id: null,          range: [0.55, 0.59] },
  { name: 'UNDERWATER',   id: 'underwater',  range: [0.59, 0.81] },
  { name: 'PROOF',        id: 'proof',       range: [0.81, 0.91] },
  { name: 'FINAL CTA',    id: 'final',       range: [0.91, 1.00] },
];

function updateStageUI(progress) {
  // Stage texts must always update — decoupled from debug-only stageLabel
  if (!stageTexts || stageTexts.length === 0) return;

  let stage = stageDefs[0];
  for (const s of stageDefs) {
    if (progress >= s.range[0] && progress <= s.range[1]) { stage = s; break; }
  }

  // Debug-only: update stage label text if element exists and debug mode is on
  if (stageLabel && isDebugMode) {
    stageLabel.textContent = stage.name;
  }

  // Always toggle stage texts — this is the core DOM overlay behavior
  stageTexts.forEach(el => {
    el.classList.toggle('visible', el.dataset.stage === stage.id);
  });
}

// ═══════════════════════════════════════════════════
// SCENE STATE UPDATE
// ═══════════════════════════════════════════════════

/**
 * Particle cloud scatter: progress 0.03 → 0.22 maps to scatterAmount 0 → 1.
 * The cloud stays visible but particles progressively scatter outward.
 * After scatter completes, heroWorld is hidden.
 */
function updateHeroScatter(progress) {
  const scatterStart = 0.03;
  const scatterEnd = 0.22;
  const scatterProgress = Math.max(0, Math.min(1, (progress - scatterStart) / (scatterEnd - scatterStart)));

  // Push scatter to heroWorld for particle shader
  if (heroWorld.userData) {
    heroWorld.userData.scatterProgress = scatterProgress;
  }

  // Hide heroWorld entirely only after scatter is complete AND surface stage is well underway
  heroWorld.visible = progress < 0.25;
}

function getWaterUniforms() {
  try {
    return oceanWorld?.userData?.waterMaterial?.uniforms || null;
  } catch {
    return null;
  }
}

/**
 * Update underwater elements visibility and beam opacity based on progress
 */
function updateUnderwaterState(progress) {
  const oud = oceanWorld.userData;

  // topWaterPlane permanently disabled — waterPlane (DoubleSide) handles both above/below views

  // Light beams fade in during dive
  if (oud.lightBeam1 && oud.lightBeam2) {
    const beamVisible = progress > 0.56;
    oud.lightBeam1.visible = beamVisible;
    oud.lightBeam2.visible = beamVisible;
    if (beamVisible) {
      const beamT = Math.min(1, (progress - 0.56) / 0.04);
      oud.lightBeam1.material.opacity = 0.06 * beamT;
      oud.lightBeam2.material.opacity = 0.06 * beamT;
    }
  }

  // Marine snow visible as camera descends
  if (oud.particleSystem) {
    const snowT = progress < 0.55 ? 0 : Math.min(1, (progress - 0.55) / 0.06);
    oud.particleSystem.material.opacity = 0.35 * snowT;
  }

  // Coral island reflection fades as we go underwater
  if (oud.islandReflection) {
    const reflOpacity = progress < 0.55 ? 1 : Math.max(0, 1 - (progress - 0.55) / 0.1);
    oud.islandReflection.children.forEach(c => {
      if (c.material && c.material.opacity !== undefined) {
        c.material.opacity = c.material.opacity <= 0.2 ? c.material.opacity * reflOpacity : c.material.opacity;
      }
    });
  }
}

// ═══════════════════════════════════════════════════
// ANIMATION LOOP
// ═══════════════════════════════════════════════════
const clock = new THREE.Clock();
let firstRender = true;

function animate(timestamp) {
  requestAnimationFrame(animate);

  try {
    const dt = Math.min(clock.getDelta(), 0.1);
    const ambientTime = timestamp * 0.001;
    const progress = scrollController.getProgress();

    // ── Mouse tracking for particle cloud ──
    updateMouseWorld(camera, heroWorld);

    // ── Camera ──
    const cs = getCameraAt(progress, isMobile, window.innerWidth / window.innerHeight);
    camera.position.copy(cs.pos);
    camera.lookAt(cs.look);
    camera.fov = cs.fov;
    camera.updateProjectionMatrix();

    // ── Scene state ──
    updateHeroScatter(progress);
    const waterUniforms = getWaterUniforms();
    updateLightingForProgress(lightRig, scene, progress, quality, waterUniforms);
    updateStageUI(progress);
    updateBenefitNodes(benefitNodes, benefitCards, camera, progress);
    updateUnderwaterState(progress);

    // ── Particle cloud uniform updates ──
    const hud = heroWorld?.userData;
    if (hud?.particleSystem) {
      const psMat = hud.particleSystem.material;
      if (psMat.uniforms) {
        psMat.uniforms.uTime.value = ambientTime;
        psMat.uniforms.uScatterProgress.value = hud.scatterProgress || 0;
        psMat.uniforms.uMouseWorld.value.copy(hud.mouseTarget || _mouseWorldCurrent);
        psMat.uniforms.uMouseStrength.value = hud.mouseStrength || 0;
        psMat.uniforms.uPointSize.value = isMobile ? 0.70 : 1.05;
      }
    }

    // ── Entrance triangle: fade out during scatter (rotation handled by ambient animator) ──
    if (hud?.triGroup) {
      const scatterFade = 1 - (hud.scatterProgress || 0);
      hud.triGroup.children.forEach(c => {
        if (c.material && c.material.opacity !== undefined) {
          c.material.opacity = scatterFade;
          c.material.transparent = true;
        }
      });
      hud.triGroup.visible = scatterFade > 0.05;
    }

    // ── Floater triangles animation ──
    if (hud?.floaterGroup) {
      hud.floaterGroup.children.forEach(f => {
        const ud = f.userData;
        if (!ud || !ud.basePos) return;
        // NaN guard: ensure floatPhase exists and produces finite angle
        const phase = Number.isFinite(ud.floatPhase) ? ud.floatPhase : 0;
        const angle = ambientTime * (ud.floatSpeed || 0.2) + phase;
        if (!Number.isFinite(angle)) { f.position.copy(ud.basePos); return; }
        const rx = Math.cos(angle) * (ud.floatRadius || 0.5);
        const ry = Math.sin(angle * 1.3) * (ud.floatRadius || 0.5) * 0.5;
        const rz = Math.sin(angle * 0.7) * (ud.floatRadiusZ || 0.15);
        if (!Number.isFinite(rx) || !Number.isFinite(ry) || !Number.isFinite(rz)) { f.position.copy(ud.basePos); return; }
        f.position.x = ud.basePos.x + rx;
        f.position.y = ud.basePos.y + ry;
        f.position.z = ud.basePos.z + rz;
        f.rotation.z += dt * (ud.rotSpeed || 0);
        // Fade out during scatter
        const sf = 1 - (hud.scatterProgress || 0);
        if (f.material) f.material.opacity = Math.max(0, (ud.baseOpacity || 0.12) * sf);
      });
      hud.floaterGroup.visible = (hud.scatterProgress || 0) < 0.8;
    }

    // ── Water shader time ──
    if (waterUniforms) {
      waterUniforms.uTime.value = ambientTime;
      waterUniforms.uCameraPos.value.copy(camera.position);
    }

    // ── Ambient animations ──
    if (!prefersReducedMotion) {
      animator.update(dt, ambientTime, progress, heroWorld, oceanWorld, quality);

      // Phase 4 additional animations not in phase3 ambient animator:
      const oud = oceanWorld.userData;

      // Near/mid/far rock groups (separate from phase3's single floatingRocks)
      [oud.nearRocks, oud.midRocks, oud.farRocks].forEach(mesh => {
        if (!mesh || !mesh.userData.instanceData) return;
        const data = mesh.userData.instanceData;
        for (let i = 0; i < data.length; i++) {
          const d = data[i];
          mesh.getMatrixAt(i, _dummyMatrix);
          _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
          _dummyPos.y = d.baseY + Math.sin(ambientTime * d.floatSpeed + d.floatPhase) * d.floatAmp;
          _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
          mesh.setMatrixAt(i, _dummyMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });

      // Pearls (near + far)
      [oud.nearPearls, oud.farPearls].forEach(mesh => {
        if (!mesh || !mesh.userData.instanceData) return;
        const data = mesh.userData.instanceData;
        for (let i = 0; i < data.length; i++) {
          const d = data[i];
          mesh.getMatrixAt(i, _dummyMatrix);
          _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
          _dummyPos.y = d.baseY + Math.sin(ambientTime * d.floatSpeed + d.floatPhase) * d.floatAmp;
          _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
          mesh.setMatrixAt(i, _dummyMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });

      // Foam ring pulse
      if (oud.foamRing) {
        const foamScale = 1 + Math.sin(ambientTime * 1.5) * 0.04;
        oud.foamRing.scale.setScalar(foamScale);
        oud.foamRing.material.opacity = 0.22 + Math.sin(ambientTime * 1.8) * 0.04;
      }
    }

    // ── Progress ring ──
    if (progressRing && isDebugMode) {
      progressRing.textContent = Math.round(progress * 100) + '%';
    }

    // ── Benefit node rings ──
    benefitNodes.forEach(node => {
      const ring = node.getObjectByName('benefitRing');
      if (ring) ring.rotation.z += dt * 0.3;
    });

    // ── Hide loading screen on first render ──
    if (firstRender) {
      firstRender = false;
      if (loadingScreen) {
        loadingScreen.style.opacity = '0';
        loadingScreen.style.transition = 'opacity 0.6s ease';
        setTimeout(() => {
          if (loadingScreen) loadingScreen.style.display = 'none';
        }, 600);
      }
    }

    // ── Render ──
    if (DIAG_RAW || !composer) {
      renderer.render(scene, camera);
    } else {
      composer.render();
    }
  } catch (e) {
    console.error('Phase4 render-loop error:', e.message || e, e.stack);
  }
}

// ═══════════════════════════════════════════════════
// KEYBOARD JUMPS (1-9)
// ═══════════════════════════════════════════════════
window.addEventListener('keydown', (e) => {
  const jumps = { 1:0.015, 2:0.075, 3:0.135, 4:0.25, 5:0.45, 6:0.57, 7:0.70, 8:0.86, 9:0.95 };
  if (jumps[e.key] !== undefined) {
    const driver = document.getElementById('scroll-driver');
    if (driver) {
      window.scrollTo({ top: jumps[e.key] * driver.offsetHeight, behavior: 'smooth' });
    }
  }
});

// ═══════════════════════════════════════════════════
// DISPOSE ON BEFOREUNLOAD
// ═══════════════════════════════════════════════════
window.addEventListener('beforeunload', () => {
  if (responsive) responsive.dispose();
  if (errorCleanup) errorCleanup();
  if (motionCleanup) motionCleanup();
  if (renderer) renderer.dispose();
  if (composer && composer.dispose) composer.dispose();
});

// ═══════════════════════════════════════════════════
// START
// ═══════════════════════════════════════════════════
updateStageUI(0);
requestAnimationFrame(animate);

console.log('Phase 4 ready — Refined visuals with pinker water, 3-layer hero, deeper color palette');
console.log('  Keys 1-9 jump to stages | Scroll to drive narrative');
console.log('  Add ?debug=1 to show stage label & progress ring');
