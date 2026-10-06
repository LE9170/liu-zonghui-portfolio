import * as THREE from 'three';
import {
  geoBox, geoBoxCapsule, geoSphere, geoSphereLo,
  geoIco, geoIcoHi, geoCyl, geoPlane,
  _dummyMatrix, _dummyPos, _dummyQuat, _dummyScale,
} from '../phase3/geometries.js';
import {
  matSky, matRockFloat, matRockMid, matPearl, matShell, matCoralSurf,
  matSeabed, matReef, matCoralUW, matCapsule, matCapsuleInner,
  matCoreGlass, matBenefitRing, matTriGold, matTriCopper, matTriSilver,
  coralColors, uwCoralColors, createCoralMaterial,
} from './materials.js';
import { createWater } from './water-shader.js';

/**
 * Phase 4 Refined Ocean World
 * Key differences from phase3:
 * - Coral island: 30+ pieces with 5 color varieties + reflection + foam ring
 * - Floating objects grouped by Z-depth (near=fast, far=slow): 8+6+4 rocks, 5+3 pearls, 4 shells, 6 blocks
 * - 3 small fish school + 1 large fish (1.5x scale, light orange #f0a870)
 * - Large fish enters from right foreground, follows 3D spline
 * - Reflection: duplicate island flipped below Y=0 with low opacity
 * - White mist/foam ring at island base
 * - Marine snow: 200 particles, slowly rising, additive blending
 * - Bubbles: 15 small transparent spheres with wobble
 * - Underwater light beams: 2 angled spot lights
 * - Seabed bumpy with sandy purple-grey
 * - 40+ coral clusters in magenta/pink/purple
 * - 6 stone pillars
 */
export function buildOceanWorld(quality) {
  const { waterSegments, coralMult, particleMult } = quality;
  const oceanWorld = new THREE.Group();

  // ── Water plane (Phase 4 pinker shader) ──
  const { material: waterMat, mesh: waterPlane } = createWater(waterSegments);
  oceanWorld.add(waterPlane);

  // ── Sky backdrop (soft pink to pale lavender) ──
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      uColorTop: { value: new THREE.Color('#f0c0d8') },
      uColorBot: { value: new THREE.Color('#c8a0d0') },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uColorTop; uniform vec3 uColorBot; varying vec2 vUv;
      void main() { gl_FragColor = vec4(mix(uColorBot, uColorTop, vUv.y), 1.0); }`,
    side: THREE.DoubleSide, depthWrite: false,
  });
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(45, 12), skyMat);
  skyPlane.position.set(0, 6, -10);
  oceanWorld.add(skyPlane);

  // ── Horizon glow (stable horizontal line at Y≈0) ──
  const horizonGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 2.5),
    new THREE.ShaderMaterial({
      uniforms: { uColor1: { value: new THREE.Color('#f0b0c8') }, uColor2: { value: new THREE.Color('#604070') } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor1; uniform vec3 uColor2; varying vec2 vUv;
        void main() { gl_FragColor = vec4(mix(uColor2, uColor1, vUv.y), 0.35); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  horizonGlow.position.set(0, 0.1, -9.5);
  oceanWorld.add(horizonGlow);

  // ── Seeded PRNG (mulberry32) — reproducible layouts, no camera collisions ──
  let _rngState = 0xDEADBEEF;
  function _rng() { _rngState |= 0; _rngState = _rngState + 0x6D2B79F5 | 0; let t = Math.imul(_rngState ^ _rngState >>> 15, 1 | _rngState); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }

  // ── Camera corridor (sampled from camKeyframes, progress 0.05–0.65) ──
  const _camSamples = [];
  const camKeyframes = [
    { t:0.00, pos:[0,0.5,-9] }, { t:0.05, pos:[0,0.55,-8.2] }, { t:0.12, pos:[0.4,1.0,-4.5] },
    { t:0.15, pos:[4.5,1.6,-3.5] }, { t:0.25, pos:[3,2.0,-1] }, { t:0.35, pos:[1,1.8,-0.5] },
    { t:0.45, pos:[-1,1.3,0.5] }, { t:0.55, pos:[-1.5,0.6,1.5] }, { t:0.59, pos:[-0.5,-2.5,2.5] },
    { t:0.65, pos:[1,-3.0,5] },
  ];
  for (let i = 0; i < camKeyframes.length - 1; i++) {
    for (let s = 0; s <= 12; s++) {
      const lt = s / 12;
      const k0 = camKeyframes[i], k1 = camKeyframes[i+1];
      const t = lt < 0.5 ? 2*lt*lt : 1-Math.pow(-2*lt+2,2)/2;
      _camSamples.push([
        k0.pos[0] + (k1.pos[0]-k0.pos[0])*t,
        k0.pos[1] + (k1.pos[1]-k0.pos[1])*t,
        k0.pos[2] + (k1.pos[2]-k0.pos[2])*t,
      ]);
    }
  }

  function _distToCameraPath(x, y, z) {
    let minD = Infinity;
    for (const cp of _camSamples) {
      const dx = x - cp[0], dy = y - cp[1], dz = z - cp[2];
      const d = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (d < minD) minD = d;
    }
    return minD;
  }

  // ── Floating objects grouped by Z-depth with camera corridor avoidance ──
  function makeFloatGroup(count, geo, mat, zMin, zMax) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const data = [];
    for (let i = 0; i < count; i++) {
      let x, y, z, s, attempts = 0;
      const safeDist = 2.2; // world units from camera path
      do {
        x = (_rng() - 0.5) * 14;
        y = 0.15 + _rng() * 2.5;
        z = zMin + _rng() * (zMax - zMin);
        s = 0.2 + _rng() * 0.8;
        attempts++;
      } while (_distToCameraPath(x, y, z) < safeDist && attempts < 100);
      _dummyPos.set(x, y, z);
      _dummyQuat.setFromEuler(new THREE.Euler(_rng() * Math.PI, _rng() * Math.PI, _rng() * Math.PI));
      _dummyScale.set(s, s, s);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      mesh.setMatrixAt(i, _dummyMatrix);
      data.push({
        baseX: x, baseY: y, baseZ: z, baseS: s,
        floatPhase: _rng() * Math.PI * 2,
        floatSpeed: 0.3 + _rng() * 0.7,
        floatAmp: 0.08 + _rng() * 0.3,
        rotSpeed: 0.03 + _rng() * 0.15,
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.instanceData = data;
    return mesh;
  }

  const nearRocks = makeFloatGroup(8, geoIcoHi, matRockFloat, -3, 2);
  const midRocks  = makeFloatGroup(6, geoIco, matRockFloat, 2, 7);
  const farRocks  = makeFloatGroup(4, geoIco, matRockMid, 7, 13);
  oceanWorld.add(nearRocks);
  oceanWorld.add(midRocks);
  oceanWorld.add(farRocks);

  // ── Pearls (5 near + 3 far) ──
  const nearPearls = makeFloatGroup(5, geoSphereLo, matPearl, -1, 3);
  nearPearls.userData.instanceData.forEach(d => { d.floatAmp *= 0.5; d.baseY = 0.04 + _rng() * 0.15; });
  const farPearls = makeFloatGroup(3, geoSphereLo, matPearl, 7, 12);
  farPearls.userData.instanceData.forEach(d => { d.floatAmp *= 0.3; d.baseY = 0.04 + _rng() * 0.1; });
  oceanWorld.add(nearPearls);
  oceanWorld.add(farPearls);

  // ── Shells (4 scattered) ──
  const shellGeom = new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const shells = makeFloatGroup(4, shellGeom, matShell, -1, 9);
  shells.userData.instanceData.forEach(d => { d.floatAmp = 0.02; d.baseY = 0.015; });
  oceanWorld.add(shells);

  // ── Nutrition blocks REMOVED — camera collision risk, not core visual content ──

  // ── Coral Island with reflection + foam ring ──
  const coralIsland = new THREE.Group();
  coralIsland.position.set(-1.5, 0.05, 9);

  // Island base
  const islandBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.4, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a3a38, roughness: 0.9, metalness: 0.02 })
  );
  islandBase.position.y = -0.05;
  islandBase.receiveShadow = true;
  coralIsland.add(islandBase);

  // Coral clusters (30+ pieces in 5 color groups)
  const coralCount = Math.round(30 * coralMult);
  const coralGroupCount = Math.min(coralColors.length, Math.max(3, Math.round(4 * coralMult)));
  const coralGroups = [];
  const coralsPerGroup = Math.ceil(coralCount / coralGroupCount);

  for (let g = 0; g < coralGroupCount; g++) {
    const groupCount = Math.min(coralsPerGroup, coralCount - g * coralsPerGroup);
    if (groupCount <= 0) break;
    const mat = createCoralMaterial(coralColors[g], false);
    const mesh = new THREE.InstancedMesh(geoCyl, mat, groupCount);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const instances = [];
    for (let i = 0; i < groupCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 0.15 + Math.random() * 1.6;
      const x = Math.cos(angle) * r;
      const y = 0.15 + Math.random() * 0.9;
      const z = Math.sin(angle) * r;
      const s = 0.25 + Math.random() * 0.55;
      _dummyPos.set(x, y, z);
      _dummyQuat.setFromEuler(new THREE.Euler(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5));
      _dummyScale.set(s, s, s);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      mesh.setMatrixAt(i, _dummyMatrix);
      instances.push({
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.5,
        baseRotY: 0,
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.instanceData = instances;
    coralIsland.add(mesh);
    coralGroups.push({ mesh, instances });
  }
  oceanWorld.add(coralIsland);

  // ── Island reflection: duplicate flipped below Y=0 (low opacity) ──
  const islandReflection = new THREE.Group();
  islandReflection.position.copy(coralIsland.position);
  islandReflection.position.y = -coralIsland.position.y;

  // Reflected base
  const reflBase = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 2.4, 0.4, 10),
    new THREE.MeshStandardMaterial({ color: 0x4a3a38, roughness: 0.95, metalness: 0.0, transparent: true, opacity: 0.15, depthWrite: false })
  );
  reflBase.position.y = -0.05;
  reflBase.scale.y = -1;
  islandReflection.add(reflBase);

  // Reflected coral groups (simple instanced clones)
  for (let g = 0; g < coralGroupCount; g++) {
    const groupCount = Math.min(coralsPerGroup, coralCount - g * coralsPerGroup);
    if (groupCount <= 0) break;
    const reflMat = new THREE.MeshStandardMaterial({
      color: coralColors[g], roughness: 0.8, metalness: 0.0,
      transparent: true, opacity: 0.12, depthWrite: false,
    });
    const reflMesh = new THREE.InstancedMesh(geoCyl, reflMat, groupCount);
    // Copy instances from main island group
    const srcMesh = coralGroups[g]?.mesh;
    if (srcMesh) {
      for (let i = 0; i < groupCount; i++) {
        srcMesh.getMatrixAt(i, _dummyMatrix);
        _dummyMatrix.decompose(_dummyPos, _dummyQuat, _dummyScale);
        _dummyPos.y = -_dummyPos.y;
        _dummyScale.y = -_dummyScale.y;
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        reflMesh.setMatrixAt(i, _dummyMatrix);
      }
    }
    reflMesh.instanceMatrix.needsUpdate = true;
    islandReflection.add(reflMesh);
  }
  oceanWorld.add(islandReflection);

  // ── White mist/foam ring at island base ──
  const foamRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.1, 0.12, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, depthWrite: false })
  );
  foamRing.rotation.x = Math.PI / 2;
  foamRing.position.copy(coralIsland.position);
  foamRing.position.y = 0.02;
  oceanWorld.add(foamRing);

  // ── Fish: 3 small school fish + 1 large fish ──
  const fishes = [];
  const smallFishSchool = [];

  function createFish(scale, x, y, z, colorHex = 0xf0a870) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.32, metalness: 0.06 })
    );
    group.add(body);
    const tailPivot = new THREE.Group();
    tailPivot.position.x = -0.55;
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xf0b890, roughness: 0.28, metalness: 0.03, transparent: true, opacity: 0.85 })
    );
    tail.position.x = -0.12;
    tailPivot.add(tail);
    group.add(tailPivot);
    const dorsal = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.1, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xf0c0a0, roughness: 0.28, metalness: 0.03, transparent: true, opacity: 0.75 })
    );
    dorsal.position.set(0, 0.16, 0);
    group.add(dorsal);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(0.4, 0.04, 0.14);
    group.add(eye);
    group.position.set(x, y, z);
    group.scale.setScalar(scale);
    group.userData = {
      swimPhase: Math.random() * Math.PI * 2,
      swimSpeed: 0.08 + Math.random() * 0.2,
      swimRadius: 2 + Math.random() * 5,
      baseX: x, baseY: y, baseZ: z,
      tailPivot,
    };
    oceanWorld.add(group);
    return group;
  }

  // 3 small fish school
  for (let i = 0; i < 3; i++) {
    const f = createFish(0.3, -3 + i * 1.5, 0.5 + Math.random() * 0.4, -1 + Math.random() * 5);
    smallFishSchool.push(f);
    fishes.push(f);
  }

  // Large fish (1.5x scale, light orange) enters from right foreground
  const bigFish = createFish(1.5, 6, 0.6, 3, 0xf0a870);
  bigFish.userData.swimRadius = 8;
  fishes.push(bigFish);

  // ── Seabed (large plane at Y=-5, sandy purple-grey) ──
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(30, 45, 25, 30), matSeabed);
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -5;
  seabed.receiveShadow = true;
  oceanWorld.add(seabed);

  // ── Seabed bumps ──
  const bumpGeom = new THREE.SphereGeometry(0.15, 4, 3);
  const bumpCount = 30;
  const seabedBumps = new THREE.InstancedMesh(bumpGeom, matSeabed, bumpCount);
  const bumpInstanceData = [];
  for (let i = 0; i < bumpCount; i++) {
    const x = (Math.random() - 0.5) * 12;
    const y = -4.92;
    const z = -1 + Math.random() * 22;
    const sx = 1 + Math.random() * 2;
    const sy = 0.1 + Math.random() * 0.2;
    const sz = 1 + Math.random() * 2;
    _dummyPos.set(x, y, z);
    _dummyQuat.identity();
    _dummyScale.set(sx, sy, sz);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    seabedBumps.setMatrixAt(i, _dummyMatrix);
    bumpInstanceData.push({});
  }
  seabedBumps.instanceMatrix.needsUpdate = true;
  seabedBumps.userData.instanceData = bumpInstanceData;
  oceanWorld.add(seabedBumps);

  // ── Left reef wall ──
  const reefLeftCount = 16;
  const reefLeft = new THREE.InstancedMesh(geoIco, matReef, reefLeftCount);
  reefLeft.castShadow = true;
  reefLeft.receiveShadow = true;
  const reefLeftData = [];
  for (let i = 0; i < reefLeftCount; i++) {
    const x = -4.5 - Math.random() * 2;
    const y = -5 + i * 0.7;
    const z = -2 + i * 1.6;
    const s = 0.8 + Math.random() * 1.6;
    _dummyPos.set(x, y, z);
    _dummyQuat.setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random()));
    _dummyScale.set(s, s, s);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    reefLeft.setMatrixAt(i, _dummyMatrix);
    reefLeftData.push({});
  }
  reefLeft.instanceMatrix.needsUpdate = true;
  reefLeft.userData.instanceData = reefLeftData;
  oceanWorld.add(reefLeft);

  // ── Right reef wall ──
  const reefRightCount = 16;
  const reefRight = new THREE.InstancedMesh(geoIco, matReef, reefRightCount);
  reefRight.castShadow = true;
  reefRight.receiveShadow = true;
  const reefRightData = [];
  for (let i = 0; i < reefRightCount; i++) {
    const x = 4.5 + Math.random() * 2;
    const y = -5 + i * 0.8;
    const z = -2 + i * 1.5;
    const s = 0.7 + Math.random() * 1.5;
    _dummyPos.set(x, y, z);
    _dummyQuat.setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random()));
    _dummyScale.set(s, s, s);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    reefRight.setMatrixAt(i, _dummyMatrix);
    reefRightData.push({});
  }
  reefRight.instanceMatrix.needsUpdate = true;
  reefRight.userData.instanceData = reefRightData;
  oceanWorld.add(reefRight);

  // ── Underwater corals (40+ clusters in magenta/pink/purple) ──
  const uwCoralTotal = Math.round(40 * coralMult);
  const uwGroupCount = Math.min(uwCoralColors.length, Math.max(4, Math.round(5 * coralMult)));
  const uwCoralsPerGroup = Math.ceil(uwCoralTotal / uwGroupCount);
  const uwCoralGroups = [];

  for (let g = 0; g < uwGroupCount; g++) {
    const groupCount = Math.min(uwCoralsPerGroup, uwCoralTotal - g * uwCoralsPerGroup);
    if (groupCount <= 0) break;
    const mat = createCoralMaterial(uwCoralColors[g], true);
    const mesh = new THREE.InstancedMesh(geoCyl, mat, groupCount);
    mesh.receiveShadow = true;
    const instances = [];
    for (let i = 0; i < groupCount; i++) {
      const x = (Math.random() - 0.5) * 8;
      const y = -5 + Math.random() * 1.2;
      const z = -2 + Math.random() * 20;
      const s = 0.2 + Math.random() * 0.7;
      _dummyPos.set(x, y, z);
      _dummyQuat.setFromEuler(new THREE.Euler(Math.random() * 0.3, Math.random() * Math.PI, Math.random() * 0.3));
      _dummyScale.set(s, s, s);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      mesh.setMatrixAt(i, _dummyMatrix);
      instances.push({
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 0.3 + Math.random() * 0.6,
        baseRotY: 0,
      });
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.instanceData = instances;
    oceanWorld.add(mesh);
    uwCoralGroups.push({ mesh, instances });
  }

  // ── Stone pillars (6, scattered) ──
  const stonePillars = [];
  for (let i = 0; i < 6; i++) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.35, 2 + Math.random() * 3, 8),
      matReef
    );
    pillar.position.set((Math.random() - 0.5) * 6, -4 + Math.random() * 0.8, 2 + i * 3.5);
    pillar.receiveShadow = true;
    oceanWorld.add(pillar);
    stonePillars.push(pillar);
  }

  // ── Water surface shimmer plane (visible from below during underwater) ──
  const topWaterPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 30),
    new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uColor: { value: new THREE.Color('#8060a0') } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
        void main() {
          float shimmer = sin(vUv.x * 30.0 + uTime) * cos(vUv.y * 35.0 + uTime * 1.2) * 0.08;
          gl_FragColor = vec4(uColor + shimmer, 0.2);
        }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  topWaterPlane.rotation.x = -Math.PI / 2;
  topWaterPlane.position.y = 0;
  topWaterPlane.visible = false; // Only visible from below
  oceanWorld.add(topWaterPlane);

  // ── Capsule group (underwater product) ──
  const capsuleGroup = new THREE.Group();
  capsuleGroup.position.set(0.3, -2.6, 3.5);

  // Top half: silver-purple cylinder with dome cap
  const capTopBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), matCapsule);
  capTopBody.position.y = 0.2;
  capsuleGroup.add(capTopBody);
  const capTopDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), matCapsule);
  capTopDome.position.y = 0.575;
  capsuleGroup.add(capTopDome);

  // Bottom half: slightly darker, ~0.5 unit gap
  const capBotBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), matCapsuleInner);
  capBotBody.position.y = -0.7;
  capsuleGroup.add(capBotBody);
  const capBotDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), matCapsuleInner);
  capBotDome.position.y = -1.075;
  capsuleGroup.add(capBotDome);

  // Core sphere: transparent glass
  const coreSphereMesh = new THREE.Mesh(geoSphere, matCoreGlass);
  coreSphereMesh.position.y = -0.35;
  coreSphereMesh.scale.setScalar(0.65);
  capsuleGroup.add(coreSphereMesh);

  // 10 inner red/pink plant bits
  for (let i = 0; i < 10; i++) {
    const bit = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.06, 0),
      new THREE.MeshStandardMaterial({ color: 0xd04060, roughness: 0.38, emissive: 0x200510, emissiveIntensity: 0.55 })
    );
    bit.position.set((Math.random() - 0.5) * 0.35, -0.35 + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.35);
    capsuleGroup.add(bit);
  }
  oceanWorld.add(capsuleGroup);

  // ── Underwater light beams (2 angled spot lights fade in during dive) ──
  const beamGeom1 = new THREE.CylinderGeometry(0.08, 0.8, 9, 8, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({ color: 0x9988cc, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide });
  const lightBeam1 = new THREE.Mesh(beamGeom1, beamMat);
  lightBeam1.position.set(4, 2, 6);
  lightBeam1.rotation.z = 0.5;
  lightBeam1.visible = false;
  oceanWorld.add(lightBeam1);

  const lightBeam2 = new THREE.Mesh(beamGeom1.clone(), beamMat.clone());
  lightBeam2.position.set(-3, 3, 10);
  lightBeam2.rotation.z = -0.4;
  lightBeam2.visible = false;
  oceanWorld.add(lightBeam2);

  // ── Final triangle group (nested 4 layers) ──
  const finalTriGroup = new THREE.Group();
  finalTriGroup.position.set(0, -3.2, 15);

  const triMats = [matTriGold, matTriCopper, matTriSilver, matTriGold];
  for (let t = 0; t < 4; t++) {
    const size = 1.7 - t * 0.32;
    const tri = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, size, 3), triMats[t]);
      bar.rotation.y = Math.PI / 2;
      const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const radius = size * 0.55;
      bar.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      tri.add(bar);
    }
    tri.rotation.z = t * 0.08;
    tri.rotation.y = t * 0.05;
    finalTriGroup.add(tri);
  }
  oceanWorld.add(finalTriGroup);

  // ── Marine snow: 200 particles, slowly rising, additive blending ──
  const realParticleCount = Math.round(200 * particleMult);
  const particlesGeo = new THREE.BufferGeometry();
  const particlesPos = new Float32Array(realParticleCount * 3);
  const particlesVel = new Float32Array(realParticleCount);
  for (let i = 0; i < realParticleCount; i++) {
    particlesPos[i * 3]     = (Math.random() - 0.5) * 16;
    particlesPos[i * 3 + 1] = -5 + Math.random() * 14;
    particlesPos[i * 3 + 2] = -3 + Math.random() * 28;
    particlesVel[i] = 0.08 + Math.random() * 0.4;
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlesPos, 3));
  const particlesMat = new THREE.PointsMaterial({
    color: 0xccccdd, size: 0.06,
    transparent: true, opacity: 0.35,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particleSystem = new THREE.Points(particlesGeo, particlesMat);
  oceanWorld.add(particleSystem);

  // ── Bubbles: 15 small transparent spheres ──
  const bubbleCount = quality.tier === 'low' ? 8 : 15;
  const bubbles = [];
  for (let i = 0; i < bubbleCount; i++) {
    const bub = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + Math.random() * 0.08, 6, 4),
      new THREE.MeshPhysicalMaterial({
        color: 0xe0d8f8, roughness: 0.05, metalness: 0.0,
        transparent: true, opacity: 0.25,
      })
    );
    bub.position.set((Math.random() - 0.5) * 10, -5 + Math.random() * 10, -2 + Math.random() * 22);
    bub.userData = {
      riseSpeed: 0.15 + Math.random() * 0.4,
      wobbleAmp: 0.1 + Math.random() * 0.3,
      wobblePhase: Math.random() * Math.PI * 2,
    };
    oceanWorld.add(bub);
    bubbles.push(bub);
  }

  // ── Store references for ambient animator ──
  oceanWorld.userData = {
    waterMaterial: waterMat,
    nearRocks,
    midRocks,
    farRocks,
    nearPearls,
    farPearls,
    shells,
    // nutBlocks removed — camera collision risk
    coralIsland,
    islandReflection,
    foamRing,
    coralGroups,
    fishes,
    smallFishSchool,
    bigFish,
    seabed,
    seabedBumps,
    reefLeft,
    reefRight,
    uwCoralGroups,
    stonePillars,
    topWaterPlane,
    capsuleGroup,
    finalTriGroup,
    lightBeam1,
    lightBeam2,
    particleSystem,
    particlesVel,
    realParticleCount,
    bubbles,
  };

  return oceanWorld;
}
