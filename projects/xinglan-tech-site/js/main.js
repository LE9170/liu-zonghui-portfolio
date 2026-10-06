/* ============================================================
   星澜科技 XINGLAN TECH —— 全站交互脚本（零依赖原生 JS）
   01 头部滚动阴影   02 移动端菜单   03 滚动渐入
   04 数字滚动       05 案例轮播     06 产品筛选
   07 FAQ 手风琴     08 表单拦截     09 页脚年份
   所有功能均为渐进增强：JS 失效时内容完整可读。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 01 头部滚动阴影 ---------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var onScroll = function () {
      header.classList.toggle('scrolled', window.scrollY > 8);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- 02 移动端菜单 ---------- */
  var navToggle = document.getElementById('navToggle');
  var mainNav = document.getElementById('mainNav');
  if (navToggle && mainNav) {
    navToggle.addEventListener('click', function () {
      var open = mainNav.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- 03 滚动渐入 ---------- */
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  /* ---------- 04 数字滚动 ---------- */
  var counters = document.querySelectorAll('[data-count]');
  var animateCount = function (el) {
    var target = parseFloat(el.getAttribute('data-count'));
    var decimals = (el.getAttribute('data-count').split('.')[1] || '').length;
    var duration = 1600;
    var start = null;
    var step = function (ts) {
      if (!start) start = ts;
      var p = Math.min((ts - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.firstChild.nodeValue = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (counters.length && 'IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          cio.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---------- 05 案例轮播 ---------- */
  var carousel = document.querySelector('[data-carousel]');
  if (carousel) {
    var track = carousel.querySelector('.carousel-track');
    var slides = carousel.querySelectorAll('.carousel-slide');
    var dotsBox = carousel.querySelector('.carousel-dots');
    var prevBtn = carousel.querySelector('[data-carousel-prev]');
    var nextBtn = carousel.querySelector('[data-carousel-next]');
    var index = 0;
    var timer = null;

    for (var i = 0; i < slides.length; i++) {
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', '第 ' + (i + 1) + ' 张');
      (function (n) {
        dot.addEventListener('click', function () { go(n); restart(); });
      })(i);
      dotsBox.appendChild(dot);
    }
    var dots = dotsBox.querySelectorAll('button');

    var go = function (n) {
      index = (n + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + index * 100 + '%)';
      dots.forEach(function (d, k) { d.classList.toggle('active', k === index); });
    };
    var restart = function () {
      clearInterval(timer);
      timer = setInterval(function () { go(index + 1); }, 5000);
    };
    prevBtn.addEventListener('click', function () { go(index - 1); restart(); });
    nextBtn.addEventListener('click', function () { go(index + 1); restart(); });
    carousel.addEventListener('mouseenter', function () { clearInterval(timer); });
    carousel.addEventListener('mouseleave', restart);
    go(0);
    restart();
  }

  /* ---------- 06 产品筛选 ---------- */
  var filterTabs = document.querySelector('[data-filter-tabs]');
  if (filterTabs) {
    var tabs = filterTabs.querySelectorAll('button');
    var items = document.querySelectorAll('[data-category]');
    filterTabs.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      tabs.forEach(function (t) { t.classList.toggle('active', t === btn); });
      var cat = btn.getAttribute('data-filter');
      items.forEach(function (item) {
        var show = cat === 'all' || item.getAttribute('data-category') === cat;
        item.style.display = show ? '' : 'none';
      });
    });
  }

  /* ---------- 07 FAQ 手风琴 ---------- */
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function () {
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        other.classList.remove('open');
        other.querySelector('.faq-a').style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add('open');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- 08 表单拦截（演示模板，无后端） ---------- */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var tip = document.getElementById('formTip');
      if (tip) {
        tip.classList.add('show');
        tip.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
      form.reset();
    });
  }

  /* ---------- 09 页脚年份 ---------- */
  document.querySelectorAll('[data-year]').forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- 10 返回顶部（自动注入） ---------- */
  var backTop = document.createElement('button');
  backTop.type = 'button';
  backTop.className = 'back-top';
  backTop.setAttribute('aria-label', '返回顶部');
  backTop.textContent = '↑';
  document.body.appendChild(backTop);
  var onScrollV2 = function () {
    backTop.classList.toggle('show', window.scrollY > 600);
  };
  window.addEventListener('scroll', onScrollV2, { passive: true });
  onScrollV2();
  backTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  /* ---------- 11 跑马灯内容复制（无缝 -50% 循环） ---------- */
  document.querySelectorAll('.marquee-track').forEach(function (t) {
    t.innerHTML += t.innerHTML;
  });

  /* ---------- 12 指针增强（仅鼠标设备且未要求减弱动效） ---------- */
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var noMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (finePointer && !noMotion) {
    /* 12a 卡片聚光灯：把指针坐标写入 CSS 变量 */
    document.addEventListener('mousemove', function (e) {
      var card = e.target.closest ? e.target.closest('.card') : null;
      if (!card) return;
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });

    /* 12c 3D 倾斜 [data-tilt] */
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      var MAX = 7;
      el.addEventListener('mouseenter', function () { el.style.transition = 'transform .12s ease-out'; });
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'perspective(900px) rotateX(' + (-py * MAX).toFixed(2) + 'deg) rotateY(' + (px * MAX).toFixed(2) + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .5s cubic-bezier(.22,.8,.3,1)';
        el.style.transform = '';
        setTimeout(function () { el.style.transition = ''; }, 500);
      });
    });

    /* 12d Hero 光标光晕（跟随且带拖尾） */
    var hero = document.querySelector('.hero');
    if (hero) {
      var glow = document.createElement('div');
      glow.className = 'hero-glow';
      glow.setAttribute('aria-hidden', 'true');
      hero.appendChild(glow);
      hero.addEventListener('mousemove', function (e) {
        var r = hero.getBoundingClientRect();
        glow.style.transform = 'translate(' + (e.clientX - r.left - 310) + 'px,' + (e.clientY - r.top - 310) + 'px)';
      });
    }
  }
  /* ---------- 13 竖排选项卡（解决方案页） ---------- */
  document.querySelectorAll('[data-vtabs]').forEach(function (tabs) {
    var navBtns = tabs.querySelectorAll('.v-tabs-nav button');
    var panels = tabs.querySelectorAll('.v-tab-panel');
    navBtns.forEach(function (btn, i) {
      btn.setAttribute('aria-selected', btn.classList.contains('active') ? 'true' : 'false');
      btn.addEventListener('click', function () {
        navBtns.forEach(function (b, k) {
          b.classList.toggle('active', k === i);
          b.setAttribute('aria-selected', k === i ? 'true' : 'false');
        });
        panels.forEach(function (p, k) { p.classList.toggle('active', k === i); });
      });
    });
  });

  /* ---------- 14 圆点章节导航（带 data-spy 的页面自动生成） ---------- */
  var spySections = document.querySelectorAll('[data-spy]');
  if (spySections.length >= 2) {
    var dotNav = document.createElement('nav');
    dotNav.className = 'dot-nav';
    dotNav.setAttribute('aria-label', '章节导航');
    spySections.forEach(function (sec, i) {
      if (!sec.id) sec.id = 'spy-' + i;
      var a = document.createElement('a');
      a.href = '#' + sec.id;
      a.setAttribute('aria-label', sec.getAttribute('data-spy'));
      var label = document.createElement('span');
      label.className = 'dot-label';
      label.textContent = sec.getAttribute('data-spy');
      a.appendChild(label);
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var y = sec.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top: y, behavior: 'smooth' });
      });
      dotNav.appendChild(a);
    });
    document.body.appendChild(dotNav);
    var dotLinks = dotNav.querySelectorAll('a');
    var spyUpdate = function () {
      var pos = window.scrollY + window.innerHeight * 0.35;
      var cur = 0;
      spySections.forEach(function (sec, i) {
        if (sec.offsetTop <= pos) cur = i;
      });
      dotLinks.forEach(function (a, i) { a.classList.toggle('active', i === cur); });
    };
    window.addEventListener('scroll', spyUpdate, { passive: true });
    spyUpdate();
  }
})();
