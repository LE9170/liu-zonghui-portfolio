import * as THREE from 'three';
import {
  geoBox, geoBoxCapsule, geoSphere, geoSphereLo,
  geoIco, geoIcoHi, geoCyl, geoPlane, geoTorus,
  _dummyMatrix, _dummyPos, _dummyQuat, _dummyScale,
} from './geometries.js';
import {
  matSky, matRockFloat, matRockMid, matPearl, matShell, matCoralSurf,
  matSeabed, matReef, matCoralUW, matCapsule, matCapsuleInner,
  matCoreGlass, matBenefitRing, matTriGold, matTriCopper, matTriSilver,
  coralColors, uwCoralColors, createCoralMaterial,
} from './materials.js';
import { createWater } from './water-shader.js';

export function buildOceanWorld(quality) {
  const { waterSegments, coralMult, particleMult } = quality;
  const oceanWorld = new THREE.Group();

  // ── Water plane ──
  const { material: waterMat, mesh: waterPlane } = createWater(waterSegments);
  oceanWorld.add(waterPlane);

  // ── Sky backdrop ──
  const skyPlane = new THREE.Mesh(new THREE.PlaneGeometry(45, 10), matSky);
  skyPlane.position.set(0, 5, -10);
  oceanWorld.add(skyPlane);

  // ── Horizon glow ──
  const horizonGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 3),
    new THREE.ShaderMaterial({
      uniforms: { uColor1: { value: new THREE.Color('#e898b8') }, uColor2: { value: new THREE.Color('#604070') } },
      vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 uColor1; uniform vec3 uColor2; varying vec2 vUv;
        void main() { gl_FragColor = vec4(mix(uColor2, uColor1, vUv.y), 0.35); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
    })
  );
  horizonGlow.position.set(0, 0.15, -9.5);
  oceanWorld.add(horizonGlow);

  // ── Floating rocks (InstancedMesh: 22 instances) ──
  const floatingCount = 22;
  const floatingRocks = new THREE.InstancedMesh(geoIcoHi, matRockFloat, floatingCount);
  floatingRocks.castShadow = true;
  floatingRocks.receiveShadow = true;
  const floatInstanceData = [];

  for (let i = 0; i < floatingCount; i++) {
    const depth = i / floatingCount; // approximate depth distribution
    const x = (Math.random() - 0.5) * 16;
    const y = 0.2 + Math.random() * 3.0;
    const z = -3 + Math.random() * 16;
    const s = 0.15 + depth * 0.9;

    _dummyPos.set(x, y, z);
    _dummyQuat.setFromEuler(new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI));
    _dummyScale.set(s, s, s);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    floatingRocks.setMatrixAt(i, _dummyMatrix);

    floatInstanceData.push({
      depth,
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.2 + Math.random() * 0.6,
      floatAmp: 0.08 + Math.random() * 0.3,
      rotSpeed: 0.03 + Math.random() * 0.15,
      baseY: y,
      baseRotY: 0,
    });
  }
  floatingRocks.instanceMatrix.needsUpdate = true;
  floatingRocks.userData.instanceData = floatInstanceData;
  oceanWorld.add(floatingRocks);

  // ── Pearls (InstancedMesh: 10 instances) ──
  const pearlCount = 10;
  const pearls = new THREE.InstancedMesh(geoSphereLo, matPearl, pearlCount);
  const pearlInstanceData = [];
  for (let i = 0; i < pearlCount; i++) {
    const x = (Math.random() - 0.5) * 10;
    const y = 0.04 + Math.random() * 0.25;
    const z = -1 + Math.random() * 11;
    const s = 0.06 + Math.random() * 0.15;
    _dummyPos.set(x, y, z);
    _dummyQuat.identity();
    _dummyScale.set(s, s, s);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    pearls.setMatrixAt(i, _dummyMatrix);
    pearlInstanceData.push({
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.4 + Math.random() * 0.8,
      floatAmp: 0.04 + Math.random() * 0.12,
      baseY: y,
    });
  }
  pearls.instanceMatrix.needsUpdate = true;
  pearls.userData.instanceData = pearlInstanceData;
  oceanWorld.add(pearls);

  // ── Shells (InstancedMesh: 6 instances) ──
  const shellGeom = new THREE.SphereGeometry(0.18, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const shellCount = 6;
  const shells = new THREE.InstancedMesh(shellGeom, matShell, shellCount);
  const shellInstanceData = [];
  for (let i = 0; i < shellCount; i++) {
    const x = (Math.random() - 0.5) * 9;
    const y = 0.015;
    const z = -1 + Math.random() * 9;
    _dummyPos.set(x, y, z);
    _dummyQuat.setFromEuler(new THREE.Euler(Math.PI, 0, 0));
    _dummyScale.set(1, 1, 1);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    shells.setMatrixAt(i, _dummyMatrix);
    shellInstanceData.push({
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.3 + Math.random() * 0.5,
      baseY: 0.015,
    });
  }
  shells.instanceMatrix.needsUpdate = true;
  shells.userData.instanceData = shellInstanceData;
  oceanWorld.add(shells);

  // ── Nutrition blocks (InstancedMesh: 8 instances) ──
  const nutCount = 8;
  const nutBlocks = new THREE.InstancedMesh(geoBoxCapsule, matRockFloat.clone(), nutCount);
  const nutInstanceData = [];
  for (let i = 0; i < nutCount; i++) {
    const x = (Math.random() - 0.5) * 11;
    const y = 0.08 + Math.random() * 0.5;
    const z = -1 + Math.random() * 11;
    _dummyPos.set(x, y, z);
    _dummyQuat.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
    _dummyScale.set(1, 1, 1);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    nutBlocks.setMatrixAt(i, _dummyMatrix);
    nutInstanceData.push({
      floatPhase: Math.random() * Math.PI * 2,
      floatSpeed: 0.25 + Math.random() * 0.5,
      floatAmp: 0.05 + Math.random() * 0.15,
      baseY: y,
    });
  }
  nutBlocks.instanceMatrix.needsUpdate = true;
  nutBlocks.userData.instanceData = nutInstanceData;
  oceanWorld.add(nutBlocks);

  // ── Coral Island ──
  const coralIsland = new THREE.Group();
  coralIsland.position.set(-1.5, 0.05, 9);

  // Island base (individual)
  const islandBase = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.2, 0.4, 10), matRockMid);
  islandBase.position.y = -0.05;
  islandBase.receiveShadow = true;
  coralIsland.add(islandBase);

  // Coral clusters on island (InstancedMeshes by color)
  const coralCount = Math.round(25 * coralMult);
  const coralGroupCount = Math.min(coralColors.length, Math.max(2, Math.round(3 * coralMult)));
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
      const r = 0.15 + Math.random() * 1.4;
      const x = Math.cos(angle) * r;
      const y = 0.15 + Math.random() * 0.8;
      const z = Math.sin(angle) * r;
      const s = 0.25 + Math.random() * 0.5;
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

  // ── Fish (7 individual Groups — keep for tail animation) ──
  const fishes = [];
  function createFish(scale, x, y, z) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xf0a870, roughness: 0.35, metalness: 0.05 })
    );
    group.add(body);
    const tailPivot = new THREE.Group();
    tailPivot.position.x = -0.55;
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.35, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xf0b890, roughness: 0.3, metalness: 0.02, transparent: true, opacity: 0.85 })
    );
    tail.position.x = -0.12;
    tailPivot.add(tail);
    group.add(tailPivot);
    const dorsal = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.1, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xf0c0a0, roughness: 0.3, metalness: 0.02, transparent: true, opacity: 0.75 })
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
    fishes.push(group);
    return group;
  }

  for (let i = 0; i < 6; i++) {
    createFish(0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 10, 0.3 + Math.random() * 1.8, -1 + Math.random() * 10);
  }
  const bigFish = createFish(1.5, 6, 0.6, 3);

  // ── Seabed ──
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(30, 45, 25, 30), matSeabed);
  seabed.rotation.x = -Math.PI / 2;
  seabed.position.y = -5;
  seabed.receiveShadow = true;
  oceanWorld.add(seabed);

  // ── Seabed bumps (InstancedMesh: 30 instances) ──
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

  // ── Left reef wall (InstancedMesh: 16 instances) ──
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

  // ── Right reef wall (InstancedMesh: 16 instances) ──
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

  // ── Underwater corals (3-5 InstancedMesh groups, 35 total) ──
  const uwCoralTotal = Math.round(35 * coralMult);
  const uwGroupCount = Math.min(uwCoralColors.length, Math.max(3, Math.round(4 * coralMult)));
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
      const y = -5 + Math.random() * 1.0;
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

  // ── Stone pillars (5 individual — keep) ──
  const stonePillars = [];
  for (let i = 0; i < 5; i++) {
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.35, 2 + Math.random() * 3, 8),
      matReef
    );
    pillar.position.set((Math.random() - 0.5) * 6, -4 + Math.random() * 0.8, 2 + i * 4);
    pillar.receiveShadow = true;
    oceanWorld.add(pillar);
    stonePillars.push(pillar);
  }

  // ── Capsule group (individual — animated parts) ──
  const capsuleGroup = new THREE.Group();
  capsuleGroup.position.set(0.3, -2.6, 3.5);

  const capTopBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), matCapsule);
  capTopBody.position.y = 0.2;
  capsuleGroup.add(capTopBody);
  const capTopDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), matCapsule);
  capTopDome.position.y = 0.575;
  capsuleGroup.add(capTopDome);

  const capBotBody = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.75, 20, 1, true), matCapsuleInner);
  capBotBody.position.y = -0.7;
  capsuleGroup.add(capBotBody);
  const capBotDome = new THREE.Mesh(new THREE.SphereGeometry(0.38, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), matCapsuleInner);
  capBotDome.position.y = -1.075;
  capsuleGroup.add(capBotDome);

  const coreSphereMesh = new THREE.Mesh(geoSphere, matCoreGlass);
  coreSphereMesh.position.y = -0.35;
  coreSphereMesh.scale.setScalar(0.65);
  capsuleGroup.add(coreSphereMesh);

  for (let i = 0; i < 10; i++) {
    const bit = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.06, 0),
      new THREE.MeshStandardMaterial({ color: 0xd04060, roughness: 0.4, emissive: 0x200510, emissiveIntensity: 0.5 })
    );
    bit.position.set((Math.random() - 0.5) * 0.35, -0.35 + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.35);
    capsuleGroup.add(bit);
  }
  oceanWorld.add(capsuleGroup);

  // ── Final triangle group (individual — animated) ──
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

  // ── Particles (Points: variable count) ──
  const realParticleCount = Math.round((quality.tier === 'low' ? 120 : 300) * particleMult);
  const particlesGeo = new THREE.BufferGeometry();
  const particlesPos = new Float32Array(realParticleCount * 3);
  const particlesVel = new Float32Array(realParticleCount);
  for (let i = 0; i < realParticleCount; i++) {
    particlesPos[i * 3]     = (Math.random() - 0.5) * 16;
    particlesPos[i * 3 + 1] = -5 + Math.random() * 14;
    particlesPos[i * 3 + 2] = -3 + Math.random() * 28;
    particlesVel[i] = 0.1 + Math.random() * 0.5;
  }
  particlesGeo.setAttribute('position', new THREE.BufferAttribute(particlesPos, 3));
  const particlesMat = new THREE.PointsMaterial({
    color: 0xccccdd, size: 0.05,
    transparent: true, opacity: 0.45,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const particleSystem = new THREE.Points(particlesGeo, particlesMat);
  oceanWorld.add(particleSystem);

  // ── Bubbles (individual — unique rise animation) ──
  const bubbleCount = quality.tier === 'low' ? 8 : 20;
  const bubbles = [];
  for (let i = 0; i < bubbleCount; i++) {
    const bub = new THREE.Mesh(
      new THREE.SphereGeometry(0.04 + Math.random() * 0.08, 6, 4),
      new THREE.MeshPhysicalMaterial({ color: 0xd8d0f8, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.3 })
    );
    bub.position.set((Math.random() - 0.5) * 10, -5 + Math.random() * 10, -2 + Math.random() * 22);
    bub.userData = { riseSpeed: 0.15 + Math.random() * 0.4, wobbleAmp: 0.1 + Math.random() * 0.3, wobblePhase: Math.random() * Math.PI * 2 };
    oceanWorld.add(bub);
    bubbles.push(bub);
  }

  // ── Store references for ambient animator ──
  oceanWorld.userData = {
    waterMaterial: waterMat,
    floatingRocks,
    pearls,
    shells,
    nutBlocks,
    coralIsland,
    coralGroups,
    fishes,
    bigFish,
    seabed,
    seabedBumps,
    reefLeft,
    reefRight,
    uwCoralGroups,
    stonePillars,
    capsuleGroup,
    finalTriGroup,
    particleSystem,
    particlesVel,
    realParticleCount,
    bubbles,
  };

  return oceanWorld;
}
