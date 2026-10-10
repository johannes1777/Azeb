(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const card = $('card');
  const yes = $('yes');
  const no = $('no');
  const noSlot = $('noSlot');
  const ask = $('ask');
  const question = $('question');
  const knew = $('knew');
  const message = $('message');
  const layer = $('hearts');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HEARTS = ['❤️', '💖', '💕', '💗', '💘', '🩷'];
  const rand = (min, max) => Math.random() * (max - min) + min;
  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  /* =====================================================
     THE "NO" BUTTON THAT RUNS AWAY
     ===================================================== */
  const MARGIN = 14;       // keep the button this far from the screen edges
  let flying = false;      // has the button left its spot in the card yet?
  let pos = { x: 0, y: 0 };
  let lastDodge = 0;
  let answered = false;

  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  };

  const overlaps = (a, b, pad) =>
    !(a.x + a.w + pad <= b.x || b.x + b.w + pad <= a.x ||
      a.y + a.h + pad <= b.y || b.y + b.h + pad <= a.y);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  function viewportSize() {
    return {
      w: document.documentElement.clientWidth || window.innerWidth,
      h: window.innerHeight
    };
  }

  function moveNo(x, y) {
    pos = { x, y };
    no.style.transform = `translate(${x}px, ${y}px)`;
  }

  function dodge() {
    if (answered) return;

    // ignore the duplicate events one touch creates (pointer + touch + mouse)
    const now = performance.now();
    if (now - lastDodge < 150) return;
    lastDodge = now;

    // First time: lift the button out of the card without any visible jump
    if (!flying) {
      const r = no.getBoundingClientRect();
      noSlot.style.width = r.width + 'px';     // keep a gap so "Yes" doesn't shift
      noSlot.style.height = r.height + 'px';
      document.body.appendChild(no);           // fixed to the screen, never to the card
      no.classList.add('fly');
      moveNo(r.left, r.top);
      void no.offsetWidth;                     // commit position, then enable animation
      no.classList.add('moving');
      flying = true;
    }

    const vp = viewportSize();
    const w = no.offsetWidth;
    const h = no.offsetHeight;
    const minX = MARGIN;
    const minY = MARGIN;
    const maxX = Math.max(minX, vp.w - w - MARGIN);
    const maxY = Math.max(minY, vp.h - h - MARGIN);

    // places the button must stay away from: the Yes button and the question
    const avoid = [rectOf(yes), rectOf(question)];
    const farEnough = Math.min(vp.w, vp.h) * 0.35;

    let best = null;
    let bestDist = -1;
    for (let i = 0; i < 60; i++) {
      const x = rand(minX, maxX);
      const y = rand(minY, maxY);
      const box = { x, y, w, h };
      if (avoid.some((a) => overlaps(box, a, 12))) continue;
      const d = Math.hypot(x - pos.x, y - pos.y);
      if (d > bestDist) { best = { x, y }; bestDist = d; }
      if (d >= farEnough) break;
    }

    // fallback: jump to whichever screen corner is farthest away
    if (!best) {
      const corners = [
        { x: minX, y: minY }, { x: maxX, y: minY },
        { x: minX, y: maxY }, { x: maxX, y: maxY }
      ];
      best = corners.reduce((a, b) =>
        Math.hypot(b.x - pos.x, b.y - pos.y) > Math.hypot(a.x - pos.x, a.y - pos.y) ? b : a);
    }

    moveNo(best.x, best.y);
  }

  // Mouse, touch, pen and keyboard: every way of reaching for the button makes it run.
  // touchstart/pointerdown are handled BEFORE a tap can become a click.
  const stop = (e) => { if (e.cancelable) e.preventDefault(); e.stopPropagation(); };
  ['pointerenter', 'pointerover', 'pointerdown', 'mouseenter', 'mousedown'].forEach((type) =>
    no.addEventListener(type, (e) => { stop(e); dodge(); })
  );
  no.addEventListener('touchstart', (e) => { stop(e); dodge(); }, { passive: false });
  no.addEventListener('touchmove', (e) => { stop(e); dodge(); }, { passive: false });
  no.addEventListener('focus', () => { dodge(); no.blur(); });
  no.addEventListener('click', (e) => { stop(e); dodge(); });
  no.addEventListener('contextmenu', (e) => e.preventDefault());

  // Mouse users: also run when the cursor gets close, not only when touching
  document.addEventListener('pointermove', (e) => {
    if (answered || !flying || e.pointerType !== 'mouse') return;
    const r = rectOf(no);
    const pad = 40;
    if (e.clientX > r.x - pad && e.clientX < r.x + r.w + pad &&
        e.clientY > r.y - pad && e.clientY < r.y + r.h + pad) dodge();
  });

  // Keep the button on screen after rotating the phone / resizing
  function keepOnScreen() {
    if (!flying || answered) return;
    const vp = viewportSize();
    const x = clamp(pos.x, MARGIN, Math.max(MARGIN, vp.w - no.offsetWidth - MARGIN));
    const y = clamp(pos.y, MARGIN, Math.max(MARGIN, vp.h - no.offsetHeight - MARGIN));
    if (x !== pos.x || y !== pos.y) moveNo(x, y);
  }
  window.addEventListener('resize', keepOnScreen);
  window.addEventListener('orientationchange', () => setTimeout(keepOnScreen, 300));

  /* =====================================================
     HEARTS
     ===================================================== */
  let live = 0;
  const MAX_HEARTS = 45;

  function makeHeart(cls, size) {
    const el = document.createElement('span');
    el.className = 'heart ' + cls;
    el.textContent = pick(HEARTS);
    el.style.fontSize = size + 'px';
    el.style.setProperty('--rot', rand(-45, 45) + 'deg');
    layer.appendChild(el);
    live++;
    el.addEventListener('animationend', () => { el.remove(); live--; });
    return el;
  }

  function spawnFloating() {
    if (live >= MAX_HEARTS || document.hidden) return;
    const el = makeHeart('float', rand(18, 44));
    el.style.left = rand(1, 94) + 'vw';
    el.style.setProperty('--dx', rand(-70, 70) + 'px');
    el.style.animationDuration = rand(5.5, 9.5) + 's';
  }

  function burstAt(x, y, count) {
    for (let i = 0; i < count; i++) {
      if (live >= MAX_HEARTS + 30) break;
      const el = makeHeart('burst', rand(18, 38));
      const angle = rand(0, Math.PI * 2);
      const dist = rand(70, Math.min(260, Math.max(120, viewportSize().w * 0.5)));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.setProperty('--bx', Math.cos(angle) * dist + 'px');
      el.style.setProperty('--by', Math.sin(angle) * dist - 40 + 'px');
      el.style.animationDelay = rand(0, 0.15) + 's';
    }
  }

  /* =====================================================
     THE "YES" BUTTON -> THE SURPRISE
     ===================================================== */
  function sayYes() {
    if (answered) return;
    answered = true;

    const r = yes.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    yes.disabled = true;
    no.classList.add('gone');
    if (!reduceMotion) burstAt(cx, cy, 22);

    setTimeout(() => {
      ask.hidden = true;
      question.hidden = true;
      knew.hidden = false;
      message.hidden = false;
      card.classList.add('is-happy');
      const page = document.querySelector('.page');
      if (page) page.scrollTop = 0;

      if (!reduceMotion) {
        const c = viewportSize();
        burstAt(c.w * 0.25, c.h * 0.55, 14);
        burstAt(c.w * 0.75, c.h * 0.55, 14);
        setInterval(spawnFloating, 380);   // keep gentle hearts floating up
        for (let i = 0; i < 10; i++) setTimeout(spawnFloating, i * 120);
      }
    }, 550);
  }

  yes.addEventListener('click', sayYes);
})();
