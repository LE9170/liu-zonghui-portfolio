import * as THREE from 'three';

const camKeyframes = [
  { t: 0.00, pos: [0, 0.5, -9],     look: [0, 0.55, 0],    fov: 40 },
  { t: 0.03, pos: [0, 0.6, -7.5],   look: [0, 0.6, 0],     fov: 40 },
  { t: 0.12, pos: [0.4, 1.0, -4.5], look: [0.4, 0.7, 0.3], fov: 41 },
  { t: 0.15, pos: [4.5, 1.6, -3.5], look: [2.5, 0.2, 2.5], fov: 42 },
  { t: 0.25, pos: [3, 2.0, -1],     look: [0.5, 0.0, 4],   fov: 42 },
  { t: 0.35, pos: [1, 1.8, -0.5],   look: [-1, -0.1, 5],   fov: 43 },
  { t: 0.45, pos: [-1, 1.3, 0.5],   look: [-1.5, -0.1, 6.5], fov: 43 },
  { t: 0.55, pos: [-1.5, 0.6, 1.5], look: [-1.5, -0.4, 8],   fov: 44 },
  { t: 0.57, pos: [-1, 0.0, 2],     look: [-0.5, -0.5, 8], fov: 44 },
  { t: 0.59, pos: [-0.5, -2.5, 2.5], look: [0, -2.5, 7],    fov: 43 },
  { t: 0.65, pos: [1, -3.0, 5],     look: [1, -2.8, 9],     fov: 43 },
  { t: 0.73, pos: [-0.5, -3.2, 8],  look: [-0.5, -2.9, 11], fov: 44 },
  { t: 0.81, pos: [0.5, -3.5, 11],  look: [0.5, -3.2, 14],  fov: 44 },
  { t: 0.86, pos: [0, -4.0, 12],    look: [0, -3.8, 15],    fov: 43 },
  { t: 0.91, pos: [0, -4.2, 12.5],  look: [0, -4.0, 15.5],  fov: 42 },
  { t: 1.00, pos: [0, -3.5, 13],    look: [0, -3.2, 15],    fov: 41 },
];

// Pre-allocated temporaries — zero allocations per call
const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _mobileCenter = new THREE.Vector3(0, 0, 0);
const _resultPos = new THREE.Vector3();
const _resultLook = new THREE.Vector3();

export function getCameraAt(progress, isMobile = false, aspectRatio = 1.77) {
  const p = Math.max(0, Math.min(1, progress));

  let lo = 0, hi = camKeyframes.length - 1;
  for (let i = 0; i < camKeyframes.length - 1; i++) {
    if (p >= camKeyframes[i].t && p <= camKeyframes[i + 1].t) { lo = i; hi = i + 1; break; }
  }

  const kLo = camKeyframes[lo], kHi = camKeyframes[hi];
  const range = kHi.t - kLo.t;
  const localT = range > 0 ? (p - kLo.t) / range : 0;
  const t = localT < 0.5 ? 2 * localT * localT : 1 - Math.pow(-2 * localT + 2, 2) / 2;

  _tmpA.set(...kLo.pos);
  _tmpB.set(...kHi.pos);
  _resultPos.copy(_tmpA).lerp(_tmpB, t);

  _tmpA.set(...kLo.look);
  _tmpB.set(...kHi.look);
  _resultLook.copy(_tmpA).lerp(_tmpB, t);

  let fov = kLo.fov + (kHi.fov - kLo.fov) * t;

  if (isMobile) {
    _resultPos.lerp(_mobileCenter, 0.2);
    _resultLook.y += 0.3;
  }

  if (aspectRatio > 2.2) {
    fov += 3.0;
  }

  return { pos: _resultPos, look: _resultLook, fov };
}

export { camKeyframes };
