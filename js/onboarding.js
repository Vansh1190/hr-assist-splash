/* ============================================================================
   onboarding.js — HR Assist splash / onboarding experience
   ----------------------------------------------------------------------------
   Built against Figma "MSIL Enhancement Track" › HR Assist ›
   "Splash -- Introduction screens (Current)" (node 7236:571), stages 01–04.
   Every duration, position and easing below comes from the design + captions.

   Public API
     mountOnboarding(el, { onDone, autoplay })  ->  { replay, destroy }

   Stage machine
     boot → bloom(01.1) → logo(01.2) → carousel(01.3) → card(02.1/02.2)
          → story(03.1-03.4) → hold(04.1) → engine(04.3) → launch(04.4) → done
   ========================================================================== */

const CANVAS = { w: 440, h: 996 };
const CENTER = { x: 220, y: 352 };          // the logo the cards spread out of
const u = (n) => `calc(${n} * var(--u))`;

/* ---- copy (verbatim from the design) ---------------------------------- */
const TAGLINE = 'Pride of India';
const INTRO_TITLE = 'Meet the new HR Assist';
const INTRO_BODY = 'Leave, attendance, gatepasses and more, all in one simple app';
const LAUNCH_TITLE = 'Start your engine';
const LAUNCH_BODY = 'Leave, attendance, gatepasses and more, all in one simple app';

/* ---- 01.3 carousel: rows, positions and the 9° tilt from the canvas ----
   dir  = row drift direction (top and bottom drift in opposite directions)
   hero = the 800 card, the one that opens into the app                   */
const CARDS = [
  { row: 0, dir: 'left',  img: 'plant',    x: -211, y: 245, w: 205, h: 147 },
  { row: 0, dir: 'left',  img: 'jimny',    x: -9,   y: 212, w: 205, h: 147 },
  { row: 0, dir: 'left',  img: 'trees',    x: 193,  y: 179, w: 205, h: 147 },
  { row: 0, dir: 'left',  img: 'night',    x: 395,  y: 149, w: 193, h: 145 },
  { row: 1, dir: 'none',  img: 'qc',       x: -224, y: 383, w: 176, h: 142 },
  { row: 1, dir: 'none',  img: 'gypsy',    x: -51,  y: 355, w: 176, h: 142 },
  { row: 1, dir: 'none',  img: 'line800',  x: 121,  y: 317, w: 197, h: 159, hero: true },
  { row: 1, dir: 'none',  img: 'showroom', x: 314,  y: 296, w: 176, h: 142 },
  { row: 1, dir: 'none',  img: 'qc',       x: 487,  y: 268, w: 176, h: 142 },
  { row: 2, dir: 'right', img: 'invicto',  x: -150, y: 556, w: 205, h: 147, dim: true },
  { row: 2, dir: 'right', img: 'jimny',    x: 66,   y: 532, w: 205, h: 147, dim: true },
  { row: 2, dir: 'right', img: 'trees',    x: 274,  y: 510, w: 205, h: 147, dim: true },
  { row: 2, dir: 'right', img: 'night',    x: 470,  y: 492, w: 193, h: 145, dim: true },
];

/* ---- 03.x cockpit onboarding ------------------------------------------
   py: vertical anchor that keeps the car "just above the dash", derived from
   the design rects (line800 -324, showroom -264, qc -276, gypsy -312).     */
const STORIES = [
  { img: 'line800',  py: -22.7, title: 'Where it all began',      body: 'Four decades of cars, and the people who make them' },
  { img: 'showroom', py: -16.7, title: 'Made for every family',   body: "Every car we make ends up in someone's story" },
  { img: 'qc',       py: -17.9, title: 'Every detail, checked',   body: 'The same care goes into looking after our people' },
  { img: 'gypsy',    py: -21.5, title: 'Built for every terrain', body: 'Wherever work takes you, HR Assist comes along' },
];

/* ---- timings (ms) — straight from the motion captions ------------------ */
const T = {
  bloom: 650,          // 01.1 light blooms, then opens up to white
  logo: 1250,          // 01.2 logo settles in from 114%, tagline swept in by light
  carousel: 1550,      // 01.3 cards spread out of the logo
  carouselHold: 1650,  // "after a 1.6s hold the card opens by itself"
  card: 1300,          // 02.1 straightens 9° → 0°, corners 20 → 0
  cockpitLead: 450,    // 02.2 cockpit starts 0.45s before the open ends
  storyHold: 2200,     // 03.x each photo holds 2.2s
  storyFade: 900,      // 0.9s cross-fade
  copySwap: 220,       // 10px rise on the copy swap
  hold: 1200,          // 04.2 the white line runs round over 1.2s
  drain: 550,          // let go early → drains over 0.55s
  engine: 800,         // 04.3 the engine catches
  launch: 1000,        // 04.4 orb of light fills the screen
};

const IMG = (n) => `assets/${n}.${n === 'logo' || n === 'cockpit' ? 'webp' : 'jpg'}`;

const node = (tag, cls, attrs = {}) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, String(v)));
  return n;
};

export function mountOnboarding(root, options = {}) {
  const opts = { onDone: () => {}, autoplay: true, ...options };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ms = (v) => Math.round(reduced ? v * 0.3 : v);

  const timers = new Set();
  const core = new Set();   // writes the UI depends on — survives sequence resets
  let raf = 0;
  let dead = false;

  const schedule = (set, fn, delay) => {
    const id = setTimeout(() => { set.delete(id); if (!dead) fn(); }, ms(delay));
    set.add(id);
    return id;
  };
  const later = (fn, delay) => schedule(timers, fn, delay);
  const laterCore = (fn, delay) => schedule(core, fn, delay);
  const stopTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
  const stopAll = () => { stopTimers(); core.forEach(clearTimeout); core.clear(); };
  const stopRaf = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };

  /* =========================================================== markup === */
  root.dataset.stage = 'boot';
  root.dataset.tone = 'light';
  root.innerHTML = '';

  const layers = node('div', 'qnx-layers');

  /* 01.1 ---------------------------------------------------------------- */
  const bloom = node('div', 'qnx-layer qnx-bloom');
  bloom.append(node('div', 'qnx-bloom__core'));

  /* 01.2 ---------------------------------------------------------------- */
  const logoStage = node('div', 'qnx-layer qnx-logo-stage');
  const tagline = node('p', 'qnx-tagline');
  tagline.textContent = TAGLINE;
  logoStage.append(node('div', 'qnx-logo'), tagline);

  /* 01.3 / 02.1 --------------------------------------------------------- */
  const carousel = node('div', 'qnx-layer qnx-carousel');
  const wash = node('div', 'qnx-carousel__wash');
  const rows = [0, 1, 2].map((i) => {
    const r = node('div', 'qnx-row');
    r.dataset.dir = CARDS.find((c) => c.row === i)?.dir ?? 'none';
    return r;
  });
  const cards = CARDS.map((c) => {
    const el = node('div', `qnx-card${c.hero ? ' qnx-card--hero' : ''}`);
    el.style.cssText =
      `--x:${u(c.x)};--y:${u(c.y)};--w:${u(c.w)};--h:${u(c.h)};` +
      `--fx:${u(CENTER.x - (c.x + c.w / 2))};--fy:${u(CENTER.y - (c.y + c.h / 2))};` +
      `background-image:url("${IMG(c.img)}");` +
      `transition-delay:${Math.round(Math.min(620, c.row * 80 + (c.x + 250) * 0.45))}ms`;
    if (c.dim) el.dataset.fade = '1';
    rows[c.row].append(el);
    return el;
  });
  const fade = node('div', 'qnx-carousel__fade');
  const introCopy = node('div', 'qnx-copy qnx-copy--light');
  introCopy.innerHTML =
    `<h1 class="qnx-copy__title">${INTRO_TITLE}</h1><p class="qnx-copy__body">${INTRO_BODY}</p>`;
  carousel.append(wash, ...rows, fade, introCopy);

  /* 02.2 / 03.x --------------------------------------------------------- */
  const storyLayer = node('div', 'qnx-layer qnx-story');
  const photos = STORIES.map((s) => {
    const p = node('div', 'qnx-photo');
    p.style.cssText = `background-image:url("${IMG(s.img)}");--py-landed:${s.py}%`;
    storyLayer.append(p);
    return p;
  });
  const cockpitLayer = node('div', 'qnx-cockpit');
  storyLayer.append(node('div', 'qnx-shade'), cockpitLayer, node('div', 'qnx-void'));

  const storyCopy = node('div', 'qnx-copy qnx-copy--story');
  storyCopy.innerHTML = '<h2 class="qnx-copy__title"></h2><p class="qnx-copy__body"></p>';

  /* 04.x start dial ----------------------------------------------------- */
  const dialWrap = node('div', 'qnx-dialwrap');
  const dial = node('button', 'qnx-dial', {
    type: 'button', 'data-tag': 'splash_start', role: 'button',
    'aria-label': 'Hold to start', 'aria-valuetext': '0%',
  });
  dial.innerHTML = [
    '<span class="qnx-dial__pool"></span>',
    '<span class="qnx-dial__dashlight"></span>',
    '<span class="qnx-dial__ring qnx-dial__ring--soft"></span>',
    '<span class="qnx-dial__ring qnx-dial__ring--line"></span>',
    '<svg class="qnx-dial__progress" viewBox="0 0 138 138" aria-hidden="true"><circle cx="69" cy="69" r="66"/></svg>',
    '<span class="qnx-dial__glass">',
    '  <span class="qnx-dial__innerlight"></span><span class="qnx-dial__spec"></span>',
    '</span>',
    '<span class="qnx-dial__label" data-tag="splash_dial_label">START</span>',
    '<svg class="qnx-dial__power" viewBox="0 0 24 24" aria-hidden="true">',
    '  <path d="M12 3.2v8.4"/><path d="M6.7 7a7.5 7.5 0 1 0 10.6 0"/></svg>',
    '<span class="qnx-dial__flash"></span>',
    '<span class="qnx-dialhint" data-tag="splash_dial_hint">Hold to start</span>',
  ].join('');
  dialWrap.append(dial);

  /* 04.4 ---------------------------------------------------------------- */
  const orb = node('div', 'qnx-orb');

  /* chrome -------------------------------------------------------------- */
  const skip = node('button', 'qnx-btn qnx-btn--skip', { type: 'button', 'data-tag': 'splash_skip' });
  skip.textContent = 'Skip intro';
  const replay = node('button', 'qnx-btn qnx-btn--replay', { type: 'button', 'data-tag': 'splash_replay' });
  replay.textContent = '↺ Replay';
  const chrome = node('div', 'qnx-chrome');
  chrome.append(skip, replay);

  const live = node('div', 'qnx-sr', { 'aria-live': 'polite', role: 'status' });

  layers.append(bloom, logoStage, carousel, storyLayer, storyCopy, dialWrap, orb);
  root.append(layers, chrome, live);

  /* ======================================================== measurement == */
  const measure = () => {
    const w = root.getBoundingClientRect().width || CANVAS.w;
    root.style.setProperty('--u', `${(w / CANVAS.w).toFixed(4)}px`);
  };
  measure();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
  ro?.observe(root);
  window.addEventListener('resize', measure, { passive: true });

  /* ========================================================== staging === */
  let storyIndex = -1;
  let opened = false;

  const visible = (n, on) => n.setAttribute('data-visible', on ? '1' : '0');
  const currentStage = () => root.dataset.stage;

  const goStage = (name) => {
    root.dataset.stage = name;
    root.dataset.tone = ['bloom', 'logo', 'carousel'].includes(name) ? 'light' : 'dark';

    visible(bloom, true);                                   // bottom-most, always painted
    visible(logoStage, ['logo', 'carousel'].includes(name));
    visible(carousel, ['carousel', 'card'].includes(name));
    visible(storyLayer, ['story', 'hold', 'engine', 'launch'].includes(name));
    if (['story', 'hold', 'engine'].includes(name)) paintPhotos();
    if (name === 'hold' || name === 'engine') dialWrap.style.pointerEvents = 'auto';
    if (name === 'launch' || name === 'done') chrome.style.opacity = '0';
    if (name === 'done') layers.remove();
  };

  const paintPhotos = () =>
    photos.forEach((p, i) => p.setAttribute('data-active', i === storyIndex ? '1' : '0'));

  const setHint = (text) => {
    dial.querySelector('.qnx-dialhint').textContent = text;
    dial.setAttribute('aria-label', text);
  };

  const setStoryCopy = (title, body, instantly = false) => {
    const write = () => {
      storyCopy.querySelector('.qnx-copy__title').textContent = title;
      storyCopy.querySelector('.qnx-copy__body').textContent = body;
      storyCopy.classList.remove('swap');
      live.textContent = `${title}. ${body}`;
    };
    if (instantly) { storyCopy.classList.remove('swap'); write(); return; }
    storyCopy.classList.add('swap');
    laterCore(write, T.copySwap);
  };

  /* ============================================================= flow === */
  const start = () => {
    opened = false;
    storyIndex = -1;
    goStage('bloom');
    later(() => goStage('logo'), T.bloom);
    later(() => goStage('carousel'), T.bloom + T.logo);
    later(openTheCard, T.bloom + T.logo + T.carousel + T.carouselHold);
  };

  const openTheCard = () => {
    if (opened || ['story', 'hold', 'engine', 'launch', 'done'].includes(currentStage())) return;
    opened = true;
    stopTimers();
    goStage('card');
    rows.forEach((r) => { r.style.animation = 'none'; });
    later(enterCockpit, T.card - T.cockpitLead);
  };

  const enterCockpit = () => {
    storyIndex = 0;
    goStage('story');
    setStoryCopy(STORIES[0].title, STORIES[0].body, true);
    scheduleStory();
  };

  const scheduleStory = () => {
    if (storyIndex >= STORIES.length - 1) {
      later(toHold, T.storyHold + T.storyFade * 0.3);
    } else {
      later(nextStory, T.storyHold);
    }
  };

  const nextStory = () => {
    if (currentStage() !== 'story') return;
    stopTimers();
    storyIndex = Math.min(storyIndex + 1, STORIES.length - 1);
    paintPhotos();
    setStoryCopy(STORIES[storyIndex].title, STORIES[storyIndex].body);
    scheduleStory();
  };

  const toHold = () => {
    stopTimers();
    goStage('hold');
    setStoryCopy(LAUNCH_TITLE, LAUNCH_BODY);
    setHint('Hold to start');
  };

  /* ------------------------------------------------- hold to start (04) -- */
  let charge = 0;
  let holding = false;
  let draining = false;
  let fired = false;
  let prevTs = 0;

  const paintCharge = () => {
    const v = Math.max(0, Math.min(1, charge));
    dialWrap.style.setProperty('--p', String(v));
    dial.setAttribute('aria-valuetext', `${Math.round(v * 100)}%`);
  };

  const loop = (ts) => {
    if (dead) return;
    const dt = prevTs ? Math.min(64, ts - prevTs) : 16;
    prevTs = ts;
    if (holding) {
      charge = Math.min(1, charge + dt / ms(T.hold));
      if (charge >= 1) { ignite(); return; }
      paintCharge();
      raf = requestAnimationFrame(loop);
    } else if (draining) {
      charge = Math.max(0, charge - dt / ms(T.drain));
      paintCharge();
      if (charge > 0) raf = requestAnimationFrame(loop);
      else draining = false;
    }
  };

  const canHold = () => ['story', 'hold'].includes(currentStage());

  const beginHold = (e) => {
    if (fired || !canHold()) return;
    if (e?.cancelable) e.preventDefault();
    if (currentStage() === 'story') toHold();
    stopTimers();
    holding = true;
    draining = false;
    prevTs = 0;
    dialWrap.dataset.holding = '1';
    setHint('Starting');
    buzz(12);
    stopRaf();
    raf = requestAnimationFrame(loop);
  };

  const endHold = () => {
    if (!holding || fired) return;
    holding = false;
    delete dialWrap.dataset.holding;
    draining = charge > 0.01;
    setHint('Hold to start');
    if (draining) { prevTs = 0; stopRaf(); raf = requestAnimationFrame(loop); }
  };

  const ignite = () => {
    if (fired) return;
    fired = true;
    holding = false;
    draining = false;
    charge = 1;
    paintCharge();
    stopTimers();
    delete dialWrap.dataset.holding;
    dialWrap.dataset.engine = '1';
    goStage('engine');
    setHint('Engine on');
    buzz([16, 40, 90]);
    laterCore(() => goStage('launch'), T.engine * 0.4);
    laterCore(() => { goStage('done'); opts.onDone({ replay: reset }); }, T.engine + T.launch);
  };

  const buzz = (pattern) => { if (!reduced && 'vibrate' in navigator) navigator.vibrate(pattern); };

  /* ========================================================= listeners == */
  dial.addEventListener('pointerdown', beginHold);
  dial.addEventListener('pointerup', endHold);
  dial.addEventListener('pointercancel', endHold);
  dial.addEventListener('pointerleave', endHold);
  dial.addEventListener('lostpointercapture', endHold);
  dial.addEventListener('keydown', (e) => {
    if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) beginHold(e);
  });
  dial.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') endHold();
  });
  dial.addEventListener('click', (e) => e.stopPropagation());
  dial.addEventListener('contextmenu', (e) => e.preventDefault());

  /* tap anywhere advances the auto sequence ("a tap opens it sooner") */
  root.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.qnx-chrome') || e.target.closest('.qnx-dial')) return;
    switch (currentStage()) {
      case 'boot':
      case 'bloom':
        stopTimers(); start(); break;
      case 'logo':
        stopTimers(); goStage('carousel');
        later(openTheCard, T.carousel + T.carouselHold); break;
      case 'carousel':
        openTheCard(); break;
      case 'story':
        nextStory(); break;
      default:
        break;
    }
  });

  skip.addEventListener('click', (e) => {
    e.stopPropagation();
    if (['hold', 'engine', 'launch', 'done'].includes(currentStage())) return;
    opened = true;
    storyIndex = STORIES.length - 1;
    paintPhotos();
    toHold();
  });

  replay.addEventListener('click', (e) => { e.stopPropagation(); reset(); });

  function reset() {
    stopAll();
    stopRaf();
    fired = false;
    holding = false;
    draining = false;
    charge = 0;
    opened = false;
    paintCharge();
    delete dialWrap.dataset.engine;
    delete dialWrap.dataset.holding;
    dialWrap.style.pointerEvents = '';
    chrome.style.opacity = '';
    rows.forEach((r) => { r.style.animation = ''; });
    cards.forEach((c) => c.style.removeProperty('opacity'));
    storyCopy.classList.remove('swap');
    if (!layers.isConnected) root.insertBefore(layers, chrome);
    setHint('Hold to start');
    start();
  }

  /* ============================================================= boot === */
  new Set([...CARDS.map((c) => c.img), ...STORIES.map((s) => s.img)])
    .forEach((name) => { const i = new Image(); i.src = IMG(name); i.decoding = 'async'; });

  paintCharge();
  if (opts.autoplay) start();

  /* jumpTo() is a QA hook: it parks the experience on any stage so a design
     review (or a screenshot diff) can start from a known frame. */
  const jumpTo = (name) => {
    stopTimers();
    chrome.style.opacity = '';
    switch (name) {
      case 'bloom': start(); break;
      case 'logo': opened = false; goStage('logo'); break;
      case 'carousel': opened = false; goStage('carousel'); break;
      case 'card': openTheCard(); break;
      case 'story': storyIndex = 0; goStage('story'); setStoryCopy(STORIES[0].title, STORIES[0].body, true); scheduleStory(); break;
      case 'hold': storyIndex = STORIES.length - 1; paintPhotos(); toHold(); break;
      default: break;
    }
  };

  return { replay: reset, jumpTo, destroy };

  function destroy() {
    dead = true;
    stopAll();
    stopRaf();
    ro?.disconnect();
    window.removeEventListener('resize', measure);
    root.innerHTML = '';
    delete root.dataset.stage;
    delete root.dataset.tone;
  }
}

export { T as TIMINGS, STORIES, CARDS, IMG };
