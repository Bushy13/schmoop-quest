// The dogs: Harley and Bobbin, drawn with Sprite Fusion. The frames are packed into sprite sheets
// by art_src/build_dog_sheets.py (Bobbin is Harley recoloured: white coat, pink nose and collar,
// plus raincoat and bandaged versions) and stored as data URLs in js/art/dogsheets.js.
// Views: side (facing right, mirrored for left), front (walking toward the camera) and back.
// The DOGS table below is the gameplay info and colours for each dog.

const DOGS = {
  harley: {
    name: 'HARLEY',
    desc: 'BLACK STAFFY',
    trait: 'anxious',
    traitName: 'ANXIOUS',
    traitLines: ['+ SPOTS CATS AND CRITTERS EARLY', '- NERVOUS NEAR CATS AND BIRDS'],
    coat: ramp('#111218', '#20222c', '#2c2f3b', '#3a3e4d', '#566076', '#8a95ae'),
    chest: ramp('#5a5e6c', '#9296a8', '#bfc3d0', '#e6e8f0', '#f5f6fa', '#ffffff'),
    collar: ramp('#0f3a14', '#1a6522', '#23892c', '#2eb03a', '#5cd366', '#a0f0a4'),
    nose: '#0a0a0e', noseShine: '#7a8094', eye: '#07070c', eyeShine: '#ffffff', brow: '#566076',
    mouthLine: '#111218', crease: '#08060c', innerEar: '#4a2a34',
    tongue: null,
  },
  bobbin: {
    name: 'BOBBIN',
    desc: 'WHITE STAFFY',
    trait: 'deaf',
    traitName: 'DEAF',
    traitLines: ['+ NEVER SLOWS DOWN NEAR DANGER', '- NO EARLY WARNINGS, CHASES BIRDS'],
    coat: ramp('#5b4b43', '#a39283', '#c9bcae', '#e9e1d6', '#f6f1ea', '#ffffff'),
    chest: ramp('#5b4b43', '#b9ab9d', '#ddd3c8', '#f5f0e9', '#fbf9f5', '#ffffff'),
    collar: ramp('#5e1233', '#a3245b', '#cc3a78', '#ec5596', '#f78bb8', '#ffc4dc'),
    nose: '#e0607f', noseShine: '#ffc2d2', eye: '#2a1a1a', eyeShine: '#ffffff', brow: '#c9bcae',
    mouthLine: '#8a6e62', crease: '#8a7064', innerEar: '#e8a0aa',
    tongue: ramp('#6e1a2c', '#b02f4f', '#d6466a', '#ec6888', '#f79aae', '#ffc8d4'),
  },
};
const DOG_ORDER = ['harley', 'bobbin'];

// Every frame is a 64x66 cell with the feet at (32, 62)
const DOG_W = DOG_SHEET.cellW, DOG_H = DOG_SHEET.cellH, DOG_FOOT_X = DOG_SHEET.footX, DOG_FOOT_Y = DOG_SHEET.footY;
const RAINCOAT = ramp('#6a4a00', '#b88a00', '#dcaa10', '#f6cc2a', '#ffe066', '#fff3b0');
const solid = c => ramp(c, c, c, c, c, c);
// Each dog's face (cropped from the front view), for the tug-of-war meter
const DOG_FACE = {};

const blankCell = (w = DOG_W, h = DOG_H) => Object.assign(document.createElement('canvas'), { width: w, height: h });

// Where the mouth is in a frame (cell coordinates), found from the pixels and remembered, so a
// carried stick or shoe sits in the jaws whatever the head is doing. face: 1 right, -1 left, 0 front.
const MOUTHS = new WeakMap();
function mouthOf(frame, face) {
  if (MOUTHS.has(frame)) return MOUTHS.get(frame);
  const px = frame.getContext('2d').getImageData(0, 0, DOG_W, DOG_H).data, on = (x, y) => px[(y * DOG_W + x) * 4 + 3] > 0;
  let top = -1;
  for (let y = 0; y < DOG_H && top < 0; y++) for (let x = 0; x < DOG_W; x++) if (on(x, y)) { top = y; break; }
  if (top < 0) return null; // not decoded yet: try again next frame
  let m;
  if (!face) m = { x: DOG_FOOT_X, y: top + 13 }; // front view: the chin, just under the nose
  else {
    // The tip of the nose is the furthest-forward pixel in the head band; the mouth is under it
    let nx = face > 0 ? -1 : DOG_W, ny = 0;
    for (let y = top; y < Math.min(DOG_H, top + 24); y++) for (let x = 0; x < DOG_W; x++)
      if (on(x, y) && (face > 0 ? x > nx : x < nx)) { nx = x; ny = y; }
    const bx = nx - face * 4;
    let by = ny; while (by < DOG_H - 1 && by < ny + 10 && on(bx, by + 1)) by++;
    m = { x: bx, y: by };
  }
  MOUTHS.set(frame, m);
  return m;
}

// Builds every frame for one dog: { right, left, down, up } x animation, plus `bandaged`.
// Side animations: idle, run (a happy trot), sprint (flat out), sniff, nervous, squat (the poop break), sitDown,
// happy (sitting, tongue out, wagging), slow (creeping along). Front and back: idle, run.
// The canvases exist straight away and are filled in as soon as the sheet image has decoded.
function buildDogSprites(d, coat = false) {
  return buildSheetSprites(DOG_ORDER.find(k => DOGS[k] === d), coat);
}

// ---- Fallback moves made in code from the Sprite Fusion frames ----
// roll, stand, shakeWet, woof and drink now have real Sprite Fusion strips in the sheets; these are only
// used where a sheet has none. howl (nose to the moon) is always made here.
// Each derived cell is drawn once the sheet has loaded, after the frames it's made from.
const DOG_TOP = 24; // roughly where the top of the dog's back/ears sits in a cell
function deriveMoves(out, jobs) {
  const R = out.right, make = draw => {
    const c = blankCell();
    jobs.push(() => { const g = c.getContext('2d'); g.imageSmoothingEnabled = false; draw(g); });
    return c;
  };
  // Squash the frame vertically about the ground (s from 1 to -1 is a roll round the long axis:
  // negative is upside down, back on the ground), shifting each source row by xoff(row)
  const squash = (g, src, s, xoff = () => 0) => {
    const ty = s >= 0 ? DOG_FOOT_Y - DOG_FOOT_Y * s : DOG_FOOT_Y - DOG_TOP * s;
    for (let y = 0; y < DOG_H; y++) {
      const sy = Math.floor((y + 0.5 - ty) / s);
      if (sy < 0 || sy >= DOG_H) continue;
      g.drawImage(src, 0, sy, DOG_W, 1, Math.round(xoff(sy)), y, DOG_W, 1);
    }
  };
  const rotate = (g, src, px, py, a, dy = 0) => { g.translate(px, py + dy); g.rotate(a); g.drawImage(src, -px, -py); g.setTransform(1, 0, 0, 1, 0, 0); };
  const idle = R.idle[0];
  // Roll: lie down, flop over belly-up and wriggle with the legs kicking, then roll back up
  const legs = ph => sy => (sy > 46 ? Math.sin(ph + sy * 0.9) * 2.5 : Math.sin(ph) * 0.8);
  const roll = [1, 0.7, 0.35, -0.3, -0.62, ...[0, 1, 2, 3, 4, 5].map(k => ['wiggle', k]), -0.3, 0.35, 0.75].map(v =>
    make(g => Array.isArray(v) ? squash(g, idle, -0.72, legs(v[1] * 1.9)) : squash(g, idle, v)));
  // Stand: rear up on the back legs, nose in the air
  const stand = [-0.3, -0.62, -0.78, -0.78].map((a, k) => make(g => rotate(g, idle, 22, DOG_FOOT_Y, a, k === 3 ? -1 : 0)));
  // Wet-dog shake: a wave runs down the body, fast
  const shakeWet = [0, 1, 2, 3, 4, 5].map(k => make(g => squash(g, idle, 1, sy => Math.sin(k * 2.1 + sy * 0.28) * (sy > 50 ? 1 : 3))));
  const woof = [make(g => g.drawImage(idle, 0, 0)), make(g => rotate(g, idle, 24, DOG_FOOT_Y, -0.09, -1))];
  const howl = [make(g => rotate(g, idle, 22, DOG_FOOT_Y, -0.26))];
  const flip = frames => frames.map(f => make(g => { g.translate(DOG_W, 0); g.scale(-1, 1); g.drawImage(f, 0, 0); }));
  // Only where the sheet has no real Sprite Fusion version of the move (today, just the howl)
  for (const [name, frames] of Object.entries({ roll, stand, shakeWet, woof, howl })) if (!R[name]) { R[name] = frames; out.left[name] = flip(frames); }
  if (!R.drink) { R.drink = R.sniff; out.left.drink = out.left.sniff; }
}

// Any dog with a sheet in dogsheets.js: Harley, Bobbin, and the dogs at the dog park
const PARK_DOGS = ['rusty', 'blue', 'fawn', 'choc'];
function buildSheetSprites(id, coat = false) {
  const img = new Image();
  const out = { right: {}, left: {}, down: {}, up: {} }, jobs = [];
  DOG_SHEET.rows[coat ? 'coat' : 'plain'].forEach((row, r) => {
    const frames = [], flipped = [];
    for (let i = 0; i < row.frames; i++) {
      const c = blankCell(), f = blankCell();
      frames.push(c); flipped.push(f);
      jobs.push(() => {
        c.getContext('2d').drawImage(img, i * DOG_W, r * DOG_H, DOG_W, DOG_H, 0, 0, DOG_W, DOG_H);
        const g = f.getContext('2d');
        g.translate(DOG_W, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
      });
    }
    if (row.anim === 'bandaged') out.bandaged = frames;
    else if (row.view === 'side') { out.right[row.anim] = frames; out.left[row.anim] = flipped; }
    else out[row.view][row.anim] = frames;
  });
  if (!coat) { // the face (for the tug meter), for every dog with a sheet
    const face = DOG_FACE[id] = blankCell(32, 28);
    jobs.push(() => face.getContext('2d').drawImage(out.down.idle[0], 16, 20, 32, 28, 0, 0, 32, 28));
  }
  if (!PARK_DOGS.includes(id)) deriveMoves(out, jobs);
  img.onload = () => jobs.forEach(job => job());
  img.src = DOG_SHEET_DATA[id][coat ? 'coat' : 'plain'];
  // The names the game asks for
  for (const v of ['right', 'left']) {
    const s = out[v];
    s.bark = s.sprint;                    // chasing something, barking
    s.barkStand = [s.run[3], s.run[4]];   // squaring up to the snake / tugging
    s.play = s.happy;
  }
  for (const v of ['down', 'up']) { const s = out[v]; s.bark = s.run; s.barkStand = s.idle; }
  out.up.sit = out.up.idle;               // watching the TV
  return out;
}
