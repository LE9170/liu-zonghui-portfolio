import * as THREE from 'three';
import { _dummyMatrix, _dummyPos, _dummyQuat, _dummyScale } from './geometries.js';

// ═══════════════════════════════════════════════════
// AMBIENT ANIMATOR — all per-frame ambient animations
// Extracted from phase2.html animate() loop
// ═══════════════════════════════════════════════════
// Handle all ambient animations: stars, fog, floating objects, fish, coral sway,
// capsule, benefit rings, final triangle, particles, bubbles.
// For InstancedMesh-animated objects: use setMatrixAt() + instanceMatrix.needsUpdate = true.
// Read per-instance data from world.userData.instanceData.

export class AmbientAnimator {
  constructor() {
    this._tempMatrix = new THREE.Matrix4();
    this._tempEuler = new THREE.Euler();
  }

  /**
   * @param {number} dt - delta time in seconds
   * @param {number} ambientTime - total elapsed time in seconds
   * @param {number} progress - scroll progress 0-1
   * @param {THREE.Group} heroWorld
   * @param {THREE.Group} oceanWorld
   * @param {object} quality
   */
  update(dt, ambientTime, progress, heroWorld, oceanWorld, quality) {
    const hud = heroWorld.userData;
    const oud = oceanWorld.userData;

    // ── Hero: Triangle rotation ──
    if (hud.triGroup) {
      hud.triGroup.rotation.z += dt * 0.25;
      hud.triGroup.position.y = 0.85 + Math.sin(ambientTime * 1.3) * 0.12;
    }

    // ── Hero: Product can float ──
    if (hud.productCan) {
      hud.productCan.position.y = 0.15 + Math.sin(ambientTime * 0.7) * 0.08;
    }

    // ── Hero: Stars twinkle (Points material) ──
    if (hud.starsGroup && hud.starsGroup.userData.twinkleData) {
      const twinkleArr = hud.starsGroup.userData.twinkleData;
      // For Points, we can modulate opacity on the material directly
      // Average twinkle across all stars
      let totalTwinkle = 0;
      for (let i = 0; i < Math.min(twinkleArr.length, 10); i++) {
        const td = twinkleArr[i];
        totalTwinkle += 0.5 + Math.sin(ambientTime * td.twinkleSpeed + td.twinklePhase) * 0.5;
      }
      const avg = totalTwinkle / Math.min(twinkleArr.length, 10);
      hud.starsGroup.material.opacity = 0.4 + avg * 0.5;
      hud.starsGroup.rotation.y += dt * 0.02;
    }

    // ── Hero: Fog layers ──
    if (hud.fogLayers) {
      hud.fogLayers.forEach((fp, i) => {
        fp.material.uniforms.uTime.value = ambientTime;
        fp.position.x += dt * (0.04 + i * 0.02);
        if (fp.position.x > 4) fp.position.x = -4;
      });
    }

    // ── Ocean: Floating rocks (InstancedMesh) ──
    if (oud.floatingRocks && oud.floatingRocks.userData.instanceData) {
      const mesh = oud.floatingRocks;
      const data = mesh.userData.instanceData;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        mesh.getMatrixAt(i, _dummyMatrix);
        _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
        _dummyPos.y = d.baseY + Math.sin(ambientTime * d.floatSpeed + d.floatPhase) * d.floatAmp;
        // Apply rotation delta
        const rot = d.rotSpeed * dt;
        this._tempEuler.set(0, rot, 0);
        const rotQuat = new THREE.Quaternion().setFromEuler(this._tempEuler);
        _dummyQuat.multiply(rotQuat);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        mesh.setMatrixAt(i, _dummyMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // ── Ocean: Pearls bounce ──
    if (oud.pearls && oud.pearls.userData.instanceData) {
      const mesh = oud.pearls;
      const data = mesh.userData.instanceData;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        mesh.getMatrixAt(i, _dummyMatrix);
        _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
        _dummyPos.y = d.baseY + Math.sin(ambientTime * d.floatSpeed + d.floatPhase) * d.floatAmp;
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        mesh.setMatrixAt(i, _dummyMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // ── Ocean: Shells bounce ──
    if (oud.shells && oud.shells.userData.instanceData) {
      const mesh = oud.shells;
      const data = mesh.userData.instanceData;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        mesh.getMatrixAt(i, _dummyMatrix);
        _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
        _dummyPos.y = d.baseY + Math.sin(ambientTime * d.floatSpeed + d.floatPhase) * 0.02;
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        mesh.setMatrixAt(i, _dummyMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // ── Ocean: Nutrition blocks bounce ──
    if (oud.nutBlocks && oud.nutBlocks.userData.instanceData) {
      const mesh = oud.nutBlocks;
      const data = mesh.userData.instanceData;
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        mesh.getMatrixAt(i, _dummyMatrix);
        _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
        _dummyPos.y = d.baseY + Math.sin(ambientTime * d.floatSpeed + d.floatPhase) * d.floatAmp;
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        mesh.setMatrixAt(i, _dummyMatrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // ── Ocean: Coral island sway ──
    if (oud.coralGroups) {
      oud.coralGroups.forEach(({ mesh, instances }) => {
        if (!mesh || !instances) return;
        for (let i = 0; i < instances.length; i++) {
          const d = instances[i];
          mesh.getMatrixAt(i, _dummyMatrix);
          _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
          this._tempEuler.setFromQuaternion(_dummyQuat);
          this._tempEuler.y = d.baseRotY + Math.sin(ambientTime * d.swaySpeed + d.swayPhase) * 0.08;
          _dummyQuat.setFromEuler(this._tempEuler);
          _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
          mesh.setMatrixAt(i, _dummyMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });
    }

    // ── Ocean: Underwater coral sway ──
    if (oud.uwCoralGroups) {
      oud.uwCoralGroups.forEach(({ mesh, instances }) => {
        if (!mesh || !instances) return;
        for (let i = 0; i < instances.length; i++) {
          const d = instances[i];
          mesh.getMatrixAt(i, _dummyMatrix);
          _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
          this._tempEuler.setFromQuaternion(_dummyQuat);
          this._tempEuler.y = d.baseRotY + Math.sin(ambientTime * d.swaySpeed + d.swayPhase) * 0.08;
          _dummyQuat.setFromEuler(this._tempEuler);
          _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
          mesh.setMatrixAt(i, _dummyMatrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      });
    }

    // ── Ocean: Fish swimming ──
    if (oud.fishes) {
      oud.fishes.forEach(fish => {
        const ud = fish.userData;
        if (!ud) return;
        fish.position.x = ud.baseX + Math.cos(ambientTime * ud.swimSpeed + ud.swimPhase) * ud.swimRadius;
        fish.position.z = ud.baseZ + Math.sin(ambientTime * ud.swimSpeed + ud.swimPhase) * ud.swimRadius * 0.6;
        fish.position.y = ud.baseY + Math.sin(ambientTime * 0.4 + ud.swimPhase) * 0.25;
        fish.rotation.y = -ambientTime * ud.swimSpeed - ud.swimPhase + Math.PI / 2;
        if (ud.tailPivot) {
          ud.tailPivot.rotation.y = Math.sin(ambientTime * 7 + ud.swimPhase) * 0.4;
        }
      });
    }

    // ── Ocean: Capsule float ──
    if (oud.capsuleGroup) {
      const cf = Math.sin(ambientTime * 0.6) * 0.15;
      oud.capsuleGroup.position.y = -2.6 + cf;
    }

    // ── Ocean: Final triangle ──
    if (oud.finalTriGroup) {
      oud.finalTriGroup.rotation.y += dt * 0.1;
    }

    // ── Ocean: Particles ──
    if (oud.particleSystem && oud.particlesVel && oud.realParticleCount) {
      const pArr = oud.particleSystem.geometry.attributes.position.array;
      const count = oud.realParticleCount;
      for (let i = 0; i < count; i++) {
        pArr[i * 3 + 1] += dt * oud.particlesVel[i];
        if (pArr[i * 3 + 1] > 8) pArr[i * 3 + 1] = -5;
        pArr[i * 3] += Math.sin(ambientTime * 0.4 + i * 0.1) * dt * 0.15;
      }
      oud.particleSystem.geometry.attributes.position.needsUpdate = true;
    }

    // ── Ocean: Bubbles ──
    if (oud.bubbles) {
      oud.bubbles.forEach(b => {
        b.position.y += dt * b.userData.riseSpeed;
        if (b.position.y > 6) b.position.y = -5;
        b.position.x += Math.sin(ambientTime * 1.5 + b.userData.wobblePhase) * dt * b.userData.wobbleAmp;
      });
    }
  }
}
