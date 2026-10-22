// On-screen controls for phones and tablets: a joystick on the left, hold-to-act buttons on the right,
// a pause / back button in the top corner, and two big tap pads for tug of war and the snake.
// Every control just presses the same keys the keyboard does (it sends fake key events), so the
// game itself doesn't know or care whether you're using a keyboard or your thumbs.
// game.js reads TouchUI.on (to word its hints for buttons, not keys) and calls TouchUI.sync() every
// frame so the right controls show for each screen.

const TouchUI = (() => {
  let on = matchMedia('(pointer: coarse)').matches;
  let ctx = { state: 'title' };
  const body = document.body;

  // ---- Fake key presses, counted so two thumbs on one key don't let it go early ----
  const held = new Map();
  const send = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
  function press(code) {
    const n = held.get(code) || 0;
    if (!n) send('keydown', code);
    held.set(code, n + 1);
  }
  function release(code) {
    const n = held.get(code) || 0;
    if (n <= 1) { held.delete(code); if (n) send('keyup', code); } else held.set(code, n - 1);
  }
  const tap = code => { send('keydown', code); send('keyup', code); };

  // Sound can only start from a real touch (and on iPhones, "playback" keeps it playing with the
  // silent switch on, like a video would)
  function unlockAudio() {
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* older Safari */ }
    Sfx.unlock(); Music.unlock();
  }

  // ---- Building the controls ----
  const el = (tag, cls, parent, text) => {
    const e = document.createElement(tag);
    e.className = cls;
    if (text) e.textContent = text;
    parent.appendChild(e);
    return e;
  };
  const root = el('div', 'touch-ui', body);
  const zone = el('div', 'stick-zone', root);
  const base = el('div', 'stick-base', zone);
  const knob = el('div', 'stick-knob', base);
  const cluster = el('div', 'buttons', root);
  const BUTTONS = [['SNIFF', 'Space', 'sniff'], ['SNEAK', 'KeyA', 'sneak'], ['RUN', 'KeyD', 'run'], ['BARK', 'KeyS', 'bark'], ['BEG', 'KeyW', 'beg']];
  const buttons = {};
  for (const [label, code, name] of BUTTONS) buttons[name] = Object.assign(el('div', `btn btn-${name}`, cluster, label), { code });
  const corner = el('div', 'corner-btn', root);
  const pads = el('div', 'pads', root);
  const padL = Object.assign(el('div', 'pad', pads, '◀'), { code: 'ArrowLeft' });
  const padR = Object.assign(el('div', 'pad', pads, '▶'), { code: 'ArrowRight' });
  const rotate = el('div', 'rotate', body);
  el('div', 'rotate-phone', rotate);
  el('div', 'rotate-text', rotate, 'TURN YOUR PHONE SIDEWAYS');
  el('div', 'rotate-sub', rotate, 'SCHMOOP QUEST PLAYS LANDSCAPE');

  // ---- Who's touching what: each finger owns the keys it's holding ----
  const fingers = new Map(); // pointerId -> { codes: Set, stick: bool, el }
  function letGo(id) {
    const f = fingers.get(id);
    if (!f) return;
    for (const c of f.codes) release(c);
    if (f.el) f.el.classList.remove('down');
    if (f.stick) resetStick();
    fingers.delete(id);
  }
  function letGoAll() { for (const id of [...fingers.keys()]) letGo(id); }

  function hold(e, target) {
    e.preventDefault();
    unlockAudio();
    goFullscreen();
    letGo(e.pointerId);
    const f = { codes: new Set([target.code]), stick: false, el: target };
    fingers.set(e.pointerId, f);
    target.classList.add('down');
    press(target.code);
    try { target.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
  }
  for (const b of [...Object.values(buttons), padL, padR]) {
    b.addEventListener('pointerdown', e => hold(e, b));
  }
  corner.addEventListener('pointerdown', e => { e.preventDefault(); unlockAudio(); corner.classList.add('down'); tap('Escape'); });
  corner.addEventListener('pointerup', () => corner.classList.remove('down'));
  corner.addEventListener('pointercancel', () => corner.classList.remove('down'));

  // ---- The joystick: it appears wherever your thumb lands on the left side ----
  const STICK_R = 46, DEAD = 12;
  let origin = null;
  function resetStick() {
    origin = null;
    base.classList.remove('active');
    base.style.left = ''; base.style.top = '';
    knob.style.transform = '';
  }
  zone.addEventListener('pointerdown', e => {
    e.preventDefault();
    unlockAudio();
    goFullscreen();
    letGo(e.pointerId);
    for (const [id, f] of fingers) if (f.stick) letGo(id); // only one thumb steers
    const r = zone.getBoundingClientRect();
    origin = { x: e.clientX, y: e.clientY };
    base.classList.add('active');
    base.style.left = (e.clientX - r.left) + 'px';
    base.style.top = (e.clientY - r.top) + 'px';
    fingers.set(e.pointerId, { codes: new Set(), stick: true, el: null });
    try { zone.setPointerCapture(e.pointerId); } catch (err) { /* already gone */ }
    steer(e);
  });
  zone.addEventListener('pointermove', e => { if (fingers.get(e.pointerId)?.stick) steer(e); });
  function steer(e) {
    const f = fingers.get(e.pointerId);
    let dx = e.clientX - origin.x, dy = e.clientY - origin.y;
    const len = Math.hypot(dx, dy);
    if (len > STICK_R) { dx *= STICK_R / len; dy *= STICK_R / len; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    // 8 directions: an axis counts once the thumb leans more than ~22 degrees towards it
    const want = new Set();
    if (len > DEAD) {
      const nx = dx / Math.hypot(dx, dy), ny = dy / Math.hypot(dx, dy);
      if (nx > 0.38) want.add('ArrowRight'); else if (nx < -0.38) want.add('ArrowLeft');
      if (ny > 0.38) want.add('ArrowDown'); else if (ny < -0.38) want.add('ArrowUp');
    }
    for (const c of f.codes) if (!want.has(c)) { release(c); f.codes.delete(c); }
    for (const c of want) if (!f.codes.has(c)) { press(c); f.codes.add(c); }
  }

  for (const t of [root, zone]) {
    t.addEventListener('pointerup', e => letGo(e.pointerId));
    t.addEventListener('pointercancel', e => letGo(e.pointerId));
    t.addEventListener('lostpointercapture', e => letGo(e.pointerId));
  }
  root.addEventListener('contextmenu', e => e.preventDefault());

  // ---- Full screen where the browser allows it (Android; iPhones use Add to Home Screen) ----
  let triedFull = false;
  function goFullscreen() {
    if (triedFull) return;
    triedFull = true;
    const d = document.documentElement;
    if (!document.fullscreenEnabled || document.fullscreenElement || matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) return;
    d.requestFullscreen({ navigationUI: 'hide' })
      .then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape'))
      .catch(() => { /* not allowed here: fine */ });
  }

  // ---- Touch on, keyboard off: a laptop with a touch screen gets whichever you used last ----
  function setOn(v) {
    if (on === v) return;
    on = v;
    body.classList.toggle('touch', on);
    if (!on) letGoAll();
  }
  body.classList.toggle('touch', on);
  addEventListener('touchstart', () => { setOn(true); unlockAudio(); }, { passive: true, capture: true });
  addEventListener('touchend', unlockAudio, { passive: true, capture: true });

  // Turning the phone upright mid-level pauses it
  const portrait = matchMedia('(orientation: portrait)');
  const onTurn = () => { if (on && portrait.matches && ctx.state === 'playing') tap('Escape'); };
  if (portrait.addEventListener) portrait.addEventListener('change', onTurn); else portrait.addListener(onTurn);

  // ---- Every frame: show the controls this screen needs ----
  const MINI = ['tug', 'snake'];
  const NO_CORNER = ['tug', 'snake', 'stung', 'homeTime', 'vetTrip', 'roundOver', 'ending', 'intro'];
  function sync(next) {
    if (next.state !== ctx.state) {
      letGoAll(); // nothing stays held from one screen into the next
      body.dataset.state = next.state;
    }
    ctx = next;
    if (!on) return;
    const playing = next.state === 'playing';
    root.classList.toggle('playing', playing);
    root.classList.toggle('mini', MINI.includes(next.state));
    buttons.beg.classList.toggle('hidden', !next.beg);
    buttons.sniff.classList.toggle('ready', !!next.sniffReady);
    // Pause while playing; a back cross on the menus (and on a yes/no question on the title)
    const showCorner = playing || (!NO_CORNER.includes(next.state) && (next.state !== 'title' || next.confirm));
    corner.classList.toggle('hidden', !showCorner);
    corner.textContent = playing ? 'II' : '✕';
  }

  return {
    get on() { return on; },
    sync,
    keyboard() { setOn(false); }, // a real key was pressed
  };
})();
