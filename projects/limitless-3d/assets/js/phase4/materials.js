import * as THREE from 'three';

// ═══════════════════════════════════════════════════
// PHASE 4 REFINED PBR MATERIALS
// Key differences from phase3:
// - Deeper hero background: #06061a palette
// - Pinker water surface tones
// - Brighter coral colors with more variety
// - Refined capsule and glass materials
// ═══════════════════════════════════════════════════

// ── Hero ──
export const matRockDark   = new THREE.MeshStandardMaterial({ color: 0x1e1a28, roughness: 0.92, metalness: 0.01 });
export const matRockMid    = new THREE.MeshStandardMaterial({ color: 0x2c2740, roughness: 0.87, metalness: 0.04 });
export const matRockFar    = new THREE.MeshStandardMaterial({ color: 0x3a3048, roughness: 0.90, metalness: 0.02 });
export const matProduct    = new THREE.MeshStandardMaterial({ color: 0x1a0a35, roughness: 0.32, metalness: 0.35, envMapIntensity: 0.5 });
export const matProductLabel = new THREE.MeshStandardMaterial({ color: 0x301870, roughness: 0.38, metalness: 0.25 });
export const matGold         = new THREE.MeshStandardMaterial({ color: 0xd4b860, roughness: 0.22, metalness: 0.82, emissive: 0x1a0e00, emissiveIntensity: 0.45 });
export const matStar         = new THREE.MeshBasicMaterial({ color: 0x8899cc });

// ── Surface (pinker tones) ──
export const matSky       = new THREE.MeshStandardMaterial({ color: 0x7a5888, roughness: 0.88, side: THREE.DoubleSide });
export const matRockFloat = new THREE.MeshStandardMaterial({ color: 0x4e4060, roughness: 0.78, metalness: 0.1 });
export const matPearl     = new THREE.MeshStandardMaterial({ color: 0xede4f5, roughness: 0.12, metalness: 0.04 });
export const matShell     = new THREE.MeshStandardMaterial({ color: 0xf5e8e0, roughness: 0.28, metalness: 0.03 });
export const matCoralSurf = new THREE.MeshStandardMaterial({ color: 0xd06880, roughness: 0.62, metalness: 0.02 });

// ── Underwater ──
export const matSeabed     = new THREE.MeshStandardMaterial({ color: 0x3a3050, roughness: 0.95, metalness: 0.0 });
export const matReef       = new THREE.MeshStandardMaterial({ color: 0x282040, roughness: 0.92, metalness: 0.02 });
export const matCoralUW    = new THREE.MeshStandardMaterial({ color: 0xc04080, roughness: 0.58, metalness: 0.04, emissive: 0x120618, emissiveIntensity: 0.35 });
export const matCapsule    = new THREE.MeshStandardMaterial({ color: 0x9080b0, roughness: 0.22, metalness: 0.45 });
export const matCapsuleInner = new THREE.MeshStandardMaterial({ color: 0x706090, roughness: 0.28, metalness: 0.35 });
export const matCoreGlass  = new THREE.MeshPhysicalMaterial({
  color: 0xd8d0ff, roughness: 0.05, metalness: 0.0,
  transparent: true, opacity: 0.4, envMapIntensity: 0.85,
  clearcoat: 0.25, clearcoatRoughness: 0.08,
});
export const matBenefitRing = new THREE.MeshStandardMaterial({ color: 0xb8a8e0, roughness: 0.18, metalness: 0.35, emissive: 0x0a0518, emissiveIntensity: 0.55 });

// ── Final CTA ──
export const matTriGold   = new THREE.MeshStandardMaterial({ color: 0xd4b860, roughness: 0.13, metalness: 0.88, emissive: 0x1a0e00, emissiveIntensity: 0.55 });
export const matTriCopper = new THREE.MeshStandardMaterial({ color: 0xc87850, roughness: 0.18, metalness: 0.82, emissive: 0x120503, emissiveIntensity: 0.4 });
export const matTriSilver = new THREE.MeshStandardMaterial({ color: 0xc8c0d0, roughness: 0.18, metalness: 0.78, emissive: 0x060508, emissiveIntensity: 0.25 });

// ── Coral color palettes (Phase 4 refined) ──
const coralColors = [0xd06880, 0xe08860, 0xd89050, 0xc0a040, 0xa0c060];
const uwCoralColors = [0xc04080, 0xd06070, 0xe08050, 0xc050a0, 0xb040c0];

export function createCoralMaterial(color, isUnderwater = false) {
  const emissiveIntensity = isUnderwater ? 0.25 : 0.12;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.04,
    emissive: color,
    emissiveIntensity,
  });
}

export { coralColors, uwCoralColors };
