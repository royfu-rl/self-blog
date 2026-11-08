// Blog taxonomy: category tabs, then a pill group for the category's topics.
// The filter ("all", "algorithm", "algorithm/agentic-rl") lives in the URL hash.
(() => {
  const rows = [...document.querySelectorAll('.blog-list .post-row')];
  const buttons = [...document.querySelectorAll('.blog-tabs button, .blog-subs button')];
  const groups = document.querySelectorAll('.blog-subs');

  function show(f) {
    if (!buttons.some(b => b.dataset.f === f)) f = 'all';
    const cat = f.split('/')[0];
    rows.forEach(r => { r.hidden = !(f === 'all' || r.dataset.f === f || r.dataset.f.startsWith(f + '/')); r.classList.remove('first'); });
    rows.find(r => !r.hidden)?.classList.add('first');
    buttons.forEach(b => {
      const on = b.dataset.f === (b.closest('.blog-tabs') ? cat : f);
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
    });
    groups.forEach(g => { g.hidden = g.dataset.for !== cat; });
    history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f);
  }

  buttons.forEach(b => b.addEventListener('click', () => show(b.dataset.f)));
  // the tag next to each post's date filters by that topic
  document.querySelectorAll('.post-row .tag').forEach(t => t.addEventListener('click', () => {
    show(t.dataset.f);
    document.querySelector('.blog-tabs').scrollIntoView({behavior: 'smooth', block: 'start'});
  }));
  show(decodeURIComponent(location.hash.slice(1)) || 'all');
})();

