import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

// ═══════════════════════════════════════════════════════════════
// PHASE 5 CINEMATIC DEPTH OF FIELD
// ═══════════════════════════════════════════════════════════════
//
// Self-contained bokeh DOF pass (the vendored three addons ship BokehPass
// but NOT BokehShader, so the pass and shader live here — a Phase-5-owned
// module, no vendor modification).
//
// Design rules (from the art-final spec):
//   - Focus follows the camera look-target (the current shot's subject),
//     passed in every frame — never jumps, always smoothed.
//   - Foreground occluders may soften, subject stays crisp, far field melts.
//   - Aperture/maxblur come from per-chapter configs (lerped upstream) plus
//     a brief soft-focus spike during the water crossing.
//   - DOM text is an HTML overlay → unaffected by this WebGL pass, so the
//     final CTA copy always stays sharp.
//   - Quality gate: disabled on mobile, via ?dof=0, or automatically when
//     sustained frame time exceeds budget (main.js drives setEnabled).

const BOKEH_FRAG = /* glsl */`
  uniform sampler2D tColor;
  uniform sampler2D tDepth;
  uniform float uFocus;     // world distance to subject
  uniform float uAperture;  // blur growth per unit of defocus
  uniform float uMaxblur;   // clamp, in UV units (e.g. 0.004)
  uniform float uNear;
  uniform float uFar;
  uniform float uAspect;
  varying vec2 vUv;

  float unpackDepth( vec4 v ) {
    return dot( v, vec4( 1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0 ) );
  }
  float viewDist( vec2 uv ) {
    float d = unpackDepth( texture2D( tDepth, uv ) );
    // perspectiveDepthToViewZ
    return ( uNear * uFar ) / ( ( uFar - uNear ) * d - uFar ); // negative
  }
  float blurAt( vec2 uv ) {
    float factor = uFocus + viewDist( uv ); // 0 when in focus
    return clamp( factor * uAperture, -uMaxblur, uMaxblur );
  }

  void main() {
    vec2 aspect = vec2( uAspect, 1.0 );
    // 3 concentric rings, 25 taps total, evenly angled — no duplicate taps.
    vec2 b = vec2( blurAt( vUv ) ) / aspect;
    vec4 col = texture2D( tColor, vUv );
    // ring 1 (r = 0.45, 6 taps)
    col += texture2D( tColor, vUv + vec2(  0.450,  0.000 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.225,  0.390 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.225,  0.390 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.450,  0.000 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.225, -0.390 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.225, -0.390 ) * b );
    // ring 2 (r = 0.72, 8 taps)
    col += texture2D( tColor, vUv + vec2(  0.720,  0.000 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.509,  0.509 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.000,  0.720 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.509,  0.509 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.720,  0.000 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.509, -0.509 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.000, -0.720 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.509, -0.509 ) * b );
    // ring 3 (r = 1.0, 10 taps)
    col += texture2D( tColor, vUv + vec2(  1.000,  0.000 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.809,  0.588 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.309,  0.951 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.309,  0.951 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.809,  0.588 ) * b );
    col += texture2D( tColor, vUv + vec2( -1.000,  0.000 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.809, -0.588 ) * b );
    col += texture2D( tColor, vUv + vec2( -0.309, -0.951 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.309, -0.951 ) * b );
    col += texture2D( tColor, vUv + vec2(  0.809, -0.588 ) * b );
    gl_FragColor = col / 25.0;
  }
`;

const BOKEH_VERT = /* glsl */`
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }
`;

class DofPass extends Pass {
  constructor( scene, camera, depthExclude ) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.depthExclude = Array.isArray( depthExclude ) ? depthExclude : [];
    this.needsSwap = true;

    this.renderTargetDepth = new THREE.WebGLRenderTarget( 1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
    } );
    this.renderTargetDepth.texture.name = 'P5Dof.depth';

    this.materialDepth = new THREE.MeshDepthMaterial();
    this.materialDepth.depthPacking = THREE.RGBADepthPacking;
    this.materialDepth.blending = THREE.NoBlending;

    this.uniforms = {
      tColor: { value: null },
      tDepth: { value: this.renderTargetDepth.texture },
      uFocus: { value: 8.0 },
      uAperture: { value: 0.3 },
      uMaxblur: { value: 0.004 },
      uNear: { value: camera.near },
      uFar: { value: camera.far },
      uAspect: { value: camera.aspect },
    };
    this.materialBokeh = new THREE.ShaderMaterial( {
      uniforms: this.uniforms,
      vertexShader: BOKEH_VERT,
      fragmentShader: BOKEH_FRAG,
    } );
    this.fsQuad = new FullScreenQuad( this.materialBokeh );

    // Smoothed uniform state — update() moves targets, render() approaches
    this._focus = 8.0; this._aperture = 0.3; this._maxblur = 0.004;
    this._tFocus = 8.0; this._tAperture = 0.3; this._tMaxblur = 0.004;
  }

  setSize( width, height ) {
    this.renderTargetDepth.setSize( width, height );
  }

  /** Set targets; the pass eases toward them (no frame-to-frame jumps). */
  update( dt, focusDist, aperture, maxblur ) {
    if ( Number.isFinite( focusDist ) && focusDist > 0.05 ) this._tFocus = focusDist;
    if ( Number.isFinite( aperture ) ) this._tAperture = Math.max( 0, aperture );
    if ( Number.isFinite( maxblur ) ) this._tMaxblur = Math.max( 0.0005, maxblur );
    const k = 1 - Math.exp( -Math.max( dt, 0.001 ) * 6.0 );
    this._focus += ( this._tFocus - this._focus ) * k;
    this._aperture += ( this._tAperture - this._aperture ) * k;
    this._maxblur += ( this._tMaxblur - this._maxblur ) * k;
  }

  render( renderer, writeBuffer, readBuffer ) {
    // ── 1. Depth pre-pass (exclude additive dust/streak/glow: they must not
    //        punch square holes into the depth field)
    const hidden = [];
    for ( const o of this.depthExclude ) {
      if ( o && o.visible ) { o.visible = false; hidden.push( o ); }
    }
    const oldOverride = this.scene.overrideMaterial;
    const oldBg = this.scene.background;
    const oldFog = this.scene.fog;
    this.scene.overrideMaterial = this.materialDepth;
    this.scene.background = null;
    this.scene.fog = null;
    renderer.setRenderTarget( this.renderTargetDepth );
    renderer.clear();
    renderer.render( this.scene, this.camera );
    this.scene.overrideMaterial = oldOverride;
    this.scene.background = oldBg;
    this.scene.fog = oldFog;
    for ( const o of hidden ) o.visible = true;

    // ── 2. Bokeh composite
    this.uniforms.tColor.value = readBuffer.texture;
    this.uniforms.uFocus.value = this._focus;
    this.uniforms.uAperture.value = this._aperture;
    this.uniforms.uMaxblur.value = this._maxblur;
    this.uniforms.uNear.value = this.camera.near;
    this.uniforms.uFar.value = this.camera.far;
    this.uniforms.uAspect.value = this.camera.aspect;
    renderer.setRenderTarget( this.renderToScreen ? null : writeBuffer );
    if ( this.clear ) renderer.clear();
    this.fsQuad.render( renderer );
  }

  dispose() {
    this.renderTargetDepth.dispose();
    this.materialDepth.dispose();
    this.materialBokeh.dispose();
    this.fsQuad.dispose();
  }
}

/**
 * Create and insert the DOF pass right after the RenderPass (before bloom).
 * Returns null when DOF should not run — caller treats null as "no DOF".
 */
export function createDof( composer, scene, camera, sd, { isMobile = false } = {} ) {
  const params = new URLSearchParams( window.location.search );
  if ( params.get( 'dof' ) === '0' ) return null;
  if ( isMobile ) return null;
  if ( !composer || !scene || !camera ) return null;

  // Objects whose additive/screen-space rendering must not write depth.
  // NOTE: pSys01 (opening cluster) is intentionally NOT excluded — it renders
  // as 1px depth dots under the override material, giving every particle core
  // a correct depth so the gathered cluster stays sharp at the focus plane.
  // Excluded objects sample the cleared FAR depth and would sit at max blur.
  const depthExclude = [];
  if ( sd?.snS ) depthExclude.push( sd.snS );
  try {
    scene.traverse( o => {
      if ( o.isSprite ) depthExclude.push( o );
      if ( o.isPoints && o.material?.blending === THREE.AdditiveBlending ) depthExclude.push( o );
      // Screen-space planes (pink wipe blobs, light streak): they sit within
      // 2 units of the camera and would flood the depth field with near values
      if ( o.isMesh && o.material && o.material.depthTest === false ) depthExclude.push( o );
      // Explicit opt-out (p5p opening fog planes: depthTest:true transparent
      // planes that must not paint their quad into the depth field)
      if ( o.isMesh && o.userData && o.userData.depthExclude === true ) depthExclude.push( o );
    } );
  } catch ( e ) { /* traverse guard — exclusions are best-effort */ }

  const pass = new DofPass( scene, camera, depthExclude );

  // Insert after RenderPass (index 0) so bloom stays the final screen pass
  if ( typeof composer.insertPass === 'function' ) composer.insertPass( pass, 1 );
  else composer.addPass( pass );

  let enabled = true;
  return {
    pass,
    update( dt, focusDist, aperture, maxblur ) { if ( enabled ) pass.update( dt, focusDist, aperture, maxblur ); },
    /** Hard disable for sustained low FPS — never re-enables mid-session. */
    setEnabled( v ) { enabled = !!v; pass.enabled = !!v; },
    isEnabled() { return enabled; },
  };
}
