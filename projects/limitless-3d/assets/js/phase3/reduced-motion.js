// Export checkReducedMotion() → boolean
// Export setupReducedMotionListener(callback) — listens for changes
// When active: skip long camera flights, freeze ambient animations, disable parallax

export function checkReducedMotion() {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mq.matches;
}

export function setupReducedMotionListener(callback) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const handler = (e) => callback(e.matches);
  // Use addEventListener for modern browsers, fallback for older ones
  if (mq.addEventListener) {
    mq.addEventListener('change', handler);
  } else {
    mq.addListener(handler);
  }
  // Return cleanup function
  return () => {
    if (mq.removeEventListener) {
      mq.removeEventListener('change', handler);
    } else {
      mq.removeListener(handler);
    }
  };
}
