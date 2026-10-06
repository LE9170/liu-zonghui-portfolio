// ═══════════════════════════════════════════════════
// RESPONSIVE CONTROLLER
// ═══════════════════════════════════════════════════
// Export class ResponsiveController:
// - constructor(renderer, composer, camera, scrollController)
// - onResize() — updates renderer, composer, camera aspect, calls ScrollTrigger.refresh()
// - Handles mobile address bar by using window.innerHeight directly
// - Debounce 200ms
// - Also handles orientationchange

export class ResponsiveController {
  constructor(renderer, composer, camera, { onResizeCallback } = {}) {
    this.renderer = renderer;
    this.composer = composer;
    this.camera = camera;
    this.onResizeCallback = onResizeCallback;
    this._debounceTimer = null;
    this._debounceMs = 200;

    this._boundResize = this._onResize.bind(this);
    window.addEventListener('resize', this._boundResize);
    window.addEventListener('orientationchange', this._onOrientationChange.bind(this));
  }

  _onResize() {
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.handleResize();
    }, this._debounceMs);
  }

  _onOrientationChange() {
    // Orientation change: resize immediately then debounce
    this.handleResize();
    if (this._debounceTimer) clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.handleResize();
    }, 500);
  }

  handleResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.renderer.setSize(w, h);
    if (this.composer) {
      this.composer.setSize(w, h);
    }
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();

    // Refresh ScrollTrigger
    if (typeof ScrollTrigger !== 'undefined') {
      ScrollTrigger.refresh();
    }

    // Callback for additional resize logic
    if (this.onResizeCallback) {
      this.onResizeCallback(w, h);
    }
  }

  dispose() {
    window.removeEventListener('resize', this._boundResize);
    window.removeEventListener('orientationchange', this._onOrientationChange);
    if (this._debounceTimer) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
  }
}
