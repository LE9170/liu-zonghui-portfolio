import * as THREE from 'three';
import { geoSphereLo, geoTorus } from './geometries.js';
import { matBenefitRing } from './materials.js';

// ═══════════════════════════════════════════════════
// BENEFIT NODES — 3D nodes + DOM card projection
// Extracted from phase2.html lines 855-1204
// ═══════════════════════════════════════════════════
// Pre-allocated temps for zero-GC per frame
const _worldPos = new THREE.Vector3();
const _screenPos = new THREE.Vector3();
const _targetPos = new THREE.Vector3();
const _targetScale = new THREE.Vector3();

const benefitNodeData = [
  { label: 'energy',      title: 'Energy Levels',       pos: [1.0, -2.8, 6.5],  color: 0xd8b0f0 },
  { label: 'cognitive',   title: 'Cognitive Function',   pos: [-0.8, -3.1, 8.5], color: 0xb0c8f0 },
  { label: 'skin',        title: 'Skin Health',          pos: [1.5, -2.7, 10.5], color: 0xf0b0c8 },
  { label: 'respiratory', title: 'Respiratory Health',   pos: [-1.0, -3.0, 12.5], color: 0xb8f0d0 },
  { label: 'digestive',   title: 'Digestive Health',     pos: [1.2, -2.9, 14.5], color: 0xf0d8b0 },
];

/**
 * Create benefit nodes (5 groups with ring, bubble, inner bits)
 * @param {THREE.Group} oceanWorld - parent group
 * @returns {{ nodes: THREE.Group[], cards: Record<string, HTMLElement> }}
 */
export function createBenefitNodes(oceanWorld) {
  const nodes = [];
  const cards = {};

  benefitNodeData.forEach((data) => {
    const node = new THREE.Group();
    node.position.set(...data.pos);
    node.userData = { ...data };

    // Outer ring
    const ring = new THREE.Mesh(geoTorus, matBenefitRing);
    ring.name = 'benefitRing';
    ring.scale.setScalar(0.7);
    node.add(ring);

    // Transparent bubble
    const bubble = new THREE.Mesh(geoSphereLo, new THREE.MeshPhysicalMaterial({
      color: data.color, roughness: 0.05, metalness: 0.0,
      transparent: true, opacity: 0.35, envMapIntensity: 0.5,
    }));
    bubble.scale.setScalar(0.45);
    node.add(bubble);

    // Inner icon placeholder (small cluster)
    for (let j = 0; j < 4; j++) {
      const bit = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.06, 0),
        new THREE.MeshStandardMaterial({
          color: data.color, roughness: 0.3,
          emissive: data.color, emissiveIntensity: 0.4,
        })
      );
      bit.position.set(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
      node.add(bit);
    }

    oceanWorld.add(node);
    nodes.push(node);

    // Lookup DOM card
    const card = document.getElementById(`bc-${data.label}`);
    if (card) cards[data.label] = card;
  });

  return { nodes, cards };
}

/**
 * Activate/deactivate benefit nodes based on camera proximity and project to DOM.
 * ZERO per-frame allocations — uses pre-allocated module-scope vectors.
 * @param {THREE.Group[]} nodes
 * @param {Record<string, HTMLElement>} cards
 * @param {THREE.Camera} camera
 * @param {number} progress - scroll progress 0-1
 */
export function updateBenefitNodes(nodes, cards, camera, progress) {
  if (progress < 0.59 || progress > 0.81) {
    Object.values(cards).forEach(c => c.classList.remove('active'));
    return;
  }

  // Camera target (approximate — use camera position + forward)
  // For benefit projection we check distance from node to camera position
  let bestIdx = -1, bestDist = Infinity;

  nodes.forEach((node, i) => {
    node.getWorldPosition(_worldPos);
    const dist = _worldPos.distanceTo(camera.position);

    if (dist < bestDist) { bestDist = dist; bestIdx = i; }

    // Scale based on proximity
    const activation = Math.max(0, 1 - dist / 6);
    const scale = 0.7 + activation * 0.5;
    _targetScale.set(scale, scale, scale);
    node.scale.lerp(_targetScale, 0.1);

    node.children.forEach(c => {
      if (c.name === 'benefitRing' && c.material) {
        c.material.emissiveIntensity = 0.3 + activation * 1.2;
      }
    });
  });

  // Activate corresponding DOM card
  Object.entries(cards).forEach(([key, card], i) => {
    const isActive = i === bestIdx && bestDist < 5;
    card.classList.toggle('active', isActive);
    if (isActive) {
      const node = nodes[i];
      node.getWorldPosition(_worldPos);
      _screenPos.copy(_worldPos).project(camera);
      const x = (_screenPos.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-_screenPos.y * 0.5 + 0.5) * window.innerHeight - 60;
      card.style.left = x + 'px';
      card.style.top = y + 'px';
      card.style.transform = 'translate(-50%, -50%)';
    }
  });
}

export { benefitNodeData, _worldPos, _screenPos, _targetScale };
