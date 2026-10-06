import * as THREE from 'three';

// ═══════════════════════════════════════════════════
// SHARED GEOMETRIES — all from phase2.html lines 374-384
// ═══════════════════════════════════════════════════
export const geoBox      = new THREE.BoxGeometry(1, 1, 1);
export const geoBoxTall  = new THREE.BoxGeometry(0.75, 2.4, 0.75);
export const geoBoxCapsule = new THREE.BoxGeometry(0.5, 0.3, 0.7);
export const geoSphere   = new THREE.SphereGeometry(0.5, 24, 16);
export const geoSphereLo = new THREE.SphereGeometry(0.5, 12, 8);
export const geoIco      = new THREE.IcosahedronGeometry(0.5, 1);
export const geoIcoHi    = new THREE.IcosahedronGeometry(0.5, 2);
export const geoCyl      = new THREE.CylinderGeometry(0.25, 0.3, 1.4, 12);
export const geoPlane    = new THREE.PlaneGeometry(1, 1);
export const geoTorus    = new THREE.TorusGeometry(0.5, 0.04, 12, 28);

// ═══════════════════════════════════════════════════
// INSTANCED HELPERS
// ═══════════════════════════════════════════════════

// Pre-allocated dummy matrix for reuse
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();

/**
 * Create an InstancedMesh with random transforms within spreadRange
 * @param {number} count
 * @param {THREE.BufferGeometry} geometry
 * @param {THREE.Material} material
 * @param {number} spreadRange - max distance from origin on X/Z
 * @param {Object} [opts]
 * @param {number} [opts.minY] - min Y offset
 * @param {number} [opts.maxY] - max Y offset
 * @param {number} [opts.minScale]
 * @param {number} [opts.maxScale]
 * @returns {THREE.InstancedMesh}
 */
export function createInstancedRocks(count, geometry, material, spreadRange, opts = {}) {
  const minY = opts.minY ?? 0;
  const maxY = opts.maxY ?? 0;
  const minScale = opts.minScale ?? 0.5;
  const maxScale = opts.maxScale ?? 2.0;
  const castShadow = opts.castShadow ?? true;
  const receiveShadow = opts.receiveShadow ?? true;

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spreadRange * 2;
    const y = minY + Math.random() * (maxY - minY);
    const z = (Math.random() - 0.5) * spreadRange * 2;
    const s = minScale + Math.random() * (maxScale - minScale);

    _dummyPos.set(x, y, z);
    _dummyQuat.setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
    _dummyScale.set(s, s, s);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    mesh.setMatrixAt(i, _dummyMatrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  // Store per-instance animation data
  mesh.userData.instanceData = [];
  for (let i = 0; i < count; i++) {
    mesh.userData.instanceData.push({
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.2 + Math.random() * 0.6,
      floatAmp: 0.08 + Math.random() * 0.3,
      rotSpeed: 0.03 + Math.random() * 0.15,
      baseY: minY + Math.random() * (maxY - minY),
    });
  }

  return mesh;
}

/**
 * Create multiple InstancedMeshes for corals, grouped by color
 * @param {number} count - total coral instances
 * @param {THREE.BufferGeometry} geometry
 * @param {THREE.Material[]} materials - array of materials (one per color)
 * @param {number} spreadRange
 * @param {boolean} [underwater] - whether coral is underwater (affects material creation)
 * @returns {Object} { groups: InstancedMesh[], totalInstances: number }
 */
export function createInstancedCorals(count, geometry, materials, spreadRange) {
  const groups = [];
  const perGroup = Math.ceil(count / materials.length);

  for (let g = 0; g < materials.length; g++) {
    const groupCount = Math.min(perGroup, count - g * perGroup);
    if (groupCount <= 0) break;

    const mesh = new THREE.InstancedMesh(geometry, materials[g], groupCount);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const instanceData = [];
    for (let i = 0; i < groupCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.15 + Math.random() * spreadRange;
      const x = Math.cos(angle) * r;
      const y = 0.15 + Math.random() * 0.8;
      const z = Math.sin(angle) * r;
      const scale = 0.25 + Math.random() * 0.5;

      _dummyPos.set(x, y, z);
      _dummyQuat.setFromEuler(new THREE.Euler(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5));
      _dummyScale.set(scale, scale, scale);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      mesh.setMatrixAt(i, _dummyMatrix);

      instanceData.push({
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.5,
        baseRotY: mesh.rotation.y,
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.instanceData = instanceData;
    groups.push(mesh);
  }

  return { groups, totalInstances: count };
}

// Export pre-allocated temps for external use
export { _dummyMatrix, _dummyPos, _dummyQuat, _dummyScale };
