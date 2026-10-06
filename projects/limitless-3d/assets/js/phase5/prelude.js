/**
 * Phase 5 — Prelude (final.html opening) ⇄ Journey bidirectional handoff
 *
 * Down:  iframe scrolled to its end (≥98.5%) / Skip / Continue → fade into Phase 5.
 * Up:    the journey is ONE continuous reversible timeline — wheeling up anywhere
 *        scrubs shots 18 → 1 through the shared ScrollTrigger progress (no page
 *        jumps, no re-init). Only when the journey's REAL progress is back at
 *        ≤0.5%, the page has settled motionless, and a FRESH up-gesture arrives,
 *        does the boundary handoff return to final.html's first screen.
 *
 * History: entering the journey pushState()s `?skipIntro=1` (returnable URL —
 * browser Back/Forward follow the same boundary states); returning uses
 * history.back() when this session pushed the entry, replaceState otherwise.
 * History is used ONLY for the boundary handoff, never for mid-timeline scroll.
 *
 * A 500ms lock guards both directions plus gesture/settle gating on the return
 * side, so wheel bursts, momentum tails, and jitter cannot cause repeated or
 * premature handoffs.
 */
const root = document.documentElement;
const prelude = document.getElementById('phase5-prelude');

if (prelude) {
  const frame = document.getElementById('phase5-prelude-frame');
  const hint = document.getElementById('phase5-prelude-hint');
  const progress = document.getElementById('phase5-prelude-progress');
  const progressFill = progress?.querySelector('i');
  const skipButton = document.getElementById('phase5-prelude-skip');
  const continueButton = document.getElementById('phase5-prelude-continue');
  const FRAME_SRC = frame?.getAttribute('src') || './final.html?phase5Prelude=1';

  const LOCK_MS = 500;           // 300–600ms handoff lock, both directions
  const ENTER_THRESHOLD = 0.985; // iframe progress that triggers → Phase 5
  const RETURN_THRESHOLD = 0.005;// journey REAL progress ≤ 0.5% before ← prelude
  const TOP_SETTLE_MS = 250;     // page must sit motionless at the top this long
  const GESTURE_GAP_MS = 180;    // wheel ticks closer than this = same gesture

  let frameWindow = null;
  let frameDocument = null;
  let leaving = false;
  let ready = false;
  let journeyPushed = false; // this session pushed a ?skipIntro=1 history entry
  let handoffLockUntil = 0;
  let lastJourneyScrollAt = 0; // last time the journey page actually moved
  let lastUpWheelAt = 0;       // last upward wheel tick (gesture segmentation)
  let upGestureArmed = false;  // current up-gesture started settled at the top

  const lockHandoff = () => { handoffLockUntil = performance.now() + LOCK_MS; };
  const handoffLocked = () => performance.now() < handoffLockUntil;

  const getProgress = () => {
    if (!frameWindow || !frameDocument) return 0;
    const scrollRoot = frameDocument.scrollingElement || frameDocument.documentElement;
    const maxScroll = Math.max(0, scrollRoot.scrollHeight - frameWindow.innerHeight);
    return maxScroll === 0 ? 1 : Math.min(1, Math.max(0, frameWindow.scrollY / maxScroll));
  };

  const getJourneyProgress = () => {
    const el = document.scrollingElement || document.documentElement;
    const maxScroll = Math.max(0, el.scrollHeight - window.innerHeight);
    return maxScroll === 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / maxScroll));
  };

  const renderProgress = () => {
    const value = getProgress();
    const percent = Math.round(value * 100);
    if (progressFill) progressFill.style.width = `${percent}%`;
    progress?.setAttribute('aria-valuenow', String(percent));

    const atEnd = value >= 0.96;
    if (continueButton) continueButton.hidden = !atEnd;
    if (skipButton) skipButton.hidden = atEnd;
    if (hint) hint.textContent = atEnd
      ? 'Continue into the 3D journey'
      : 'Scroll through the opening';
  };

  // ── forward: prelude → Phase 5 journey ──────────────────────────────
  const enterPhase5 = (fromHistory = false) => {
    if (leaving) return;
    if (!fromHistory) {
      if (handoffLocked()) return;
      lockHandoff();
    }
    leaving = true;
    prelude.classList.add('is-leaving');
    window.__phase5PreludeActive = false;
    // Fresh journey entry: no up-gesture may fire until the page has settled.
    upGestureArmed = false;
    lastUpWheelAt = 0;
    lastJourneyScrollAt = performance.now();

    if (!fromHistory) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('skipIntro', '1');
        history.pushState({ p5handoff: 'journey' }, '', url);
        journeyPushed = true;
      } catch (error) { /* history denied (e.g. file://) — handoff still works */ }
    }

    window.setTimeout(() => {
      root.classList.remove('phase5-prelude-active');
      prelude.classList.remove('is-leaving');
      window.scrollTo(0, 0);
      window.dispatchEvent(new CustomEvent('phase5:prelude-complete'));
      // NOTE: the prelude stays in the DOM (display:none) and the iframe keeps
      // its state — required for the upward return handoff.
      document.getElementById('phase2-canvas')?.focus?.({ preventScroll: true });
    }, 720);
  };

  // ── backward: Phase 5 journey → prelude (final.html first screen) ───
  const restorePrelude = () => {
    if (window.__phase5PreludeActive) return;
    lockHandoff();
    window.__phase5PreludeActive = true;
    leaving = false;

    // Rewind the opening to its initial first screen while it is still hidden.
    // (Key on the src attribute, not frameWindow: after a ?skipIntro=1 boot the
    // iframe sits on about:blank — its window is truthy but final.html was
    // never loaded, so the deferred load must be triggered first.)
    if (frame && !frame.getAttribute('src')) {
      frame.src = FRAME_SRC; // deferred load (page was opened with ?skipIntro=1)
    } else if (frameWindow) {
      try { frameWindow.scrollTo(0, 0); } catch (error) { /* frame unavailable */ }
    }

    window.scrollTo(0, 0); // pin the journey at its top behind the prelude
    root.classList.add('phase5-prelude-active');

    // Fade the prelude back in (same transition as the leave, reversed).
    prelude.classList.add('is-leaving');
    void prelude.offsetWidth; // force reflow so the transition actually runs
    requestAnimationFrame(() => prelude.classList.remove('is-leaving'));

    renderProgress();
    window.dispatchEvent(new CustomEvent('phase5:prelude-restored'));
  };

  const returnToPrelude = () => {
    if (journeyPushed) {
      journeyPushed = false;
      history.back(); // popstate → restorePrelude (returnable URL)
    } else {
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete('skipIntro');
        history.replaceState({ p5handoff: 'prelude' }, '', url);
      } catch (error) { /* history denied */ }
      restorePrelude();
    }
  };

  // ── triggers ────────────────────────────────────────────────────────
  const onWheel = (event) => {
    if (event.deltaY > 0 && getProgress() >= ENTER_THRESHOLD) {
      event.preventDefault();
      enterPhase5();
    }
  };

  const onKeyDown = (event) => {
    const forwardKeys = ['ArrowDown', 'PageDown', ' ', 'End'];
    if (forwardKeys.includes(event.key) && getProgress() >= ENTER_THRESHOLD) {
      event.preventDefault();
      enterPhase5();
    }
  };

  // ── Journey top gating ──────────────────────────────────────────────
  // Wheeling up ANYWHERE in the journey simply scrolls the page up — the
  // shared ScrollTrigger progress scrubs shots 18 → 1 in reverse (particles,
  // text, DOF, camera all follow the same interpolation, no re-init). The
  // handoff back to final.html may ONLY fire when ALL of these hold:
  //   1. the journey's real scroll progress is back at ≤ 0.5%;
  //   2. the page has sat motionless at the top for ≥ 250ms (no momentum tail
  //      — scroll events stopped);
  //   3. the upward wheel tick belongs to a FRESH gesture that started while
  //      already settled at the top (a hard flick from mid-timeline keeps its
  //      ticks in one gesture and can never carry through into the prelude).
  const journeyAtTop = () => getJourneyProgress() <= RETURN_THRESHOLD;

  window.addEventListener('scroll', () => {
    if (!window.__phase5PreludeActive) lastJourneyScrollAt = performance.now();
  }, { passive: true });

  const onJourneyWheel = (event) => {
    if (window.__phase5PreludeActive) return;
    if (event.deltaY >= 0) { upGestureArmed = false; return; }
    // event.timeStamp is stamped at input-pipeline entry — main-thread jank
    // (heavy WebGL frames) delays PROCESSING but not the timestamp, so a fast
    // flick's ticks still measure as one continuous gesture.
    const now = event.timeStamp || performance.now();
    const freshGesture = now - lastUpWheelAt > GESTURE_GAP_MS;
    lastUpWheelAt = now;
    if (!journeyAtTop()) { upGestureArmed = false; return; } // timeline rewinding
    if (freshGesture) upGestureArmed = now - lastJourneyScrollAt >= TOP_SETTLE_MS;
    if (!upGestureArmed) return;
    event.preventDefault();
    if (handoffLocked()) return;
    lockHandoff();
    upGestureArmed = false;
    returnToPrelude();
  };

  const onJourneyKeyDown = (event) => {
    if (window.__phase5PreludeActive) return;
    if (!['ArrowUp', 'PageUp', 'Home'].includes(event.key)) return;
    if (!journeyAtTop()) return; // let native scroll rewind the timeline
    if (performance.now() - lastJourneyScrollAt < TOP_SETTLE_MS) return;
    event.preventDefault();
    if (handoffLocked()) return;
    lockHandoff();
    returnToPrelude();
  };

  // Browser Back / Forward follow the same handoff states.
  window.addEventListener('popstate', (event) => {
    if (event.state && event.state.p5handoff === 'journey') {
      if (window.__phase5PreludeActive) {
        journeyPushed = true;
        enterPhase5(true);
      }
    } else if (!window.__phase5PreludeActive) {
      restorePrelude();
    }
  });

  const connectFrame = () => {
    if (leaving) return;
    if (!frame.getAttribute('src')) return; // deferred/blanked iframe — not the opening
    try {
      frameWindow = frame.contentWindow;
      frameDocument = frame.contentDocument;
      if (!frameWindow || !frameDocument) throw new Error('Opening frame is unavailable.');

      frameWindow.addEventListener('scroll', renderProgress, { passive: true });
      frameWindow.addEventListener('wheel', onWheel, { passive: false });
      frameWindow.addEventListener('keydown', onKeyDown);
      ready = true;
      renderProgress();
    } catch (error) {
      console.warn('[Phase5 prelude] Could not connect to final.html:', error);
      if (hint) hint.textContent = 'Opening unavailable';
      if (continueButton) continueButton.hidden = false;
    }
  };

  frame?.addEventListener('load', connectFrame);
  frame?.addEventListener('error', () => {
    if (hint) hint.textContent = 'Opening failed to load';
    if (continueButton) continueButton.hidden = false;
  });

  skipButton?.addEventListener('click', () => enterPhase5());
  continueButton?.addEventListener('click', () => enterPhase5());
  window.addEventListener('wheel', onJourneyWheel, { passive: false });
  window.addEventListener('keydown', onJourneyKeyDown);

  // Browser scroll restoration would fight the handoff pinning — manage it here.
  try { history.scrollRestoration = 'manual'; } catch (error) { /* unsupported */ }

  if (window.__phase5PreludeActive === true) {
    try { history.replaceState({ p5handoff: 'prelude' }, ''); } catch (error) { /* denied */ }
    window.setTimeout(() => {
      if (!ready && !leaving && window.__phase5PreludeActive) connectFrame();
    }, 1500);
  } else if (frame) {
    // Opened with ?skipIntro=1: keep the prelude in the DOM but defer the
    // iframe — final.html only loads if the user scrolls back up into it.
    frame.removeAttribute('src');
    try { history.replaceState({ p5handoff: 'journey' }, ''); journeyPushed = false; } catch (error) { /* denied */ }
  }
}
