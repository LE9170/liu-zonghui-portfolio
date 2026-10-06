import * as THREE from 'three';

// ═══════════════════════════════════════════════════════════════
// PHASE 5A.3 — 18 SHOT CAMERA RIG (half-open boundaries)
// ═══════════════════════════════════════════════════════════════
// Shots 1-17: progress >= start && progress < end
// Shot 18:    progress >= start && progress <= end
// Verification points are midpoints of each range.

const _cr = { p0: new THREE.Vector3(), p1: new THREE.Vector3(), p2: new THREE.Vector3(), p3: new THREE.Vector3() };
function cr(out, p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  out.set(0.5*((2*p1.x)+(-p0.x+p2.x)*t+(2*p0.x-5*p1.x+4*p2.x-p3.x)*t2+(-p0.x+3*p1.x-3*p2.x+p3.x)*t3),0.5*((2*p1.y)+(-p0.y+p2.y)*t+(2*p0.y-5*p1.y+4*p2.y-p3.y)*t2+(-p0.y+3*p1.y-3*p2.y+p3.y)*t3),0.5*((2*p1.z)+(-p0.z+p2.z)*t+(2*p0.z-5*p1.z+4*p2.z-p3.z)*t2+(-p0.z+3*p1.z-3*p2.z+p3.z)*t3));
  return out;
}
function sampleCR(pts, t, out) {
  const n = pts.length;
  if (n < 4) { const seg = Math.min(Math.floor(t * (n - 1)), n - 2); const lt = (t * (n - 1)) - seg; return out.copy(pts[seg]).lerp(pts[seg + 1], lt); }
  const ns = n - 3, sf = t * ns; const seg = Math.min(Math.floor(sf), ns - 1), lt = sf - seg;
  return cr(out, pts[seg], pts[seg + 1], pts[seg + 2], pts[seg + 3], lt);
}

const EASE = {
  inOutQuad: t => t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2,
  inCubic: t => t*t*t, outCubic: t => 1 - Math.pow(1-t,3),
  inOutCubic: t => t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2,
  linear: t => t, inQuad: t => t*t,
};

// ── SHOT DEFINITIONS (half-open: start ≤ p < end; #18: start ≤ p ≤ end) ──
// vfy = verification point (inside range, never at boundary)
const SHOTS = [
  { n:'ENTRANCE (phase2)',      s:0.000, e:0.050, vfy:0.025,
    // p5p: phase2.html opening port. Slow dolly toward the dark hero scene:
    // phase2 key t=0.00 → t=0.03 mapped onto shot 0 (p 0→0.05). Linear like
    // phase2's own keyframe lerp.
    pos:[[0,0.50,-9.0],[0,0.55,-8.3],[0,0.60,-7.5]],
    look:[[0,0.55,0],[0,0.58,0],[0,0.60,0]], fov:[40,40], ez:'linear', sub:'productCan' },
  { n:'HERO DOLLY (phase2)',    s:0.050, e:0.120, vfy:0.085,
    // phase2 key t=0.03 → t=0.12 mapped onto shot 1 (p 0.05→0.12). Ends at
    // [0.40,1.00,-4.5] look [0.40,0.70,0.3] — exactly where Shot 03 (pink
    // wipe) picks up, so the transition downstream is untouched.
    pos:[[0,0.60,-7.5],[0.15,0.75,-6.4],[0.28,0.88,-5.4],[0.40,1.00,-4.5]],
    look:[[0,0.60,0],[0.15,0.64,0.1],[0.28,0.67,0.2],[0.40,0.70,0.3]], fov:[40,41], ez:'linear', sub:'productCan' },
  { n:'PINK FOG WIPE',        s:0.120, e:0.160, vfy:0.140,
    pos:[[0.40,1.00,-4.5],[1.20,1.15,-4.2],[2.20,1.32,-3.9],[3.20,1.48,-3.7],[4.00,1.58,-3.6],[4.50,1.60,-3.5]],
    look:[[0.38,0.70,0.3],[1.00,0.52,1.0],[1.80,0.35,1.6],[2.50,0.22,2.2],[2.50,0.20,2.5],[2.50,0.20,2.5]], fov:[41,42], ez:'inCubic', sub:'occPlanes' },
  { n:'OPEN WATER FLOATERS',  s:0.160, e:0.230, vfy:0.195,
    pos:[[4.50,1.60,-3.5],[4.00,1.40,-3.0],[3.30,1.22,-2.5],[2.50,1.10,-2.0],[1.80,1.02,-1.5],[1.20,0.95,-1.0],[0.70,0.90,-0.6],[0.20,0.86,-0.2],[-0.20,0.84,0.1]],
    look:[[2.50,0.20,2.5],[1.80,0.12,3.0],[1.20,0.05,3.5],[0.60,0.00,4.0],[0.10,-0.03,4.5],[-0.30,-0.05,5.0],[-0.60,-0.06,5.5],[-0.90,-0.08,6.0],[-1.20,-0.10,6.5]], fov:[42,43], ez:'linear', sub:'sg4' },
  { n:'SHELL & PEARL PASS',   s:0.230, e:0.300, vfy:0.265,
    pos:[[-0.20,0.84,0.1],[-0.40,0.82,0.3],[-0.65,0.80,0.5],[-0.90,0.78,0.7],[-1.10,0.78,0.9],[-1.20,0.78,1.1]],
    look:[[-1.20,-0.10,6.5],[-1.25,-0.08,6.8],[-1.30,-0.05,7.2],[-1.35,-0.02,7.5],[-1.40,0.00,7.8],[-1.45,0.02,8.0]], fov:[43,43], ez:'inOutQuad', sub:'shellGroup' },
  { n:'NUTRIENT FRAGMENTS',   s:0.300, e:0.370, vfy:0.335,
    pos:[[-1.20,0.78,1.1],[-1.10,0.82,1.3],[-0.90,0.88,1.6],[-0.60,0.95,2.0],[-0.30,1.00,2.4],[0.00,1.05,2.8],[0.20,1.10,3.2],[0.30,1.12,3.5]],
    look:[[-1.45,0.02,8.0],[-1.40,0.04,8.2],[-1.30,0.06,8.5],[-1.20,0.08,8.7],[-1.10,0.10,9.0],[-1.00,0.10,9.0],[-0.90,0.08,9.0],[-0.80,0.05,8.8]], fov:[43,43], ez:'linear', sub:'nutMesh' },
  { n:'CORAL ISLAND REVEAL',  s:0.370, e:0.450, vfy:0.410,
    pos:[[0.30,1.12,3.5],[-0.10,1.20,3.8],[-0.50,1.32,4.1],[-0.85,1.45,4.4],[-1.10,1.55,4.7],[-1.30,1.62,5.0],[-1.42,1.66,5.3],[-1.48,1.66,5.6],[-1.50,1.62,5.9],[-1.50,1.58,6.2]],
    look:[[-0.90,0.30,9.0],[-1.05,0.33,9.0],[-1.20,0.36,9.0],[-1.32,0.39,9.0],[-1.42,0.42,9.0],[-1.48,0.44,9.0],[-1.50,0.45,9.0],[-1.50,0.45,9.0],[-1.50,0.45,9.0],[-1.50,0.45,9.0]], fov:[43,44], ez:'inOutQuad', sub:'island' },
  { n:'GIANT FISH OCCLUSION', s:0.450, e:0.530, vfy:0.490,
    pos:[[-1.50,1.58,6.2],[-1.50,1.50,6.3],[-1.50,1.40,6.4],[-1.50,1.28,6.5],[-1.50,1.16,6.6],[-1.50,1.05,6.7],[-1.50,0.95,6.8]],
    look:[[-0.80,0.42,9.2],[-0.40,0.40,9.4],[0.10,0.38,9.5],[0.60,0.36,9.6],[0.20,0.34,9.7],[-0.60,0.32,9.8],[-1.60,0.30,10.0]], fov:[44,44], ez:'inOutQuad', sub:'bigFish' },
  { n:'REAL WATER CROSSING',  s:0.530, e:0.590, vfy:0.560,
    pos:[[-1.50,0.95,6.8],[-1.48,0.80,7.2],[-1.42,0.55,7.8],[-1.30,0.20,8.5],[-1.15,-0.30,9.3],[-0.95,-0.90,10.1],[-0.75,-1.60,10.9],[-0.55,-2.30,11.5]],
    look:[[-1.60,0.30,10.0],[-1.40,0.10,10.2],[-1.20,-0.30,10.3],[-1.00,-0.80,10.2],[-0.80,-1.40,10.0],[-0.55,-2.00,9.6],[-0.30,-2.40,9.0],[0.00,-2.70,7.5]], fov:[44,43], ez:'inOutCubic', sub:'waterPlane' },
  { n:'CAPSULE DISCOVERY',    s:0.590, e:0.640, vfy:0.615,
    pos:[[-0.55,-2.30,11.5],[-0.30,-2.40,11.8],[0.00,-2.52,12.2],[0.25,-2.62,12.5],[0.45,-2.72,13.0]],
    look:[[0.00,-2.70,7.5],[0.15,-2.65,7.8],[0.25,-2.60,8.2],[0.30,-2.55,8.5],[0.30,-2.55,9.0]], fov:[43,43], ez:'inOutQuad', sub:'capG' },
  { n:'ENERGY LEVELS NODE',   s:0.640, e:0.676, vfy:0.658,
    pos:[[0.45,-2.72,13.0],[0.70,-2.78,13.4],[0.95,-2.82,13.8],[1.10,-2.88,14.2],[1.15,-2.92,14.6]],
    look:[[0.30,-2.55,9.0],[0.50,-2.60,9.5],[0.70,-2.65,10.0],[0.85,-2.70,10.5],[0.90,-2.75,11.0]], fov:[43,43], ez:'inOutQuad', sub:'benefitNodes[0]' },
  { n:'COGNITIVE FUNCTION',   s:0.676, e:0.712, vfy:0.694,
    pos:[[1.15,-2.92,14.6],[0.90,-2.95,15.0],[0.60,-3.00,15.4],[0.30,-3.05,15.8],[0.05,-3.10,16.2]],
    look:[[0.90,-2.75,11.0],[0.70,-2.78,11.5],[0.45,-2.82,12.0],[0.20,-2.88,12.5],[0.00,-2.95,13.0]], fov:[43,44], ez:'inOutQuad', sub:'benefitNodes[1]' },
  { n:'SKIN HEALTH NODE',     s:0.712, e:0.748, vfy:0.730,
    pos:[[0.05,-3.10,16.2],[-0.20,-3.15,16.6],[-0.45,-3.20,17.0],[-0.60,-3.25,17.4],[-0.65,-3.28,17.8]],
    look:[[0.00,-2.95,13.0],[-0.15,-3.00,13.5],[-0.30,-3.05,14.0],[-0.40,-3.10,14.5],[-0.45,-3.15,15.0]], fov:[44,44], ez:'inOutQuad', sub:'benefitNodes[2]' },
  { n:'RESPIRATORY HEALTH',   s:0.748, e:0.784, vfy:0.766,
    pos:[[-0.65,-3.28,17.8],[-0.80,-3.38,18.2],[-0.90,-3.52,18.6],[-0.90,-3.65,19.0],[-0.80,-3.72,19.4]],
    look:[[-0.45,-3.15,15.0],[-0.55,-3.25,15.5],[-0.65,-3.40,16.0],[-0.70,-3.55,16.5],[-0.65,-3.65,17.0]], fov:[44,44], ez:'inOutQuad', sub:'benefitNodes[3]' },
  { n:'DIGESTIVE HEALTH',     s:0.784, e:0.820, vfy:0.802,
    pos:[[-0.80,-3.72,19.4],[-0.50,-3.75,19.8],[-0.10,-3.78,20.2],[0.25,-3.80,20.6],[0.50,-3.80,21.0]],
    look:[[-0.65,-3.65,17.0],[-0.40,-3.70,17.5],[-0.10,-3.75,18.0],[0.15,-3.78,18.5],[0.35,-3.80,19.0]], fov:[44,44], ez:'inOutQuad', sub:'benefitNodes[4]' },
  { n:'INGREDIENTS DECLAR',   s:0.820, e:0.910, vfy:0.865,
    pos:[[0.50,-3.80,21.0],[0.45,-3.85,21.3],[0.35,-3.92,21.6],[0.20,-4.00,21.9],[0.08,-4.08,22.1],[0.00,-4.12,22.2]],
    look:[[0.35,-3.80,19.0],[0.30,-3.85,19.5],[0.20,-3.92,20.0],[0.10,-4.00,20.5],[0.02,-4.08,20.8],[0.00,-4.12,21.0]], fov:[44,43], ez:'outCubic', sub:'ingAnchors' },
  { n:'FINAL REVEAL TRANS',   s:0.910, e:0.950, vfy:0.930,
    pos:[[0.00,-4.12,22.2],[0.00,-4.05,22.3],[0.00,-3.92,22.4],[0.00,-3.78,22.6],[0.00,-3.62,22.8],[0.00,-3.50,23.0]],
    look:[[0.00,-4.12,21.0],[0.00,-4.05,21.2],[0.00,-3.92,21.5],[0.00,-3.78,21.8],[0.00,-3.62,22.2],[0.00,-3.50,22.5]], fov:[43,42], ez:'inOutCubic', sub:'reefBlock' },
  { n:'FINAL CTA',            s:0.950, e:1.000, vfy:0.975,
    pos:[[0.00,-3.50,23.0],[0.00,-3.48,23.2],[0.00,-3.45,23.4],[0.00,-3.42,23.5],[0.00,-3.40,23.5]],
    look:[[0.00,-3.50,22.5],[0.00,-3.48,22.8],[0.00,-3.45,23.0],[0.00,-3.42,23.2],[0.00,-3.40,23.2]], fov:[42,41], ez:'inOutCubic', sub:'triG' },
];

// ═══════════════════════════════════════════════════════════════
// PRE-SAMPLE
// ═══════════════════════════════════════════════════════════════
const SP = 100;
const _all = [];
const _tp = new THREE.Vector3(), _tl = new THREE.Vector3();
(function() {
  SHOTS.forEach((s, idx) => {
    const pv = s.pos.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const lv = s.look.map(p => new THREE.Vector3(p[0], p[1], p[2]));
    const fn = EASE[s.ez] || EASE.linear;
    for (let i = 0; i <= SP; i++) {
      const rt = i / SP, et = fn(rt);
      sampleCR(pv, et, _tp); sampleCR(lv, et, _tl);
      let f = s.fov[0];
      if (s.fov.length >= 2) f = s.fov[0] + (s.fov[1] - s.fov[0]) * et;
      _all.push({ g: s.s + rt * (s.e - s.s), pos: _tp.clone(), look: _tl.clone(), fov: f, shot: idx });
    }
  });
  if (_all.length) { _all[0].g = 0; _all[_all.length - 1].g = 1; }
})();

// ═══════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════
const _oP = new THREE.Vector3(), _oL = new THREE.Vector3();

export function getCameraAt(progress, isMobile = false) {
  const p = Math.max(0, Math.min(1, progress));
  let lo = 0, hi = _all.length - 1;
  while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (_all[mid].g <= p) lo = mid; else hi = mid; }
  const sl = _all[lo], sh = _all[hi], r = sh.g - sl.g, t = r > 0.0001 ? (p - sl.g) / r : 0;
  _oP.copy(sl.pos).lerp(sh.pos, t); _oL.copy(sl.look).lerp(sh.look, t);
  const f = sl.fov + (sh.fov - sl.fov) * t;
  if (isMobile) { _oP.y += 0.3; _oL.y += 0.4; }
  return { pos: _oP, look: _oL, fov: isFinite(f) ? f : 42, shot: sl.shot };
}

/** Half-open: shots 1-17 use [s, e), shot 18 uses [s, e] */
export function getShotIndex(progress) {
  const p = Math.max(0, Math.min(1, progress));
  for (let i = 0; i < SHOTS.length; i++) {
    const isLast = (i === SHOTS.length - 1);
    if (p >= SHOTS[i].s && (isLast ? p <= SHOTS[i].e : p < SHOTS[i].e)) return i;
  }
  return 0;
}

export function getShotDef(idx) { return SHOTS[idx] || null; }
export function getAllShots() { return SHOTS; }
export function getShotCount() { return SHOTS.length; }

export function getLocalProgress(progress, shotIdx) {
  const s = SHOTS[shotIdx]; if (!s) return 0;
  return Math.max(0, Math.min(1, (progress - s.s) / (s.e - s.s)));
}
