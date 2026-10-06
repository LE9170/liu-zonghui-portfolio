/**
 * Card-Why 3D Icons — 密集微粒子悬浮图标（性能优化版）
 * 使用 Canvas 2D 替代 Three.js，消除 WebGL 上下文开销
 * 仅动画可见图标（IntersectionObserver）
 */
(function () {
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var icons = [
    {
      // 🔍 放大镜 — 天蓝色系
      selector: '.card-why:nth-child(1) .why-icon',
      hue: 210, build: function (ctx, w, h, t) {
        var cx = w / 2, cy = h / 2, ringR = 48;
        // 镜框 — 多层圆
        for (var layer = 0; layer < 3; layer++) {
          var r = ringR + (layer - 1) * 4;
          ctx.strokeStyle = 'hsla(210, 85%, ' + (58 + layer * 4) + '%, 0.7)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(cx - 6, cy + 6, r, 0, Math.PI * 2); ctx.stroke();
        }
        // 镜片内部半透明填充
        ctx.fillStyle = 'hsla(210, 55%, 68%, 0.18)';
        ctx.beginPath(); ctx.arc(cx - 6, cy + 6, ringR * 0.76, 0, Math.PI * 2); ctx.fill();
        // 手柄
        var hx = cx - 6 + ringR * 0.7, hy = cy + 6 - ringR * 0.7;
        ctx.strokeStyle = 'hsla(210, 85%, 54%, 0.65)';
        ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx + 18, hy - 18); ctx.stroke();
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'hsla(210, 85%, 62%, 0.55)';
        ctx.beginPath(); ctx.moveTo(hx - 1, hy + 1); ctx.lineTo(hx + 17, hy - 17); ctx.stroke();
      }
    },
    {
      // ⚠️ 警告三角 — 橙色系
      selector: '.card-why:nth-child(2) .why-icon',
      hue: 35, build: function (ctx, w, h, t) {
        var cx = w / 2, cy = h / 2, size = 42;
        var topY = cy - size * 0.56, botY = cy + size * 0.50;
        var halfW = size * 0.55;
        // 三角边框
        ctx.strokeStyle = 'hsla(35, 90%, 55%, 0.7)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, topY); ctx.lineTo(cx - halfW, botY); ctx.lineTo(cx + halfW, botY); ctx.closePath();
        ctx.stroke();
        // 内部填充
        ctx.fillStyle = 'hsla(35, 55%, 58%, 0.15)';
        ctx.beginPath();
        ctx.moveTo(cx, topY); ctx.lineTo(cx - halfW, botY); ctx.lineTo(cx + halfW, botY); ctx.closePath();
        ctx.fill();
        // 感叹号竖线
        ctx.fillStyle = 'hsla(35, 85%, 55%, 0.7)';
        ctx.fillRect(cx - 3, cy - 10, 6, 20);
        // 感叹号圆点
        ctx.beginPath(); ctx.arc(cx, cy + 18, 5, 0, Math.PI * 2); ctx.fill();
      }
    },
    {
      // 🎯 靶心 — 蓝紫色系
      selector: '.card-why:nth-child(3) .why-icon',
      hue: 260, build: function (ctx, w, h, t) {
        var cx = w / 2, cy = h / 2;
        // 三层外圈
        for (var layer = 0; layer < 3; layer++) {
          var r = 52 + (layer - 1) * 4;
          ctx.strokeStyle = 'hsla(260, 88%, ' + (55 + layer * 3) + '%, 0.65)';
          ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // 中圈
        for (var layer = 0; layer < 3; layer++) {
          var r = 34 + (layer - 1) * 3;
          ctx.strokeStyle = 'hsla(260, 88%, ' + (52 + layer * 3) + '%, 0.6)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
        }
        // 内圈
        ctx.strokeStyle = 'hsla(260, 80%, 58%, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, 16, 0, Math.PI * 2); ctx.stroke();
        // 中心点
        ctx.fillStyle = 'hsla(260, 70%, 68%, 0.65)';
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();
      }
    }
  ];

  // ── 浮动粒子（叠加在图标上）──
  function drawParticles(ctx, w, h, hue, t) {
    var count = 18;
    for (var i = 0; i < count; i++) {
      var seed = i * 137.5;
      var px = w * 0.2 + (w * 0.6) * ((Math.sin(t * 0.3 + seed) + 1) / 2);
      var py = h * 0.2 + (h * 0.6) * ((Math.cos(t * 0.4 + seed) + 1) / 2);
      var r = 1.2 + 2.5 * ((Math.sin(t * 0.6 + seed * 2) + 1) / 2);
      var alpha = 0.2 + 0.35 * ((Math.sin(t * 0.5 + seed * 3) + 1) / 2);
      var grad = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
      grad.addColorStop(0, 'hsla(' + hue + ', 80%, 70%, ' + alpha + ')');
      grad.addColorStop(0.5, 'hsla(' + hue + ', 70%, 60%, ' + (alpha * 0.3) + ')');
      grad.addColorStop(1, 'hsla(' + hue + ', 60%, 50%, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(px, py, r * 4, 0, Math.PI * 2); ctx.fill();
      // 核心
      ctx.fillStyle = 'hsla(' + hue + ', 50%, 85%, ' + (alpha * 0.8) + ')';
      ctx.beginPath(); ctx.arc(px, py, r * 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // ── 初始化 ──
  var animating = [];
  var observer;

  icons.forEach(function (icon) {
    var container = document.querySelector(icon.selector);
    if (!container) return;
    container.innerHTML = '';

    var size = 120;
    var canvas = document.createElement('canvas');
    canvas.width = size * 2;
    canvas.height = size * 2;
    canvas.style.cssText = 'width:120px;height:120px;display:block;';
    container.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var running = true;
    var animId;

    function render() {
      if (!running) return;
      animId = requestAnimationFrame(render);
      var t = performance.now() * 0.001;
      ctx.clearRect(0, 0, size * 2, size * 2);
      // 微浮动
      ctx.save();
      ctx.translate(
        Math.sin(t * 0.28) * 3,
        Math.cos(t * 0.31) * 2
      );
      icon.build(ctx, size * 2, size * 2, t);
      ctx.restore();
      drawParticles(ctx, size * 2, size * 2, icon.hue, t);
    }

    var entry = { canvas: canvas, start: function () { if (!running) { running = true; render(); } }, stop: function () { running = false; if (animId) { cancelAnimationFrame(animId); animId = null; } } };

    if (!prefersReduced) {
      // 使用 IntersectionObserver 仅动画可见图标
      if ('IntersectionObserver' in window) {
        observer = observer || new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var item = animating.find(function (a) { return a.canvas === e.target; });
            if (!item) return;
            if (e.isIntersecting) item.start();
            else item.stop();
          });
        }, { rootMargin: '100px' });
        observer.observe(canvas);
      }
      entry.start();
    } else {
      // reduced motion: 静态渲染一帧
      ctx.clearRect(0, 0, size * 2, size * 2);
      icon.build(ctx, size * 2, size * 2, 0);
      drawParticles(ctx, size * 2, size * 2, icon.hue, 0);
    }

    animating.push(entry);
  });
})();
