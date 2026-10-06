import { checkReducedMotion } from './reduced-motion.js';

// ═══════════════════════════════════════════════════
// SCROLL CONTROLLER — GSAP ScrollTrigger wrapper
// ═══════════════════════════════════════════════════
// Export: createScrollController() → { getProgress: () => number }
// Handles mid-scroll refresh, pageshow (bfcache), and prefers-reduced-motion

export function createScrollController() {
  let narrativeProgress = 0;
  const driver = document.getElementById('scroll-driver');

  if (!driver) {
    console.warn('Phase3: #scroll-driver not found, scroll controller disabled');
    return { getProgress: () => 0 };
  }

  const prefersReducedMotion = checkReducedMotion();
  const scrub = prefersReducedMotion ? 0 : 1.2;

  // Register ScrollTrigger if not already done
  if (typeof gsap !== 'undefined' && gsap.registerPlugin) {
    gsap.registerPlugin(ScrollTrigger);
  }

  ScrollTrigger.create({
    trigger: '#scroll-driver',
    start: 'top top',
    end: 'bottom bottom',
    scrub,
    onUpdate: (self) => {
      narrativeProgress = self.progress;
    },
  });

  // Handle back/forward cache (pageshow)
  window.addEventListener('pageshow', () => {
    ScrollTrigger.refresh();
  });

  return { getProgress: () => narrativeProgress };
}
