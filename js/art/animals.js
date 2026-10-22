// Cats (hazards, 4 views), frogs and lizards (distractions, 2 views).

const CAT = {
  fur: ramp('#4a2208', '#8a4214', '#b85e1e', '#e08a34', '#f2aa5a', '#ffd090'),
  white: ramp('#6a5a4a', '#c8b8a2', '#e6dac8', '#fff4e0', '#fffaf0', '#ffffff'),
  stripe: '#a24e14', eye: '#7bd34a', pupil: '#102010', nose: '#e88a9a', earInner: '#e8a0a0', mouth: '#5a1a1a',
};
const CAT_W = 36, CAT_H = 28; // feet at (18, 26)

function catSide({ step = 0, moving = false, swipe = false }) {
  const s = new PixelSprite(CAT_W, CAT_H), C = CAT.fur, F = farRamp(CAT.fur);
  const ph = (step / 4) * Math.PI * 2, sw = moving ? Math.sin(ph) * 2.5 : 0;
  const arch = swipe ? -2 : 0;
  // Tail curls up behind
  s.part(Shape.union(Shape.capsule(9, 16, 4, 10, 2.2, 1.8), Shape.capsule(4, 10, swipe ? 4 : 7, 3, 1.8, 1.4)), C);
  s.part(Shape.capsule(24, 18, 24 - sw, 25, 2), F);
  s.part(Shape.capsule(12, 18, 12 + sw, 25, 2), F);
  s.part(Shape.ellipse(17, 16.5 + arch, 10, swipe ? 6.5 : 5.5), C);
  s.part(Shape.union(Shape.ellipse(11, 17, 3.5, 4), Shape.capsule(11, 19, 10 - sw, 25, 2)), C);
  if (swipe) {
    s.part(Shape.capsule(26, 16, 33, 11, 2), C); // paw raised to swipe
    s.dots([[34, 9], [35, 10], [35, 12]], '#ffffff');
  } else {
    s.part(Shape.capsule(26, 18, 26 + sw, 25, 2), C);
  }
  for (const [x, y] of [[10 - sw, 25.5], [26 + sw, 25.5]]) if (!(swipe && x > 20)) s.part(Shape.ellipse(x, y, 2.2, 1.3), CAT.white);
  s.part(Shape.ellipse(28, 11.5, 5.5, 5), C);
  if (swipe) {
    s.part(Shape.poly([[23, 9], [23, 5], [27, 8]]), C); // ears flattened
    s.part(Shape.poly([[29, 7.5], [33, 5], [33.5, 9]]), C);
  } else {
    s.part(Shape.poly([[23.5, 9], [24.5, 2.5], [28.5, 7]]), C);
    s.part(Shape.poly([[29, 6.5], [32.5, 2.5], [33.5, 9]]), C);
    s.dots([[25, 5], [32, 5]], CAT.earInner);
  }
  s.part(Shape.ellipse(31.5, 13.5, 2.6, 2), CAT.white, { clip: true, outline: false });
  s.part(Shape.ellipse(25, 19, 3, 3), CAT.white, { clip: true, outline: false });
  for (const x of [12, 15, 18, 21]) s.tint(Shape.rect(x, 11 + arch, 1.2, 4.5), [C.b, C.l, C.h, C.s], CAT.stripe);
  s.tint(Shape.rect(27, 7, 3, 1.2), [C.b, C.l, C.h], CAT.stripe);
  s.dots([[29, 10], [29, 11]], CAT.eye);
  s.dots([[30, 10], [30, 11]], CAT.pupil);
  s.set(33, 12, CAT.nose);
  if (swipe) s.dots([[32, 15], [33, 15]], CAT.mouth);
  s.dots([[35, 13], [35, 15]], CAT.white.b);
  return s.toCanvas();
}

function catFront({ step = 0, moving = false }) {
  const s = new PixelSprite(CAT_W, CAT_H), C = CAT.fur;
  const ph = (step / 4) * Math.PI * 2;
  const lL = moving ? Math.max(0, Math.sin(ph)) * 2 : 0, lR = moving ? Math.max(0, -Math.sin(ph)) * 2 : 0;
  s.part(Shape.capsule(25, 22, 30, 15, 2, 1.6), C); // tail at her side
  s.part(Shape.ellipse(18, 20, 7.5, 5), C);
  s.part(Shape.ellipse(18, 17.5, 5.5, 6), C);
  s.part(Shape.capsule(15, 18, 15, 24 - lL, 2), C);
  s.part(Shape.capsule(21, 18, 21, 24 - lR, 2), C);
  s.part(Shape.ellipse(15, 25 - lL, 2.2, 1.3), CAT.white);
  s.part(Shape.ellipse(21, 25 - lR, 2.2, 1.3), CAT.white);
  s.part(Shape.ellipse(18, 20, 3, 4), CAT.white, { clip: true, outline: false });
  s.part(Shape.poly([[11, 8], [11.5, 1], [16, 5]]), C);
  s.part(Shape.poly([[25, 8], [24.5, 1], [20, 5]]), C);
  s.part(Shape.ellipse(18, 10, 7, 6), C);
  s.dots([[13, 4], [23, 4]], CAT.earInner);
  s.part(Shape.ellipse(18, 12.5, 3.4, 2.4), CAT.white, { clip: true, outline: false });
  for (const [x, y] of [[17, 5], [18, 6], [19, 5], [15, 6], [21, 6]]) s.tint(Shape.rect(x, y, 1, 1.5), [C.b, C.l, C.h, C.s], CAT.stripe);
  for (const ex of [13, 21]) {
    s.dots([[ex, 9], [ex + 1, 9], [ex + 2, 9], [ex, 10], [ex + 1, 10], [ex + 2, 10]], CAT.eye);
    s.dots([[ex + 1, 9], [ex + 1, 10]], CAT.pupil);
  }
  s.dots([[17, 12], [18, 12]], CAT.nose);
  s.dots([[17, 14], [18, 14]], CAT.white.d);
  return s.toCanvas();
}

function catBack({ step = 0, moving = false }) {
  const s = new PixelSprite(CAT_W, CAT_H), C = CAT.fur;
  const ph = (step / 4) * Math.PI * 2;
  const lL = moving ? Math.max(0, Math.sin(ph)) * 2 : 0, lR = moving ? Math.max(0, -Math.sin(ph)) * 2 : 0;
  s.part(Shape.poly([[12, 8], [12.5, 1], [17, 5]]), C);
  s.part(Shape.poly([[24, 8], [23.5, 1], [19, 5]]), C);
  s.part(Shape.ellipse(18, 8, 6, 5), C);
  s.part(Shape.ellipse(18, 17, 7, 7), C);
  s.part(Shape.capsule(14, 20, 14, 24 - lL, 2.2), C);
  s.part(Shape.capsule(22, 20, 22, 24 - lR, 2.2), C);
  s.part(Shape.ellipse(14, 25 - lL, 2.2, 1.3), CAT.white);
  s.part(Shape.ellipse(22, 25 - lR, 2.2, 1.3), CAT.white);
  for (const y of [13, 16, 19]) s.tint(Shape.rect(13, y, 10, 1.2), [C.b, C.l, C.h, C.s], CAT.stripe);
  s.part(Shape.capsule(18, 16, 18 + Math.sin(step) * 2, 3, 2, 1.5), C, { merge: false }); // tail up
  return s.toCanvas();
}

function buildCatSprites() {
  const four = [0, 1, 2, 3];
  const side = { idle: [catSide({})], walk: four.map(i => catSide({ step: i, moving: true })), swipe: [catSide({ swipe: true })] };
  return {
    right: side,
    left: flipSet(side),
    down: { idle: [catFront({})], walk: four.map(i => catFront({ step: i, moving: true })) },
    up: { idle: [catBack({})], walk: four.map(i => catBack({ step: i, moving: true })) },
  };
}

// ---- Frog (22x18, feet at (11, 16)) ----
const FROG = {
  skin: ramp('#173d12', '#2a6a20', '#3a8a2c', '#4fae3a', '#78cc5c', '#b0ec90'),
  belly: ramp('#4a5a1a', '#a8b85a', '#c8d880', '#e0eca0', '#eef6c4', '#ffffff'),
};

function frogFrame({ puff = 0, hop = false }) {
  const s = new PixelSprite(22, 18), G = FROG.skin;
  const up = hop ? 2 : 0;
  if (hop) {
    s.part(Shape.capsule(6, 12 - up, 1, 17, 1.8), G);
    s.part(Shape.capsule(16, 12 - up, 21, 17, 1.8), G);
  } else {
    s.part(Shape.ellipse(4, 13, 3.5, 2.6), G);
    s.part(Shape.ellipse(18, 13, 3.5, 2.6), G);
  }
  s.part(Shape.ellipse(11, 11 - up, 7.5, 5.5), G);
  s.part(Shape.ellipse(11, 14 - up, 4 + puff * 1.5, 2 + puff * 1.5), FROG.belly);
  s.part(Shape.capsule(6, 13 - up, 5, 16 - up / 2, 1.3), G);
  s.part(Shape.capsule(16, 13 - up, 17, 16 - up / 2, 1.3), G);
  s.part(Shape.ellipse(6.5, 6 - up, 3, 3), G);
  s.part(Shape.ellipse(15.5, 6 - up, 3, 3), G);
  for (const ex of [5, 14]) {
    s.dots([[ex, 5 - up], [ex + 1, 5 - up], [ex, 6 - up], [ex + 1, 6 - up]], '#ffffff');
    s.dots([[ex + 1, 5 - up], [ex + 1, 6 - up]], '#111111');
  }
  s.line(8, 11 - up, 14, 11 - up, G.d);
  s.dots([[9, 8 - up], [13, 9 - up], [11, 7 - up]], G.s);
  return s.toCanvas();
}

// ---- Lizard (34x14, feet at (17, 12)), facing right ----
const LIZARD = ramp('#1f3a10', '#3a6a1c', '#4f8f26', '#6cb33a', '#92d35a', '#c4f08c');

function lizardFrame({ step = 0 }) {
  const s = new PixelSprite(34, 14), L = LIZARD, F = farRamp(LIZARD);
  const k = step % 2 ? 1 : -1;
  s.part(Shape.capsule(21, 7, 24 + k, 3, 1.1), F);
  s.part(Shape.capsule(13, 7, 10 - k, 3, 1.1), F);
  s.part(Shape.union(Shape.capsule(12, 8, 6, 9 + k, 2.2, 1.6), Shape.capsule(6, 9 + k, 1, 8 - k, 1.6, 0.8)), L);
  s.part(Shape.ellipse(17, 8, 7.5, 3.3), L);
  s.part(Shape.ellipse(26, 7.5, 4.5, 3), L);
  s.part(Shape.capsule(21, 9, 24 - k, 12.5, 1.1), L);
  s.part(Shape.capsule(13, 9, 10 + k, 12.5, 1.1), L);
  s.dots([[13, 6], [16, 6], [19, 6], [22, 6]], L.h);
  s.dots([[14, 8], [18, 8], [21, 8]], L.d);
  s.dots([[27, 6], [28, 6]], '#101010');
  s.set(27, 6, '#ffffff');
  return s.toCanvas();
}

function buildCritterSprites() {
  const lizard = [lizardFrame({ step: 0 }), lizardFrame({ step: 1 })];
  return {
    frog: { idle: frogFrame({}), puff: frogFrame({ puff: 1 }), hop: frogFrame({ hop: true }) },
    lizard: { right: lizard, left: lizard.map(flipCanvas) },
  };
}

// ---- Sleeping cat (curled up), 36x28 like the other cat frames ----
function catSleeping(breath) {
  const s = new PixelSprite(CAT_W, CAT_H), C = CAT.fur;
  s.part(Shape.ellipse(18, 19 - breath * 0.5, 11, 6.5 + breath * 0.5), C);                // curled body
  s.part(Shape.union(Shape.capsule(8, 22, 18, 25, 2), Shape.capsule(18, 25, 26, 23, 1.8)), C, { merge: false }); // tail wrapped round
  s.part(Shape.ellipse(25, 16, 5.5, 4.5), C);                                               // head resting
  s.part(Shape.poly([[21, 13], [21.5, 8.5], [24.5, 12]]), C);
  s.part(Shape.poly([[26, 11.5], [29, 8.5], [29.5, 13]]), C);
  s.part(Shape.ellipse(28, 18, 2.4, 1.8), CAT.white, { clip: true, outline: false });
  for (const x of [12, 15, 18]) s.tint(Shape.rect(x, 13, 1.2, 4), [C.b, C.l, C.h, C.s], CAT.stripe);
  s.dots([[23, 16], [24, 16], [27, 16], [28, 16]], C.o); // closed eyes
  s.set(29, 17, CAT.nose);
  return s.toCanvas();
}

// ---- Flyers and small critters ----
const BIRD = { body: ramp('#3a2a1e', '#6a4a30', '#8a6440', '#a87e52', '#c49a6c', '#e0bc90'), belly: ramp('#6a5a48', '#c8b49a', '#ddc9ae', '#efe0c8', '#f8eedc', '#ffffff') };
// A little red crab: wide shell, raised claws, legs that scuttle sideways
function crabFrame(step) {
  const s = new PixelSprite(22, 16), R = ramp('#3a0a06', '#7a1a10', '#a42818', '#c83a22', '#e45e3c', '#f8987a');
  for (let i = 0; i < 3; i++) {
    const lift = (i + step) % 2;
    s.part(Shape.capsule(7 - i * 2, 10, 2 - i, 14 - lift, 0.8), R, { merge: false });
    s.part(Shape.capsule(15 + i * 2, 10, 20 + i, 14 - (1 - lift), 0.8), R, { merge: false });
  }
  s.part(Shape.ellipse(11, 9, 7, 4.5), R);                                       // shell
  s.part(Shape.union(Shape.ellipse(3, 5 - step, 2.6, 2), Shape.capsule(4, 7, 7, 9, 0.9)), R, { merge: false }); // claws
  s.part(Shape.union(Shape.ellipse(19, 5 - (1 - step), 2.6, 2), Shape.capsule(18, 7, 15, 9, 0.9)), R, { merge: false });
  s.dots([[9, 4], [13, 4]], '#101010'); s.dots([[9, 5], [13, 5]], R.d);          // eyes on stalks
  s.line(7, 8, 14, 8, R.h);
  return s.toCanvas();
}

// Seagulls at the beach: white with grey wings and a yellow beak
const GULL = { body: ramp('#4a4e58', '#9aa0aa', '#bcc2ca', '#e2e6ea', '#f2f4f6', '#ffffff'), belly: ramp('#6a6e78', '#d8dce2', '#e8ecf0', '#f4f6f8', '#fafbfc', '#ffffff') };
function birdFrame(wing, P = BIRD) {
  // A sparrow (or gull) in flight, facing right. wing: 0 up, 1 level, 2 down
  const s = new PixelSprite(20, 16), B = P.body;
  const wy = [-5, 0, 4][wing];
  s.part(Shape.poly([[8, 8], [12, 8], [10 - 2, 8 + wy - 1], [5, 8 + wy]]), farRamp(B));
  s.part(Shape.union(Shape.ellipse(10, 9, 5.5, 3.2), Shape.poly([[5, 9], [0.5, 7], [1, 11]])), B);
  s.part(Shape.ellipse(10.5, 10.5, 3.5, 1.6), P.belly, { clip: true, outline: false });
  s.part(Shape.ellipse(15, 7.5, 3, 2.8), B);
  s.dots([[19, 8], [18, 8]], '#e0a020');
  s.set(16, 7, '#101010');
  s.part(Shape.poly([[8, 8], [13, 8], [11, 8 + wy - 1], [6.5, 8 + wy + 1]]), B, { merge: false });
  return s.toCanvas();
}

// Sitting on a branch: wings folded, tail down
function birdPerched(look, P = BIRD) {
  const s = new PixelSprite(20, 16), B = P.body;
  s.part(Shape.poly([[4, 10], [1, 15], [4, 15], [7, 11]]), B);                  // tail
  s.part(Shape.ellipse(9, 9.5, 5, 4), B);                                        // body
  s.part(Shape.ellipse(9.5, 11, 3.5, 2.2), P.belly, { clip: true, outline: false });
  s.part(Shape.ellipse(8, 8.5, 3.5, 2.6), farRamp(B), { merge: false });         // folded wing
  s.line(6, 9, 10, 8, B.l);
  s.part(Shape.ellipse(13 + look, 5.5, 3, 2.8), B, { merge: false });            // head
  s.dots([[17 + look, 6], [16 + look, 6]], '#e0a020');
  s.set(14 + look, 5, '#101010');
  s.dots([[8, 14], [10, 14], [8, 15], [10, 15]], '#5a3a20');                     // feet
  return s.toCanvas();
}

// Butterflies: big bright upper wings, smaller lower wings. open: 0 open, 1 half, 2 closed (edge-on)
const BUTTERFLY_KINDS = {
  monarch: { wing: ramp('#4a1a00', '#a04208', '#d0640e', '#f08a1e', '#f8ac4a', '#ffd08a'), vein: '#1a0e08', spot: '#ffffff' },
  blue:    { wing: ramp('#0a1a4a', '#1a3a8a', '#2a58b8', '#3e7ae0', '#6aa0f0', '#a8ccff'), vein: '#0a1030', spot: '#d8ecff' },
  yellow:  { wing: ramp('#5a4a00', '#a88a00', '#d4b010', '#f4d42a', '#ffe866', '#fff6b0'), vein: '#3a2e08', spot: '#ffffff' },
  white:   { wing: ramp('#6a6a72', '#b8b8c4', '#d8d8e2', '#f0f0f6', '#f8f8fc', '#ffffff'), vein: '#4a4a52', spot: '#3a3a42' },
};
function butterflyFrame(kind, open) {
  const s = new PixelSprite(16, 14), K = BUTTERFLY_KINDS[kind], Wg = K.wing;
  const span = [1, 0.55, 0.15][open];
  const wing = (side) => {
    const sx = 8 + side * 0.5;
    s.part(Shape.union(
      Shape.ellipse(sx + side * 3.6 * span, 4.5, 3.8 * span + 0.6, 3.4),
      Shape.ellipse(sx + side * 2.6 * span, 9.5, 2.8 * span + 0.5, 2.6),
    ), Wg, { merge: false });
  };
  wing(-1); wing(1);
  if (open < 2) {
    for (const side of [-1, 1]) {
      s.line(8 + side, 4, 8 + side * 6 * span, 2, K.vein);        // vein
      s.set(8 + side * 6 * span, 6, K.spot); s.set(8 + side * 4 * span, 2, K.spot);
      if (kind === 'monarch') s.line(8 + side * 7 * span, 3, 8 + side * 7 * span, 7, K.vein); // black edge
    }
  }
  s.part(Shape.capsule(8, 3, 8, 11, 0.9), ramp('#0a0806', '#1a1410', '#2a2018', '#3a2e22', '#4a3c2c', '#5a4a38'), { merge: false });
  s.dots([[7, 1], [9, 1], [7, 0], [9, 0]], '#2a2018');            // antennae
  return s.toCanvas();
}

function mothFrame(open) {
  const s = new PixelSprite(14, 12), W = ramp('#4a4034', '#8a7c66', '#a89a82', '#c8bca2', '#ddd4be', '#f0eadc');
  if (open) {
    s.part(Shape.union(Shape.ellipse(4, 5, 3.6, 3.4), Shape.ellipse(10, 5, 3.6, 3.4), Shape.ellipse(4.5, 8.5, 2.6, 2.2), Shape.ellipse(9.5, 8.5, 2.6, 2.2)), W);
    s.dots([[4, 5], [10, 5]], W.d);
  } else {
    s.part(Shape.union(Shape.ellipse(5.5, 4.5, 2, 3.5), Shape.ellipse(8.5, 4.5, 2, 3.5)), W);
  }
  s.part(Shape.capsule(7, 3, 7, 9.5, 1.1), ramp('#2a2018', '#4a3a2a', '#5a4834', '#6a5640', '#806a50', '#9a8266'));
  s.dots([[6, 1], [8, 1]], '#4a3a2a');
  return s.toCanvas();
}

function beeFrame(wing) {
  const s = new PixelSprite(14, 12);
  const Y = ramp('#5a3a00', '#a87400', '#d09a10', '#f2c42a', '#ffdc5a', '#fff0a0');
  const wingR = ramp('rgba(90,120,150,0.8)', 'rgba(170,200,230,0.7)', 'rgba(200,225,245,0.7)', 'rgba(225,240,255,0.75)', 'rgba(240,248,255,0.8)', 'rgba(255,255,255,0.9)');
  s.part(Shape.ellipse(6, 3 + wing, 3, 2.2), wingR, { outline: false });
  s.part(Shape.ellipse(9, 3 + wing, 2.6, 2), wingR, { outline: false });
  s.part(Shape.ellipse(7, 7.5, 5, 3.2), Y);
  for (const x of [5, 8]) s.tint(Shape.rect(x, 4, 1.4, 7), [Y.b, Y.l, Y.h, Y.s, Y.d], '#1a1408');
  s.part(Shape.ellipse(12, 7, 1.8, 1.8), ramp('#0a0804', '#1a1408', '#2a2010', '#3a2e18', '#4a3c22', '#5a4a2c'));
  s.dots([[1, 8], [0, 8]], '#1a1408'); // stinger
  return s.toCanvas();
}

function mouseFrame(step) {
  const s = new PixelSprite(22, 12), M = ramp('#2e2a2a', '#5a5454', '#767070', '#948c8c', '#b0a8a8', '#cec8c8');
  const k = step ? 1 : -1;
  s.part(Shape.union(Shape.capsule(6, 8, 2, 7 + k, 0.8), Shape.capsule(2, 7 + k, 0, 5, 0.6)), ramp('#6a4a4a', '#b07a7a', '#c89090', '#e0a8a8', '#f0c0c0', '#ffd8d8'), { outline: false });
  s.part(Shape.capsule(9, 9, 9 + k, 11, 1), M);
  s.part(Shape.capsule(14, 9, 14 - k, 11, 1), M);
  s.part(Shape.union(Shape.ellipse(11, 7.5, 5.5, 3.2), Shape.ellipse(16.5, 7.5, 3.2, 2.6), Shape.poly([[18, 6.5], [21.5, 8], [18, 9]])), M);
  s.part(Shape.ellipse(14.5, 4.5, 2, 2), ramp('#5a3a3a', '#c88a8a', '#e0a0a0', '#f4b8b8', '#fcd0d0', '#ffe8e8'));
  s.set(18, 7, '#101010');
  s.set(21, 8, '#e88a9a');
  return s.toCanvas();
}

function beetleFrame(step) {
  const s = new PixelSprite(14, 12), B = ramp('#0a1420', '#16283a', '#1e3a52', '#2a4e6c', '#3e6a8a', '#6a9ab8');
  const k = step ? 1 : -1;
  for (const [x, dx] of [[4, -1], [7, 0], [10, 1]]) {
    s.line(x, 6, x + dx - 1, 2 + k, '#0a0a0a');
    s.line(x, 8, x + dx - 1, 11 - k, '#0a0a0a');
  }
  s.part(Shape.ellipse(7, 7, 5, 3.6), B);
  s.line(3, 7, 10, 7, B.o);
  s.part(Shape.ellipse(12, 7, 1.8, 1.6), ramp('#000', '#0a0a0a', '#141414', '#1e1e1e', '#2a2a2a', '#3a3a3a'));
  s.dots([[5, 5], [8, 5]], B.h);
  return s.toCanvas();
}

// ---- Snake: an Aussie red-bellied black snake (rare outdoor hazard) ----
const SNAKE = { body: ramp('#050508', '#101016', '#1a1a22', '#24242e', '#3a3a48', '#5a5a6e'), belly: '#d0303a', bellyLight: '#f05a5a' };
function snakeFrame(pose, phase = 0) {
  const s = new PixelSprite(48, 26), B = SNAKE.body;
  // The body is a chain of overlapping circles along a curve; returns [x, y] for t in 0..1
  let curve, headAt, r0 = 2.8;
  if (pose === 'coiled') {
    curve = t => { const a = t * Math.PI * 3.2; const r = 9 - t * 6; return [24 + Math.cos(a) * r * 1.3, 18 + Math.sin(a) * r * 0.6]; };
    headAt = [30, 11];
  } else if (pose === 'rear') {
    curve = t => t < 0.6 ? [8 + t * 40, 21 + Math.sin(t * 9 + phase) * 2] : [32 + (t - 0.6) * 20, 21 - (t - 0.6) * 30];
    headAt = [42, 6];
  } else if (pose === 'held') {
    curve = t => [8 + t * 32, 6 + Math.sin(t * Math.PI) * 16 + Math.sin(t * 8 + phase) * 1.5];
    headAt = [42, 7];
  } else { // slither / limp
    curve = t => [4 + t * 38, 18 + (pose === 'limp' ? 0 : Math.sin(t * 10 + phase) * 3)];
    headAt = [44, 17];
  }
  const segments = [];
  for (let i = 0; i <= 34; i++) {
    const t = i / 34, [x, y] = curve(t), r = 1 + (r0 - 1) * Math.min(1, t * 2.5);
    segments.push(Shape.ellipse(x, y, r, r));
  }
  s.part(Shape.union(...segments, Shape.ellipse(headAt[0], headAt[1], 3.6, 2.8)), B); // one smooth body
  // Red belly along the underside
  for (let i = 4; i <= 34; i += 2) {
    const [x, y] = curve(i / 34);
    s.set(x, y + 2, SNAKE.belly);
    if (i % 4 === 0) s.set(x, y + 1.5, SNAKE.bellyLight);
  }
  const [hx, hy] = headAt;
  if (pose === 'limp') {
    s.dots([[hx, hy - 1], [hx + 1, hy], [hx + 1, hy - 1], [hx, hy]], '#ffffff'); // x x eyes
  } else {
    s.set(hx + 1, hy - 1, '#e8e080');
    s.set(hx + 1, hy - 1.01, '#e8e080');
    s.dots([[hx + 4, hy + 1], [hx + 5, hy + 1], [hx + 6, hy], [hx + 6, hy + 2]], '#e03040'); // flicking tongue
  }
  return s.toCanvas();
}

// ---- Pets waiting in carriers at the vet (32x30) ----
function carrierFrame(pet, shake) {
  const s = new PixelSprite(32, 30), P = ramp('#3a3e48', '#6a7080', '#8a90a0', '#aab0bc', '#c8ccd6', '#e4e6ec');
  const dx = shake ? 1 : 0;
  s.part(Shape.rect(2 + dx, 8, 28, 20, 4), P);
  s.part(Shape.rect(9 + dx, 3, 14, 6, 2), P);
  s.rect(7 + dx, 12, 18, 12, '#1a1c22');
  if (pet === 'cat') {
    s.part(Shape.ellipse(16 + dx, 19, 5, 4.5), CAT.fur);
    s.part(Shape.poly([[11.5 + dx, 17], [12 + dx, 12.5], [15 + dx, 15.5]]), CAT.fur);
    s.part(Shape.poly([[20.5 + dx, 17], [20 + dx, 12.5], [17 + dx, 15.5]]), CAT.fur);
    s.dots([[14 + dx, 18], [18 + dx, 18]], CAT.eye);
  } else {
    const D = ramp('#4a3020', '#8a5a34', '#a8723e', '#c88e52', '#dcaa70', '#f0c890');
    s.part(Shape.ellipse(16 + dx, 19, 5.5, 4.5), D);
    s.part(Shape.ellipse(11 + dx, 17, 2, 3.5), farRamp(D));
    s.part(Shape.ellipse(21 + dx, 17, 2, 3.5), farRamp(D));
    s.dots([[14 + dx, 18], [18 + dx, 18]], '#101010');
    s.rect(15 + dx, 20, 2, 1, '#101010');
  }
  for (let x = 8; x <= 24; x += 3) s.line(x + dx, 12, x + dx, 23, '#c8ccd6'); // wire door
  return s.toCanvas();
}

// Ducks (they waddle in when it rains): a brown mum and fluffy yellow ducklings, facing right.
// pose: 0/1 waddle steps, 2/3 flapping (wings up / down)
const DUCK = ramp('#2a1a0c', '#5a3a1a', '#7a5228', '#9a6c3a', '#b88a52', '#d4ac78');
const DUCKLING = ramp('#6a5000', '#b89a10', '#e0c030', '#f6dc50', '#ffec88', '#fff8c8');
function duckFrame(chick, pose) {
  const k = chick ? 0.62 : 1, W = Math.round(24 * k) + 2, H = Math.round(20 * k) + 2, s = new PixelSprite(W, H), B = chick ? DUCKLING : DUCK;
  const X = v => v * k + 1, Y = v => v * k + 1, step = pose === 1 ? 1 : 0, fly = pose >= 2;
  if (!fly) { // orange feet, one forward each step
    s.rect(Math.round(X(9 - step * 2)), Math.round(Y(17)), 2, 2, '#e08a20');
    s.rect(Math.round(X(13 + step * 2)), Math.round(Y(17)), 2, 2, '#c87018');
  }
  s.part(Shape.poly([[X(3), Y(9)], [X(0.5), Y(6)], [X(6), Y(10)]]), B);                       // tail
  s.part(Shape.ellipse(X(10.5), Y(12 - step * 0.5), 7.5 * k, 4.8 * k), B);                     // body
  s.part(Shape.ellipse(X(11), Y(14), 5 * k, 2.2 * k), B, { clip: true, outline: false });
  s.part(Shape.ellipse(X(17.5), Y(6 - step * 0.5), 3.4 * k, 3.2 * k), chick ? B : ramp('#0e1a10', '#1e3a22', '#2a4e2e', '#3a643a', '#4e7e4a', '#6e9e66'), { merge: false }); // head (mum's is green)
  s.part(Shape.ellipse(X(21.5), Y(7 - step * 0.5), 2.4 * k, 1.3 * k), ramp('#6a3000', '#b85a10', '#d8761a', '#f09028', '#ffb04a', '#ffd088'), { merge: false }); // bill
  s.set(Math.round(X(18.5)), Math.round(Y(5)), '#101010');
  if (fly) { // a wing flapping up or down
    const up = pose === 2;
    s.part(Shape.poly([[X(7), Y(10)], [X(14), Y(10)], [X(12), up ? Y(1) : Y(18)], [X(6), up ? Y(3) : Y(16)]]), B, { merge: false });
  } else {
    s.part(Shape.ellipse(X(9.5), Y(11), 4.6 * k, 2.6 * k), B, { merge: false });              // folded wing
    if (!chick) s.rect(Math.round(X(10)), Math.round(Y(12)), 3, 1, '#3a6ad8');                  // the blue wing patch
  }
  return s.toCanvas();
}

function buildExtraAnimalSprites() {
  const bird = [birdFrame(0), birdFrame(1), birdFrame(2), birdFrame(1)];
  const mouse = [mouseFrame(0), mouseFrame(1)];
  const snakeSlither = [snakeFrame('slither', 0), snakeFrame('slither', 1.6), snakeFrame('slither', 3.2)];
  return {
    catSleep: [catSleeping(0), catSleeping(1)],
    bird: { right: bird, left: bird.map(flipCanvas) },
    moth: [mothFrame(true), mothFrame(false)],
    birdPerch: { right: [birdPerched(0), birdPerched(1)], left: [birdPerched(0), birdPerched(1)].map(flipCanvas) },
    gull: (() => { const g = [birdFrame(0, GULL), birdFrame(1, GULL), birdFrame(2, GULL), birdFrame(1, GULL)]; return { right: g, left: g.map(flipCanvas) }; })(),
    gullPerch: { right: [birdPerched(0, GULL), birdPerched(1, GULL)], left: [birdPerched(0, GULL), birdPerched(1, GULL)].map(flipCanvas) },
    crab: { right: [crabFrame(0), crabFrame(1)], left: [crabFrame(0), crabFrame(1)].map(flipCanvas) },
    butterfly: Object.fromEntries(Object.keys(BUTTERFLY_KINDS).map(k => [k, [0, 1, 2, 1].map(o => butterflyFrame(k, o))])),
    bee: { right: [beeFrame(0), beeFrame(1)], left: [beeFrame(0), beeFrame(1)].map(flipCanvas) },
    mouse: { right: mouse, left: mouse.map(flipCanvas) },
    beetle: { right: [beetleFrame(0), beetleFrame(1)], left: [beetleFrame(0), beetleFrame(1)].map(flipCanvas) },
    snake: {
      coiled: [snakeFrame('coiled')],
      rear: [snakeFrame('rear', 0), snakeFrame('rear', 1.5)],
      slither: { right: snakeSlither, left: snakeSlither.map(flipCanvas) },
      held: [snakeFrame('held', 0), snakeFrame('held', 2)],
      limp: [snakeFrame('limp')],
    },
    duck: (() => { const m = [0, 1, 2, 3].map(p => duckFrame(false, p)), c = [0, 1, 2, 3].map(p => duckFrame(true, p)); return { mum: { right: m, left: m.map(flipCanvas) }, chick: { right: c, left: c.map(flipCanvas) } }; })(),
    carrier: { cat: [carrierFrame('cat', 0), carrierFrame('cat', 1)], dog: [carrierFrame('dog', 0), carrierFrame('dog', 1)] },
  };
}
