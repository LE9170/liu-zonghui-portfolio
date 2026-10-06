import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ═══════════════════════════════════════════════════
// POST-PROCESSING — extracted from phase2.html lines 280-319
// ═══════════════════════════════════════════════════
// Export: createComposer(renderer, scene, camera, quality) → EffectComposer

// Vignette shader (custom, from phase2.html)
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0.45 },
  },
  vertexShader: /*glsl*/`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /*glsl*/`
    uniform sampler2D tDiffuse;
    uniform float intensity;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float dist = length(vUv - 0.5) * 1.6;
      float vignette = 1.0 - dist * intensity;
      color.rgb *= vignette;
      gl_FragColor = color;
    }
  `
};

// Film grain shader (subtle, for high tier)
const FilmGrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    intensity: { value: 0.03 },
  },
  vertexShader: /*glsl*/`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /*glsl*/`
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float intensity;
    varying vec2 vUv;
    float random(vec2 uv) {
      return fract(sin(dot(uv.xy, vec2(12.9898,78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float grain = random(vUv + uTime) * intensity;
      color.rgb += grain;
      gl_FragColor = color;
    }
  `
};

export function createComposer(renderer, scene, camera, quality) {
  const { bloomStrength } = quality;
  const width = window.innerWidth;
  const height = window.innerHeight;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  // Bloom — strength per quality tier
  if (bloomStrength > 0) {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(width, height),
      bloomStrength,  // strength per tier (high:0.25, medium:0.15, low:0)
      0.4,             // radius
      0.85             // threshold — only brightest areas bloom
    );
    composer.addPass(bloomPass);
  }

  // Vignette — intensity per tier
  const vignetteIntensity = quality.tier === 'high' ? 0.45 : (quality.tier === 'medium' ? 0.35 : 0.25);
  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms.intensity.value = vignetteIntensity;
  composer.addPass(vignettePass);

  // Film grain — only for high tier
  if (quality.tier === 'high') {
    const grainPass = new ShaderPass(FilmGrainShader);
    grainPass.uniforms.intensity.value = 0.03;
    composer.addPass(grainPass);
  }

  // Mark the last pass
  composer.passes[composer.passes.length - 1].renderToScreen = true;

  return composer;
}

export { VignetteShader, FilmGrainShader };
