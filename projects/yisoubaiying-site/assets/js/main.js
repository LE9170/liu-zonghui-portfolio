const CONTACT_LABELS = {
  consult: "咨询",
  call: "电话",
  close: "关闭",
  title: "联系一搜百应",
  summary: "欢迎留下您的需求，我们会尽快与您联系。",
  action: "前往联系页面",
  success: "已收到您的需求。这是静态演示页面，当前不会向后端发送真实数据。"
};

document.addEventListener("alpine:init", () => {
  Alpine.data("siteApp", () => ({ menu: false, contact: false }));

  Alpine.data("filterableList", () => ({ filter: "all" }));

  Alpine.data("contactForm", () => ({
    sent: false,
    message: CONTACT_LABELS.success,
    submit() {
      this.sent = true;
    }
  }));
});

document.addEventListener("DOMContentLoaded", () => {
  mountCommunicationTools();
  mountFaqAnswers();
  mountRevealOnScroll();
  mountBackToTop();
});

/* Scroll-triggered reveal with Intersection Observer */
function mountRevealOnScroll() {
  const revealEls = document.querySelectorAll('.reveal, .reveal-up, .reveal-left, .reveal-right, .reveal-scale');
  if (!revealEls.length) return;

  /* Immediately show elements already in viewport (e.g. above the fold) */
  const nowVisible = new Set();
  revealEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      el.classList.add('visible');
      nowVisible.add(el);
    }
  });

  /* Lazy-reveal the rest on scroll */
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !nowVisible.has(entry.target)) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });

  revealEls.forEach(el => {
    if (!nowVisible.has(el)) observer.observe(el);
  });
}

/* Back-to-top button */
function mountBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function mountCommunicationTools() {
  if (document.querySelector(".tools")) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = `
    <aside class="tools" aria-label="浮动咨询工具">
      <button type="button" data-open-contact aria-label="${CONTACT_LABELS.consult}">${CONTACT_LABELS.consult}</button>
      <a href="javascript:void(0)" aria-label="${CONTACT_LABELS.call}">${CONTACT_LABELS.call}</a>
    </aside>
    <div class="modal" data-contact-modal hidden>
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="contact-dialog-title">
        <button type="button" class="btn-secondary" data-close-contact aria-label="${CONTACT_LABELS.close}" style="width:100%;">${CONTACT_LABELS.close}</button>
        <h2 id="contact-dialog-title">${CONTACT_LABELS.title}</h2>
        <p>${CONTACT_LABELS.summary}</p>
        <p class="meta">电话：请通过联系页面获取<br />微信：请通过联系页面获取<br />邮箱：请通过联系页面获取</p>
        <a class="btn btn-primary" data-contact-link style="width:100%;">${CONTACT_LABELS.action}</a>
      </section>
    </div>
  `;

  const demoPath = location.pathname.split("/yisoubaiying-site/")[1] || "index.html";
  const depth = demoPath.split("/").filter(Boolean).length > 1 ? "../" : "";
  wrapper.querySelector("[data-contact-link]").href = `${depth}contact.html`;

  document.body.append(...wrapper.children);

  const modal = document.querySelector("[data-contact-modal]");
  const openButton = document.querySelector("[data-open-contact]");
  const closeButton = modal.querySelector("[data-close-contact]");

  openButton.addEventListener("click", () => {
    modal.hidden = false;
    closeButton.focus();
  });

  closeButton.addEventListener("click", () => {
    modal.hidden = true;
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) modal.hidden = true;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") modal.hidden = true;
  });
}

function mountFaqAnswers() {
  document.querySelectorAll("[data-direct-answer]").forEach((block) => {
    if (!block.querySelector(".meta")) return;
  });
}
