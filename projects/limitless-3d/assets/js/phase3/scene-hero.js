import * as THREE from 'three';
import {
  geoBoxTall, geoIco, geoIcoHi,
  _dummyMatrix, _dummyPos, _dummyQuat, _dummyScale
} from './geometries.js';
import {
  matRockDark, matRockMid, matProduct, matProductLabel, matGold, matStar
} from './materials.js';

export function buildHeroWorld() {
  const heroWorld = new THREE.Group();

  // ── Mountain rocks (InstancedMesh: 9 instances) ──
  const rockData = [
    [-1.2, -0.5, 0.2, 1.6, 1.2, 1.2, 0.1, 0.3, 0.2],
    [1.3, -0.6, 0.1, 1.5, 1.1, 1.3, -0.1, -0.4, -0.15],
    [-0.8, -1.0, -0.2, 2.0, 1.0, 1.4, 0, 0.1, 0],
    [1.0, -0.9, -0.3, 1.8, 1.1, 1.2, -0.05, -0.2, 0.1],
    [0, -1.3, 0.5, 2.2, 1.3, 1.5, 0, 0, 0],
    [-1.5, -1.2, 0.4, 1.4, 0.9, 1.0, 0.15, 0.5, -0.1],
    [1.6, -1.1, 0.3, 1.3, 1.0, 1.1, -0.1, -0.3, 0.15],
    [-0.3, -1.6, 0.8, 2.5, 1.0, 1.8, 0, 0, 0],
    [0.5, -1.5, 0.6, 2.0, 0.9, 1.6, 0.05, -0.15, 0],
  ];

  const mountainRocks = new THREE.InstancedMesh(geoIcoHi, matRockMid, 9);
  mountainRocks.castShadow = true;
  mountainRocks.receiveShadow = true;

  const rockInstanceData = [];
  rockData.forEach(([x, y, z, sx, sy, sz, rx, ry, rz], i) => {
    _dummyPos.set(x, y, z);
    _dummyQuat.setFromEuler(new THREE.Euler(rx, ry, rz));
    _dummyScale.set(sx, sy, sz);
    _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
    mountainRocks.setMatrixAt(i, _dummyMatrix);
    rockInstanceData.push({ basePos: [x, y, z] });
  });
  mountainRocks.instanceMatrix.needsUpdate = true;
  mountainRocks.userData.instanceData = rockInstanceData;
  heroWorld.add(mountainRocks);

  // ── Stars (Points instead of 100 individual Meshes) ──
  const starCount = 100;
  const starPositions = new Float32Array(starCount * 3);
  const starTwinkleData = [];
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3]     = (Math.random() - 0.5) * 14;
    starPositions[i * 3 + 1] = 2 + Math.random() * 7;
    starPositions[i * 3 + 2] = -3 + Math.random() * 5;
    starTwinkleData.push({
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.5 + Math.random() * 2,
    });
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starsGroup = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0xaaccff,
    size: 0.08,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  }));
  starsGroup.userData = { twinkleData: starTwinkleData };
  heroWorld.add(starsGroup);

  // ── Hero fog layers (4 individual planes) ──
  const heroFogLayers = [];
  for (let i = 0; i < 4; i++) {
    const fogPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 3),
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0.12 + i * 0.04 },
          uColor: { value: new THREE.Color().setHSL(0.75, 0.4, 0.3 + i * 0.15) },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `uniform float uTime; uniform float uOpacity; uniform vec3 uColor; varying vec2 vUv;
          void main() { float alpha = uOpacity * (0.4 + 0.6 * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y)); gl_FragColor = vec4(uColor, alpha); }`,
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    fogPlane.position.set(0, -0.3, 1.5 + i * 1.3);
    fogPlane.rotation.x = -0.1;
    heroWorld.add(fogPlane);
    heroFogLayers.push(fogPlane);
  }

  // ── Golden triangle icon (entrance) ──
  const triGroup = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.8, 3), matGold);
    bar.rotation.y = Math.PI / 2;
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    bar.position.set(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
    triGroup.add(bar);
  }
  triGroup.position.set(0, 0.85, 0);
  triGroup.scale.setScalar(0.7);
  heroWorld.add(triGroup);

  // ── Entrance capsule button ──
  const entranceBtn = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.35, 8, 12), matProduct);
  entranceBtn.position.set(0, -0.1, 0.15);
  heroWorld.add(entranceBtn);

  // ── Product can (RoundedBox via high-seg box) ──
  const productCan = new THREE.Mesh(geoBoxTall, matProduct);
  productCan.position.set(0, 0.15, 0.6);
  productCan.rotation.x = -0.12;
  productCan.castShadow = true;
  heroWorld.add(productCan);

  // ── Product label decal ──
  const productDecal = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.45, 0.04), matProductLabel);
  productDecal.position.set(0, 0.3, 0.99);
  productDecal.rotation.x = -0.12;
  heroWorld.add(productDecal);

  // ── Store animation data references ──
  heroWorld.userData = {
    triGroup,
    entranceBtn,
    productCan,
    fogLayers: heroFogLayers,
    starsGroup,
    mountainRocks,
  };

  return heroWorld;
}
