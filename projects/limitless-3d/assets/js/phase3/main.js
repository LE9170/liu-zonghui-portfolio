import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

import { quality } from './quality-manager.js';
import { buildHeroWorld } from './scene-hero.js';
import { buildOceanWorld } from './scene-ocean.js';
import { createLighting, updateLightingForProgress } from './lighting.js';
import { createBenefitNodes, updateBenefitNodes } from './benefit-nodes.js';
import { createComposer } from './post-processing.js';
import { getCameraAt } from './camera-path.js';
import { createScrollController } from './scroll-controller.js';
import { ResponsiveController } from './responsive.js';
import { AmbientAnimator } from './ambient-animator.js';
import { setupErrorHandling, checkWebGLSupport, verifyRendererContext } from './error-handler.js';
import { checkReducedMotion, setupReducedMotionListener } from './reduced-motion.js';

console.log(`Phase 3 starting — Quality tier: ${quality.tier}`);

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

// ═══════════════════════════════════════════════════
// DEVICE DETECTION
// ═══════════════════════════════════════════════════
const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
const dprCap = quality.dprCap;

// ═══════════════════════════════════════════════════
// INITIALIZATION (wrapped in try/catch per error category)
// ═══════════════════════════════════════════════════

/** Show init error (Category 3: init failure) — NOT the WebGL fallback */
function showInitError(title, detail) {
  console.error(`Phase3 init error: ${title}`, detail);
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

/** Hide init error */
function hideInitError() {
  if (initErrorEl) initErrorEl.hidden = true;
}

// ═══ Category 0: WebGL support check (before renderer creation) ═══
if (!checkWebGLSupport()) {
  showInitError('WebGL Unavailable',
    'Your browser does not support WebGL. Please try a modern browser like Chrome, Firefox, or Edge.');
  throw new Error('WebGL not supported');
}

// ═══ Category 1: Renderer creation ═══
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
renderer.shadowMap.enabled = quality.shadowEnabled;
if (quality.shadowEnabled) {
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
}
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ═══ Scene & Camera ═══
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a14);
scene.fog = new THREE.FogExp2(0x0a0a14, 0.006);

const camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.3, 80);
camera.position.set(0, 0.5, -10);
camera.lookAt(0, 0.5, 0);

// ═══ Category 3: Scene construction (module-level errors) ═══
let composer, heroWorld, oceanWorld, lightRig, benefitNodes, benefitCards;
let scrollController, responsive, animator;
let errorCleanup, motionCleanup;
let prefersReducedMotion = false; // module scope — used by animate loop

try {
  composer = createComposer(renderer, scene, camera, quality);

  heroWorld = buildHeroWorld();
  oceanWorld = buildOceanWorld(quality);
  scene.add(heroWorld);
  scene.add(oceanWorld);

  lightRig = createLighting(scene, quality);

  const bnResult = createBenefitNodes(oceanWorld);
  benefitNodes = bnResult.nodes;
  benefitCards = bnResult.cards;

  scrollController = createScrollController();
  responsive = new ResponsiveController(renderer, composer, camera);

  // Error handling — setup AFTER successful init (so it only catches runtime issues)
  errorCleanup = setupErrorHandling(canvas, overlay);

  // Reduced motion
  prefersReducedMotion = checkReducedMotion();
  motionCleanup = setupReducedMotionListener((reduced) => {
    prefersReducedMotion = reduced;
    console.log(`Phase3: prefers-reduced-motion = ${reduced}`);
  });

  animator = new AmbientAnimator();

  hideInitError();
} catch (e) {
  const msg = e.message || String(e);
  // Detect if this is a module import failure vs shader vs runtime
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
  if (!stageLabel || !stageTexts) return;
  let stage = stageDefs[0];
  for (const s of stageDefs) {
    if (progress >= s.range[0] && progress <= s.range[1]) { stage = s; break; }
  }
  stageLabel.textContent = stage.name;
  stageTexts.forEach(el => {
    el.classList.toggle('visible', el.dataset.stage === stage.id);
  });
}

// ═══════════════════════════════════════════════════
// SCENE STATE UPDATE (hero visibility)
// ═══════════════════════════════════════════════════
function updateHeroVisibility(progress) {
  heroWorld.visible = progress < 0.18;
}

// ═══════════════════════════════════════════════════
// SAFE WATER UNIFORM ACCESSOR (guards against null)
// ═══════════════════════════════════════════════════
function getWaterUniforms() {
  try {
    return oceanWorld?.userData?.waterMaterial?.uniforms || null;
  } catch {
    return null;
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

    // ── Camera ──
    const cs = getCameraAt(progress, isMobile, window.innerWidth / window.innerHeight);
    camera.position.copy(cs.pos);
    camera.lookAt(cs.look);
    camera.fov = cs.fov;
    camera.updateProjectionMatrix();

    // ── Scene state ──
    updateHeroVisibility(progress);
    const waterUniforms = getWaterUniforms();
    updateLightingForProgress(lightRig, scene, progress, quality, waterUniforms);
    updateStageUI(progress);
    updateBenefitNodes(benefitNodes, benefitCards, camera, progress);

    // ── Water shader time ──
    if (waterUniforms) {
      waterUniforms.uTime.value = ambientTime;
      waterUniforms.uCameraPos.value.copy(camera.position);
    }

    // ── Ambient animations ──
    if (!prefersReducedMotion) {
      animator.update(dt, ambientTime, progress, heroWorld, oceanWorld, quality);
    }

    // ── Progress ring ──
    if (progressRing) {
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
    composer.render();
  } catch (e) {
    // Category 4/5: Runtime error in animation loop — log, do NOT crash
    console.error('Phase3 render-loop error:', e.message || e, e.stack);
    // If this is a GPU context loss, the webglcontextlost handler takes over
    // Otherwise, try to continue next frame
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

console.log('Phase 3 ready — Modular architecture with InstancedMesh optimization');
console.log('  Keys 1-9 jump to stages | Scroll to drive narrative');
