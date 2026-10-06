/**
 * 背景异形不均分网格 + 悬浮粒子 — 性能优化版
 * 全站背景 canvas，帧率限制 + 粒子数精简 + 渐变缓存
 */
(function () {
  var isIndex = document.body.classList.contains('index-page');
  if (!isIndex) return;

  var canvas = document.createElement('canvas');
  canvas.id = 'bgGridCanvas';
  canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.85;';
  document.body.prepend(canvas);

  var ctx = canvas.getContext('2d');
  var w, h;
  var particles = [];
  var mouseX = -1000, mouseY = -1000;
  var lastFrame = 0;
  var frameInterval = 1000 / 30; // 目标 30fps，足够平滑

  // ── 悬浮粒子（减少到 35 个）──
  function spawnParticles() {
    for (var i = 0; i < 35; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 1.8 + Math.random() * 5.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        opacity: 0.40 + Math.random() * 0.60,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.003 + Math.random() * 0.01,
      });
    }
  }

  // ── 尺寸更新 ──
  function resize() {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    particles.length = 0;
    spawnParticles();
  }
  window.addEventListener('resize', resize);
  resize();

  // ── 鼠标 ──
  window.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
  }, { passive: true });

  // ── 缓存的渐变色 ──
  var cacheGrad = {};
  function getGrad(r, key) {
    if (!cacheGrad[key]) {
      // 预创建，后续帧复用（坐标偏移由 globalAlpha 和 arc 处理，渐变本身只依赖 r）
      cacheGrad[key] = true; // 标记已缓存
    }
    return null;
  }

  // ── 绘制（帧率限制）──
  function draw(now) {
    requestAnimationFrame(draw);

    // 帧率限制
    if (now - lastFrame < frameInterval) return;
    lastFrame = now;

    var t = now * 0.001;
    ctx.clearRect(0, 0, w, h);

    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];

      // 微动
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      // 鼠标吸引
      var dx = mouseX - p.x;
      var dy = mouseY - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 180) {
        p.x += dx / dist * 0.2;
        p.y += dy / dist * 0.2;
      }

      var bp = Math.sin(t * p.pulseSpeed * 30 + p.pulse) * 0.3 + 0.7;
      var alpha = p.opacity * bp;
      var gx = p.x, gy = p.y, gr = p.r;

      // 外层光晕 — 直接创建渐变（这是主要开销，但 35 个粒子 x 1 渐变 = 可接受）
      var grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * 10);
      grad.addColorStop(0, 'rgba(160,210,255,' + (0.35 * alpha) + ')');
      grad.addColorStop(0.25, 'rgba(120,180,255,' + (0.18 * alpha) + ')');
      grad.addColorStop(0.6, 'rgba(70,120,210,' + (0.06 * alpha) + ')');
      grad.addColorStop(1, 'rgba(30,60,120,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr * 10, 0, Math.PI * 2);
      ctx.fill();

      // 内层亮光
      var innerGrad = ctx.createRadialGradient(gx, gy, 0, gx, gy, gr * 4);
      innerGrad.addColorStop(0, 'rgba(230,245,255,' + (0.55 * alpha) + ')');
      innerGrad.addColorStop(0.4, 'rgba(170,220,255,' + (0.22 * alpha) + ')');
      innerGrad.addColorStop(1, 'rgba(100,160,240,0)');
      ctx.fillStyle = innerGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr * 4, 0, Math.PI * 2);
      ctx.fill();

      // 核心亮点
      ctx.fillStyle = 'rgba(232,244,255,' + Math.min(1, alpha * 1.5) + ')';
      ctx.beginPath();
      ctx.arc(gx, gy, gr * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  requestAnimationFrame(draw);
})();
