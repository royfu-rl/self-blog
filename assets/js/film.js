// Home page film: the Experience chapters on a timer, looping.
(() => {
  const film = document.querySelector('.film');
  const items = [...film.querySelectorAll('li')];
  const where = film.querySelector('.film-where');
  const title = film.querySelector('.film-title');

  const show = k => {
    const item = items[k % items.length];
    where.textContent = item.dataset.where;
    title.textContent = item.dataset.title;
    film.style.setProperty('--c', item.style.getPropertyValue('--c'));
    items.forEach(li => li.classList.toggle('on', li === item));
  };
  show(0);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const HOLD = 4.2, MORPH = 1.6, SHOT = HOLD + MORPH;
  const start = performance.now();
  const progress = () => {
    const t = (performance.now() - start) / 1000 % (items.length * SHOT);
    const k = Math.floor(t / SHOT), local = t - k * SHOT;
    film.style.setProperty('--played', t / (items.length * SHOT));
    return local < HOLD ? k : k + .38 + .54 * (local - HOLD) / MORPH;
  };

  const fit = (w, h) => w > 640 ? [.44, .03, Math.min(.8, w / h * .38)] : [.2, -.1, Math.min(.6, w / h * .42)];
  startSwarm({ canvas: film.querySelector('canvas'), box: film, order: [1, 2, 3, 4, 5, 1], fit, progress, onActive: show });
})();

