import * as THREE from 'three';
import { getShotIndex, getLocalProgress, getAllShots } from './camera-rig.js?v=20260806-p5p';

// ═══════════════════════════════════════════════════════════════
// PHASE 5 CHAPTER CONTROLLER
// ═══════════════════════════════════════════════════════════════
//
// State machine managing 10 chapters:
//   0: PARTICLES — dark scene, particles + golden triangle
//   1: HERO — foggy rocks, product container, slow dolly
//   2: TRANSITION — pink fog occlusion planes
//   3: SURFACE — water surface, floaters, low flight
//   4: ISLAND — coral island, large fish occlusion
//   5: DIVE — water surface crossing
//   6: SEABED — capsule core, reef corridor
//   7: BENEFITS — S-curve flythrough, 5 nodes
//   8: INGREDIENTS — open water, icon stagger
//   9: FINAL — golden triangle, CTA, footer
//
// Drives: scene background color, fog (type/color/density),
// exposure, ambient light, directional light, post-processing params.

// ── Chapter-specific environment configs ──
const ENV_CONFIGS = [
  // 0: ENTRANCE (phase2 port) — near-black blue, phase2 surface fog, dim ambient
  {
    bgColor: new THREE.Color('#0a0a14'),
    fogColor: new THREE.Color('#121020'),
    fogDensity: 0.006,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#334455'),
    ambientIntensity: 0.8,
    directionalColor: new THREE.Color('#ffeedd'),
    directionalIntensity: 2.2,
    exposure: 1.0,
    bloomStrength: 0.10, // gold triangle halo against the dark sea
    waterOpacity: 0,
    skyOpacity: 0,
    dofAperture: 0.0001,
    dofMaxblur: 0.0005,
  },
  // 1: HERO (phase2 port) — same dark world, key light a touch stronger as
  // the dolly closes on the product (matches phase2 heroKey 3.0 feel scaled
  // into this rig's range).
  {
    bgColor: new THREE.Color('#0a0a14'),
    fogColor: new THREE.Color('#121020'),
    fogDensity: 0.006,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#334455'),
    ambientIntensity: 0.8,
    directionalColor: new THREE.Color('#ffeedd'),
    directionalIntensity: 2.6,
    exposure: 1.0,
    bloomStrength: 0.12,
    waterOpacity: 0,
    skyOpacity: 0,
    dofAperture: 0.0001,
    dofMaxblur: 0.0005,
  },
  // 2: TRANSITION — Deep pink base so the lighter mist blobs read as a moving sweep
  {
    bgColor: new THREE.Color('#d888ac'),
    fogColor: new THREE.Color('#d888ac'),
    fogDensity: 0.05,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#e8a8c4'),
    ambientIntensity: 1.1,
    directionalColor: new THREE.Color('#fff0f0'),
    directionalIntensity: 0.8,
    exposure: 0.9,
    bloomStrength: 0.06,
    waterOpacity: 0,
    skyOpacity: 0,
    dofAperture: 0.0004,
    dofMaxblur: 0.004,
  },
  // 3: SURFACE — Pink sky, bright water, warm
  {
    bgColor: new THREE.Color('#eec2d6'),
    fogColor: new THREE.Color('#e2a6c2'),
    fogDensity: 0.0017,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#f0d0e0'),
    ambientIntensity: 0.9,
    directionalColor: new THREE.Color('#fff8f0'),
    directionalIntensity: 1.0,
    exposure: 0.93,
    bloomStrength: 0.08,
    waterOpacity: 1.0,
    skyOpacity: 1.0,
    dofAperture: 0.00025,
    dofMaxblur: 0.0015,
  },
  // 4: ISLAND — Warm pink, brighter near island
  {
    bgColor: new THREE.Color('#f0c8d8'),
    fogColor: new THREE.Color('#e0b8d0'),
    fogDensity: 0.0016,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#f0d8e0'),
    ambientIntensity: 0.85,
    directionalColor: new THREE.Color('#fff8f0'),
    directionalIntensity: 1.1,
    exposure: 0.98,
    bloomStrength: 0.07,
    waterOpacity: 1.0,
    skyOpacity: 1.0,
    dofAperture: 0.0003,
    dofMaxblur: 0.0016,
  },
  // 5: DIVE — Transitional: half sky, half underwater (bright enough to read the plunge)
  {
    bgColor: new THREE.Color('#7a5a9a'),
    fogColor: new THREE.Color('#5a4480'),
    fogDensity: 0.0052,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#8060b8'),
    ambientIntensity: 1.0,
    directionalColor: new THREE.Color('#d8e0ff'),
    directionalIntensity: 0.7,
    exposure: 1.15,
    bloomStrength: 0.10,
    waterOpacity: 1.0,
    skyOpacity: 0.5,
    dofAperture: 0.0005,
    dofMaxblur: 0.0025,
  },
  // 6: SEABED — Purple underwater, sandy floor readable (reference: pale sand + dark pillars)
  {
    bgColor: new THREE.Color('#281840'),
    fogColor: new THREE.Color('#2a1c46'),
    fogDensity: 0.006,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#483a78'),
    ambientIntensity: 0.95,
    directionalColor: new THREE.Color('#c8d0ff'),
    directionalIntensity: 0.6,
    exposure: 0.98,
    bloomStrength: 0.12,
    waterOpacity: 0.15,
    skyOpacity: 0,
    dofAperture: 0.0003,
    dofMaxblur: 0.0016,
  },
  // 7: BENEFITS — Purple underwater, clearer for node readability
  {
    bgColor: new THREE.Color('#201838'),
    fogColor: new THREE.Color('#281848'),
    fogDensity: 0.0046,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#3c346e'),
    ambientIntensity: 0.95,
    directionalColor: new THREE.Color('#d0d8ff'),
    directionalIntensity: 0.6,
    exposure: 1.0,
    bloomStrength: 0.12,
    waterOpacity: 0.10,
    skyOpacity: 0,
    dofAperture: 0.00025,
    dofMaxblur: 0.0015,
  },
  // 8: INGREDIENTS — Open purple void, clean
  {
    bgColor: new THREE.Color('#1a1038'),
    fogColor: new THREE.Color('#201840'),
    fogDensity: 0.0033,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#302860'),
    ambientIntensity: 0.9,
    directionalColor: new THREE.Color('#e0e0ff'),
    directionalIntensity: 0.65,
    exposure: 1.05,
    bloomStrength: 0.10,
    waterOpacity: 0,
    skyOpacity: 0,
    dofAperture: 0.0002,
    dofMaxblur: 0.0014,
  },
  // 9: FINAL — Rich purple-black, dramatic (★ warmer key for golden triangle)
  {
    bgColor: new THREE.Color('#120a28'),
    fogColor: new THREE.Color('#180c30'),
    fogDensity: 0.0033,
    fogType: 'exp2',
    ambientColor: new THREE.Color('#282050'),
    ambientIntensity: 0.75,
    directionalColor: new THREE.Color('#ffe8c0'),
    directionalIntensity: 0.8,
    exposure: 0.9,
    bloomStrength: 0.16,
    waterOpacity: 0,
    skyOpacity: 0,
    dofAperture: 0.00015,
    dofMaxblur: 0.0012,
  },
];

// Pre-allocated temp colors for interpolation
const _tmpColA = new THREE.Color();
const _tmpColB = new THREE.Color();
const _prevChapterIdx = { value: -1 };

/**
 * Interpolate between two environment configs.
 * All numeric values are lerped; colors are lerped in RGB space.
 */
function lerpConfigs(cfgA, cfgB, t) {
  const tClamped = Math.max(0, Math.min(1, t));
  return {
    bgColor: _tmpColA.copy(cfgA.bgColor).lerp(cfgB.bgColor, tClamped).clone(),
    fogColor: _tmpColA.copy(cfgA.fogColor).lerp(cfgB.fogColor, tClamped).clone(),
    fogDensity: cfgA.fogDensity + (cfgB.fogDensity - cfgA.fogDensity) * tClamped,
    fogType: tClamped < 0.5 ? cfgA.fogType : cfgB.fogType,
    ambientColor: _tmpColA.copy(cfgA.ambientColor).lerp(cfgB.ambientColor, tClamped).clone(),
    ambientIntensity: cfgA.ambientIntensity + (cfgB.ambientIntensity - cfgA.ambientIntensity) * tClamped,
    directionalColor: _tmpColA.copy(cfgA.directionalColor).lerp(cfgB.directionalColor, tClamped).clone(),
    directionalIntensity: cfgA.directionalIntensity + (cfgB.directionalIntensity - cfgA.directionalIntensity) * tClamped,
    exposure: cfgA.exposure + (cfgB.exposure - cfgA.exposure) * tClamped,
    bloomStrength: cfgA.bloomStrength + (cfgB.bloomStrength - cfgA.bloomStrength) * tClamped,
    waterOpacity: cfgA.waterOpacity + (cfgB.waterOpacity - cfgA.waterOpacity) * tClamped,
    skyOpacity: cfgA.skyOpacity + (cfgB.skyOpacity - cfgA.skyOpacity) * tClamped,
    dofAperture: (cfgA.dofAperture ?? 0) + ((cfgB.dofAperture ?? 0) - (cfgA.dofAperture ?? 0)) * tClamped,
    dofMaxblur: (cfgA.dofMaxblur ?? 0.004) + ((cfgB.dofMaxblur ?? 0.004) - (cfgA.dofMaxblur ?? 0.004)) * tClamped,
  };
}

/**
 * Get the interpolated environment config for a given global progress.
 * Smoothly blends between adjacent chapter configs near boundaries.
 */
export function getEnvConfig(progress) {
  const chIdx = getShotIndex(progress);
  const localP = getLocalProgress(progress, chIdx);

  // Map 18 shots → 10 configs:
  //   shot0 particles→0, shot1 tunnel+hero→1, shot2 pink wipe→2,
  //   shots3-5 surface→3, shots6-7 island/fish→4, shot8 dive→5,
  //   shot9 capsule/seabed→6, shots10-14 benefits→7, shot15 ingredients→8,
  //   shot16 final-trans→8, shot17 final CTA→9
  const shotToCfg = [0,1,2,3,3,3,4,4,5,6,7,7,7,7,7,8,8,9];
  const cfgIdx = Math.min(shotToCfg[chIdx] ?? 0, ENV_CONFIGS.length - 1);
  const cfgCurrent = ENV_CONFIGS[cfgIdx];

  // Blend with next config near the end of current shot (last 15% of local progress)
  if (localP > 0.85 && cfgIdx < ENV_CONFIGS.length - 1) {
    const blendT = (localP - 0.85) / 0.15;
    const cfgNext = ENV_CONFIGS[cfgIdx + 1];
    return lerpConfigs(cfgCurrent, cfgNext, blendT);
  }

  // Blend with previous config near the start (first 15% of local progress)
  if (localP < 0.15 && cfgIdx > 0) {
    const blendT = 1 - (localP / 0.15);
    const cfgPrev = ENV_CONFIGS[cfgIdx - 1];
    return lerpConfigs(cfgPrev, cfgCurrent, blendT);
  }

  return cfgCurrent;
}

/**
 * Apply environment config to the THREE scene and related objects.
 * Called every frame from the main loop.
 *
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @param {object} lightRig — { ambient, directional }
 * @param {object} env — result of getEnvConfig()
 * @param {object} options — { waterUniforms, skyMesh, composer (for bloom) }
 */
export function applyEnvConfig(scene, renderer, lightRig, env, options = {}) {
  // Scene background & fog
  scene.background = env.bgColor;

  if (scene.fog) {
    if (env.fogType === 'exp2' && scene.fog.isFogExp2) {
      scene.fog.color.copy(env.fogColor);
      scene.fog.density = env.fogDensity;
    } else if (env.fogType === 'exp2') {
      scene.fog = new THREE.FogExp2(env.fogColor, env.fogDensity);
    }
  } else {
    scene.fog = new THREE.FogExp2(env.fogColor, env.fogDensity);
  }

  // Renderer exposure & tone mapping
  renderer.toneMappingExposure = env.exposure;

  // Lights
  if (lightRig) {
    if (lightRig.ambient) {
      lightRig.ambient.color.copy(env.ambientColor);
      lightRig.ambient.intensity = env.ambientIntensity;
    }
    if (lightRig.directional) {
      lightRig.directional.color.copy(env.directionalColor);
      lightRig.directional.intensity = env.directionalIntensity;
    }
  }

  // Water surface opacity
  if (options.waterUniforms) {
    const wu = options.waterUniforms;
    if (wu.uOpacity !== undefined) {
      wu.uOpacity.value = env.waterOpacity;
    }
  }

  // Sky backdrop visibility
  if (options.skyMesh) {
    options.skyMesh.visible = env.skyOpacity > 0.01;
    if (options.skyMesh.material && options.skyMesh.material.opacity !== undefined) {
      options.skyMesh.material.opacity = env.skyOpacity;
    }
  }

  // Bloom strength update (if composer available)
  if (options.composer) {
    const passes = options.composer.passes || [];
    for (const pass of passes) {
      if (pass.strength !== undefined) {
        pass.strength = env.bloomStrength;
      }
    }
  }
}

/**
 * Check if we just crossed a chapter boundary.
 * Returns the new chapter index if changed, otherwise -1.
 */
export function checkChapterChange(progress) {
  const current = getShotIndex(progress);
  const shotToCfg = [0,1,2,3,3,3,4,4,5,6,7,7,7,7,7,8,8,9];
  const mapped = Math.min(shotToCfg[current] ?? 0, ENV_CONFIGS.length - 1);
  if (mapped !== _prevChapterIdx.value) {
    const prev = _prevChapterIdx.value;
    _prevChapterIdx.value = mapped;
    return mapped;
  }
  return -1;
}

/**
 * Reset the chapter change tracker (call on init).
 */
export function resetChapterTracker() {
  _prevChapterIdx.value = -1;
}

export { ENV_CONFIGS };
