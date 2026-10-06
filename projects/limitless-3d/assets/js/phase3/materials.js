import * as THREE from 'three';

// ═══════════════════════════════════════════════════
// MATERIALS — Reusable material definitions
// ═══════════════════════════════════════════════════
// All material parameters match phase2.html lines 339-369 exactly.

// Hero
export const matRockDark   = new THREE.MeshStandardMaterial({ color: 0x2a2835, roughness: 0.9, metalness: 0.02 });
export const matRockMid    = new THREE.MeshStandardMaterial({ color: 0x383540, roughness: 0.85, metalness: 0.05 });
export const matProduct    = new THREE.MeshStandardMaterial({ color: 0x1a1040, roughness: 0.35, metalness: 0.3, envMapIntensity: 0.4 });
export const matProductLabel = new THREE.MeshStandardMaterial({ color: 0x2a1860, roughness: 0.4, metalness: 0.2 });
export const matGold        = new THREE.MeshStandardMaterial({ color: 0xc8a850, roughness: 0.25, metalness: 0.8, emissive: 0x1a0e00, emissiveIntensity: 0.4 });
export const matStar        = new THREE.MeshBasicMaterial({ color: 0xaaccff });

// Surface
export const matSky       = new THREE.MeshStandardMaterial({ color: 0x6a5080, roughness: 0.9, side: THREE.DoubleSide });
export const matRockFloat = new THREE.MeshStandardMaterial({ color: 0x4a4058, roughness: 0.8, metalness: 0.08 });
export const matPearl     = new THREE.MeshStandardMaterial({ color: 0xe8e0f0, roughness: 0.15, metalness: 0.05 });
export const matShell     = new THREE.MeshStandardMaterial({ color: 0xf0e0d8, roughness: 0.3, metalness: 0.02 });
export const matCoralSurf = new THREE.MeshStandardMaterial({ color: 0xd06880, roughness: 0.65, metalness: 0.02 });

// Underwater
export const matSeabed     = new THREE.MeshStandardMaterial({ color: 0x3a3050, roughness: 0.95, metalness: 0.0 });
export const matReef       = new THREE.MeshStandardMaterial({ color: 0x282040, roughness: 0.9, metalness: 0.02 });
export const matCoralUW    = new THREE.MeshStandardMaterial({ color: 0xc04080, roughness: 0.6, metalness: 0.03, emissive: 0x100510, emissiveIntensity: 0.3 });
export const matCapsule    = new THREE.MeshStandardMaterial({ color: 0x9080b0, roughness: 0.25, metalness: 0.4 });
export const matCapsuleInner = new THREE.MeshStandardMaterial({ color: 0x706090, roughness: 0.3, metalness: 0.3 });
export const matCoreGlass  = new THREE.MeshPhysicalMaterial({
  color: 0xd8d0ff, roughness: 0.05, metalness: 0.0,
  transparent: true, opacity: 0.4, envMapIntensity: 0.8,
  clearcoat: 0.2, clearcoatRoughness: 0.1,
});
export const matBenefitRing = new THREE.MeshStandardMaterial({ color: 0xb0a8d8, roughness: 0.2, metalness: 0.3, emissive: 0x080418, emissiveIntensity: 0.5 });

// Final
export const matTriGold  = new THREE.MeshStandardMaterial({ color: 0xd4b860, roughness: 0.15, metalness: 0.85, emissive: 0x1a0e00, emissiveIntensity: 0.5 });
export const matTriCopper = new THREE.MeshStandardMaterial({ color: 0xc87850, roughness: 0.2, metalness: 0.8, emissive: 0x100502, emissiveIntensity: 0.35 });
export const matTriSilver = new THREE.MeshStandardMaterial({ color: 0xc8c0d0, roughness: 0.2, metalness: 0.75, emissive: 0x050508, emissiveIntensity: 0.2 });

// Coral color factory
const coralColors = [0xd06880, 0xe08860, 0xd89050, 0xc0a040, 0xa0c060];
const uwCoralColors = [0xc04080, 0xd06070, 0xe08050, 0xc050a0, 0xb040c0];

export function createCoralMaterial(color, isUnderwater = false) {
  const emissiveIntensity = isUnderwater ? 0.2 : 0.1;
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.6,
    metalness: 0.03,
    emissive: color,
    emissiveIntensity,
  });
}

export { coralColors, uwCoralColors };
