// Experience page: scroll position picks the chapter.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;   // the CSS default stacks the chapters

  const section = document.getElementById('experience');
  const stage = section.querySelector('.stage');
  const chapters = [...section.querySelectorAll('.chapter')];
  const railLinks = [...section.querySelectorAll('.rail a')];

  const target = () => {
    const done = -section.getBoundingClientRect().top / (section.offsetHeight - stage.clientHeight);
    return Math.min(1, Math.max(0, done)) * (chapters.length - 1);
  };
  let shown = target();
  const progress = () => {
    const goal = target();
    shown += (goal - shown) * .09;
    if (Math.abs(goal - shown) < .0005) shown = goal;
    return shown;
  };

  const setActive = k => {
    chapters.forEach((c, i) => c.classList.toggle('on', i === k));
    railLinks.forEach((a, i) => a.classList.toggle('on', i === k - 1));
    stage.style.setProperty('--c', chapters[k].style.getPropertyValue('--c'));
  };

  // Keep the swarm clear of the copy: right side on wide screens, top half on narrow ones
  const fit = (w, h) => w > 860 ? [.36, .02, Math.min(.78, w / h * .45)] : [0, .5, Math.min(.38, w / h * .85)];

  section.classList.add('live');
  const started = startSwarm({ canvas: section.querySelector('canvas'), box: stage, order: [0, 1, 2, 3, 4, 5], fit, progress, onActive: setActive });
  if (started) setActive(0);
  else section.classList.remove('live');
})();

