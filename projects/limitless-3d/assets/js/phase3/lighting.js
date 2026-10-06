import * as THREE from 'three';

// ═══════════════════════════════════════════════════
// LIGHTING — extracted from phase2.html lines 956-1153
// ═══════════════════════════════════════════════════
// Export: createLighting(scene, quality) → rig object
// Export: updateLightingForProgress(rig, progress, quality)

// Pre-allocated colors for render-loop perf
const _cBgSurface = new THREE.Color(0x0a0a14);
const _cBgDeep    = new THREE.Color(0x060420);
const _cBgTemp    = new THREE.Color();
const _cFogSurface = new THREE.Color(0x121020);
const _cFogDeep    = new THREE.Color(0x080420);
const _cFogTemp    = new THREE.Color();
const _cAmbSurface = new THREE.Color(0x334455);
const _cAmbDeep    = new THREE.Color(0x1a1040);
const _cAmb        = new THREE.Color();
const _cKeySurface = new THREE.Color(0xffeedd);
const _cKeyDeep    = new THREE.Color(0x9988bb);

export function createLighting(scene, quality) {
  const { shadowEnabled } = quality;

  // Ambient
  const ambientLight = new THREE.AmbientLight(0x334455, 0.8);
  scene.add(ambientLight);

  // Hero key light (warm key + purple rim)
  const heroKey = new THREE.DirectionalLight(0xffeedd, 3.0);
  heroKey.position.set(5, 8, -5);
  heroKey.castShadow = shadowEnabled;
  if (shadowEnabled) {
    heroKey.shadow.mapSize.set(1024, 1024);
    heroKey.shadow.camera.near = 0.5;
    heroKey.shadow.camera.far = 50;
    heroKey.shadow.camera.left = -12;
    heroKey.shadow.camera.right = 12;
    heroKey.shadow.camera.top = 12;
    heroKey.shadow.camera.bottom = -12;
    heroKey.shadow.bias = -0.0005;
  }
  scene.add(heroKey);

  const heroRim = new THREE.PointLight(0x8060c0, 8, 6);
  heroRim.position.set(-2, 1.5, 2);
  scene.add(heroRim);

  // Surface sunlight
  const sunLight = new THREE.DirectionalLight(0xfff0e8, 2.0);
  sunLight.position.set(8, 10, 2);
  scene.add(sunLight);

  // Underwater key (angled beams)
  const uwKey = new THREE.DirectionalLight(0x9988cc, 1.8);
  uwKey.position.set(4, 2, 8);
  scene.add(uwKey);

  // Underwater coral fill
  const uwFill = new THREE.PointLight(0xcc4488, 5, 8);
  uwFill.position.set(-2, -3, 7);
  scene.add(uwFill);

  const uwFill2 = new THREE.PointLight(0x8844aa, 4, 8);
  uwFill2.position.set(2, -3.5, 12);
  scene.add(uwFill2);

  // Final CTA warm key + cool rim
  const finalKey = new THREE.PointLight(0xffd8a0, 6, 8);
  finalKey.position.set(0, -2, 13);
  scene.add(finalKey);

  const finalRim = new THREE.PointLight(0x8899cc, 4, 6);
  finalRim.position.set(0, -4, 16);
  scene.add(finalRim);

  return {
    ambientLight,
    heroKey,
    heroRim,
    sunLight,
    uwKey,
    uwFill,
    uwFill2,
    finalKey,
    finalRim,
  };
}

/**
 * Update scene background, fog, and light intensities based on scroll progress.
 * Must be called every frame with a pre-allocated waterUniforms object.
 * @param {object} rig - the lighting rig object returned by createLighting
 * @param {THREE.Scene} scene
 * @param {number} progress - 0 to 1
 * @param {object} quality - quality config
 * @param {object} waterUniforms - waterShaderMaterial.uniforms reference
 */
export function updateLightingForProgress(rig, scene, progress, quality, waterUniforms) {
  const { ambientLight, heroKey, heroRim, sunLight, uwKey, uwFill, uwFill2, finalKey, finalRim } = rig;

  // Dive transition zone: 0.55 - 0.59
  if (progress < 0.55) {
    // Surface
    scene.background = _cBgSurface;
    scene.fog.color.copy(_cFogSurface);
    scene.fog.density = 0.006;
    ambientLight.color.copy(_cAmbSurface);
    ambientLight.intensity = 0.8;
    heroKey.intensity = 3.0;
    heroKey.color.set(0xffeedd);
    heroRim.intensity = 8;
    sunLight.intensity = 2.0;
    uwKey.intensity = 0.3;
    uwFill.intensity = 1.5;
    uwFill2.intensity = 1.0;
    if (waterUniforms) {
      waterUniforms.uFresnelPower.value = 2.5;
      waterUniforms.uColorSurface.value.set('#e8b0c8');
      waterUniforms.uColorDeep.value.set('#604070');
      waterUniforms.uWaveAmp.value = 0.25;
    }
  } else if (progress < 0.59) {
    const t = (progress - 0.55) / 0.04;
    _cBgTemp.copy(_cBgSurface).lerp(_cBgDeep, t);
    scene.background = _cBgTemp;
    _cFogTemp.copy(_cFogSurface).lerp(_cFogDeep, t);
    scene.fog.color.copy(_cFogTemp);
    scene.fog.density = 0.006 + t * 0.012;
    _cAmb.copy(_cAmbSurface).lerp(_cAmbDeep, t);
    ambientLight.color.copy(_cAmb);
    ambientLight.intensity = 0.8 - t * 0.3;
    heroKey.intensity = 3.0 * (1 - t);
    heroRim.intensity = 8 * (1 - t);
    sunLight.intensity = 2.0 * (1 - t);
    uwKey.intensity = 0.3 + t * 1.5;
    uwFill.intensity = 1.5 + t * 3.5;
    uwFill2.intensity = 1.0 + t * 3.0;
    if (waterUniforms) {
      waterUniforms.uFresnelPower.value = 2.5 - t * 1.0;
      waterUniforms.uColorSurface.value.set('#e8b0c8');
      waterUniforms.uColorDeep.value.set('#604070');
      waterUniforms.uWaveAmp.value = 0.25 - t * 0.15;
    }
  } else {
    // Underwater
    scene.background = _cBgDeep;
    scene.fog.color.copy(_cFogDeep);
    scene.fog.density = 0.018;
    ambientLight.color.copy(_cAmbDeep);
    ambientLight.intensity = 0.5;
    heroKey.intensity = 0;
    heroRim.intensity = 0;
    sunLight.intensity = 0;
    uwKey.intensity = 1.8;
    uwFill.intensity = 5;
    uwFill2.intensity = 4;
    if (waterUniforms) {
      waterUniforms.uFresnelPower.value = 1.5;
      waterUniforms.uColorSurface.value.set('#403058');
      waterUniforms.uColorDeep.value.set('#302048');
      waterUniforms.uWaveAmp.value = 0.1;
    }
  }

  // Final CTA: bring up warm lights
  if (progress > 0.88) {
    const ft = (progress - 0.88) / 0.12;
    finalKey.intensity = 6 * ft;
    finalRim.intensity = 4 * ft;
  } else {
    finalKey.intensity = 0;
    finalRim.intensity = 0;
  }
}

// Also export colors for external use
export { _cBgSurface, _cBgDeep, _cFogSurface, _cFogDeep, _cAmbSurface, _cAmbDeep };
