/**
 * Error handling for Phase 3 WebGL experience.
 *
 * Error categories (distinct, never conflated):
 *   1. WebGL context creation failure  — renderer constructor throws
 *   2. WebGL context lost at runtime     — webglcontextlost event
 *   3. Module / import failure           — caught by try/catch in main.js init
 *   4. Shader compilation error          — THREE.WebGLProgram console warning (non-fatal)
 *   5. Runtime JS error                  — window.onerror (logged, does NOT show WebGL fallback)
 *
 * Rules:
 *   - NEVER create a second WebGL context to "check" support (wastes contexts, may fail spuriously)
 *   - ONLY show the #error-fallback for categories 1 and 2 (actual WebGL/GPU failure)
 *   - Categories 3-5 log to console with full stack; init failure shows #init-error (separate element)
 */

/**
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLElement} overlay
 * @returns {() => void} cleanup function
 */
export function setupErrorHandling(canvas, overlay) {
  const errorFallback = document.getElementById('error-fallback');
  const initErrorEl   = document.getElementById('init-error');

  if (!errorFallback) {
    console.warn('Phase3: #error-fallback element not found');
  }

  // ── Category 2: GPU context lost ──────────────────
  const onContextLost = (event) => {
    event.preventDefault();
    console.warn('Phase3: WebGL context lost — showing fallback');
    if (errorFallback) errorFallback.hidden = false;
    if (canvas)       canvas.style.display = 'none';
    if (overlay)      overlay.style.display = 'none';
  };

  const onContextRestored = () => {
    console.log('Phase3: WebGL context restored — hiding fallback');
    if (errorFallback) errorFallback.hidden = true;
    if (canvas)       canvas.style.display = '';
    if (overlay)      overlay.style.display = '';
  };

  canvas.addEventListener('webglcontextlost', onContextLost);
  canvas.addEventListener('webglcontextrestored', onContextRestored);

  // ── Category 5: Runtime JS errors — log, do NOT show WebGL fallback ──
  const onError = (event) => {
    const msg = event.message || event.error?.message || 'Unknown error';
    const stack = event.error?.stack || '(no stack)';
    console.error('Phase3 runtime error:', msg, '\n', stack);

    // Show a small inline error banner in the init-error element (not the WebGL fallback)
    if (initErrorEl) {
      initErrorEl.hidden = false;
      initErrorEl.innerHTML = `<p><strong>Runtime Error</strong><br><code>${msg}</code></p><p style="font-size:0.7rem;color:#666;">See console for details. Refresh to retry.</p>`;
    }

    // NEVER hide canvas or show WebGL fallback for JS errors
  };
  window.addEventListener('error', onError);

  // ── Unhandled promise rejections ──
  const onRejection = (event) => {
    console.error('Phase3 unhandled rejection:', event.reason);
    if (initErrorEl) {
      initErrorEl.hidden = false;
      initErrorEl.innerHTML = `<p><strong>Promise Rejection</strong><br><code>${String(event.reason).slice(0, 120)}</code></p>`;
    }
  };
  window.addEventListener('unhandledrejection', onRejection);

  // ── Cleanup ──
  return () => {
    canvas.removeEventListener('webglcontextlost', onContextLost);
    canvas.removeEventListener('webglcontextrestored', onContextRestored);
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

/**
 * Call once during init, BEFORE creating the renderer.
 * Returns true if WebGL is available (cheap check — does NOT create a permanent context).
 * Use this ONLY to decide whether to proceed with Renderer creation.
 */
export function checkWebGLSupport() {
  // Check for the WebGLRenderingContext constructor — fast, no context created
  if (typeof WebGLRenderingContext === 'undefined' && typeof WebGL2RenderingContext === 'undefined') {
    return false;
  }
  return true;
}

/**
 * Call right after renderer creation. Verifies the renderer's own context is valid.
 * Does NOT create a second context.
 */
export function verifyRendererContext(renderer) {
  if (!renderer || !renderer.getContext || !renderer.getContext()) {
    throw new Error('WebGLRenderer created but context is null — GPU may be unavailable');
  }
  // Check for context loss flag
  const gl = renderer.getContext();
  if (gl.isContextLost && gl.isContextLost()) {
    throw new Error('WebGL context already lost at creation time');
  }
  return true;
}
