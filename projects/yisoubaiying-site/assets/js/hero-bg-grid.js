/**
 * Hero 背景：透视网格 + 悬浮粒子/光球 — Canvas 2D 性能优化版
 * 鼠标跟随缓动、帧率限制、可见性暂停
 */
(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768;
  var hero = document.querySelector('.hero');
  if (!hero) return;

  // ── 创建背景 canvas ──
  var canvas = document.createElement('canvas');
  canvas.className = 'hero-bg-canvas';
  canvas.style.cssText = 'position:absolute;inset:0;z-index:0;pointer-events:none;';
  hero.insertBefore(canvas, hero.firstChild);

  var ctx = canvas.getContext('2d');
  var w, h;
  var mouseX = 0, mouseY = 0, targetMX = 0, targetMY = 0;
  var animId;
  var pageVisible = true;
  var particles = [];
  var orbs = [];
  var lastFrame = 0;
  var frameInterval = 1000 / 40; // 40fps — 透视网格不需要 60fps

  // ── 透视网格配置 ──
  var gridConfig = {
    cellSize: 60, gridDepth: 30, gridWidth: 18,
    originY: 0.65, tiltX: 0, tiltY: 0, targetTiltX: 0, targetTiltY: 0,
  };

  function project3D(x, y, z) {
    var fov = 1.2;
    var scale = fov / (fov + z);
    var cx = w / 2 + x * scale * w * 0.45 + gridConfig.tiltY * w * 0.08;
    var cy = h * gridConfig.originY - y * scale * h * 0.2 + z * scale * h * 0.15 + gridConfig.tiltX * h * 0.06;
    return { x: cx, y: cy, scale: scale };
  }

  // ── 粒子 ──
  function createParticle() {
    return {
      x: (Math.random() - 0.5) * w * 2, y: Math.random() * h * 1.3,
      r: 0.6 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.25, vy: -0.1 - Math.random() * 0.35,
      opacity: 0.15 + Math.random() * 0.4,
      hue: Math.random() < 0.8 ? 0.62 + Math.random() * 0.08 : 0.1 + Math.random() * 0.04,
      saturation: 0.6 + Math.random() * 0.4, lightness: 0.5 + Math.random() * 0.4,
      pulse: Math.random() * Math.PI * 2, pulseSpeed: 0.004 + Math.random() * 0.012,
      depth: 0.2 + Math.random() * 0.8,
    };
  }

  function createOrb() {
    var hue = Math.random() < 0.65 ? 0.6 + Math.random() * 0.06 : 0.08 + Math.random() * 0.03;
    return {
      x: (Math.random() - 0.5) * w * 1.2, y: Math.random() * h * 0.7,
      r: 18 + Math.random() * 40,
      vx: (Math.random() - 0.5) * 0.15, vy: -0.05 - Math.random() * 0.2,
      hue: hue, opacity: 0.06 + Math.random() * 0.10,
      pulse: Math.random() * Math.PI * 2, pulseSpeed: 0.003 + Math.random() * 0.006,
      depth: 0.15 + Math.random() * 0.3,
    };
  }

  function spawnAll() {
    particles.length = 0;
    orbs.length = 0;
    var pCount = isMobile ? 5 : prefersReduced ? 3 : 12; // 从 16 降到 12
    var oCount = isMobile ? 1 : prefersReduced ? 1 : 2;
    for (var i = 0; i < pCount; i++) particles.push(createParticle());
    for (var i = 0; i < oCount; i++) orbs.push(createOrb());
  }

  function resize() {
    var rect = hero.getBoundingClientRect();
    w = canvas.width = rect.width;
    h = canvas.height = rect.height;
    spawnAll();
  }

  // ── 鼠标 ──
  hero.addEventListener('mousemove', function (e) {
    var rect = hero.getBoundingClientRect();
    targetMX = (e.clientX - rect.left) / rect.width - 0.5;
    targetMY = (e.clientY - rect.top) / rect.height - 0.5;
  }, { passive: true });
  hero.addEventListener('mouseleave', function () { targetMX = 0; targetMY = 0; });

  // ── 可见性 ──
  document.addEventListener('visibilitychange', function () { pageVisible = !document.hidden; });

  // ── 绘制粒子（复用渐变逻辑）──
  function drawParticles(t) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -40) { p.y = h + 40; p.x = (Math.random() - 0.5) * w * 2; }
      if (p.y > h + 40) { p.y = -40; p.x = (Math.random() - 0.5) * w * 2; }
      if (p.x < -w * 0.6) p.x = w * 1.6;
      if (p.x > w * 1.6) p.x = -w * 0.6;

      if (targetMX !== 0 || targetMY !== 0) {
        var mx = (targetMX + 0.5) * w, my = (targetMY + 0.5) * h;
        var dx = mx - p.x, dy = my - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 250) {
          var force = (1 - dist / 250) * 0.4;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;
        }
      }

      var bp = Math.sin(t * p.pulseSpeed * 30 + p.pulse) * 0.35 + 0.65;
      var alpha = p.opacity * bp * p.depth;
      var hCol = 'hsla(' + (p.hue * 360) + ',' + (p.saturation * 100) + '%,';
      var lPct = p.lightness * 100;

      // 光晕
      var grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      grad.addColorStop(0, hCol + lPct + '%,' + (alpha * 0.35) + ')');
      grad.addColorStop(0.5, hCol + lPct + '%,' + (alpha * 0.10) + ')');
      grad.addColorStop(1, hCol + lPct + '%,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();

      // 核心
      ctx.fillStyle = hCol + (lPct + 20) + '%,' + (alpha * 0.8) + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 光球
    for (var j = 0; j < orbs.length; j++) {
      var o = orbs[j];
      o.x += o.vx;
      o.y += o.vy;
      if (o.y < -60) { o.y = h + 60; o.x = (Math.random() - 0.5) * w * 1.2; }
      if (o.y > h + 60) { o.y = -60; }
      if (o.x < -w * 0.5) o.x = w * 1.5;
      if (o.x > w * 1.5) o.x = -w * 0.5;

      var obp = Math.sin(t * o.pulseSpeed * 20 + o.pulse) * 0.4 + 0.6;
      var oalpha = o.opacity * obp;
      var ohCol = 'hsla(' + (o.hue * 360) + ',';

      var ograd = ctx.createRadialGradient(o.x, o.y, 0, o.x, o.y, o.r);
      ograd.addColorStop(0, ohCol + '75%,65%,' + (oalpha * 0.6) + ')');
      ograd.addColorStop(0.3, ohCol + '70%,55%,' + (oalpha * 0.25) + ')');
      ograd.addColorStop(0.7, ohCol + '60%,40%,' + (oalpha * 0.05) + ')');
      ograd.addColorStop(1, ohCol + '50%,30%,0)');
      ctx.fillStyle = ograd;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── 动画循环（帧率限制）──
  function animate(now) {
    animId = requestAnimationFrame(animate);

    if (!pageVisible && !prefersReduced) return;
    if (now - lastFrame < frameInterval) return;
    lastFrame = now;

    var dt = Math.min((now - lastFrame) / 1000, 0.1);
    var t = now * 0.001;

    // Lerp 缓动
    mouseX += (targetMX - mouseX) * 0.1;
    mouseY += (targetMY - mouseY) * 0.1;
    gridConfig.targetTiltX = -mouseY * 0.7;
    gridConfig.targetTiltY = mouseX * 0.9;
    gridConfig.tiltX += (gridConfig.targetTiltX - gridConfig.tiltX) * 0.1;
    gridConfig.tiltY += (gridConfig.targetTiltY - gridConfig.tiltY) * 0.1;
    gridConfig.tiltX = Math.max(-5, Math.min(5, gridConfig.tiltX));
    gridConfig.tiltY = Math.max(-5, Math.min(5, gridConfig.tiltY));

    ctx.clearRect(0, 0, w, h);
    drawParticles(t);
  }

  // ── 启动 ──
  resize();
  window.addEventListener('resize', resize);

  if (!prefersReduced) {
    animId = requestAnimationFrame(animate);
  } else {
    ctx.clearRect(0, 0, w, h);
    drawParticles(0);
  }
})();
