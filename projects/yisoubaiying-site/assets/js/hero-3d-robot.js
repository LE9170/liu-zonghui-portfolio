/**
 * Hero 3D Robot — Three.js 沉浸式背景（性能优化版）
 * 低多边形 AI 机器人 + 数据粒子 + 鼠标视差 + 滚动动画
 */
(function () {
  // ── 降级检查 ──
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
  if (prefersReduced || isMobile) {
    const hero = document.querySelector('.hero');
    if (!hero) return;
    const placeholder = document.createElement('div');
    placeholder.className = 'hero-3d-placeholder';
    placeholder.innerHTML = '<svg viewBox="0 0 200 220" width="160" height="176" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="100" cy="190" rx="60" ry="12" fill="rgba(52,44,143,0.15)"/><rect x="55" y="140" width="90" height="50" rx="18" fill="url(#bg)"/><circle cx="100" cy="80" r="40" fill="url(#bg2)" stroke="rgba(91,92,226,0.5)" stroke-width="3"/><circle cx="86" cy="74" r="8" fill="#5B5CE2"/><circle cx="114" cy="74" r="8" fill="#5B5CE2"/><circle cx="86" cy="74" r="4" fill="#fff"/><circle cx="114" cy="74" r="4" fill="#fff"/><circle cx="100" cy="162" r="12" fill="#F90"/><rect x="30" y="120" width="20" height="35" rx="10" fill="url(#bg3)"/><rect x="150" y="120" width="20" height="35" rx="10" fill="url(#bg3)"/><defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#342C8F"/><stop offset="1" stop-color="#5B5CE2"/></linearGradient><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#342C8F"/><stop offset="1" stop-color="#2F80ED"/></linearGradient><linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#5B5CE2"/><stop offset="1" stop-color="#2F80ED"/></linearGradient></defs></svg>';
    placeholder.style.cssText = 'position:absolute;right:8%;top:20%;pointer-events:none;z-index:0;animation:robotFloat 4s ease-in-out infinite;';
    hero.style.position = 'relative';
    hero.appendChild(placeholder);
    var styleEl = document.createElement('style');
    styleEl.textContent = '@keyframes robotFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}';
    document.head.appendChild(styleEl);
    return;
  }

  // ── Three.js 初始化 ──
  const hero = document.querySelector('.hero');
  if (!hero) return;

  hero.style.position = 'relative';

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-3d-canvas';
  canvas.style.cssText = 'pointer-events:none;';
  hero.insertBefore(canvas, hero.firstChild);

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  // 禁用 shadowMap — 机器人不需要阴影，节省大量 GPU
  // renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0.8, -0.1, 4.5);
  camera.lookAt(0, -0.2, 0);

  // ── 灯光 ──
  scene.add(new THREE.AmbientLight(0x334466, 0.8));
  const keyLight = new THREE.DirectionalLight(0xaaccff, 1.2);
  keyLight.position.set(3, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x4488ff, 1.5);
  rimLight.position.set(-3, 1, -2);
  scene.add(rimLight);
  const bottomLight = new THREE.PointLight(0x4488ff, 1.2, 10);
  bottomLight.position.set(0, -3, 1);
  scene.add(bottomLight);

  // ── 共享材质 ──
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1a5e, roughness: 0.3, metalness: 0.25, emissive: 0x1a1a5e, emissiveIntensity: 0.3 });
  const bodyMat2 = new THREE.MeshStandardMaterial({ color: 0x3a3ac8, roughness: 0.25, metalness: 0.3, emissive: 0x3a3ac8, emissiveIntensity: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.15, metalness: 0.4, emissive: 0x4488ff, emissiveIntensity: 0.8 });
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.05, emissive: 0x88ccff, emissiveIntensity: 1.5 });
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1a1a3e, roughness: 0.1 });

  // ── 机器人组 ──
  const robot = new THREE.Group();

  const coreGlow = new THREE.PointLight(0x3388ff, 2.5, 3);
  coreGlow.position.set(0, -0.5, 0);
  robot.add(coreGlow);

  const topGlow = new THREE.PointLight(0x5599ff, 1.5, 2.5);
  topGlow.position.set(0, 0.5, 0.3);
  robot.add(topGlow);

  robot.scale.set(1.3, 1, 1);
  robot.position.x = -0.6;
  scene.add(robot);

  // 底座
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.65, 0.2, 32),
    new THREE.MeshStandardMaterial({ color: 0x4488ff, roughness: 0.15, metalness: 0.5, emissive: 0x4488ff, emissiveIntensity: 0.7 })
  );
  base.position.y = -1.45;
  robot.add(base);

  // 身体
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 0.9, 32), bodyMat);
  body.position.y = -0.9;
  robot.add(body);

  // 装饰环
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.05, 16, 32), accentMat);
  ring.position.y = -0.65;
  ring.rotation.x = Math.PI / 2;
  robot.add(ring);

  // 辉光光环（外层）
  const glowRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.52, 0.08, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x3388ff, transparent: true, opacity: 0.4 })
  );
  glowRing.position.y = -0.65;
  glowRing.rotation.x = Math.PI / 2;
  robot.add(glowRing);

  // 第二层辉光环
  const glowRing2 = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.12, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x2266dd, transparent: true, opacity: 0.2 })
  );
  glowRing2.position.y = -0.65;
  glowRing2.rotation.x = Math.PI / 2;
  robot.add(glowRing2);

  // 头部光环
  const headGlow = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.05, 16, 48),
    new THREE.MeshBasicMaterial({ color: 0x5599ff, transparent: true, opacity: 0.35 })
  );
  headGlow.position.y = -0.15;
  headGlow.rotation.x = Math.PI / 2;
  robot.add(headGlow);

  // 头部
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 32), bodyMat2);
  head.position.y = -0.15;
  robot.add(head);

  // 眼睛
  const eyeGeom = new THREE.SphereGeometry(0.08, 16, 16);
  const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
  leftEye.position.set(-0.14, 0.02, 0.38);
  robot.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
  rightEye.position.set(0.14, 0.02, 0.38);
  robot.add(rightEye);

  // 瞳孔（缓存引用，不用每帧 getObjectByName）
  const pupilGeom = new THREE.SphereGeometry(0.04, 8, 8);
  const leftPupil = new THREE.Mesh(pupilGeom, pupilMat);
  leftPupil.position.set(-0.14, 0.0, 0.44);
  robot.add(leftPupil);
  const rightPupil = new THREE.Mesh(pupilGeom, pupilMat);
  rightPupil.position.set(0.14, 0.0, 0.44);
  robot.add(rightPupil);

  // 左臂
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.52, -0.7, 0);
  leftArm.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.35, 8, 16), bodyMat));
  leftArm.children[0].position.y = -0.15;
  const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 8, 16), bodyMat2);
  leftForearm.position.y = -0.5;
  leftForearm.rotation.z = 0.3;
  leftArm.add(leftForearm);
  robot.add(leftArm);

  // 右臂
  const rightArm = new THREE.Group();
  rightArm.position.set(0.52, -0.7, 0);
  rightArm.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.35, 8, 16), bodyMat));
  rightArm.children[0].position.y = -0.15;
  const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.3, 8, 16), bodyMat2);
  rightForearm.position.y = -0.5;
  rightForearm.rotation.z = -0.3;
  rightArm.add(rightForearm);
  robot.add(rightArm);

  // 胸前 Logo
  const logoLoader = new THREE.TextureLoader();
  logoLoader.load('https://www.tk163.com/wp-content/uploads/2026/03/cropped-logo.png', function (texture) {
    texture.repeat.set(0.3, 1);
    texture.offset.set(0, 0);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    const logoMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.4, metalness: 0.1, emissive: 0xff8800, emissiveIntensity: 0.2, emissiveMap: texture });
    const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), logoMat);
    logoPlane.position.set(0, -0.85, 0.41);
    robot.add(logoPlane);
  }, undefined, function () {
    const fallback = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.3, emissive: 0xff8800, emissiveIntensity: 0.35 }));
    fallback.position.set(0, -0.85, 0.41);
    robot.add(fallback);
  });

  // ── 幽蓝粒子（共享材质，35个粒子，4种共享材质）──
  const particles = [];
  const particleGeom = new THREE.SphereGeometry(0.025, 6, 6);
  const sharedMats = [];
  for (var mi = 0; mi < 4; mi++) {
    sharedMats.push(new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.58 + Math.random() * 0.1, 0.8, 0.5 + Math.random() * 0.5),
      roughness: 0.1,
      emissive: new THREE.Color().setHSL(0.58 + Math.random() * 0.1, 0.9, 0.4),
      emissiveIntensity: 0.7 + Math.random() * 0.6,
      transparent: true, opacity: 0.5 + Math.random() * 0.5,
    }));
  }
  for (var i = 0; i < 35; i++) {
    const particle = new THREE.Mesh(particleGeom, sharedMats[i % 4]);
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.7 + Math.random() * 1.8;
    const height = -1.5 + Math.random() * 2.8;
    particle.position.set(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
    particle.userData = { angle: angle, radius: radius, baseY: height, speed: 0.12 + Math.random() * 0.35, phase: Math.random() * Math.PI * 2 };
    robot.add(particle);
    particles.push(particle);
  }

  // 蓝色连接线（减少到 5 根）
  const linesMat = new THREE.LineBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.25 });
  const linesGroup = new THREE.Group();
  for (var li = 0; li < 5; li++) {
    const geom = new THREE.BufferGeometry();
    const a = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.random() * 1.0;
    const y1 = -1.5 + Math.random() * 2.5;
    const y2 = -1.5 + Math.random() * 2.5;
    geom.setFromPoints([
      new THREE.Vector3(Math.cos(a) * r, y1, Math.sin(a) * r),
      new THREE.Vector3(Math.cos(a + 0.3) * (r + 0.3), y2, Math.sin(a + 0.3) * (r + 0.3)),
    ]);
    linesGroup.add(new THREE.Line(geom, linesMat));
  }
  robot.add(linesGroup);

  // ── 状态 ──
  var mouseX = 0, mouseY = 0, targetX = 0, targetY = 0;
  var scrollProgress = 0, targetScroll = 0;
  var pageVisible = true;

  // ── 鼠标监听（passive）──
  window.addEventListener('mousemove', function (e) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // ── 滚动监听 ──
  window.addEventListener('scroll', function () {
    var rect = hero.getBoundingClientRect();
    targetScroll = Math.max(0, Math.min(1, -rect.top / (hero.offsetHeight * 0.7)));
  }, { passive: true });

  // ── 可见性 ──
  document.addEventListener('visibilitychange', function () {
    pageVisible = !document.hidden;
  });

  // ── 尺寸 ──
  function resize() {
    var w = hero.clientWidth;
    var h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── 帧跳过计数器（目标 45fps 以降低 GPU 负载）──
  var frameSkip = 0;

  // ── 动画循环 ──
  function animate() {
    requestAnimationFrame(animate);

    // 页面不可见时跳过渲染
    if (!pageVisible) return;

    // 帧跳过：每 3 帧跳 1 帧 → 约 40fps，肉眼不可察觉但大幅降低负载
    frameSkip = (frameSkip + 1) % 3;
    if (frameSkip === 0) return;

    var t = performance.now() * 0.001;

    // 缓动
    mouseX += (targetX - mouseX) * 0.12;
    mouseY += (targetY - mouseY) * 0.12;
    scrollProgress += (targetScroll - scrollProgress) * 0.15;

    // 机器人视差
    robot.rotation.y = mouseX * (Math.PI / 22);
    robot.rotation.x = mouseY * (Math.PI / 36);

    // 浮动 + 滚动
    robot.position.y = Math.sin(t * 1.2) * 0.15 - scrollProgress * 1.2;
    robot.scale.setScalar(Math.max(1.0, 1.7 + Math.sin(t * 0.8) * 0.03 - scrollProgress * 0.3));

    // 粒子动画
    for (var pi = 0; pi < particles.length; pi++) {
      var p = particles[pi];
      var ud = p.userData;
      p.position.y = ud.baseY + Math.sin(t * ud.speed + ud.phase) * 0.25;
      p.position.x = Math.cos(ud.angle + t * 0.12) * ud.radius;
      p.position.z = Math.sin(ud.angle + t * 0.12) * ud.radius;
    }

    // 瞳孔跟随（直接引用，不用 getObjectByName）
    var eyeR = 0.03;
    leftPupil.position.x = -0.14 + mouseX * eyeR;
    leftPupil.position.y = -mouseY * eyeR;
    rightPupil.position.x = 0.14 + mouseX * eyeR;
    rightPupil.position.y = -mouseY * eyeR;

    // 连接线脉冲
    linesMat.opacity = 0.15 + Math.sin(t * 0.7) * 0.12;

    // 辉光脉冲
    glowRing.material.opacity = 0.25 + Math.sin(t * 2.0) * 0.18;
    glowRing.scale.setScalar(1 + Math.sin(t * 1.6) * 0.06);
    glowRing2.material.opacity = 0.1 + Math.sin(t * 1.4 + 1) * 0.12;
    glowRing2.scale.setScalar(1 + Math.sin(t * 1.3 + 0.5) * 0.08);
    headGlow.material.opacity = 0.2 + Math.sin(t * 2.2 + 0.7) * 0.18;
    coreGlow.intensity = 2.0 + Math.sin(t * 1.8) * 0.8;
    topGlow.intensity = 1.2 + Math.sin(t * 2.1 + 0.5) * 0.6;

    renderer.render(scene, camera);
  }

  animate();

  // 初始出现动画
  var startTime = performance.now();
  (function introAnimation() {
    var elapsed = (performance.now() - startTime) / 1000;
    var progress = Math.min(1, elapsed / 1.2);
    robot.scale.setScalar(1.3 + 0.2 * (1 - Math.pow(1 - progress, 3)));
    if (progress < 1) requestAnimationFrame(introAnimation);
  })();
})();
