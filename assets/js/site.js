// Shared header and footer. Each page says which tab it is with <body data-active="...">.
(() => {
  const active = document.body.dataset.active;
  const tab = (href, label, id) => `<a href="${href}"${id === active ? ' class="active" aria-current="page"' : ''}>${label}</a>`;

  document.getElementById('site-header').outerHTML = `
    <header class="topbar">
      <div class="topbar-inner">
        <a class="brand" href="index.html"><img class="brand-mark" src="assets/img/logos/kling.png" alt="">Roy</a>
        <nav class="nav" id="site-nav">
          ${tab('index.html', 'Home', 'home')}
          ${tab('experience.html', 'Experience', 'experience')}
          ${tab('research.html', 'Research', 'research')}
          ${tab('blog.html', 'Blog', 'blog')}
          <a class="nav-cta" href="index.html#contact">
            <svg viewBox="0 0 16 16" fill="none" stroke-width="1.5" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5"/><path d="M2.5 4.5 8 9l5.5-4.5"/></svg>
            <span>Contact</span>
          </a>
        </nav>
        <button class="nav-toggle" type="button" aria-label="Menu" aria-expanded="false" aria-controls="site-nav"><span class="burger" aria-hidden="true"></span></button>
      </div>
    </header>`;

  document.getElementById('site-footer').outerHTML = `
    <footer class="foot">
      <div class="foot-inner">
        <div>
          <div class="foot-brand">Roy</div>
          <div class="foot-mail"><a href="mailto:544546495@qq.com">544546495@qq.com</a></div>
        </div>
        <div class="foot-meta">© ${new Date().getFullYear()}</div>
      </div>
    </footer>`;

  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  toggle.addEventListener('click', () => toggle.setAttribute('aria-expanded', nav.classList.toggle('open')));
})();

