// Schmoop Quest: main loop, input, game states, gameplay systems and rendering.

(() => {
  // The screen is VIEW_W x VIEW_H game pixels: 800x450 on a computer. A phone or tablet fills its
  // screen instead (see resize), and VIEW_W/VIEW_H briefly shrink while the zoomed-in playing field
  // is updated and drawn (inPlayView), so everything that reads them lays out for what's on screen
  const BASE_H = 450;
  let VIEW_W = 800, VIEW_H = BASE_H;
  // Distances and speeds are in tiles (× TILE) so they scale with the art
  const WALK_SPEED = 4.5 * TILE, SPRINT_SPEED = 7.8 * TILE, ZOOMIES_SPEED = 9.7 * TILE;
  const SNIFF_COOLDOWN = 5, SNIFF_TIME = 4, SNIFF_RADIUS = 7.5 * TILE; // about 5 metres (a car is 7 tiles long, a bed 3)
  const SNEAK_SPEED = 0.45; // sneaking moves at under half walking speed
  const ZOOMIES_TIME = 5;
  const ZOOMIE_NOISE_CAP = 0.85; // in the quiet levels, zoomies alone never take the noise meter past this
  const CHASE_TIME = 5, MOTH_CHASE_TIME = 4, MOTH_ESCAPE = 2.5, CHASE_RANGE = 3 * TILE, CRITTER_SPEED = 5 * TILE, ESCAPE_DIST = 6 * TILE;
  const PLAY_TIME = 5, TOY_RANGE = 2.5 * TILE, TV_RANGE = 3.5 * TILE;
  const CAT_PENALTY = 3, SWIPE_RANGE = 0.65 * TILE;
  const SCARE_RADIUS = 2.5 * TILE, SCARE_TIME = 3, WARN_RADIUS = 5 * TILE;
  const BIRD_RANGE = 3 * TILE, BIRD_SPEED = 6 * TILE;
  const SNAKE_RANGE = 2 * TILE, SNAKE_TIME = 6;
  const POOP_EVERY = 10, POOP_TIME = 4;
  const WOOF_TIME = 0.5; // how long the bark animation plays
  const WET_TIME = 5, WET_SLOW = 0.7, RAIN_SLOW = 0.85;
  const SPRINKLER_EVERY = 30, SPRINKLER_ON = 4, SPRINKLER_RADIUS = 2.5 * TILE;
  const DOG_HW = 9, PICKUP_REACH = 0.75 * TILE;
  const STAR_PCTS = [50, 75, 100], UNLOCK_PCT = 50;
  const TUG_RANGE = 1.6 * TILE, TUG_TIME = 8;
  const TUG_PULL = { easy: 0.19, medium: 0.27, hard: 0.325 }; // how hard the other dog pulls (knot per second)
  const TUG_TAP = 0.045, TUG_YANK = 0.12, TUG_TELL = 0.4;       // per alternate tap; a big yank, after a 0.4s tell
  // The dog park dogs (names and how strong they are at tug)
  const PARK_DOG_INFO = { rusty: { name: 'RUSTY', strength: 1.15, says: 'LOOKS STRONG!' }, blue: { name: 'BLUEY', strength: 1, says: 'WANTS A GO!' },
    fawn: { name: 'BISCUIT', strength: 0.92, says: 'IS KEEN!' }, choc: { name: 'COCOA', strength: 0.82, says: 'IS A BIT OF A SOFTIE.' } };
  const COMBO_TIME = 3, COMBO_MAX = 5; // snacks eaten within 3s of each other multiply their points, up to x5
  const COMBO_COLOURS = [null, '#ffffff', '#fff3a0', '#ffd84a', '#ffa040', '#ff6ad5'];
  const SNAKE_BITE = 8, IDLE_SIT = 6, IDLE_SLEEP = 14;
  const NOISE_HOLD = 2.5, STINKY_TIME = 10, MUD_COAT_TIME = 15;
  // Mischief: naughty-but-fun things, worth bonus points (less each time you repeat one in a round)
  const MISCHIEF = {
    knock: ['KNOCKED OVER', 10], statue: ['STATUE TOPPLED', 40], hose: ['HOSE TANGLED', 15], ducks: ['DUCKS CHASED', 20],
    stick: ['STICK DELIVERED', 25], shoe: ['SHOE DELIVERED', 25], smell: ['SMELLS ROLLED IN', 30], mud: ['MUD ROLL', 10],
    splash: ['PUDDLES SPLASHED', 5], bed: ['BED BOUNCED ON', 15], howl: ['HOWLED AT THE MOON', 10], bbq: ['BBQ RAIDED', 10],
    pinch: ['PLATES PINCHED', 15], sunbaker: ['SUNBAKERS TROTTED OVER', 10],
  };

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Fill the window. A computer keeps 800x450 at a whole-number scale (perfectly even pixels; an
  // in-between scale if that would leave a lot of the window empty). A phone or tablet widens the
  // view to its screen's shape (up to 1200 wide) so there are no empty side strips, and a small
  // phone zooms the playing field in (up to 1.5x) so the dog, snacks and HUD are big enough to read.
  // The canvas is drawn at up to 2x resolution there, so the zoomed pixels stay even.
  const layout = { touch: false, w: 800, zoom: 1, res: 1, playW: 800, playH: BASE_H };
  function resize() {
    const vw = window.visualViewport ? visualViewport.width : innerWidth, vh = window.visualViewport ? visualViewport.height : innerHeight;
    layout.touch = TouchUI.on;
    let s;
    if (layout.touch) {
      layout.w = Math.round(Math.max(800, Math.min(1200, (BASE_H * vw) / vh)));
      s = Math.min(vw / layout.w, vh / BASE_H);
      const zoom = options.zoom && Math.min(vw, vh) < 520 ? Math.min(1.5, Math.max(1, 1.2 / s)) : 1;
      layout.playH = Math.round(BASE_H / zoom);
      layout.zoom = BASE_H / layout.playH;
      layout.playW = Math.ceil(layout.w / layout.zoom);
      layout.res = Math.min(2, Math.max(1, Math.round(s * (window.devicePixelRatio || 1))));
    } else {
      Object.assign(layout, { w: 800, zoom: 1, res: 1, playW: 800, playH: BASE_H });
      const fit = Math.min(vw / 800, vh / BASE_H), whole = Math.floor(fit);
      s = whole >= 1 && whole / fit >= 0.9 ? whole : Math.max(0.5, fit);
    }
    VIEW_W = layout.w; VIEW_H = BASE_H;
    if (canvas.width !== layout.w * layout.res) canvas.width = layout.w * layout.res;
    if (canvas.height !== BASE_H * layout.res) canvas.height = BASE_H * layout.res;
    canvas.style.width = Math.floor(layout.w * s) + 'px';
    canvas.style.height = Math.floor(BASE_H * s) + 'px';
  }
  addEventListener('resize', resize);
  addEventListener('orientationchange', () => setTimeout(resize, 150));
  if (window.visualViewport) visualViewport.addEventListener('resize', resize);
  // (first called once the options have loaded, below)

  // Run fn with the zoomed-in playing field as the screen; draw = also zoom the drawing
  function inPlayView(fn, draw) {
    const w = VIEW_W, h = VIEW_H;
    VIEW_W = layout.playW; VIEW_H = layout.playH;
    if (draw) { ctx.save(); ctx.scale(layout.zoom, layout.zoom); }
    try { fn(); } finally {
      if (draw) ctx.restore();
      VIEW_W = w; VIEW_H = h;
    }
  }

  // ---- Input ----
  const keys = new Set();
  const pressed = new Set(); // keys pressed since the last frame
  addEventListener('keydown', e => {
    if (e.isTrusted) TouchUI.keyboard();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
    Sfx.unlock();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    Music.unlock();
  });
  addEventListener('keyup', e => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    if (state === 'playing') openPause();
  });
  const down = (...codes) => codes.some(c => keys.has(c));
  const hit = (...codes) => codes.some(c => pressed.has(c));
  // Arrows move; A runs and S sniffs (Shift and Space still work too)
  const LEFT = ['ArrowLeft'], RIGHT = ['ArrowRight'], UP = ['ArrowUp'], DOWN = ['ArrowDown'];
  const RUN = ['KeyD', 'ShiftLeft', 'ShiftRight'], SNIFF = ['Space'], SNEAK = ['KeyA'], BARK = ['KeyS'], BEG = ['KeyW']; // (Shift: a hidden backup for run)
  // What each key is called on screen: everything that shows a key reads it from here. On a phone
  // or tablet it's the name on the on-screen button instead (see touch.js)
  const touchOn = () => TouchUI.on;
  const KEY_LABEL = {
    get run() { return touchOn() ? 'RUN' : 'D'; }, get sniff() { return touchOn() ? 'SNIFF' : 'SPACE'; },
    get sneak() { return touchOn() ? 'SNEAK' : 'A'; }, get bark() { return touchOn() ? 'BARK' : 'S'; }, get beg() { return touchOn() ? 'BEG' : 'W'; },
  };
  const TOUCH_BUTTONS = ['RUN', 'SNIFF', 'SNEAK', 'BARK', 'BEG', 'STICK'];
  // Words for the keyboard, or for thumbs
  const say = (keyboard, touch) => (touchOn() ? touch : keyboard);
  function inputDir() {
    const x = (down(...RIGHT) ? 1 : 0) - (down(...LEFT) ? 1 : 0);
    const y = (down(...DOWN) ? 1 : 0) - (down(...UP) ? 1 : 0);
    const len = Math.hypot(x, y) || 1;
    return [x / len, y / len];
  }

  const mouse = { x: -1, y: -1, moved: false, clicked: false };
  function trackMouse(e) {
    const r = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) * layout.w) / r.width;
    mouse.y = ((e.clientY - r.top) * BASE_H) / r.height;
    mouse.moved = true;
  }
  canvas.addEventListener('mousemove', trackMouse);
  canvas.addEventListener('click', e => { trackMouse(e); mouse.clicked = true; Sfx.unlock(); Music.unlock(); });
  const inRect = (r, x, y) => x >= r.x && y >= r.y && x < r.x + r.w && y < r.y + r.h;

  // A vertical list of options driven by up/down + Enter and the mouse. Returns the chosen index.
  function menuInput(menu, rects, enabled = () => true) {
    if (hit(...UP)) { menu.idx = (menu.idx + rects.length - 1) % rects.length; Sfx.menu(); }
    if (hit(...DOWN)) { menu.idx = (menu.idx + 1) % rects.length; Sfx.menu(); }
    const hover = rects.findIndex(r => inRect(r, mouse.x, mouse.y));
    if (mouse.moved && hover >= 0 && hover !== menu.idx) { menu.idx = hover; Sfx.menu(); }
    // (Space is the sniff key, so on the screens straight after play only Enter counts: mashing
    // Space as time runs out mustn't skip past the results)
    const space = !['roundOver', 'paused'].includes(state);
    if ((mouse.clicked && hover >= 0) || hit('Enter') || (space && hit('Space'))) {
      if (enabled(menu.idx)) return menu.idx;
      Sfx.deny();
    }
    return -1;
  }

  // ---- Saved progress (this browser only) ----
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage unavailable */ } },
  };
  const KEYS = { seen: 'schmoopQuest.seen', complete: 'schmoopQuest.complete', best: 'schmoopQuest.best', dog: 'schmoopQuest.dog', unlocked: 'schmoopQuest.unlocked', levels: 'schmoopQuest.levels', difficulty: 'schmoopQuest.difficulty', options: 'schmoopQuest.options' };
  let best = Number(store.get(KEYS.best)) || 0;
  let dogId = DOGS[store.get(KEYS.dog)] ? store.get(KEYS.dog) : DOG_ORDER[0];
  let difficulty = DIFFICULTY[store.get(KEYS.difficulty)] ? store.get(KEYS.difficulty) : 'medium';
  let unlocked = Math.max(1, Number(store.get(KEYS.unlocked)) || 1);
  let levelStats = {};
  let seenIntros = [];
  try { seenIntros = JSON.parse(store.get('schmoopQuest.seen') || '[]') || []; } catch (e) { seenIntros = []; }
  try { levelStats = JSON.parse(store.get(KEYS.levels) || '{}') || {}; } catch (e) { levelStats = {}; }
  // Saves from before the levels were reordered: move each level's stars to its new number, and
  // unlock up to where the furthest unlocked place now sits
  // (each step runs only for saves older than it: comparing with !== made every later save re-run the
  // earlier steps on each load, which kept pushing `unlocked` up)
  const saveOrder = Number(store.get('schmoopQuest.order')) || 1;
  if (saveOrder < 2) {
    const moved = {};
    for (const [k, v] of Object.entries(levelStats)) moved[migrateOldLevel(+k)] = v;
    levelStats = moved;
    if (unlocked > 1) unlocked = Math.max(...[...Array(unlocked).keys()].map(i => migrateOldLevel(i + 1)));
    store.set(KEYS.levels, JSON.stringify(levelStats));
    store.set(KEYS.unlocked, String(unlocked));
    store.set('schmoopQuest.order', '2');
  }
  // ...and from the 23-level order to this one (Menace Run, Fetch and Beg levels slotted in)
  if (saveOrder < 3) {
    const moved = {};
    for (const [k, v] of Object.entries(levelStats)) moved[migrateV2Level(+k)] = v;
    levelStats = moved;
    if (unlocked > 1) unlocked = Math.max(...[...Array(unlocked).keys()].map(i => migrateV2Level(i + 1)));
    store.set(KEYS.levels, JSON.stringify(levelStats));
    store.set(KEYS.unlocked, String(unlocked));
    store.set('schmoopQuest.order', '3');
  }
  // ...and from the endless 29-level cycle to the 50 levels: repeats of a place fold into its one level
  // (keeping the best), and progress past the end means everything's open
  if (saveOrder < 4) {
    const moved = {};
    for (const [k, v] of Object.entries(levelStats)) {
      const to = migrateV3Level(+k), was = moved[to];
      if (to < 1) continue;
      moved[to] = was ? { pct: Math.max(was.pct || 0, v.pct || 0), stars: Math.max(was.stars || 0, v.stars || 0), best: Math.max(was.best || 0, v.best || 0) } : v;
    }
    levelStats = moved;
    if (unlocked > 1) unlocked = unlocked > LEVEL_CYCLE_V3.length ? LEVEL_COUNT : Math.max(...[...Array(unlocked).keys()].map(i => migrateV3Level(i + 1)));
    store.set(KEYS.levels, JSON.stringify(levelStats));
    store.set(KEYS.unlocked, String(unlocked));
    store.set('schmoopQuest.order', '4');
  }
  unlocked = Math.min(LEVEL_COUNT, unlocked);
  // Options: volumes (0-10), screen shake, and reduced motion (no shake, freeze-frames, slow-mo or wipes)
  // Phones and tablets also: which side the joystick is on, and zooming in on small screens
  const options = { music: 10, sound: 10, shake: true, calm: false, stickLeft: false, zoom: true };
  try { Object.assign(options, JSON.parse(store.get(KEYS.options) || '{}')); } catch (e) { /* keep the defaults */ }
  function applyOptions() {
    Sfx.setVolume(options.sound / 10);
    Music.setVolume(options.music / 10);
    document.body.classList.toggle('stick-left', options.stickLeft);
    resize();
    store.set(KEYS.options, JSON.stringify(options));
  }
  applyOptions();
  const select = { dog: DOG_ORDER.indexOf(dogId), diff: DIFFICULTY_ORDER.indexOf(difficulty), level: unlocked, row: 0 };

  // ---- Game state ----
  let state = 'title', stateT = 0, t = 0;
  let level = 1, score = 0, levelStartScore = 0, roundBonus = 0, timeLeft = 0, lastSecond = 0, banner = 0;
  let world = generateWorld(1);
  let dog = makeDog(world.start);
  let owner = null, result = null, snakeGame = null, tugGame = null, vetTrip = null, howtoReturn = 'title', howtoPage = 0;
  let particles = [], floaters = [], popups = [], flyers = [], bees = [], prints = [], drops = [];
  let callout = null, birdT = 0, beeBuzzT = 0;
  const titleMenu = { idx: 0 }, pauseMenu = { idx: 0, confirm: false }, resultMenu = { idx: 0 };
  const sniff = { cooldown: 0, active: 0, ring: SNIFF_RADIUS };
  const hud = { pop: 0, bonus: 0 }; // the snack counter bounces on each pickup; BONUS! flashes for extras
  const combo = { n: 0, t: 0, best: 0 };
  let lost = {}; // seconds lost this round, by cause, for the results recap
  let mischief = { points: 0, acts: {} };
  let flyIcons = []; // eaten snacks flying into the counter
  // Game feel: a freeze-frame on each pickup, slow-motion and a camera punch-in on the last snack,
  // screen shake on knocks, and a paw-shaped wipe at the start of a round
  const fx = { hitstop: 0, slow: 0, shakeT: 0, shakeAmp: 0, punch: 0, iris: 0, heartT: 0 };
  const cam = { x: 0, y: 0 };

  function makeDog(p) {
    return {
      x: p.x, y: p.y, dir: 'down', dirX: 0, dirY: 1, moving: false, sprinting: false,
      stamina: 1, exhausted: false, animT: 0, inCover: false, inMud: false,
      zoomies: 0, heading: Math.PI / 2, stun: 0, chase: null, immune: 0, path: null,
      scared: 0, scaredMult: 1, scareArmed: true, barkPose: 0, hop: 0,
      wet: 0, muddy: 0, slowT: 0, coat: false, vx: 0, vy: 0,
      sincePoop: 0, poopQueued: false, poop: 0, idleT: 0, limp: 0,
      seq: null, stinky: 0, mudCoat: 0, mudT: 0, carry: null, woofT: 0, barkCool: 0, howlHold: 0, drinking: false, drinkT: 0,
    };
  }

  function setState(s) { state = s; stateT = 0; }
  const dogInfo = () => DOGS[dogId];
  const anxious = () => dogInfo().trait === 'anxious';
  const diff = () => DIFFICULTY[difficulty];
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  function startRun(fromLevel) {
    level = fromLevel;
    score = 0;
    Sfx.start();
    startLevel();
  }

  function startLevel() {
    levelStartScore = score;
    world = generateWorld(level, difficulty);
    dog = makeDog(world.start);
    owner = null;
    snakeGame = null;
    tugGame = null;
    vetTrip = null;
    // In the backyards the other dog sometimes waits with a rope toy for a game of tug
    const other = DOG_ORDER.find(id => id !== dogId);
    // At the dog park, 1-2 of the dogs have brought a rope and want a game of tug
    if (world.parkDogs && world.parkDogs.length && !world.mode) for (const p of shuffle(world.parkDogs.slice()).slice(0, Math.min(world.parkDogs.length, 1 + (Math.random() < 0.5 ? 1 : 0)))) p.rope = true;
    world.tugDog = world.tugSpot ? { id: other, x: world.tugSpot.x, y: world.tugSpot.y, home: { ...world.tugSpot }, dir: 'left', animT: 0, t: 1, moving: false, state: 'waiting', alpha: 1 } : null;
    timeLeft = (world.area === 'garden' ? 35 : 30) + world.goal * 2;
    lastSecond = Math.ceil(timeLeft);
    sniff.cooldown = 0;
    sniff.active = 0;
    sniff.ring = SNIFF_RADIUS;
    particles = []; floaters = []; popups = []; flyers = []; bees = []; prints = []; flyIcons = [];
    callout = null;
    combo.n = 0; combo.t = 0; combo.best = 0;
    lost = {};
    mischief = { points: 0, acts: {} };
    world.tangles = []; world.duckT = 0; world.splashed = new Set();
    Object.assign(fx, { hitstop: 0, slow: 0, shakeT: 0, punch: 0, iris: options.calm ? 0 : IRIS_TIME, heartT: 0 });
    birdT = 8 + Math.random() * 8;
    banner = 3;
    drops = world.weather === 'rain' ? Array.from({ length: 140 }, () => ({ x: Math.random() * VIEW_W, y: Math.random() * VIEW_H, s: 0.7 + Math.random() * 0.6 })) : [];
    if (world.weather === 'rain') Sfx.startRain(); else Sfx.stopRain();
    if (world.area === 'garden') for (let i = 0; i < 4; i++) ripenProduce();
    setupMode(); // Menace Run, Fetch, Beg (does nothing on an ordinary level)
    lastSecond = Math.ceil(timeLeft);
    updateCamera();
    setState('playing');
    maybeIntro(world.mode || 'snack', 'playing'); // the first time each kind of game comes up, explain it
  }

  function leaveToMenu() {
    Sfx.stopRain();
    select.level = Math.min(unlocked, select.level);
    setState('title');
  }

  // ---- Update ----
  function update(rawDt) {
    // A freeze-frame stops the game for a moment; slow-motion runs it at 30%
    let dt = rawDt;
    if (fx.hitstop > 0) { fx.hitstop -= rawDt; dt = 0; }
    else if (fx.slow > 0) { fx.slow -= rawDt; dt = rawDt * 0.3; }
    fx.shakeT = Math.max(0, fx.shakeT - rawDt);
    fx.punch = Math.max(0, fx.punch - rawDt);
    fx.iris = Math.max(0, fx.iris - rawDt);
    fx.redFlash = Math.max(0, (fx.redFlash || 0) - rawDt);
    t += dt;
    stateT += dt;
    if (hit('KeyM')) { Sfx.toggleMute(); Music.setMuted(Sfx.muted); }
    if (hit('KeyN')) Music.toggle();

    switch (state) {
      case 'title': updateTitle(); break;
      case 'select': updateSelect(); break;
      case 'levels': updateLevels(); break;
      case 'howto': updateHowto(); break;
      case 'options': updateOptions(); break;
      case 'playing':
        if (hit('KeyP', 'Escape')) openPause();
        else updatePlaying(dt);
        break;
      case 'paused': updatePause(); break;
      case 'snake': updateSnake(dt); break;
      case 'tug': updateTug(dt); break;
      case 'stung': updateStung(dt); break;
      case 'vetTrip':
        updateEffects(dt);
        if (stateT > 1 && (hit('Enter') || mouse.clicked)) finishRound(true);
        break;
      case 'homeTime': updateHomeTime(dt); break;
      case 'roundOver':
        updateEffects(dt);
        updateResults();
        break;
      case 'ending':
        updateEffects(dt);
        updateEnding(dt);
        break;
      case 'intro': updateIntro(); break;
    }
    if (callout) { callout.life -= dt; if (callout.life <= 0) callout = null; }
    Music.play(musicFor());
    Music.duck(state === 'paused' || (state === 'options' && optionsReturn === 'paused') || lastOneLeft());
    TouchUI.sync({ state, beg: !!beg, confirm: titleConfirm || pauseMenu.confirm, sniffReady: state === 'playing' && sniff.cooldown === 0 });
    pressed.clear();
    mouse.clicked = false;
    mouse.moved = false;
  }

  // Sunny outdoors is happy, rain is gloomier, the dark garage is a bit scary, indoors is cosy
  function musicFor() {
    if (state === 'ending') return 'lullaby';
    if (['title', 'select', 'howto', 'levels', 'roundOver'].includes(state) || (state === 'options' && optionsReturn === 'title')) return 'menu';
    if (state === 'snake' || state === 'tug') return 'tense';
    if (world.mode === 'menace' && state === 'playing') return timeLeft <= 5 ? 'menaceFast' : 'menace';
    if (state === 'vetTrip') return 'rain';
    if (world.night) return 'night';
    if (world.evening) return 'cosy';
    if (world.dark) return 'spooky';
    if (world.weather === 'rain') return 'rain';
    return world.outdoor ? 'sunny' : 'cosy';
  }

  function updatePlaying(dt) {
    // Fetch: while she's holding, spinning or cheering, the dogs just sit and watch
    if (fetchGame && updateFetch(dt)) { dog.animT += dt * 6; updateEffects(dt); updateCamera(); return; }
    if (!fetchGame) timeLeft -= dt;
    banner = Math.max(0, banner - dt);
    const secs = Math.ceil(timeLeft);
    if (secs !== lastSecond) {
      if (secs < lastSecond && secs <= 10 && secs > 0) Sfx.tick();
      lastSecond = secs;
    }

    combo.t = Math.max(0, combo.t - dt);
    // One snack to go: the music drops away under a heartbeat
    if (lastOneLeft() && (fx.heartT -= dt) <= 0) { fx.heartT = 0.85; Sfx.heartbeat(); }

    updateDog(dt);
    updateSniff(dt);
    updateGarden(dt);
    collectTreats();
    collectPickups();
    updatePoops();
    updateCats(dt);
    updateCritters(dt);
    updateFlyers(dt);
    updateVacuums(dt);
    updateVets(dt);
    updateCarriers(dt);
    updateHive(dt);
    updateSprinklers(dt);
    updateSnakeTrigger();
    updateTugDog(dt);
    updateParkDogs(dt);
    updateBeachPeople(dt);
    updateDigs(dt);
    updateStashes(dt);
    updateDebris(dt);
    updateDrink(dt);
    updateItems(dt);
    updateBark(dt);
    updateSmells(dt);
    updateMudFun(dt);
    updateBed();
    updateDucks(dt);
    updateWaves(dt);
    updateStaff(dt);
    updateNoise(dt);
    updateEffects(dt);
    updateCamera();

    if (menace) updateMenace(dt);
    if (beg) updateBeg(dt);
    if (state !== 'playing') return; // a snake, sting etc. took over this frame
    if (menace || fetchGame) return; // they end in their own way (finishMode)
    if (world.found >= world.goal) startHomeTime(true);
    else if (timeLeft <= 0) startHomeTime(false);
  }

  const lastOneLeft = () => state === 'playing' && world.goal - world.found === 1;

  // ---- Combo, time-lost recap and screen shake ----
  function breakCombo() {
    if (combo.t > 0 && combo.n >= 2) {
      floaters.push({ x: dog.x, y: dog.y - 70, text: 'COMBO LOST', life: 0.9, color: '#9a9aaa' });
      Sfx.comboBreak();
    }
    combo.t = 0;
  }
  const loseTime = (cause, s) => { if (s > 0) lost[cause] = (lost[cause] || 0) + s; };
  // A naughty-but-fun act: bonus points (full the first time in a round, less after that)
  function naughty(kind, x = dog.x, y = dog.y) {
    const [, pts] = MISCHIEF[kind], n = mischief.acts[kind] || 0;
    const p = n === 0 ? pts : Math.max(2, Math.round(pts / (n + 1)));
    mischief.acts[kind] = n + 1;
    mischief.points += p;
    score += p;
    floaters.push({ x, y: y - 76, text: n === 0 ? `NAUGHTY! +${p}` : `+${p}`, life: 1.1, color: '#ff8ad8' });
    if (n === 0) Sfx.naughty();
  }
  function shake(amp, time = 0.25) {
    if (!options.shake || options.calm) return;
    fx.shakeAmp = amp; fx.shakeT = time;
  }

  // ---- Movement and collision ----
  const tileAtPx = (px, py) => world.get(Math.floor(px / TILE), Math.floor(py / TILE));
  const solidAtPx = (px, py) => SOLID[tileAtPx(px, py)];
  const tileOf = (x, y) => [Math.floor(x / TILE), Math.floor((y - 4) / TILE)];
  // Creatures collide using a small box around their feet, so they can squeeze between obstacles
  const blocked = (x, y, hw, hh) =>
    solidAtPx(x - hw, y - hh) || solidAtPx(x + hw - 0.01, y - hh) || solidAtPx(x - hw, y - 0.01) || solidAtPx(x + hw - 0.01, y - 0.01);

  // Moves in small steps, sliding along walls. Reports which axes were blocked.
  function moveEntity(e, dx, dy, hw = DOG_HW, hh = hw) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
    const wall = { x: false, y: false };
    for (let i = 0; i < steps; i++) {
      if (!blocked(e.x + dx / steps, e.y, hw, hh)) e.x += dx / steps; else wall.x = true;
      if (!blocked(e.x, e.y + dy / steps, hw, hh)) e.y += dy / steps; else wall.y = true;
    }
    return wall;
  }

  // Picks one of four facings from a movement vector. Sticks with the current axis on diagonals
  // unless the other axis is clearly bigger, so the sprite doesn't flicker.
  function dirFrom(vx, vy, current) {
    const ax = Math.abs(vx), ay = Math.abs(vy);
    if (ax < 1e-3 && ay < 1e-3) return current;
    const horizontal = current === 'left' || current === 'right';
    const useX = horizontal ? ax * 1.3 >= ay : ax > ay * 1.3;
    return useX ? (vx > 0 ? 'right' : 'left') : (vy > 0 ? 'down' : 'up');
  }

  // Breadth-first search over tiles; returns tile-centre waypoints from (fromX, fromY) to the target
  function findPath(fromX, fromY, toTx, toTy) {
    const { W, H, tiles } = world;
    const [sx, sy] = tileOf(fromX, fromY);
    const s = sy * W + sx, goal = toTy * W + toTx;
    if (goal < 0 || goal >= W * H) return null;
    const prev = new Int32Array(W * H).fill(-1);
    prev[s] = s;
    const queue = [s];
    for (let qi = 0; qi < queue.length && prev[goal] === -1; qi++) {
      const i = queue[qi], x = i % W, y = Math.floor(i / W);
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy, j = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || prev[j] !== -1 || SOLID[tiles[j]]) continue;
        prev[j] = i;
        queue.push(j);
      }
    }
    if (prev[goal] === -1) return null;
    const centre = i => ({ x: (i % W) * TILE + 16, y: Math.floor(i / W) * TILE + 24 });
    const path = [];
    for (let i = goal; i !== s; i = prev[i]) path.push(centre(i));
    path.push(centre(s));
    return path.reverse();
  }

  // Walks the dog along dog.path (no player control). Returns true once the path is used up.
  function followPath(speed, dt) {
    if (!dog.path || !dog.path.length) return true;
    const p = dog.path[0], dx = p.x - dog.x, dy = p.y - dog.y, d = Math.hypot(dx, dy), step = speed * dt;
    if (d <= step) { dog.x = p.x; dog.y = p.y; dog.path.shift(); }
    else { dog.x += (dx / d) * step; dog.y += (dy / d) * step; }
    dog.dir = dirFrom(dx, dy, dog.dir);
    dog.moving = true;
    dog.animT += dt * 14;
    return !dog.path.length;
  }

  // Heads straight for a point, sliding around walls
  function walkToward(x, y, speed, dt) {
    const dx = x - dog.x, dy = y - dog.y, d = Math.hypot(dx, dy) || 1;
    moveEntity(dog, (dx / d) * speed * dt, (dy / d) * speed * dt);
    dog.dir = dirFrom(dx, dy, dog.dir);
    dog.moving = true;
    dog.animT += dt * 14;
  }

  // ---- The dog ----
  function speedFactor() {
    let f = (dog.inMud ? 0.45 : 1) * (dog.inCover ? 0.7 : 1);
    if (dog.scared > 0) f *= dog.scaredMult;
    if (dog.wet > 0) f *= WET_SLOW;
    if (dog.slowT > 0) f *= 0.45; // just stepped in poop
    if (dog.beeSlowT > 0) f *= BEE_SLOW; // just been stung
    if (dog.limp > 0) f *= 0.7; // limping after a snake bite
    if (dog.inTangle) f *= 0.7; // tripping over the tangled hose
    if (world.weather === 'rain' && !dog.coat) f *= RAIN_SLOW;
    return f;
  }

  function updateDog(dt) {
    const tile = tileAtPx(dog.x, dog.y - 4);
    dog.inCover = COVER.includes(tile);
    const wasMud = dog.inMud;
    dog.inMud = SLIPPY.includes(tile) || (world.wetSpots || []).some(w => Math.abs(w.x - dog.x) < w.r && Math.abs(w.y - dog.y) < w.r * 0.5);
    if (dog.inMud) dog.muddy = 4;
    dog.immune = Math.max(0, dog.immune - dt);
    dog.barkPose = Math.max(0, dog.barkPose - dt);
    dog.slowT = Math.max(0, dog.slowT - dt);
    if (dog.beeSlowT > 0) {
      dog.beeSlowT = Math.max(0, dog.beeSlowT - dt);
      loseTime('BEE STING', dt * (1 - BEE_SLOW));
      if (Math.random() < dt * 4) floaters.push({ x: dog.x + (Math.random() - 0.5) * 20, y: dog.y - 50, text: '!', life: 0.5, color: '#ff5a5a' });
    }
    dog.beeGrace = Math.max(0, (dog.beeGrace || 0) - dt);
    if (dog.hopT > 0) { dog.hopT = Math.max(0, dog.hopT - dt); dog.hop = -Math.abs(Math.sin(dog.hopT * 10)) * 9 * (dog.hopT / 0.6); if (dog.hopT === 0) dog.hop = 0; }
    dog.poolCool = Math.max(0, (dog.poolCool || 0) - dt);
    dog.whatsThat = Math.max(0, (dog.whatsThat || 0) - dt);
    dog.muddy = Math.max(0, dog.muddy - dt);
    dog.limp = Math.max(0, dog.limp - dt);
    dog.stinky = Math.max(0, dog.stinky - dt);
    dog.mudCoat = Math.max(0, dog.mudCoat - dt);
    dog.woofT = Math.max(0, dog.woofT - dt);
    dog.barkCool = Math.max(0, dog.barkCool - dt);
    dog.inTangle = (world.tangles || []).some(tg => Math.abs(tg.x - dog.x) < 40 && Math.abs(tg.y - dog.y) < 24);
    if (dog.stinky > 0 && Math.random() < dt * 8) particles.push({ x: dog.x + (Math.random() - 0.5) * 30, y: dog.y - 20 - Math.random() * 20, vx: 0, vy: -25, g: 0, life: 0.8, max: 0.8, color: '#9acd50', size: 2 });
    if (dog.wet > 0) {
      dog.wet -= dt;
      if (Math.random() < dt * 12) particles.push({ x: dog.x + (Math.random() - 0.5) * 30, y: dog.y - 10 - Math.random() * 20, vx: 0, vy: 40, g: 100, life: 0.4, max: 0.4, color: '#9ad0ff', size: 2 });
      if (dog.wet <= 0) shakeOff();
    }
    dog.sprinting = false;
    dog.sneaking = false;
    updateScare(dt);
    if (dog.poopQueued && !dog.chase && dog.zoomies <= 0 && dog.stun <= 0 && dog.poop <= 0) startPoop();
    const terrain = speedFactor();

    if (dog.seq) {
      updateSeq(dt);
    } else if (dog.greet > 0) { // another dog at the dog park wants to say hello and play
      dog.greet -= dt;
      dog.moving = false;
      dog.animT += dt * 6;
      if (dog.greet <= 0) dog.immune = 1.5;
    } else if (dog.stun > 0) {
      dog.stun -= dt;
      dog.moving = false;
      dog.animT += dt * 4;
    } else if (dog.poop > 0) {
      updatePoop(dt);
    } else if (dog.chase) {
      updateChase(dt, terrain);
    } else if (beg && down(...BEG)) { // begging: sit still
      dog.moving = false;
      dog.path = null;
      dog.animT += dt * 6;
    } else if (dog.zoomies > 0) {
      updateZoomies(dt, terrain);
    } else {
      updateControl(dt, terrain);
    }
    trackLostTime(dt);

    if (!dog.sprinting && dog.zoomies <= 0) {
      dog.stamina = Math.min(1, dog.stamina + dt * 0.25);
      if (dog.exhausted && dog.stamina > 0.35) dog.exhausted = false;
    }

    // Muddy paw prints for a while after walking through mud
    if ((dog.muddy > 0 || dog.mudCoat > 0) && !dog.inMud && dog.moving && Math.random() < dt * 7) {
      prints.push({ x: dog.x + (Math.random() - 0.5) * 6, y: dog.y - 2, life: dog.mudCoat > 0 ? 7 : 4, big: dog.mudCoat > 0 });
    }
    if (dog.sprinting && Math.random() < dt * 25) {
      particles.push({ x: dog.x - dog.dirX * 14, y: dog.y - 2, vx: -dog.dirX * 30 + (Math.random() - 0.5) * 20, vy: -12, g: 0, life: 0.35, max: 0.35, color: '#e8d6a6', size: 2 });
    }
    if (dog.inCover && dog.moving && world.outdoor && Math.random() < dt * 10) {
      particles.push({ x: dog.x + (Math.random() - 0.5) * 24, y: dog.y - 20, vx: (Math.random() - 0.5) * 60, vy: -50, g: 160, life: 0.6, max: 0.6, color: '#8ad672', size: 2 });
    }
    if (dog.inMud && dog.moving && Math.random() < dt * 14) {
      particles.push({ x: dog.x + (Math.random() - 0.5) * 16, y: dog.y - 2, vx: (Math.random() - 0.5) * 80, vy: -60, g: 240, life: 0.4, max: 0.4, color: world.outdoor ? '#42291a' : '#7aa8d0', size: 2 });
    }
    if (wasMud && !dog.inMud && world.weather === 'rain') { dog.vx *= 1.4; dog.vy *= 1.4; } // slippery: skid out of the mud
    checkBushSurprise();
    checkPoolFall();
  }

  // Where the round's time went: held up (chases, poop, knocks, playdates) or slowed down
  function trackLostTime(dt) {
    if (dog.chase) loseTime({ tv: 'TV', toy: 'TOYS' }[dog.chase.critter.kind] || dog.chase.critter.kind.toUpperCase(), dt);
    else if (dog.poop > 0) loseTime('POOP', dt);
    else if (dog.greet > 0) loseTime('PLAYDATES', dt);
    else if (dog.stun > 0) loseTime(dog.stunCause || 'KNOCKS', dt);
    else if (dog.moving && dog.zoomies <= 0) {
      if (dog.wet > 0) loseTime('SOAKED', dt * (1 - WET_SLOW));
      if (dog.scared > 0) loseTime('SCARED', dt * (1 - dog.scaredMult));
      if (dog.inMud) loseTime(world.outdoor ? 'MUD' : 'SPILLS', dt * 0.55);
      if (dog.slowT > 0) loseTime('POOP', dt * 0.55);
      if (dog.limp > 0) loseTime('SNAKE BITE', dt * 0.3);
      if (world.weather === 'rain' && !dog.coat) loseTime('RAIN', dt * (1 - RAIN_SLOW));
    }
  }

  // Harley is anxious: cats (and, more mildly, birds) make him shiver and slow down
  function scare(seconds, mult, text) {
    if (dog.scared > 0 && dog.scaredMult <= mult) return; // already more scared than this
    dog.scared = seconds;
    dog.scaredMult = mult;
    if (text) floaters.push({ x: dog.x, y: dog.y - 56, text, life: 1, color: '#9ad0ff' });
    Sfx.whimper();
  }
  function updateScare(dt) {
    dog.scared = Math.max(0, dog.scared - dt);
    if (!anxious()) return;
    const near = world.cats.some(c => !c.asleep && dist(c, dog) < SCARE_RADIUS);
    if (near && dog.scareArmed && dog.stun <= 0) { scare(SCARE_TIME, 0.5, 'EEP!'); dog.scareArmed = false; }
    if (!near && dog.scared === 0) dog.scareArmed = true;
  }

  function updateControl(dt, terrain) {
    const [ix, iy] = inputDir();
    const moving = ix !== 0 || iy !== 0;
    // Holding D creeps along slowly and quietly (it wins over running if both are held)
    dog.sneaking = moving && down(...SNEAK);
    dog.sprinting = moving && !dog.sneaking && down(...RUN) && !dog.exhausted;
    if (dog.sprinting) {
      dog.stamina -= dt * 0.45;
      if (dog.stamina <= 0) { dog.stamina = 0; dog.exhausted = true; dog.sprinting = false; }
    }
    const speed = (dog.sprinting ? SPRINT_SPEED : dog.sneaking ? WALK_SPEED * SNEAK_SPEED : WALK_SPEED) * terrain;
    let vx = ix * speed, vy = iy * speed;
    if (world.weather === 'rain' && (dog.inMud || Math.hypot(dog.vx, dog.vy) > speed * 1.05)) {
      // Slippery mud in the rain: momentum carries you a little
      const k = Math.min(1, dt * (dog.inMud ? 3 : 6));
      vx = dog.vx + (vx - dog.vx) * k;
      vy = dog.vy + (vy - dog.vy) * k;
    }
    dog.vx = vx; dog.vy = vy;
    moveEntity(dog, vx * dt, vy * dt);
    if (moving) { dog.dir = dirFrom(ix, iy, dog.dir); dog.dirX = ix; dog.dirY = iy; }
    dog.moving = moving || Math.hypot(vx, vy) > 20;
    dog.animT += dt * (dog.moving ? (dog.sprinting ? 16 : 11) : 5);
    // Left alone, the dog sits down, then nods off
    const before = dog.idleT;
    dog.idleT = moving || keys.size ? 0 : dog.idleT + dt;
    if (dog.idleT > IDLE_SLEEP && Math.floor(dog.idleT / 1.2) !== Math.floor(before / 1.2)) {
      floaters.push({ x: dog.x + (dog.dir === 'left' ? -14 : 14), y: dog.y - 46, text: 'Z', life: 1.4, color: '#cfd8ff' });
    }
  }

  // Zoomies: super speed for 5 seconds. You steer normally, but the dog can't stop: with no keys
  // pressed it keeps running the way it was going.
  function startZoomies() {
    if (dog.chase) endChase();
    dog.zoomies = ZOOMIES_TIME;
    dog.stamina = Math.max(0, dog.stamina - 0.5);
    if (!dog.dirX && !dog.dirY) dog.dirY = 1;
    dog.path = null;
    callout = { text: world.hush ? 'ZOOMIES! (SHHH!)' : 'ZOOMIES!', life: 2.2, max: 2.2, rainbow: true };
    Sfx.zoomies();
  }

  function updateZoomies(dt, terrain) {
    dog.zoomies = Math.max(0, dog.zoomies - dt);
    const [ix, iy] = inputDir();
    if (ix || iy) { // short smoothing so turns feel zippy rather than twitchy
      const k = Math.min(1, dt / 0.08);
      dog.dirX += (ix - dog.dirX) * k;
      dog.dirY += (iy - dog.dirY) * k;
      const len = Math.hypot(dog.dirX, dog.dirY) || 1;
      dog.dirX /= len; dog.dirY /= len;
    }
    const v = ZOOMIES_SPEED * terrain;
    moveEntity(dog, dog.dirX * v * dt, dog.dirY * v * dt);
    dog.vx = dog.dirX * v; dog.vy = dog.dirY * v;
    dog.dir = dirFrom(dog.dirX, dog.dirY, dog.dir);
    dog.moving = true;
    dog.animT += dt * 20;
    if (Math.random() < dt * 40) {
      particles.push({ x: dog.x - dog.dirX * 16, y: dog.y - 12 - dog.dirY * 8, vx: -dog.dirX * 40, vy: -dog.dirY * 40, g: 0, life: 0.4, max: 0.4, size: 3, color: `hsl(${(t * 600) % 360},90%,65%)` });
    }
  }

  // ---- Poop break: every 10 snacks the dog stops for 5 seconds; the poop stays as a hazard ----
  function startPoop() {
    dog.poopQueued = false;
    dog.poop = POOP_TIME;
    dog.path = null;
    dog.moving = false;
    if (dog.dir === 'up' || dog.dir === 'down') dog.dir = 'right';
    floaters.push({ x: dog.x, y: dog.y - 56, text: 'NATURE CALLS...', life: 1.4, color: '#e0b080' });
  }
  function updatePoop(dt) {
    const before = dog.poop;
    dog.poop -= dt;
    dog.moving = false;
    dog.animT += dt * 3;
    if (before > 1.2 && dog.poop <= 1.2) {
      const back = dog.dir === 'left' ? 16 : -16;
      world.poops.push({ x: dog.x + back, y: dog.y - 2, armed: false });
      floaters.push({ x: dog.x + back, y: dog.y - 30, text: 'PLOP!', life: 1, color: '#c08a50' });
      makeNoise(0.04);
      Sfx.plop();
    }
    if (dog.poop <= 0) dog.sincePoop = 0;
  }
  function updatePoops() {
    for (const p of world.poops) {
      const d = Math.hypot(p.x - dog.x, p.y - dog.y);
      if (!p.armed) { if (d > 22) p.armed = true; continue; }
      if (d < 12) {
        p.gone = true;
        dog.slowT = 1.5;
        dog.muddy = 4;
        floaters.push({ x: dog.x, y: dog.y - 50, text: 'SQUELCH!', life: 1, color: '#c08a50' });
        for (let i = 0; i < 8; i++) particles.push({ x: p.x, y: p.y, vx: (Math.random() - 0.5) * 90, vy: -50 - Math.random() * 40, g: 240, life: 0.5, max: 0.5, color: '#55301a', size: 2 });
        Sfx.squelch();
      }
    }
    world.poops = world.poops.filter(p => !p.gone);
  }
  function countSnackForPoop() {
    dog.sincePoop++;
    if (dog.sincePoop >= POOP_EVERY) dog.poopQueued = true;
  }

  // ---- Distractions ----
  // Chases: the critter (or flyer) bolts and the dog chases it, barking, for up to 5 seconds.
  // Fixations: a toy or the TV doesn't run away; the dog goes to it and plays/stares for 5 seconds.
  function startChase(c) {
    c.state = 'alert';
    c.t = c.flyer ? 0.15 : 0.5;
    const insect = c.kind === 'moth' || c.kind === 'butterfly';
    dog.chase = { critter: c, kind: 'chase', t: insect ? MOTH_CHASE_TIME : CHASE_TIME, stuck: 0, pathT: 0, barkT: 0.45 };
    dog.whatsThat = 1.5;
    dog.path = null;
    breakCombo();
    popups.push({ target: dog, life: 0.9, max: 0.9, height: 52 }, { target: c, life: 0.9, max: 0.9, height: c.flyer ? 26 + c.alt : 22 });
    Sfx.distract();
  }

  function startFixation(c) {
    c.state = 'active';
    dog.chase = { critter: c, kind: 'fixate', t: PLAY_TIME + 4, stage: 'go', playT: PLAY_TIME, squeakT: 0.3 };
    dog.path = findPath(dog.x, dog.y, ...tileOf(c.x, c.y));
    dog.whatsThat = 1.5;
    breakCombo();
    popups.push({ target: dog, life: 0.9, max: 0.9, height: 52 }, { target: c, life: 0.9, max: 0.9, height: c.kind === 'tv' ? 80 : 22 });
    Sfx.distract();
  }

  function updateChase(dt, terrain) {
    const ch = dog.chase, c = ch.critter;
    ch.t -= dt;
    if (ch.kind === 'fixate') { updateFixation(dt, terrain); return; }
    if (c.state === 'alert') {
      dog.moving = false;
      dog.dir = dirFrom(c.x - dog.x, c.y - dog.y, dog.dir);
      dog.animT += dt * 5;
    } else {
      const speed = (c.flyer ? BIRD_SPEED * 0.75 : CRITTER_SPEED * 0.88) * terrain;
      if (dog.path && dog.path.length && ch.pathT > 0) {
        followPath(speed, dt);
        ch.pathT -= dt;
      } else {
        const x0 = dog.x, y0 = dog.y;
        walkToward(c.x, c.y, speed, dt);
        const moved = Math.hypot(dog.x - x0, dog.y - y0);
        ch.stuck = moved < speed * dt * 0.3 ? ch.stuck + dt : 0;
        if (ch.stuck > 0.4) { // stuck behind something: plot a route to where the critter is now
          const [tx, ty] = tileOf(c.x, c.y);
          dog.path = SOLID[world.get(tx, ty)] ? null : findPath(dog.x, dog.y, tx, ty);
          ch.pathT = 0.8;
          ch.stuck = 0;
        }
      }
      ch.barkT -= dt;
      if (ch.barkT <= 0) {
        ch.barkT = 0.6 + Math.random() * 0.3;
        dog.barkPose = 0.25;
        floaters.push({ x: dog.x + (Math.random() - 0.5) * 16, y: dog.y - 56, text: 'WOOF!', life: 0.7, color: '#ffffff' });
        makeNoise(0.14);
        Sfx.woof();
      }
    }
    if (ch.t <= 0 || c.state === 'escaped' || c.state === 'gone') endChase();
  }

  function updateFixation(dt, terrain) {
    const ch = dog.chase, c = ch.critter;
    const reach = c.kind === 'tv' ? 18 : 20;
    if (ch.stage === 'go') {
      const close = Math.hypot(c.x - dog.x, c.y - dog.y) < reach;
      if (!close && dog.path && dog.path.length) followPath(WALK_SPEED * 1.2 * terrain, dt);
      else if (!close) walkToward(c.x, c.y, WALK_SPEED * 1.2 * terrain, dt);
      if (close || ch.t < PLAY_TIME) {
        ch.stage = 'play';
        dog.path = null;
        if (c.kind === 'toy') { dog.dir = c.x >= dog.x ? 'right' : 'left'; floaters.push({ x: c.x, y: c.y - 30, text: 'POUNCE!', life: 0.8, color: '#ffd84a' }); }
        else dog.dir = 'up';
      }
    } else {
      ch.playT -= dt;
      dog.moving = false;
      dog.animT += dt * (c.kind === 'toy' ? 5 : 2);
      if (c.kind === 'toy') {
        c.hop = -Math.abs(Math.sin(t * 7)) * 8;
        c.x += Math.sin(t * 3.5) * 10 * dt;
        ch.squeakT -= dt;
        if (ch.squeakT <= 0) {
          ch.squeakT = 0.7 + Math.random() * 0.5;
          floaters.push({ x: c.x, y: c.y - 30, text: 'SQUEAK!', life: 0.7, color: '#ffffff' });
          makeNoise(0.14);
          Sfx.squeak();
        }
      }
      if (ch.playT <= 0) endChase();
    }
    if (dog.chase && ch.t <= 0) endChase();
  }

  function endChase() {
    const c = dog.chase.critter;
    if (dog.chase.kind === 'fixate') { c.state = 'spent'; c.hop = 0; }
    else if (c.state === 'alert' || c.state === 'fleeing') escapeCritter(c, false);
    dog.chase = null;
    dog.path = null;
    dog.immune = 2; // a moment to get away before the next distraction
  }

  function escapeCritter(c, splash) {
    c.state = 'escaped';
    c.t = 0.6;
    c.fade = 0.5;
    c.splashed = splash;
    if (splash) {
      for (let i = 0; i < 14; i++) {
        const a = -Math.random() * Math.PI;
        particles.push({ x: c.x, y: c.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 90, g: 260, life: 0.6, max: 0.6, color: i % 2 ? '#a8d4f8' : '#ffffff', size: 2 });
      }
      Sfx.splash();
    }
  }

  function nearestTile(c, type, radius = 7) {
    const [cx, cy] = tileOf(c.x, c.y);
    let bestTile = null, bestD = Infinity;
    for (let y = cy - radius; y <= cy + radius; y++) {
      for (let x = cx - radius; x <= cx + radius; x++) {
        if (world.get(x, y) !== type) continue;
        const d = (x - cx) ** 2 + (y - cy) ** 2;
        if (d < bestD) { bestD = d; bestTile = { x: x * TILE + 16, y: y * TILE + 16 }; }
      }
    }
    return bestTile;
  }

  const dogFree = () => !dog.chase && !dog.zoomies && dog.stun <= 0 && !dog.immune && dog.poop <= 0 && !(dog.greet > 0) && !dog.seq;

  function updateCritters(dt) {
    for (const c of world.critters) {
      c.animT += dt;
      const d = dist(c, dog);
      if (c.state === 'idle') {
        wanderCritter(c, dt);
        if (!dogFree()) continue;
        if (c.kind === 'toy' && d < TOY_RANGE) startFixation(c);
        else if (c.kind === 'tv' && d < TV_RANGE) startFixation(c);
        else if (!['toy', 'tv'].includes(c.kind) && d < CHASE_RANGE * (dog.sneaking ? 0.5 : 1)) startChase(c); // sneak up on them
      } else if (c.state === 'alert') {
        c.t -= dt;
        c.facing = c.x >= dog.x ? 1 : -1;
        if (c.t <= 0) {
          c.state = 'fleeing'; c.fleeT = 0; c.avoid = 0;
          c.water = c.kind === 'frog' || c.kind === 'crab' ? nearestTile(c, T.WATER) || nearestTile(c, T.POOL) : null;
        }
      } else if (c.state === 'fleeing') {
        c.fleeT += dt;
        let vx = (c.x - dog.x) / (d || 1), vy = (c.y - dog.y) / (d || 1);
        if (c.kind === 'lizard' || c.kind === 'beetle') {
          const a = Math.atan2(vy, vx) + Math.sin(c.fleeT * (c.kind === 'beetle' ? 7 : 10)) * 0.7; // zig-zag
          vx = Math.cos(a); vy = Math.sin(a);
        } else if (c.water) {
          const wx = c.water.x - c.x, wy = c.water.y - c.y, wd = Math.hypot(wx, wy) || 1;
          vx += (wx / wd) * 1.4; vy += (wy / wd) * 1.4;
          const n = Math.hypot(vx, vy) || 1;
          vx /= n; vy /= n;
        }
        if (c.avoid > 0) { c.avoid -= dt; [vx, vy] = [-vy * c.turn, vx * c.turn]; }
        const speed = CRITTER_SPEED * { lizard: 1.05, frog: 0.95, mouse: 1.1, beetle: 0.8, crab: 0.9 }[c.kind];
        const wall = moveEntity(c, vx * speed * dt, vy * speed * dt, 5, 5);
        if (wall.x && wall.y) { c.avoid = 0.35; c.turn = Math.random() < 0.5 ? 1 : -1; }
        if (Math.abs(vx) > 0.2) c.facing = vx > 0 ? 1 : -1;
        if (c.kind === 'frog') c.hop = -Math.abs(Math.sin(c.fleeT * 9)) * 10;
        if ((c.kind === 'frog' || c.kind === 'crab') && c.water && dist(c.water, c) < TILE * 0.9) {
          c.x = c.water.x; c.y = c.water.y; c.hop = 0;
          escapeCritter(c, true); // dives into the water
        } else if (c.kind === 'mouse' && c.fleeT > 1 && (wall.x || wall.y)) {
          escapeCritter(c, false); // darts into a mouse hole
          floaters.push({ x: c.x, y: c.y - 20, text: 'SQUEAK', life: 0.6, color: '#cfd3e0' });
        } else if (d > ESCAPE_DIST) {
          escapeCritter(c, false);
        }
      } else if (c.state === 'escaped') {
        c.t -= dt;
        if (!c.splashed) c.x += c.facing * CRITTER_SPEED * 0.6 * dt;
        if (c.t <= 0) c.state = 'gone';
      }
    }
  }

  // Idle critters potter about near home: frogs hop, lizards dart, mice scurry along walls, beetles
  // crawl. Now and then one heads across the dog's path, so they can be dodged or stumbled into.
  const WANDER = {
    frog: { dur: 0.35, speed: 3.2, pause: [1.5, 4] },
    lizard: { dur: 0.45, speed: 4.5, pause: [1, 3] },
    mouse: { dur: 0.4, speed: 4, pause: [0.6, 1.6] },
    beetle: { dur: 1.6, speed: 0.9, pause: [0.2, 0.8] },
    crab: { dur: 0.5, speed: 3.2, pause: [0.8, 2.5] },
  };
  function wanderCritter(c, dt) {
    const spec = WANDER[c.kind];
    if (!spec || !c.home) return;
    if (c.move) {
      const m = c.move;
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      const wall = moveEntity(c, m.vx * m.speed * dt, m.vy * m.speed * dt, 5, 5);
      if (c.kind === 'frog') c.hop = -Math.sin(k * Math.PI) * 9;
      if (Math.abs(m.vx) > 0.2) c.facing = m.vx > 0 ? 1 : -1;
      if (k >= 1 || (wall.x && wall.y)) { c.move = null; c.hop = 0; c.wanderT = spec.pause[0] + Math.random() * (spec.pause[1] - spec.pause[0]); }
      return;
    }
    c.wanderT -= dt;
    if (c.wanderT > 0) return;
    let a = Math.random() * Math.PI * 2;
    if (Math.hypot(c.home.x - c.x, c.home.y - c.y) > 3 * TILE) a = Math.atan2(c.home.y - c.y, c.home.x - c.x) + (Math.random() - 0.5) * 0.6;
    else if (Math.random() < 0.2 && dist(c, dog) < 9 * TILE) { // across the dog's path
      a = Math.atan2(dog.y + dog.vy * 0.8 - c.y, dog.x + dog.vx * 0.8 - c.x);
    } else if (c.kind === 'crab') a = (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.4; // crabs scuttle sideways
    else if (c.kind === 'mouse') { // mice run along the skirting boards
      const [tx, ty] = tileOf(c.x, c.y), wallAt = (dx, dy) => world.get(tx + dx, ty + dy) === T.WALL;
      if (wallAt(0, -1) || wallAt(0, 1)) a = Math.random() < 0.5 ? 0 : Math.PI;
      else if (wallAt(-1, 0) || wallAt(1, 0)) a = Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
    }
    c.move = { vx: Math.cos(a), vy: Math.sin(a), t: 0, dur: spec.dur * (0.7 + Math.random() * 0.6), speed: spec.speed * TILE };
  }

  // ---- Birds, moths and butterflies (airborne: drawn above everything with a shadow on the ground) ----
  function spawnFlyer(kind, x, y, vx, vy, extra = {}) {
    const f = { kind, x, y, vx, vy, alt: 44, flyer: true, state: 'flying', t: 0, animT: 0, ...extra };
    flyers.push(f);
    return f;
  }

  // Canopy tops of the trees on screen (where birds perch)
  function treeTops() {
    const tops = [];
    visibleTiles((tx, ty, tile) => {
      const v = world.variants[ty * world.W + tx];
      if (tile !== T.TREE || !v) return;
      const img = SPRITES.trees[v];
      tops.push({ x: tx * TILE + 16, y: ty * TILE + 28, alt: Math.round(img.anchorY * 0.82) });
    });
    return tops;
  }

  // Birds pick a flight pattern: clip a corner, cross the screen anywhere, swoop in low and climb
  // away out of sight, or flit from tree to tree (perching for a moment in each)
  function spawnBird() {
    const L = cam.x, T0 = cam.y, R = cam.x + VIEW_W, B = cam.y + VIEW_H, m = 40;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const tops = treeTops();
    const pattern = weighted({ corner: 30, across: 25, swoop: 20, trees: tops.length >= 2 ? 25 : 0 });
    let p0, p1, p2, alt = [44, 44, 44];
    if (pattern === 'corner') {
      const cx = Math.random() < 0.5 ? L : R, cy = Math.random() < 0.5 ? T0 : B;
      const dx = cx === L ? 1 : -1, dy = cy === T0 ? 1 : -1;
      p0 = { x: cx - dx * m, y: cy + dy * rnd(40, 170) };
      p2 = { x: cx + dx * rnd(80, 240), y: cy - dy * m };
      p1 = { x: cx + dx * rnd(40, 90), y: cy + dy * rnd(40, 90) };
    } else if (pattern === 'across') {
      if (Math.random() < 0.7) {
        const fromL = Math.random() < 0.5;
        p0 = { x: fromL ? L - m : R + m, y: rnd(T0 + 40, B - 40) };
        p2 = { x: fromL ? R + m : L - m, y: rnd(T0 + 40, B - 40) };
      } else {
        const fromT = Math.random() < 0.5;
        p0 = { x: rnd(L + 60, R - 60), y: fromT ? T0 - m : B + m };
        p2 = { x: rnd(L + 60, R - 60), y: fromT ? B + m : T0 - m };
      }
      p1 = { x: (p0.x + p2.x) / 2 + rnd(-90, 90), y: (p0.y + p2.y) / 2 + rnd(-60, 60) };
    } else if (pattern === 'swoop') {
      const fromL = Math.random() < 0.5, dir = fromL ? 1 : -1;
      p0 = { x: fromL ? L - m : R + m, y: rnd(T0 + 80, B - 60) };
      p2 = { x: p0.x + dir * rnd(300, 520), y: p0.y - rnd(40, 120) };
      p1 = { x: (p0.x + p2.x) / 2, y: p0.y + 50 };
      alt = [40, 12, 170]; // dips low, then climbs steeply away
    } else {
      // Flies in from the nearer edge, lands in one tree, then flits to another
      const [a, b] = shuffle(tops).slice(0, 2);
      const fromL = a.x < (L + R) / 2;
      const e = { x: fromL ? L - m : R + m, y: a.y - rnd(40, 120) };
      const f = birdPath(spawnFlyer('bird', e.x, e.y, 0, 0, { alt: 60 }), e, { x: (e.x + a.x) / 2, y: Math.min(e.y, a.y) - 40 }, a, [60, 70, a.alt], 'trees');
      f.next = b;
      Sfx.flutter();
      return;
    }
    birdPath(spawnFlyer('bird', p0.x, p0.y, 0, 0, { alt: alt[0] }), p0, p1, p2, alt, pattern);
    Sfx.flutter();
  }
  function birdPath(f, p0, p1, p2, alt, pattern) {
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y) + Math.hypot(p2.x - p1.x, p2.y - p1.y);
    f.path = { p0, p1, p2, alt, dur: Math.max(0.6, len / BIRD_SPEED), u: 0, pattern };
    return f;
  }
  // When a perched bird's rest is over it flies to another tree, or off the screen
  function leavePerch(f) {
    const tops = treeTops().filter(tp => Math.hypot(tp.x - f.x, tp.y - f.y) > 2 * TILE);
    const here = { x: f.x, y: f.y };
    if (f.next) {
      const b = f.next; f.next = null;
      birdPath(f, here, { x: (here.x + b.x) / 2, y: Math.min(here.y, b.y) - 70 }, b, [f.alt, f.alt + 40, b.alt], 'trees');
    } else if (tops.length && (f.hops || 0) < 2 && Math.random() < 0.5) {
      const b = pick(tops);
      birdPath(f, here, { x: (here.x + b.x) / 2, y: Math.min(here.y, b.y) - 70 }, b, [f.alt, f.alt + 40, b.alt], 'trees');
    } else {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const end = { x: dir < 0 ? cam.x - 60 : cam.x + VIEW_W + 60, y: f.y - 80 - Math.random() * 80 };
      birdPath(f, here, { x: (here.x + end.x) / 2, y: here.y - 40 }, end, [f.alt, f.alt + 10, 90], 'leave');
    }
    f.hops = (f.hops || 0) + 1;
    f.state = 'flying';
    Sfx.flutter();
  }

  function updateFlyers(dt) {
    // Birds come by now and then outdoors (less often in the rain)
    if (world.outdoor && !world.night) { // birds roost at night
      birdT -= dt;
      if (birdT <= 0) {
        birdT = (12 + Math.random() * 10) * (world.weather === 'rain' ? 2 : 1) / Math.max(0.5, diff().critters);
        spawnBird();
      }
    }
    updateHoverers(dt);
    for (const f of flyers) {
      const insect = f.kind === 'moth' || f.kind === 'butterfly';
      f.animT += dt * (insect ? 14 : 10);
      f.t += dt;
      if (f.state === 'alert') { f.t2 = (f.t2 || 0) + dt; if (f.t2 > 0.15) f.state = 'fleeing'; continue; }
      if (f.state === 'fleeing' && f.path) { // chased: forget the flight plan and get away from the dog
        const a = Math.atan2(f.y - dog.y, f.x - dog.x);
        f.path = null; f.vx = Math.cos(a) * BIRD_SPEED; f.vy = Math.sin(a) * BIRD_SPEED;
      }
      if (f.state === 'perched') {
        f.perchT -= dt;
        f.animT = Math.floor(f.t * 1.5) % 2; // looks about
        if (f.perchT <= 0) leavePerch(f);
      } else if (f.path) {
        const P = f.path;
        P.u = Math.min(1, P.u + dt / P.dur);
        const u = P.u, wa = (1 - u) * (1 - u), wb = 2 * u * (1 - u), wc = u * u;
        const nx = wa * P.p0.x + wb * P.p1.x + wc * P.p2.x, ny = wa * P.p0.y + wb * P.p1.y + wc * P.p2.y;
        if (Math.abs(nx - f.x) > 0.01) f.face = nx > f.x ? 1 : -1;
        f.vx = (nx - f.x) / Math.max(dt, 1e-3); f.vy = (ny - f.y) / Math.max(dt, 1e-3);
        f.x = nx; f.y = ny;
        f.alt = wa * P.alt[0] + wb * P.alt[1] + wc * P.alt[2];
        if (u >= 1) {
          if (P.pattern === 'trees') { f.path = null; f.state = 'perched'; f.perchT = 1 + Math.random() * 2; }
          else if (f.state !== 'escaped') { f.state = 'escaped'; f.fade = 0.4; }
        }
      } else if (insect) { // fluttery zig-zag, rising as it goes
        f.x += (f.vx + Math.sin(f.t * 9) * 40) * dt;
        f.y += (f.vy + Math.cos(f.t * 7) * 30) * dt;
        f.alt = Math.min(70, f.alt + 12 * dt);
      } else {
        f.x += f.vx * dt;
        f.y += (f.vy + Math.sin(f.t * 5) * 12) * dt;
        f.alt = Math.min(44, f.alt + 30 * dt);
      }
      if (f.vx) f.face = f.vx > 0 ? 1 : -1;
      const d = dist(f, dog);
      // Only low-flying birds within range bother the dog (perched ones are harmless until they fly):
      // Harley gets nervous at birds; Bobbin chases them
      if (f.state === 'flying' && f.alt < 60 && d < BIRD_RANGE && !f.reacted && state === 'playing') {
        if (f.kind === 'bird' && anxious()) { f.reacted = true; scare(2, 0.7, 'EEK!'); }
        else if (dogFree()) { f.reacted = true; startChase(f); }
      }
      const offscreen = f.x < cam.x - 80 || f.x > cam.x + VIEW_W + 80 || f.y < cam.y - 80 || f.y > cam.y + VIEW_H + 80;
      if (f.state !== 'escaped' && f.state !== 'perched' && ((insect && f.t > MOTH_ESCAPE && f.state === 'fleeing') || (offscreen && f.t > 0.5 && !(f.path && f.path.u < 0.5)) || (d > 12 * TILE && f.t > 2))) {
        f.state = 'escaped'; f.fade = 0.5;
      }
      if (f.state === 'escaped') { f.fade -= dt; if (f.fade <= 0) f.state = 'gone'; }
    }
    flyers = flyers.filter(f => f.state !== 'gone');
  }

  // Moths and butterflies hover lazily round their bush or flowers until the dog gets close
  function updateHoverers(dt) {
    if (!world.hoverers) return;
    for (const h of world.hoverers) {
      h.t += dt;
      h.x = h.cx + Math.sin(h.t * 1.3 + h.cx) * 14 + Math.sin(h.t * 3.1) * 4;
      h.y = h.cy + Math.cos(h.t * 1.1 + h.cy) * 8;
      h.alt = 18 + Math.sin(h.t * 4) * 5;
      if (state === 'playing' && dogFree() && dist(h, dog) < CHASE_RANGE * 0.85) {
        h.gone = true;
        const a = Math.atan2(h.y - dog.y, h.x - dog.x);
        const f = spawnFlyer(h.kind, h.x, h.y, Math.cos(a) * 2.2 * TILE, Math.sin(a) * 2.2 * TILE, { alt: h.alt, colour: h.colour, reacted: true });
        startChase(f);
      }
    }
    world.hoverers = world.hoverers.filter(h => !h.gone);
  }

  // A moth or bird hidden in a bush bursts out when the dog pushes in
  function checkBushSurprise() {
    if (!world.bushSurprise || !dog.inCover) return;
    const [tx, ty] = tileOf(dog.x, dog.y);
    const i = ty * world.W + tx, kind = world.bushSurprise.get(i);
    if (!kind) return;
    world.bushSurprise.delete(i);
    const a = Math.atan2(ty * TILE + 16 - dog.y, tx * TILE + 16 - dog.x) + (Math.random() - 0.5);
    const speed = kind === 'bird' ? BIRD_SPEED : 2.2 * TILE;
    const f = spawnFlyer(kind, tx * TILE + 16, ty * TILE + 20, Math.cos(a) * speed, Math.sin(a) * speed, { alt: 16, state: 'flying' });
    for (let k = 0; k < 14; k++) particles.push({ x: f.x + (Math.random() - 0.5) * 24, y: f.y - 16, vx: (Math.random() - 0.5) * 100, vy: -60 - Math.random() * 60, g: 200, life: 0.7, max: 0.7, color: '#8ad672', size: 2 });
    Sfx.flutter();
    if (kind === 'bird' && anxious()) { f.reacted = true; scare(2, 0.7, 'EEK!'); }
    else if (dogFree()) { f.reacted = true; startChase(f); }
  }

  // ---- Sniffing ----
  function updateSniff(dt) {
    sniff.cooldown = Math.max(0, sniff.cooldown - dt);
    sniff.active = Math.max(0, sniff.active - dt);
    sniff.ring += dt * 620;
    for (const tr of world.treats) tr.revealed = Math.max(0, tr.revealed - dt);
    if (hit(...SNIFF) && sniff.cooldown === 0) {
      sniff.cooldown = SNIFF_COOLDOWN;
      sniff.active = SNIFF_TIME;
      sniff.ring = 0;
      for (const tr of world.treats) if (!tr.collected && dist(tr, dog) < SNIFF_RADIUS) tr.revealed = SNIFF_TIME;
      for (const d of world.digs || []) if (!d.dug && d.type && dist(d, dog) < SNIFF_RADIUS) d.revealed = SNIFF_TIME;
      for (const st of world.stashes || []) if (!st.done && st.type && dist(st, dog) < SNIFF_RADIUS) st.revealed = SNIFF_TIME;
      for (const sm of world.smells || []) if (!sm.found && dist(sm, dog) < SNIFF_RADIUS) sm.revealed = SNIFF_TIME;
      makeNoise(0.03);
      Sfx.sniff();
    }
  }

  // ---- Snacks ----
  function eatEffects(x, y, points, special) {
    if (points) floaters.push({ x, y: y - 14, text: '+' + points, life: 0.9, color: special ? '#ffe066' : '#ffffff' });
    for (let i = 0, n = special ? 18 : 10; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 80;
      particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, life: 0.5, max: 0.5, color: special ? '#ffe066' : '#fff3a0', size: 2 });
    }
  }

  // Every snack eaten: points (times the combo), time, the counter, and a bit of fanfare
  function gainSnack(x, y, type) {
    const counted = !type.rare && !type.bonus, special = type.golden || type.rare;
    combo.n = combo.t > 0 ? combo.n + 1 : 1;
    combo.t = COMBO_TIME;
    combo.best = Math.max(combo.best, combo.n);
    const mult = Math.min(COMBO_MAX, combo.n), points = type.points * mult;
    score += points;
    timeLeft += type.time;
    if (counted) {
      world.found++;
      const img = SPRITES[type.sprite];
      if (img) flyIcons.push({ img, x: sx(x), y: sy(y) - 8, t: 0 });
      else hud.pop = 0.35;
    } else hud.bonus = 1.2;
    countSnackForPoop();
    dropCarry(); // can't eat with a stick in your mouth
    eatEffects(x, y, points, special);
    if (mult > 1) floaters.push({ x, y: y - 30, text: `SCHMOOP X${mult}!`, life: 1, color: COMBO_COLOURS[mult], scale: mult >= 4 ? 2 : 1 });
    if (!options.calm) fx.hitstop = special ? 0.09 : 0.045;
    if (type.rare) startZoomies();
    else if (type.golden) Sfx.golden();
    else Sfx.pickup(combo.n);
    if (counted && world.found === world.goal) lastSnackMoment();
  }
  // The last snack: slow-motion, a camera punch-in and confetti
  function lastSnackMoment() {
    if (!options.calm) { fx.slow = 0.8; fx.punch = 1.1; }
    for (let i = 0; i < 46; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 120 + Math.random() * 160;
      particles.push({ x: dog.x, y: dog.y - 24, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 320, life: 1.3, max: 1.3, size: 3, color: ['#ff6ad5', '#ffd84a', '#7fe08a', '#7ac8ff', '#ff8a4a'][i % 5] });
    }
  }

  function collectTreats() {
    for (const tr of world.treats) {
      if (tr.collected || tr.goneT > 0 || Math.hypot(tr.x - dog.x, tr.y - (dog.y - 8)) >= (tr.type.reach || PICKUP_REACH)) continue;
      tr.collected = true;
      if (tr.plant) tr.plant.ripe = false;
      gainSnack(tr.x, tr.y, tr.type);
    }
    world.treats = world.treats.filter(tr => !(tr.plant && tr.collected));
  }

  // Raincoat: put it on and the rain doesn't slow you down any more
  function collectPickups() {
    for (const p of world.pickups) {
      if (p.taken || dist(p, { x: dog.x, y: dog.y - 8 }) > PICKUP_REACH) continue;
      p.taken = true;
      if (p.kind === 'raincoat') {
        dog.coat = true;
        callout = { text: 'RAINCOAT ON!', life: 1.6, max: 1.6, colour: '#ffd84a' };
        eatEffects(p.x, p.y, 0, true);
        Sfx.golden();
      }
    }
  }

  // Garden: produce ripens on random plants and rots if nobody picks it in time
  function ripenProduce() {
    for (let tries = 0; tries < 12; tries++) {
      const p = pick(world.plants);
      if (p.ripe) continue;
      p.ripe = true;
      world.treats.push({
        x: p.x, y: p.y, type: CROP_SNACKS[p.crop], plant: p, life: 11 + Math.random() * 4,
        collected: false, revealed: 0, hidden: false, phase: Math.random() * Math.PI * 2,
      });
      for (let i = 0; i < 6; i++) particles.push({ x: p.x + (Math.random() - 0.5) * 16, y: p.y - 8, vx: 0, vy: -30 - Math.random() * 20, g: 0, life: 0.6, max: 0.6, color: '#b5ec78', size: 2 });
      return;
    }
  }

  function updateGarden(dt) {
    if (world.area !== 'garden') return;
    for (const tr of world.treats) {
      if (!tr.plant) continue;
      tr.life -= dt;
      if (tr.life <= 0) tr.plant.ripe = false;
    }
    world.treats = world.treats.filter(tr => !tr.plant || tr.life > 0);
    world.growT -= dt;
    if (world.growT <= 0 && world.treats.filter(tr => tr.plant).length < world.maxRipe) {
      world.growT = 0.8 + Math.random() * 1.6;
      ripenProduce();
    }
  }

  // ---- Beehive: honey drips into a puddle (bonus treat, refills); bees fly home now and then ----
  function updateHive(dt) {
    const h = world.hive;
    if (!h) return;
    if (!h.honey) { h.refill -= dt; if (h.refill <= 0) h.honey = true; }
    else if (Math.hypot(h.honeyX - dog.x, h.honeyY - (dog.y - 8)) < PICKUP_REACH) {
      h.honey = false;
      h.refill = 20;
      score += SNACKS.honey.points;
      timeLeft += SNACKS.honey.time;
      countSnackForPoop();
      eatEffects(h.honeyX, h.honeyY, SNACKS.honey.points, true);
      floaters.push({ x: h.honeyX, y: h.honeyY - 34, text: 'HONEY!', life: 1, color: '#f8c050' });
      hud.bonus = 1.2;
      Sfx.golden();
    }
    // Bees fly in every few seconds and buzz round the hive in jittery, unpredictable loops, so it's
    // hard to tell when the honey is safe. Now and then one wanders well away (that's your chance),
    // and after a while each one flies off again.
    h.beeT -= dt;
    const maxBees = { easy: 2, medium: 3, hard: 4 }[difficulty];
    if (h.beeT <= 0 && !world.night) { // the bees are asleep at night: the honey's safe
      h.beeT = 5 + Math.random() * 4;
      if (bees.length < maxBees) {
        const a = Math.random() * Math.PI * 2, r = 11 * TILE;
        bees.push({ x: h.x + Math.cos(a) * r, y: h.y + Math.sin(a) * r, t: Math.random() * 6, animT: 0, facing: 1,
          mode: 'arrive', tx: h.x, ty: h.y, targetT: 0, stay: 10 + Math.random() * 12 });
      }
    }
    const newTarget = b => {
      const roam = b.mode === 'hover' && Math.random() < 0.16; // sometimes it wanders off a long way
      const a = Math.random() * Math.PI * 2, r = (roam ? 5 + Math.random() * 3 : 0.5 + Math.random() * 2.2) * TILE;
      b.tx = h.x + Math.cos(a) * r; b.ty = h.y + 10 + Math.sin(a) * r * 0.8;
      b.targetT = roam ? 2.5 + Math.random() * 2 : 0.3 + Math.random() * 1.1;
      b.speed = (roam ? 2.6 : 2 + Math.random() * 2.5) * TILE;
    };
    beeBuzzT -= dt;
    for (const b of bees) {
      b.t += dt; b.animT += dt * 20;
      b.stay -= dt;
      if (b.mode === 'arrive' && Math.hypot(h.x - b.x, h.y - b.y) < TILE) { b.mode = 'hover'; newTarget(b); }
      else if (b.mode === 'hover') {
        b.targetT -= dt;
        if (b.targetT <= 0 || Math.hypot(b.tx - b.x, b.ty - b.y) < 6) newTarget(b);
        if (b.stay <= 0) { b.mode = 'leave'; const a = Math.random() * Math.PI * 2; b.tx = b.x + Math.cos(a) * 16 * TILE; b.ty = b.y + Math.sin(a) * 16 * TILE; b.speed = 3.5 * TILE; }
      }
      const dx = b.tx - b.x, dy = b.ty - b.y, d = Math.hypot(dx, dy) || 1;
      const speed = b.mode === 'arrive' ? 3.5 * TILE : b.speed;
      const wobble = Math.sin(b.t * 4) * 1.6 + Math.sin(b.t * 11.3) * 0.6; // weaving, jittery flight
      b.x += ((dx / d) + (-dy / d) * wobble * 0.5) * speed * dt;
      b.y += ((dy / d) + (dx / d) * wobble * 0.5) * speed * dt;
      if (Math.abs(dx) > 2) b.facing = dx >= 0 ? 1 : -1;
      if (b.mode === 'leave' && Math.hypot(b.x - h.x, b.y - h.y) > 14 * TILE) b.home = true;
      const toDog = Math.hypot(b.x - dog.x, b.y - (dog.y - 16));
      if (toDog < 6 * TILE && beeBuzzT <= 0) { Sfx.buzz(0.05 * (1 - toDog / (6 * TILE))); beeBuzzT = 0.25; }
      if (toDog < 14 && state === 'playing' && !(dog.beeGrace > 0)) { startSting(b); return; }
    }
    bees = bees.filter(b => !b.home);
  }

  // Bee stings: the first one really hurts (slowed right down, the sniff bar drained) but you carry
  // on; the second sends you to the vet and the level's over
  const BEE_SLOW = 0.2, BEE_SLOW_TIME = 5, BEE_GRACE = 2.5;
  function startSting(bee) {
    dog.stings = (dog.stings || 0) + 1;
    breakCombo();
    if (dog.chase) endChase();
    dog.zoomies = 0;
    Sfx.sting();
    if (dog.stings >= 2) {
      callout = { text: 'STUNG AGAIN!', life: 1.6, max: 1.6, colour: '#ff5a5a' };
      shake(6, 0.4);
      dog.moving = false;
      setState('stung');
      return;
    }
    // The first sting: a big YELP!, a hard shake and a freeze-frame, the screen flashing red
    callout = { text: 'YELP!', life: 1.5, max: 1.5, colour: '#ff3a3a' };
    floaters.push({ x: dog.x, y: dog.y + 26, text: "ONE MORE STING AND IT'S THE VET!", life: 2.6, color: '#ff9a9a', vy: 0 });
    shake(7, 0.5);
    if (!options.calm) fx.hitstop = 0.15;
    fx.redFlash = 1;
    dog.beeSlowT = BEE_SLOW_TIME;
    dog.beeGrace = BEE_GRACE;
    dog.hopT = 0.6;
    sniff.cooldown = SNIFF_COOLDOWN * 0.9; // the sniff bar all but empty
    if (bee) { // knocked back away from the bee
      const dx = dog.x - bee.x, dy = dog.y - 16 - bee.y, d = Math.hypot(dx, dy) || 1;
      moveEntity(dog, (dx / d) * 0.5 * TILE, (dy / d) * 0.5 * TILE);
    }
    for (let i = 0; i < 10; i++) particles.push({ x: dog.x, y: dog.y - 30, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 60, g: 160, life: 0.6, max: 0.6, color: i % 2 ? '#ff4a4a' : '#ffd84a', size: 2 });
    // the bees nearby buzz back off to the hive for a moment
    const h = world.hive;
    for (const b of bees) if (h && Math.hypot(b.x - dog.x, b.y - dog.y) < 4 * TILE) { b.mode = 'arrive'; b.tx = h.x; b.ty = h.y; }
  }
  function updateStung(dt) {
    dog.animT += dt * 12;
    dog.hop = -Math.abs(Math.sin(stateT * 10)) * 10 * Math.max(0, 1 - stateT);
    updateEffects(dt);
    if (stateT > 1.4) { dog.hop = 0; startVetTrip(); }
  }

  // ---- Sprinklers: every 30 seconds they spray for a few seconds; get wet and you slow down ----
  function updateSprinklers(dt) {
    if (!world.sprinklers.length) return;
    world.sprinklerT -= dt;
    if (world.sprinklerT <= 0 && !world.sprinklersOn) { world.sprinklersOn = true; world.soaked = false; Sfx.sprinkler(); }
    if (world.sprinklersOn) {
      for (const sp of world.sprinklers) {
        for (let k = 0; k < 3; k++) { // spray arcs
          const a = t * 3 + k * 2.1 + sp.x;
          particles.push({ x: sp.x, y: sp.y - 6, vx: Math.cos(a) * SPRINKLER_RADIUS * 1.1, vy: Math.sin(a) * SPRINKLER_RADIUS * 0.6 - 30, g: 120, life: 0.55, max: 0.55, color: k % 2 ? '#a8d4f8' : '#ffffff', size: 2 });
        }
        if (Math.hypot(sp.x - dog.x, sp.y - dog.y) < SPRINKLER_RADIUS && state === 'playing') {
          if (!world.soaked) { floaters.push({ x: dog.x, y: dog.y - 56, text: 'SOAKED!', life: 1, color: '#9ad0ff' }); breakCombo(); shake(2); }
          world.soaked = true;
          dog.wet = Math.max(dog.wet, WET_TIME);
        }
      }
      if (world.sprinklerT <= -SPRINKLER_ON) { world.sprinklersOn = false; world.sprinklerT = SPRINKLER_EVERY; }
    }
  }
  function shakeOff() {
    dog.wet = 0;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      particles.push({ x: dog.x, y: dog.y - 18, vx: Math.cos(a) * 90, vy: Math.sin(a) * 60 - 20, g: 120, life: 0.5, max: 0.5, color: '#a8d4f8', size: 2 });
    }
    floaters.push({ x: dog.x, y: dog.y - 56, text: 'SHAKE SHAKE!', life: 0.9, color: '#a8d4f8' });
    Sfx.shake();
    if (state === 'playing' && !dog.seq && !dog.chase && dog.zoomies <= 0) startSeq('shake', 0.6);
  }

  // ---- The pool: running (or zooming) into the edge means a splash ----
  function checkPoolFall() {
    if (!(dog.sprinting || dog.zoomies > 0) || dog.stun > 0 || dog.poolCool > 0) return;
    const ax = dog.x + dog.dirX * (DOG_HW + 3), ay = dog.y - 4 + dog.dirY * 8;
    if (tileAtPx(ax, ay) !== T.POOL) return;
    dog.zoomies = 0;
    dog.stun = menace ? 0.8 : 1.4;
    // Climb out facing away from the water, with a moment's grace, so endless zoomies (Menace Run)
    // can't send the dog straight back in the moment the stun ends
    dog.dirX = -dog.dirX; dog.dirY = -dog.dirY; dog.dir = dirFrom(dog.dirX, dog.dirY, dog.dir);
    dog.poolCool = 1.5;
    dog.stunCause = 'POOL';
    dog.wet = 8;
    breakCombo();
    shake(3, 0.3);
    floaters.push({ x: dog.x, y: dog.y - 56, text: 'SPLASH!', life: 1.2, color: '#9ad0ff', scale: 2 });
    for (let i = 0; i < 24; i++) {
      const a = -Math.random() * Math.PI;
      particles.push({ x: ax, y: ay, vx: Math.cos(a) * 110, vy: Math.sin(a) * 140, g: 280, life: 0.8, max: 0.8, color: i % 2 ? '#a8d4f8' : '#ffffff', size: 2 });
    }
    Sfx.splash();
  }

  // ---- Cats: wander, follow (depends on difficulty) and swipe. Indoor cats may be asleep. ----
  function swipeDog(attacker, dx, dy, d, penalty, text, cause) {
    makeNoise(0.2);
    if (dog.chase) endChase();
    breakCombo();
    shake(3);
    loseTime(cause, penalty);
    dog.stunCause = cause;
    dog.zoomies = 0;
    dog.stun = 0.7;
    dog.path = null;
    moveEntity(dog, (dx / d) * 0.5 * TILE, (dy / d) * 0.5 * TILE);
    timeLeft = Math.max(0, timeLeft - penalty);
    floaters.push({ x: attacker.x, y: attacker.y - 34, text, life: 0.9, color: '#ff9a3a' });
    floaters.push({ x: dog.x, y: dog.y - 60, text: `-${penalty}S`, life: 1, color: '#ff5a5a' });
    for (let i = 0; i < 8; i++) particles.push({ x: dog.x, y: dog.y - 20, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, g: 0, life: 0.3, max: 0.3, color: '#ffffff', size: 2 });
  }

  function updateCats(dt) {
    const follow = diff().catFollow * TILE, catSpeed = diff().catSpeed;
    for (const cat of world.cats) {
      const dx = dog.x - cat.x, dy = dog.y - cat.y, d = Math.hypot(dx, dy) || 1;
      if (cat.asleep) {
        // Walk past and it stays asleep; run past (or zoom), or step on it, and it wakes up
        if ((d < 1.5 * TILE && (dog.sprinting || dog.zoomies > 0)) || d < 0.5 * TILE) {
          cat.asleep = false;
          cat.cooldown = 0.6;
          popups.push({ target: cat, life: 0.9, max: 0.9, height: 30 });
          floaters.push({ x: cat.x, y: cat.y - 34, text: 'MROW?!', life: 1, color: '#ff9a3a' });
          Sfx.hiss();
        } else continue;
      }
      cat.cooldown = Math.max(0, cat.cooldown - dt);
      cat.flee = Math.max(0, cat.flee - dt);
      cat.swipeT = Math.max(0, cat.swipeT - dt);
      if (dog.stinky > 0 && d < 4 * TILE) { // phwoar: a stinky dog sends cats packing
        if (cat.flee <= 0 && !cat.stunk) { floaters.push({ x: cat.x, y: cat.y - 34, text: 'EWW!', life: 0.9, color: '#9acd50' }); cat.stunk = true; }
        cat.flee = Math.max(cat.flee, 0.4);
      } else cat.stunk = false;
      let vx, vy;
      if (cat.flee > 0) { vx = (-dx / d) * 5 * TILE; vy = (-dy / d) * 5 * TILE; }
      else if (follow > 0 && d < follow && cat.cooldown === 0) { vx = (dx / d) * 2.1 * TILE * catSpeed; vy = (dy / d) * 2.1 * TILE * catSpeed; }
      else {
        cat.t -= dt;
        if (cat.t <= 0) {
          cat.t = 1 + Math.random() * 2;
          const a = Math.random() * Math.PI * 2, still = Math.random() < 0.4;
          cat.vx = still ? 0 : Math.cos(a) * 1.4 * TILE;
          cat.vy = still ? 0 : Math.sin(a) * 1.4 * TILE;
        }
        vx = cat.vx; vy = cat.vy;
      }
      const wall = moveEntity(cat, vx * dt, vy * dt, 7, 6);
      if (wall.x) cat.vx = -cat.vx;
      if (wall.y) cat.vy = -cat.vy;
      cat.moving = vx !== 0 || vy !== 0;
      if (cat.moving) cat.dir = dirFrom(vx, vy, cat.dir);
      cat.animT += dt * (cat.moving ? 8 : 0);
      if (d < SWIPE_RANGE && cat.cooldown === 0 && dog.stun <= 0 && dog.poop <= 0 && dog.stinky <= 0 && !dog.seq) {
        cat.cooldown = 3;
        cat.flee = 1.5;
        cat.swipeT = 0.45;
        cat.dir = dx >= 0 ? 'right' : 'left';
        swipeDog(cat, dx, dy, d, CAT_PENALTY, 'HISS!', 'CATS');
        Sfx.hiss();
      }
    }
  }

  // ---- Robot vacuum: trundles about, bouncing off walls; bump into it and you're stunned ----
  function updateVacuums(dt) {
    for (const v of world.vacuums) {
      v.cooldown = Math.max(0, v.cooldown - dt);
      const len = Math.hypot(v.vx, v.vy) || 1;
      const wall = moveEntity(v, (v.vx / len) * 1.6 * TILE * dt, (v.vy / len) * 1.6 * TILE * dt, 11, 6);
      if (wall.x) v.vx = -v.vx + (Math.random() - 0.5) * 0.4;
      if (wall.y) v.vy = -v.vy + (Math.random() - 0.5) * 0.4;
      const dx = dog.x - v.x, dy = dog.y - v.y, d = Math.hypot(dx, dy) || 1;
      if (d < 20 && v.cooldown === 0 && dog.stun <= 0 && dog.poop <= 0) {
        v.cooldown = 2.5;
        swipeDog(v, dx, dy, d, 2, 'BONK!', 'VACUUM');
        Sfx.deny();
        if (anxious()) scare(2, 0.7, null);
      }
    }
  }

  // ---- The vet: chases you with a thermometer ----
  function updateVets(dt) {
    for (const v of world.vets) {
      v.cooldown = Math.max(0, v.cooldown - dt);
      const dx = dog.x - v.x, dy = dog.y - v.y, d = Math.hypot(dx, dy) || 1;
      let vx = 0, vy = 0;
      if (d < 5 * TILE && v.cooldown === 0) { vx = (dx / d) * 2.2 * TILE; vy = (dy / d) * 2.2 * TILE; }
      else {
        v.t -= dt;
        if (v.t <= 0) { v.t = 1.5 + Math.random() * 2; const a = Math.random() * Math.PI * 2; v.vx = Math.cos(a) * TILE; v.vy = Math.sin(a) * TILE; }
        vx = v.vx; vy = v.vy;
      }
      moveEntity(v, vx * dt, vy * dt, 12, 8);
      v.moving = Math.hypot(vx, vy) > 1;
      if (v.moving) v.dir = dirFrom(vx, vy, v.dir);
      v.animT += dt * (v.moving ? 7 : 0);
      if (d < 24 && v.cooldown === 0 && dog.stun <= 0 && dog.poop <= 0) {
        v.cooldown = 3;
        swipeDog(v, dx, dy, d, 3, 'TEMPERATURE CHECK!', 'THE VET');
        Sfx.yelp();
      }
    }
  }

  // ---- Pets in carriers at the vet: they bark and hiss now and then (Harley flinches) ----
  function updateCarriers(dt) {
    for (const c of world.carriers) {
      c.t -= dt;
      c.shake = Math.max(0, c.shake - dt);
      if (c.t <= 0) {
        c.t = 3 + Math.random() * 3;
        if (world.night && !(world.noise > 0.4 && dist(c, dog) < 6 * TILE)) continue; // asleep unless there's a racket nearby
        c.shake = 0.6;
        if (world.night) makeNoise(0.12); // and then they make it worse
        if (dist(c, dog) < 4 * TILE || world.night) {
          floaters.push({ x: c.x, y: c.y - 34, text: c.pet === 'cat' ? 'HISS!' : 'YAP YAP!', life: 0.8, color: '#ffb070' });
          if (c.pet === 'cat') Sfx.hiss(); else Sfx.woof();
          if (anxious() && dist(c, dog) < 3 * TILE) scare(2, 0.7, 'EEP!');
        }
      }
    }
  }

  // ---- Snake: the rare outdoor hazard and its mini-game ----
  function updateSnakeTrigger() {
    const sn = world.snake;
    if (!sn || sn.state !== 'idle' || dog.stun > 0 || dog.poop > 0 || state !== 'playing') return;
    if (dist(sn, dog) > SNAKE_RANGE) return;
    if (dog.chase) endChase();
    breakCombo();
    dog.zoomies = 0;
    dog.moving = false;
    dog.path = null;
    sn.state = 'fight';
    snakeGame = { t: SNAKE_TIME, bar: 0.3, last: null, phase: 'intro', phaseT: 0, flash: { L: 0, R: 0 }, shake: 0, woofs: 0 };
    dog.dir = sn.x >= dog.x ? 'right' : 'left';
    popups.push({ target: dog, life: 1, max: 1, height: 52 }, { target: sn, life: 1, max: 1, height: 26 });
    callout = { text: 'SNAKE!', life: 1.1, max: 1.1, colour: '#ff5a5a' };
    Sfx.snakeHiss();
    setState('snake');
    maybeIntro('snake', 'snake');
  }

  function updateSnake(dt) {
    const g = snakeGame, sn = world.snake;
    g.phaseT += dt;
    g.flash.L = Math.max(0, g.flash.L - dt);
    g.flash.R = Math.max(0, g.flash.R - dt);
    dog.animT += dt * 4;
    dog.barkPose = Math.max(0, dog.barkPose - dt);
    if (g.phase === 'intro') {
      // Harley freezes; Bobbin runs over and grabs it
      if (!anxious()) {
        const target = { x: sn.x - (dog.dir === 'right' ? 26 : -26), y: sn.y };
        if (dist(target, dog) > 4) walkToward(target.x, target.y, SPRINT_SPEED, dt);
        else dog.moving = false;
        dog.dir = sn.x >= dog.x ? 'right' : 'left';
      } else { dog.moving = false; dog.scared = 0.2; dog.scaredMult = 1; }
      if (g.phaseT > 1.1) { g.phase = 'fight'; g.phaseT = 0; dog.moving = false; }
    } else if (g.phase === 'fight') {
      g.t -= dt;
      g.bar = Math.max(0, g.bar - 0.125 * dt); // twice as much tapping to win as it used to be
      // Only alternating presses count
      for (const [key, codes] of [['L', LEFT], ['R', RIGHT]]) {
        if (!hit(...codes)) continue;
        g.flash[key] = 0.12;
        if (g.last !== key) {
          g.bar = Math.min(1, g.bar + 0.035);
          g.last = key;
          g.shake = key === 'L' ? -1 : 1;
          if (anxious()) {
            dog.barkPose = 0.2;
            if (++g.woofs % 2) {
              floaters.push({ x: dog.x + (Math.random() - 0.5) * 20, y: dog.y - 56, text: 'WOOF!', life: 0.6, color: '#ffffff', scale: 1 + Math.round(g.bar * 2) });
              Sfx.woof();
            }
          } else if (Math.random() < 0.4) {
            particles.push({ x: dog.x + (dog.dir === 'right' ? 22 : -22), y: dog.y - 8, vx: (Math.random() - 0.5) * 60, vy: -30, g: 120, life: 0.4, max: 0.4, color: '#c8b48a', size: 2 });
          }
        }
      }
      if (g.bar >= 1) { g.phase = 'win'; g.phaseT = 0; winSnake(); }
      else if (g.t <= 0) { g.phase = 'lose'; g.phaseT = 0; callout = { text: 'CHOMP!', life: 1.2, max: 1.2, colour: '#ff5a5a' }; shake(4, 0.35); Sfx.chomp(); Sfx.yelp(); }
    } else if (g.phase === 'win') {
      if (anxious()) { sn.x += (sn.x >= dog.x ? 1 : -1) * 2.5 * TILE * dt; sn.alpha = Math.max(0, 1 - g.phaseT / 1.5); }
      else sn.alpha = Math.max(0, 1 - Math.max(0, g.phaseT - 0.6) / 0.9);
      if (g.phaseT > 1.6) { world.snake = null; snakeGame = null; setState('playing'); }
    } else if (g.phase === 'lose') {
      if (g.phaseT > 1.3) snakeBite();
    }
    updateEffects(dt);
    updateCamera();
  }

  // Losing to the snake: it slithers off, you lose some time and limp for a while
  function snakeBite() {
    const sn = world.snake;
    for (let i = 0; i < 14; i++) particles.push({ x: sn.x, y: sn.y - 6, vx: (Math.random() - 0.5) * 90, vy: -30 - Math.random() * 50, g: 120, life: 0.6, max: 0.6, color: '#d8d0b8', size: 3 });
    world.snake = null;
    snakeGame = null;
    timeLeft = Math.max(0, timeLeft - SNAKE_BITE);
    loseTime('SNAKE BITE', SNAKE_BITE);
    dog.limp = 6;
    dog.stun = 0.6;
    dog.stunCause = 'SNAKE BITE';
    callout = { text: `BITTEN! -${SNAKE_BITE}S`, life: 1.6, max: 1.6, colour: '#ff5a5a' };
    floaters.push({ x: dog.x, y: dog.y - 60, text: 'LIMPING...', life: 1.4, color: '#ff9a9a' });
    setState('playing');
  }

  function winSnake() {
    world.snake.state = anxious() ? 'leaving' : 'beaten';
    score += 100;
    timeLeft += 5;
    callout = { text: 'BRAVE DOG!', life: 1.8, max: 1.8, colour: '#ffd84a' };
    floaters.push({ x: dog.x, y: dog.y - 64, text: '+100  +5S', life: 1.4, color: '#7fe08a' });
    Sfx.brave();
  }

  // ---- The dog park: other dogs wander about, come over to play, and pinch snacks ----
  function updateParkDogs(dt) {
    if (!world.parkDogs || menace || fetchGame) return; // in a Menace Run they're rivals (updateMenace); in Fetch, updateFetchPack
    for (const tr of world.treats) if (tr.goneT > 0) tr.goneT -= dt;
    for (const p of world.parkDogs) {
      p.cooldown = Math.max(0, p.cooldown - dt);
      p.animT += dt * (p.moving ? (p.fast ? 14 : 10) : 5);
      if (p.state === 'tug') continue; // updateTug moves it
      if (p.state === 'play') {
        p.playT -= dt; p.moving = false;
        if (p.playT <= 0) { p.state = 'wander'; p.cooldown = 6 + Math.random() * 4; }
        continue;
      }
      let vx = 0, vy = 0;
      if (p.state === 'toSnack') {
        const tr = p.snack;
        if (!tr || tr.collected || tr.goneT > 0) { p.state = 'wander'; continue; }
        const dx = tr.x - p.x, dy = tr.y - p.y, d = Math.hypot(dx, dy) || 1;
        vx = (dx / d) * 3 * TILE; vy = (dy / d) * 3 * TILE; p.fast = true;
        if (d < 14) { stealSnack(p, tr); continue; }
      } else {
        p.t -= dt; p.fast = false;
        if (p.t <= 0) {
          p.t = 1.5 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2, still = Math.random() < 0.35;
          p.vx = still ? 0 : Math.cos(a) * 1.6 * TILE; p.vy = still ? 0 : Math.sin(a) * 1.6 * TILE;
        }
        vx = p.vx; vy = p.vy;
        // Now and then one sniffs out a snack nearby and trots over to eat it (not the rope dogs: they wait for a game)
        if (p.rope && !p.tugDone) { vx *= 0.5; vy *= 0.5; }
        else if (p.cooldown === 0 && Math.random() < dt * 0.1) {
          const near = world.treats.filter(tr => !tr.collected && !(tr.goneT > 0) && !tr.type.rare && dist(tr, p) < 9 * TILE);
          if (near.length) {
            p.state = 'toSnack';
            p.snack = near.reduce((a, b) => (dist(a, p) < dist(b, p) ? a : b));
            floaters.push({ x: p.x, y: p.y - 58, text: 'SNIFF SNIFF', life: 0.8, color: '#fff3a0' });
          }
        }
      }
      const wall = moveEntity(p, vx * dt, vy * dt, 8, 6);
      if (wall.x && wall.y) { p.vx = -p.vx; p.vy = -p.vy; if (p.state === 'toSnack') p.state = 'wander'; }
      p.moving = Math.hypot(vx, vy) > 1;
      if (p.moving) p.dir = dirFrom(vx, vy, p.dir);
      if (state !== 'playing' || !dogFree()) continue;
      if (p.rope && !p.tugDone) { if (dist(p, dog) < TUG_RANGE) startTug(p); }
      else if (p.cooldown === 0 && dist(p, dog) < 0.9 * TILE) startGreet(p);
    }
  }
  // Another dog bounds over to say hello: you're held up while you sniff and play (Harley's shy)
  function startGreet(p) {
    p.state = 'play'; p.playT = 2.4; p.moving = false;
    p.dir = dog.x >= p.x ? 'right' : 'left';
    dog.greet = 2.4; dog.path = null; dog.moving = false;
    breakCombo();
    dog.dir = dog.x >= p.x ? 'left' : 'right';
    floaters.push({ x: (dog.x + p.x) / 2, y: dog.y - 60, text: anxious() ? 'EEP! HELLO...' : 'PLAYTIME!', life: 1.2, color: '#fff3a0' });
    Sfx.woof();
  }
  // A snack another dog ate turns up again somewhere else a few seconds later
  function stealSnack(p, tr) {
    floaters.push({ x: tr.x, y: tr.y - 24, text: 'CHOMP! STOLEN!', life: 1.2, color: '#ff9a7a' });
    Sfx.chomp();
    const spots = [];
    for (let i = 0; i < world.tiles.length; i++) if ([T.GRASS, T.PATH, T.FLOWER].includes(world.tiles[i])) spots.push(i);
    const i = pick(spots);
    tr.x = (i % world.W) * TILE + 16; tr.y = Math.floor(i / world.W) * TILE + 18;
    tr.goneT = 4; tr.revealed = 0; tr.hidden = false;
    p.state = 'wander'; p.cooldown = 8 + Math.random() * 6; p.snack = null;
  }
  function drawParkDog(p) {
    const side = p.dir === 'left' || p.dir === 'right';
    const tugging = state === 'tug' && tugGame && tugGame.opp === p;
    const holding = p.rope && !p.moving && side; // waiting with the rope: the tug strip (rope in its mouth)
    const set = SPRITES.parkDogs[p.key][p.state === 'play' || tugging ? (p.dir === 'left' ? 'left' : 'right') : p.dir];
    const anim = tugging ? (tugGame.phase === 'win' ? 'happy' : 'tug') : p.state === 'play' ? 'happy' : p.moving ? (p.fast ? 'sprint' : 'run') : holding ? 'tug' : 'idle';
    const frames = set[anim] || set.run || set.idle;
    const ft = anim === 'tug' ? t * (tugging && tugGame.phase === 'fight' ? 14 : 5) : p.animT;
    const img = frames[Math.floor(ft) % frames.length], crouch = tugging && tugGame.tell ? 2 : 0;
    ctx.drawImage(shadow(30, 7), sx(p.x - 15), sy(p.y - 4));
    ctx.drawImage(img, sx(p.x - DOG_FOOT_X), sy(p.y - DOG_FOOT_Y) + crouch);
    if (p.rope && p.moving && side) { // trotting about with the rope toy in its mouth
      const m = mouthOf(img, p.dir === 'left' ? -1 : 1);
      if (m) ctx.drawImage(p.dir === 'left' ? flipCached(SPRITES.toyRope) : SPRITES.toyRope, sx(p.x - DOG_FOOT_X) + m.x - 10, sy(p.y - DOG_FOOT_Y) + m.y - 8);
    }
    if (fetchGame && fetchGame.ball && fetchGame.ball.carrier === 'pack' && fetchGame.ball.packDog === p) {
      const m = side ? mouthOf(img, p.dir === 'left' ? -1 : 1) : p.dir === 'down' ? mouthOf(img, 0) : null;
      drawBall(sx(p.x - DOG_FOOT_X) + (m ? m.x : 32), sy(p.y - DOG_FOOT_Y) + (m ? m.y : 30));
    }
    if (state === 'playing' && p.rope && !p.tugDone && dist(p, dog) < 6 * TILE) speechBubble(sx(p.x), sy(p.y - 72) - Math.round(Math.abs(Math.sin(t * 3 + p.animT)) * 3), 'WANNA TUG?');
    if (tugging) drawRope(p);
  }

  // ---- Buried snacks (stop on a mound to dig): sand on the beach, soil everywhere else outdoors ----
  const DIG_TIME = 1.4;
  const MOUND = {
    sand: { hole: ['#b8995e', '#8a7040'], mound: ['#c8ad78', '#ecd8a8', '#fff6dc'], bits: ['#e6cf98', '#c8ad78'], empty: ['JUST A SHELL!', 'NOTHING HERE...', 'A BIT OF SEAWEED!'] },
    soil: { hole: ['#6a4428', '#3e2614'], mound: ['#7a5030', '#9a6a40', '#c09060'], bits: ['#7a5030', '#5a3a20'], empty: ['JUST A ROCK!', 'AN OLD BALL!', 'A WORM! EW!', 'NOTHING HERE...'] },
  };
  function updateDigs(dt) {
    if (!world.digs) return;
    for (const d of world.digs) d.revealed = Math.max(0, d.revealed - dt);
    const [ix, iy] = inputDir();
    const here = world.digs.find(d => !d.dug && Math.hypot(d.x - dog.x, d.y - (dog.y - 6)) < 16);
    const canDig = here && state === 'playing' && !ix && !iy && !dog.chase && dog.zoomies <= 0 && dog.stun <= 0 && dog.poop <= 0 && !(dog.greet > 0);
    if (!canDig) { if (dog.digging && !dog.digging.obj) dog.digging = null; return; }
    dog.digging = here;
    here.progress += dt;
    dog.moving = false;
    if (Math.random() < dt * 30) { // sand flying out behind
      const back = dog.dir === 'left' ? 1 : -1;
      particles.push({ x: dog.x + back * 14, y: dog.y - 6, vx: back * (40 + Math.random() * 60), vy: -60 - Math.random() * 50, g: 260, life: 0.5, max: 0.5, color: pick(MOUND[here.ground || 'sand'].bits), size: 2 });
    }
    if (here.progress >= DIG_TIME) {
      here.dug = true;
      dog.digging = null;
      if (here.type) {
        floaters.push({ x: here.x, y: here.y - 44, text: 'DUG IT UP!', life: 1, color: '#ffe066' });
        gainSnack(here.x, here.y - 6, here.type);
      } else {
        floaters.push({ x: here.x, y: here.y - 30, text: pick(MOUND[here.ground || 'sand'].empty), life: 1.1, color: '#cfd3e0' });
        Sfx.deny();
      }
    }
  }
  function drawDigs() {
    for (const d of world.digs || []) {
      const x = sx(d.x), y = sy(d.y);
      if (x < -20 || y < -20 || x > VIEW_W + 20 || y > VIEW_H + 20) continue;
      const m = MOUND[d.ground || 'sand'];
      if (d.dug) { // a hole with the dirt thrown round it
        ctx.fillStyle = m.hole[0]; ctx.beginPath(); ctx.ellipse(x, y, 11, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = m.hole[1]; ctx.beginPath(); ctx.ellipse(x, y + 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        continue;
      }
      const shake = dog.digging === d ? Math.round(Math.sin(t * 40)) : 0;
      if (d.ground === 'soil') { ctx.fillStyle = '#4a3018'; ctx.beginPath(); ctx.ellipse(x + shake, y + 2.5, 11, 4.5, 0, 0, Math.PI * 2); ctx.fill(); } // a darker base so it stands out on grass
      ctx.fillStyle = m.mound[0]; ctx.beginPath(); ctx.ellipse(x + shake, y + 1, 10, 4.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = m.mound[1]; ctx.beginPath(); ctx.ellipse(x - 2 + shake, y - 1, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = m.mound[2]; ctx.fillRect(x - 5 + shake, y - 2, 3, 1);
      if (d.ground === 'soil') { ctx.fillStyle = m.mound[0]; ctx.fillRect(x + 4 + shake, y - 2, 2, 2); ctx.fillRect(x - 9 + shake, y + 2, 2, 1); } // clods
      if (dog.digging === d) { // a progress bar while digging
        ctx.fillStyle = 'rgba(10,12,20,0.7)'; ctx.fillRect(x - 13, y - 64, 26, 5);
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(x - 12, y - 63, Math.round((24 * d.progress) / DIG_TIME), 3);
      }
    }
  }
  // ---- Stashes: run (A) into bins, box piles and baskets to knock them over; stand still beside a
  // sofa, dog bed or toy box to rummage through it. Some hide a snack (a sniff makes those glow). ----
  const RUMMAGE_TIME = 1.2;
  const RUMMAGE_EMPTY = {
    sofa: ['A TV REMOTE!', 'JUST COINS!', 'A LOST SOCK!'], armchair: ['JUST CRUMBS...', 'A HAIR TIE!'], dogBed: ['MY OLD TOY!', 'JUST FLUFF...'],
    toyBox: ['A SQUEAKY DUCK!', 'BLOCKS. BORING.'], shoeRack: ['STINKY SHOES!', 'A THONG!'], petBedDisplay: ['SO COMFY... NO SNACK'],
    hosePile: ['WHAT A MESS!'], hoseReel: ['WHAT A MESS!'], toolbox: ['SCREWS. NOPE.'], magazineRack: ['OLD MAGAZINES...'], laundryBasket: ['SMELLY SOCKS!', 'JUST TOWELS...'],
    wheelbarrow: ['JUST DIRT!', 'A TROWEL!'], towel: ['SAND. LOTS OF SAND.', 'A SUNNIES CASE!'], wardrobe: ['SOCKS! SO MANY SOCKS!', 'A JUMPER!'],
    dresser: ['SOCKS!', 'UNDIES! EW!'], fridge: ['NICE TRY.', "IT WON'T OPEN!"], garageFridge: ['NICE TRY.', "IT WON'T OPEN!"],
    esky: ['JUST ICE!', 'AN EMPTY CAN!'], bbq: ['TOO HOT!', 'OUCH! HOT!'],
  };
  const FLUFF = { sofa: '#d8c8a8', armchair: '#c8a878', dogBed: '#e8d8c0', toyBox: '#ff8a4a', shoeRack: '#6a4a3a', laundryBasket: '#ffffff' };
  const objRect = o => ({ l: o.tx * TILE, r: (o.tx + o.w) * TILE, t: o.ty * TILE, b: (o.ty + o.h) * TILE });
  function touching(o, pad) {
    const r = objRect(o);
    return dog.x > r.l - DOG_HW - pad && dog.x < r.r + DOG_HW + pad && dog.y > r.t - pad && dog.y < r.b + DOG_HW + pad;
  }
  function updateStashes(dt) {
    if (!world.stashes || !world.stashes.length) return;
    for (const st of world.stashes) st.revealed = Math.max(0, st.revealed - dt);
    if (state !== 'playing') return;
    const free = !dog.chase && dog.stun <= 0 && dog.poop <= 0 && !(dog.greet > 0) && !dog.seq;
    // Knock-overs: charging into one tips it over
    if (free && (dog.sprinting || dog.zoomies > 0)) {
      for (const st of world.stashes) {
        if (st.kind !== 'knock' || st.done || !touching(st.obj, 4)) continue;
        if (st.obj.kind === 'statue' && dog.zoomies <= 0) { // far too heavy... unless you've got the zoomies
          if (!world.statueHint) { world.statueHint = true; floaters.push({ x: dog.x, y: dog.y - 64, text: 'TOO HEAVY! (ZOOMIES?)', life: 1.6, color: '#fff3a0' }); }
          continue;
        }
        const r = objRect(st.obj), dx = (r.l + r.r) / 2 - dog.x, dy = (r.t + r.b) / 2 - dog.y, d = Math.hypot(dx, dy) || 1;
        if ((dx * dog.dirX + dy * dog.dirY) / d > 0.3) knockOver(st);
      }
    }
    // A gentle hint the first time you walk into one
    if (free && dog.moving && !dog.sprinting && !world.knockHint) {
      const st = world.stashes.find(s2 => s2.kind === 'knock' && !s2.done && touching(s2.obj, 2));
      if (st) { world.knockHint = true; floaters.push({ x: dog.x, y: dog.y - 64, text: `HOLD ${KEY_LABEL.run} AND CHARGE IT!`, life: 1.8, color: '#fff3a0' }); }
    }
    // Rummaging: standing still beside one
    const [ix, iy] = inputDir();
    const here = free && !dog.seq && !ix && !iy && dog.zoomies <= 0 ? world.stashes.find(st => (st.kind === 'rummage' || st.kind === 'reach') && !st.done && touching(st.obj, 6)) : null;
    if (!here) { if (dog.digging && dog.digging.obj) dog.digging = null; return; }
    if (dog.digging !== here) { dog.digging = here; dog.dir = (here.obj.tx + here.obj.w / 2) * TILE >= dog.x ? 'right' : 'left'; }
    here.progress += dt;
    dog.moving = false;
    if (Math.random() < dt * 18) {
      const r = objRect(here.obj), x = Math.max(r.l, Math.min(r.r, dog.x)), y = Math.max(r.t, Math.min(r.b, dog.y - 6));
      particles.push({ x, y: y - 10, vx: (Math.random() - 0.5) * 70, vy: -50 - Math.random() * 40, g: 160, life: 0.5, max: 0.5, color: FLUFF[here.obj.kind] || '#e8e0d0', size: 2 });
    }
    if (Math.floor(here.progress * 3) !== Math.floor((here.progress - dt) * 3)) Sfx.rummage();
    if (here.progress >= RUMMAGE_TIME) {
      here.done = true;
      dog.digging = null;
      const k = here.obj.kind;
      if (k === 'hosePile' || k === 'hoseReel') tangleHose(here.obj);
      if (k === 'bbq') naughty('bbq');
      if (here.type) {
        floaters.push({ x: here.x, y: here.y - 50, text: k === 'dogHouse' ? 'MY CHEW!' : 'FOUND ONE!', life: 1, color: '#ffe066' });
        gainSnack(dog.x, dog.y - 14, here.type);
      } else if (k === 'shoeRack' && !dog.carry) { // a shoe to show the owner
        floaters.push({ x: here.x, y: here.y - 40, text: 'A SHOE!', life: 1.2, color: '#ffe066' });
        dog.carry = { kind: 'shoe', x: dog.x, y: dog.y, angle: 0 };
        world.items = world.items || [];
        world.items.push(dog.carry);
      } else {
        floaters.push({ x: here.x, y: here.y - 40, text: pick(RUMMAGE_EMPTY[k] || ['NOTHING HERE...']), life: 1.2, color: '#cfd3e0' });
        if (k === 'bbq') { Sfx.yelp(); dog.scared = Math.max(dog.scared, 0.4); dog.scaredMult = 1; } else Sfx.deny();
      }
    }
  }
  // CRASH! It tips over away from the dog. Loud: sleeping cats nearby wake, the owner stirs, and
  // in the pet store the nearest staff member comes to see what happened.
  function knockOver(st) {
    st.done = true;
    const o = st.obj, r = objRect(o), cx = (r.l + r.r) / 2;
    o.tipped = Math.abs(dog.dirX) > 0.3 ? Math.sign(dog.dirX) : (cx >= dog.x ? 1 : -1);
    clearFootprint(o);
    shake(3, 0.25);
    Sfx.crash();
    if (world.hush) makeNoise(Math.min(0.25, Math.max(0, 0.98 - world.noise))); // loud, but one crash alone won't fill the meter
    else makeNoise(0.35);
    for (let i = 0; i < 18; i++) particles.push({ x: cx + (Math.random() - 0.5) * 20, y: r.b - 12, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 90, g: 260, life: 0.6, max: 0.6, color: pick(['#e8e0c8', '#a07850', '#7a9a5a', '#ffffff']), size: 2 });
    if (o.kind === 'sandcastle') {
      for (let i = 0; i < 26; i++) particles.push({ x: cx + (Math.random() - 0.5) * 24, y: r.b - 10, vx: (Math.random() - 0.5) * 180, vy: -50 - Math.random() * 110, g: 300, life: 0.7, max: 0.7, color: pick(['#e8d49a', '#d4b878', '#f4e6b8']), size: 2 });
      castleCries(o);
    }
    if (menace) { menaceCrash(o); return; }
    floaters.push({ x: cx, y: r.t - 20, text: o.kind === 'statue' ? 'TIMBERRR!' : o.kind === 'sandcastle' ? 'CRUNCH!' : 'CRASH!', life: 0.9, color: '#ffb040', scale: 2 });
    naughty(o.kind === 'statue' ? 'statue' : 'knock', cx, r.t + 20);
    if (o.kind === 'birdBath') for (let i = 0; i < 20; i++) particles.push({ x: cx, y: r.b - 20, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 80, g: 260, life: 0.7, max: 0.7, color: '#a8d4f8', size: 2 });
    for (const cat of world.cats) if (cat.asleep && Math.hypot(cat.x - cx, cat.y - r.b) < 6 * TILE) { cat.asleep = false; cat.cooldown = 0.6; floaters.push({ x: cat.x, y: cat.y - 34, text: '!', life: 0.8, color: '#ff9a3a' }); }
    if (world.staff) alertPatrol(dog.x, dog.y);
    if (st.type) {
      floaters.push({ x: cx, y: r.t - 40, text: o.kind === 'sandcastle' ? 'A SNACK IN THE SAND!' : 'A SNACK FELL OUT!', life: 1, color: '#ffe066' });
      gainSnack(dog.x + dog.dirX * 10, dog.y - 10, st.type);
    } else if (st.surprise === 'crab' && !world.mode) { // a crab bursts out of the sand and bolts (the dog can't resist)
      floaters.push({ x: cx, y: r.t - 40, text: 'A CRAB!', life: 1.1, color: '#ff8a5a', scale: 2 });
      world.critters.push({ kind: 'crab', x: cx + (Math.random() < 0.5 ? -10 : 10), y: r.b - 2, home: { x: cx, y: r.b }, state: 'idle', t: 0, animT: 0, facing: 1, hop: 0, wanderT: 0 });
      dog.immune = 0;
    } else if (o.kind === 'sandcastle') floaters.push({ x: cx, y: r.t - 40, text: pick(['JUST SAND!', 'SPLAT!', 'NOTHING BUT SAND!']), life: 1.1, color: '#cfd3e0' });
    else floaters.push({ x: cx, y: r.t - 40, text: pick(['JUST RUBBISH!', 'NOTHING TASTY...', 'OOPS!']), life: 1.1, color: '#cfd3e0' });
  }
  // ---- Beach-goers: swimmers drift along, the rest potter about where they are. Trot over a
  // sunbaker and they yelp "OH! SILLY DOG!"; flatten a kid's sandcastle and the kid bursts into tears
  // while the nearest grown-up wants to know whose dog that is. (Just for fun: no penalty.) ----
  function updateBeachPeople(dt) {
    const people = world.beachPeople;
    if (!people) return;
    for (const p of people) {
      p.t += dt;
      p.upT = Math.max(0, (p.upT || 0) - dt); p.cryT = Math.max(0, (p.cryT || 0) - dt); p.cool = Math.max(0, (p.cool || 0) - dt);
      if (p.say) { if (p.say.delay > 0) p.say.delay -= dt; else if ((p.say.t -= dt) <= 0) p.say = null; }
      if (p.kind === 'swim') {
        p.x += p.vx * dt;
        if (p.x < 3 * TILE || p.x > world.pxW - 3 * TILE) p.vx = -p.vx;
      } else if (p.kind === 'sun' && p.cool <= 0 && dog.moving && Math.abs(dog.x - p.x) < 30 && Math.abs(dog.y - p.y) < 14) {
        p.upT = 1.6; p.cool = 4; p.say = { text: 'OH! SILLY DOG!', t: 2 };
        Sfx.thud();
        for (let k = 0; k < 3; k++) prints.push({ x: p.x - 12 + k * 12, y: p.y - 2, life: 4, big: false });
        if (!p.mischief) { p.mischief = true; naughty('sunbaker', p.x, p.y - 30); }
      } else if (p.kind === 'kid' && p.cryT > 0 && Math.random() < dt * 10) { // tears flying off
        const side = Math.random() < 0.5 ? -1 : 1;
        particles.push({ x: p.x + side * 6, y: p.y - 22, vx: side * 50, vy: -40, g: 200, life: 0.5, max: 0.5, color: '#9ad0ff', size: 2 });
      }
    }
  }
  function castleCries(castle) {
    const people = world.beachPeople || [], kid = people.find(p => p.kind === 'kid' && p.castle === castle);
    if (!kid) return;
    kid.cryT = 5; kid.say = { text: 'WAAAH!', t: 2.5 };
    const grown = people.filter(p => p.kind === 'sun' || p.kind === 'read').sort((a, b) => Math.hypot(a.x - kid.x, a.y - kid.y) - Math.hypot(b.x - kid.x, b.y - kid.y))[0];
    if (grown && Math.hypot(grown.x - kid.x, grown.y - kid.y) < 16 * TILE) { grown.upT = 2.4; grown.say = { text: 'OH! WHOSE DOG IS THAT?', t: 2.4, delay: 0.5 }; }
  }
  function drawBeachPerson(p) {
    const set = SPRITES.beachPeople[p.look];
    let img;
    if (p.kind === 'swim') img = set.swim[Math.floor(p.t * 4) % 4];
    else if (p.kind === 'sun') img = set.sun[p.upT > 0 ? 2 : Math.floor(p.t * 0.8) % 6 === 0 ? 1 : 0];
    else if (p.kind === 'read') img = set.read[p.upT > 0 ? 2 : p.t % 6 < 0.5 ? 1 : 0];
    else img = set.kid[p.cryT > 0 ? 2 + Math.floor(p.t * 6) % 2 : Math.floor(p.t * 2) % 2];
    const bob = p.kind === 'swim' ? Math.round(Math.sin(p.t * 3) * 1.5) : 0;
    const x = sx(p.x - img.ax), y = sy(p.y - img.ay) + bob;
    if (p.kind === 'swim') { // a ring of ripples where they meet the water, and the odd one on a pool ring
      const wy = sy(p.y) + bob;
      if (p.ring) { ctx.fillStyle = '#e8403a'; ctx.fillRect(x + 2, wy - 6, img.width - 4, 5); ctx.fillStyle = '#ffffff'; for (let k = 4; k < img.width - 4; k += 8) ctx.fillRect(x + k, wy - 6, 3, 5); }
      ctx.drawImage(img, x, y);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      const w = img.width + 6 + Math.round(Math.sin(p.t * 4) * 2);
      ctx.fillRect(sx(p.x) - w / 2, wy, w, 1); ctx.fillRect(sx(p.x) - w / 2 + 3, wy + 2, w - 6, 1);
    } else {
      if (p.kind !== 'sun') ctx.drawImage(shadow(p.kind === 'kid' ? 18 : 26, 6), sx(p.x - (p.kind === 'kid' ? 9 : 13)), sy(p.y - 4));
      ctx.drawImage(img, x, y);
    }
  }
  function drawBeachTalk() { // speech bubbles go over everything
    for (const p of world.beachPeople || []) {
      if (!p.say) continue;
      if (p.say.delay > 0) continue;
      const img = SPRITES.beachPeople[p.look][p.kind][0];
      speechBubble(sx(p.x), sy(p.y - img.ay) - 18, p.say.text);
    }
  }
  // A knocked-over thing lies flat, so its tiles go back to the ground that was under it: anyone can
  // walk (and path) straight through the mess
  function clearFootprint(o) {
    for (let y = o.ty; y < o.ty + o.h; y++) for (let x = o.tx; x < o.tx + o.w; x++) {
      const i = y * world.W + x;
      if (x < 0 || y < 0 || x >= world.W || y >= world.H || world.tiles[i] !== T.FURN) continue;
      const u = world.under ? world.under[i] : 255;
      world.tiles[i] = u !== 255 && !SOLID[u] ? u : world.outdoor ? T.GRASS : T.FLOOR;
    }
  }
  // Trotting through a knocked-over thing kicks a little of the spill about (no slowdown, no noise)
  const DEBRIS = { birdBath: ['#a8d4f8', '#d8ecfc'], plants: ['#6a4a2a', '#4a7a3a'], urn: ['#6a4a2a', '#a08060'], sandcastle: ['#e8d49a', '#d4b878'] };
  function updateDebris(dt) {
    if (!dog.moving) return;
    for (const o of world.objects) {
      if (!o.tipped) continue;
      const r = objRect(o);
      if (dog.x < r.l || dog.x > r.r || dog.y < r.t || dog.y > r.b + 6) continue;
      o.rustleT = (o.rustleT || 0) - dt;
      if (o.rustleT > 0) continue;
      o.rustleT = 0.22;
      const cols = DEBRIS[o.kind] || ['#e8e0c8', '#a07850', '#cfc6b0'];
      for (let k = 0; k < 3; k++) particles.push({ x: dog.x + (Math.random() - 0.5) * 14, y: dog.y - 2, vx: (Math.random() - 0.5) * 70 + dog.dirX * 40, vy: -30 - Math.random() * 30, g: 220, life: 0.35, max: 0.35, color: pick(cols), size: 2 });
      Sfx.rustle();
    }
  }
  // A tipped-over thing is its sprite turned on its side
  const ROT_CACHE = new Map();
  function rotatedCached(img, dir) {
    const key = img, got = ROT_CACHE.get(key) || {};
    if (!got[dir]) {
      const c = document.createElement('canvas');
      c.width = img.height; c.height = img.width;
      const g = c.getContext('2d');
      if (dir > 0) g.setTransform(0, 1, -1, 0, img.height, 0); else g.setTransform(0, -1, 1, 0, 0, img.width);
      g.drawImage(img, 0, 0);
      got[dir] = c;
      ROT_CACHE.set(key, got);
    }
    return got[dir];
  }
  // Sniffed stashes glow, and rummaging shows a progress bar
  function drawStashes() {
    for (const d of world.digs || []) if (!d.dug && d.revealed > 0) drawSnackGlow({ x: d.x, y: d.y + 4, type: d.type, revealed: d.revealed, phase: d.phase });
    for (const st of world.stashes || []) {
      const x = sx(st.x), y = sy(st.y);
      if (x < -60 || y < -60 || x > VIEW_W + 60 || y > VIEW_H + 80) continue;
      if (!st.done && st.type && st.revealed > 0) {
        drawSnackGlow({ x: st.x, y: st.y - 14, type: st.type, revealed: st.revealed, phase: st.phase });
        ctx.globalAlpha = Math.min(1, st.revealed);
        ctx.drawImage(SPRITES[st.type.sprite], x - 7, y - 58 + Math.round(Math.sin(t * 4 + st.phase) * 2), 14, 14);
        ctx.globalAlpha = 1;
      }
      if (dog.digging === st) {
        ctx.fillStyle = 'rgba(10,12,20,0.7)'; ctx.fillRect(sx(dog.x) - 13, sy(dog.y) - 64, 26, 5);
        ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx(dog.x) - 12, sy(dog.y) - 63, Math.round((24 * st.progress) / RUMMAGE_TIME), 3);
      }
    }
  }

  // ---- The hose, dug at: it unravels into a tangled mess across the floor (and trips you up) ----
  function tangleHose(o) {
    const r = objRect(o);
    world.tangles.push({ x: (r.l + r.r) / 2 + (dog.x < (r.l + r.r) / 2 ? -24 : 24), y: r.b + 8, seed: Math.random() * 100 });
    naughty('hose', (r.l + r.r) / 2, r.b);
    Sfx.rummage(); Sfx.rummage();
  }
  function drawTangles() {
    for (const tg of world.tangles || []) {
      const x0 = sx(tg.x), y0 = sy(tg.y);
      if (x0 < -60 || x0 > VIEW_W + 60 || y0 < -40 || y0 > VIEW_H + 40) continue;
      for (const [w, col] of [[4, '#0e3a12'], [2, '#3ea446']]) { // a dark edge, then the green hose
        ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
        for (let i = 0; i <= 60; i++) {
          const u = i / 60, a = u * Math.PI * 7 + tg.seed;
          const x = x0 - 40 + u * 80 + Math.cos(a) * 12 * Math.sin(u * Math.PI), y = y0 + Math.sin(a * 0.9) * 10 * Math.sin(u * Math.PI + 0.3);
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.fillStyle = '#c8a040'; ctx.fillRect(x0 + 38, y0 - 2, 4, 3); // the brass nozzle
    }
  }

  // ---- Ducks (when it rains outdoors): a mum and ducklings waddling in single file. Run (or bark)
  // at them and they scatter, quacking. They come back a while later. ----
  function updateDucks(dt) {
    const ducks = world.ducks || [];
    if (!ducks.length) {
      if (world.weather === 'rain' && world.outdoor && (world.duckT -= dt) <= 0 && world.duckHome) spawnDucks();
      return;
    }
    const lead = ducks[0];
    lead.t = (lead.t || 0) - dt;
    if (lead.t <= 0 || !lead.tx) { // pick somewhere new to potter off to
      lead.t = 3 + Math.random() * 3;
      for (let k = 0; k < 8; k++) {
        const a = Math.random() * Math.PI * 2, r = (1 + Math.random() * 3) * TILE, x = lead.x + Math.cos(a) * r, y = lead.y + Math.sin(a) * r;
        if (!blocked(x, y, 6, 4)) { lead.tx = x; lead.ty = y; break; }
      }
    }
    ducks.forEach((d, k) => {
      const target = k === 0 ? { x: lead.tx ?? d.x, y: lead.ty ?? d.y } : ducks[k - 1];
      const dx = target.x - d.x, dy = target.y - d.y, gap = Math.hypot(dx, dy);
      const want = k === 0 ? 2 : 14;
      d.moving = gap > want;
      if (d.moving) {
        const v = (k === 0 ? 0.8 : 1.1) * TILE * dt / gap;
        moveEntity(d, dx * v, dy * v, 5, 4);
        if (Math.abs(dx) > 1) d.dir = dx > 0 ? 'right' : 'left';
        d.step += dt * 6;
      }
    });
    world.duckHome = { x: lead.x, y: lead.y };
    const near = ducks.some(d => dist(d, dog) < 2.5 * TILE);
    if (state === 'playing' && near && (dog.sprinting || dog.zoomies > 0)) scatterDucks();
  }
  function scatterDucks() {
    if (!world.ducks || !world.ducks.length) return;
    for (const d of world.ducks) {
      const a = Math.atan2(d.y - dog.y, d.x - dog.x) + (Math.random() - 0.5) * 0.8;
      spawnFlyer('duck', d.x, d.y, Math.cos(a) * 4.5 * TILE, Math.sin(a) * 4.5 * TILE, { alt: 4, chick: d.chick, reacted: true, state: 'escaped', fade: 1.4 });
      for (let i = 0; i < 4; i++) particles.push({ x: d.x, y: d.y - 10, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 40, g: 60, life: 0.9, max: 0.9, color: d.chick ? '#ffec88' : '#b88a52', size: 2 });
    }
    floaters.push({ x: world.ducks[0].x, y: world.ducks[0].y - 30, text: 'QUACK QUACK!', life: 1.1, color: '#ffe066' });
    Sfx.quack();
    naughty('ducks', world.ducks[0].x, world.ducks[0].y);
    world.ducks = [];
    world.duckT = 25;
  }
  function spawnDucks() { // waddling back in
    const h = world.duckHome, size = 2 + Math.floor(Math.random() * 3);
    if (dist(h, dog) < 6 * TILE) { world.duckT = 4; return; }
    world.ducks = Array.from({ length: size }, (_, k) => ({ x: h.x - k * 16, y: h.y, chick: k > 0, dir: 'right', step: 0 }));
  }
  function drawDuck(d) {
    const img = SPRITES.duck[d.chick ? 'chick' : 'mum'][d.dir][d.moving ? Math.floor(d.step) % 2 : 0];
    ctx.drawImage(shadow(d.chick ? 10 : 16, 4), sx(d.x - (d.chick ? 5 : 8)), sy(d.y - 3));
    ctx.drawImage(img, sx(d.x - img.width / 2), sy(d.y - img.height + 2));
  }

  // ---- Smells: faint until you sniff; walk onto one and the dog rolls in it, belly up ----
  function updateSmells(dt) {
    for (const sm of world.smells || []) {
      sm.revealed = Math.max(0, sm.revealed - dt);
      if (sm.found || state !== 'playing' || !dogFree() || dist(sm, dog) > 16) continue;
      sm.found = true;
      dog.path = null;
      dog.dir = dog.dir === 'left' ? 'left' : 'right';
      startSeq('smell', 3.4, { smell: sm });
      popups.push({ target: dog, life: 0.9, max: 0.9, height: 52 });
      floaters.push({ x: dog.x, y: dog.y - 60, text: 'SNIFF SNIFF...', life: 0.9, color: '#c8e88a' });
      Sfx.sniff();
    }
  }
  function drawSmells() {
    for (const sm of world.smells || []) {
      if (sm.found) continue;
      const x = sx(sm.x), y = sy(sm.y);
      if (x < -30 || x > VIEW_W + 30 || y < -40 || y > VIEW_H + 30) continue;
      const strong = sm.revealed > 0, cycle = (t * 0.35 + sm.phase) % 1;
      // Normally just a faint wisp now and then; a sniff makes it plain
      const a = strong ? Math.min(1, sm.revealed) * 0.9 : cycle < 0.35 ? Math.sin((cycle / 0.35) * Math.PI) * 0.35 : 0;
      if (a <= 0) continue;
      ctx.globalAlpha = a;
      ctx.fillStyle = '#7aa83a';
      ctx.beginPath(); ctx.ellipse(x, y + 2, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#b8e070';
      for (let k = -1; k <= 1; k++) for (let i = 0; i < 7; i++) { // wavy stink lines rising
        const rise = (t * 18 + i * 3) % 22;
        ctx.fillRect(Math.round(x + k * 6 + Math.sin(t * 4 + i + k) * 2), Math.round(y - 4 - i * 3 - (strong ? rise * 0.3 : 0)), 2, 2);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---- Drinking: stand still at a water bowl, water station or bird bath to refill your RUN ----
  const DRINK_KINDS = ['waterBowl', 'waterStation', 'birdBath'];
  function updateDrink(dt) {
    const [ix, iy] = inputDir();
    const bowl = state === 'playing' && dogFree() && !ix && !iy && !dog.digging
      ? world.objects.find(o => DRINK_KINDS.includes(o.kind) && !o.tipped && touching(o, 8)) : null;
    dog.drinking = !!bowl;
    if (!bowl) { dog.drinkT = 0; return; }
    dog.drinkT += dt;
    if (dog.drinkT < 0.3) return;
    dog.dir = (bowl.tx + bowl.w / 2) * TILE >= dog.x ? 'right' : 'left';
    dog.stamina = Math.min(1, dog.stamina + dt * 0.8);
    if (dog.stamina > 0.35) dog.exhausted = false;
    if (Math.floor(dog.drinkT / 0.7) !== Math.floor((dog.drinkT - dt) / 0.7)) { floaters.push({ x: dog.x, y: dog.y - 50, text: 'SLURP', life: 0.6, color: '#a8d4f8' }); Sfx.slurp(); }
    if (Math.random() < dt * 10) particles.push({ x: dog.x + (dog.dir === 'left' ? -20 : 20), y: dog.y - 8, vx: (Math.random() - 0.5) * 30, vy: -30, g: 120, life: 0.3, max: 0.3, color: '#bfe6ff', size: 1 });
  }

  // ---- Sticks and shoes: walk over one to pick it up, carry it to the owner at home time ----
  function updateItems(dt) {
    if (menace) return; // Menace Run: sticks and shoes get shaken about instead (updateMenace)
    for (const it of world.items || []) {
      it.cool = Math.max(0, (it.cool || 0) - dt);
      if (it === dog.carry) { it.x = dog.x; it.y = dog.y; continue; }
      if (dog.carry || it.cool > 0 || state !== 'playing' || dist(it, dog) > 16 || !dogFree()) continue;
      dog.carry = it;
      floaters.push({ x: dog.x, y: dog.y - 60, text: it.kind === 'stick' ? 'A STICK! THE BEST STICK!' : 'GOT THE SHOE!', life: 1.1, color: '#ffe066' });
      Sfx.squeak();
    }
  }
  function dropCarry() {
    if (!dog.carry) return;
    dog.carry.cool = 1.2;
    dog.carry.y = dog.y + 6;
    dog.carry = null;
  }
  function drawGroundItem(it) {
    const x = sx(it.x), y = sy(it.y);
    if (it.kind === 'stick') drawStick(x, y - 2, it.angle || 0);
    else drawShoe(x, y - 4, 1);
  }
  function drawStick(x, y, angle, len = 30) {
    const c = Math.cos(angle), s2 = Math.sin(angle), hx = c * len / 2, hy = s2 * len / 2;
    ctx.strokeStyle = '#3a2410'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - hx, y - hy); ctx.lineTo(x + hx, y + hy); ctx.stroke();
    ctx.strokeStyle = '#8a5a2a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - hx, y - hy); ctx.lineTo(x + hx, y + hy); ctx.stroke();
    ctx.strokeStyle = '#6a4220'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x + hx * 0.3, y + hy * 0.3); ctx.lineTo(x + hx * 0.3 + 4, y + hy * 0.3 - 5); ctx.stroke(); // a twig
    ctx.fillStyle = '#6aa040'; ctx.fillRect(Math.round(x + hx * 0.3 + 4), Math.round(y + hy * 0.3 - 7), 3, 2); // and a leaf
  }
  function drawShoe(x, y, face) {
    ctx.fillStyle = '#2a2a3a'; ctx.fillRect(x - 9, y + 2, 18, 3);
    ctx.fillStyle = '#d84a4a'; ctx.fillRect(x - 8, y - 3, 14, 6); ctx.fillRect(x - 8 + (face > 0 ? 0 : 6), y - 6, 8, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 6, y - 1, 10, 1); ctx.fillRect(x - 8, y + 1, 16, 1);
  }
  // The carried thing, held in the mouth
  function drawCarry() {
    const it = dog.carry;
    if (!it || dog.seq || dog.stickInSprite) return;
    // Held in the jaws of the frame just drawn (found from its pixels, so it follows the head);
    // facing away, it's tucked behind the head
    const side = dog.dir === 'left' ? -1 : dog.dir === 'right' ? 1 : 0, at = dog.drawnAt;
    const m = at && dog.dir !== 'up' ? mouthOf(at.img, side) : null;
    const x = (at ? at.x : sx(dog.x - DOG_FOOT_X)) + (m ? m.x : DOG_FOOT_X), y = (at ? at.y : sy(dog.y - DOG_FOOT_Y)) + (m ? m.y : 30);
    if (it.kind === 'stick') drawStick(x + side * 4, y, side ? -0.08 * side : 0, 40);
    else if (it.kind === 'ball') drawBall(x + side * 2, y);
    else drawShoe(x, y, side || 1);
  }

  // ---- Bark (S): woof on demand. Scares off birds and ducks, sends awake cats packing, wakes
  // sleeping ones, and it's noisy. Hold it at night outdoors to howl at the moon. ----
  function updateBark(dt) {
    if (state !== 'playing') return;
    const can = !dog.seq && dog.poop <= 0 && dog.stun <= 0 && !dog.chase;
    if (hit(...BARK) && can && dog.barkCool <= 0) bark();
    if (down(...BARK) && can && world.night && world.outdoor && !dog.moving) {
      dog.howlHold += dt;
      if (dog.howlHold >= 0.6) { dog.howlHold = -99; startSeq('howl', 1.6); floaters.push({ x: dog.x, y: dog.y - 64, text: 'AWOOOOO!', life: 1.6, color: '#cfd8ff', scale: 2 }); Sfx.howl(); makeNoise(0.2); naughty('howl'); }
    } else if (!down(...BARK)) dog.howlHold = 0;
  }
  function bark() {
    dog.barkCool = 0.6;
    dog.woofT = WOOF_TIME;
    floaters.push({ x: dog.x + (Math.random() - 0.5) * 12, y: dog.y - 58, text: anxious() ? 'woof?' : 'WOOF!', life: 0.7, color: '#ffffff', scale: anxious() ? 1 : 2 });
    Sfx.woof();
    makeNoise(0.14);
    const R = 5 * TILE;
    let scattered = false;
    for (const f of flyers) {
      if (f.kind !== 'bird' || f.state === 'escaped' || f.state === 'gone' || dist(f, dog) > R) continue;
      if (f.state === 'perched') leavePerch(f);
      const a = Math.atan2(f.y - dog.y, f.x - dog.x);
      f.path = null; f.vx = Math.cos(a) * BIRD_SPEED; f.vy = Math.sin(a) * BIRD_SPEED; f.reacted = true;
      f.state = 'escaped'; f.fade = 0.8; scattered = true;
    }
    if (scattered) Sfx.flutter();
    for (const cat of world.cats) {
      if (dist(cat, dog) > (anxious() ? 2.5 : 4) * TILE) continue;
      if (cat.asleep) { cat.asleep = false; cat.cooldown = 0.6; floaters.push({ x: cat.x, y: cat.y - 34, text: 'MROW?!', life: 1, color: '#ff9a3a' }); }
      else cat.flee = Math.max(cat.flee, anxious() ? 0.8 : 1.6);
    }
    if ((world.ducks || []).some(d => dist(d, dog) < R)) scatterDucks();
  }

  // ---- Little scripted moments: rolling in a smell or mud, bouncing on the bed, a wet-dog shake,
  // howling. The dog can't be steered while one plays. ----
  function startSeq(kind, dur, extra = {}) {
    dog.seq = { kind, t: 0, dur, ...extra };
    dog.moving = false;
    dog.path = null;
    if (dog.dir === 'up' || dog.dir === 'down') dog.dir = 'right';
  }
  function updateSeq(dt) {
    const q = dog.seq, before = q.t;
    q.t += dt;
    dog.moving = false;
    dog.animT += dt * 6;
    const at = v => before < v && q.t >= v;
    if (q.kind === 'smell') {
      if (at(0.6)) { floaters.push({ x: dog.x, y: dog.y - 62, text: '!!', life: 0.8, color: '#ff8ad8', scale: 2 }); Sfx.happy(); }
      if (at(1.2)) { floaters.push({ x: dog.x, y: dog.y - 70, text: `${q.smell.label}! PERFECT!`, life: 1.6, color: '#c8e88a' }); naughty('smell'); }
      if (q.t > 1.2 && q.t < 3 && Math.random() < dt * 14) particles.push({ x: dog.x + (Math.random() - 0.5) * 34, y: dog.y - 6, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 30, g: 120, life: 0.5, max: 0.5, color: Math.random() < 0.5 ? '#9acd50' : '#c8b48a', size: 2 });
      if (at(3)) Sfx.shake();
    } else if (q.kind === 'mud') {
      if (q.t < 1.8 && Math.random() < dt * 16) particles.push({ x: dog.x + (Math.random() - 0.5) * 34, y: dog.y - 6, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 40, g: 240, life: 0.5, max: 0.5, color: '#42291a', size: 2 });
    } else if (q.kind === 'bed') {
      const u = q.t / q.dur;
      dog.hop = -Math.abs(Math.sin(u * Math.PI * 3)) * 16;
      if (Math.floor(u * 3) !== Math.floor((before / q.dur) * 3)) Sfx.squeak();
    }
    if (q.t >= q.dur) finishSeq(q);
  }
  function finishSeq(q) {
    dog.seq = null;
    dog.hop = 0;
    dog.immune = Math.max(dog.immune, 0.8);
    if (q.kind === 'shakeToy') finishShakeToy(q);
    if (q.kind === 'smell') { dog.stinky = STINKY_TIME; callout = { text: 'STINKY DOG!', life: 1.6, max: 1.6, colour: '#9acd50' }; }
    if (q.kind === 'mud') { dog.mudCoat = MUD_COAT_TIME; floaters.push({ x: dog.x, y: dog.y - 64, text: 'MUDDY DOG!', life: 1.2, color: '#c08a50' }); naughty('mud'); }
    if (q.kind === 'bed') { // hop back down in front of the bed, leaving it a mess
      q.bed.messy = true;
      dog.x = q.from.x; dog.y = q.from.y;
      naughty('bed');
    }
  }
  // Mud rolls (stand still in mud) and puddle splashes (run through one in the rain)
  function updateMudFun(dt) {
    if (state !== 'playing' || !world.outdoor) return;
    const [ix, iy] = inputDir();
    const [tx, ty] = tileOf(dog.x, dog.y), onMud = world.get(tx, ty) === T.MUD;
    if (onMud && dogFree() && !ix && !iy) {
      dog.mudT += dt;
      if (dog.mudT > 1) { dog.mudT = 0; startSeq('mud', 2.4); floaters.push({ x: dog.x, y: dog.y - 60, text: 'ROLL ROLL ROLL!', life: 1, color: '#c08a50' }); }
    } else dog.mudT = 0;
    if (onMud && world.weather === 'rain' && (dog.sprinting || dog.zoomies > 0) && !world.splashed.has(ty * world.W + tx)) {
      // one splash per puddle (counting its neighbouring tiles as the same puddle)
      for (let y = ty - 2; y <= ty + 2; y++) for (let x = tx - 2; x <= tx + 2; x++) world.splashed.add(y * world.W + x);
      for (let i = 0; i < 20; i++) { const a = -Math.random() * Math.PI; particles.push({ x: dog.x, y: dog.y - 2, vx: Math.cos(a) * 110, vy: Math.sin(a) * 120, g: 280, life: 0.6, max: 0.6, color: i % 2 ? '#8a6a4a' : '#a8c8e8', size: 2 }); }
      floaters.push({ x: dog.x, y: dog.y - 58, text: 'SPLASH!', life: 0.8, color: '#a8d4f8' });
      Sfx.splash(); Sfx.woof();
      naughty('splash');
    }
  }
  // Running onto the owner's bed (in the daytime house): bounce, bounce, bounce
  function updateBed() {
    if (state !== 'playing' || dog.seq || !(dog.sprinting || dog.zoomies > 0)) return;
    const bed = world.objects.find(o => o.kind === 'bed');
    if (!bed || !touching(bed, 4)) return;
    const r = objRect(bed), dx = (r.l + r.r) / 2 - dog.x, dy = (r.t + r.b) / 2 - dog.y, d = Math.hypot(dx, dy) || 1;
    if ((dx * dog.dirX + dy * dog.dirY) / d < 0.3) return;
    const from = { x: dog.x, y: dog.y };
    dog.zoomies = 0;
    startSeq('bed', 1.5, { bed, from });
    dog.x = (r.l + r.r) / 2; dog.y = r.t + (r.b - r.t) * 0.62;
    floaters.push({ x: dog.x, y: dog.y - 70, text: 'BOING! BOING!', life: 1.2, color: '#ff8ad8' });
  }

  function updateWaves(dt) {
    const w = world.waves;
    if (!w) return;
    w.t -= dt;
    if (w.t <= 0 && !w.on) { w.on = true; w.phase = 0; Sfx.splash(); }
    if (w.on) {
      w.phase += dt / 3.4; // it rolls up the sand and back down again
      w.reach = w.shore - Math.sin(Math.min(1, w.phase) * Math.PI) * (w.shore - w.wetTop);
      if (dog.y - 4 > w.reach && state === 'playing') {
        if (!w.soaked) { floaters.push({ x: dog.x, y: dog.y - 56, text: 'SPLASH! SOAKED!', life: 1, color: '#9ad0ff' }); breakCombo(); shake(2); }
        w.soaked = true;
        dog.wet = Math.max(dog.wet, WET_TIME);
      }
      if (w.phase >= 1) { w.on = false; w.t = w.period; w.soaked = false; }
    } else w.reach = w.shore - 4 - Math.sin(t * 1.3) * 4;
  }
  function drawWaves() {
    const w = world.waves;
    if (!w || w.reach === undefined) return;
    const top = sy(w.reach), bottom = sy(w.shore + 4);
    if (bottom < 0 || top > VIEW_H) return;
    ctx.fillStyle = 'rgba(70,150,215,0.55)';
    ctx.fillRect(0, top, VIEW_W, bottom - top);
    ctx.fillStyle = '#ffffff';
    for (let x = 0; x < VIEW_W; x += 2) { // a frothy, wiggly foam line
      const wob = Math.round(Math.sin((x + cam.x) * 0.08 + t * 3) * 2 + Math.sin((x + cam.x) * 0.21 - t * 2));
      ctx.fillRect(x, top + wob, 2, 2);
      if ((x + Math.floor(t * 20)) % 9 === 0) ctx.fillRect(x, top + wob + 4, 2, 1);
    }
  }

  // ---- The pet store: staff patrol the aisles; if one spots you they chase you, and if they catch
  // you it's off to the dog wash (you lose time and come out soaked) ----
  function followEntityPath(e, speed, dt) {
    if (!e.path || !e.path.length) return true;
    const p = e.path[0], dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy), step = speed * dt;
    if (d <= step) { e.x = p.x; e.y = p.y; e.path.shift(); } else { e.x += (dx / d) * step; e.y += (dy / d) * step; }
    e.dir = dirFrom(dx, dy, e.dir);
    e.moving = true;
    return !e.path.length;
  }
  // Who patrols: pet store staff by day, the guard (with a torch) by night, and the vet's janitor, who's
  // busy mopping and only notices a dog that comes too close
  const ROLES = {
    staff:   { sight: 5, sneak: 3, cone: true, walk: 1.6, run: 2.9, spot: 'HEY! NO DOGS BACK THERE!', lose: 'WHERE DID IT GO?', look: 'WHAT WAS THAT?!' },
    janitor: { sight: 2.2, sneak: 1.4, cone: false, walk: 1.1, run: 2.5, spot: 'HEY! MY CLEAN FLOOR!', lose: 'HMPH. DOGS...', look: "WHO'S THERE?" },
    guard:   { sight: 6, sneak: 3.5, cone: true, walk: 1.5, run: 3.0, spot: 'STOP RIGHT THERE!', lose: 'MUST HAVE BEEN THE WIND...', look: 'HELLO? WHO\'S THERE?' },
  };
  const roleOf = st => ROLES[st.role || 'staff'];
  const FACING = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  function nearestPatrol(x, y) {
    return (world.staff || []).filter(st => st.state === 'patrol').sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
  }
  // Something made a noise: the nearest one comes over to have a look
  function alertPatrol(x, y) {
    const st = nearestPatrol(x, y);
    if (!st) return;
    st.path = findPath(st.x, st.y, ...tileOf(x, y)) || st.path;
    st.waitT = 1.5;
    floaters.push({ x: st.x, y: st.y - 100, text: roleOf(st).look, life: 1.2, color: '#ff9a7a' });
  }
  function startStaffChase(st) {
    st.state = 'chase'; st.chaseT = 6; st.lost = 0; st.repath = 0;
    floaters.push({ x: st.x, y: st.y - 100, text: roleOf(st).spot, life: 1.2, color: '#ff9a7a' });
    Sfx.call();
    if (anxious()) scare(1.5, 0.7, 'EEP!');
  }
  // They see what's in front of them (the janitor: anything close), unless something's in the way
  function staffSees(st) {
    const R = roleOf(st), dx = dog.x - st.x, dy = dog.y - st.y, d = Math.hypot(dx, dy) || 1;
    if (d > (dog.sneaking ? R.sneak : R.sight) * TILE || dog.bathT > 0) return false; // harder to spot a sneaking dog
    const f = FACING[st.dir];
    if (R.cone && d > 1.2 * TILE && (dx * f[0] + dy * f[1]) / d < 0.35) return false;
    for (let k = 1; k < 12; k++) if (solidAtPx(st.x + (dx * k) / 12, st.y - 8 + (dy * k) / 12)) return false;
    return !dog.inCover || d < 1.5 * TILE;
  }
  function updateStaff(dt) {
    if (!world.staff) return;
    dog.bathT = Math.max(0, (dog.bathT || 0) - dt);
    if (world.wetSpots) { for (const w of world.wetSpots) w.life -= dt; world.wetSpots = world.wetSpots.filter(w => w.life > 0); }
    for (const st of world.staff) {
      const R = roleOf(st);
      st.animT += dt * (st.moving ? 7 : 0);
      st.moving = false;
      const sees = state === 'playing' && staffSees(st);
      if (st.state === 'patrol') {
        if (sees) { startStaffChase(st); continue; }
        if (!st.path || !st.path.length) {
          st.waitT -= dt;
          if (st.waitT <= 0) {
            const wp = pick(world.staffPoints);
            st.path = findPath(st.x, st.y, wp.tx, wp.ty) || [];
            st.waitT = 1 + Math.random() * 2;
          }
        } else followEntityPath(st, R.walk * TILE, dt);
        // The janitor's mop leaves the floor wet (and slippery) behind him for a while
        if (st.role === 'janitor' && st.moving && (st.mopT -= dt) <= 0) {
          st.mopT = 0.7;
          const f = FACING[st.dir];
          world.wetSpots.push({ x: st.x - f[0] * 10, y: st.y - f[1] * 6 + 2, life: 14, r: 12 + Math.random() * 5 });
          if (world.wetSpots.length > 60) world.wetSpots.shift();
        }
      } else if (st.state === 'chase') {
        st.chaseT -= dt;
        st.lost = sees ? 0 : st.lost + dt;
        st.repath -= dt;
        if (st.repath <= 0) { st.repath = 0.4; st.path = findPath(st.x, st.y, ...tileOf(dog.x, dog.y)) || []; }
        if (st.path.length > 1 || dist(st, dog) > 20) followEntityPath(st, R.run * TILE, dt);
        if (dist(st, dog) < 22 && dog.stun <= 0 && state === 'playing') { catchDog(st); continue; }
        if (st.chaseT <= 0 || st.lost > 2) {
          st.state = 'patrol'; st.path = null; st.waitT = 1.2;
          floaters.push({ x: st.x, y: st.y - 100, text: R.lose, life: 1, color: '#cfd3e0' });
        }
      }
      if (st.torch) { // the guard's torch shines ahead of them
        const f = FACING[st.dir];
        st.torch.x = st.x + f[0] * 46; st.torch.y = st.y - 10 + f[1] * 46;
      }
    }
  }
  function catchDog(st) {
    if (dog.chase) endChase();
    dog.zoomies = 0; dog.path = null; dog.digging = null;
    if (st.role === 'janitor' || st.role === 'guard') { catchOut(st); return; }
    callout = { text: 'BATH TIME!', life: 1.6, max: 1.6, colour: '#9ad0ff' };
    timeLeft = Math.max(0, timeLeft - 3);
    breakCombo();
    shake(3);
    loseTime('BATH TIME', 3);
    dog.stunCause = 'BATH TIME';
    dog.x = world.washSpot.x; dog.y = world.washSpot.y;
    dog.stun = 1.8; dog.wet = 7; dog.bathT = 4; dog.dir = 'down';
    floaters.push({ x: dog.x, y: dog.y - 60, text: '-3S', life: 1, color: '#ff5a5a' });
    for (let i = 0; i < 26; i++) particles.push({ x: dog.x + (Math.random() - 0.5) * 30, y: dog.y - 20 - Math.random() * 20, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 40, g: 60, life: 0.9, max: 0.9, color: i % 3 ? '#ffffff' : '#bfe6ff', size: 3 });
    Sfx.splash(); Sfx.yelp();
    for (const s2 of world.staff) { s2.state = 'patrol'; s2.path = null; s2.waitT = 1.5 + Math.random(); }
    updateCamera();
  }

  // Caught by the janitor (a slosh of mop water) or the guard: put back out by the door
  function catchOut(st) {
    const janitor = st.role === 'janitor';
    callout = { text: janitor ? 'SHOO! SHOO!' : 'OUT YOU GO!', life: 1.6, max: 1.6, colour: '#ffb070' };
    timeLeft = Math.max(0, timeLeft - 3);
    breakCombo();
    shake(3);
    loseTime(janitor ? 'THE JANITOR' : 'THE GUARD', 3);
    dog.stunCause = janitor ? 'THE JANITOR' : 'THE GUARD';
    if (janitor) {
      dog.wet = 5;
      for (let i = 0; i < 20; i++) particles.push({ x: dog.x + (Math.random() - 0.5) * 24, y: dog.y - 20, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60, g: 260, life: 0.6, max: 0.6, color: '#a8c8d8', size: 2 });
      Sfx.splash();
    }
    dog.x = world.start.x; dog.y = world.start.y;
    dog.stun = 1.2; dog.bathT = 3; dog.dir = 'up';
    floaters.push({ x: dog.x, y: dog.y - 60, text: '-3S', life: 1, color: '#ff5a5a' });
    Sfx.yelp();
    for (const s2 of world.staff) { s2.state = 'patrol'; s2.path = null; s2.waitT = 1.5 + Math.random(); }
    updateCamera();
  }

  // ---- The house at night: running, barking and squeaky toys make noise. Enough noise wakes the
  // cats nearby, and a full meter wakes the owner (the round ends) ----
  // Noise hangs in the air: after any sound the meter holds for a moment before it starts to settle
  function makeNoise(a) {
    if (!world.hush || state !== 'playing') return;
    world.noise = Math.min(1, world.noise + a);
    world.noiseHold = NOISE_HOLD;
  }
  function updateNoise(dt) {
    if (!world.hush) return;
    // Walking makes a little, running a lot; once it's quiet for a moment, standing or sneaking lets it
    // settle (slowly)
    world.noiseHold = Math.max(0, (world.noiseHold || 0) - dt);
    world.stirT = Math.max(0, (world.stirT || 0) - dt);
    // Zoomies are kept quiet-ish here (SHHH!): on their own they can't fill the meter past ZOOMIE_NOISE_CAP
    const rate = dog.zoomies > 0 ? 0.12 : dog.sprinting ? 0.45 : dog.moving && !dog.sneaking ? 0.05 : world.noiseHold > 0 ? 0 : dog.sneaking ? -0.03 : -0.04;
    if (rate > 0) world.noiseHold = Math.max(world.noiseHold, 0.6);
    const cap = dog.zoomies > 0 ? Math.max(world.noise, ZOOMIE_NOISE_CAP) : 1;
    world.noise = Math.max(0, Math.min(cap, world.noise + rate * dt));
    if (world.stirs && world.noise < 0.2) { // settled back down: the strike's forgiven
      world.stirs = 0;
      floaters.push({ x: dog.x, y: dog.y - 60, text: 'PHEW... SETTLED', life: 1.2, color: '#9fd8ff' });
    }
    if (world.noise > 0.55) {
      for (const cat of world.cats) if (cat.asleep && dist(cat, dog) < 6 * TILE) {
        cat.asleep = false; cat.cooldown = 0.6;
        popups.push({ target: cat, life: 0.9, max: 0.9, height: 30 });
        floaters.push({ x: cat.x, y: cat.y - 34, text: 'MROW?!', life: 1, color: '#ff9a3a' });
        Sfx.hiss();
      }
    }
    // The vet and the pet store: noise brings the janitor or guard to look; a racket sets them running
    if (world.hush === 'patrol') {
      world.alertT = Math.max(0, (world.alertT || 0) - dt);
      if (world.noise >= 0.99 && state === 'playing') {
        const st = nearestPatrol(dog.x, dog.y);
        if (st) startStaffChase(st);
        world.noise = 0.45; world.alertT = 3;
      } else if (world.noise >= 0.6 && world.alertT <= 0) {
        alertPatrol(dog.x, dog.y);
        world.alertT = 4;
      }
      return;
    }
    if (world.noise >= 0.99 && state === 'playing' && !world.stirs) { // first time: they stir, but stay asleep
      world.stirs = 1; world.noise = 0.7; world.stirT = 1.6; world.noiseHold = 1.5;
      callout = { text: 'MMPH...?', life: 1.6, max: 1.6, colour: '#cfd8ff' };
      shake(2, 0.3);
      Sfx.stir();
      return;
    }
    if (world.noise >= 0.99 && state === 'playing') {
      world.woken = true;
      callout = { text: "WHO'S UP?!", life: 1.6, max: 1.6, colour: '#ffd84a' };
      startHomeTime(false);
    }
  }

  // ==== The special levels: MENACE RUN, FETCH and BEG ====
  // Menace Run: 30 seconds of zoomies; crash into as much as you can, racing the other dog(s).
  // Fetch: the owner spins round and flings the ball; race the other dog to it and bring it back.
  // Beg: sit and look cute beside people for snacks (or pinch an unattended plate).
  const MENACE_TIME = 30, MENACE_STARS = [10, 18, 28];
  const MENACE_PTS = { wheelieBin: 20, statue: 30, boxesWide: 15 };
  const RIVAL_THINK = { easy: 0.9, medium: 0.5, hard: 0.25 }, RIVAL_SPEED = { easy: 0.8, medium: 0.88, hard: 0.96 };
  const FETCH_THROWS = 5, FETCH_LIMIT = 25;
  const FETCH_AIM = { easy: 5, medium: 3, hard: 1.2 }, FETCH_DELAY = { easy: 0.8, medium: 0.4, hard: 0.15 }, FETCH_SPEED = { easy: 0.74, medium: 0.84, hard: 0.94 };
  const BEG_TIME = { easy: 100, medium: 90, hard: 75 }, BEG_HOLD = 1.2, BEG_RANGE = 1.6 * TILE, BEG_PINCHES = 3, BEG_RETRY = 6;
  let menace = null, fetchGame = null, beg = null;
  const otherDogId = () => DOG_ORDER.find(id => id !== dogId);

  function setupMode() {
    menace = fetchGame = beg = null;
    world.rivalDog = null;
    if (world.mode) world.tugDog = null; // no tug of war in the special levels
    if (world.mode && world.weather === 'rain') dog.coat = true; // no raincoat hunt in a special level: dressed for it already
    if (world.mode === 'menace') {
      timeLeft = MENACE_TIME;
      const rivals = [];
      if (world.parkDogs && world.parkDogs.length) {
        for (const p of world.parkDogs) Object.assign(p, { menace: true, score: 0, name: PARK_DOG_INFO[p.key].name, state: 'menace', rope: false });
        rivals.push(...world.parkDogs);
      } else {
        const sp = (world.menaceSpots && world.menaceSpots[0]) || { x: dog.x + 48, y: dog.y };
        world.rivalDog = { id: otherDogId(), x: sp.x, y: sp.y, dir: 'right', animT: 0, moving: false, score: 0, name: DOGS[otherDogId()].name };
        rivals.push(world.rivalDog);
      }
      for (const r of rivals) { r.thinkT = 0.5 + Math.random() * 0.6; r.target = null; r.path = null; }
      menace = { you: 0, shakes: 0, rivals };
      dog.zoomies = MENACE_TIME + 5;
      callout = { text: 'MENACE RUN!', life: 1.8, max: 1.8, rainbow: true };
      Sfx.zoomies();
    } else if (world.mode === 'fetch') {
      timeLeft = FETCH_LIMIT;
      const o = { x: world.fetchSpot.x, y: world.fetchSpot.y - 6, dir: 'down', animT: 0 };
      const r = { id: otherDogId(), x: o.x + 40, y: o.y + 26, dir: 'left', animT: 0, moving: false, score: 0, name: DOGS[otherDogId()].name };
      world.rivalDog = r;
      // At the dog park, every other dog wants the ball too
      const pack = (world.parkDogs || []).map(p => Object.assign(p, { state: 'fetch', rope: false, name: PARK_DOG_INFO[p.key].name, path: null, waitT: 0, cool: 0 }));
      fetchGame = { owner: o, rival: r, pack, hog: {}, round: 0, you: 0, them: 0, fastest: null, longest: 0, ball: null };
      startThrow();
    } else if (world.mode === 'beg') {
      timeLeft = BEG_TIME[difficulty];
      beg = { meter: 0, target: null, grumpyT: 0, grumpyAt: null, plate: null, plateT: 18 + Math.random() * 10, pinchesLeft: BEG_PINCHES, pinched: 0, caught: 0, drops: [], gull: null, gullT: 0, begged: 0, refused: 0 };
      for (const g of world.guests) { g.animT = Math.random() * 4; g.say = null; }

    }
  }

  // Walking along a found path (rivals and guests): returns true on arrival
  function walkPath(e, speed, dt) {
    if (!e.path || !e.path.length) { e.moving = false; return true; }
    const wp = e.path[0], dx = wp.x - e.x, dy = wp.y - e.y, d = Math.hypot(dx, dy);
    if (d < 5) { e.path.shift(); return !e.path.length; }
    const step = Math.min(d, speed * dt);
    moveEntity(e, (dx / d) * step, (dy / d) * step, 8, 6);
    e.moving = true;
    e.vx = dx / d; e.vy = dy / d;
    e.dir = dirFrom(dx, dy, e.dir);
    return false;
  }
  // The open tile next to an object to run at it from (in front first)
  function approachTile(o) {
    for (const [tx, ty] of [[o.tx, o.ty + o.h], [o.tx - 1, o.ty], [o.tx + o.w, o.ty], [o.tx, o.ty - 1]]) if (!SOLID[world.get(tx, ty)]) return [tx, ty];
    return null;
  }

  // ---- Menace Run ----
  function updateMenace(dt) {
    dog.zoomies = Math.max(dog.zoomies, 1); // never runs out
    dog.stamina = 1;
    // Sticks and shoes: grab one and shake it about
    if (!dog.seq) for (const it of world.items) {
      if (it.gone || dist(it, dog) > 22) continue;
      it.gone = true;
      startSeq('shakeToy', 1, { item: it });
      floaters.push({ x: dog.x, y: dog.y - 60, text: it.kind === 'shoe' ? 'A SHOE!' : 'A STICK!', life: 0.8, color: '#fff3a0' });
      Sfx.squeak();
      break;
    }
    for (const r of menace.rivals) updateMenaceRival(r, dt);
    if (timeLeft <= 0) finishMode();
  }
  function updateMenaceRival(r, dt) {
    r.animT += dt * (r.moving ? 16 : 5);
    r.fast = true;
    if (r.target && r.target.done) { r.target = null; r.path = null; }
    if (!r.target) {
      r.moving = false;
      r.thinkT -= dt;
      if (r.thinkT > 0) return;
      let best = null, bd = 1e9;
      for (const st of world.stashes) {
        if (st.done || st.kind !== 'knock' || st.obj.kind === 'statue' || st.noReach || menace.rivals.some(o => o !== r && o.target === st)) continue;
        const d = Math.hypot(st.x - r.x, st.y - r.y);
        if (d < bd) { bd = d; best = st; }
      }
      if (!best) return;
      const at = approachTile(best.obj);
      r.path = at ? findPath(r.x, r.y, at[0], at[1]) : null;
      if (!r.path) { best.noReach = true; return; }
      r.target = best;
    }
    const arrived = walkPath(r, ZOOMIES_SPEED * RIVAL_SPEED[difficulty], dt);
    const rc = objRect(r.target.obj), nx = Math.max(rc.l, Math.min(rc.r, r.x)), ny = Math.max(rc.t, Math.min(rc.b, r.y - 6));
    if (Math.hypot(nx - r.x, ny - (r.y - 6)) < 16 || arrived) {
      rivalKnock(r, r.target);
      r.target = null; r.path = null;
      r.thinkT = RIVAL_THINK[difficulty] * (0.6 + Math.random() * 0.8);
    }
    if (r.moving && Math.random() < dt * 20) particles.push({ x: r.x - r.vx * 14, y: r.y - 10, vx: -r.vx * 30, vy: -10, g: 0, life: 0.3, max: 0.3, size: 2, color: `hsl(${(t * 600 + r.x) % 360},80%,65%)` });
  }
  // A rival smashes something: same crash, but the point goes on its tally
  function rivalKnock(r, st) {
    st.done = true;
    const o = st.obj, rc = objRect(o), cx = (rc.l + rc.r) / 2;
    o.tipped = cx >= r.x ? 1 : -1;
    clearFootprint(o);
    if (o.kind === 'sandcastle') castleCries(o);
    r.score++;
    const near = Math.abs(cx - (cam.x + VIEW_W / 2)) < VIEW_W * 0.7 && Math.abs(rc.b - (cam.y + VIEW_H / 2)) < VIEW_H * 0.7;
    if (near) { Sfx.crash(); shake(1.5, 0.15); }
    for (let i = 0; i < 12; i++) particles.push({ x: cx + (Math.random() - 0.5) * 20, y: rc.b - 12, vx: (Math.random() - 0.5) * 140, vy: -40 - Math.random() * 90, g: 260, life: 0.6, max: 0.6, color: pick(['#e8e0c8', '#a07850', '#7a9a5a', '#ffffff']), size: 2 });
    floaters.push({ x: cx, y: rc.t - 16, text: `${r.name}: CRASH!`, life: 0.8, color: '#ffb3b3' });
  }
  // You smash something: points with the combo, and a big floater
  function menaceCrash(o) {
    combo.n = combo.t > 0 ? combo.n + 1 : 1;
    combo.t = COMBO_TIME;
    combo.best = Math.max(combo.best, combo.n);
    const mult = Math.min(COMBO_MAX, combo.n), pts = (MENACE_PTS[o.kind] || 10) * mult;
    menace.you++;
    score += pts;
    hud.pop = 0.35;
    const rc = objRect(o);
    floaters.push({ x: (rc.l + rc.r) / 2, y: rc.t - 34, text: `${pick(['CRASH!', 'SMASH!', 'KABOOM!', 'WALLOP!'])} +${pts}${mult > 1 ? ` X${mult}` : ''}`, life: 1, color: COMBO_COLOURS[mult], scale: 2 });
    if (!options.calm) fx.hitstop = 0.035;
  }
  function finishShakeToy(q) {
    const it = q.item;
    menace.shakes++;
    score += 15;
    floaters.push({ x: dog.x, y: dog.y - 64, text: 'SHAKE SHAKE! +15', life: 1, color: '#ffd84a' });
    for (let i = 0; i < 10; i++) particles.push({ x: dog.x + dog.dirX * 18, y: dog.y - 20, vx: dog.dirX * 120 + (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, g: 260, life: 0.6, max: 0.6, size: 2, color: it.kind === 'shoe' ? '#d84a4a' : '#8a5a2a' });
  }
  const menaceBoard = () => [{ name: 'YOU', score: menace.you, you: true }, ...menace.rivals.map(r => ({ name: r.name, score: r.score }))].sort((a, b) => b.score - a.score || (a.you ? -1 : 1));

  // ---- Fetch ----
  function startThrow() {
    const f = fetchGame;
    f.round++;
    f.phase = 'setup'; f.t = 0; f.ball = null;
    const o = f.owner;
    o.dir = 'down';
    dog.x = o.x - 40; dog.y = o.y + 26; dog.dir = 'right'; dog.moving = false; dog.path = null; dog.carry = null;
    const r = f.rival;
    r.x = o.x + 40; r.y = o.y + 26; r.dir = 'left'; r.moving = false; r.path = null; r.carrying = false; r.state = 'wait';
    f.pack.forEach((p, i) => { // the dog park lot sit in a row behind
      const x = o.x + (i - (f.pack.length - 1) / 2) * 44, y = o.y + 70;
      if (!SOLID[world.get(...tileOf(x, y))]) { p.x = x; p.y = y; }
      p.dir = 'up'; p.moving = false; p.path = null; p.fast = false;
    });
  }
  function updateFetch(dt) {
    const f = fetchGame, o = f.owner, r = f.rival, b = f.ball;
    f.t += dt;
    o.animT += dt * 4;
    r.animT += dt * (r.moving ? 14 : 5);
    for (const p of f.pack) p.animT += dt * (p.moving ? 14 : 5);
    if (f.phase === 'setup') {
      if (f.t > 1.8) { f.phase = 'spin'; f.t = 0; floaters.push({ x: o.x, y: o.y - 104, text: 'WHEEEE-', life: 1.6, color: '#fff3a0' }); Sfx.zoomies(); }
      return true; // the dogs sit and wait
    }
    if (f.phase === 'spin') {
      const turns = 3 * Math.pow(Math.min(1, f.t / 2.2), 1.6); // three turns, faster and faster
      o.dir = ['down', 'right', 'up', 'left'][Math.floor(turns * 4) % 4];
      if (f.t >= 2.2) launchBall();
      return true;
    }
    if (f.phase === 'cheer') {
      if (f.t > 1.6) { if (f.round >= FETCH_THROWS) finishMode(); else startThrow(); }
      return true;
    }
    // In flight, then on the ground or in someone's mouth
    if (b.flying) {
      b.u = Math.min(1, b.u + dt / b.dur);
      b.x = b.x0 + (b.tx - b.x0) * b.u; b.y = b.y0 + (b.ty - b.y0) * b.u;
      b.z = Math.sin(b.u * Math.PI) * b.peak + (1 - b.u) * 40;
      if (b.u >= 1) {
        b.flying = false; b.z = 0; b.landT = 0;
        b.hidden = world.get(Math.floor(b.x / TILE), Math.floor((b.y - 4) / TILE)) === T.BUSH;
        b.revealed = 1.2;
        Sfx.thud();
        for (let i = 0; i < 6; i++) particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5) * 60, vy: -30, g: 120, life: 0.4, max: 0.4, size: 2, color: '#c8e86a' });
      }
    } else b.landT += dt;
    b.revealed = Math.max(0, b.revealed - dt);
    timeLeft = Math.max(0, FETCH_LIMIT - f.timer); // the clock shows this throw's time
    if (sniff.active > SNIFF_TIME - 0.05) b.revealed = 4; // a sniff finds it
    f.timer += dt;
    // The other dog: heads for roughly where it went, searches about, then grabs it
    updateFetchRival(dt);
    updateFetchPack(dt);
    // You grab it by running onto it; steals by bumping the carrier (any dog can, at the dog park)
    const free = !b.flying && !b.carrier;
    const grabbers = [['you', dog], ['rival', r], ...f.pack.filter(p => p.cool <= 0).map(p => ['pack', p])];
    if (free) { const g = grabbers.find(([, e]) => dist(b, e) < 18); if (g) grabBall(g[0], g[1]); }
    b.stealCool = Math.max(0, (b.stealCool || 0) - dt);
    if (b.carrier && b.stealCool <= 0) {
      const c = fetchCarrier();
      const g = grabbers.find(([, e]) => e !== c && dist(e, c) < 22);
      if (g) {
        grabBall(g[0], g[1]);
        floaters.push({ x: (c.x + g[1].x) / 2, y: c.y - 60, text: 'STOLEN!', life: 1, color: '#ff9a5a', scale: 2 });
        Sfx.distract();
      }
    }
    if (b.carrier === 'pack') { // a dog park dog runs off with it, then gets bored and drops it
      const p = b.packDog;
      p.holdT += dt;
      f.hog[p.key] = (f.hog[p.key] || 0) + dt;
      b.x = p.x; b.y = p.y;
      if (p.holdT > 3.5) {
        b.carrier = null; b.packDog = null; p.cool = 2.5;
        b.revealed = 1.5;
        floaters.push({ x: p.x, y: p.y - 58, text: `${p.name} DROPPED IT!`, life: 1.1, color: '#fff3a0' });
      }
    } else if (b.carrier) {
      const c = fetchCarrier();
      b.x = c.x; b.y = c.y;
      if (Math.hypot(c.x - o.x, c.y - o.y) < 40) { // delivered!
        if (b.carrier === 'you') { f.you++; score += 50; f.fastest = f.fastest === null ? f.timer : Math.min(f.fastest, f.timer); } else f.them++;
        floaters.push({ x: o.x, y: o.y - 100, text: b.carrier === 'you' ? `GOOD DOG, ${dogInfo().name}!` : `GOOD DOG, ${r.name}!`, life: 1.6, color: b.carrier === 'you' ? '#7fe08a' : '#ffb3b3', scale: 2 });
        if (b.carrier === 'you') Sfx.brave(); else Sfx.deny();
        f.phase = 'cheer'; f.t = 0; f.ball = { ...b, carrier: null, x: o.x, y: o.y - 40, gone: true };
        dog.carry = null;
        return false;
      }
    }
    if (f.timer > FETCH_LIMIT) {
      floaters.push({ x: o.x, y: o.y - 100, text: 'NEVER MIND...', life: 1.6, color: '#cfd3e0', scale: 2 });
      f.phase = 'cheer'; f.t = 0; b.gone = true; dog.carry = null;
    }
    return false;
  }
  function launchBall() {
    const f = fetchGame, o = f.owner;
    // Somewhere reachable in the park, far away about half the time
    const { W, tiles } = world, [ox, oy] = tileOf(o.x, o.y);
    const dists = new Int16Array(tiles.length).fill(-1), q = [oy * W + ox];
    dists[q[0]] = 0;
    for (let i = 0; i < q.length; i++) for (const [dx, dy] of DIRS) { const j = q[i] + dy * W + dx; if (dists[j] === -1 && !SOLID[tiles[j]]) { dists[j] = dists[q[i]] + 1; q.push(j); } }
    const far = Math.random() < 0.5, pool = q.filter(i => far ? dists[i] >= 16 : dists[i] >= 7 && dists[i] < 16);
    const i = pick(pool.length ? pool : q.slice(-20));
    const tx = (i % W) * TILE + 16, ty = Math.floor(i / W) * TILE + 22;
    const len = Math.hypot(tx - o.x, ty - o.y);
    f.ball = { x: o.x, y: o.y - 2, x0: o.x, y0: o.y - 2, tx, ty, u: 0, dur: 0.6 + len / 600, peak: 60 + len * 0.25, z: 40, flying: true, carrier: null, revealed: 0, len };
    f.longest = Math.max(f.longest, Math.round(len / TILE));
    f.phase = 'race'; f.t = 0; f.timer = 0; timeLeft = FETCH_LIMIT;
    o.dir = dirFrom(tx - o.x, ty - o.y, 'down');
    floaters.push({ x: o.x, y: o.y - 104, text: 'OOPS!', life: 1, color: '#ffb040', scale: 2 });
    Sfx.swipe ? Sfx.swipe() : Sfx.thud();
    const r = f.rival, aim = FETCH_AIM[difficulty] * TILE, a = Math.random() * Math.PI * 2;
    r.guess = { x: tx + Math.cos(a) * aim * Math.random(), y: ty + Math.sin(a) * aim * Math.random() };
    r.state = 'delay'; r.waitT = FETCH_DELAY[difficulty] + (r.id === 'harley' ? 0.4 : 0); r.path = null;
    for (const p of f.pack) { p.waitT = 0.5 + Math.random() * 1.8; p.path = null; p.cool = 0; }
  }
  function updateFetchRival(dt) {
    const f = fetchGame, r = f.rival, b = f.ball, o = f.owner;
    const speed = SPRINT_SPEED * FETCH_SPEED[difficulty];
    if (b.carrier === 'rival') { // home with it
      if (!r.path || !r.path.length) { const [tx, ty] = tileOf(o.x, o.y + 30); r.path = findPath(r.x, r.y, tx, ty); }
      if (walkPath(r, speed, dt)) { const dx = o.x - r.x, dy = o.y - r.y, d = Math.hypot(dx, dy) || 1; moveEntity(r, (dx / d) * speed * dt, (dy / d) * speed * dt, 8, 6); r.moving = true; }
      return;
    }
    if (b.carrier === 'you' || b.carrier === 'pack') { // chase whoever has it to steal it
      const c = fetchCarrier();
      r.repathT = (r.repathT || 0) - dt;
      if (r.repathT <= 0) { r.repathT = 0.5; const [tx, ty] = tileOf(c.x, c.y); r.path = findPath(r.x, r.y, tx, ty); }
      walkPath(r, speed * 0.92, dt);
      return;
    }
    if (b.flying) return;
    if (r.state === 'delay') { r.waitT -= dt; if (r.waitT <= 0) r.state = 'guess'; return; }
    const smell = (difficulty === 'hard' ? 5 : 3.5) * TILE;
    if (dist(r, b) < smell) r.state = 'onIt';
    if (r.state === 'onIt') {
      r.repathT = (r.repathT || 0) - dt;
      if (r.repathT <= 0 || !r.path) { r.repathT = 0.6; const [tx, ty] = tileOf(b.x, b.y); r.path = findPath(r.x, r.y, tx, ty); }
      if (walkPath(r, speed, dt)) { const dx = b.x - r.x, dy = b.y - r.y, d = Math.hypot(dx, dy) || 1; moveEntity(r, (dx / d) * speed * dt, (dy / d) * speed * dt, 8, 6); r.moving = true; }
      return;
    }
    // Off to where it thinks the ball went, then a sniff about nearby
    if (!r.path) {
      const g = r.state === 'guess' ? r.guess : { x: r.guess.x + (Math.random() - 0.5) * 6 * TILE, y: r.guess.y + (Math.random() - 0.5) * 6 * TILE };
      const [tx, ty] = tileOf(g.x, g.y);
      r.path = SOLID[world.get(tx, ty)] ? null : findPath(r.x, r.y, tx, ty);
      if (!r.path) { r.guess = { x: b.x + (Math.random() - 0.5) * 8 * TILE, y: b.y + (Math.random() - 0.5) * 8 * TILE }; return; }
    }
    if (walkPath(r, speed, dt)) { r.path = null; r.state = 'search'; if (Math.random() < 0.3) floaters.push({ x: r.x, y: r.y - 56, text: 'SNIFF SNIFF', life: 0.7, color: '#fff3a0' }); }
  }
  function grabBall(who, pk = null) {
    const b = fetchGame.ball, r = fetchGame.rival;
    b.carrier = who; b.hidden = false; b.stealCool = 1.2; b.packDog = who === 'pack' ? pk : null;
    r.path = null; r.repathT = 0;
    if (pk) { pk.holdT = 0; pk.path = null; }
    if (who === 'you') { dog.carry = { kind: 'ball' }; floaters.push({ x: dog.x, y: dog.y - 60, text: 'GOT IT! BRING IT BACK!', life: 1.2, color: '#7fe08a' }); Sfx.pickup(1); }
    else { dog.carry = null; const c = pk || r; floaters.push({ x: c.x, y: c.y - 60, text: `${c.name} GOT IT!`, life: 1.2, color: '#ffb3b3' }); }
  }
  const fetchCarrier = () => { const b = fetchGame.ball; return b.carrier === 'you' ? dog : b.carrier === 'rival' ? fetchGame.rival : b.carrier === 'pack' ? b.packDog : null; };
  // The dog park lot: after a moment they all pile after the ball (or whoever has it); one with the
  // ball runs away from whoever's closest
  function updateFetchPack(dt) {
    const f = fetchGame, b = f.ball, speed = SPRINT_SPEED * FETCH_SPEED[difficulty] * 0.82;
    for (const p of f.pack) {
      p.cool = Math.max(0, p.cool - dt);
      p.fast = true;
      if (b.carrier === 'pack' && b.packDog === p) {
        const near = [dog, f.rival, ...f.pack.filter(q => q !== p)].reduce((a, c) => (dist(c, p) < dist(a, p) ? c : a));
        const dx = p.x - near.x, dy = p.y - near.y, d = Math.hypot(dx, dy) || 1;
        p.runA = (p.runA ?? Math.atan2(dy, dx)) + (Math.random() - 0.5) * dt * 3;
        const want = Math.atan2(dy / d, dx / d); p.runA += Math.sin(want - p.runA) * dt * 2;
        const vx = Math.cos(p.runA) * speed, vy = Math.sin(p.runA) * speed;
        const wall = moveEntity(p, vx * dt, vy * dt, 8, 6);
        if (wall.x || wall.y) p.runA += Math.PI / 2;
        p.moving = true; p.dir = dirFrom(vx, vy, p.dir);
        continue;
      }
      p.runA = null;
      if (b.flying || p.waitT > 0) { p.waitT -= dt; p.moving = false; continue; }
      const tgt = fetchCarrier() || b;
      p.repathT = (p.repathT || 0) - dt;
      if (p.repathT <= 0 || !p.path) { p.repathT = 0.7 + Math.random() * 0.3; const [tx, ty] = tileOf(tgt.x, tgt.y); p.path = findPath(p.x, p.y, tx, ty); }
      if (walkPath(p, p.cool > 0 ? speed * 0.5 : speed, dt)) { const dx = tgt.x - p.x, dy = tgt.y - p.y, d = Math.hypot(dx, dy) || 1; if (d > 6) { moveEntity(p, (dx / d) * speed * dt, (dy / d) * speed * dt, 8, 6); p.moving = true; p.dir = dirFrom(dx, dy, p.dir); } }
    }
  }

  // ---- Beg ----
  function updateBeg(dt) {
    beg.grumpyT = Math.max(0, beg.grumpyT - dt);
    for (const g of world.guests) updateGuest(g, dt);
    // Begging: hold W, standing still, right beside someone
    // (holding W stops the dog, so it doesn't matter if an arrow is still down)
    const holding = down(...BEG) && dogFree();
    const askable = g => (!g.begged || (g.begged === 'maybe' && g.retryT <= 0)) && g.state !== 'away';
    const near = holding ? world.guests.filter(g => askable(g) && guestDist(g) < BEG_RANGE).sort((a, b) => guestDist(a) - guestDist(b))[0] : null;
    if (near && near === beg.target) beg.meter += dt;
    else { beg.meter = near ? dt : 0; beg.target = near || null; }
    if (beg.target) {
      dog.dir = beg.target.x >= dog.x ? 'right' : 'left';
      beg.target.dir = dirFrom(dog.x - beg.target.x, dog.y - beg.target.y, beg.target.dir);
      if (beg.meter >= BEG_HOLD) resolveBeg(beg.target);
    } else if (hit(...BEG) && dogFree()) { // why it didn't work
      const by = world.guests.filter(g => g.state !== 'away' && guestDist(g) < BEG_RANGE * 1.3).sort((a, b) => guestDist(a) - guestDist(b))[0];
      const why = !by ? 'GET CLOSER TO SOMEONE!' : by.begged === 'maybe' ? 'GIVE THEM A MOMENT...' : by.begged ? 'ALREADY ASKED THEM!' : 'GET CLOSER TO SOMEONE!';
      floaters.push({ x: dog.x, y: dog.y - 56, text: why, life: 0.8, color: '#cfd3e0' });
    }
    // Given snacks land on the ground: eat them (before a seagull does)
    for (const d of beg.drops) {
      d.t += dt;
      if (!d.gone && d.t > 0.25 && dist(d, dog) < 18) {
        d.gone = true;
        gainSnack(d.x, d.y, d.type);
      }
    }
    if (beg.gull) updateGull(dt);
    beg.drops = beg.drops.filter(d => !d.gone);
    // Now and then someone at a table gets up and leaves their plate for a bit
    beg.plateT -= dt;
    if (!beg.plate && beg.plateT <= 0 && beg.pinchesLeft > 0) {
      const sitter = shuffle(world.guests.filter(g => g.state === 'sit')).find(g => dist(g, dog) > 4 * TILE);
      if (sitter) {
        const tb = sitter.seat.table, tr = objRect(tb);
        beg.plate = { x: (tr.l + tr.r) / 2 + (Math.random() - 0.5) * 16, y: tr.b - 6, lift: 18, sitter, t: 7, food: sitter.food };
        sitter.state = 'away'; sitter.awayT = 7;
        const spot = pick(world.guestSpots);
        sitter.path = findPath(sitter.x, sitter.y, spot.tx, spot.ty);
        beg.pinchesLeft--;
        floaters.push({ x: beg.plate.x, y: beg.plate.y - 40, text: 'A PLATE, LEFT ALONE...', life: 1.4, color: '#fff3a0' });
      }
      beg.plateT = 20 + Math.random() * 10;
    }
    if (beg.plate) {
      const p = beg.plate;
      p.t -= dt;
      if (Math.hypot(p.x - dog.x, p.y + 14 - dog.y) < 22 && dogFree()) pinchPlate(p);
      else if (p.t <= 0) beg.plate = null; // they came back
    }
  }
  // How far the dog is from a person: to the nearest point of their body (feet up to head), so
  // standing right on top of them in the picture always counts as close
  function guestDist(g) {
    const top = g.y - (g.kid ? 36 : 50), y = Math.max(top, Math.min(g.y, dog.y));
    return Math.hypot(g.x - dog.x, y - dog.y);
  }
  function resolveBeg(g) {
    beg.meter = 0; beg.target = null;
    const grumpy = beg.grumpyT > 0 && beg.grumpyAt && Math.hypot(g.x - beg.grumpyAt.x, g.y - beg.grumpyAt.y) < 8 * TILE;
    // The first time, plenty of people can't make up their mind (a ?): ask again in a few seconds
    if (!grumpy && !g.begged && Math.random() < (g.generous ? 0.25 : 0.35)) {
      g.begged = 'maybe'; g.retryT = BEG_RETRY;
      g.say = { text: pick(['HMM... MAYBE LATER?', 'OH... I DUNNO...', 'LET ME THINK ABOUT IT...']), t: 1.8 };
      Sfx.count();
      return;
    }
    if (g.generous && !grumpy) {
      g.begged = 'yes'; beg.begged++;
      g.say = { text: g.kid ? 'PUPPY! HAVE SOME!' : g.owner ? 'OH, GO ON THEN!' : pick(['OH LOOK HOW CUTE YOU ARE! HERE YOU GO!', 'AWW, WHO COULD SAY NO? HERE!', 'WHAT A GOOD DOG! HERE YOU GO!']), t: 2.2 };
      const dx = dog.x >= g.x ? 1 : -1;
      const drop = { x: dog.x + dx * 22, y: dog.y + 4, t: 0, type: { sprite: g.food.sprite, points: 15, time: 1 }, name: g.food.name };
      if (SOLID[tileAtPx(drop.x, drop.y - 4)]) drop.x = dog.x - dx * 22;
      beg.drops.push(drop);
      Sfx.happy();
      if (world.area === 'market' && !beg.gull && Math.random() < (world.remix ? 0.55 : 0.35)) startGull(drop);
    } else {
      g.begged = 'no'; beg.refused++;
      g.say = { text: grumpy ? 'NOT AFTER WHAT YOU DID!' : `NO WAY, THIS IS MY ${g.food.name}!`, t: 2 };
      Sfx.deny();
    }
  }
  function pinchPlate(p) {
    beg.plate = null;
    // Anyone close by, or looking this way, sees it (sneaking makes you harder to spot)
    const range = (dog.sneaking ? 3.5 : 6) * TILE;
    const seer = world.guests.find(g => g.state !== 'away' && (dist(g, dog) < 2.2 * TILE || (dist(g, dog) < range && facing(g, dog))));
    if (seer) {
      beg.caught++;
      seer.say = { text: 'HEY! BAD DOG!', t: 1.8 };
      timeLeft = Math.max(0, timeLeft - 5); loseTime('CAUGHT PINCHING', 5);
      beg.grumpyT = 10; beg.grumpyAt = { x: dog.x, y: dog.y };
      floaters.push({ x: dog.x, y: dog.y - 64, text: 'CAUGHT! -5S', life: 1.4, color: '#ff7a7a', scale: 2 });
      shake(2, 0.2); Sfx.deny(); breakCombo();
    } else {
      beg.pinched++;
      floaters.push({ x: dog.x, y: dog.y - 64, text: 'YOINK!', life: 1.2, color: '#ff8ad8', scale: 2 });
      gainSnack(dog.x, dog.y, { sprite: p.food.sprite, points: 20, time: 1 });
      naughty('pinch');
    }
    if (p.sitter.state === 'away') p.sitter.awayT = Math.min(p.sitter.awayT, 1);
  }
  // Is g facing towards e (within about 70 degrees)?
  function facing(g, e) {
    const v = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[g.dir] || [0, 1];
    const dx = e.x - g.x, dy = e.y - g.y, d = Math.hypot(dx, dy) || 1;
    return (dx * v[0] + dy * v[1]) / d > 0.35;
  }
  function updateGuest(g, dt) {
    g.animT += dt * (g.moving ? 8 : 2);
    if (g.retryT > 0) g.retryT -= dt;
    if (g.say) { g.say.t -= dt; if (g.say.t <= 0) g.say = null; }
    if (g === beg.target) { g.moving = false; return; } // stops to look at the cute dog
    const speed = 1.3 * TILE;
    if (g.state === 'sit') { g.moving = false; g.x = g.seat.x; g.y = g.seat.y; g.dir = g.say ? g.dir : 'up'; return; }
    if (g.state === 'away') {
      g.awayT -= dt;
      if (g.awayT <= 0) { // back to their seat
        if (!g.returning) { const [tx, ty] = tileOf(g.seat.x, g.seat.y); g.path = findPath(g.x, g.y, tx, ty); g.returning = true; }
        if (walkPath(g, speed, dt) || !g.path) { g.state = 'sit'; g.returning = false; }
      } else walkPath(g, speed, dt);
      return;
    }
    if (g.path && g.path.length) { walkPath(g, speed, dt); return; }
    g.moving = false;
    g.waitT -= dt;
    if (g.waitT <= 0) {
      g.waitT = 2 + Math.random() * 5;
      const spot = pick(world.guestSpots);
      if (spot && Math.random() < 0.7) g.path = findPath(g.x, g.y, spot.tx, spot.ty);
      else g.dir = pick(['down', 'left', 'right', 'up']);
    }
  }
  // The market seagull: swoops in for a snack you've just been given
  function startGull(drop) {
    const fromLeft = Math.random() < 0.5;
    beg.gull = { x: cam.x + (fromLeft ? -40 : VIEW_W + 40), y: cam.y + 30, drop, t: 0, state: 'in', dir: fromLeft ? 1 : -1 };
    floaters.push({ x: drop.x, y: drop.y - 50, text: 'SQUAWK! GRAB IT!', life: 1, color: '#ffffff' });
    Sfx.quack();
  }
  function updateGull(dt) {
    const g = beg.gull, d = g.drop;
    g.t += dt;
    if (g.state === 'in') {
      if (d.gone) { g.state = 'out'; return; }
      const dx = d.x - g.x, dy = d.y - 10 - g.y, dd = Math.hypot(dx, dy);
      const sp = 260 * dt;
      if (dd <= sp) {
        d.gone = true; g.state = 'out';
        floaters.push({ x: d.x, y: d.y - 40, text: 'HEY! THAT WAS FOR THE DOG!', life: 1.4, color: '#ff9a9a' });
        Sfx.quack();
      } else { g.x += (dx / dd) * sp; g.y += (dy / dd) * sp; g.dir = dx >= 0 ? 1 : -1; }
    } else {
      g.x += g.dir * 240 * dt; g.y -= 140 * dt;
      if (g.y < cam.y - 60) beg.gull = null;
    }
  }

  // ---- End of a special level: a results card of its own ----
  function finishMode() {
    if (state !== 'playing') return;
    Sfx.stopRain();
    let stars = 0, lines = [], title = 'WHAT A DOG!', placing = null;
    if (world.mode === 'menace') {
      const board = menaceBoard();
      placing = board.findIndex(b => b.you) + 1;
      stars = MENACE_STARS.filter(n => menace.you >= n).length;
      if (placing === 1 && menace.you >= MENACE_STARS[1]) stars = 3;
      title = placing === 1 ? 'TOP MENACE!' : placing === 2 ? 'RUNNER-UP!' : `${placing}TH PLACE`;
      lines = [`CRASHES ${menace.you}`, board.slice(0, 5).map((b, i) => `${i + 1}. ${b.name} ${b.score}`).join('   '), `THINGS SHAKEN ${menace.shakes}`];
    } else if (world.mode === 'fetch') {
      const f = fetchGame;
      stars = f.you >= 4 ? 3 : f.you >= 3 ? 2 : f.you >= 1 ? 1 : 0;
      title = f.you > f.them ? 'FETCH CHAMPION!' : f.you === f.them ? "IT'S A DRAW!" : `${f.rival.name} WINS!`;
      lines = [`BALLS  YOU ${f.you} - ${f.rival.name} ${f.them}`, f.fastest !== null ? `FASTEST FETCH ${f.fastest.toFixed(1)}S` : 'NO FETCHES THIS TIME', `LONGEST THROW ${f.longest} TILES`];
      const hog = Object.entries(f.hog).sort((x, y) => y[1] - x[1])[0];
      if (hog) lines.push(`BALL HOG: ${PARK_DOG_INFO[hog[0]].name} (${hog[1].toFixed(0)}S WITH IT)`);
    }
    const canContinue = stars >= 1;
    const roundPoints = score - levelStartScore;
    const prev = levelStats[level] || { pct: 0, stars: 0, best: 0 };
    const levelBest = stars > prev.stars || roundPoints > (prev.best || 0);
    if (levelBest) { levelStats[level] = { pct: Math.max(prev.pct, Math.round(stars / 3 * 100)), stars: Math.max(stars, prev.stars), best: Math.max(roundPoints, prev.best || 0) }; store.set(KEYS.levels, JSON.stringify(levelStats)); }
    if (canContinue && level < LEVEL_COUNT && level + 1 > unlocked) { unlocked = level + 1; store.set(KEYS.unlocked, String(unlocked)); }
    const newBest = score > best;
    if (newBest) { best = score; store.set(KEYS.best, String(best)); }
    result = { mode: world.mode, title, lines, placing, stars, levelBest, newBest, roundPoints, bonus: 0, canContinue, fail: false, found: 0, goal: 0, pct: 0,
      lostList: [], missed: 0, hidden: 0, where: [], bestCombo: combo.best, mischief: { ...mischief, acts: { ...mischief.acts } }, thuds: 0 };
    resultMenu.idx = canContinue ? 1 : 0;
    setState('roundOver');
  }

  // ---- Drawing the special levels ----
  function drawRivalDog() {
    const r = world.rivalDog;
    if (!r) return;
    const side = r.dir === 'left' || r.dir === 'right';
    let anim = r.moving ? (world.mode === 'menace' || (fetchGame && fetchGame.phase === 'race') ? 'sprint' : 'run') : 'idle';
    if (fetchGame && ['setup', 'spin', 'cheer'].includes(fetchGame.phase)) anim = 'happy';
    const dir = anim === 'happy' ? (r.dir === 'left' ? 'left' : 'right') : r.dir;
    const img = dogFrame(r.id, dir, anim, r.animT);
    ctx.drawImage(shadow(30, 7), sx(r.x - 15), sy(r.y - 4));
    ctx.drawImage(img, sx(r.x - DOG_FOOT_X), sy(r.y - DOG_FOOT_Y));
    if (fetchGame && fetchGame.ball && fetchGame.ball.carrier === 'rival') {
      const m = side ? mouthOf(img, r.dir === 'left' ? -1 : 1) : r.dir === 'down' ? mouthOf(img, 0) : null;
      drawBall(sx(r.x - DOG_FOOT_X) + (m ? m.x : 32), sy(r.y - DOG_FOOT_Y) + (m ? m.y : 30));
    }
  }
  function drawBall(x, y, r = 4) {
    ctx.fillStyle = '#3a4a10'; ctx.fillRect(Math.round(x - r - 1), Math.round(y - r), r * 2 + 2, r * 2);
    ctx.fillRect(Math.round(x - r), Math.round(y - r - 1), r * 2, r * 2 + 2);
    ctx.fillStyle = '#c8e83a'; ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2, r * 2);
    ctx.fillStyle = '#e8ff8a'; ctx.fillRect(Math.round(x - r + 1), Math.round(y - r + 1), 2, 2);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x - r + 1), Math.round(y), r * 2 - 2, 1); // the seam
  }
  function drawFetchOwner() {
    const f = fetchGame, o = f.owner;
    const set = SPRITES.owner[o.dir];
    const holding = f.phase === 'setup' || f.phase === 'spin';
    const img = f.phase === 'setup' ? SPRITES.owner.down.call[0] : set.idle[0];
    ctx.drawImage(shadow(30, 8), sx(o.x - 15), sy(o.y - 5));
    ctx.drawImage(img, sx(o.x - OWNER_FOOT_X), sy(o.y - OWNER_FOOT_Y));
    if (holding) drawBall(sx(o.x + (f.phase === 'setup' ? 14 : o.dir === 'left' ? -14 : 14)), sy(o.y - OWNER_FOOT_Y + (f.phase === 'setup' ? 6 : 50)));
    if (f.phase === 'setup' && f.t > 0.3) speechBubble(sx(o.x), sy(o.y - 112), 'DO YOU WANT THE BALL?');
  }
  function drawFetchBall() {
    const b = fetchGame.ball;
    if (!b || b.gone || b.carrier) return;
    ctx.drawImage(shadow(10, 3), sx(b.x - 5), sy(b.y - 2));
    if (b.hidden && !b.revealed) { // just a bit of yellow peeking out of the bush
      if (Math.floor(t * 2) % 3 === 0) { ctx.fillStyle = '#c8e83a'; ctx.fillRect(sx(b.x) - 1, sy(b.y - 10), 3, 2); }
      return;
    }
    drawBall(sx(b.x), sy(b.y - 6 - b.z));
    if (b.revealed > 0) {
      const a = Math.min(1, b.revealed) * (0.5 + 0.3 * Math.sin(t * 8));
      ctx.strokeStyle = `rgba(232,255,138,${a})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx(b.x), sy(b.y - 6), 12 + Math.sin(t * 6) * 2, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // An arrow at the screen edge pointing to something off-screen
  function edgeArrow(wx, wy, colour, label) {
    const x = wx - cam.x, y = wy - cam.y;
    if (x > 20 && x < VIEW_W - 20 && y > 30 && y < VIEW_H - 90) return;
    const cx = VIEW_W / 2, cy = (VIEW_H - 60) / 2, a = Math.atan2(y - cy, x - cx);
    const ex = Math.max(24, Math.min(VIEW_W - 24, cx + Math.cos(a) * 1000)), ey = Math.max(34, Math.min(VIEW_H - 96, cy + Math.sin(a) * 1000));
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
    ctx.fillStyle = '#2a2230'; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.fill();
    ctx.fillStyle = colour; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-6, -6); ctx.lineTo(-6, 6); ctx.fill();
    ctx.restore();
    if (label) drawText(ctx, label, ex, ey + 12, { align: 'center', color: colour });
  }
  function drawGuest(g) {
    const sheet = g.owner ? SPRITES.owner : SPRITES.guests[g.look];
    const set = sheet[g.dir || 'down'], frames = set[g.moving ? 'walk' : 'idle'] || set.idle;
    const img = frames[Math.floor(g.animT) % frames.length], k = g.kid ? 0.72 : 1;
    const w = Math.round(img.width * k), h = Math.round(img.height * k);
    ctx.drawImage(shadow(g.kid ? 22 : 30, 8), sx(g.x - (g.kid ? 11 : 15)), sy(g.y - 5));
    const seated = g.state === 'sit' ? 8 : 0; // sitting at the table: a bit lower
    ctx.drawImage(img, sx(g.x - OWNER_FOOT_X * k), sy(g.y - OWNER_FOOT_Y * k) + seated, w, h - seated);
    // What they're eating, in hand
    const food = SPRITES[g.food.sprite];
    if (food && g.state !== 'away' && !g.owner) ctx.drawImage(food, sx(g.x + (g.dir === 'left' ? -18 : 6) * k), sy(g.y - 46 * k) + seated, 14, 14);
    const top = sy(g.y - OWNER_FOOT_Y * k) + seated - 4;
    if (g.umbrella && g.state !== 'away') { // keeping dry: a brolly over their head
      const col = ['#e0303a', '#2a7ad8', '#3a9a3c', '#ffb040', '#a050d0'][g.look.charCodeAt(0) % 5], ux = sx(g.x + (g.dir === 'left' ? 4 : -4)), uy = top - 4;
      ctx.fillStyle = '#3a3030'; ctx.fillRect(ux, uy, 2, 22);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(ux - 17, uy + 1, 36, 3);
      ctx.fillStyle = col; ctx.fillRect(ux - 16, uy - 2, 34, 4); ctx.fillRect(ux - 12, uy - 6, 26, 4); ctx.fillRect(ux - 6, uy - 9, 14, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(ux - 10, uy - 5, 6, 2);
    }
    if (g.begged) iconBubble(sx(g.x), top, g.begged === 'yes' ? 'Y' : g.begged === 'maybe' ? '?' : 'X', g.begged === 'yes' ? '#3a9a3c' : g.begged === 'maybe' ? (g.retryT > 0 ? '#9a9aa8' : '#d08a10') : '#e0303a', g.begged === 'maybe' && g.retryT <= 0 ? Math.round(Math.abs(Math.sin(t * 5)) * 3) : 0);
    if (g.say) speechBubble(sx(g.x), top - 28, g.say.text);
    else if (beg.grumpyT > 0 && beg.grumpyAt && Math.hypot(g.x - beg.grumpyAt.x, g.y - beg.grumpyAt.y) < 8 * TILE && !g.begged) iconBubble(sx(g.x), top, '>:', '#e0303a');
  }
  function drawBegExtras() {
    if (beg.plate) {
      const p = beg.plate, img = SPRITES[p.food.sprite];
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx(p.x - 9), sy(p.y - p.lift) - 2, 18, 4);
      if (img) ctx.drawImage(img, sx(p.x - 8), sy(p.y - p.lift) - 14, 16, 16);
      if (Math.floor(t * 4) % 2) { ctx.fillStyle = '#fff3a0'; ctx.fillRect(sx(p.x + 8), sy(p.y - p.lift) - 16, 2, 2); }
    }
    for (const d of beg.drops) { const img = SPRITES[d.type.sprite]; if (img) ctx.drawImage(img, sx(d.x - 9), sy(d.y - 16), 18, 18); }
  }
  function drawGull() {
    const g = beg.gull;
    if (!g) return;
    const flap = Math.floor(t * 12) % 2, x = sx(g.x), y = sy(g.y);
    ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x - 6, sy(g.drop.y) - 2, 12, 3);
    ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 8, y - 3, 16, 6);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 7, y - 2, 14, 4);
    ctx.fillStyle = '#9aa2ae'; ctx.fillRect(x - 12, y - (flap ? 8 : 0), 8, 3); ctx.fillRect(x + 4, y - (flap ? 8 : 0), 8, 3);
    ctx.fillStyle = '#ffb040'; ctx.fillRect(x + g.dir * 8, y - 1, 3, 2);
  }
  function drawBunting() {
    for (const b of world.bunting || []) {
      const y = sy(b.y - 40);
      if (y < -20 || y > VIEW_H + 20) continue;
      ctx.fillStyle = '#5a4a3a';
      for (let x = b.x0; x < b.x1; x += 4) ctx.fillRect(sx(x), y + Math.round(Math.sin((x - b.x0) / (b.x1 - b.x0) * Math.PI * 6) * 3), 4, 1);
      const cols = ['#e0303a', '#ffd84a', '#3a9a3c', '#2e68b0', '#ff8ad8'];
      for (let x = b.x0 + 8, k = 0; x < b.x1 - 4; x += 14, k++) {
        const yy = y + Math.round(Math.sin((x - b.x0) / (b.x1 - b.x0) * Math.PI * 6) * 3);
        ctx.fillStyle = cols[k % cols.length];
        ctx.beginPath(); ctx.moveTo(sx(x) - 4, yy + 1); ctx.lineTo(sx(x) + 4, yy + 1); ctx.lineTo(sx(x), yy + 9); ctx.fill();
      }
    }
  }
  // The mode's bit of the HUD: the tally (Menace Run, Fetch) or the begging meter
  function renderModeHUD() {
    if (menace) {
      const board = menaceBoard(), x = VIEW_W - 150, y = touchOn() ? 50 : 22; // (below the pause button on a phone)
      ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fillRect(x, y, 144, 14 + Math.min(3, board.length) * 14);
      drawText(ctx, world.rivalDog ? 'THE RACE' : 'TOP MENACES', x + 8, y + 4, { color: '#ffd84a' });
      board.slice(0, 3).forEach((b, i) => {
        const colour = b.you ? '#7fe08a' : '#ffffff';
        drawText(ctx, `${i + 1}. ${b.name}`, x + 8, y + 18 + i * 14, { color: colour });
        drawText(ctx, String(b.score), x + 136, y + 18 + i * 14, { align: 'right', color: colour });
      });
    }
    if (fetchGame) {
      const f = fetchGame, x = VIEW_W - 170, y = touchOn() ? 50 : 22;
      ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fillRect(x, y, 164, 44);
      drawText(ctx, `THROW ${Math.min(f.round, FETCH_THROWS)} OF ${FETCH_THROWS}`, x + 8, y + 4, { color: '#ffd84a' });
      drawText(ctx, `YOU ${f.you}  -  ${f.rival.name} ${f.them}`, x + 8, y + 18, { scale: 1, color: '#ffffff' });
      if (f.phase === 'race' && f.ball && !f.ball.flying) drawText(ctx, `${Math.max(0, Math.ceil(FETCH_LIMIT - f.timer))}S LEFT`, x + 8, y + 31, { color: '#cfd3e0' });
      const b = f.ball;
      if (b && !b.gone && f.phase === 'race' && (b.revealed > 0 || b.carrier) && !(b.carrier === 'you')) edgeArrow(b.x, b.y, '#c8e83a', b.carrier ? f.rival.name : 'BALL');
      if (b && b.carrier === 'you') edgeArrow(f.owner.x, f.owner.y, '#ffd84a', 'BRING IT BACK!');
    }
    if (beg) {
      if (beg.meter > 0 && beg.target) { // the cute meter: a heart filling above the dog
        const x = sx(dog.x), y = sy(dog.y - 76), k = Math.min(1, beg.meter / BEG_HOLD);
        ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 21, y - 1, 42, 8);
        ctx.fillStyle = '#ff8ab5'; ctx.fillRect(x - 20, y, Math.round(40 * k), 6);
        drawText(ctx, k < 0.4 ? 'SIT...' : 'SO CUTE...', x, y - 12, { align: 'center', color: '#ffb3d0' });
      }
      if (beg.plate) edgeArrow(beg.plate.x, beg.plate.y, '#fff3a0', 'PLATE!');
    }
  }

  // ---- Tug of war with the other dog (backyards) ----
  // The other dog waits on the lawn with a rope, pottering about. Walk up to it to start: alternate
  // Left/Right to pull the knot to your side before time runs out. Just for fun: a win is a bonus.
  function updateTugDog(dt) {
    const o = world.tugDog;
    if (!o) return;
    o.animT += dt * (o.moving ? 11 : 4);
    if (o.state === 'leaving') {
      o.alpha -= dt * 0.8;
      moveEntity(o, o.vx * dt, 0, 8, 6);
      o.moving = true;
      if (o.alpha <= 0) world.tugDog = null;
      return;
    }
    if (o.state !== 'waiting') return;
    // Trots a few steps now and then, staying near its spot
    o.t -= dt;
    if (o.t <= 0) {
      o.t = 1.5 + Math.random() * 2.5;
      const back = Math.hypot(o.home.x - o.x, o.home.y - o.y) > 2 * TILE;
      const a = back ? Math.atan2(o.home.y - o.y, o.home.x - o.x) : Math.random() * Math.PI * 2;
      o.vx = Math.random() < 0.4 && !back ? 0 : Math.cos(a) * 1.6 * TILE;
      o.vy = o.vx === 0 ? 0 : Math.sin(a) * 1.6 * TILE;
      o.walkT = 0.6 + Math.random() * 0.6;
    }
    o.walkT = (o.walkT || 0) - dt;
    o.moving = o.walkT > 0 && (o.vx || o.vy);
    if (o.moving) { moveEntity(o, o.vx * dt, o.vy * dt, 8, 6); o.dir = dirFrom(o.vx, o.vy, o.dir); }
    else o.dir = dog.x >= o.x ? 'right' : 'left';
    if (state === 'playing' && dogFree() && dist(o, dog) < TUG_RANGE) startTug();
  }

  // The opponent is the other main dog (world.tugDog) or a dog-park dog with a rope (park: true)
  function startTug(o = world.tugDog) {
    if (dog.chase) endChase();
    dog.zoomies = 0;
    dog.path = null;
    dog.moving = false;
    o.state = 'tug';
    o.moving = false;
    // Line the dogs up side by side, facing each other across the rope
    const left = dog.x <= o.x;
    const park = !!o.key, info = park ? PARK_DOG_INFO[o.key] : null;
    tugGame = { opp: o, park, name: park ? info.name : DOGS[o.id].name, strength: park ? info.strength : 1, says: park ? info.says : 'WANTS TO PLAY!',
      t: TUG_TIME, pos: 0, last: null, phase: 'intro', phaseT: 0, flash: { L: 0, R: 0 }, grrT: 0.3, yankT: 1.5 + Math.random() * 1.5, tell: 0, taps: 0,
      side: left ? -1 : 1, centre: { x: (dog.x + o.x) / 2, y: (dog.y + o.y) / 2 } };
    if (park) { o.state = 'tug'; o.moving = false; }
    callout = { text: 'TUG OF WAR!', life: 1.2, max: 1.2, colour: '#ffd84a' };
    Sfx.distract();
    setState('tug');
    maybeIntro('tug', 'tug');
  }

  function updateTug(dt) {
    const g = tugGame, o = g.opp;
    g.phaseT += dt;
    g.flash.L = Math.max(0, g.flash.L - dt);
    g.flash.R = Math.max(0, g.flash.R - dt);
    dog.animT += dt * 4; o.animT += dt * 4;
    // Each dog stands 30px from the middle, and the whole pair slides with the knot
    const shift = g.pos * 18 * g.side; // positive pos = you're winning = everything slides your way
    const place = (e, side) => { e.x = g.centre.x + side * 46 + shift; e.y = g.centre.y; };
    if (g.phase === 'intro') {
      place(dog, g.side); place(o, -g.side);
      dog.dir = g.side < 0 ? 'right' : 'left'; o.dir = g.side < 0 ? 'left' : 'right';
      if (g.phaseT > 1.1) { g.phase = 'fight'; g.phaseT = 0; }
    } else if (g.phase === 'fight') {
      g.t -= dt;
      // The other dog tugs in surges, harder in the last 2 seconds, and now and then does a big YANK
      // (with a GRRR and a crouch first: tap fast during the tell to brace and halve it)
      const pull = TUG_PULL[difficulty] * g.strength * (g.t < 2 ? 1.2 : 1);
      g.pos = Math.max(-1, g.pos - pull * dt * (1 + 0.4 * Math.sin(g.phaseT * 3)));
      g.yankT -= dt;
      if (g.yankT <= 0 && !g.tell) { g.tell = TUG_TELL; g.taps = 0; floaters.push({ x: o.x, y: o.y - 60, text: 'GRRR!', life: 0.5, color: '#ff7a7a', scale: 2 }); }
      if (g.tell) {
        g.tell -= dt;
        if (g.tell <= 0) {
          const braced = g.taps >= 3;
          g.pos = Math.max(-1, g.pos - TUG_YANK * (braced ? 0.5 : 1));
          g.tell = 0; g.yankT = 1.5 + Math.random() * 1.5;
          shake(braced ? 1.5 : 3, 0.2);
          floaters.push({ x: o.x, y: o.y - 64, text: braced ? 'BRACED!' : 'YANK!', life: 0.7, color: braced ? '#7fe08a' : '#ffb040', scale: 2 });
          Sfx.thud();
        }
      }
      for (const [key, codes] of [['L', LEFT], ['R', RIGHT]]) {
        if (!hit(...codes)) continue;
        g.flash[key] = 0.12;
        if (g.last !== key) {
          g.pos = Math.min(1, g.pos + TUG_TAP);
          g.last = key;
          if (g.tell) g.taps++;
          dog.barkPose = 0.15;
          if (Math.random() < 0.5) particles.push({ x: dog.x + (Math.random() - 0.5) * 16, y: dog.y - 2, vx: g.side * 40, vy: -20, g: 60, life: 0.4, max: 0.4, color: '#e8d6a6', size: 2 });
        }
      }
      place(dog, g.side); place(o, -g.side);
      g.grrT -= dt;
      if (g.grrT <= 0) {
        g.grrT = 0.7 + Math.random() * 0.5;
        const who = Math.random() < 0.5 ? dog : o;
        floaters.push({ x: who.x, y: who.y - 58, text: 'GRRR!', life: 0.6, color: '#ffffff' });
      }
      if (g.pos >= 1) {
        g.phase = 'win'; g.phaseT = 0;
        score += 75; timeLeft += 5;
        callout = { text: 'WINNER!', life: 1.8, max: 1.8, colour: '#ffd84a' };
        floaters.push({ x: dog.x, y: dog.y - 64, text: '+75  +5S', life: 1.4, color: '#7fe08a' });
        Sfx.brave();
      } else if (g.pos <= -1 || g.t <= 0) {
        g.phase = 'lose'; g.phaseT = 0;
        callout = { text: 'SO CLOSE!', life: 1.6, max: 1.6, colour: '#ff9ab5' };
        Sfx.deny();
      }
    } else {
      // Win: the other dog play-bows, then trots off. Lose: it runs off with the rope.
      if (g.phaseT > 1.6) {
        if (g.park) { // a dog-park dog: off it trots (with the rope if it won), done with tug for this round
          o.state = 'wander'; o.rope = g.phase === 'lose'; o.tugDone = true; o.cooldown = 8;
          o.vx = (o.x >= dog.x ? 1 : -1) * 2 * TILE; o.vy = 0; o.t = 1.2;
        } else {
          o.state = 'leaving';
          o.vx = (o.x >= dog.x ? 1 : -1) * (g.phase === 'win' ? 2 : 4.5) * TILE;
          o.dir = o.vx > 0 ? 'right' : 'left';
          o.won = g.phase === 'lose';
        }
        if (blocked(dog.x, dog.y, DOG_HW, DOG_HW)) { dog.x = g.centre.x; dog.y = g.centre.y; } // never leave the dog stuck in a hedge
        tugGame = null;
        dog.immune = 2;
        setState('playing');
      }
    }
    updateEffects(dt);
    updateCamera();
  }

  // ---- Vet trip: a snake bite or a bee sting ends the level ----
  function startVetTrip() {
    vetTrip = { cause: 'bee' };
    snakeGame = null;
    callout = null;
    Sfx.stopRain();
    setState('vetTrip');
  }

  // ---- Round end: the owner pops in, calls the dog, and the dog runs to her ----
  function startHomeTime(early) {
    roundBonus = early ? Math.ceil(timeLeft) * 5 : 0;
    score += roundBonus;
    if (!early) timeLeft = 0;
    if (dog.chase) endChase();
    dog.zoomies = 0; dog.stun = 0; dog.scared = 0; dog.poop = 0;
    if (dog.seq) { const q = dog.seq; dog.seq = null; dog.hop = 0; if (q.kind === 'bed') { dog.x = q.from.x; dog.y = q.from.y; } }
    dog.path = null;
    dog.moving = false;

    // Find a reachable spot a few steps away that's on screen and not under a tree or bush
    const { W, tiles } = world;
    const [sx0, sy0] = tileOf(dog.x, dog.y);
    const d = new Int16Array(tiles.length).fill(-1);
    const queue = [sy0 * W + sx0];
    d[queue[0]] = 0;
    for (let qi = 0; qi < queue.length; qi++) {
      const i = queue[qi];
      if (d[i] >= 6) continue;
      for (const [dx, dy] of DIRS) {
        const j = i + dy * W + dx;
        if (d[j] === -1 && !SOLID[tiles[j]]) { d[j] = d[i] + 1; queue.push(j); }
      }
    }
    const onScreen = i => {
      const x = (i % W) * TILE + 16 - cam.x, y = Math.floor(i / W) * TILE + 16 - cam.y;
      return x > 60 && x < VIEW_W - 60 && y > 90 && y < VIEW_H - 50;
    };
    const clear = i => {
      const x = i % W, y = Math.floor(i / W);
      if (COVER.includes(tiles[i]) || SLIPPY.includes(tiles[i])) return false;
      for (let dy = 0; dy <= 4; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const t2 = world.get(x + dx, y + dy);
          if (t2 === T.TREE || (dy <= 1 && Math.abs(dx) <= 1 && (t2 === T.BUSH || t2 === T.FURN || t2 === T.TABLE))) return false;
        }
      }
      return true;
    };
    const near = queue.filter(i => d[i] >= 2 && onScreen(i));
    const doors = (world.doors || []).map(([x, y]) => y * W + x).filter(i => d[i] >= 1 && onScreen(i));
    let spots = doors.length ? doors : near.filter(clear);
    if (!spots.length) spots = near.filter(i => !COVER.includes(tiles[i]));
    if (!spots.length) spots = queue.filter(i => d[i] >= 1);
    if (!spots.length) spots = queue;
    const i = pick(spots), tx = i % W, ty = Math.floor(i / W);
    owner = { x: tx * TILE + 16, y: ty * TILE + 26, tx, ty, phase: 'appear', t: 0, early, woken: !!world.woken };
    for (let k = 0; k < 26; k++) {
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 70;
      particles.push({ x: owner.x, y: owner.y - 40, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0, life: 0.7, max: 0.7, color: k % 3 ? '#ffffff' : '#ffd84a', size: 2 });
    }
    Sfx.poof();
    setState('homeTime');
  }

  function updateHomeTime(dt) {
    owner.t += dt;
    if (owner.phase === 'appear') {
      dog.dir = dirFrom(owner.x - dog.x, owner.y - dog.y, dog.dir);
      dog.animT += dt * 5;
      if (owner.t > 0.5) { owner.phase = 'call'; owner.t = 0; Sfx.call(); }
    } else if (owner.phase === 'call') {
      dog.animT += dt * 8;
      if (owner.t > 0.9) {
        dog.path = findPath(dog.x, dog.y, owner.tx, owner.ty) || [];
        owner.phase = 'fetch';
        owner.t = 0;
      }
    } else if (owner.phase === 'fetch') {
      const near = dist(owner, dog) < 0.9 * TILE;
      if (!near && dog.path.length) followPath(SPRINT_SPEED, dt);
      else if (!near && owner.t < 4) walkToward(owner.x, owner.y, SPRINT_SPEED, dt);
      else {
        owner.phase = 'hug';
        owner.t = 0;
        dog.moving = false;
        dog.path = null;
        dog.dir = dirFrom(owner.x - dog.x, owner.y - dog.y, dog.dir);
        Sfx.happy();
        if (dog.carry) { // a present for the owner
          const stick = dog.carry.kind === 'stick';
          floaters.push({ x: owner.x, y: owner.y - 112, text: stick ? 'BEST STICK EVER!' : 'MY SHOE?!', life: 1.6, color: '#ffe066' });
          naughty(stick ? 'stick' : 'shoe', owner.x, owner.y - 20);
          dog.carry.cool = 99; dog.carry.y = dog.y + 6;
          dog.carry = null;
        }
      }
    } else if (owner.phase === 'hug') {
      dog.animT += dt * 6;
      if (Math.random() < dt * 5) floaters.push({ x: (dog.x + owner.x) / 2 + (Math.random() - 0.5) * 24, y: dog.y - 44, text: '*', life: 1, color: '#ff7a9c', scale: 2 });
      if (owner.t > 1.4) finishRound(false);
    }
    updateEffects(dt);
    updateCamera();
  }

  // ---- Results: #/# snacks, %, stars, and what next. A vet trip counts as a fail. ----
  function finishRound(fail) {
    Sfx.stopRain();
    const found = Math.min(world.found, world.goal);
    const pct = Math.round((found / world.goal) * 100);
    let stars = fail ? 0 : STAR_PCTS.filter(p => pct >= p).length;
    if (beg && !fail && pct >= 100) stars = timeLeft >= BEG_TIME[difficulty] * 0.35 ? 3 : timeLeft >= BEG_TIME[difficulty] * 0.15 ? 2 : 1; // all 10: stars for time to spare
    let levelBest = false, newBest = false;
    const canContinue = !fail && pct >= UNLOCK_PCT;
    const roundPoints = score - levelStartScore;
    if (!fail) {
      const prev = levelStats[level] || { pct: 0, stars: 0, best: 0 };
      levelBest = pct > prev.pct || roundPoints > (prev.best || 0);
      if (levelBest) {
        levelStats[level] = { pct: Math.max(pct, prev.pct), stars: Math.max(stars, prev.stars), best: Math.max(roundPoints, prev.best || 0) };
        store.set(KEYS.levels, JSON.stringify(levelStats));
      }
      if (canContinue && level < LEVEL_COUNT && level + 1 > unlocked) { unlocked = level + 1; store.set(KEYS.unlocked, String(unlocked)); }
      newBest = score > best;
      if (newBest) { best = score; store.set(KEYS.best, String(best)); }
    }
    // The recap: the biggest time-wasters, and how many snacks were missed (and how many were hidden)
    const lostList = Object.entries(lost).filter(([, s]) => s >= 1).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const missed = world.goal - found;
    const where = [
      [(world.digs || []).filter(d => !d.dug && d.type).length, 'BURIED'],
      [(world.stashes || []).filter(st => !st.done && st.type && !st.type.bonus).length, 'IN FURNITURE'],
      [world.treats.filter(tr => !tr.collected && tr.hidden && !tr.type.rare && !tr.type.bonus).length, 'IN COVER'],
      [world.treats.filter(tr => !tr.collected && tr.lift).length, 'ON TABLES'],
    ].filter(([k]) => k > 0);
    const hidden = Math.min(missed, where.reduce((a, [k]) => a + k, 0));
    result = { found, goal: world.goal, pct, stars, levelBest, newBest, roundPoints, bonus: roundBonus, early: owner && owner.early, canContinue, fail, lostList, missed, hidden, where, bestCombo: combo.best, mischief: { ...mischief, acts: { ...mischief.acts } }, thuds: 0 };
    resultMenu.idx = canContinue ? 1 : 0;
    setState('roundOver');
  }

  const RESULT_MENU = ['REPLAY LEVEL', 'CONTINUE TO NEXT LEVEL', 'RETURN TO MENU'];
  const resultItems = () => level >= LEVEL_COUNT ? ['REPLAY LEVEL', 'THE END: TIME FOR BED', 'RETURN TO MENU'] : RESULT_MENU;
  const resultRects = () => RESULT_MENU.map((_, i) => ({ x: VIEW_W / 2 - 150, y: 330 + i * 26, w: 300, h: 22 }));
  function updateResults() {
    // The stars stamp down one at a time
    if (result.thuds < result.stars && stateT >= starTime(result.thuds) + 0.12) { result.thuds++; Sfx.thud(); shake(2, 0.12); }
    if (stateT < 0.6) return;
    const choice = menuInput(resultMenu, resultRects(), i => i !== 1 || result.canContinue);
    if (choice === 0) { score = levelStartScore; startLevel(); }
    else if (choice === 1) { if (level >= LEVEL_COUNT) startEnding('levels'); else { level++; startLevel(); } }
    else if (choice === 2) { select.level = Math.min(unlocked, level + (result.canContinue ? 1 : 0)); leaveToMenu(); }
  }

  // ---- The ending: after level 50, the dog trots in, curls up in its bed by the fire and falls
  // fast asleep, while the story types out. Drawn at half size (400x225) and doubled. ----
  const ENDING_LINES = ['SCHMOOP QUEST COMPLETE!', "WHAT A BIG DAY I'VE HAD.", "I CAN'T WAIT TO DO IT ALL OVER AGAIN TOMORROW."];
  const ENDING_AT = { walk: 0.5, arrive: 4, lie: 5.6, asleep: 7.2, lines: [8.5, 11.5, 14.5], done: 18.5 };
  const BED = { x: 186, y: 182 }; // where the dog sleeps (the bed's middle, at the feet)
  let endingReturn = 'levels', endingZ = [], endingRoom = null;
  function startEnding(from = 'levels') {
    endingReturn = from;
    endingZ = [];
    particles = [];
    store.set(KEYS.complete, '1');
    Sfx.stopRain();
    setState('ending');
  }
  function updateEnding(dt) {
    if (hit('Enter', 'Space', 'Escape') || mouse.clicked) {
      if (stateT < ENDING_AT.done) stateT = ENDING_AT.done; // skip to the end of the story
      else { Sfx.menu(); setState(endingReturn); }
    }
    // Zzz's drift up from the sleeping dog
    if (stateT > ENDING_AT.asleep + 0.8 && Math.floor(stateT / 1.6) !== Math.floor((stateT - dt) / 1.6)) endingZ.push({ t: 0 });
    for (const z of endingZ) z.t += dt;
    endingZ = endingZ.filter(z => z.t < 3.2);
  }
  // The room, without the fire: wallpaper, wainscot, floorboards, a window with the moon, the fireplace and a rug
  function buildEndingRoom() {
    const c = document.createElement('canvas'); c.width = 400; c.height = 225;
    const g = c.getContext('2d'), R = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    R('#3a2a40', 0, 0, 400, 140);
    for (let x = 0; x < 400; x += 12) R('#42304a', x, 0, 5, 112);
    for (let y = 8; y < 112; y += 16) for (let x = (y % 32 ? 6 : 0); x < 400; x += 12) R('#5a4262', x + 2, y, 1, 1);
    R('#4a3020', 0, 112, 400, 28); R('#6a4630', 0, 110, 400, 3); R('#2c1c12', 0, 139, 400, 1);
    for (let x = 6; x < 400; x += 40) { R('#553824', x, 117, 30, 18); R('#3e2818', x, 117, 30, 1); }
    R('#5a3a24', 0, 140, 400, 85);
    for (let y = 140; y < 225; y += 9) { R('#4a2e1c', 0, y, 400, 1); for (let x = (y * 7) % 60; x < 400; x += 60) R('#4a2e1c', x, y, 1, 9); }
    // The window: the night sky, stars and the moon
    R('#6a4a30', 34, 22, 82, 78); R('#141c44', 40, 28, 70, 66);
    for (const [x, y] of [[48, 36], [70, 34], [96, 46], [58, 60], [102, 70], [46, 80], [84, 84]]) R('#fff6c8', x, y, 1, 1);
    g.fillStyle = '#f4ecc0'; g.beginPath(); g.arc(88, 50, 9, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#141c44'; g.beginPath(); g.arc(92, 47, 8, 0, Math.PI * 2); g.fill();
    R('#6a4a30', 73, 28, 4, 66); R('#6a4a30', 40, 59, 70, 4); R('#8a6444', 30, 98, 90, 5);
    // The fireplace: brick surround, a mantel with a candle and a photo, and the hearth
    R('#7a3a2a', 226, 56, 108, 84);
    for (let y = 58; y < 140; y += 6) for (let x = 226 + (y % 12 ? 0 : 6); x < 334; x += 12) R('#8e4836', x, y, 11, 5);
    R('#2a1210', 250, 86, 60, 54); R('#14080a', 254, 90, 52, 50);
    g.fillStyle = '#2a1210'; g.beginPath(); g.arc(280, 90, 30, Math.PI, 0); g.fill();
    g.fillStyle = '#14080a'; g.beginPath(); g.arc(280, 92, 26, Math.PI, 0); g.fill();
    R('#7a5232', 218, 48, 124, 9); R('#9a6a42', 218, 48, 124, 2); R('#5a3a22', 218, 56, 124, 2);
    R('#f0e6d0', 232, 36, 5, 12); R('#ffd860', 233, 32, 3, 4);
    R('#c8a050', 300, 28, 22, 20); R('#6a8aba', 303, 31, 16, 14); R('#2c2c34', 307, 37, 8, 8);
    R('#8a8478', 220, 140, 120, 10); R('#a29c90', 220, 140, 120, 2); R('#6a645a', 220, 149, 120, 1);
    // The rug
    g.fillStyle = '#c8a050'; g.beginPath(); g.ellipse(196, 190, 124, 24, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#8a2a2a'; g.beginPath(); g.ellipse(196, 190, 118, 21, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#a63a36'; g.beginPath(); g.ellipse(196, 190, 90, 14, 0, 0, Math.PI * 2); g.fill();
    return c;
  }
  function drawFire(g, k, embers = true) { // k: how strong the fire is (dies down as the dog sleeps)
    g.fillStyle = '#5a3418'; g.fillRect(260, 132, 40, 5); g.fillStyle = '#3e2410'; g.fillRect(264, 128, 32, 5);
    g.fillStyle = '#ff5a1a'; g.fillRect(262, 136, 36, 2);
    for (let i = 0; i < 7; i++) {
      const fx0 = 262 + i * 5.5, h = Math.max(4, Math.round((16 + 9 * Math.sin(t * 9 + i * 1.7) + 4 * Math.sin(t * 23 + i)) * k * (1 - Math.abs(i - 3) / 5)));
      for (let j = 0; j < h; j++) {
        const u = j / h, w = Math.max(1, Math.round(5 * (1 - u))), sway = Math.round(Math.sin(t * 6 + i + j * 0.3) * u * 2);
        g.fillStyle = u < 0.35 ? '#fff0a0' : u < 0.7 ? '#ffb030' : '#ff5a1a';
        g.fillRect(Math.round(fx0 + sway + (5 - w) / 2), 130 - j, w, 1);
      }
    }
    if (embers && Math.random() < 0.1 * k) particles.push({ x: 270 + Math.random() * 20, y: 112, vx: (Math.random() - 0.5) * 6, vy: -18, g: 0, life: 1, max: 1, color: '#ffb030', size: 1, ending: true });
  }
  function renderEnding() {
    const T = stateT, set = SPRITES.dogs[dogId], ease = u => u * u * (3 - 2 * u), clamp = u => Math.max(0, Math.min(1, u));
    if (!endingRoom) endingRoom = buildEndingRoom();
    const fire = 1 - 0.4 * clamp((T - 8) / 8);
    // The camera eases in on the bed, lifting it clear of the story text
    const e = ease(clamp((T - ENDING_AT.asleep) / 9)), z = 1 + 0.2 * e;
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.save();
    ctx.translate(BED.x * 2, BED.y * 2 - 110 * e); ctx.scale(2 * z, 2 * z); ctx.translate(-BED.x, -BED.y);
    ctx.drawImage(endingRoom, 0, 0);
    drawFire(ctx, fire);
    for (const p of particles) if (p.ending) { ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1); }
    ctx.globalAlpha = 1;
    const bed = SPRITES.furniture.dogBed;
    ctx.drawImage(bed, Math.round(BED.x - bed.width / 2), BED.y + 6 - bed.height);
    // The dog: trot in, turn round and round, lie down, then sleep (breathing slowly)
    let img, x = BED.x, sq = 1;
    if (T < ENDING_AT.arrive) { const u = ease(clamp((T - ENDING_AT.walk) / (ENDING_AT.arrive - ENDING_AT.walk))); x = -40 + (BED.x + 40) * u; img = set.right.run[Math.floor(T * 10) % set.right.run.length]; }
    else if (T < ENDING_AT.lie) { const k = Math.floor((T - ENDING_AT.arrive) / 0.4); img = (k % 2 ? set.left : set.right).run[Math.floor(T * 8) % set.right.run.length]; x = BED.x + (k % 2 ? -2 : 2); }
    else {
      const sniff = set.right.sniff, u = clamp((T - ENDING_AT.lie) / (ENDING_AT.asleep - ENDING_AT.lie));
      img = sniff[Math.min(sniff.length - 1, Math.floor(u * sniff.length))];
      if (T > ENDING_AT.asleep) { // curled up fast asleep (the Sprite Fusion sleep frame), breathing slowly
        const sleep = set.right.sleep;
        if (sleep) { img = sleep[0]; sq = 1 + 0.015 * Math.sin((T - ENDING_AT.asleep) * 1.7); }
        else sq = 1 - 0.14 * ease(clamp((T - ENDING_AT.asleep) / 0.8)) + 0.012 * Math.sin((T - ENDING_AT.asleep) * 1.7);
      }
    }
    const foot = BED.y - 2, top = foot - DOG_FOOT_Y * sq;
    ctx.drawImage(img, Math.round(x - DOG_FOOT_X), top, DOG_W, DOG_H * sq);
    for (const zz of endingZ) drawText(ctx, 'Z', BED.x + 18 + zz.t * 6 + Math.sin(zz.t * 3) * 3, foot - 20 - zz.t * 12, { scale: zz.t < 1.2 ? 1 : 2, color: `rgba(220,228,255,${Math.min(1, 3.2 - zz.t)})`, shadow: null });
    // Warm firelight over the room, and the night everywhere else
    ctx.fillStyle = `rgba(10,8,30,${0.25 + 0.2 * (1 - fire)})`; ctx.fillRect(0, 0, 400, 225);
    ctx.globalCompositeOperation = 'lighter';
    const gl = ctx.createRadialGradient(280, 120, 0, 280, 120, 170);
    gl.addColorStop(0, `rgba(255,150,60,${0.32 * fire + 0.03 * Math.sin(t * 11)})`); gl.addColorStop(1, 'rgba(255,150,60,0)');
    ctx.fillStyle = gl; ctx.fillRect(0, 0, 400, 225);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
    // The story types out, line by line
    if (T > ENDING_AT.lines[0]) { ctx.fillStyle = `rgba(6,8,18,${0.75 * clamp((T - ENDING_AT.lines[0]) / 0.6)})`; ctx.fillRect(0, VIEW_H - 104, VIEW_W, 104); }
    ENDING_LINES.forEach((line, i) => {
      const n = Math.floor((T - ENDING_AT.lines[i]) * 20);
      if (n > 0) drawText(ctx, line.slice(0, n), VIEW_W / 2, VIEW_H - 94 + [0, 34, 56][i], { scale: i === 0 ? 3 : 2, align: 'center', color: i === 0 ? '#ffd84a' : '#ffffff' });
    });
    if (T > ENDING_AT.done) {
      drawText(ctx, `${totalStars()} / ${LEVEL_COUNT * 3}`, VIEW_W / 2 + 8, 16, { scale: 2, color: '#ffd84a' });
      ctx.drawImage(SPRITES.starOn, VIEW_W / 2 - 26, 12, 22, 22);
      if (Math.floor(T * 2) % 2) drawText(ctx, say('PRESS ENTER', 'TAP TO GO ON'), VIEW_W - 16, VIEW_H - 14, { align: 'right', color: '#cfd3e0' });
    }
    if (T < 0.8) { ctx.fillStyle = `rgba(0,0,0,${1 - T / 0.8})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
  }
  // The tile after level 50 in the level picker: replays the ending once the game's been finished
  function drawBedtimeTile(r, on) {
    const open = gameComplete();
    ctx.fillStyle = on ? 'rgba(8,10,20,0.95)' : 'rgba(8,10,20,0.75)'; ctx.fillRect(r.x, r.y, r.w, r.h);
    const tx = r.x + 6, ty = r.y + 6;
    if (!endingRoom) endingRoom = buildEndingRoom();
    ctx.drawImage(endingRoom, 120, 104, 224, 80, tx, ty, LP.thumbW, LP.thumbH);
    ctx.save(); ctx.beginPath(); ctx.rect(tx, ty, LP.thumbW, LP.thumbH); ctx.clip(); ctx.translate(tx - 120, ty - 104);
    drawFire(ctx, 1, false);
    ctx.restore();
    const bed = SPRITES.furniture.dogBed, set = SPRITES.dogs[dogId].right, img = set.sleep ? set.sleep[0] : set.sniff[set.sniff.length - 1];
    ctx.drawImage(bed, tx + BED.x - 120 - bed.width / 2, ty + BED.y - 104 + 6 - bed.height);
    const k = set.sleep ? 1 : 0.86;
    if (open) ctx.drawImage(img, tx + BED.x - 120 - DOG_FOOT_X, ty + BED.y - 106 - DOG_FOOT_Y * k, DOG_W, DOG_H * k);
    ctx.fillStyle = 'rgba(10,8,30,0.3)'; ctx.fillRect(tx, ty, LP.thumbW, LP.thumbH);
    if (!open) {
      ctx.fillStyle = 'rgba(8,10,20,0.7)'; ctx.fillRect(tx, ty, LP.thumbW, LP.thumbH);
      ctx.drawImage(SPRITES.padlock, tx + LP.thumbW / 2 - 20, ty + 8, 40, 40);
      drawText(ctx, 'FINISH LEVEL 50', tx + LP.thumbW / 2, ty + 56, { align: 'center', color: '#cfd3e0' });
    }
    drawText(ctx, 'BEDTIME STORY', r.x + 8, r.y + LP.thumbH + 18, { color: open ? '#ffd84a' : '#6a6a7a' });
    const b = on ? 3 : 1;
    ctx.fillStyle = on ? (open ? '#ffd84a' : '#8a6a6a') : '#555b70';
    ctx.fillRect(r.x, r.y, r.w, b); ctx.fillRect(r.x, r.y + r.h - b, r.w, b); ctx.fillRect(r.x, r.y, b, r.h); ctx.fillRect(r.x + r.w - b, r.y, b, r.h);
  }

  // ---- First-time pop-ups: the first time you play each kind of game, a card explains it (the game
  // waits until you close it). Reopen it from the pause menu with THIS GAME. ----
  const GAME_INTROS = {
    snack: { name: 'SNACK HUNT', colour: '#ffd84a', anim: 'sniff',
      what: ['SNIFF OUT SNACKS AROUND EACH PLACE BEFORE YOUR OWNER COMES TO TAKE YOU HOME.'],
      goal: ['FIND THE SNACKS BEFORE TIME RUNS OUT. HALF UNLOCKS THE NEXT LEVEL - ALL OF THEM = 3 STARS.'],
      keys: [['<^v>', 'MOVE'], ['sneak', 'SNEAK'], ['bark', 'BARK'], ['run', 'RUN'], ['sniff', 'SNIFF']],
      rules: ['SNACKS ADD TIME. EAT THEM WITHIN 3 SECONDS OF EACH OTHER FOR A COMBO.', 'CATS SWIPE (-3 SECONDS). CHEESE AND PIZZA GIVE YOU THE ZOOMIES!'] },
    menace: { name: 'MENACE RUN', colour: '#ff5ad8', anim: 'sprint',
      what: ["30 SECONDS OF ZOOMIES THAT NEVER STOP. CRASH INTO EVERYTHING!"],
      goal: ['SMASH THE MOST. 10 / 18 / 28 SMASHES = 1 / 2 / 3 STARS (OR COME FIRST WITH 18+).'],
      keys: [['<^v>', "STEER - YOU'RE ALWAYS RUNNING"]],
      rules: ['RACE THE OTHER DOGS: THEY USE UP THINGS TO SMASH TOO.', "RUN INTO STICKS AND SHOES TO SHAKE THEM. DON'T ZOOM INTO THE POOL!"] },
    fetch: { name: 'FETCH', colour: '#c8e83a', anim: 'happy',
      what: ['YOUR OWNER SPINS ROUND AND FLINGS THE BALL... ANYWHERE!'],
      goal: ['BRING THE BALL BACK TO HER FIRST. 5 THROWS: 1 / 3 / 4 BALLS = 1 / 2 / 3 STARS.'],
      keys: [['<^v>', 'MOVE'], ['run', 'RUN'], ['sniff', 'SNIFF OUT THE BALL']],
      rules: ['BUMP WHOEVER HAS THE BALL TO STEAL IT. 25 SECONDS A THROW.', 'AT THE DOG PARK, EVERY DOG CHASES IT!'] },
    beg: { name: 'BEG', colour: '#ffb040', anim: 'stand',
      what: ['LOOK CUTE AND BLUDGE SNACKS FROM PEOPLE.'],
      goal: ['GET 10 SNACKS BEFORE TIME RUNS OUT. MORE TIME LEFT = MORE STARS.'],
      keys: [['<^v>', 'MOVE'], ['beg', 'HOLD NEXT TO SOMEONE: BEG'], ['sneak', 'SNEAK']],
      rules: ['Y = THEY SHARE, X = THEY SAY NO, ? = ASK AGAIN IN A FEW SECONDS.', 'PINCH A LEFT PLATE IF NOBODY SEES - CAUGHT IS -5 SECONDS. SEAGULLS SWOOP!'] },
    tug: { name: 'TUG OF WAR', colour: '#ffd84a', anim: 'tug',
      what: ['ANOTHER DOG WANTS TO PLAY WITH A ROPE!'],
      goal: ['PULL THE KNOT ALL THE WAY OVER TO YOUR SIDE.'],
      keys: [['<>', 'TAP LEFT, RIGHT, LEFT, RIGHT... IN TURN']],
      rules: ['WATCH FOR THE GRRR: TAP FAST TO BRACE AGAINST A YANK!', 'WIN: +75 POINTS AND +5 SECONDS. LOSING COSTS NOTHING.'] },
    snake: { name: 'SNAKE FIGHT', colour: '#ff5a5a', anim: 'shakeSnake',
      what: ['A SNAKE! (VERY RARE.)'],
      goal: ['FILL THE BAR BEFORE TIME RUNS OUT.'],
      keys: [['<>', 'TAP LEFT, RIGHT, LEFT, RIGHT... AS FAST AS YOU CAN']],
      rules: ["LOSE AND YOU'RE BITTEN: -8 SECONDS AND A LIMP."] },
  };
  // The caps to draw for a pop-up's keys: arrows one by one ('<^v>'), or a key's name (e.g. 'run')
  function capsFor(keys) {
    if (keys === '<^v>' && touchOn()) return ['STICK'];
    if (keys.length > 1 && /^[<>^v]+$/.test(keys)) return [...keys];
    return [KEY_LABEL[keys] || keys];
  }
  let introFor = null, introReturn = 'playing';
  const introSeen = type => seenIntros.includes(type);
  function openIntro(type, ret) { introFor = type; introReturn = ret; setState('intro'); }
  // Shows the pop-up if this kind of game hasn't been introduced yet
  function maybeIntro(type, ret) { if (!introSeen(type)) openIntro(type, ret); }
  function updateIntro() {
    if (stateT > 0.35 && (hit('Enter', 'Escape') || mouse.clicked)) {
      if (!introSeen(introFor)) { seenIntros.push(introFor); store.set(KEYS.seen, JSON.stringify(seenIntros)); }
      Sfx.menu();
      const back = introReturn;
      state = back; // (not setState: the mini-game / pause menu carries on where it was)
    }
  }
  function renderIntro() {
    const g = GAME_INTROS[introFor];
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const H = 330, { x, y } = panel(600, H, 56), L = x + 26;
    drawText(ctx, introReturn === 'paused' ? 'THIS GAME' : 'NEW GAME!', L, y + 16, { scale: 2, color: '#ffffff' });
    drawText(ctx, g.name, L, y + 38, { scale: 4, color: g.colour });
    // your dog doing the game's move
    const set = SPRITES.dogs[dogId].right, frames = set[g.anim] || set.run, img = frames[Math.floor(t * 12) % frames.length];
    ctx.drawImage(img, x + 600 - 130, y + 2, DOG_W * 1.6, DOG_H * 1.6);
    if (introFor === 'fetch') drawBall(x + 600 - 52, y + 44 - Math.round(Math.abs(Math.sin(t * 5)) * 16));
    let yy = y + 86;
    const section = (title, lines) => {
      drawText(ctx, title, L, yy, { color: g.colour });
      yy += 13;
      for (const line of lines) { drawText(ctx, line, L, yy); yy += 12; }
      yy += 9;
    };
    section('WHAT IT IS', g.what);
    section('THE GOAL', g.goal);
    drawText(ctx, 'CONTROLS', L, yy, { color: g.colour });
    yy += 15;
    let kx = L;
    for (const [keys, label] of g.keys) {
      for (const k of capsFor(keys)) kx += drawKeyCap(kx, yy, k) + 3;
      drawText(ctx, label, kx + 4, yy + 6, { color: '#ffffff' });
      kx += textWidth(label) + 26;
    }
    yy += 32;
    section('RULES', g.rules);
    const by = y + H - 40, on = Math.floor(t * 2) % 2;
    ctx.fillStyle = on ? '#ffd84a' : '#e0b830'; ctx.fillRect(VIEW_W / 2 - 80, by, 160, 26);
    drawText(ctx, "LET'S GO!", VIEW_W / 2, by + 6, { scale: 2, align: 'center', color: '#2a2230', shadow: null });
  }

  // ---- Pause menu ----
  const PAUSE_MENU = ['RESUME', 'RESTART LEVEL', 'THIS GAME', 'HOW TO PLAY', 'OPTIONS', 'QUIT TO MENU'];
  const pauseRects = () => PAUSE_MENU.map((_, i) => ({ x: VIEW_W / 2 - 110, y: 160 + i * 28, w: 220, h: 24 }));
  function openPause() { pauseMenu.idx = 0; pauseMenu.confirm = false; setState('paused'); }
  function updatePause() {
    if (pauseMenu.confirm) {
      if (hit('Enter', 'KeyY') || mouse.clicked) leaveToMenu();
      else if (hit('Escape', 'KeyN')) pauseMenu.confirm = false;
      return;
    }
    if (hit('Escape', 'KeyP')) { setState('playing'); return; }
    const choice = menuInput(pauseMenu, pauseRects());
    if (choice === 0) setState('playing');
    else if (choice === 1) { score = levelStartScore; startLevel(); }
    else if (choice === 2) openIntro(world.mode || 'snack', 'paused');
    else if (choice === 3) { howtoReturn = 'paused'; howtoPage = 0; setState('howto'); }
    else if (choice === 4) openOptions('paused');
    else if (choice === 5) pauseMenu.confirm = true;
  }

  // ---- Title, select and how-to screens ----
  // CONTINUE (once there's progress) jumps straight into the furthest level with the last dog and difficulty
  const hasProgress = () => unlocked > 1 || Object.keys(levelStats).length > 0;
  // Continue keeps your progress; Begin New starts the whole quest again (after a check)
  const titleItems = () => [
    ...(hasProgress() ? [gameComplete() ? 'CONTINUE SCHMOOP QUEST' : `CONTINUE SCHMOOP QUEST - LEVEL ${unlocked}`] : []),
    'BEGIN NEW SCHMOOP QUEST', 'CHOOSE LEVEL', ...(gameComplete() ? ['BEDTIME STORY'] : []), 'HOW TO PLAY', 'OPTIONS'];
  const titleRects = () => titleItems().map((_, i) => ({ x: VIEW_W / 2 - 160, y: 314 - Math.max(0, titleItems().length - 5) * 8 + i * 20, w: 320, h: 18 }));
  let titleConfirm = false;
  // A fresh quest: everything you've earned goes (options, your dog and difficulty stay)
  function beginNewQuest() {
    unlocked = 1; levelStats = {}; best = 0; seenIntros = [];
    store.set(KEYS.unlocked, '1'); store.set(KEYS.levels, '{}'); store.set(KEYS.best, '0');
    store.set(KEYS.complete, ''); store.set(KEYS.seen, '[]');
    select.level = 1; select.row = 0;
    setState('select');
  }
  function updateTitle() {
    if (titleConfirm) {
      if (hit('Enter', 'KeyY') || mouse.clicked) { titleConfirm = false; Sfx.menu(); beginNewQuest(); }
      else if (hit('Escape', 'KeyN')) { titleConfirm = false; Sfx.menu(); }
      return;
    }
    const items = titleItems();
    const choice = menuInput(titleMenu, titleRects());
    if (choice < 0) return;
    const item = items[choice];
    if (item.startsWith('CONTINUE')) {
      if (gameComplete()) { levelPick.idx = (LEVEL_COUNT - 1) % 9; levelPick.page = Math.floor((LEVEL_COUNT - 1) / 9); setState('levels'); }
      else startRun(unlocked);
    }
    else if (item === 'BEGIN NEW SCHMOOP QUEST') { if (hasProgress()) titleConfirm = true; else { select.level = 1; select.row = 0; setState('select'); } }
    else if (item === 'BEDTIME STORY') startEnding('title');
    else if (item === 'CHOOSE LEVEL') { levelPick.idx = (Math.min(unlocked, select.level || 1) - 1) % 9; levelPick.page = Math.floor((Math.min(unlocked, select.level || 1) - 1) / 9); setState('levels'); }
    else if (item === 'HOW TO PLAY') { howtoReturn = 'title'; howtoPage = 0; setState('howto'); }
    else if (item === 'OPTIONS') openOptions('title');
  }

  // ---- Options: left/right changes a setting, Enter toggles, Esc goes back ----
  let optionsReturn = 'title';
  const optionsMenu = { idx: 0 };
  const OPTION_ROWS = [
    { label: 'MUSIC VOLUME', key: 'music', range: true },
    { label: 'SOUND VOLUME', key: 'sound', range: true },
    { label: 'SCREEN SHAKE', key: 'shake' },
    { label: 'REDUCED MOTION', key: 'calm', hint: 'NO SHAKE, FREEZE-FRAMES, SLOW-MO OR WIPES' },
    { label: 'JOYSTICK', key: 'stickLeft', touch: true, words: ['RIGHT', 'LEFT'], hint: 'WHICH SIDE YOUR THUMB STEERS FROM (THE BUTTONS GO ON THE OTHER)' },
    { label: 'PHONE ZOOM', key: 'zoom', touch: true, hint: 'A BIGGER DOG AND BIGGER WRITING ON A SMALL SCREEN' },
    { label: 'BACK' },
  ];
  // (the joystick and zoom rows only show on a phone or tablet)
  const optionRows = () => OPTION_ROWS.filter(r => !r.touch || touchOn());
  const optionRects = () => optionRows().map((_, i, rows) => ({ x: VIEW_W / 2 - 220, y: (rows.length > 5 ? 104 : 130) + i * (rows.length > 5 ? 34 : 40), w: 440, h: 30 }));
  function openOptions(from) { optionsReturn = from; optionsMenu.idx = 0; setState('options'); }
  function changeOption(row, step) {
    if (!row.key) return;
    if (row.range) options[row.key] = Math.max(0, Math.min(10, options[row.key] + step));
    else options[row.key] = !options[row.key];
    applyOptions();
    Sfx.menu();
  }
  function updateOptions() {
    if (hit('Escape')) { setState(optionsReturn); return; }
    optionsMenu.idx = Math.min(optionsMenu.idx, optionRows().length - 1);
    const row = optionRows()[optionsMenu.idx];
    if (hit(...LEFT)) changeOption(row, -1);
    if (hit(...RIGHT)) changeOption(row, 1);
    if (mouse.clicked) { // clicking a volume: left half turns it down, right half up
      const r = optionRects()[optionsMenu.idx];
      if (row.range && inRect(r, mouse.x, mouse.y)) { changeOption(row, mouse.x < r.x + r.w / 2 ? -1 : 1); mouse.clicked = false; }
    }
    const choice = menuInput(optionsMenu, optionRects());
    if (choice < 0) return;
    const chosen = optionRows()[choice];
    if (!chosen.key) setState(optionsReturn);
    else if (!chosen.range) changeOption(chosen, 1);
  }
  function renderOptions() {
    renderBackdrop();
    drawText(ctx, 'OPTIONS', VIEW_W / 2, 50, { scale: 4, align: 'center', color: '#ffd84a', shadow: '#7a3b10' });
    optionRects().forEach((r, i) => {
      const row = optionRows()[i], on = i === optionsMenu.idx;
      ctx.fillStyle = on ? 'rgba(255,216,74,0.16)' : 'rgba(8,10,20,0.6)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      if (!row.key) { drawText(ctx, (on ? '> ' : '') + row.label + (on ? ' <' : ''), VIEW_W / 2, r.y + 9, { scale: 2, align: 'center', color: on ? '#ffd84a' : '#ffffff' }); return; }
      drawText(ctx, row.label, r.x + 14, r.y + 9, { scale: 2, color: on ? '#ffd84a' : '#ffffff' });
      if (row.range) {
        const v = options[row.key];
        for (let k = 0; k < 10; k++) { ctx.fillStyle = k < v ? (on ? '#ffd84a' : '#cfd3e0') : 'rgba(255,255,255,0.15)'; ctx.fillRect(r.x + 250 + k * 15, r.y + 8, 11, 14); }
        if (on) { drawText(ctx, '<', r.x + 236, r.y + 9, { scale: 2, color: '#ffd84a' }); drawText(ctx, '>', r.x + 404, r.y + 9, { scale: 2, color: '#ffd84a' }); }
      } else drawText(ctx, row.words ? row.words[+options[row.key]] : options[row.key] ? 'ON' : 'OFF', r.x + r.w - 14, r.y + 9, { scale: 2, align: 'right', color: row.words || options[row.key] ? '#7fe08a' : '#9a9a9a' });
    });
    const hint = (optionRows()[optionsMenu.idx] || {}).hint;
    if (hint) drawText(ctx, hint, VIEW_W / 2, optionRects().slice(-1)[0].y + 44, { align: 'center', color: '#cfd3e0' });
    drawText(ctx, say('UP/DOWN: PICK   LEFT/RIGHT: CHANGE   ESC: BACK', 'TAP THE LEFT / RIGHT OF A VOLUME TO CHANGE IT   X: BACK'), VIEW_W / 2, VIEW_H - 30, { align: 'center', color: '#ffd84a' });
  }

  // ---- Level picker: a grid of tiles, each with a snapshot of the level, best stars, and a padlock
  // on levels not unlocked yet. Levels always build the same layout, so the snapshot matches. ----
  const levelPick = { idx: 0, page: 0 };
  const THUMBS = new Map();
  const LP = { cols: 3, rows: 3, w: 236, h: 118, gap: 12, top: 52, thumbW: 224, thumbH: 80 };
  // Six fixed pages: all 50 levels (locked ones shown with a padlock), then the bedtime story tile
  const BEDTIME_SLOT = LEVEL_COUNT + 1;
  const levelPages = () => Math.ceil(BEDTIME_SLOT / 9);
  const gameComplete = () => store.get(KEYS.complete) === '1';
  const totalStars = () => Object.entries(levelStats).reduce((n, [k, v]) => n + (+k <= LEVEL_COUNT ? v.stars || 0 : 0), 0);
  const levelRects = () => [...Array(9).keys()].map(i => ({
    x: Math.round((VIEW_W - (LP.cols * LP.w + (LP.cols - 1) * LP.gap)) / 2) + (i % 3) * (LP.w + LP.gap),
    y: LP.top + Math.floor(i / 3) * (LP.h + LP.gap), w: LP.w, h: LP.h,
  }));
  function updateLevels() {
    if (hit('Escape')) { setState('title'); return; }
    const pages = levelPages();
    let { idx, page } = levelPick;
    const col = idx % 3, row = Math.floor(idx / 3);
    if (hit(...LEFT)) { if (col > 0) idx--; else if (page > 0) { page--; idx += 2; } Sfx.menu(); }
    if (hit(...RIGHT)) { if (col < 2) idx++; else if (page < pages - 1) { page++; idx -= 2; } Sfx.menu(); }
    if (hit(...UP) && row > 0) { idx -= 3; Sfx.menu(); }
    if (hit(...DOWN) && row < 2) { idx += 3; Sfx.menu(); }
    const hover = levelRects().findIndex(r => inRect(r, mouse.x, mouse.y));
    if (mouse.moved && hover >= 0 && hover !== idx) { idx = hover; Sfx.menu(); }
    while (page * 9 + idx + 1 > BEDTIME_SLOT) idx--;
    levelPick.idx = idx; levelPick.page = page;
    if ((mouse.clicked && hover >= 0) || (stateT > 0.2 && hit('Enter', 'Space'))) {
      const lvl = page * 9 + idx + 1;
      if (lvl === BEDTIME_SLOT && gameComplete()) { Sfx.menu(); startEnding('levels'); }
      else if (lvl <= Math.min(unlocked, LEVEL_COUNT)) { select.level = lvl; select.row = 0; Sfx.menu(); setState('select'); }
      else Sfx.deny();
    }
    // Build one missing snapshot per frame so the screen never freezes
    for (let i = 0; i < 9; i++) { const lvl = page * 9 + i + 1; if (lvl <= LEVEL_COUNT && !THUMBS.has(lvl)) { THUMBS.set(lvl, makeThumb(lvl)); break; } }
  }
  // Renders part of a level (around where the dog starts) at half size
  function makeThumb(lvl) {
    const realRandom = Math.random;
    const w = generateWorld(lvl, 'medium');
    Math.random = realRandom;
    const vw = LP.thumbW * 2, vh = LP.thumbH * 2;
    // Frame the busiest part of the level: the window with the most props, trees and plants in it
    const things = [...w.objects.map(o => [(o.tx + o.w / 2) * TILE, (o.ty + o.h) * TILE, FLAT_DECOR.has(o.kind) ? 0 : 2]), ...w.plants.map(p => [p.x, p.y, 0.3])];
    for (let i = 0; i < w.tiles.length; i++) if (w.tiles[i] === T.TREE || w.tiles[i] === T.BUSH || w.tiles[i] === T.WATER || w.tiles[i] === T.POOL) things.push([(i % w.W) * TILE + 16, Math.floor(i / w.W) * TILE + 16, w.tiles[i] === T.TREE ? 1.5 : w.tiles[i] === T.BUSH ? 1 : 0.15]);
    let ox = 0, oy = 0, bestScore = -1;
    for (let y = 0; y <= w.pxH - vh; y += 64) for (let x = 0; x <= w.pxW - vw; x += 64) {
      let sc = 0;
      for (const [tx, ty, k] of things) if (tx > x + 20 && tx < x + vw - 20 && ty > y + 30 && ty < y + vh + 20) sc += k;
      if (sc > bestScore) { bestScore = sc; ox = x; oy = y; }
    }
    const big = document.createElement('canvas'); big.width = vw; big.height = vh;
    const g = big.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(w.ground, ox, oy, vw, vh, 0, 0, vw, vh);
    const items = [];
    for (let ty = Math.floor(oy / TILE) - 2; ty < (oy + vh) / TILE + 6; ty++) for (let tx = Math.floor(ox / TILE) - 3; tx < (ox + vw) / TILE + 3; tx++) {
      if (tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
      const v = w.variants[ty * w.W + tx], tile = w.get(tx, ty);
      const img = v && (tile === T.TREE ? SPRITES.trees[v] : tile === T.BUSH ? SPRITES.bushes[v] : null);
      if (img) items.push([ty * TILE + 28, img, tx * TILE + 16 - img.anchorX, ty * TILE + (tile === T.TREE ? 28 : 30) - img.anchorY]);
    }
    for (const o of w.objects) {
      const img = o.kind === 'carrier' ? SPRITES.carrier[o.pet][0] : SPRITES.furniture[o.kind];
      const foot = (o.ty + o.h) * TILE;
      items.push([FLAT_DECOR.has(o.kind) ? -1 : foot, img, (o.tx + o.w / 2) * TILE - img.width / 2, foot - img.height]);
    }
    for (const p of w.plants) items.push([p.y + 14, SPRITES.plants[p.crop], p.x - PLANT_SIZE / 2, p.y - 27]);
    items.sort((a, b) => a[0] - b[0]).forEach(([, img, x, y]) => g.drawImage(img, Math.round(x - ox), Math.round(y - oy)));
    if (w.dark) { g.fillStyle = w.evening ? 'rgba(30,20,60,0.35)' : w.night ? 'rgba(10,14,48,0.66)' : 'rgba(6,8,22,0.5)'; g.fillRect(0, 0, vw, vh); } // night is moonlit blue
    if (w.weather === 'rain') {
      g.fillStyle = 'rgba(30,50,90,0.25)'; g.fillRect(0, 0, vw, vh);
      g.fillStyle = 'rgba(200,225,255,0.6)';
      for (let i = 0; i < 90; i++) g.fillRect((i * 97) % vw, (i * 53) % vh, 2, 10);
    }
    const thumb = document.createElement('canvas'); thumb.width = LP.thumbW; thumb.height = LP.thumbH;
    const tg = thumb.getContext('2d'); tg.imageSmoothingEnabled = true; tg.imageSmoothingQuality = 'high';
    tg.drawImage(big, 0, 0, LP.thumbW, LP.thumbH);
    return thumb;
  }
  function renderLevels() {
    renderBackdrop();
    drawText(ctx, 'CHOOSE A LEVEL', VIEW_W / 2, 14, { scale: 3, align: 'center', color: '#ffd84a' });
    const pages = levelPages();
    drawText(ctx, `PAGE ${levelPick.page + 1} / ${pages}`, VIEW_W - 30, 22, { align: 'right', color: '#cfd3e0' });
    ctx.drawImage(SPRITES.starOn, 24, 16, 16, 16);
    drawText(ctx, `${totalStars()} / ${LEVEL_COUNT * 3}`, 44, 22, { color: '#ffd84a' });
    levelRects().forEach((r, i) => {
      const lvl = levelPick.page * 9 + i + 1, on = i === levelPick.idx;
      if (lvl > BEDTIME_SLOT) return;
      if (lvl === BEDTIME_SLOT) { drawBedtimeTile(r, on); return; }
      const info = levelInfo(lvl), locked = lvl > unlocked;
      ctx.fillStyle = on ? 'rgba(8,10,20,0.95)' : 'rgba(8,10,20,0.75)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      const thumb = THUMBS.get(lvl), tx = r.x + 6, ty = r.y + 6;
      if (thumb) ctx.drawImage(thumb, tx, ty);
      else { ctx.fillStyle = '#20242e'; ctx.fillRect(tx, ty, LP.thumbW, LP.thumbH); drawText(ctx, '...', tx + LP.thumbW / 2, ty + 36, { align: 'center', color: '#6a6a7a' }); }
      if (info.mode) { // a badge for the special levels
        const label = { menace: 'MENACE!', fetch: 'FETCH!', beg: 'BEG!' }[info.mode], col = { menace: '#ff5ad8', fetch: '#c8e83a', beg: '#ffb040' }[info.mode];
        const w = textWidth(label) + 8;
        ctx.fillStyle = '#1a1420'; ctx.fillRect(tx + LP.thumbW - w - 3, ty + 3, w + 2, 13);
        ctx.fillStyle = col; ctx.fillRect(tx + LP.thumbW - w - 2, ty + 4, w, 11);
        drawText(ctx, label, tx + LP.thumbW - w / 2 - 2, ty + 6, { align: 'center', color: '#1a1420', shadow: null });
      }
      if (locked) {
        ctx.fillStyle = 'rgba(8,10,20,0.7)'; ctx.fillRect(tx, ty, LP.thumbW, LP.thumbH);
        ctx.drawImage(SPRITES.padlock, tx + LP.thumbW / 2 - 20, ty + 8, 40, 40);
        drawText(ctx, 'LOCKED', tx + LP.thumbW / 2, ty + 56, { align: 'center', color: '#cfd3e0' });
      }
      drawText(ctx, `${lvl}`, r.x + 8, r.y + LP.thumbH + 14, { scale: 2, color: locked ? '#6a6a7a' : '#ffd84a' });
      drawText(ctx, info.name.replace('THE ', ''), r.x + 16 + textWidth(`${lvl}`) * 2, r.y + LP.thumbH + 18, { color: locked ? '#6a6a7a' : '#ffffff' });
      const stats = levelStats[lvl];
      if (stats && !locked) drawStars(r.x + r.w - 34, r.y + LP.thumbH + 12, stats.stars, 0.5);
      if (stats && stats.best && !locked) drawText(ctx, `BEST ${stats.best}`, r.x + r.w - 8, r.y + LP.thumbH + 26, { align: 'right', color: '#cfd3e0' });
      const b = on ? 3 : 1;
      ctx.fillStyle = on ? (locked ? '#8a6a6a' : '#ffd84a') : '#555b70';
      ctx.fillRect(r.x, r.y, r.w, b); ctx.fillRect(r.x, r.y + r.h - b, r.w, b); ctx.fillRect(r.x, r.y, b, r.h); ctx.fillRect(r.x + r.w - b, r.y, b, r.h);
    });
    drawText(ctx, say('ARROWS: PICK   ENTER: CHOOSE   ESC: BACK', 'TAP A LEVEL TO PLAY IT   X: BACK'), VIEW_W / 2, VIEW_H - 18, { align: 'center', color: '#ffd84a' });
  }

  const cardRects = () => DOG_ORDER.map((_, i) => ({ x: VIEW_W / 2 - 300 + i * 310, y: 52, w: 290, h: 220 }));
  const selectRowRects = () => [292, 334].map(y => ({ x: VIEW_W / 2 - 280, y: y - 8, w: 560, h: 30 }));
  const selectStartRect = { x: VIEW_W / 2 - 80, y: 372, w: 160, h: 28 };
  function updateSelect() {
    if (hit('Escape')) { setState('title'); return; }
    if (hit(...UP)) { select.row = (select.row + 2) % 3; Sfx.menu(); }
    if (hit(...DOWN)) { select.row = (select.row + 1) % 3; Sfx.menu(); }
    const step = hit(...LEFT) ? -1 : hit(...RIGHT) ? 1 : 0;
    if (step) {
      if (select.row === 0) select.dog = (select.dog + DOG_ORDER.length + step) % DOG_ORDER.length;
      else if (select.row === 1) select.diff = Math.max(0, Math.min(2, select.diff + step));
      else select.level = Math.max(1, Math.min(unlocked, select.level + step));
      Sfx.menu();
    }
    let go = stateT > 0.2 && hit('Enter', 'Space');
    if (mouse.clicked) {
      const i = cardRects().findIndex(r => inRect(r, mouse.x, mouse.y));
      if (i >= 0) { go = i === select.dog; select.dog = i; select.row = 0; Sfx.menu(); }
      // the difficulty and level rows: the left half steps down, the right half up
      const row = selectRowRects().findIndex(r => inRect(r, mouse.x, mouse.y));
      if (row >= 0) {
        const step = mouse.x < VIEW_W / 2 ? -1 : 1;
        select.row = row + 1;
        if (row === 0) select.diff = Math.max(0, Math.min(2, select.diff + step));
        else select.level = Math.max(1, Math.min(unlocked, select.level + step));
        Sfx.menu();
      }
      if (touchOn() && inRect(selectStartRect, mouse.x, mouse.y)) go = true;
    }
    if (go) {
      dogId = DOG_ORDER[select.dog];
      difficulty = DIFFICULTY_ORDER[select.diff];
      store.set(KEYS.dog, dogId);
      store.set(KEYS.difficulty, difficulty);
      startRun(select.level);
    }
  }

  function updateHowto() {
    const pages = howtoPages();
    if (hit(...LEFT)) { howtoPage = (howtoPage + pages.length - 1) % pages.length; Sfx.menu(); }
    if (hit(...RIGHT)) { howtoPage = (howtoPage + 1) % pages.length; Sfx.menu(); }
    if (hit(...UP, ...DOWN)) { howtoPage = howtoPage < HOWTO_ROWS[0] ? Math.min(pages.length - 1, howtoPage + HOWTO_ROWS[0]) : Math.max(0, howtoPage - HOWTO_ROWS[0]); Sfx.menu(); } // the other row of tabs
    if (mouse.clicked) {
      const i = howtoTabRects(pages).findIndex(r => inRect(r, mouse.x, mouse.y));
      if (i >= 0) { howtoPage = i; Sfx.menu(); }
    }
    if (hit('Escape', 'Enter')) setState(howtoReturn);
  }

  function updateEffects(dt) {
    hud.pop = Math.max(0, hud.pop - dt);
    hud.bonus = Math.max(0, hud.bonus - dt);
    for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.g * dt; p.life -= dt; }
    particles = particles.filter(p => p.life > 0);
    if (particles.length > 900) particles = particles.slice(-900);
    for (const f of floaters) { f.y -= dt * 28; f.life -= dt; }
    floaters = floaters.filter(f => f.life > 0);
    for (const p of popups) p.life -= dt;
    popups = popups.filter(p => p.life > 0);
    for (const p of prints) p.life -= dt;
    prints = prints.filter(p => p.life > 0);
    for (const f of flyIcons) { f.t += dt / 0.5; if (f.t >= 1) hud.pop = 0.35; }
    flyIcons = flyIcons.filter(f => f.t < 1);
    for (const d of drops) { d.y += 520 * d.s * dt; d.x -= 90 * d.s * dt; if (d.y > VIEW_H) { d.y = -10; d.x = Math.random() * (VIEW_W + 100); } }
  }

  function updateCamera() { // (always frames the playing field, even when called from a menu)
    const w = layout.playW, h = layout.playH;
    cam.x = Math.round(Math.max(0, Math.min(world.pxW - w, dog.x - w / 2)));
    cam.y = Math.round(Math.max(0, Math.min(world.pxH - h, dog.y - 24 - h / 2)));
  }

  // ---- Rendering ----
  const SHADOWS = {};
  function shadow(w, h) {
    const key = w + 'x' + h;
    if (!SHADOWS[key]) {
      const s = new PixelSprite(w, h);
      s.part(Shape.ellipse(w / 2, h / 2, w / 2, h / 2), solid('rgba(20,30,10,0.28)'), { outline: false, flat: true });
      SHADOWS[key] = s.toCanvas();
    }
    return SHADOWS[key];
  }
  const sx = x => Math.round(x - cam.x), sy = y => Math.round(y - cam.y);

  function render() {
    ctx.setTransform(layout.res, 0, 0, layout.res, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (state === 'title') { renderTitle(); return; }
    if (state === 'select') { renderSelect(); return; }
    if (state === 'levels') { renderLevels(); return; }
    if (state === 'howto') { renderHowto(); return; }
    if (state === 'options') { renderOptions(); return; }
    if (state === 'vetTrip') { renderVetTrip(); return; }
    if (state === 'ending') { renderEnding(); return; }
    // The playing field and HUD, zoomed in on a phone; the menus and mini-games over it aren't
    inPlayView(renderPlay, true);
    if (state === 'snake') renderSnakeGame();
    if (state === 'tug') renderTugGame();
    if (state === 'paused') renderPaused();
    if (state === 'roundOver') renderResults();
    if (state === 'intro') renderIntro();
  }
  function renderPlay() {
    // Screen shake and the last-snack punch-in move the world, not the HUD
    const punch = fx.punch > 0 ? Math.sin((1 - fx.punch / 1.1) * Math.PI) * 0.14 : 0;
    const sh = fx.shakeT > 0 ? fx.shakeAmp * Math.min(1, fx.shakeT / 0.15) : 0;
    ctx.save();
    if (sh) ctx.translate(Math.round((Math.random() * 2 - 1) * sh), Math.round((Math.random() * 2 - 1) * sh));
    if (punch) {
      const fx0 = sx(dog.x), fy0 = sy(dog.y - 20);
      ctx.translate(fx0, fy0); ctx.scale(1 + punch, 1 + punch); ctx.translate(-fx0, -fy0);
    }
    renderWorld();
    ctx.restore();
    if (fx.redFlash > 0) { // a red pulse round the edges of the screen (a bee sting)
      const a = fx.redFlash * (0.5 + 0.3 * Math.sin(t * 20)), g = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.35, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.6);
      g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(255,30,30,${a})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    // The round HUD hides behind the pause menu and results panel so they never overlap
    if (!['paused', 'roundOver', 'intro'].includes(state)) renderHUD(state !== 'snake' && state !== 'tug');
    if (state === 'playing' && banner > 0) renderBanner();
    if (callout) renderCallout();
    if (fx.iris > 0) renderIris();
  }

  // The round opens through a growing paw-print-shaped hole in a black screen
  const IRIS_TIME = 0.7;
  let irisCanvas = null;
  function renderIris() {
    if (!irisCanvas || irisCanvas.width !== VIEW_W || irisCanvas.height !== VIEW_H) { irisCanvas = document.createElement('canvas'); irisCanvas.width = VIEW_W; irisCanvas.height = VIEW_H; }
    const g = irisCanvas.getContext('2d'), p = 1 - fx.iris / IRIS_TIME, R = p * p * 1100;
    const cx = sx(dog.x), cy = sy(dog.y - 20);
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = '#0a0c14'; g.fillRect(0, 0, VIEW_W, VIEW_H);
    g.globalCompositeOperation = 'destination-out';
    g.beginPath(); g.ellipse(cx, cy + 0.22 * R, 0.5 * R, 0.42 * R, 0, 0, Math.PI * 2); g.fill();
    for (const [dx, dy] of [[-0.62, -0.32], [-0.24, -0.66], [0.24, -0.66], [0.62, -0.32]]) { g.beginPath(); g.arc(cx + dx * R, cy + dy * R, 0.21 * R, 0, Math.PI * 2); g.fill(); }
    ctx.drawImage(irisCanvas, 0, 0);
  }

  function visibleTiles(fn, margin = 0) {
    const tx0 = Math.max(0, Math.floor(cam.x / TILE) - margin), ty0 = Math.max(0, Math.floor(cam.y / TILE) - margin);
    const tx1 = Math.min(world.W - 1, Math.floor((cam.x + VIEW_W) / TILE) + margin);
    const ty1 = Math.min(world.H - 1, Math.floor((cam.y + VIEW_H) / TILE) + margin + 3);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) fn(tx, ty, world.get(tx, ty));
  }

  // The frame of an animation to show now, at `fps` frames a second
  const cycleFrame = (frames, fps) => frames[Math.floor(t * fps) % frames.length];

  const dogSheet = id => ((id === dogId ? dog.coat : world.mode) && world.weather === 'rain' ? SPRITES.dogsCoat : SPRITES.dogs)[id];
  function dogFrame(id, dir, anim, animT) {
    const set = dogSheet(id)[dir];
    // Front and back views only have idle and walk frames, so other moving animations walk
    const frames = set[anim] || (['sprint', 'slow'].includes(anim) ? set.run : set.idle);
    return frames[Math.floor(Math.abs(animT)) % frames.length];
  }

  function currentDogImage() {
    // Moving: a happy trot, flat out when running/zooming/chasing, creeping when something slows
    // the dog down. Standing: sniffing, nervous (Harley), sitting happily at home time.
    const side = dog.dir === 'left' ? 'left' : 'right';
    let dir = dog.dir, anim = 'idle', frameT = dog.animT;
    const fast = dog.sprinting || dog.zoomies > 0 || (dog.chase && dog.chase.kind === 'chase');
    if (dog.moving) anim = fast && !(dog.beeSlowT > 0) ? 'sprint' : dog.sneaking || speedFactor() < 0.75 ? 'slow' : 'run';
    if (dog.seq) { // scripted moments
      const q = dog.seq, u = q.t;
      dir = side;
      if (q.kind === 'smell') {
        if (u < 0.6) { anim = 'sniff'; frameT = u * 10; }
        else if (u < 1.2) { anim = 'happy'; frameT = u * 10; }
        else if (u < 3) { anim = 'roll'; frameT = (u - 1.2) * 12; } // wriggling belly-up (a loop)
        else { anim = 'shakeWet'; frameT = u * 16; }
      } else if (q.kind === 'mud') {
        if (u < 1.8) { anim = 'roll'; frameT = u * 12; } else { anim = 'shakeWet'; frameT = u * 16; }
      } else if (q.kind === 'bed') { anim = 'happy'; frameT = u * 10; }
      else if (q.kind === 'shake') { anim = 'shakeWet'; frameT = u * 16; }
      else if (q.kind === 'howl') anim = 'howl';
      else if (q.kind === 'shakeToy') { anim = q.item.kind === 'shoe' ? 'shakeShoe' : 'shakeStick'; frameT = u * 16; }
      return dogFrame(dogId, dir, anim, frameT);
    }
    if (fetchGame && ['setup', 'spin', 'cheer'].includes(fetchGame.phase)) return dogFrame(dogId, side, 'happy', t * 8);
    if (beg && beg.target && beg.meter > 0) return dogFrame(dogId, side, beg.meter < BEG_HOLD * 0.4 ? 'happy' : 'stand', t * 8); // sit, then beg up on the back legs
    if (dog.digging) { dir = side; anim = dog.digging.kind === 'reach' ? 'stand' : 'dig'; frameT = t * (dog.digging.kind === 'reach' ? 8 : 12); }
    else if (dog.drinking && dog.drinkT > 0.3) { dir = side; anim = 'drink'; frameT = t * 6; }
    else if (dog.woofT > 0 && !dog.moving) { dir = side; anim = 'woof'; frameT = (1 - dog.woofT / WOOF_TIME) * 8; }
    else if (dog.greet > 0) { dir = side; anim = anxious() ? 'nervous' : 'happy'; frameT = t * 8; }
    else if (dog.poop > 0) {
      // The 16-frame squat plays once across the poop break: down (frames 0-8), hold low while
      // the poop happens, then back up (frames 9-15)
      // (the raincoat squat is a shorter loop of the dog holding the squat, so it just loops)
      dir = side; anim = 'squat';
      const p = 1 - dog.poop / POOP_TIME;
      frameT = p < 0.3 ? (p / 0.3) * 8 : p < 0.75 ? 8 : Math.min(15, 8 + ((p - 0.75) / 0.25) * 8);
      if (dogSheet(dogId).right.squat.length < 16) frameT = t * 6;
    }
    else if (dog.chase && dog.chase.kind === 'fixate' && dog.chase.stage === 'play') {
      if (dog.chase.critter.kind === 'toy') { dir = side; anim = 'play'; }
      else { dir = 'up'; anim = 'sit'; }
    } else if (state === 'snake' && !dog.moving) {
      dir = side;
      if (anxious()) anim = dog.barkPose <= 0 ? 'nervous' : 'barkStand';
      else if (snakeGame && snakeGame.phase === 'fight') { anim = 'shakeSnake'; frameT = t * 14; } // Bobbin tugs the snake about (the tug strip, snake for rope)
      else anim = 'barkStand';
    } else if (state === 'tug' && tugGame) {
      dir = side;
      if (tugGame.phase === 'win') anim = 'happy';
      else { anim = 'tug'; frameT = t * (tugGame.phase === 'fight' ? 14 : 6); }
    } else if (!dog.moving) {
      if (owner && owner.phase === 'hug') { dir = side; anim = 'happy'; }
      else if (dog.scared > 0 && anxious()) { dir = side; anim = 'nervous'; }
      else if (sniff.active > SNIFF_TIME - 1.3) { dir = side; anim = 'sniff'; }
      else if (dog.idleT > IDLE_SIT && state === 'playing') { // sits down, then holds the last few frames
        const n = SPRITES.dogs[dogId].right.sitDown.length, held = Math.max(0, n - 4);
        const f = (dog.idleT - IDLE_SIT) * 8;
        dir = side; anim = 'sitDown'; frameT = f < n ? f : held + (Math.floor(f) % (n - held));
      }
    }
    // Side-on with a stick: the trot-with-a-stick strip (its first frame held when standing still)
    dog.stickInSprite = false;
    if (dog.carry && dog.carry.kind === 'stick' && (dir === 'left' || dir === 'right') && ['idle', 'run', 'sprint', 'slow', 'sitDown'].includes(anim)) {
      if (!dog.moving) frameT = 0;
      anim = 'carry'; dog.stickInSprite = true;
    }
    return dogFrame(dogId, dir, anim, frameT);
  }

  function drawDog(alpha = 1) {
    const shiver = dog.scared > 0 ? (Math.floor(t * 30) % 2 ? 1 : -1) : 0;
    const hop = dog.hop || 0;
    if (alpha === 1) ctx.drawImage(shadow(30, 7), sx(dog.x - 15), sy(dog.y - 4));
    if (dog.stun > 0 && state === 'playing' && Math.floor(t * 16) % 2) return;
    ctx.globalAlpha = alpha;
    const frame = currentDogImage(), img = dog.mudCoat > 0 ? muddy(frame, Math.min(1, dog.mudCoat / 3)) : frame;
    dog.drawnAt = { img: frame, x: sx(dog.x - DOG_FOOT_X) + shiver, y: sy(dog.y - DOG_FOOT_Y + hop) }; // for the carried stick
    ctx.drawImage(img, dog.drawnAt.x, dog.drawnAt.y);
    ctx.globalAlpha = 1;
    if (dog.beeSlowT > 0) { // stung: a sore red lump, and dizzy stars going round its head
      const hx = sx(dog.x), hy = sy(dog.y - 46 + hop);
      ctx.fillStyle = '#ff3a3a'; ctx.fillRect(hx + (dog.dir === 'left' ? -12 : 8), hy + 6, 4, 3); ctx.fillStyle = '#ffb0b0'; ctx.fillRect(hx + (dog.dir === 'left' ? -11 : 9), hy + 6, 1, 1);
      for (let k = 0; k < 3; k++) {
        const a = t * 5 + k * 2.1, x = Math.round(hx + Math.cos(a) * 14), y = Math.round(hy - 6 + Math.sin(a) * 4);
        ctx.fillStyle = k === 1 ? '#ffffff' : '#ffd84a'; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    // Bobbin holding the snake in her mouth, shaking it
    if (state === 'snake' && !anxious() && snakeGame && snakeGame.phase !== 'intro' && world.snake) {
      const sn = world.snake, face = dog.dir === 'left' ? -1 : 1;
      const swing = snakeGame.phase === 'fight' ? snakeGame.shake * 6 * Math.abs(Math.sin(t * 20)) : 0;
      if (snakeGame.phase === 'fight') return; // the shake animation has the snake in her mouth
      const img = SPRITES.snake.limp[0];
      ctx.globalAlpha = sn.alpha ?? 1;
      ctx.drawImage(face > 0 ? img : flipCached(img), sx(dog.x + face * MOUTH_DX - 24 + swing), sy(dog.y - MOUTH_DY - 2));
      ctx.globalAlpha = 1;
    }
  }
  // A mud-covered dog: the frame washed with brown
  let mudCv = null;
  function muddy(img, k) {
    if (!mudCv) { mudCv = document.createElement('canvas'); mudCv.width = DOG_W; mudCv.height = DOG_H; }
    const g = mudCv.getContext('2d');
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, DOG_W, DOG_H); g.drawImage(img, 0, 0);
    g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(92,60,30,${0.55 * k})`; g.fillRect(0, 0, DOG_W, DOG_H);
    g.fillStyle = `rgba(60,38,18,${0.6 * k})`; for (let i = 0; i < 14; i++) g.fillRect((i * 23) % 50 + 8, (i * 17) % 30 + 30, 3, 2); // splodges
    g.globalCompositeOperation = 'source-over';
    return mudCv;
  }
  const FLIP_CACHE = new Map();
  function flipCached(img) { if (!FLIP_CACHE.has(img)) FLIP_CACHE.set(img, flipCanvas(img)); return FLIP_CACHE.get(img); }

  function drawCat(cat) {
    if (cat.asleep) {
      ctx.drawImage(SPRITES.catSleep[Math.floor(t * 1.2) % 2], sx(cat.x - 18), sy(cat.y - 26));
      if (Math.floor(t * 1.5) % 2 === 0) drawText(ctx, 'Z', sx(cat.x + 10), sy(cat.y - 34 - (t * 6) % 6), { color: '#cfd3e0' });
      return;
    }
    const set = SPRITES.cat[cat.dir];
    const img = cat.swipeT > 0 && set.swipe ? set.swipe[0] : cat.moving ? set.walk[Math.floor(cat.animT) % set.walk.length] : set.idle[0];
    ctx.drawImage(shadow(24, 6), sx(cat.x - 12), sy(cat.y - 4));
    ctx.drawImage(img, sx(cat.x - 18), sy(cat.y - 26));
  }

  function drawCritter(c) {
    if (c.state === 'gone' || c.kind === 'tv') return;
    ctx.globalAlpha = c.state === 'escaped' ? Math.max(0, c.t / 0.6) : 1;
    const moving = c.state === 'fleeing' || c.state === 'escaped' || !!c.move;
    if (c.kind === 'frog') {
      const img = moving ? SPRITES.frog.hop : c.animT % 2 < 0.4 ? SPRITES.frog.puff : SPRITES.frog.idle;
      if (!c.splashed) ctx.drawImage(shadow(16, 5), sx(c.x - 8), sy(c.y - 3));
      ctx.drawImage(img, sx(c.x - 11), sy(c.y - 16 + c.hop));
    } else if (c.kind === 'toy') {
      ctx.drawImage(shadow(14, 4), sx(c.x - 7), sy(c.y - 3));
      ctx.drawImage(SPRITES[c.toy], sx(c.x - 10), sy(c.y - 16 + (c.hop || 0)));
    } else {
      const sheet = { lizard: SPRITES.lizard, mouse: SPRITES.mouse, beetle: SPRITES.beetle, crab: SPRITES.crab }[c.kind];
      const frames = sheet[c.facing < 0 ? 'left' : 'right'];
      const step = moving ? Math.floor(t * 14) % 2 : (c.animT % 3 < 0.3 ? 1 : 0);
      const img = frames[step];
      ctx.drawImage(img, sx(c.x - img.width / 2), sy(c.y - img.height + 2));
    }
    ctx.globalAlpha = 1;
  }

  function drawPerson(sheet, p, anim) {
    const set = sheet[p.dir || 'down'], frames = set[anim] || set.idle;
    ctx.drawImage(shadow(30, 8), sx(p.x - 15), sy(p.y - 5));
    ctx.drawImage(frames[Math.floor(p.animT || 0) % frames.length], sx(p.x - OWNER_FOOT_X), sy(p.y - OWNER_FOOT_Y));
  }

  function drawOwner() {
    const img = owner.phase === 'hug' ? SPRITES.owner.down.idle[0] : SPRITES.owner.down.call[0];
    const pop = owner.phase === 'appear' ? Math.min(1, owner.t / 0.3) : 1;
    ctx.drawImage(shadow(30, 8), sx(owner.x - 15), sy(owner.y - 5));
    if (pop < 1) { // pops in: grows up out of a sparkle
      const h = Math.max(4, Math.round(OWNER_FOOT_Y * pop));
      ctx.drawImage(img, sx(owner.x - OWNER_FOOT_X), sy(owner.y - h), OWNER_W, h);
    } else ctx.drawImage(img, sx(owner.x - OWNER_FOOT_X), sy(owner.y - OWNER_FOOT_Y));
  }

  function speechBubble(x, y, text) {
    const w = textWidth(text) + 10, bx = Math.round(x - w / 2), by = Math.round(y);
    ctx.fillStyle = '#2a2230'; ctx.fillRect(bx - 1, by - 1, w + 2, 15);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, w, 13);
    ctx.fillRect(Math.round(x) - 2, by + 13, 5, 2); ctx.fillRect(Math.round(x) - 1, by + 15, 3, 2);
    ctx.fillStyle = '#2a2230'; ctx.fillRect(Math.round(x) - 3, by + 13, 1, 2); ctx.fillRect(Math.round(x) + 3, by + 13, 1, 2);
    drawText(ctx, text, x, by + 3, { align: 'center', color: '#2a2230', shadow: null });
  }

  // Little pop-up icon bubble ("!" when something starts, "?" as an early warning)
  function iconBubble(x, y, text, colour, bounce = 0) {
    const bx = Math.round(x) - 6, by = Math.round(y) - 16 - bounce;
    ctx.fillStyle = '#2a2230'; ctx.fillRect(bx - 1, by - 1, 14, 16);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(bx, by, 12, 14);
    ctx.fillRect(bx + 4, by + 14, 4, 2);
    drawText(ctx, text, bx + 6, by + 4, { align: 'center', color: colour, shadow: null });
  }

  function drawTreat(tr, alpha) {
    const bob = tr.type.grown ? 0 : Math.round(Math.sin(t * 4 + tr.phase) * 1.5);
    const x = sx(tr.x - 10), y = sy(tr.y - (tr.type.grown ? 18 : 12)) + bob;
    if (x < -20 || y < -20 || x > VIEW_W || y > VIEW_H) return;
    let a = alpha;
    if (tr.plant && tr.life < 3 && Math.floor(t * 8) % 2) a *= 0.35; // about to rot
    ctx.globalAlpha = a;
    if (alpha === 1 && !tr.type.grown) ctx.drawImage(shadow(16, 4), sx(tr.x - 8), sy(tr.y + 7));
    ctx.drawImage(SPRITES[tr.type.sprite], x, y);
    if ((tr.type.golden || tr.type.rare) && Math.floor(t * 6 + tr.phase) % 4 === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 16, y - 1, 2, 2);
      ctx.fillRect(x - 1, y + 13, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function pixelCircle(cx, cy, r, colour) {
    ctx.fillStyle = colour;
    const steps = Math.max(12, Math.floor(r * Math.PI / 2));
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 2, 2);
    }
  }

  // Draws a prop at a world position, see-through when the dog is behind it
  function drawProp(img, x, y, footY) {
    const behind = dog.y < footY - 4 && dog.y > y + 34 && dog.x > x + 8 && dog.x < x + img.width - 8 && (footY - y) > 40;
    ctx.globalAlpha = behind ? 0.55 : 1;
    ctx.drawImage(img, sx(x), sy(y));
    ctx.globalAlpha = 1;
  }

  function renderWorld() {
    ctx.drawImage(world.ground, cam.x, cam.y, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);

    // Ripples on ponds and the pool (rain makes rings)
    visibleTiles((tx, ty, tile) => {
      if (tile !== T.WATER && tile !== T.POOL) return;
      const k = tx * 7 + ty * 13, phase = (t * 0.8 + k * 0.37) % 2;
      ctx.fillStyle = tile === T.POOL ? '#a8e0fa' : '#a8d4f8';
      if (phase < 1.2) ctx.fillRect(sx(tx * TILE + 6 + (k * 5) % 14 + phase * 4), sy(ty * TILE + 8 + (k * 3) % 14), 5, 1);
      if (world.weather === 'rain' && (k + Math.floor(t * 3)) % 5 === 0) pixelCircle(sx(tx * TILE + 16), sy(ty * TILE + 16), 2 + ((t * 8 + k) % 6), 'rgba(220,240,255,0.6)');
    });

    // Things lying on the ground
    ctx.fillStyle = '#4a3018';
    for (const p of prints) {
      ctx.globalAlpha = Math.min(1, p.life / 2) * 0.7;
      const k = p.big ? 3 : 2; // a mud-covered dog leaves big prints
      ctx.fillRect(sx(p.x - 3), sy(p.y), k, k); ctx.fillRect(sx(p.x + 1), sy(p.y - 1), k, k);
    }
    ctx.globalAlpha = 1;
    for (const w of world.wetSpots || []) { // freshly mopped: a glossy wet patch that dries
      ctx.globalAlpha = Math.min(1, w.life / 4) * 0.5;
      ctx.fillStyle = '#9ec8e0'; ctx.beginPath(); ctx.ellipse(sx(w.x), sy(w.y), w.r, w.r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(sx(w.x - w.r * 0.4), sy(w.y - 2), 4, 1);
      ctx.globalAlpha = 1;
    }
    drawTangles();
    drawSmells();
    for (const it of world.items || []) if (it !== dog.carry && !it.gone) drawGroundItem(it);
    for (const sp of world.sprinklers) drawSprinkler(sp);
    for (const o of world.objects) if (FLAT_DECOR.has(o.kind) || o.walkable) {
      const img = SPRITES.furniture[o.kind], bob = FURNITURE[o.kind].bob ? Math.round(Math.sin(t * 2 + o.tx) * 1.5) : 0;
      ctx.drawImage(img, sx((o.tx + o.w / 2) * TILE - img.width / 2), sy((o.ty + o.h) * TILE - img.height + 2) + bob);
    }
    for (const p of world.beachPeople || []) if (p.kind === 'sun') drawBeachPerson(p); // lying flat: the dog trots over the top
    if (world.hive && world.hive.honey) ctx.drawImage(SPRITES.honey, sx(world.hive.honeyX - 10), sy(world.hive.honeyY - 12));
    for (const p of world.poops) {
      ctx.drawImage(SPRITES.poop, sx(p.x - 10), sy(p.y - 16));
      if (Math.floor(t * 10) % 2) { ctx.fillStyle = '#101010'; ctx.fillRect(sx(p.x + Math.sin(t * 9) * 6), sy(p.y - 18 + Math.cos(t * 7) * 3), 1, 1); } // a fly
    }
    for (const p of world.pickups) if (!p.taken) ctx.drawImage(SPRITES[p.kind], sx(p.x - 10), sy(p.y - 14 + Math.sin(t * 4) * 2));
    for (const tr of world.treats) if (!tr.collected && !tr.plant && !tr.lift && !(tr.goneT > 0)) drawTreat(tr, 1);
    drawDigs();
    drawWaves();
    for (const f of flyers) if (f.state !== 'perched' && f.alt < 120) { const w = Math.max(4, Math.round(12 * (1 - f.alt / 200))); ctx.drawImage(shadow(w, 4), sx(f.x - w / 2), sy(f.y - 2)); }
    for (const h of world.hoverers || []) ctx.drawImage(shadow(8, 3), sx(h.x - 4), sy(h.y - 1));

    // Everything that stands up is depth-sorted by where its feet are
    const scene = [];
    const [dogTx, dogTy] = tileOf(dog.x, dog.y);
    visibleTiles((tx, ty, tile) => {
      const v = world.variants[ty * world.W + tx];
      if (tile === T.TREE && v) {
        const img = SPRITES.trees[v], x = tx * TILE + 16 - img.anchorX, y = ty * TILE + 28 - img.anchorY;
        scene.push({ y: ty * TILE + 28, draw: () => drawProp(img, x, y, ty * TILE + 28) });
      } else if (tile === T.BUSH && v) {
        const img = SPRITES.bushes[v];
        const jiggle = dog.moving && tx === dogTx && ty === dogTy ? Math.round(Math.sin(t * 40)) : 0;
        scene.push({ y: ty * TILE + 30, draw: () => ctx.drawImage(img, sx(tx * TILE + 16 - img.anchorX) + jiggle, sy(ty * TILE + 30 - img.anchorY)) });
      }
    }, 3);
    for (const o of world.objects) {
      if (FLAT_DECOR.has(o.kind) || o.walkable) continue;
      const f = FURNITURE[o.kind], foot = (o.ty + o.h) * TILE, cx = (o.tx + o.w / 2) * TILE;
      if (o.kind === 'carrier') {
        const c = world.carriers.find(cc => Math.abs(cc.x - (o.tx * TILE + 16)) < 1);
        const img = SPRITES.carrier[o.pet][c && c.shake > 0 && Math.floor(t * 20) % 2 ? 1 : 0];
        scene.push({ y: foot - 2, draw: () => ctx.drawImage(img, sx(cx - img.width / 2), sy(foot - img.height)) });
        continue;
      }
      const img = o.tipped ? rotatedCached(SPRITES.furniture[o.kind], o.tipped) : SPRITES.furniture[o.kind];
      const x = Math.round(cx - img.width / 2), y = foot - img.height;
      if (x > cam.x + VIEW_W + 20 || x + img.width < cam.x - 20 || y > cam.y + VIEW_H + 20 || foot < cam.y - 20) continue;
      if (o.tipped && o.kind === 'sandcastle') { // stomped flat: just a sandy lump left
        const src = SPRITES.furniture.sandcastle;
        scene.push({ y: foot - 2, draw: () => ctx.drawImage(src, sx(cx - src.width / 2 - 4), sy(foot - src.height * 0.3), src.width + 8, Math.round(src.height * 0.3)) });
        continue;
      }
      if (o.tipped) { // knocked over: lying on its side with rubbish (or soil, or water) spilled out
        const spill = /plant|urn/i.test(o.kind) ? ['#3a2414', '#5a3a20', '#4a7a32', '#5a3a20'] : o.kind === 'birdBath' ? ['#9ec8e0', '#bfe6ff', '#9ec8e0', '#ffffff'] : ['#e8e0c8', '#a07850', '#7a9a5a', '#d0d8e0'];
        scene.push({ y: foot - 2, draw: () => {
          ctx.drawImage(img, sx(x), sy(y + 4));
          for (let k = 0; k < 6; k++) {
            ctx.fillStyle = spill[k % 4];
            ctx.fillRect(sx(cx + o.tipped * (img.width / 2 + 2 + k * 3)) , sy(foot - 4 + ((k * 5) % 7) - 3), 3, 2);
          }
        } });
        continue;
      }
      // Overhead things (arches, the clothesline) are drawn over a dog walking underneath them
      scene.push({ y: f.overhead ? foot + 18 : foot - 2, draw: () => {
        const wob = o.kind === 'bedOwner' && world.stirT > 0 ? Math.round(Math.sin(t * 30) * 2) : 0; // tossing and turning
        drawProp(img, x + wob, y, foot);
        if (o.kind === 'tvUnit') drawTvScreen(o, x, y);
        if (o.messy) drawMessyBed(o, x, y);
        if (o.kind === 'fountain') drawFountainWater(cx, foot);
        if (o.kind === 'bedOwner' && !world.woken) for (let k = 0; k < 3; k++) { // Zzz
          const u = (t * 0.4 + k / 3) % 1;
          ctx.globalAlpha = Math.sin(u * Math.PI);
          drawText(ctx, 'Z', sx(x + 36 + u * 14 + k * 3), sy(y + 24 - u * 26), { color: '#cfd8ff', scale: 1 + (k === 2 ? 1 : 0) });
          ctx.globalAlpha = 1;
        }
      } });
    }
    // Crop plants stand up out of the beds (depth-sorted), with ripe produce hanging on them
    if (world.plants.length) {
      const ripe = new Map(world.treats.filter(tr => tr.plant && !tr.collected).map(tr => [tr.plant, tr]));
      for (const p of world.plants) {
        if (p.x < cam.x - 30 || p.x > cam.x + VIEW_W + 30 || p.y < cam.y - 20 || p.y > cam.y + VIEW_H + 50) continue;
        const sway = Math.round(Math.sin(t * 1.2 + p.x * 0.05) * 0.7);
        scene.push({ y: p.y + 14, draw: () => {
          ctx.drawImage(SPRITES.plants[p.crop], sx(p.x - PLANT_SIZE / 2) + sway, sy(p.y - 27));
          const tr = ripe.get(p);
          if (tr) drawTreat(tr, 1);
        } });
      }
    }
    // Snacks up on tables sit on the top, drawn just in front of the table
    for (const tr of world.treats) if (tr.lift && !tr.collected) scene.push({ y: tr.y - 1, draw: () => drawTreat({ ...tr, y: tr.y - tr.lift }, 1) });
    if (world.tugDog) scene.push({ y: world.tugDog.y, draw: drawTugDog });
    for (const p of world.parkDogs || []) scene.push({ y: p.y, draw: () => drawParkDog(p) });
    for (const st of world.staff || []) scene.push({ y: st.y, draw: () => {
      drawPerson(SPRITES.staff[st.look], st, st.moving ? 'walk' : 'idle');
      if (st.role === 'janitor') drawMop(st);
      if (st.state === 'chase') iconBubble(sx(st.x), sy(st.y - 96), '!', '#e0303a', Math.round(Math.abs(Math.sin(t * 8)) * 3));
    } });
    for (const c of world.critters) if (c.state !== 'gone' && c.kind !== 'tv') scene.push({ y: c.y, draw: () => drawCritter(c) });
    for (const cat of world.cats) scene.push({ y: cat.y, draw: () => drawCat(cat) });
    for (const v of world.vacuums) scene.push({ y: v.y, draw: () => { ctx.drawImage(SPRITES.vacuum, sx(v.x - 13), sy(v.y - 14)); if (Math.floor(t * 3) % 2) { ctx.fillStyle = '#3ae06a'; ctx.fillRect(sx(v.x), sy(v.y - 9), 2, 1); } } });
    for (const v of world.vets) scene.push({ y: v.y, draw: () => drawPerson(SPRITES.vet, v, v.moving ? 'walk' : 'idle') });
    if (world.snake) scene.push({ y: world.snake.y, draw: drawSnake });
    // On the bed the dog is drawn on top of it
    const dogY = dog.seq && dog.seq.kind === 'bed' ? (dog.seq.bed.ty + dog.seq.bed.h) * TILE + 1 : dog.y;
    scene.push({ y: dogY, draw: () => { if (dog.dir === 'up') drawCarry(); drawDog(); if (dog.dir !== 'up') drawCarry(); } });
    for (const d of world.ducks || []) scene.push({ y: d.y, draw: () => drawDuck(d) });
    if (owner) scene.push({ y: owner.y, draw: drawOwner });
    if (world.rivalDog) scene.push({ y: world.rivalDog.y, draw: drawRivalDog });
    if (fetchGame) { scene.push({ y: fetchGame.owner.y, draw: drawFetchOwner }); if (fetchGame.ball) scene.push({ y: fetchGame.ball.y, draw: drawFetchBall }); }
    for (const p of world.beachPeople || []) if (p.kind !== 'sun') scene.push({ y: p.y - (p.kind === 'swim' ? 0 : 4), draw: () => drawBeachPerson(p) });
    if (beg) {
      for (const g of world.guests) scene.push({ y: g.y, draw: () => drawGuest(g) });
      scene.push({ y: beg.plate ? beg.plate.y : 0, draw: drawBegExtras });
    }
    scene.sort((a, b) => a.y - b.y);
    for (const item of scene) item.draw();
    drawBeachTalk();
    if (world.bunting) drawBunting();
    if (beg) drawGull();
    if (dog.inCover) drawDog(0.4); // ghost of the dog showing through leaves or under a table

    // Flyers (birds, moths, bees) are in the air, above everything
    for (const f of flyers) {
      let a = f.state === 'escaped' ? Math.max(0, f.fade / 0.5) : 1;
      if (f.alt > 100) a *= Math.max(0, 1 - (f.alt - 100) / 60); // swooping birds climb out of sight
      ctx.globalAlpha = a;
      const face = (f.face || (f.vx >= 0 ? 1 : -1)) > 0 ? 'right' : 'left';
      if (f.kind === 'bird' && f.state === 'perched') {
        ctx.drawImage(SPRITES[world.area === 'beach' ? 'gullPerch' : 'birdPerch'][face][Math.floor(f.animT) % 2], sx(f.x - 10), sy(f.y - f.alt - 14));
      } else if (f.kind === 'bird') {
        const frames = SPRITES[world.area === 'beach' ? 'gull' : 'bird'][face];
        ctx.drawImage(frames[Math.floor(f.animT) % frames.length], sx(f.x - 10), sy(f.y - f.alt - 8));
      } else if (f.kind === 'duck') {
        const img = SPRITES.duck[f.chick ? 'chick' : 'mum'][face][2 + (Math.floor(f.animT) % 2)];
        ctx.drawImage(img, sx(f.x - img.width / 2), sy(f.y - f.alt - img.height / 2));
      } else drawInsect(f);
      ctx.globalAlpha = 1;
    }
    for (const h of world.hoverers || []) drawInsect(h);
    for (const b of bees) {
      ctx.drawImage(shadow(8, 3), sx(b.x - 4), sy(b.y + 14));
      ctx.drawImage(SPRITES.bee[b.facing < 0 ? 'left' : 'right'][Math.floor(b.animT) % 2], sx(b.x - 7), sy(b.y - 6));
    }

    // Treats revealed by sniffing glow (rare ones in rainbow colours) and show through cover, with a
    // scent trail rising from them; off-screen ones get a glowing arrow at the edge of the screen
    drawStashes();
    for (const tr0 of world.treats) {
      if (tr0.collected || tr0.revealed <= 0) continue;
      const tr = tr0.lift ? { ...tr0, y: tr0.y - tr0.lift } : tr0;
      drawSnackGlow(tr);
      if (tr.hidden) drawTreat(tr, 1);
      ctx.fillStyle = '#fff3a0';
      for (let k = 0; k < 4; k++) {
        const rise = (t * 30 + k * 8) % 32;
        ctx.globalAlpha = (1 - rise / 32) * Math.min(1, tr.revealed);
        ctx.fillRect(sx(tr.x + Math.sin(t * 5 + k * 2) * 5), sy(tr.y - 12 - rise), 2, 2);
      }
      ctx.globalAlpha = 1;
    }

    renderLighting();
    drawSnackMarkers();
    if (dog.whatsThat > 0 && state === 'playing') { // "WHAT'S THAT?" pops up when a distraction starts
      const age = 1.5 - dog.whatsThat, bounce = age < 0.2 ? Math.round(Math.sin((age / 0.2) * Math.PI) * 5) : 0;
      ctx.globalAlpha = Math.min(1, dog.whatsThat / 0.3);
      speechBubble(sx(dog.x), sy(dog.y - 88) - bounce, "WHAT'S THAT?");
      ctx.globalAlpha = 1;
    }

    // The owner is depth-sorted with everything else (she pops in at a spot clear of trees);
    // only her speech bubble sits on top
    if (owner) {
      if (owner.phase === 'call' || owner.phase === 'fetch') speechBubble(sx(owner.x), sy(owner.y - 108), owner.woken ? `BACK TO BED, ${dogInfo().name}!` : owner.early ? `GOOD DOG, ${dogInfo().name}!` : `${dogInfo().name}!`);
    }

    // Harley hears danger coming: warning bubbles over nearby cats, critters, birds and bees
    if (anxious() && state === 'playing') {
      for (const cat of world.cats) if (!cat.asleep && dist(cat, dog) < WARN_RADIUS) iconBubble(sx(cat.x), sy(cat.y - 28), '!', '#ff7a2a');
      for (const c of world.critters) if (c.state === 'idle' && c.kind !== 'tv' && dist(c, dog) < WARN_RADIUS) iconBubble(sx(c.x), sy(c.y - 18), '?', '#3a9a3c');
      for (const f of flyers) if (f.kind === 'bird' && f.state === 'flying' && dist(f, dog) < WARN_RADIUS * 1.4) iconBubble(sx(f.x), sy(f.y - f.alt - 12), '!', '#ff7a2a');
      for (const b of bees) if (Math.hypot(b.x - dog.x, b.y - dog.y) < WARN_RADIUS) iconBubble(sx(b.x), sy(b.y - 10), '!', '#e0303a');
      for (const st of world.staff || []) if (st.state === 'patrol' && dist(st, dog) < WARN_RADIUS) iconBubble(sx(st.x), sy(st.y - 96), '!', '#ff7a2a');
      for (const pd of world.parkDogs || []) if (pd.state !== 'play' && dist(pd, dog) < WARN_RADIUS * 0.8) iconBubble(sx(pd.x), sy(pd.y - 48), '?', '#3a9a3c');
      if (world.snake && world.snake.state === 'idle' && dist(world.snake, dog) < WARN_RADIUS) iconBubble(sx(world.snake.x), sy(world.snake.y - 20), '!', '#e0303a');
    }
    // "!" pop-ups when something starts, bouncing in
    for (const p of popups) {
      const age = p.max - p.life, bounce = age < 0.25 ? Math.round(Math.sin((age / 0.25) * Math.PI) * 6) : 0;
      iconBubble(sx(p.target.x), sy(p.target.y - p.height), '!', '#e0303a', bounce);
    }
    if (dog.stun > 0) {
      ctx.fillStyle = '#ffd84a';
      for (let k = 0; k < 3; k++) {
        const a = t * 10 + (k * Math.PI * 2) / 3;
        ctx.fillRect(sx(dog.x + Math.cos(a) * 12), sy(dog.y - 44 + Math.sin(a) * 3), 2, 2);
      }
    }
    if (dog.scared > 0) { // sweat drop
      const y = sy(dog.y - 46) + Math.floor(((t * 3) % 1) * 6);
      ctx.fillStyle = '#9ad0ff'; ctx.fillRect(sx(dog.x + 10), y, 2, 3); ctx.fillRect(sx(dog.x + 10), y - 1, 1, 1);
    }

    const nose = { x: sx(dog.x), y: sy(dog.y - 18) };
    if (sniff.ring < SNIFF_RADIUS) pixelCircle(nose.x, nose.y, sniff.ring, `rgba(255,243,160,${1 - sniff.ring / SNIFF_RADIUS})`);
    if (state === 'playing' && sniff.active > 0 && Math.floor(t * 8) % 4 !== 0) { // trail toward the nearest snack
      let nearest = null, nearestD = Infinity;
      const hiddenAway = [...(world.digs || []).filter(d => !d.dug && d.type), ...(world.stashes || []).filter(st => !st.done && st.type)];
      for (const tr of [...world.treats, ...hiddenAway]) {
        if (tr.collected || tr.type.rare) continue;
        const d = dist(tr, dog);
        if (d < nearestD) { nearest = tr; nearestD = d; }
      }
      if (nearest && nearestD > 28) {
        const a = Math.atan2(nearest.y - dog.y, nearest.x - dog.x);
        for (const r of [26, 36, 46]) {
          const x = Math.round(nose.x + Math.cos(a) * r), y = Math.round(nose.y + Math.sin(a) * r);
          ctx.fillStyle = '#000000'; ctx.fillRect(x, y + 1, 4, 4);
          ctx.fillStyle = '#fff3a0'; ctx.fillRect(x, y, 4, 4);
        }
      }
    }

    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(sx(p.x), sy(p.y), p.size || 1, p.size || 1);
    }
    ctx.globalAlpha = 1;

    // Rain: blue-grey tint and falling streaks
    if (world.weather === 'rain') {
      ctx.fillStyle = 'rgba(30,50,90,0.2)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = 'rgba(200,225,255,0.55)';
      for (const d of drops) { ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 7); ctx.fillRect(Math.round(d.x) - 1, Math.round(d.y) + 6, 1, 2); }
    }
    for (const f of floaters) drawText(ctx, f.text, sx(f.x), sy(f.y), { align: 'center', color: f.color, scale: f.scale || 1 });
  }

  // A cartoon on the TV: sky, grass and a bouncing ball (the screen is at 13,7 in the TV sprite)
  function drawTvScreen(o, x, y) {
    const tv = world.critters.find(c => c.kind === 'tv' && c.obj === o);
    if (!tv || tv.state === 'spent') return;
    const X = sx(x + 13), Y = sy(y + 7), W = 78, H = 44;
    const scene = Math.floor(t / 3) % 3;
    ctx.fillStyle = ['#5ab0e0', '#e0905a', '#3a3a7a'][scene]; ctx.fillRect(X, Y, W, H);
    ctx.fillStyle = ['#5cbc52', '#c8a050', '#2a6a3a'][scene]; ctx.fillRect(X, Y + 30, W, 14);
    const bx = X + 39 + Math.sin(t * 2) * 28, by = Y + 22 - Math.abs(Math.sin(t * 4)) * 16;
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(Math.round(bx) - 3, Math.round(by) - 3, 7, 7);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(bx) - 2, Math.round(by) - 2, 2, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fillRect(X, Y + ((t * 30) % H), W, 2); // scan line
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.fillRect(X + 2, Y + 2, 16, 1);
  }

  const FLAT_DECOR = new Set(['dogBed', 'scales', 'poolRing', 'lilo']);

  // Sprinkler: a hose snakes off across the lawn; it ticks round before it goes off, then spins
  function drawSprinkler(sp) {
    const seed = sp.x * 0.37 + sp.y * 0.11;
    ctx.fillStyle = '#1c6a24';
    for (let i = 0; i < 40; i++) {
      const u = i / 40, hx = sp.x + 8 + u * 70 * Math.cos(seed), hy = sp.y + 3 + u * 40 * Math.sin(seed) + Math.sin(u * 9 + seed) * 8;
      ctx.fillRect(sx(hx), sy(hy), 2, 2);
    }
    let img;
    if (world.sprinklersOn) {
      img = SPRITES.sprinkler.spin[Math.floor(t * 14) % 4];
      ctx.fillStyle = 'rgba(30,70,140,0.16)';
      ctx.beginPath(); ctx.ellipse(sx(sp.x), sy(sp.y + 4), SPRINKLER_RADIUS * 0.9, SPRINKLER_RADIUS * 0.45, 0, 0, Math.PI * 2); ctx.fill();
    } else if (world.sprinklerT <= 3) {
      img = SPRITES.sprinkler.warn[Math.floor(t * 5) % 2];
      if (Math.random() < 0.08) particles.push({ x: sp.x + 6, y: sp.y - 6, vx: 0, vy: 0, g: 140, life: 0.3, max: 0.3, color: '#a8d4f8', size: 1 });
    } else img = SPRITES.sprinkler.idle[0];
    ctx.drawImage(img, sx(sp.x - 11), sy(sp.y - 14));
  }

  // Water jetting out of the fountain's spout, spilling over the upper bowl and rippling in the basin
  function drawFountainWater(cx, foot) {
    for (let k = 0; k < 8; k++) {
      const p = (t * 1.8 + k / 8) % 1, side = k % 2 ? 1 : -1;
      ctx.fillStyle = k % 3 ? '#cfeaff' : '#ffffff';
      ctx.fillRect(sx(cx + side * p * 13), sy(foot - 92 - Math.sin(p * Math.PI) * 9 + p * 24), 2, 2);
    }
    for (const side of [-1, 1]) for (let k = 0; k < 6; k++) {
      const p = (t * 1.5 + k / 6) % 1;
      ctx.fillStyle = k % 2 ? '#a8d4f8' : '#ffffff';
      ctx.fillRect(sx(cx + side * (19 + p * 5)), sy(foot - 64 + p * 38), 1, 3);
    }
    const r = (t * 14) % 26;
    ctx.fillStyle = `rgba(255,255,255,${0.5 - r / 60})`;
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; ctx.fillRect(sx(cx + Math.cos(a) * (8 + r)), sy(foot - 26 + Math.sin(a) * (3 + r * 0.35)), 1, 1); }
  }

  // After a bounce: muddy paw prints all over the duvet and the pillows knocked askew
  function drawMessyBed(o, x, y) {
    const r = objRect(o);
    ctx.fillStyle = 'rgba(70,50,40,0.55)';
    for (let k = 0; k < 9; k++) {
      const px = r.l + 14 + ((k * 37) % (r.r - r.l - 28)), py = r.t + 20 + ((k * 23) % (r.b - r.t - 30));
      ctx.fillRect(sx(px), sy(py), 3, 2); ctx.fillRect(sx(px + 4), sy(py - 2), 2, 2); ctx.fillRect(sx(px - 3), sy(py - 2), 2, 2);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1;
    for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.moveTo(sx(r.l + 10 + k * 22), sy(r.t + 40)); ctx.quadraticCurveTo(sx(r.l + 20 + k * 22), sy(r.t + 32), sx(r.l + 28 + k * 22), sy(r.t + 44)); ctx.stroke(); }
  }

  // The janitor's mop: a pole in his hands and a grey mop head swishing on the floor
  function drawMop(st) {
    const f = FACING[st.dir], side = f[0] || 1, swish = Math.round(Math.sin(t * (st.moving ? 8 : 3)) * 4);
    const hx = sx(st.x + side * 10), hy = sy(st.y - 44), fx = sx(st.x + side * 18 + swish), fy = sy(st.y + (f[1] > 0 ? 8 : 2));
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(fx, fy - 4); ctx.stroke();
    ctx.fillStyle = '#c8ccd0'; ctx.fillRect(fx - 6, fy - 4, 12, 4);
    ctx.fillStyle = '#9aa0a8'; for (let k = -5; k <= 5; k += 2) ctx.fillRect(fx + k, fy, 1, 2);
  }

  function drawInsect(f) {
    if (f.colour === 'firefly') { // a little bug whose tail glows on and off
      const on = Math.sin((f.t || 0) * 3 + f.cx) > -0.4, x = sx(f.x), y = sy(f.y - f.alt);
      if (on) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 10);
        g.addColorStop(0, 'rgba(220,255,120,0.75)'); g.addColorStop(1, 'rgba(220,255,120,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 10, y - 10, 20, 20);
        ctx.fillStyle = '#f4ffb0'; ctx.fillRect(x - 1, y - 1, 3, 3);
      } else { ctx.fillStyle = '#3a3a20'; ctx.fillRect(x - 1, y - 1, 2, 2); }
      return;
    }
    const fr = Math.floor(f.animT !== undefined ? f.animT : f.t * 14);
    if (f.kind === 'butterfly') {
      const frames = SPRITES.butterfly[f.colour] || SPRITES.butterfly.monarch;
      ctx.drawImage(frames[Math.floor((f.t || 0) * 12) % frames.length], sx(f.x - 8), sy(f.y - f.alt - 7));
    } else ctx.drawImage(SPRITES.moth[fr % 2], sx(f.x - 7), sy(f.y - f.alt - 6));
  }

  // The other dog: waits with a rope toy in its mouth, tail wagging; during the game the rope
  // stretches between the two dogs with the knot sliding toward whoever is winning
  const MOUTH_DX = 27, MOUTH_DY = 32;
  function drawTugDog() {
    const o = world.tugDog;
    if (!o) return;
    ctx.globalAlpha = Math.max(0, o.alpha);
    // Waiting (or running off with it) the other dog holds the rope toy; during the game it tugs
    const tugging = state === 'tug' && tugGame && tugGame.phase !== 'win';
    const holding = !o.moving && (o.state === 'waiting' || tugging) && (o.dir === 'left' || o.dir === 'right');
    const anim = o.moving ? 'run' : holding ? 'tug' : 'idle';
    let dir = o.dir, img;
    if (state === 'tug' && tugGame && tugGame.phase === 'win') img = dogFrame(o.id, o.dir === 'left' ? 'left' : 'right', 'play', t * 8);
    else img = dogFrame(o.id, dir, anim, anim === 'tug' ? t * (tugging && tugGame.phase === 'fight' ? 14 : 5) : o.animT);
    ctx.drawImage(shadow(30, 7), sx(o.x - 15), sy(o.y - 4));
    ctx.drawImage(img, sx(o.x - DOG_FOOT_X), sy(o.y - DOG_FOOT_Y));
    const side = o.dir === 'left' ? -1 : o.dir === 'right' ? 1 : 0;
    if (o.moving && (o.state === 'waiting' || o.won) && side) { // trotting about with the rope toy
      ctx.drawImage(o.dir === 'left' ? flipCached(SPRITES.toyRope) : SPRITES.toyRope, sx(o.x + side * MOUTH_DX - 10), sy(o.y - MOUTH_DY - 4));
    }
    ctx.globalAlpha = 1;
    if (state === 'playing' && o.state === 'waiting' && dist(o, dog) < 6 * TILE) {
      speechBubble(sx(o.x), sy(o.y - 72) - Math.round(Math.abs(Math.sin(t * 3)) * 3), 'TUG?');
    }
    if (state === 'tug' && tugGame) drawRope(o);
  }
  function drawRope(o) {
    const g = tugGame, ds = dog.x < o.x ? 1 : -1;
    const ax = dog.x + ds * MOUTH_DX, ay = dog.y - MOUTH_DY + 2, bx = o.x - ds * MOUTH_DX, by = o.y - MOUTH_DY + 2;
    const n = Math.max(2, Math.round(Math.abs(bx - ax) / 2));
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = ax + (bx - ax) * u, y = ay + (by - ay) * u + Math.sin(u * Math.PI) * (g.phase === 'fight' ? 1 : 3);
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(sx(x), sy(y) - 1, 2, 4);
      ctx.fillStyle = (i >> 1) % 2 ? '#e0303a' : '#f4f0e0'; ctx.fillRect(sx(x), sy(y), 2, 2);
    }
    const ku = 0.5 - g.pos * 0.35, kx = ax + (bx - ax) * ku, ky = ay + (by - ay) * ku; // the knot slides toward the winner
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(sx(kx) - 3, sy(ky) - 3, 7, 7);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(sx(kx) - 2, sy(ky) - 2, 5, 5);
  }

  // Sniffed snacks glow with a pulsing halo (rainbow for the rare zoomies snacks)
  function drawSnackGlow(tr) {
    const x = sx(tr.x), y = sy(tr.y - (tr.type.grown ? 8 : 2));
    const a = Math.min(1, tr.revealed) * (0.55 + 0.25 * Math.sin(t * 6 + tr.phase));
    const col = tr.type.rare ? `hsla(${(t * 300 + tr.phase * 60) % 360},95%,65%,${a})` : `rgba(255,226,90,${a})`;
    const g = ctx.createRadialGradient(x, y, 2, x, y, 22);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,226,90,0)');
    ctx.fillStyle = g; ctx.fillRect(x - 22, y - 22, 44, 44);
    pixelCircle(x, y, 13 + Math.sin(t * 6 + tr.phase) * 2, col);
  }
  // Arrows at the edge of the screen pointing to glowing snacks that are off-screen
  function drawSnackMarkers() {
    if (state !== 'playing') return;
    const cxs = VIEW_W / 2, cys = VIEW_H / 2;
    const buried = [...(world.digs || []).filter(d => !d.dug && d.type), ...(world.stashes || []).filter(st => !st.done && st.type)].map(d => ({ x: d.x, y: d.y, type: d.type, revealed: d.revealed }));
    const smells = (world.smells || []).filter(sm => !sm.found).map(sm => ({ x: sm.x, y: sm.y, type: { sprite: 'poop' }, revealed: sm.revealed, smell: true }));
    for (const tr of [...world.treats, ...buried, ...smells]) {
      if (tr.collected || tr.revealed <= 0) continue;
      const x = tr.x - cam.x, y = tr.y - cam.y;
      if (x > 8 && x < VIEW_W - 8 && y > 30 && y < VIEW_H - 8) continue;
      const a = Math.atan2(y - cys, x - cxs), c = Math.cos(a), si = Math.sin(a);
      const k = Math.min((VIEW_W / 2 - 18) / Math.max(1e-3, Math.abs(c)), (VIEW_H / 2 - 30) / Math.max(1e-3, Math.abs(si)));
      const mx = cxs + c * k, my = cys + si * k;
      ctx.globalAlpha = Math.min(1, tr.revealed) * (0.7 + 0.3 * Math.sin(t * 8));
      const col = tr.smell ? '#9acd50' : tr.type.rare ? `hsl(${(t * 300) % 360},95%,65%)` : '#ffe25a';
      for (let i = 0; i < 4; i++) { // a small chevron of pixels pointing outward
        for (const sgn of [-1, 1]) {
          const px = mx - c * i * 2 + -si * sgn * i * 2, py = my - si * i * 2 + c * sgn * i * 2;
          ctx.fillStyle = '#2a1a00'; ctx.fillRect(Math.round(px) - 1, Math.round(py) - 1, 4, 4);
          ctx.fillStyle = col; ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
        }
      }
      ctx.drawImage(SPRITES[tr.type.sprite], Math.round(mx - c * 18 - 7), Math.round(my - si * 18 - 7), 14, 14);
      ctx.globalAlpha = 1;
    }
  }

  // ---- Lighting: the garage is dark with pools of light (some flicker); lamps glow warm ----
  let lightCv = null, lightG = null;
  const LQ = 3; // the darkness is drawn at 1/3 resolution and scaled up, for chunky retro light edges
  function lightLevel(L) {
    if (!L.flicker) return 1;
    const ph = L.x * 0.013 + L.y * 0.007, cyc = (t * 0.3 + ph) % 1;
    let k = 0.93 + 0.07 * Math.sin(t * 50 + ph * 9);
    if (cyc < 0.1) k = Math.random() < 0.5 ? 0.05 : 0.6; // buzzy stutter
    else if (cyc < 0.15) k = 0;                           // off for a moment
    const on = k > 0.3;
    if (L.on !== undefined && L.on !== on && Math.hypot(L.x - dog.x, L.y - dog.y) < 5 * TILE && Math.random() < 0.3) Sfx.buzz(0.03);
    L.on = on;
    return k;
  }
  function renderLighting() {
    const lights = world.lights || [];
    if (!world.dark && !lights.length) return;
    const levels = lights.map(lightLevel);
    if (world.dark) {
      const w = Math.ceil(VIEW_W / LQ), h = Math.ceil(VIEW_H / LQ);
      if (!lightCv || lightCv.width !== w || lightCv.height !== h) { lightCv = document.createElement('canvas'); lightCv.width = w; lightCv.height = h; lightG = lightCv.getContext('2d'); }
      const g = lightG;
      g.globalCompositeOperation = 'source-over';
      g.clearRect(0, 0, w, h);
      g.fillStyle = world.shade || 'rgba(4,6,18,0.72)'; g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, a) => {
        const gr = g.createRadialGradient(x / LQ, y / LQ, 0, x / LQ, y / LQ, r / LQ);
        gr.addColorStop(0, `rgba(0,0,0,${a * 0.9})`); gr.addColorStop(0.5, `rgba(0,0,0,${a * 0.6})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = gr; g.fillRect((x - r) / LQ, (y - r) / LQ, (2 * r) / LQ, (2 * r) / LQ);
      };
      lights.forEach((L, i) => { if (levels[i] > 0) hole(sx(L.x), sy(L.y), L.r, levels[i]); });
      hole(sx(dog.x), sy(dog.y - 16), 64, 0.5); // the dog never disappears in the dark
      for (const f of [...(world.hoverers || []), ...flyers]) if (f.colour === 'firefly') hole(sx(f.x), sy(f.y - f.alt), 22, 0.55);
      for (const tr of world.treats) if (!tr.collected && tr.revealed > 0) hole(sx(tr.x), sy(tr.y), 26, 0.8);
      // Special levels at night: the other dogs, the owner, and a sniffed-out ball show up
      for (const r of [world.rivalDog, ...(menace || fetchGame ? world.parkDogs || [] : [])]) if (r) hole(sx(r.x), sy(r.y - 16), 44, 0.4);
      if (fetchGame) {
        hole(sx(fetchGame.owner.x), sy(fetchGame.owner.y - 30), 80, 0.7);
        const b = fetchGame.ball;
        if (b && !b.carrier && !b.gone && (b.revealed > 0 || b.flying)) hole(sx(b.x), sy(b.y - 6 - (b.z || 0)), 30, 0.85);
      }
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(lightCv, 0, 0, w * LQ, h * LQ);
    }
    // Colour: a soft wash of warm (or cool) light, and a bright glow at each bulb
    ctx.globalCompositeOperation = 'lighter';
    lights.forEach((L, i) => {
      const k = levels[i];
      if (k <= 0) return;
      const x = sx(L.x), y = sy(L.y);
      if (x < -L.r || x > VIEW_W + L.r || y < -L.r || y > VIEW_H + L.r) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, L.r);
      g.addColorStop(0, `rgba(${L.colour},${(world.dark ? 0.1 : 0.12) * k})`); g.addColorStop(1, `rgba(${L.colour},0)`);
      ctx.fillStyle = g; ctx.fillRect(x - L.r, y - L.r, L.r * 2, L.r * 2);
      if (L.bulbY !== undefined) {
        const by = sy(L.bulbY), b = ctx.createRadialGradient(x, by, 0, x, by, 16);
        b.addColorStop(0, `rgba(${L.colour},${0.5 * k})`); b.addColorStop(1, `rgba(${L.colour},0)`);
        ctx.fillStyle = b; ctx.fillRect(x - 16, by - 16, 32, 32);
      }
    });
    ctx.globalCompositeOperation = 'source-over';
    // Dust drifting through the garage light pools
    if (world.dark) {
      ctx.fillStyle = 'rgba(255,244,214,0.5)';
      lights.forEach((L, i) => {
        if (levels[i] < 0.5) return;
        for (let k = 0; k < 5; k++) {
          const u = (t * 0.05 + k * 0.21 + L.x * 0.001) % 1;
          ctx.fillRect(sx(L.x + Math.sin(u * 12 + k) * L.r * 0.5), sy(L.y - 30 + Math.cos(u * 9 + k * 2) * 24 - u * 20), 1, 1);
        }
      });
    }
  }

  function drawSnake() {
    const sn = world.snake;
    if (!sn) return;
    if (state === 'snake' && !anxious() && snakeGame && snakeGame.phase !== 'intro') return; // in Bobbin's mouth
    ctx.globalAlpha = sn.alpha ?? 1;
    let img, dx = 0;
    if (sn.state === 'idle') img = SPRITES.snake.coiled[0];
    else if (sn.state === 'leaving') img = SPRITES.snake.slither[sn.x >= dog.x ? 'right' : 'left'][Math.floor(t * 8) % 3];
    else if (sn.state === 'beaten') img = SPRITES.snake.limp[0];
    else {
      dx = snakeGame ? Math.round(snakeGame.bar * 18) * (sn.x >= dog.x ? 1 : -1) : 0; // flinches back as you bark
      img = SPRITES.snake.rear[Math.floor(t * 6) % 2];
      if (sn.x < dog.x) img = flipCached(img);
    }
    ctx.drawImage(img, sx(sn.x - 24 + dx), sy(sn.y - 24));
    ctx.globalAlpha = 1;
  }

  function bar(x, y, w, fill, colour, h = 11) {
    const f = Math.max(0, Math.min(1, fill));
    ctx.fillStyle = 'rgba(10,12,20,0.8)'; ctx.fillRect(x, y, w + 4, h);
    ctx.fillStyle = colour; ctx.fillRect(x + 2, y + 2, Math.round(w * f), h - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(x + 2, y + 2, Math.round(w * f), 1);
  }

  function keyCap(x, y, label, lit = false) {
    const w = textWidth(label) + 8;
    ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 1, y - 1, w + 2, 14);
    ctx.fillStyle = lit ? '#ffd84a' : '#e8e8f0'; ctx.fillRect(x, y, w, 11);
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x, y + 9, w, 2);
    drawText(ctx, label, x + 4, y + 2, { color: '#2a2230', shadow: null });
    return w;
  }

  function renderHUD(roundPanel = true) {
    // Housekeeping, small, along the top: level info on the left, keys on the right
    ctx.fillStyle = 'rgba(10,12,20,0.6)';
    const info = `LEVEL ${level}  -  ${world.name}  -  ${diff().name}`;
    ctx.fillRect(0, 0, textWidth(info) + 16, 17);
    drawText(ctx, info, 8, 5, { color: '#cfd3e0' });
    if (!touchOn()) { // (on a phone the pause button sits up there instead)
      const keysText = 'ESC = MENU   P = PAUSE   M = MUTE';
      ctx.fillRect(VIEW_W - textWidth(keysText) - 16, 0, textWidth(keysText) + 16, 17);
      drawText(ctx, keysText, VIEW_W - 8, 5, { align: 'right', color: '#8a8fa0' });
    }

    // The countdown, big at the top in the middle
    const secs = Math.max(0, Math.ceil(timeLeft));
    const clock = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
    const urgent = secs <= 10 && state === 'playing';
    ctx.fillStyle = 'rgba(10,12,20,0.6)'; ctx.fillRect(VIEW_W / 2 - 40, 0, 80, 24);
    if (dog.stings === 1) { // stung once already: a bee with a red cross by the clock
      ctx.fillStyle = 'rgba(10,12,20,0.6)'; ctx.fillRect(VIEW_W / 2 + 42, 0, 22, 22);
      ctx.drawImage(SPRITES.bee.right[Math.floor(t * 8) % 2], VIEW_W / 2 + 46, 4);
      ctx.fillStyle = '#ff3a3a'; for (let k = 0; k < 8; k++) { ctx.fillRect(VIEW_W / 2 + 45 + k * 2, 3 + k * 2, 2, 2); ctx.fillRect(VIEW_W / 2 + 59 - k * 2, 3 + k * 2, 2, 2); }
    }
    drawText(ctx, clock, VIEW_W / 2, 5, { align: 'center', scale: 2, color: urgent && Math.floor(t * 4) % 2 ? '#ff5a5a' : urgent ? '#ffb3b3' : '#ffffff' });

    if (!roundPanel) return; // the mini-games use the bottom of the screen
    // The round panel, bottom-left: snack counter, score, RUN and SNIFF. On a phone your left thumb
    // is down there, so it moves up under the level name and leaves the keys to the buttons
    const touch = touchOn();
    const px = 6, py = touch ? 22 : VIEW_H - 76, pw = touch ? 300 : beg ? 404 : 364, ph = 70;
    ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fillRect(px, py, pw, ph);
    ctx.fillStyle = 'rgba(255,216,74,0.55)';
    ctx.fillRect(px, py, pw, 1); ctx.fillRect(px, py + ph - 1, pw, 1); ctx.fillRect(px, py, 1, ph); ctx.fillRect(px + pw - 1, py, 1, ph);
    const found = Math.max(0, Math.min(world.found, world.goal) - flyIcons.length), left = world.goal - found; // ticks up as each snack lands
    const icon = menace ? 'bin' : fetchGame ? 'ball' : beg ? (world.party ? 'cake' : 'sausage') : { garden: 'carrot', pool: 'burger', house: 'toast', garage: 'kibble', vet: 'vetTreat', beach: 'sausage', store: 'kibble' }[world.area] || 'bone';
    const bounce = hud.pop > 0 ? Math.round(Math.sin((hud.pop / 0.35) * Math.PI) * 4) : 0;
    if (icon === 'bin') ctx.drawImage(SPRITES.furniture.bin, px + 10, py + 2 - bounce, 20, 32);
    else if (icon === 'ball') drawBall(px + 21, py + 20 - bounce, 8);
    else ctx.drawImage(SPRITES[icon], px + 6, py + 5 - bounce, 30, 30);
    const counter = menace ? `${menace.you} SMASHED` : fetchGame ? `${fetchGame.you} - ${fetchGame.them}` : `${found} / ${world.goal}`;
    const done = !menace && !fetchGame && left <= 0, close = !menace && !fetchGame && left > 0 && left <= 2;
    drawText(ctx, counter, px + 42, py + 8 - bounce, { scale: menace ? 2 : 3, color: done || close ? '#7fe08a' : hud.pop > 0 ? '#ffd84a' : '#ffffff' });
    const sub = menace ? 'CRASH INTO EVERYTHING!' : fetchGame ? `BALLS: YOU - ${fetchGame.rival.name}` : done ? 'ALL FOUND!' : left === 1 ? 'LAST ONE!' : beg ? `SNACKS BEGGED - ${left} TO GO` : world.area === 'garden' ? `PICKED - ${left} TO GO` : `${left} TO GO`;
    drawText(ctx, sub, px + 42, py + 33, { color: done || close ? '#7fe08a' : '#cfd3e0' });
    if (hud.bonus > 0 && Math.floor(t * 8) % 2) drawText(ctx, 'BONUS!', px + 46 + textWidth(counter, 3), py + 12, { color: '#ffd84a' });
    drawText(ctx, 'SCORE', px + pw - 10, py + 8, { align: 'right', color: '#cfd3e0' });
    drawText(ctx, String(score), px + pw - 10, py + 19, { align: 'right', scale: 2, color: '#ffd84a' });
    // The combo: its multiplier, and a bar draining until it runs out
    if (combo.t > 0 && combo.n >= 2) {
      const mult = Math.min(COMBO_MAX, combo.n), cx = px + pw - 10;
      drawText(ctx, `SCHMOOP X${mult}`, cx, py + 35, { align: 'right', color: COMBO_COLOURS[mult] });
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(cx - 90, py + 44, 90, 3);
      ctx.fillStyle = COMBO_COLOURS[mult]; ctx.fillRect(cx - 90, py + 44, Math.round(90 * combo.t / COMBO_TIME), 3);
    }
    // The keys, in hand order (A sneak, S bark, D run, Space sniff; W beg in the Beg levels), with the run and sniff bars
    const by = py + ph - 19;
    let x = px + 8;
    if (touch) { // just the bars: RUN and SNIFF
      const ready = sniff.cooldown === 0, stungDrain = dog.beeSlowT > 0 && Math.floor(t * 6) % 2 === 0;
      drawText(ctx, 'RUN', x, by + 2, { color: dog.sprinting ? '#ffd84a' : '#ffffff' }); x += 24;
      bar(x, by - 1, 90, dog.stamina, dog.exhausted ? '#e05a5a' : '#ffd84a', 13); x += 104;
      drawText(ctx, 'SNIFF', x, by + 2, { color: ready ? '#ffffff' : '#9a9a9a' }); x += 34;
      bar(x, by - 1, 90, 1 - sniff.cooldown / SNIFF_COOLDOWN, stungDrain ? '#e05a5a' : ready ? '#7fe08a' : '#6a6a6a', 13);
      if (ready) { ctx.fillStyle = `rgba(127,224,138,${0.25 + 0.2 * Math.sin(t * 6)})`; ctx.fillRect(x - 1, by - 2, 96, 15); }
    } else {
    x += keyCap(x, by, KEY_LABEL.sneak, dog.sneaking) + 4;
    drawText(ctx, 'SNEAK', x, by + 2, { color: dog.sneaking ? '#ffd84a' : '#ffffff' }); x += 36;
    x += keyCap(x, by, KEY_LABEL.bark, dog.woofT > 0) + 4;
    drawText(ctx, 'BARK', x, by + 2, { color: dog.woofT > 0 ? '#ffd84a' : '#ffffff' }); x += 30;
    x += keyCap(x, by, KEY_LABEL.run, down(...RUN) && dog.sprinting) + 4;
    drawText(ctx, 'RUN', x, by + 2); x += 22;
    bar(x, by - 1, 38, dog.stamina, dog.exhausted ? '#e05a5a' : '#ffd84a', 13); x += 46;
    const ready = sniff.cooldown === 0;
    x += keyCap(x, by, KEY_LABEL.sniff, ready && Math.floor(t * 3) % 2 === 0) + 4;
    drawText(ctx, 'SNIFF', x, by + 2, { color: ready ? '#ffffff' : '#9a9a9a' }); x += 32;
    const stungDrain = dog.beeSlowT > 0 && Math.floor(t * 6) % 2 === 0; // the sniff bar flashes red after a sting
    bar(x, by - 1, 38, 1 - sniff.cooldown / SNIFF_COOLDOWN, stungDrain ? '#e05a5a' : ready ? '#7fe08a' : '#6a6a6a', 13);
    if (ready) { ctx.fillStyle = `rgba(127,224,138,${0.25 + 0.2 * Math.sin(t * 6)})`; ctx.fillRect(x - 1, by - 2, 44, 15); }
    x += 46;
    if (beg) {
      const begging = beg.meter > 0;
      x += keyCap(x, by, KEY_LABEL.beg, begging) + 4;
      drawText(ctx, 'BEG', x, by + 2, { color: begging ? '#ffd84a' : '#ffffff' });
    }
    }
    renderModeHUD();

    // Snacks just eaten fly along an arc into the counter
    for (const f of flyIcons) {
      const e = f.t * f.t * (3 - 2 * f.t), tx = px + 21, ty = py + 20;
      const x = f.x + (tx - f.x) * e, y = f.y + (ty - f.y) * e - Math.sin(f.t * Math.PI) * 70, size = 22 + 8 * e;
      ctx.drawImage(f.img, Math.round(x - size / 2), Math.round(y - size / 2), size, size);
    }

    // At night: the noise meter, just above the round panel
    if (world.hush) {
      const ny = touch ? py + ph + 4 : py - 22, n = world.noise;
      ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fillRect(px, ny, 190, 18);
      drawText(ctx, 'NOISE', px + 8, ny + 6, { color: '#cfd3e0' });
      bar(px + 46, ny + 3, 110, n, n > 0.75 ? '#ff5a5a' : n > 0.45 ? '#ffb040' : '#7fe08a', 12);
      if (world.noiseHold > 0 && n > 0) { // the noise is hanging in the air: a pulsing tick at its level
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t * 10)})`;
        ctx.fillRect(px + 48 + Math.round(110 * n) - 1, ny + 1, 2, 16);
      }
      if (world.stirs && world.hush === 'owner') { // one strike: the owner's stirring
        ctx.fillStyle = 'rgba(10,12,20,0.72)'; ctx.fillRect(px + 190, ny, 132, 18);
        if (Math.floor(t * 3) % 2 || n < 0.5) drawText(ctx, 'OWNER STIRRING!', px + 196, ny + 6, { color: '#ffb040' });
      }
      if (n > 0.6 && Math.floor(t * 4) % 2) drawText(ctx, 'SHH!', px + 168, ny + 6, { color: '#ff9a7a' });
    }

    // Status messages, bottom centre to the right of the panel
    let status = null;
    const spotted = (world.staff || []).some(st => st.state === 'chase');
    const waveSoon = world.waves && !world.waves.on && world.waves.t <= 3;
    const sprinklerWarn = world.sprinklers.length && !world.sprinklersOn && world.sprinklerT <= 3;
    if (state === 'homeTime') status = [owner.early ? 'ALL FOUND! HOME TIME!' : 'HOME TIME!', '#ffd84a'];
    else if (dog.beeSlowT > 0) status = [`STUNG! SLOWED DOWN  ${Math.ceil(dog.beeSlowT)}`, Math.floor(t * 4) % 2 ? '#ff5a5a' : '#ffb3b3'];
    else if (menace) status = timeLeft <= 5 ? ['LAST FEW SECONDS!', '#ff7a7a'] : dog.seq ? ['SHAKE SHAKE SHAKE!', '#ffd84a'] : ['MENACE MODE!', `hsl(${(t * 600) % 360},90%,65%)`];
    else if (fetchGame && fetchGame.ball && fetchGame.phase === 'race') status = fetchGame.ball.carrier === 'you' ? ['BRING IT BACK!', '#7fe08a'] : fetchGame.ball.carrier ? ['STEAL IT! BUMP INTO THEM!', '#ff9a5a'] : fetchGame.ball.flying ? ['THERE IT GOES!', '#c8e83a'] : [say(`FIND THE BALL! (${KEY_LABEL.sniff} TO SNIFF)`, 'FIND THE BALL! TAP SNIFF'), '#c8e83a'];
    else if (beg && beg.grumpyT > 0) status = [`EVERYONE'S CROSS WITH YOU ${Math.ceil(beg.grumpyT)}`, '#ff9a9a'];
    else if (dog.zoomies > 0) status = ['ZOOMIES! ' + Math.ceil(dog.zoomies), `hsl(${(t * 600) % 360},90%,65%)`];
    else if (dog.poop > 0) status = [`POOP BREAK! ${Math.ceil(dog.poop)}`, '#e0b080'];
    else if (dog.chase && dog.chase.kind === 'fixate') status = [dog.chase.critter.kind === 'tv' ? 'WATCHING TV...' : 'PLAYTIME!', '#fff3a0'];
    else if (dog.chase) status = [`CHASING A ${dog.chase.critter.kind.toUpperCase()}!`, '#fff3a0'];
    else if (spotted) status = ['SPOTTED! RUN AND HIDE!', '#ff7a7a'];
    else if (dog.digging) status = [dog.digging.kind === 'reach' ? 'UP ON THE BBQ...' : dog.digging.obj ? 'RUMMAGING...' : 'DIGGING...', '#ffe066'];
    else if (dog.greet > 0) status = [anxious() ? 'A BIG DOG SAYS HELLO...' : 'PLAYING WITH A FRIEND!', '#fff3a0'];
    else if (waveSoon) status = ['BIG WAVE COMING!', '#9ad0ff'];
    else if (world.hush && dog.sprinting) status = [say(`TOO NOISY! HOLD ${KEY_LABEL.sneak} TO SNEAK!`, 'TOO NOISY! HOLD SNEAK!'), '#ff9a7a'];
    else if (dog.sneaking && dog.moving) status = ['SNEAKING...', '#cfd8ff'];
    else if (dog.stun > 0) status = ['OUCH!', '#ff7a7a'];
    else if (dog.limp > 0) status = [`LIMPING! SLOWED ${Math.ceil(dog.limp)}`, '#ff9a9a'];
    else if (dog.seq && dog.seq.kind === 'smell') status = ['ROLLING IN IT!', '#c8e88a'];
    else if (dog.seq && dog.seq.kind === 'mud') status = ['ROLLING IN THE MUD!', '#c08a50'];
    else if (dog.drinking && dog.drinkT > 0.3) status = ['DRINKING... RUN REFILLING', '#a8d4f8'];
    else if (dog.stinky > 0) status = [`STINKY DOG! CATS KEEP AWAY ${Math.ceil(dog.stinky)}`, '#9acd50'];
    else if (dog.inTangle) status = ['TANGLED IN THE HOSE!', '#7fe08a'];
    else if (dog.idleT > IDLE_SLEEP) status = [say('ZZZ... PRESS AN ARROW!', 'ZZZ... USE THE STICK!'), '#cfd8ff'];
    else if (sprinklerWarn) status = [`SPRINKLERS IN ${Math.ceil(world.sprinklerT)}!`, '#9ad0ff'];
    else if (dog.scared > 0) status = [`SCARED! SLOWED ${Math.ceil(dog.scared)}`, '#9ad0ff'];
    else if (dog.wet > 0) status = [`SOAKED! SLOWED ${Math.ceil(dog.wet)}`, '#9ad0ff'];
    else if (dog.inMud) status = [world.outdoor ? 'MUDDY PAWS!' : 'SLIPPERY!', '#e0b080'];
    else if (world.weather === 'rain' && !dog.coat) status = ['WET FUR - FIND THE RAINCOAT!', '#9ad0ff'];
    else if (Sfx.muted) status = ['MUTED', '#9a9a9a'];
    if (status) {
      const cx = touch ? VIEW_W / 2 : (px + pw + VIEW_W) / 2, w = textWidth(status[0], 2) + 16;
      ctx.fillStyle = 'rgba(10,12,20,0.6)'; ctx.fillRect(cx - w / 2, VIEW_H - 30, w, 22);
      drawText(ctx, status[0], cx, VIEW_H - 26, { align: 'center', color: status[1], scale: 2 });
    }
  }

  // Big centre-screen callouts (ZOOMIES!, BRAVE DOG!, OUCH! STUNG!...): pop in, hold, fade
  function renderCallout() {
    const c = callout, age = c.max - c.life;
    const scale = age < 0.12 ? 7 : 6;
    ctx.globalAlpha = Math.min(1, c.life / 0.4);
    const w = textWidth(c.text, scale), x0 = VIEW_W / 2 - w / 2;
    const y = VIEW_H / 2 - 110 - (age < 0.2 ? Math.round(Math.sin((age / 0.2) * Math.PI) * 10) : 0);
    if (c.rainbow) {
      let x = x0;
      [...c.text].forEach((ch, i) => {
        drawText(ctx, ch, x, y, { scale, color: `hsl(${(t * 400 + i * 40) % 360},90%,62%)`, shadow: '#2a1040' });
        x += textWidth(ch, scale) + scale;
      });
    } else drawText(ctx, c.text, VIEW_W / 2, y, { scale, align: 'center', color: c.colour, shadow: '#2a1040' });
    ctx.globalAlpha = 1;
  }

  function renderSnakeGame() {
    const g = snakeGame;
    if (!g) return;
    ctx.fillStyle = 'rgba(10,6,20,0.45)';
    ctx.fillRect(0, VIEW_H - 124, VIEW_W, 104);
    const y0 = VIEW_H - 118;
    if (g.phase === 'intro') {
      drawText(ctx, anxious() ? `${dogInfo().name} FREEZES!` : `${dogInfo().name} GRABS IT!`, VIEW_W / 2, y0 + 16, { scale: 3, align: 'center', color: '#ffd84a' });
      drawText(ctx, 'GET READY TO MASH LEFT AND RIGHT!', VIEW_W / 2, y0 + 52, { align: 'center' });
      return;
    }
    if (g.phase !== 'fight') return;
    drawText(ctx, anxious() ? 'BARK!' : 'SHAKE!', VIEW_W / 2, y0, { scale: 3, align: 'center', color: '#ffd84a' });
    // Key caps that flash as they're pressed; the one you need next is bright
    for (const [k, label, x] of [['L', '<', VIEW_W / 2 - 160], ['R', '>', VIEW_W / 2 + 132]]) {
      const lit = g.flash[k] > 0, want = g.last !== k;
      ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 2, y0 + 26, 32, 30);
      ctx.fillStyle = lit ? '#ffd84a' : want ? '#ffffff' : '#9a9aa8'; ctx.fillRect(x, y0 + 26, 28, 26);
      ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.fillRect(x, y0 + 48, 28, 4);
      drawText(ctx, label, x + 14, y0 + 32, { scale: 2, align: 'center', color: '#2a2230', shadow: null });
    }
    bar(VIEW_W / 2 - 112, y0 + 30, 220, g.bar, g.bar > 0.7 ? '#7fe08a' : g.bar > 0.35 ? '#ffd84a' : '#ff7a5a', 20);
    drawText(ctx, `${Math.max(0, g.t).toFixed(1)}S`, VIEW_W / 2, y0 + 62, { align: 'center', color: g.t < 2 ? '#ff7a7a' : '#ffffff' });
    drawText(ctx, anxious() ? 'BARK UNTIL IT BACKS OFF!' : 'SHAKE IT UNTIL IT GIVES UP!', VIEW_W / 2, y0 + 78, { align: 'center', color: '#cfd3e0' });
  }

  function renderTugGame() {
    const g = tugGame;
    if (!g) return;
    ctx.fillStyle = 'rgba(10,6,20,0.45)';
    ctx.fillRect(0, VIEW_H - 124, VIEW_W, 104);
    const y0 = VIEW_H - 118, other = g.park ? g.opp.key : g.opp.id;
    if (g.phase === 'intro') {
      drawText(ctx, `${g.name} ${g.says}`, VIEW_W / 2, y0 + 16, { scale: 3, align: 'center', color: '#ffd84a' });
      drawText(ctx, 'GET READY TO TAP LEFT AND RIGHT!', VIEW_W / 2, y0 + 52, { align: 'center' });
      return;
    }
    if (g.phase !== 'fight') return;
    drawText(ctx, g.tell ? 'BRACE! TAP FAST!' : 'TUG!', VIEW_W / 2, y0, { scale: 3, align: 'center', color: g.tell ? '#ff7a7a' : '#ffd84a' });
    // The meter: your face at your end, theirs at the other; the knot shows who's winning
    const mw = 300, mx = VIEW_W / 2 - mw / 2, my = y0 + 32;
    const youLeft = g.side < 0;
    ctx.fillStyle = '#2a2230'; ctx.fillRect(mx - 2, my - 2, mw + 4, 18);
    const knot = mx + mw / 2 + (youLeft ? -1 : 1) * g.pos * (mw / 2);
    ctx.fillStyle = youLeft ? '#7fe08a' : '#ff7a7a'; ctx.fillRect(mx, my, mw / 2, 14);
    ctx.fillStyle = youLeft ? '#ff7a7a' : '#7fe08a'; ctx.fillRect(mx + mw / 2, my, mw / 2, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(mx, my, mw, 2);
    for (let x = mx; x < mx + mw; x += 6) { ctx.fillStyle = (x / 6) % 2 ? '#e0303a' : '#f4f0e0'; ctx.fillRect(x, my + 5, 6, 4); } // the rope
    ctx.fillStyle = '#2a1a00'; ctx.fillRect(Math.round(knot) - 6, my - 4, 12, 22);
    ctx.fillStyle = '#ffd84a'; ctx.fillRect(Math.round(knot) - 5, my - 3, 10, 20);
    const [lf, rf] = youLeft ? [dogId, other] : [other, dogId];
    ctx.drawImage(SPRITES.faces[lf], mx - 54, my - 14, 48, 46);
    ctx.drawImage(SPRITES.faces[rf], mx + mw + 6, my - 14, 48, 46);
    if (g.tell && Math.floor(t * 12) % 2) { ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.strokeRect(mx - 3, my - 3, mw + 6, 20); }
    for (const [k, label, x] of [['L', '<', mx - 100], ['R', '>', mx + mw + 70]]) {
      const lit = g.flash[k] > 0, want = g.last !== k;
      ctx.fillStyle = '#2a2230'; ctx.fillRect(x - 2, my - 6, 32, 30);
      ctx.fillStyle = lit ? '#ffd84a' : want ? '#ffffff' : '#9a9aa8'; ctx.fillRect(x, my - 6, 28, 26);
      drawText(ctx, label, x + 14, my, { scale: 2, align: 'center', color: '#2a2230', shadow: null });
    }
    drawText(ctx, `${Math.max(0, g.t).toFixed(1)}S`, VIEW_W / 2, y0 + 62, { align: 'center', color: g.t < 2 ? '#ff7a7a' : '#ffffff' });
    drawText(ctx, 'TAP LEFT AND RIGHT IN TURN TO PULL THE KNOT YOUR WAY!', VIEW_W / 2, y0 + 78, { align: 'center', color: '#cfd3e0' });
  }

  function panel(w, h, y = Math.floor((VIEW_H - h) / 2)) {
    const x = Math.floor((VIEW_W - w) / 2);
    ctx.fillStyle = 'rgba(8,10,20,0.9)';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#ffd84a';
    ctx.fillRect(x, y, w, 2); ctx.fillRect(x, y + h - 2, w, 2);
    ctx.fillRect(x, y, 2, h); ctx.fillRect(x + w - 2, y, 2, h);
    return { x, y };
  }

  // Stars stamp down one at a time, each landing with a thud
  function drawResultStars(cx, y, n) {
    const w = ITEM * 2, gap = 6, x0 = Math.round(cx - (w * 3 + gap * 2) / 2);
    for (let i = 0; i < 3; i++) {
      const age = stateT - starTime(i), on = i < n && age >= 0;
      const k = on ? 1 + 2 * Math.max(0, 1 - age / 0.12) : 1, size = w * k;
      ctx.drawImage(on ? SPRITES.starOn : SPRITES.starOff, Math.round(x0 + i * (w + gap) + w / 2 - size / 2), Math.round(y + w / 2 - size / 2), size, size);
    }
  }

  function drawStars(cx, y, n, size = 2) {
    const w = ITEM * size, gap = 6;
    const x0 = Math.round(cx - (w * 3 + gap * 2) / 2);
    for (let i = 0; i < 3; i++) ctx.drawImage(i < n ? SPRITES.starOn : SPRITES.starOff, x0 + i * (w + gap), y, w, w);
  }

  function drawMenu(items, rects, idx, disabledLabel = () => null) {
    rects.forEach((rect, i) => {
      const disabled = disabledLabel(i), on = i === idx;
      if (on) { ctx.fillStyle = 'rgba(255,216,74,0.18)'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h); }
      const label = disabled || items[i];
      drawText(ctx, (on ? '> ' : '') + label + (on ? ' <' : ''), VIEW_W / 2, rect.y + Math.floor((rect.h - 7) / 2), { align: 'center', color: disabled ? '#6a6a7a' : on ? '#ffd84a' : '#ffffff' });
    });
  }

  function renderBanner() {
    ctx.globalAlpha = Math.min(1, banner * 2);
    drawText(ctx, 'LEVEL ' + level, VIEW_W / 2, 90, { scale: 4, align: 'center', color: '#ffd84a', shadow: '#5a2a08' });
    drawText(ctx, world.name, VIEW_W / 2, 126, { scale: 2, align: 'center' });
    const goal = menace ? `SMASH ${MENACE_STARS[0]}+ THINGS IN ${MENACE_TIME} SECONDS!` : fetchGame ? `${FETCH_THROWS} THROWS - BRING THE BALL BACK BEFORE ${fetchGame.rival.name}!` : beg ? `BLUDGE ${world.goal} SNACKS BEFORE TIME RUNS OUT!` : world.area === 'garden' ? `PICK ${world.goal} SNACKS BEFORE THEY ROT!` : `FIND ${world.goal} SNACKS!`;
    drawText(ctx, goal, VIEW_W / 2, 148, { align: 'center' });
    const tips = {
      dogpark: "OTHER DOGS WANT TO PLAY - AND THEY'LL PINCH YOUR SNACKS!", beach: 'DIG IN SAND MOUNDS AND SMASH SANDCASTLES! MIND THE WAVES',
      store: say(`DON'T LET THE STAFF SEE YOU - HOLD ${KEY_LABEL.sneak} TO SNEAK PAST!`, "DON'T LET THE STAFF SEE YOU - HOLD SNEAK TO CREEP PAST!"),
      park: say(`HOLD ${KEY_LABEL.run} TO RUN - PRESS ${KEY_LABEL.sniff} TO SNIFF OUT HIDDEN SNACKS`, 'HOLD RUN TO GO FAST - TAP SNIFF TO FIND HIDDEN SNACKS'), garden: "WATCH OUT FOR BEES - TWO STINGS AND IT'S THE VET!", pool: "DON'T RUN TOO CLOSE TO THE POOL!",
      house: "SOME CATS ARE ASLEEP - SNEAK PAST, DON'T RUN!", garage: "THE ROLLER DOOR'S UP - OIL SPILLS ARE SLIPPERY", vet: 'AVOID THE VET AND HER THERMOMETER!',
    };
    const nightTips = {
      house: say(`SHH! EVERYONE'S ASLEEP - HOLD ${KEY_LABEL.sneak} TO SNEAK!`, "SHH! EVERYONE'S ASLEEP - HOLD SNEAK!"), garage: "IT'S DARK... AND THE OWNER'S ASLEEP - KEEP IT DOWN!",
      vet: "THE JANITOR'S MOPPING - DON'T GET TOO CLOSE (OR TOO LOUD)!", store: 'A GUARD WITH A TORCH PATROLS - STAY OUT OF THE LIGHT!',
      park: say(`DARK OUT THERE! SNIFF (${KEY_LABEL.sniff}) TO FIND SNACKS IN THE GLOOM`, 'DARK OUT THERE! TAP SNIFF TO FIND SNACKS IN THE GLOOM'), garden: 'THE BEES ARE ASLEEP - THE HONEY IS SAFE TONIGHT!',
      pool: "THE POOL LIGHTS ARE ON - DON'T RUN INTO IT!", dogpark: 'ONLY A FEW DOGS ARE OUT TONIGHT', beach: 'THE CRABS COME OUT AT NIGHT - MIND THE WAVES',
    };
    const modeTip = menace ? (world.rivalDog ? `RACE ${world.rivalDog.name} - THE MOST SMASHES WINS! SHAKE STICKS AND SHOES!` : 'EVERY DOG IS A MENACE - SMASH THE MOST TO WIN!')
      : fetchGame ? say(`SHE THROWS LIKE A WINDMILL... SNIFF (${KEY_LABEL.sniff}) TO FIND THE BALL`, 'SHE THROWS LIKE A WINDMILL... TAP SNIFF TO FIND THE BALL') : beg ? (world.party ? `HOLD ${KEY_LABEL.beg} NEXT TO A GUEST TO BEG. SNEAK UP ON LEFT PLATES!` : `HOLD ${KEY_LABEL.beg} NEXT TO A SHOPPER TO BEG. WATCH OUT FOR SEAGULLS!`) : null;
    const tip = modeTip || (world.weather === 'rain' ? 'RAIN SLOWS YOU DOWN - FIND THE RAINCOAT!' : world.night ? nightTips[world.area] : tips[world.area]);
    drawText(ctx, tip, VIEW_W / 2, 162, { align: 'center', color: '#fff3a0' });
    ctx.globalAlpha = 1;
  }

  function renderPaused() {
    const { y } = panel(300, 258, 100);
    drawText(ctx, 'PAUSED', VIEW_W / 2, y + 16, { scale: 3, align: 'center', color: '#ffd84a' });
    if (pauseMenu.confirm) {
      drawText(ctx, 'QUIT TO MENU?', VIEW_W / 2, y + 80, { scale: 2, align: 'center' });
      drawText(ctx, "THIS ROUND WON'T BE SCORED", VIEW_W / 2, y + 104, { align: 'center', color: '#cfd3e0' });
      drawText(ctx, say('ENTER = YES    ESC = NO', 'TAP = YES    X = NO'), VIEW_W / 2, y + 130, { align: 'center', color: '#ffd84a' });
      return;
    }
    drawMenu(PAUSE_MENU, pauseRects(), pauseMenu.idx);
  }

  const starTime = i => 0.45 + i * 0.32;
  function renderResults() {
    const r = result, { y } = panel(460, 420, 15);
    // The dog, beside the card: happy with stars, sheepish without
    const mood = r.fail ? 'nervous' : r.stars ? 'happy' : 'idle';
    ctx.drawImage(dogFrame(dogId, 'right', mood, t * 8), 24, 150, DOG_W * 2, DOG_H * 2);
    const title = r.mode ? r.title : r.fail ? 'VET TRIP!' : r.early ? 'GOOD DOG!' : 'HOME TIME!';
    drawText(ctx, title, VIEW_W / 2, y + 16, { scale: r.mode && title.length > 12 ? 3 : 4, align: 'center', color: r.fail ? '#9ad0ff' : r.early || r.mode ? '#ffd84a' : '#ff9ab5', shadow: '#5a1030' });
    drawText(ctx, `LEVEL ${level} - ${world.name} - ${diff().name}`, VIEW_W / 2, y + 54, { align: 'center', color: '#cfd3e0' });
    drawResultStars(VIEW_W / 2, y + 70, r.stars);
    if (r.mode) { // Menace Run / Fetch: their own lines in place of the snack recap
      drawText(ctx, r.lines[0], VIEW_W / 2, y + 124, { scale: 2, align: 'center' });
      r.lines.slice(1).forEach((line, i) => drawText(ctx, line, VIEW_W / 2, y + 150 + i * 16, { align: 'center', color: i === 0 ? '#ffd84a' : '#cfd3e0' }));
      drawText(ctx, `ROUND POINTS ${Math.round(r.roundPoints * Math.min(1, stateT / 0.9))}   -   TOTAL SCORE ${score}`, VIEW_W / 2, y + 196, { align: 'center' });
      if (r.newBest || r.levelBest) drawText(ctx, r.newBest ? 'NEW BEST SCORE!' : 'NEW BEST FOR THIS LEVEL!', VIEW_W / 2, y + 212, { align: 'center', color: '#ffd84a' });
      if (r.bestCombo >= 2) drawText(ctx, `BEST COMBO X${Math.min(COMBO_MAX, r.bestCombo)}`, VIEW_W / 2, y + 230, { align: 'center', color: COMBO_COLOURS[Math.min(COMBO_MAX, r.bestCombo)] });
      drawMenu(resultItems(), resultRects(), resultMenu.idx, i => (i === 1 && !r.canContinue ? 'CONTINUE (NEED 1 STAR)' : null));
      return;
    }
    drawText(ctx, `SNACKS ${r.found}/${r.goal}`, VIEW_W / 2 - 12, y + 124, { scale: 2, align: 'right' });
    drawText(ctx, `${r.pct}%`, VIEW_W / 2 + 12, y + 124, { scale: 2, color: r.fail ? '#9a9a9a' : r.pct >= UNLOCK_PCT ? '#7fe08a' : '#ff7a7a' });
    const info = r.fail
      ? ['THE ROUND ENDED EARLY - NO STARS THIS TIME', `TOTAL SCORE ${score}`]
      : [`ROUND POINTS ${Math.round(r.roundPoints * Math.min(1, stateT / 0.9))}${r.bonus ? `  (TIME BONUS +${r.bonus})` : ''}`, `TOTAL SCORE ${score}`];
    if (r.newBest) info.push('NEW BEST SCORE!');
    else if (r.levelBest) info.push('NEW BEST FOR THIS LEVEL!');
    info.forEach((line, i) => drawText(ctx, line, VIEW_W / 2, y + 156 + i * 14, { align: 'center', color: i === 2 ? '#ffd84a' : '#ffffff' }));
    // The recap: best combo, where the time went, and what was missed
    const recap = [];
    if (r.mischief.points > 0) {
      const acts = Object.entries(r.mischief.acts).map(([k, n]) => (n > 1 ? `${n} ` : '') + MISCHIEF[k][0]);
      recap.push([`MISCHIEF +${r.mischief.points}: ${acts.slice(0, 3).join(' - ')}${acts.length > 3 ? '...' : ''}`, '#ff8ad8']);
    }
    if (r.bestCombo >= 2) recap.push([`BEST COMBO  SCHMOOP X${Math.min(COMBO_MAX, r.bestCombo)}${r.bestCombo > COMBO_MAX ? ` (${r.bestCombo} IN A ROW)` : ''}`, COMBO_COLOURS[Math.min(COMBO_MAX, r.bestCombo)]]);
    recap.push(r.lostList.length ? ['LOST TIME:  ' + r.lostList.map(([c, s]) => `${c} ${Math.round(s)}S`).join('  -  '), '#ff9a9a'] : ['NO TIME LOST - WHAT A GOOD DOG!', '#7fe08a']);
    if (r.missed > 0) recap.push([`MISSED ${r.missed}${r.where.length ? ': ' + r.where.map(([k, w]) => `${k} ${w}`).join(' - ') : ''}`, '#cfd3e0']);
    if (r.hidden > 0) recap.push([say(`SNIFF (${KEY_LABEL.sniff}) TO MAKE HIDDEN SNACKS GLOW!`, 'TAP SNIFF TO MAKE HIDDEN SNACKS GLOW!'), '#fff3a0']);
    recap.forEach(([line, colour], i) => drawText(ctx, line, VIEW_W / 2, y + 210 + i * 16, { align: 'center', color: colour }));
    drawMenu(resultItems(), resultRects(), resultMenu.idx, i => (i === 1 && !r.canContinue ? (r.fail ? 'CONTINUE (NOT AFTER A VET TRIP)' : `CONTINUE TO NEXT LEVEL (NEED ${UNLOCK_PCT}%)`) : null));
  }

  function renderVetTrip() {
    // Mint vet-clinic backdrop with a cheerful, bandaged dog
    ctx.fillStyle = '#cfe8e2'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#b8d8d0'; for (let x = 0; x < VIEW_W; x += 40) ctx.fillRect(x, 0, 16, VIEW_H - 110);
    ctx.fillStyle = '#dce8e4'; ctx.fillRect(0, VIEW_H - 110, VIEW_W, 110);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, VIEW_H - 110, VIEW_W, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(VIEW_W / 2 - 34, 30, 68, 68); // first-aid cross
    ctx.fillStyle = '#e0303a'; ctx.fillRect(VIEW_W / 2 - 10, 40, 20, 48); ctx.fillRect(VIEW_W / 2 - 24, 54, 48, 20);
    const frames = SPRITES.dogs[dogId].bandaged, img = frames[Math.floor(t * 3) % frames.length];
    ctx.drawImage(shadow(30, 7), VIEW_W / 2 - 60, 300, 120, 24);
    ctx.drawImage(img, VIEW_W / 2 - DOG_W * 1.5, 120, DOG_W * 3, DOG_H * 3);
    drawText(ctx, 'A SUDDEN TRIP TO THE VET', VIEW_W / 2, 350, { scale: 3, align: 'center', color: '#2a4a46', shadow: '#ffffff' });
    drawText(ctx, 'HAS ENDED YOUR SCHMOOPING QUEST', VIEW_W / 2, 378, { scale: 3, align: 'center', color: '#2a4a46', shadow: '#ffffff' });
    drawText(ctx, vetTrip && vetTrip.cause === 'bee' ? '(TWO BEE STINGS...)' : '(BITTEN BY A SNAKE)', VIEW_W / 2, 408, { align: 'center', color: '#4a6a66', shadow: null });
    if (stateT > 1) drawText(ctx, say('PRESS ENTER', 'TAP TO GO ON'), VIEW_W / 2, 428, { align: 'center', color: '#e0303a', shadow: null });
  }

  // Slowly pans around a sunny park behind the menus
  let backdrop = null;
  function renderBackdrop() {
    if (!backdrop) backdrop = generateWorld(1);
    const w = backdrop;
    const hw = (w.pxW - VIEW_W) / 2, hh = (w.pxH - VIEW_H) / 2;
    const bx = Math.round(hw + Math.sin(t * 0.12) * hw), by = Math.round(hh + Math.cos(t * 0.09) * hh);
    ctx.drawImage(w.ground, bx, by, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    const scene = [];
    const tx0 = Math.floor(bx / TILE) - 3, ty0 = Math.floor(by / TILE) - 3;
    for (let ty = ty0; ty <= ty0 + 22; ty++) {
      for (let tx = tx0; tx <= tx0 + Math.ceil(VIEW_W / TILE) + 6; tx++) {
        const v = w.variants[ty * w.W + tx], tile = w.get(tx, ty);
        if (!v || tx < 0 || ty < 0 || tx >= w.W || ty >= w.H) continue;
        const img = tile === T.TREE ? SPRITES.trees[v] : tile === T.BUSH ? SPRITES.bushes[v] : null;
        if (img) scene.push([ty, img, tx * TILE + 16 - img.anchorX, ty * TILE + (tile === T.TREE ? 28 : 30) - img.anchorY]);
      }
    }
    scene.sort((a, b) => a[0] - b[0]).forEach(([, img, x, y]) => ctx.drawImage(img, x - bx, y - by));
    ctx.fillStyle = 'rgba(8,10,20,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function renderTitle() {
    renderBackdrop();
    drawText(ctx, 'SCHMOOP', VIEW_W / 2, 30, { scale: 9, align: 'center', color: '#ffd84a', shadow: '#7a3b10' });
    drawText(ctx, 'QUEST', VIEW_W / 2, 104, { scale: 4, align: 'center' });
    const run = Math.floor(t * 12);
    ctx.drawImage(dogFrame('harley', 'right', 'run', run), VIEW_W / 2 - 300, 122, DOG_W * 2.5, DOG_H * 2.5);
    ctx.drawImage(dogFrame('bobbin', 'right', 'run', run + 3), VIEW_W / 2 - 120, 122, DOG_W * 2.5, DOG_H * 2.5);
    const bob = Math.round(Math.sin(t * 4) * 3);
    ctx.drawImage(SPRITES.pizza, VIEW_W / 2 + 120, 210 + bob, 40, 40);
    ctx.drawImage(SPRITES.cheese, VIEW_W / 2 + 174, 210 - bob, 40, 40);
    // The main keys on one line (HOW TO PLAY > CONTROLS has the lot)
    const keys = [[touchOn() ? ['STICK'] : ['<', '^', 'v', '>'], 'MOVE'], [[KEY_LABEL.sneak], 'SNEAK'], [[KEY_LABEL.bark], 'BARK'], [[KEY_LABEL.run], 'RUN'], [[KEY_LABEL.sniff], 'SNIFF']];
    const kw = keys.reduce((a, [k, l]) => a + k.reduce((b, c) => b + keyCapWidth(c, true) + 2, 0) + textWidth(l) + 22, -22);
    let kx = Math.round(VIEW_W / 2 - kw / 2);
    for (const [k, label] of keys) { for (const c of k) kx += drawKeyCap(kx, 288, c, true) + 2; drawText(ctx, label, kx + 2, 290); kx += textWidth(label) + 22; }
    titleMenu.idx = Math.min(titleMenu.idx, titleItems().length - 1);
    drawMenu(titleItems(), titleRects(), titleMenu.idx);
    if (titleConfirm) {
      const { y } = panel(470, 120, 180);
      drawText(ctx, 'START OVER?', VIEW_W / 2, y + 16, { scale: 3, align: 'center', color: '#ffd84a' });
      drawText(ctx, 'THIS WIPES YOUR STARS AND UNLOCKED LEVELS.', VIEW_W / 2, y + 52, { align: 'center' });
      drawText(ctx, 'YOUR OPTIONS ARE KEPT.', VIEW_W / 2, y + 66, { align: 'center', color: '#cfd3e0' });
      drawText(ctx, say('ENTER = YES, START AGAIN     ESC = NO', 'TAP = YES, START AGAIN     X = NO'), VIEW_W / 2, y + 92, { align: 'center', color: '#ffd84a' });
    }
    const starsWon = Object.values(levelStats).reduce((a, st) => a + (st.stars || 0), 0);
    if (starsWon) drawText(ctx, `STARS COLLECTED ${starsWon}`, VIEW_W - 10, 8, { align: 'right', color: '#9a9a9a' });
    if (touchOn() && IOS_TAB) drawText(ctx, 'FOR FULL SCREEN: TAP SHARE, THEN ADD TO HOME SCREEN', VIEW_W / 2, VIEW_H - 16, { align: 'center', color: '#fff3a0' });
  }
  // An iPhone or iPad can't go full screen in a browser tab, only from a Home Screen icon
  const IOS_TAB = (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !navigator.standalone && !matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches;

  function renderSelect() {
    renderBackdrop();
    drawText(ctx, 'CHOOSE YOUR DOG', VIEW_W / 2, 14, { scale: 3, align: 'center', color: '#ffd84a' });
    cardRects().forEach((r, i) => {
      const id = DOG_ORDER[i], d = DOGS[id], on = i === select.dog;
      ctx.fillStyle = on ? 'rgba(8,10,20,0.92)' : 'rgba(8,10,20,0.6)';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = on ? (select.row === 0 ? '#ffd84a' : '#a08a40') : '#555b70';
      const b = on ? 3 : 1;
      ctx.fillRect(r.x, r.y, r.w, b); ctx.fillRect(r.x, r.y + r.h - b, r.w, b); ctx.fillRect(r.x, r.y, b, r.h); ctx.fillRect(r.x + r.w - b, r.y, b, r.h);
      const img = on ? cycleFrame(SPRITES.dogs[id].right.run, 12) : cycleFrame(SPRITES.dogs[id].right.happy, 6);
      ctx.drawImage(img, r.x + r.w / 2 - DOG_W * 1.25, r.y + 8, DOG_W * 2.5, DOG_H * 2.5);
      const cx = r.x + r.w / 2;
      drawText(ctx, d.name, cx, r.y + 122, { scale: 3, align: 'center', color: on ? '#ffd84a' : '#ffffff' });
      drawText(ctx, d.desc, cx, r.y + 150, { align: 'center', color: '#cfd3e0' });
      drawText(ctx, d.traitName, cx, r.y + 166, { scale: 2, align: 'center', color: d.trait === 'anxious' ? '#9ad0ff' : '#ff9ab5' });
      d.traitLines.forEach((line, j) => drawText(ctx, line, cx, r.y + 186 + j * 12, { align: 'center', color: line[0] === '+' ? '#7fe08a' : '#ff9a7a' }));
    });

    // Difficulty and level rows
    const rowY = [0, 292, 334];
    const rowLabel = (row, text, colour) => {
      const on = select.row === row;
      if (on) { ctx.fillStyle = 'rgba(255,216,74,0.15)'; ctx.fillRect(VIEW_W / 2 - 280, rowY[row] - 6, 560, 26); }
      const arrows = on || touchOn(); // on a phone every row shows its arrows: tap them to change it
      drawText(ctx, (arrows ? '< ' : '') + text + (arrows ? ' >' : ''), VIEW_W / 2, rowY[row], { scale: 2, align: 'center', color: on ? colour : '#cfd3e0' });
    };
    const dk = DIFFICULTY_ORDER[select.diff];
    rowLabel(1, `DIFFICULTY: ${DIFFICULTY[dk].name}`, { easy: '#7fe08a', medium: '#ffd84a', hard: '#ff7a7a' }[dk]);
    const diffHelp = { easy: 'MORE SNACKS, FEWER CATS - CATS NEVER FOLLOW YOU', medium: 'THE NORMAL GAME', hard: 'FEWER SNACKS, MORE CATS - AND THEY HUNT YOU DOWN' }[dk];
    drawText(ctx, diffHelp, VIEW_W / 2, 316, { align: 'center', color: '#9a9aa8' });
    const info = levelInfo(select.level);
    rowLabel(2, `LEVEL ${select.level}: ${info.name}`, '#ffd84a');
    const stats = levelStats[select.level];
    if (stats) drawStars(VIEW_W / 2 + 330, 328, stats.stars, 1);
    if (touchOn()) {
      const r = selectStartRect, on = Math.floor(t * 2) % 2;
      ctx.fillStyle = on ? '#ffd84a' : '#e0b830'; ctx.fillRect(r.x, r.y, r.w, r.h);
      drawText(ctx, 'START!', VIEW_W / 2, r.y + 7, { scale: 2, align: 'center', color: '#2a2230', shadow: null });
      drawText(ctx, 'TIP: CHEESE & PIZZA = ZOOMIES!     X = BACK', VIEW_W / 2, 410, { align: 'center', color: '#fff3a0' });
      return;
    }
    drawText(ctx, 'UP/DOWN: PICK A ROW   LEFT/RIGHT: CHANGE IT   ENTER: START', VIEW_W / 2, 380, { align: 'center', color: '#ffd84a' });
    drawText(ctx, 'TIP: CHEESE & PIZZA = ZOOMIES!     ESC = BACK', VIEW_W / 2, 400, { align: 'center', color: '#fff3a0' });
  }

  // ---- How to Play ----
  const cycle = (frames, fps = 4) => () => frames[Math.floor(t * fps) % frames.length];
  let HOWTO = null;
  // Your dog doing something, for How to Play and the first-time pop-ups (the cell cropped to the dog)
  const dogAnim = (anim, fps = 10) => () => { const s = SPRITES.dogs[dogId].right, f = s[anim] || s.idle; return f[Math.floor(t * fps) % f.length]; };
  function howtoPages() {
    if (HOWTO && HOWTO.touch === touchOn()) return HOWTO;
    const S = SPRITES, touch = touchOn();
    HOWTO = [
      // Each control: the keys (drawn as key caps; < > ^ v are the arrows), what it does, and your dog doing it
      { title: 'CONTROLS', controls: [
        { keys: touch ? ['STICK'] : ['<', '^', 'v', '>'], name: 'MOVE', lines: [touch ? `PUT YOUR THUMB DOWN ON THE ${options.stickLeft ? 'LEFT' : 'RIGHT'} SIDE AND SLIDE.` : 'WALK ANYWHERE WITH THE ARROW KEYS.'], anim: dogAnim('run', 12), strips: ['run'] },
        { keys: [KEY_LABEL.sneak], hold: 'HOLD', name: 'SNEAK', lines: ['SLOW AND QUIET: CATS, GUARDS AND', 'SLEEPING OWNERS NOTICE YOU LESS.'], anim: dogAnim('slow', 10), strips: ['slow'] },
        { keys: [KEY_LABEL.bark], name: 'BARK', lines: ['SCARES BIRDS, DUCKS AND CATS. NOISY!', touch ? 'AT NIGHT OUTSIDE, HOLD IT TO HOWL.' : `AT NIGHT OUTSIDE, HOLD ${KEY_LABEL.bark} TO HOWL.`], anim: dogAnim('woof', 8), strips: ['woof'] },
        { keys: [KEY_LABEL.run], hold: 'HOLD', name: 'RUN', lines: ['FAST, BUT IT USES THE RUN BAR.', 'IT REFILLS WHEN YOU WALK.'], anim: dogAnim('sprint', 14), strips: ['sprint'] },
        { keys: [KEY_LABEL.sniff], name: 'SNIFF', lines: ['HIDDEN SNACKS NEARBY GLOW, AND', 'ARROWS POINT TO ONES OFF SCREEN.'], anim: dogAnim('sniff', 8), strips: ['sniff'] },
        { keys: [KEY_LABEL.beg], hold: 'HOLD', name: 'BEG', lines: [touch ? 'IN BEG LEVELS: HOLD IT NEXT TO' : `IN BEG LEVELS: HOLD ${KEY_LABEL.beg} NEXT TO`, 'SOMEONE, SIT, THEN LOOK CUTE.'], anim: () => (t % 3 < 1.2 ? dogAnim('happy', 8) : dogAnim('stand', 8))(), strips: ['happy', 'stand'] },
        { keys: ['<', '>'], hold: 'TAP IN TURN', name: 'TUG & SNAKE', lines: [touch ? 'TAP THE BIG LEFT AND RIGHT PADS IN' : 'TAP LEFT, RIGHT, LEFT, RIGHT... AS', touch ? 'TURN, AS FAST AS YOU CAN, TO PULL!' : 'FAST AS YOU CAN TO PULL!'], anim: dogAnim('tug', 14), strips: ['tug'] },
        { keys: [], hold: touch ? 'NO BUTTONS' : 'NO KEYS', name: 'STAND STILL', lines: ['DIG ON A MOUND, OR RUMMAGE BY A', 'SOFA, DOG BED OR TOY BOX.'], anim: dogAnim('dig', 10), strips: ['dig'] },
      ], footer: touch ? [['II', 'PAUSE (TOP CORNER)'], ['X', 'BACK'], ['TAP', 'CHOOSE']] : [['P', 'PAUSE'], ['ESC', 'MENU'], ['M', 'MUTE'], ['N', 'MUSIC'], ['ENTER', 'CHOOSE']] },
      { title: 'THE GOAL', entries: [], blurb: [
        "NOBODY'S WATCHING... IT'S SCHMOOPING TIME!",
        '',
        'SNIFF OUT EVERY SNACK YOU CAN FIND',
        'BEFORE YOUR OWNER COMES TO TAKE YOU HOME.',
        '',
        'BUT KEEP YOUR WITS ABOUT YOU: THERE ARE CRITTERS',
        'BEGGING TO BE CHASED, TOYS TO POUNCE ON, AND',
        'A FEW THINGS A GOOD DOG SHOULD STEER WELL CLEAR OF.',
      ], footer: 'FIND HALF THE SNACKS TO UNLOCK THE NEXT LEVEL - FIND THEM ALL FOR 3 STARS!' },
      { title: 'SNACKS', entries: [
        { sprite: cycle([S.bone, S.biscuit, S.sausage], 2), name: 'BONES, BISCUITS, SAUSAGES', lines: ['10-15 POINTS AND +1.5 SECONDS EACH.', 'THE EVERYDAY SNACKS, FOUND EVERYWHERE.'] },
        { sprite: cycle([S.burger, S.toast, S.drumstick, S.cookie, S.kibble, S.sandwich, S.vetTreat], 2), name: 'PLACE SNACKS', lines: ['BURGERS, TOAST, DRUMSTICKS, KIBBLE...', 'EACH PLACE HAS ITS OWN TREATS.'] },
        { sprite: cycle([S.carrot, S.tomato, S.corn, S.eggplant, S.cucumber, S.strawberry, S.peas], 2), name: 'GARDEN PRODUCE', lines: ['RIPENS AT RANDOM IN THE VEGGIE GARDEN.', 'GRAB IT FROM THE BED EDGE BEFORE IT ROTS!'] },
        { sprite: () => S.goldenBone, fx: 'golden', name: 'GOLDEN BONE', lines: ['ONE PER PARK, HIDDEN FAR AWAY.', '50 POINTS AND +5 SECONDS.'] },
        { sprite: () => S.honey, name: 'HONEY', lines: ['DRIPS FROM THE VEGGIE GARDEN BEEHIVE.', 'BONUS 30 POINTS - BUT MIND THE BEES!'] },
        { sprite: cycle([S.cheese, S.pizza], 1.5), fx: 'rare', name: 'CHEESE & PIZZA', lines: ['RARE AND SPARKLY: 25 POINTS EACH.', 'EAT ONE AND YOU GET THE ZOOMIES!'] },
      ] },
      { title: 'FINDING SNACKS', entries: [
        { sprite: dogAnim('sniff', 8), name: 'SNIFF FIRST', lines: ['PRESS [sniff]: HIDDEN SNACKS NEARBY GLOW.', 'EMPTY HIDING PLACES STAY DARK.'] },
        { sprite: cycle([S.bone, S.biscuit, S.kibble], 2), name: 'OUT IN THE OPEN', lines: ['SOME LIE ON THE GROUND. TRAILS OF 3-4', 'IN A ROW MAKE A BIG COMBO!'] },
        { sprite: () => S.furniture.coffeeTable, name: 'UNDER & ON TOP', lines: ['UNDER BUSHES AND TABLES, OR UP ON TOP:', 'WALK UP BESIDE THE TABLE TO REACH.'] },
        { sprite: dogAnim('dig', 10), name: 'DIG', lines: ['STOP ON A MOUND TO DIG IT UP. EVERY', 'OUTDOOR PLACE HAS SOME - SOME ARE EMPTY!'] },
        { sprite: () => S.furniture.sofa, name: 'RUMMAGE', lines: ['STAND STILL BESIDE A SOFA, DOG BED,', 'TOY BOX OR SHOE RACK TO SEARCH IT.'] },
        { sprite: () => S.furniture.bin, name: 'KNOCKED OVER', lines: ['BINS, BOXES AND SANDCASTLES CAN HIDE', 'ONE: CHARGE ([run]) INTO THEM!'] },
      ] },
      { title: 'YOUR DOG', entries: [
        { sprite: () => cycleFrame(S.dogs.harley.right.nervous, 8), name: 'HARLEY - ANXIOUS', lines: ['WARNING BUBBLES OVER CATS AND CRITTERS.', 'SHIVERS NEAR CATS, AND BIRDS SPOOK HIM.'] },
        { sprite: () => cycleFrame(S.dogs.bobbin.right.happy, 8), name: 'BOBBIN - DEAF', lines: ['NEVER SLOWS DOWN NEAR DANGER, BUT GETS', 'NO WARNINGS - AND SHE CHASES BIRDS.'] },
        { sprite: dogAnim('sprint', 14), name: 'ZOOMIES', lines: ["5 SECONDS OF SUPER SPEED. YOU STEER, BUT", "YOU CAN'T STOP. NOT INTO THE POOL!"] },
        { sprite: dogAnim('drink', 6), name: 'RUN BAR & DRINKING', lines: ['RUNNING ([run]) USES THE RUN BAR. DRINK AT', 'A WATER BOWL OR STATION TO TOP IT UP.'] },
        { sprite: dogAnim('squat', 6), name: 'POOP BREAK', lines: ['EVERY 10 SNACKS: A 4 SECOND POOP. STEP', 'IN IT LATER AND YOU SLOW DOWN.'] },
        { sprite: () => S.owner.down.call[0], name: 'HOME TIME', lines: ['WHEN TIME RUNS OUT (OR YOU FIND THEM', 'ALL) THE OWNER CALLS YOUR DOG HOME.'] },
      ] },
      { title: 'SCORING', entries: [
        { sprite: () => S.starOn, name: 'STARS & UNLOCKING', lines: ['SNACK HUNTS: 1 STAR FOR 50%, 2 FOR 75%, 3 FOR 100%. 50% UNLOCKS THE NEXT LEVEL.', 'MENACE RUN AND FETCH NEED 1 STAR. BEG: GET ALL 10 - MORE TIME LEFT, MORE STARS.'] },
        { sprite: cycle([S.sausage, S.bone, S.biscuit], 4), name: 'SCHMOOP COMBO', lines: ['EAT SNACKS WITHIN 3 SECONDS OF EACH OTHER: X2, X3... UP TO X5 POINTS!', 'CHASES, CAT SWIPES, STINGS AND SOAKINGS BREAK THE COMBO.'] },
        { sprite: () => S.furniture.urn, name: 'MISCHIEF POINTS', lines: ['NAUGHTY ACTS (SEE THE MISCHIEF TAB) EARN BONUS POINTS.', 'FULL POINTS THE FIRST TIME IN A ROUND, LESS FOR EACH REPEAT.'] },
        { sprite: () => (S.dogs[dogId].right.sleep || S.dogs[dogId].right.idle)[0], name: '50 LEVELS, THEN BEDTIME', lines: ['30 SNACK HUNTS AND 20 SPECIAL LEVELS - BY DAY, IN THE RAIN AND AT NIGHT.', 'FINISH LEVEL 50 FOR A BEDTIME STORY.'] },
      ] },
      { title: 'DANGERS', entries: [
        { sprite: cycle(S.cat.right.walk, 6), name: 'CATS', lines: ['A SWIPE KNOCKS YOU BACK: -3 SECONDS.', 'EASY: THEY NEVER FOLLOW. HARD: THEY HUNT.'] },
        { sprite: cycle(S.catSleep, 1), name: 'SLEEPING CATS', lines: ['WALK PAST QUIETLY AND THEY SLEEP ON.', 'RUN PAST OR STEP ON ONE: IT WAKES!'] },
        { sprite: () => S.snake.coiled[0], name: 'SNAKE (VERY RARE)', lines: ['TAP [<] [>] IN TURN TO FILL THE BAR.', 'LOSE: BITTEN! -8 SECONDS AND A LIMP.'] },
        { sprite: cycle(S.bee.right, 10), name: 'BEES', lines: ['THE FIRST STING SLOWS YOU RIGHT DOWN.', 'A SECOND ONE ENDS THE LEVEL!'] },
        { sprite: () => S.vacuum, name: 'ROBOT VACUUM & VET', lines: ['BUMP INTO THEM: STUNNED, LOSE TIME.', 'THE VET CHASES YOU WITH A THERMOMETER!'] },
        { sprite: cycle(S.sprinkler.warn, 3), name: 'MUD, SPILLS, SPRINKLERS', lines: ['MUD AND SPILLS SLOW YOU. SPRINKLERS TICK,', 'THEN SPRAY: SOAKED AND SLOW FOR 5S.'] },
      ] },
      { title: 'DISTRACTIONS', entries: [
        { sprite: cycle([S.frog.idle, S.lizard.right[0], S.mouse.right[0], S.beetle.right[0]], 1.5), name: 'CRITTERS', lines: ['FROGS, LIZARDS, MICE, BUGS: GET CLOSE AND', 'THEY BOLT. YOUR DOG CHASES (UP TO 5S).'] },
        { sprite: cycle([...S.bird.right, ...S.butterfly.monarch, S.moth[0], S.moth[1]], 6), name: 'BIRDS & BUTTERFLIES', lines: ['BIRDS SWOOP AND PERCH, MOTHS FLUTTER', 'ROUND FLOWERS. BIRDS SCARE HARLEY.'] },
        { sprite: cycle([S.toyBall, S.toyRope, S.toyChicken, S.toyPlush], 2), name: 'TOYS', lines: ['INDOORS: YOUR DOG POUNCES ON ONE AND', 'PLAYS WITH IT FOR 5 SECONDS.'] },
        { sprite: () => S.furniture.tvUnit, name: 'THE TV', lines: ['IN THE HOUSE: GET TOO CLOSE AND YOUR', 'DOG SITS AND WATCHES IT FOR 5 SECONDS.'] },
        { sprite: () => cycleFrame(S.parkDogs.rusty.right.run, 10), name: 'FRIENDLY DOGS', lines: ['AT THE DOG PARK, OTHER DOGS COME OVER', 'TO SAY HELLO. IT HOLDS YOU UP!'] },
      ] },
      { title: 'PLACES & WEATHER', entries: [
        { sprite: () => S.raincoat, name: 'RAIN & THE RAINCOAT', lines: ['RAIN SLOWS YOU DOWN UNTIL YOU FIND THE', 'RAINCOAT. SPECIAL LEVELS START IN IT.'] },
        { sprite: () => cycleFrame(S.staff.janitor.down.walk, 6), name: 'NIGHT', lines: ['DARK! INDOORS, NOISE FILLS A METER THAT', 'WAKES THE OWNER. SNEAK WITH [sneak]!'] },
        { sprite: () => S.furniture.sandcastle, name: 'BEACH', lines: ['DIG IN SAND MOUNDS. SMASH SANDCASTLES', '([run]): A SNACK, A CRAB, OR JUST SAND!'] },
        { sprite: () => cycleFrame(S.staff.red.down.walk, 6), name: 'PET STORE', lines: ['STAFF CHASE YOU IF THEY SEE YOU. CAUGHT?', 'BATH TIME, -3S. HIDE BEHIND SHELVES!'] },
        { sprite: () => S.furniture.dogParkSign, name: 'DOG PARK', lines: ['OTHER DOGS SOMETIMES PINCH A SNACK -', 'IT TURNS UP AGAIN SOMEWHERE ELSE.'] },
      ] },
      { title: 'MISCHIEF', entries: [
        { sprite: () => S.furniture.urn, name: 'KNOCK IT OVER', lines: ['CHARGE ([run]) INTO POTS, GNOMES AND BINS.', 'THE STATUE? ONLY ZOOMIES WILL DO IT!'] },
        { sprite: dogAnim('roll', 7), name: 'SMELLS', lines: ['SNIFF ONE OUT AND ROLL IN IT! STINKY', 'DOG: CATS KEEP AWAY FOR 10 SECONDS.'] },
        { sprite: () => cycleFrame(S.duck.mum.right.slice(0, 2), 4), name: 'DUCKS', lines: ['THEY WADDLE IN WHEN IT RAINS. RUN OR', 'BARK AT THEM: QUACK QUACK!'] },
        { sprite: dogAnim('carry', 10), name: 'PRESENTS', lines: ['PICK UP A STICK OR A SHOE AND BRING', 'IT TO YOUR OWNER.'] },
        { sprite: () => S.furniture.bed, name: 'MUD ROLL & BED BOUNCE', lines: ['ROLL IN THE MUD, BOUNCE ON THE BED...', 'GOOD DOGS DO NOT DO THIS.'] },
        { sprite: dogAnim('woof', 8), name: 'BARK & HOWL', lines: ['[bark] SCARES BIRDS, DUCKS AND CATS. AT', 'NIGHT OUTSIDE, HOLD [bark] TO HOWL.'] },
      ], footer: 'NAUGHTY BUT FUN: MISCHIEF EARNS BONUS POINTS (LESS EACH TIME YOU REPEAT ONE)' },
      { title: 'SPECIAL LEVELS & GAMES', entries: [
        { sprite: () => S.furniture.wheelieBin, name: 'MENACE RUN', lines: ['30 SECONDS OF ZOOMIES: CRASH INTO EVERYTHING! RACE THE OTHER DOGS FOR THE MOST SMASHES.', 'RUN INTO STICKS AND SHOES TO SHAKE THEM ABOUT. 10 / 18 / 28 SMASHES FOR 1 / 2 / 3 STARS.'] },
        { sprite: () => S.owner.down.call[0], name: 'FETCH', lines: ['SHE SPINS AND FLINGS THE BALL ANYWHERE! FIND IT ([sniff] SNIFFS IT OUT) AND BRING IT BACK FIRST.', 'BUMP WHOEVER HAS IT TO STEAL IT. BEST OF 5 THROWS.'] },
        { sprite: dogAnim('stand', 8), name: 'BEG', lines: ['HOLD [beg] NEXT TO SOMEONE: SIT, THEN BEG! Y = THEY SHARE, X = NO, ? = ASK AGAIN SOON.', "GET 10 SNACKS. PINCH A LEFT PLATE ([sneak] TO SNEAK) - BUT DON'T GET CAUGHT!"] },
        { sprite: dogAnim('tug', 14), name: 'TUG OF WAR (MINI-GAME)', lines: ['A DOG WITH A ROPE IN THE BACKYARD OR DOG PARK: WALK UP, THEN TAP [<] [>] IN TURN.', 'WATCH FOR THE GRRR - TAP FAST TO BRACE AGAINST A YANK! WIN: +75 POINTS, +5S.'] },
      ] },
    ];
    HOWTO.touch = touch;
    return HOWTO;
  }
  // ---- Key caps: a light key with a dark label; < > ^ v draw arrows ----
  function keyCapWidth(label, small = false) { return label.length === 1 ? (small ? 11 : 18) : textWidth(label) + (small ? 6 : 10) + (TOUCH_BUTTONS.includes(label) ? 6 : 0); }
  function drawKeyCap(x, y, label, small = false) {
    const w = keyCapWidth(label, small), h = small ? 11 : 18;
    if (TOUCH_BUTTONS.includes(label)) { drawTouchButton(x, y, w, h, label); return w; }
    ctx.fillStyle = '#1a1420'; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = '#a8a090'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#f2eee2'; ctx.fillRect(x, y, w, h - (small ? 2 : 3));
    const cx = x + Math.floor(w / 2), cy = y + Math.floor((h - (small ? 2 : 3)) / 2);
    ctx.fillStyle = '#2a2230';
    if ('<>^v'.includes(label)) { // a little triangle pointing that way: k=0 is the tip
      const n = small ? 3 : 4, h2 = Math.floor(n / 2);
      for (let k = 0; k < n; k++) {
        const len = 2 * k + 1;
        if (label === '>') ctx.fillRect(cx + h2 - k, cy - k, 1, len);
        else if (label === '<') ctx.fillRect(cx - h2 + k, cy - k, 1, len);
        else if (label === '^') ctx.fillRect(cx - k, cy - h2 + k, len, 1);
        else ctx.fillRect(cx - k, cy + h2 - k, len, 1);
      }
    } else drawText(ctx, label, cx, cy - 3, { align: 'center', color: '#2a2230', shadow: null });
    return w;
  }
  // An on-screen button (a rounded pill in the button's colour), for the phone versions of the hints
  const TOUCH_COLOURS = { RUN: '#ffd84a', SNIFF: '#7fe08a', SNEAK: '#9ad0ff', BARK: '#ff9a7a', BEG: '#ffb040', STICK: '#ffd84a' };
  function drawTouchButton(x, y, w, h, label) {
    const r = Math.floor(h / 2), col = TOUCH_COLOURS[label];
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.roundRect(x - 1, y - 1, w + 2, h + 2, r + 1); ctx.fill();
    ctx.fillStyle = '#1a1c2a';
    ctx.beginPath(); ctx.roundRect(x + 1, y + 1, w - 2, h - 2, r - 1); ctx.fill();
    drawText(ctx, label, x + Math.floor(w / 2), y + Math.floor(h / 2) - 3, { align: 'center', color: col, shadow: null });
  }
  // Text with [KEY] markers drawn as small key caps
  function drawRich(text, x, y, color = '#ffffff') {
    for (const part of text.split(/(\[[^\]]+\])/)) {
      if (!part) continue;
      if (part[0] === '[') { const k = part.slice(1, -1); x += drawKeyCap(x, y - 2, KEY_LABEL[k] || k, true) + 2; continue; }
      drawText(ctx, part, x, y, { color }); x += textWidth(part);
    }
  }
  // Two rows of tabs: how to play, then the world
  const HOWTO_ROWS = [6, 5];
  const howtoTabRects = pages => {
    const out = [];
    let i = 0;
    HOWTO_ROWS.forEach((n, row) => { const w = Math.floor((VIEW_W - 48) / n); for (let k = 0; k < n && i < pages.length; k++, i++) out.push({ x: 24 + k * w, y: 40 + row * 23, w: w - 4, h: 20 }); });
    return out;
  };

  function renderHowto() {
    renderBackdrop();
    const pages = howtoPages(), page = pages[howtoPage];
    drawText(ctx, 'HOW TO PLAY', VIEW_W / 2, 10, { scale: 3, align: 'center', color: '#ffd84a' });
    howtoTabRects(pages).forEach((r, i) => {
      const on = i === howtoPage;
      ctx.fillStyle = on ? '#ffd84a' : 'rgba(8,10,20,0.85)'; ctx.fillRect(r.x, r.y, r.w, r.h);
      drawText(ctx, pages[i].title, r.x + r.w / 2, r.y + 7, { align: 'center', color: on ? '#2a2230' : '#cfd3e0', shadow: on ? null : '#000000' });
    });
    const top = 88;
    ctx.fillStyle = 'rgba(8,10,20,0.9)'; ctx.fillRect(24, top, VIEW_W - 48, VIEW_H - top - 36);
    if (page.controls) { renderControls(page, top); }
    else if (page.blurb) { // the objective: a few lines of story, your dog and the owner, and how to win
      page.blurb.forEach((line, i) => drawText(ctx, line, VIEW_W / 2, top + 14 + i * 20, { align: 'center', scale: 2, color: i === 0 ? '#ffd84a' : '#ffffff' }));
      const dogImg = cycleFrame(SPRITES.dogs[dogId].right.run, 12), own = SPRITES.owner.down.call[0];
      ctx.drawImage(dogImg, VIEW_W / 2 - 150, 268, DOG_W * 1.5, DOG_H * 1.5);
      const snacks = [SPRITES.bone, SPRITES.sausage, SPRITES.biscuit, SPRITES.cheese];
      snacks.forEach((img, i) => ctx.drawImage(img, VIEW_W / 2 - 40 + i * 28, 316 + Math.round(Math.sin(t * 4 + i) * 2)));
      ctx.drawImage(own, VIEW_W / 2 + 90, 262);
      drawText(ctx, page.footer, VIEW_W / 2, VIEW_H - 56, { align: 'center', color: '#7fe08a' });
    } else {
      if (page.footer) drawText(ctx, page.footer, VIEW_W / 2, VIEW_H - 50, { align: 'center', color: '#ff8ad8' });
      const twoCol = page.entries.length > 4;
      page.entries.forEach((e, i) => {
        const col = twoCol ? i % 2 : 0, row = twoCol ? Math.floor(i / 2) : i;
        const x = 38 + col * 376, y = top + 10 + row * (twoCol ? 100 : 76);
        const img = e.sprite();
        if (e.fx) specialCard(e, x, y, twoCol ? 362 : VIEW_W - 76);
        ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillRect(x, y, 64, 64);
        if (e.fx) specialGlow(e.fx, x + 32, y + 32);
        const fit = 62 / Math.max(img.width, img.height), sc = fit >= 1 ? Math.min(3, Math.floor(fit)) : fit; // big props shrink to fit
        ctx.drawImage(img, Math.round(x + 32 - (img.width * sc) / 2), Math.round(y + 32 - (img.height * sc) / 2), img.width * sc, img.height * sc);
        if (e.fx) specialSparkles(e.fx, x, y);
        const nameCol = e.fx === 'rare' ? `hsl(${(t * 120) % 360},95%,70%)` : e.fx === 'golden' ? (Math.floor(t * 4) % 2 ? '#fff0a0' : '#ffd84a') : '#ffd84a';
        drawText(ctx, e.name, x + 76, y + 6, { scale: 2, color: nameCol });
        if (e.fx) { // a RARE! / SPECIAL! tag after the name
          const label = e.fx === 'rare' ? 'RARE!' : 'SPECIAL!', tx = x + 76 + textWidth(e.name, 2) + 8, w = textWidth(label) + 8;
          ctx.fillStyle = '#1a1420'; ctx.fillRect(tx - 1, y + 6, w + 2, 13);
          ctx.fillStyle = e.fx === 'rare' ? `hsl(${(t * 120 + 180) % 360},90%,62%)` : '#ffd84a'; ctx.fillRect(tx, y + 7, w, 11);
          drawText(ctx, label, tx + w / 2, y + 9, { align: 'center', color: '#1a1420', shadow: null });
        }
        e.lines.forEach((line, j) => drawRich(line, x + 76, y + 30 + j * 13));
      });
    }
    drawText(ctx, say('ARROWS: PAGES     ENTER / ESC: BACK', 'TAP A TAB     X: BACK'), VIEW_W / 2, VIEW_H - 22, { align: 'center', color: '#ffd84a' });
  }
  // The outline of every frame of the given animations (from the pixels; remembered once found), so a
  // dog can be framed snugly without cutting off a raised head or paw
  const BOUNDS = new Map();
  function dogBounds(id, names) {
    const key = id + ':' + names.join(','), had = BOUNDS.get(key);
    if (had) return had;
    let l = DOG_W, r = -1, top = DOG_H, b = -1;
    for (const n of names) for (const f of SPRITES.dogs[id].right[n] || []) {
      const px = f.getContext('2d').getImageData(0, 0, DOG_W, DOG_H).data;
      for (let y = 0; y < DOG_H; y++) for (let x = 0; x < DOG_W; x++) if (px[(y * DOG_W + x) * 4 + 3] > 0) { l = Math.min(l, x); r = Math.max(r, x); top = Math.min(top, y); b = Math.max(b, y); }
    }
    if (r < 0) return { l: 0, r: DOG_W - 1, top: 0, b: DOG_H - 1 }; // not decoded yet: try again next frame
    const out = { l, r, top, b };
    BOUNDS.set(key, out);
    return out;
  }
  // The special snacks' cards in How to Play look the way those snacks do in the game: a rainbow
  // halo for the rare zoomies snacks, gold for the golden bone, with sparkles and a shimmering border
  function specialCard(e, x, y, w) {
    const gold = e.fx === 'golden', h = 70;
    ctx.fillStyle = gold ? 'rgba(255,216,74,0.08)' : 'rgba(255,200,120,0.07)'; ctx.fillRect(x - 6, y - 4, w, h);
    ctx.fillStyle = gold ? 'rgba(255,216,74,0.55)' : 'rgba(255,216,74,0.45)';
    ctx.fillRect(x - 6, y - 4, w, 1); ctx.fillRect(x - 6, y - 4 + h - 1, w, 1); ctx.fillRect(x - 6, y - 4, 1, h); ctx.fillRect(x - 6 + w - 1, y - 4, 1, h);
    // a bright glint travelling round the border
    const per = 2 * (w + h), u = (t * 160) % per;
    const [gx, gy] = u < w ? [u, 0] : u < w + h ? [w - 1, u - w] : u < 2 * w + h ? [w - 1 - (u - w - h), h - 1] : [0, h - 1 - (u - 2 * w - h)];
    ctx.fillStyle = gold ? '#fff6c0' : `hsl(${(t * 200) % 360},100%,75%)`;
    ctx.fillRect(x - 6 + gx - 3, y - 4 + gy - 1, 7, 3); ctx.fillRect(x - 6 + gx - 1, y - 4 + gy - 3, 3, 7);
  }
  function specialGlow(fx, cx, cy) {
    const a = 0.55 + 0.25 * Math.sin(t * 6);
    const col = fx === 'rare' ? `hsla(${(t * 300) % 360},95%,65%,${a})` : `rgba(255,214,80,${a})`;
    const g = ctx.createRadialGradient(cx, cy, 2, cx, cy, 34);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,226,90,0)');
    ctx.fillStyle = g; ctx.fillRect(cx - 32, cy - 32, 64, 64);
  }
  function specialSparkles(fx, x, y) {
    for (let k = 0; k < 4; k++) {
      const cyc = t * 1.3 + k * 0.37, n = Math.floor(cyc), life = cyc - n; // each twinkle pops up somewhere new
      const rx = ((n * 37 + k * 53) % 56) + 4, ry = ((n * 23 + k * 41) % 56) + 4, sz = life < 0.5 ? Math.round(life * 6) : Math.round((1 - life) * 6);
      if (sz <= 0) continue;
      ctx.fillStyle = k % 2 ? '#ffffff' : fx === 'rare' ? `hsl(${(t * 300 + k * 90) % 360},100%,80%)` : '#fff0a0';
      ctx.fillRect(x + rx - sz, y + ry, sz * 2 + 1, 1); ctx.fillRect(x + rx, y + ry - sz, 1, sz * 2 + 1);
    }
  }
  // The CONTROLS tab: a card per action, with the keys and your dog doing it. Every dog is drawn at
  // one shared scale (the biggest that fits the tallest pose), feet on the card's floor
  function renderControls(page, top) {
    const all = dogBounds(dogId, page.controls.flatMap(c => c.strips || []));
    const bw = all.r - all.l + 1, bh = all.b - all.top + 1, k = Math.min(76 / bw, 58 / bh, 1.3);
    page.controls.forEach((c, i) => {
      const x = 32 + (i % 2) * 372, y = top + 8 + Math.floor(i / 2) * 70, w = 364, h = 64;
      ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(x, y, w, h);
      // the dog (cropped to where the dog is in the cell), a bit bigger than life
      const img = c.anim();
      ctx.drawImage(img, all.l, all.top, bw, bh, x + 2 + Math.round((76 - bw * k) / 2), y + 61 - Math.round(bh * k), Math.round(bw * k), Math.round(bh * k));
      let kx = x + 88;
      drawText(ctx, c.name, kx, y + 6, { scale: 2, color: '#ffd84a' });
      kx += textWidth(c.name, 2) + 12;
      for (const k of c.keys) kx += drawKeyCap(kx, y + 4, k) + 4;
      if (c.hold) drawText(ctx, c.hold, kx + 2, y + 10, { color: '#ff8ad8' });
      c.lines.forEach((line, j) => drawRich(line, x + 88, y + 30 + j * 13, '#ffffff'));
    });
    // The other keys, along the bottom
    let x = 0;
    const items = page.footer.map(([k, label]) => [k, label, keyCapWidth(k) + 6 + textWidth(label)]);
    const total = items.reduce((a, it) => a + it[2], 0) + 22 * (items.length - 1);
    x = Math.round(VIEW_W / 2 - total / 2);
    for (const [k, label, w] of items) { const kw = drawKeyCap(x, VIEW_H - 64, k); drawText(ctx, label, x + kw + 6, VIEW_H - 59, { color: '#cfd3e0' }); x += w + 22; }
  }

  // ---- Main loop ----
  // Screens that are menus (laid out on the whole screen); every other state is the playing field
  const MENU_STATES = ['title', 'select', 'levels', 'howto', 'options', 'vetTrip', 'ending', 'paused', 'roundOver', 'intro'];
  let last = performance.now();
  function frame(now) {
    // Clamp both ways: the first rAF timestamp can be earlier than `last`, and a negative clock
    // would index animation frames at -1
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (TouchUI.on !== layout.touch) resize(); // switched between keyboard and touch
    if (MENU_STATES.includes(state)) update(dt); else inPlayView(() => update(dt));
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
