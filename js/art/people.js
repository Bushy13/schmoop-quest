// The owner: a blonde woman in denim overalls, and the vet. 48x87 frames with the feet at (24, 84).
// The body shapes are designed on a 32x58 grid and evaluated 1.5x bigger (so outlines stay 1px and
// nothing looks stretched); faces and small details are placed by hand at full size.
// Views: front (down), back (up), side (right, mirrored for left), plus a waving/calling pose.

const PERSON_K = 1.5;
const OWNER_W = 48, OWNER_H = 87, OWNER_FOOT_X = 24, OWNER_FOOT_Y = 84;
const OWNER_COLOURS = {
  hair: ramp('#6b4a12', '#a8781e', '#d4a531', '#eecb55', '#f7e08a', '#fff3c4'),
  skin: ramp('#7a4a32', '#b9785a', '#d99a7a', '#f0bc98', '#f8d4b6', '#ffe8d6'),
  shirt: ramp('#5e5a66', '#a8a4b4', '#cfccd8', '#ecebf2', '#f8f8fc', '#ffffff'),
  denim: ramp('#162a4a', '#24427a', '#2f56a0', '#3d6cc0', '#5a88d6', '#86aee8'),
  boots: ramp('#2a170c', '#4a2a16', '#5e3820', '#74482a', '#8e5c38', '#a8744c'),
  eyes: '#3a2a2a', lips: '#b5484a', blush: '#f5a5a0', button: '#ffd84a', mouth: '#7a2030',
};

// A sprite whose shapes are given in design units and painted 1.5x bigger
function personSprite() {
  const s = new PixelSprite(OWNER_W, OWNER_H), k = PERSON_K;
  const sc = sh => withBox((x, y) => sh((x + 0.5) / k - 0.5, (y + 0.5) / k - 0.5), sh.box ? sh.box.map(v => v * k) : null);
  s.p = (shape, r, opts) => s.part(sc(shape), r, opts);
  return s;
}

function ownerLegs(s, O, step, moving, xs) {
  const ph = (step / 4) * Math.PI * 2;
  const lifts = [moving ? Math.max(0, Math.sin(ph)) * 2 : 0, moving ? Math.max(0, -Math.sin(ph)) * 2 : 0];
  xs.forEach((x, i) => {
    s.p(Shape.capsule(x, 40, x, 51 - lifts[i], 3.2, 3), O.denim);
    s.p(Shape.ellipse(x, 53 - lifts[i], 3.6, 2.6), O.boots);
    s.line(x * 1.5 - 4, (53 - lifts[i]) * 1.5 + 2, x * 1.5 + 3, (53 - lifts[i]) * 1.5 + 2, O.boots.d); // sole
    s.rect(x * 1.5 - 3, (49 - lifts[i]) * 1.5, 6, 1, O.denim.l);                                     // turned-up cuff
  });
}

// Shared face for the front view: eyes with lashes and a catchlight, nose shading, blush
function frontFace(s, eyes, blush, skin) {
  // Round eyes with the catchlight in the same spot on both and the lash level with the top, so
  // the face looks soft rather than cross (a highlight on the inner corners reads as a frown)
  for (const [x, lash] of [[19, 18], [28, 30]]) {
    s.rect(x, 18, 2, 3, eyes); s.set(x, 19, '#ffffff'); s.set(lash, 18, eyes);
  }
  s.dots([[24, 22], [24, 23]], skin.s);
  if (blush) { s.rect(16, 23, 3, 1, blush); s.rect(30, 23, 3, 1, blush); }
}

function ownerFront({ step = 0, moving = false, pose = 'stand' }) {
  const O = OWNER_COLOURS, s = personSprite();
  const swing = moving ? Math.sin((step / 4) * Math.PI * 2) * 2 : 0;
  s.p(Shape.rect(8, 4, 16, 22, 6), O.hair); // long hair behind the shoulders
  ownerLegs(s, O, step, moving, [13, 19]);
  // Left arm (her right)
  s.p(Shape.capsule(9, 24, 8, 29, 2.6), O.shirt);
  s.p(Shape.capsule(8, 29, 8 + swing * 0.5, 36, 2, 1.8), O.skin);
  // Right arm: down, or raised and waving while she calls the dog
  if (pose === 'call') {
    s.p(Shape.capsule(23, 24, 25, 20, 2.6), O.shirt);
    s.p(Shape.capsule(25, 20, 27, 12, 2, 1.8), O.skin);
    s.p(Shape.ellipse(27.5, 10, 2.3, 2.3), O.skin);
    s.dots([[40, 12], [42, 12], [43, 14]], O.skin.s); // fingers
  } else {
    s.p(Shape.capsule(23, 24, 24, 29, 2.6), O.shirt);
    s.p(Shape.capsule(24, 29, 24 - swing * 0.5, 36, 2, 1.8), O.skin);
  }
  s.p(Shape.rect(9, 21, 14, 14, 4), O.shirt);
  for (let y = 34; y < 50; y += 4) { s.set(15, y, O.shirt.s); s.set(33, y + 2, O.shirt.s); } // shirt creases
  s.p(Shape.union(Shape.rect(10.5, 27, 11, 15, 2), Shape.rect(11, 23.5, 10, 6, 1)), O.denim);
  s.p(Shape.capsule(11.5, 21, 12.5, 25.5, 1.1), O.denim, { outline: false });
  s.p(Shape.capsule(20.5, 21, 19.5, 25.5, 1.1), O.denim, { outline: false });
  s.rect(18, 39, 2, 2, O.button); s.rect(28, 39, 2, 2, O.button);
  s.line(21, 45, 27, 45, O.denim.d); s.line(21, 45, 21, 50, O.denim.d); s.line(27, 45, 27, 50, O.denim.d); s.line(21, 50, 27, 50, O.denim.d); // bib pocket
  s.line(22, 46, 26, 46, O.denim.l);
  for (let y = 53; y < 62; y += 2) s.set(24, y, O.denim.s); // centre seam
  s.p(Shape.rect(14, 16, 4, 6), O.skin); // neck
  s.p(Shape.ellipse(16, 11.5, 6.5, 7.5), O.skin);
  s.p(Shape.union(
    Shape.ellipse(16, 6, 7.5, 4.5),
    Shape.poly([[8.5, 6], [9.5, 15], [12, 8]]),
    Shape.poly([[23.5, 6], [22.5, 15], [20, 8]]),
  ), O.hair); // fringe framing the face
  for (const x of [17, 22, 27, 31]) s.line(x, 7, x - 1, 11, O.hair.s); // fringe strands
  if (pose === 'call') {
    // Calling the dog home, all smiles: happy closed eyes, rosy cheeks and a big open grin
    s.dots([[18, 19], [19, 18], [20, 18], [21, 19], [27, 19], [28, 18], [29, 18], [30, 19]], O.eyes);
    s.dots([[24, 22], [24, 23]], O.skin.s);
    s.rect(15, 22, 4, 2, O.blush); s.rect(30, 22, 4, 2, O.blush);
    s.rect(21, 24, 7, 1, O.mouth); s.rect(22, 25, 5, 1, O.mouth); s.rect(23, 26, 3, 1, O.mouth);
    s.rect(22, 24, 5, 1, '#ffffff');                       // teeth
    s.rect(23, 25, 3, 1, '#e86a7a'); s.set(24, 26, '#e86a7a'); // tongue
  } else {
    frontFace(s, O.eyes, O.blush, O.skin);
    s.dots([[21, 24], [27, 24]], O.lips); s.rect(22, 25, 5, 1, O.lips); // a soft smile
  }
  return s.toCanvas();
}

function ownerSide({ step = 0, moving = false }) {
  const O = OWNER_COLOURS, s = personSprite();
  const ph = (step / 4) * Math.PI * 2, sw = moving ? Math.sin(ph) * 3 : 0, lift = moving ? Math.abs(Math.cos(ph)) * 1.5 : 0;
  s.p(Shape.rect(9, 4, 10, 24, 5), O.hair);
  // Far leg and arm (darker), then the near ones
  s.p(Shape.capsule(16, 40, 16 - sw, 51, 3.2, 3), farRamp(O.denim));
  s.p(Shape.ellipse(17.5 - sw, 53, 3.8, 2.5), farRamp(O.boots));
  s.p(Shape.capsule(16, 24, 16 - sw * 0.7, 35, 2, 1.8), farRamp(O.skin));
  s.p(Shape.capsule(16, 40, 16 + sw, 51 - lift, 3.2, 3), O.denim);
  s.p(Shape.ellipse(17.5 + sw, 53 - lift, 3.8, 2.5), O.boots);
  s.p(Shape.rect(11, 21, 11, 14, 4), O.shirt);
  s.p(Shape.union(Shape.rect(11.5, 27, 10, 15, 2), Shape.rect(14, 23.5, 7, 6, 1)), O.denim);
  s.p(Shape.capsule(14.5, 21, 15.5, 25.5, 1.1), O.denim, { outline: false });
  s.rect(28, 39, 2, 2, O.button);
  s.line(20, 52, 31, 52, O.denim.s); // back pocket line
  s.p(Shape.capsule(16, 23, 16 + sw * 0.4, 28, 2.6), O.shirt);
  s.p(Shape.capsule(16 + sw * 0.4, 28, 16 + sw * 0.8, 35, 2, 1.8), O.skin);
  s.p(Shape.rect(15, 16, 4, 6), O.skin);
  s.p(Shape.ellipse(17, 11.5, 6, 7.5), O.skin);
  s.dots([[35, 18], [35, 19], [34, 20]], O.skin.b); s.set(35, 20, O.skin.s); // nose
  s.p(Shape.union(Shape.ellipse(15.5, 6.5, 7, 4.5), Shape.rect(9, 6, 6.5, 15, 3)), O.hair);
  for (const y of [12, 18, 24, 30]) s.line(16, y, 22, y + 1, O.hair.s);
  s.rect(30, 17, 2, 2, O.eyes); s.set(32, 16, O.eyes); s.set(31, 17, '#ffffff');
  s.rect(28, 22, 3, 1, O.blush);
  s.rect(31, 24, 2, 1, O.lips);
  return s.toCanvas();
}

function ownerBack({ step = 0, moving = false }) {
  const O = OWNER_COLOURS, s = personSprite();
  const swing = moving ? Math.sin((step / 4) * Math.PI * 2) * 2 : 0;
  ownerLegs(s, O, step, moving, [13, 19]);
  s.p(Shape.capsule(9, 24, 8, 29, 2.6), O.shirt);
  s.p(Shape.capsule(8, 29, 8 - swing * 0.5, 36, 2, 1.8), O.skin);
  s.p(Shape.capsule(23, 24, 24, 29, 2.6), O.shirt);
  s.p(Shape.capsule(24, 29, 24 + swing * 0.5, 36, 2, 1.8), O.skin);
  s.p(Shape.rect(9, 21, 14, 14, 4), O.shirt);
  s.p(Shape.rect(10.5, 26, 11, 16, 2), O.denim);
  s.p(Shape.union(Shape.capsule(11, 21, 20, 28, 1.1), Shape.capsule(21, 21, 12, 28, 1.1)), O.denim, { outline: false }); // crossed straps
  s.line(17, 52, 22, 52, O.denim.s); s.line(26, 52, 31, 52, O.denim.s); // back pockets
  s.p(Shape.union(Shape.ellipse(16, 10, 7.5, 8), Shape.rect(8, 8, 16, 18, 6)), O.hair);
  for (const x of [18, 24, 30]) s.line(x, 13, x, 36, O.hair.s); // strands
  for (const x of [21, 27]) s.line(x, 10, x, 30, O.hair.l);
  s.rect(21, 34, 6, 2, '#e8607a'); // hair tie
  return s.toCanvas();
}

function buildOwnerSprites() {
  const four = [0, 1, 2, 3];
  const side = { idle: [ownerSide({})], walk: four.map(i => ownerSide({ step: i, moving: true })) };
  return {
    down: { idle: [ownerFront({})], walk: four.map(i => ownerFront({ step: i, moving: true })), call: [ownerFront({ pose: 'call' })] },
    up: { idle: [ownerBack({})], walk: four.map(i => ownerBack({ step: i, moving: true })) },
    right: side,
    left: flipSet(side),
  };
}

// ---- The vet: white coat over teal scrubs, short brown hair, waving a thermometer ----
const VET_COLOURS = {
  hair: ramp('#2a1608', '#4a2a14', '#5e3820', '#74482a', '#8e5c38', '#a8744c'),
  skin: OWNER_COLOURS.skin,
  coat: ramp('#6a6a74', '#b4b4c0', '#d4d4de', '#f0f0f6', '#fafafe', '#ffffff'),
  scrubs: ramp('#0e3a3a', '#1a5e5e', '#227676', '#2a9090', '#4aaeae', '#7accc8'),
  shoes: ramp('#1a1a1e', '#2a2a30', '#3a3a42', '#4a4a54', '#5e5e6a', '#7a7a86'),
  eyes: '#3a2a2a', thermo: '#ffffff', thermoTip: '#e03040',
};

function thermometer(s, x0, y0, x1, y1, V) {
  s.line(x0, y0, x1, y1, V.thermo); s.line(x0 + 1, y0, x1 + 1, y1, '#c8d0dc');
  s.rect(x1, y1, 2, 2, V.thermoTip);
}

function vetFrame(view, step, moving) {
  const V = VET_COLOURS, s = personSprite();
  const ph = (step / 4) * Math.PI * 2;
  const lifts = [moving ? Math.max(0, Math.sin(ph)) * 2 : 0, moving ? Math.max(0, -Math.sin(ph)) * 2 : 0];
  const sw = moving ? Math.sin(ph) * 3 : 0;
  if (view === 'side') {
    s.p(Shape.capsule(16, 40, 16 - sw, 51, 3, 2.8), farRamp(V.scrubs));
    s.p(Shape.ellipse(17.5 - sw, 53, 3.6, 2.3), farRamp(V.shoes));
    s.p(Shape.capsule(16, 40, 16 + sw, 51, 3, 2.8), V.scrubs);
    s.p(Shape.ellipse(17.5 + sw, 53, 3.6, 2.3), V.shoes);
    s.p(Shape.rect(10.5, 20, 12, 22, 4), V.coat);
    s.line(18, 40, 32, 40, V.coat.s); s.line(17, 50, 17, 62, V.coat.s); // coat pocket and vent
    s.p(Shape.capsule(16, 23, 19 + sw * 0.5, 33, 2.4, 2), V.coat);
    s.p(Shape.ellipse(19.5 + sw * 0.5, 34.5, 2, 2), V.skin);
    thermometer(s, (21 + sw * 0.5) * 1.5, 45, (24 + sw * 0.5) * 1.5, 51, V);
    s.p(Shape.rect(15, 16, 4, 6), V.skin);
    s.p(Shape.ellipse(17, 11.5, 6, 7.5), V.skin);
    s.dots([[35, 18], [35, 19], [34, 20]], V.skin.b);
    s.p(Shape.union(Shape.ellipse(15.5, 6.5, 7, 4), Shape.rect(10, 6, 5, 7, 2)), V.hair);
    s.rect(30, 17, 2, 2, V.eyes); s.set(31, 17, '#ffffff');
    s.rect(31, 24, 2, 1, OWNER_COLOURS.lips);
    return s.toCanvas();
  }
  [13, 19].forEach((x, i) => {
    s.p(Shape.capsule(x, 40, x, 51 - lifts[i], 3, 2.8), V.scrubs);
    s.p(Shape.ellipse(x, 53 - lifts[i], 3.4, 2.3), V.shoes);
  });
  const armSwing = moving ? Math.sin(ph) * 2 : 0;
  s.p(Shape.capsule(9, 23, 8 + armSwing * 0.5, 33, 2.4, 2), V.coat);
  s.p(Shape.capsule(23, 23, 24 - armSwing * 0.5, 33, 2.4, 2), V.coat);
  s.p(Shape.ellipse(8 + armSwing * 0.5, 34.5, 2, 2), V.skin);
  s.p(Shape.ellipse(24 - armSwing * 0.5, 34.5, 2, 2), V.skin);
  s.p(Shape.rect(9, 20, 14, 23, 4), V.coat);
  if (view === 'front') {
    s.p(Shape.poly([[13, 20], [16, 26], [19, 20]]), V.scrubs, { outline: false }); // scrubs showing at the V-neck
    s.line(24, 40, 24, 63, V.coat.s);                                                // coat opening
    s.dots([[25, 46], [25, 54]], V.coat.d);                                          // buttons
    s.rect(15, 46, 7, 1, V.coat.s); s.rect(28, 54, 7, 1, V.coat.s);                 // pockets
    s.rect(17, 43, 1, 4, '#4a7ad8'); s.rect(19, 44, 1, 3, '#e03040');                 // pens in the pocket
    s.part(Shape.capsule(17, 33, 30, 33, 0.8), solid('#3a3a42'), { outline: false });  // stethoscope
    s.part(Shape.capsule(17, 33, 20, 42, 0.8), solid('#3a3a42'), { outline: false });
    s.part(Shape.ellipse(20, 43, 1.6, 1.6), ramp('#5a5a62', '#9aa0a8', '#b8bec6', '#d0d6de', '#e8ecf0', '#ffffff'), { merge: false });
    thermometer(s, (25 - armSwing * 0.5) * 1.5, 46, (28 - armSwing * 0.5) * 1.5, 54, V);
  }
  s.p(Shape.rect(14, 16, 4, 6), V.skin);
  s.p(Shape.ellipse(16, 11.5, 6.5, 7.5), V.skin);
  if (view === 'front') {
    s.p(Shape.union(Shape.ellipse(16, 6, 7.5, 4), Shape.rect(9, 6, 2.5, 6, 1), Shape.rect(20.5, 6, 2.5, 6, 1)), V.hair);
    frontFace(s, V.eyes, null, V.skin);
    s.rect(22, 25, 5, 1, OWNER_COLOURS.lips);
  } else {
    s.p(Shape.union(Shape.ellipse(16, 9, 7.5, 7), Shape.rect(9.5, 8, 13, 7, 3)), V.hair);
    for (const x of [19, 24, 29]) s.line(x, 8, x, 20, V.hair.s);
  }
  return s.toCanvas();
}

function buildVetSprites() {
  const four = [0, 1, 2, 3];
  const side = { idle: [vetFrame('side', 0, false)], walk: four.map(i => vetFrame('side', i, true)) };
  return {
    down: { idle: [vetFrame('front', 0, false)], walk: four.map(i => vetFrame('front', i, true)) },
    up: { idle: [vetFrame('back', 0, false)], walk: four.map(i => vetFrame('back', i, true)) },
    right: side,
    left: flipSet(side),
  };
}

// ---- Pet store staff: polo shirt, store apron with a name badge, cap, dark trousers ----
const STAFF_LOOKS = {
  red:   { apron: ramp('#3a0808', '#7a1414', '#a01e1e', '#c42a2a', '#de4a42', '#f0806a'), hair: VET_COLOURS.hair },
  blue:  { apron: ramp('#0a1e3a', '#163a6a', '#22508e', '#2e68b0', '#5088cc', '#86b2e6'), hair: OWNER_COLOURS.hair },
  green: { apron: ramp('#0a2a10', '#145a20', '#1e7a2c', '#2a9a3a', '#4cba52', '#8ade82'), hair: ramp('#1a0a04', '#2a140a', '#3a1e10', '#4a2a18', '#5e3a24', '#7a4e34') },
  // The vet's night janitor: grey-blue overalls over a work shirt
  janitor: { apron: ramp('#101a24', '#22323e', '#2e4250', '#3c5464', '#56707e', '#7e96a2'), hair: ramp('#2a2a2a', '#4a4a4a', '#6a6a6a', '#8a8a8a', '#a8a8a8', '#c8c8c8'),
    shirt: ramp('#2a3a4a', '#4a6278', '#5e7890', '#7490a8', '#94acc0', '#bccede') },
  // The pet store's security guard: a dark vest and cap over a light-blue shirt
  guard: { apron: ramp('#050508', '#121216', '#1c1c22', '#28282e', '#3c3c44', '#56565e'), hair: ramp('#1a0a04', '#2a140a', '#3a1e10', '#4a2a18', '#5e3a24', '#7a4e34'),
    shirt: ramp('#2a4a6a', '#5a82a8', '#76a0c4', '#94bcdc', '#b4d2ea', '#dceaf6') },
};
const STAFF_POLO = ramp('#6a5a00', '#b89a10', '#d8b820', '#f0d040', '#f8e070', '#fff4b0');
const STAFF_PANTS = ramp('#0a0a10', '#1a1a24', '#24242e', '#30303c', '#44445a', '#5e5e78');
function staffFrame(view, step, moving, look) {
  const L = STAFF_LOOKS[look], V = VET_COLOURS, s = personSprite(), STAFF_SHIRT = L.shirt || STAFF_POLO;
  const ph = (step / 4) * Math.PI * 2;
  const lifts = [moving ? Math.max(0, Math.sin(ph)) * 2 : 0, moving ? Math.max(0, -Math.sin(ph)) * 2 : 0];
  const sw = moving ? Math.sin(ph) * 3 : 0;
  if (view === 'side') {
    s.p(Shape.capsule(16, 40, 16 - sw, 51, 3, 2.8), farRamp(STAFF_PANTS));
    s.p(Shape.ellipse(17.5 - sw, 53, 3.6, 2.3), farRamp(V.shoes));
    s.p(Shape.capsule(16, 40, 16 + sw, 51, 3, 2.8), STAFF_PANTS);
    s.p(Shape.ellipse(17.5 + sw, 53, 3.6, 2.3), V.shoes);
    s.p(Shape.rect(10.5, 20, 12, 21, 4), STAFF_SHIRT);
    s.p(Shape.union(Shape.rect(16, 24, 7, 18, 2)), L.apron);                         // apron front
    s.p(Shape.capsule(16, 23, 19 + sw * 0.5, 31, 2.4, 2), STAFF_SHIRT);
    s.p(Shape.ellipse(19.5 + sw * 0.5, 33.5, 2, 2), V.skin);
    s.p(Shape.rect(15, 16, 4, 6), V.skin);
    s.p(Shape.ellipse(17, 11.5, 6, 7.5), V.skin);
    s.dots([[35, 18], [35, 19], [34, 20]], V.skin.b);
    s.p(Shape.union(Shape.ellipse(15.5, 7, 7, 4), Shape.rect(10, 6, 5, 9, 2)), L.hair);
    s.p(Shape.union(Shape.ellipse(16, 5, 7, 3.5), Shape.rect(19, 5, 6, 2.5, 1)), L.apron, { merge: false }); // cap with a peak
    s.rect(30, 17, 2, 2, V.eyes); s.set(31, 17, '#ffffff');
    s.rect(31, 24, 2, 1, OWNER_COLOURS.lips);
    return s.toCanvas();
  }
  [13, 19].forEach((x, i) => {
    s.p(Shape.capsule(x, 40, x, 51 - lifts[i], 3, 2.8), STAFF_PANTS);
    s.p(Shape.ellipse(x, 53 - lifts[i], 3.4, 2.3), V.shoes);
  });
  const armSwing = moving ? Math.sin(ph) * 2 : 0;
  s.p(Shape.capsule(9, 23, 8 + armSwing * 0.5, 30, 2.4, 2), STAFF_SHIRT);
  s.p(Shape.capsule(23, 23, 24 - armSwing * 0.5, 30, 2.4, 2), STAFF_SHIRT);
  s.p(Shape.capsule(8 + armSwing * 0.5, 30, 8 + armSwing * 0.5, 34, 1.8), V.skin);
  s.p(Shape.capsule(24 - armSwing * 0.5, 30, 24 - armSwing * 0.5, 34, 1.8), V.skin);
  s.p(Shape.rect(9, 20, 14, 21, 4), STAFF_SHIRT);
  if (view === 'front') {
    s.p(Shape.union(Shape.rect(11, 25, 10, 17, 2), Shape.rect(12, 22, 8, 4)), L.apron);   // apron with its bib
    s.p(Shape.capsule(12, 22, 11, 19, 0.6), L.apron, { outline: false }); s.p(Shape.capsule(20, 22, 21, 19, 0.6), L.apron, { outline: false });
    s.rect(18, 39, 7, 4, '#ffffff'); s.rect(19, 40, 5, 1, L.apron.d);                   // name badge
    s.rect(21, 52, 7, 1, L.apron.d); s.rect(27, 46, 1, 7, L.apron.d);                    // apron pocket
    s.dots([[22, 47], [22, 48], [23, 47]], '#c08a50');                                   // treats in the pocket!
    s.p(Shape.poly([[13, 20], [16, 23], [19, 20]]), STAFF_SHIRT, { outline: false });     // polo collar
  } else {
    s.p(Shape.union(Shape.capsule(12, 22, 20, 30, 0.8), Shape.capsule(20, 22, 12, 30, 0.8)), L.apron, { outline: false }); // apron ties
    s.rect(22, 43, 4, 3, L.apron.b);                                                       // the bow
  }
  s.p(Shape.rect(14, 16, 4, 6), V.skin);
  s.p(Shape.ellipse(16, 11.5, 6.5, 7.5), V.skin);
  if (view === 'front') {
    s.p(Shape.union(Shape.ellipse(16, 7, 7.5, 3.5), Shape.rect(9, 6, 2.5, 7, 1), Shape.rect(20.5, 6, 2.5, 7, 1)), L.hair);
    s.p(Shape.union(Shape.ellipse(16, 5, 7.5, 3.5), Shape.ellipse(16, 8, 7, 1.6)), L.apron, { merge: false }); // cap and peak
    frontFace(s, V.eyes, OWNER_COLOURS.blush, V.skin);
    s.dots([[21, 24], [27, 24]], OWNER_COLOURS.lips); s.rect(22, 25, 5, 1, OWNER_COLOURS.lips);
  } else {
    s.p(Shape.union(Shape.ellipse(16, 9, 7.5, 7), Shape.rect(9.5, 8, 13, 8, 3)), L.hair);
    s.p(Shape.ellipse(16, 6, 7.5, 4), L.apron, { merge: false });
    s.rect(22, 13, 4, 2, L.apron.d);                                                       // cap strap
  }
  return s.toCanvas();
}
// ---- Guests and shoppers (the beg levels): everyday clothes, assorted hair and skin ----
const SKINS = [
  OWNER_COLOURS.skin,
  ramp('#4a2a18', '#8a5434', '#a86a44', '#c4865a', '#d8a074', '#ecc09a'),
  ramp('#2a160c', '#4e2a16', '#663a20', '#7e4c2c', '#9a623a', '#b47e52'),
  ramp('#6a4428', '#b07850', '#cc9468', '#e4b088', '#f0c8a4', '#fbe2c8'),
];
const HAIRS = {
  blonde: OWNER_COLOURS.hair, brown: VET_COLOURS.hair,
  black: ramp('#050508', '#121216', '#1c1c22', '#28282e', '#3c3c44', '#56565e'),
  red: ramp('#3a0e04', '#7a2a10', '#9a3a18', '#b84e24', '#d06a3a', '#e8905e'),
  grey: ramp('#3a3a3e', '#6a6a70', '#86868c', '#a2a2a8', '#bcbcc0', '#dadade'),
};
const CLOTHES = {
  red: ramp('#3a0808', '#7a1414', '#a01e1e', '#c42a2a', '#de4a42', '#f0806a'),
  blue: ramp('#0a1e3a', '#163a6a', '#22508e', '#2e68b0', '#5088cc', '#86b2e6'),
  green: ramp('#0a2a10', '#145a20', '#1e7a2c', '#2a9a3a', '#4cba52', '#8ade82'),
  yellow: ramp('#5a3e00', '#a87400', '#d09a10', '#f2c42a', '#ffdc5a', '#fff0a0'),
  pink: ramp('#3a1020', '#6e2240', '#8c3052', '#a84068', '#c4608a', '#e090b0'),
  purple: ramp('#2a1238', '#4e2266', '#642e82', '#7a3e9c', '#9658b8', '#b882d4'),
  white: OWNER_COLOURS.shirt, denim: OWNER_COLOURS.denim,
  khaki: ramp('#3a3018', '#6a5a30', '#8a7640', '#a89254', '#c2ae70', '#dccc94'),
  black: STAFF_PANTS,
};
const GUEST_LOOKS = {
  a: { hair: 'brown', style: 'short', skin: 0, shirt: 'blue', pants: 'khaki' },
  b: { hair: 'blonde', style: 'long', skin: 0, shirt: 'pink', pants: 'denim', dress: false },
  c: { hair: 'black', style: 'bun', skin: 2, shirt: 'yellow', pants: 'yellow', dress: true },
  d: { hair: 'red', style: 'long', skin: 3, shirt: 'green', pants: 'green', dress: true },
  e: { hair: 'grey', style: 'short', skin: 3, shirt: 'white', pants: 'black' },
  f: { hair: 'black', style: 'short', skin: 1, shirt: 'red', pants: 'denim' },
  g: { hair: 'brown', style: 'long', skin: 1, shirt: 'purple', pants: 'purple', dress: true },
  h: { hair: 'blonde', style: 'short', skin: 3, shirt: 'green', pants: 'khaki' },
  i: { hair: 'black', style: 'long', skin: 2, shirt: 'white', pants: 'denim' },
  j: { hair: 'grey', style: 'bun', skin: 0, shirt: 'pink', pants: 'pink', dress: true },
};
function guestFrame(view, step, moving, look) {
  const G = GUEST_LOOKS[look], s = personSprite(), V = VET_COLOURS;
  const skin = SKINS[G.skin], hair = HAIRS[G.hair], shirt = CLOTHES[G.shirt], pants = CLOTHES[G.pants];
  const ph = (step / 4) * Math.PI * 2, sw = moving ? Math.sin(ph) * 3 : 0;
  const lifts = [moving ? Math.max(0, Math.sin(ph)) * 2 : 0, moving ? Math.max(0, -Math.sin(ph)) * 2 : 0];
  const legs = G.dress ? skin : pants;
  if (view === 'side') {
    s.p(Shape.capsule(16, 40, 16 - sw, 51, 2.8, 2.6), farRamp(legs));
    s.p(Shape.ellipse(17.5 - sw, 53, 3.6, 2.3), farRamp(V.shoes));
    s.p(Shape.capsule(16, 40, 16 + sw, 51, 2.8, 2.6), legs);
    s.p(Shape.ellipse(17.5 + sw, 53, 3.6, 2.3), V.shoes);
    if (G.dress) s.p(Shape.poly([[10, 22], [22, 22], [25, 43], [8, 43]]), shirt);
    else s.p(Shape.union(Shape.rect(10.5, 20, 12, 21, 4)), shirt);
    s.p(Shape.capsule(16, 23, 19 + sw * 0.5, 31, 2.4, 2), shirt);
    s.p(Shape.ellipse(19.5 + sw * 0.5, 33.5, 2, 2), skin);
    s.p(Shape.rect(15, 16, 4, 6), skin);
    s.p(Shape.ellipse(17, 11.5, 6, 7.5), skin);
    if (G.style === 'long') s.p(Shape.union(Shape.ellipse(15, 7, 7, 4), Shape.rect(9, 6, 6, 16, 2)), hair);
    else if (G.style === 'bun') s.p(Shape.union(Shape.ellipse(15.5, 7, 7, 4), Shape.rect(10, 6, 5, 8, 2), Shape.ellipse(10, 4, 3.5, 3.5)), hair);
    else s.p(Shape.union(Shape.ellipse(15.5, 6.5, 7, 3.6), Shape.rect(10, 6, 5, 6, 2)), hair);
    s.rect(30, 17, 2, 2, V.eyes); s.set(31, 17, '#ffffff');
    s.rect(31, 24, 2, 1, OWNER_COLOURS.lips);
    return s.toCanvas();
  }
  [13, 19].forEach((x, i) => {
    s.p(Shape.capsule(x, 40, x, 51 - lifts[i], 2.8, 2.6), legs);
    s.p(Shape.ellipse(x, 53 - lifts[i], 3.4, 2.3), V.shoes);
  });
  const armSwing = moving ? Math.sin(ph) * 2 : 0;
  s.p(Shape.capsule(9, 23, 8 + armSwing * 0.5, 30, 2.4, 2), shirt);
  s.p(Shape.capsule(23, 23, 24 - armSwing * 0.5, 30, 2.4, 2), shirt);
  s.p(Shape.capsule(8 + armSwing * 0.5, 30, 8 + armSwing * 0.5, 34, 1.8), skin);
  s.p(Shape.capsule(24 - armSwing * 0.5, 30, 24 - armSwing * 0.5, 34, 1.8), skin);
  if (G.dress) s.p(Shape.poly([[9, 21], [23, 21], [26, 43], [6, 43]]), shirt);
  else { s.p(Shape.rect(9, 20, 14, 21, 4), shirt); s.p(Shape.rect(10, 37, 12, 5, 1), pants, { merge: false }); }
  if (view === 'front' && !G.dress) s.p(Shape.poly([[13, 20], [16, 24], [19, 20]]), skin, { outline: false }); // open collar
  s.p(Shape.rect(14, 16, 4, 6), skin);
  s.p(Shape.ellipse(16, 11.5, 6.5, 7.5), skin);
  if (view === 'front') {
    if (G.style === 'long') s.p(Shape.union(Shape.ellipse(16, 7, 7.5, 3.8), Shape.rect(8.5, 6, 3, 16, 1), Shape.rect(20.5, 6, 3, 16, 1)), hair);
    else if (G.style === 'bun') s.p(Shape.union(Shape.ellipse(16, 7, 7.5, 3.6), Shape.ellipse(16, 2, 3.5, 3), Shape.rect(9, 6, 2.5, 6, 1), Shape.rect(20.5, 6, 2.5, 6, 1)), hair);
    else s.p(Shape.union(Shape.ellipse(16, 6.5, 7.5, 3.4), Shape.rect(9, 6, 2.5, 5, 1), Shape.rect(20.5, 6, 2.5, 5, 1)), hair);
    frontFace(s, V.eyes, OWNER_COLOURS.blush, skin);
    s.dots([[21, 24], [27, 24]], OWNER_COLOURS.lips); s.rect(22, 25, 5, 1, OWNER_COLOURS.lips);
  } else {
    s.p(Shape.union(Shape.ellipse(16, 9, 7.5, 7), Shape.rect(9.5, 8, 13, G.style === 'long' ? 16 : 8, 3)), hair);
    if (G.style === 'bun') s.p(Shape.ellipse(16, 3, 3.5, 3), hair, { merge: false });
  }
  return s.toCanvas();
}
function buildGuestSprites() {
  const four = [0, 1, 2, 3];
  return Object.fromEntries(Object.keys(GUEST_LOOKS).map(look => {
    const side = { idle: [guestFrame('side', 0, false, look)], walk: four.map(i => guestFrame('side', i, true, look)) };
    return [look, {
      down: { idle: [guestFrame('front', 0, false, look)], walk: four.map(i => guestFrame('front', i, true, look)) },
      up: { idle: [guestFrame('back', 0, false, look)], walk: four.map(i => guestFrame('back', i, true, look)) },
      right: side, left: flipSet(side),
    }];
  }));
}
function buildStaffSprites() {
  const four = [0, 1, 2, 3];
  return Object.fromEntries(Object.keys(STAFF_LOOKS).map(look => {
    const side = { idle: [staffFrame('side', 0, false, look)], walk: four.map(i => staffFrame('side', i, true, look)) };
    return [look, {
      down: { idle: [staffFrame('front', 0, false, look)], walk: four.map(i => staffFrame('front', i, true, look)) },
      up: { idle: [staffFrame('back', 0, false, look)], walk: four.map(i => staffFrame('back', i, true, look)) },
      right: side, left: flipSet(side),
    }];
  }));
}

// ---- Beach-goers (drawn in code, in the guest colour sets): swimmers, sunbakers lying on towels,
// readers sitting with a book, and little kids building sandcastles (who cry if a dog flattens one).
// Each frame's anchor (ax, ay) is the spot on the ground the person sits or lies on.
function beachSprite(w, h) {
  const s = new PixelSprite(Math.round(w * PERSON_K), Math.round(h * PERSON_K)), k = PERSON_K;
  const sc = sh => withBox((x, y) => sh((x + 0.5) / k - 0.5, (y + 0.5) / k - 0.5), sh.box ? sh.box.map(v => v * k) : null);
  s.p = (shape, r, opts) => s.part(sc(shape), r, opts);
  return s;
}
const SUNNIES = '#1a1a22';
function beachHair(s, G, hair, cx, cy, r) {
  if (G.style === 'long') s.p(Shape.union(Shape.ellipse(cx, cy - r * 0.45, r * 1.1, r * 0.6), Shape.rect(cx - r * 1.1, cy - r * 0.4, r * 0.5, r * 1.6, 1), Shape.rect(cx + r * 0.6, cy - r * 0.4, r * 0.5, r * 1.6, 1)), hair);
  else if (G.style === 'bun') s.p(Shape.union(Shape.ellipse(cx, cy - r * 0.45, r * 1.1, r * 0.6), Shape.ellipse(cx, cy - r * 1.2, r * 0.5, r * 0.45)), hair);
  else s.p(Shape.ellipse(cx, cy - r * 0.5, r * 1.05, r * 0.55), hair);
}
function beachPersonFrame(kind, f, look) {
  const G = GUEST_LOOKS[look], skin = SKINS[G.skin], hair = HAIRS[G.hair], suit = CLOTHES[G.shirt];
  if (kind === 'swim') { // head and shoulders above the water, arms going round in a freestyle stroke
    const s = beachSprite(26, 16), a = (f / 4) * Math.PI * 2;
    s.p(Shape.ellipse(13, 13, 9, 3.2), skin);
    const arm = (side, ph) => { const hx = 13 + side * (6 + Math.cos(ph) * 5), hy = 11 - Math.max(0, Math.sin(ph)) * 9; s.p(Shape.capsule(13 + side * 6, 12, hx, hy, 1.8, 1.6), skin); };
    arm(-1, a); arm(1, a + Math.PI);
    s.p(Shape.ellipse(13, 8, 4.6, 5), skin);
    beachHair(s, G, hair, 13, 8, 4.6);
    s.rect(Math.round(10 * PERSON_K), Math.round(8.5 * PERSON_K), 4, 2, '#2a2a3a'); s.rect(Math.round(14 * PERSON_K), Math.round(8.5 * PERSON_K), 4, 2, '#2a2a3a'); // goggles
    return Object.assign(s.toCanvas(), { ax: 19, ay: 20 });
  }
  if (kind === 'sun') { // lying flat on a towel (head to the left), sunnies on; f 1 wiggles the toes, f 2 propped up on the elbows
    const up = f === 2, s = beachSprite(44, 18);
    const hy = up ? 6 : 10, hx = up ? 7 : 6;
    s.p(Shape.capsule(26, 9.5, 40, 8, 2.6, 2), farRamp(skin)); // far leg
    s.p(Shape.capsule(26, 11, 40, 12 + (f === 1 ? -1 : 0), 2.8, 2.2), skin);
    s.p(Shape.ellipse(41 + (f === 1 ? 1 : 0), 12 + (f === 1 ? -1 : 0), 1.8, 2), skin); // toes
    s.p(Shape.capsule(up ? 11 : 10, up ? 8 : 10, 27, 10, 4.2, 3.8), skin); // body
    s.p(Shape.rect(15, up ? 6 : 6.5, 12, 7, 2), suit); // swimsuit
    if (up) s.p(Shape.capsule(9, 9, 11, 15, 1.8), skin); // elbow under the shoulders
    else s.p(Shape.capsule(12, 13, 24, 14, 1.8, 1.6), skin); // arm by its side
    s.p(Shape.ellipse(hx, hy, 4.6, 4.8), skin);
    beachHair(s, G, hair, hx, hy, 4.6);
    s.rect(Math.round((hx + 0.5) * PERSON_K), Math.round((hy - 0.8) * PERSON_K), 6, 3, SUNNIES); // sunnies
    if (up) s.rect(Math.round((hx + 1.5) * PERSON_K), Math.round((hy + 2.4) * PERSON_K), 3, 2, OWNER_COLOURS.mouth); // "oh!"
    return Object.assign(s.toCanvas(), { ax: 33, ay: 22 });
  }
  if (kind === 'read') { // sitting on the sand, legs out front, reading; f 1 turns a page, f 2 looks up over the book
    const s = beachSprite(24, 30), look = f === 2;
    s.p(Shape.capsule(9, 24, 6, 28, 2.6, 2.2), skin); s.p(Shape.capsule(15, 24, 18, 28, 2.6, 2.2), skin);
    s.p(Shape.rect(6.5, 12, 11, 13, 3.5), suit);
    s.p(Shape.ellipse(12, 7, 4.8, 5.2), skin);
    beachHair(s, G, hair, 12, 7, 4.8);
    s.p(Shape.capsule(7, 14, 9, 18, 1.8), skin); s.p(Shape.capsule(17, 14, 15, 18, 1.8), skin);
    const by = look ? 18 : 15; // the book (lowered when they look up)
    s.p(Shape.rect(7, by, 10, 7, 1), ramp('#5a1a14', '#8a2a20', '#a83a2a', '#c44a34', '#d86a4a', '#ee9070'));
    s.rect(Math.round(12 * PERSON_K), Math.round(by * PERSON_K) + 1, 1, Math.round(6 * PERSON_K), '#f4ecd8');
    if (f === 1) s.rect(Math.round(12.5 * PERSON_K), Math.round(by * PERSON_K) - 2, 5, Math.round(6 * PERSON_K), '#f8f2e2'); // a page mid-turn
    if (look) { s.rect(Math.round(10 * PERSON_K), Math.round(7 * PERSON_K), 2, 2, '#3a2a2a'); s.rect(Math.round(13.4 * PERSON_K), Math.round(7 * PERSON_K), 2, 2, '#3a2a2a'); s.rect(Math.round(11.4 * PERSON_K), Math.round(9.6 * PERSON_K), 3, 2, OWNER_COLOURS.mouth); }
    return Object.assign(s.toCanvas(), { ax: 18, ay: 42 });
  }
  // kid: sitting beside a sandcastle (facing right), digging with a spade; f 2-3 crying, fists at its eyes
  const s = beachSprite(18, 20), cry = f >= 2, scoop = !cry && f === 1;
  s.p(Shape.capsule(6, 17, 14, 18, 2, 1.8), skin); // legs out
  s.p(Shape.rect(3.5, 9, 7, 9, 2.5), suit);
  s.p(Shape.ellipse(7 + (cry ? (f === 3 ? -0.5 : 0.5) : 0), 5, 3.8, 4), skin);
  beachHair(s, G, hair, 7 + (cry ? (f === 3 ? -0.5 : 0.5) : 0), 5, 3.8);
  if (cry) {
    s.p(Shape.capsule(6, 10, 8, 5.5, 1.4), skin); s.p(Shape.capsule(9, 10, 10.5, 5.5, 1.4), skin); // fists rubbing the eyes
    s.rect(Math.round(8 * PERSON_K), Math.round(7.4 * PERSON_K), 3, 2, OWNER_COLOURS.mouth); // wailing
  } else {
    const hx = scoop ? 15 : 13, hy = scoop ? 12 : 15;
    s.p(Shape.capsule(9, 10, hx, hy, 1.4), skin);
    s.p(Shape.capsule(hx, hy, hx + 2, hy + (scoop ? -2 : 2), 0.8), ramp('#5a3a10', '#8a5a1a', '#a87022', '#c48a2e', '#d8a446', '#ecc070')); // spade
    s.rect(Math.round(9 * PERSON_K), Math.round(4.6 * PERSON_K), 2, 2, '#3a2a2a');
  }
  return Object.assign(s.toCanvas(), { ax: 9, ay: 28 });
}
// Every look's beach poses: swim (4), sun (3: still, toes, propped up), read (3: page, turn, look up), kid (4: dig x2, cry x2)
function buildBeachPeopleSprites() {
  return Object.fromEntries(Object.keys(GUEST_LOOKS).map(look => [look, {
    swim: [0, 1, 2, 3].map(f => beachPersonFrame('swim', f, look)),
    sun: [0, 1, 2].map(f => beachPersonFrame('sun', f, look)),
    read: [0, 1, 2].map(f => beachPersonFrame('read', f, look)),
    kid: [0, 1, 2, 3].map(f => beachPersonFrame('kid', f, look)),
  }]));
}
