// Ground tiles (32px, Stardew-style: textured grass that spills ragged edges over dirt, soft soil
// beds, glossy mud, water with sandy banks), plus trees and bushes. The static ground for a whole
// level is pre-rendered once into a single canvas.

const GROUND = {
  grass: '#6cb24a', grassDark: '#5a9c3c', grassDarker: '#4a8630', grassLight: '#86c75c', grassLighter: '#a2da74',
  dirt: '#d9a660', dirtDark: '#c48f4c', dirtDarker: '#a87540', dirtLight: '#e8bc7c', dirtShadow: '#b8864a',
  pebble: '#c8baa6', pebbleDark: '#9a8a72', pebbleLight: '#ece4d4',
  water: '#3f86d8', waterDeep: '#3373c4', waterLight: '#5d9ee6', waterGlint: '#a8d4f8', sand: '#d2bd8e', sandDark: '#8a7a5a',
  mud: '#6a4a30', mudDark: '#553a24', mudDarker: '#42291a', mudShine: '#a39686', mudPuddle: '#7c8790',
  soil: '#6b4528', soilDark: '#58381f', soilLight: '#7d5434', soilSpeck: '#4a2e18',
  stone: '#c4bcae', stoneLight: '#dcd6ca', stoneDark: '#a49c8e', stoneGap: '#857d70',
};
const WOOD = ramp('#3a2210', '#5e3a1c', '#7a4e28', '#966434', '#b47e48', '#cc9a62');
const ROOF = ['#4a1a12', '#7a2c20', '#943a2a', '#b04a34', '#c86048'];

// ---- Trees and bushes (drawn every frame, depth-sorted with the characters) ----
// Several styles in three sizes. Each sprite records its anchor (where the trunk/base meets the
// ground) so the game can place and depth-sort it.

// Sized so even the smallest tree stands well over the dog (a Staffy is a small-to-medium dog)
const TREE_SIZES = { s: { w: 90, h: 123 }, m: { w: 120, h: 158 }, l: { w: 150, h: 192 } };
const BUSH_SIZES = { s: { w: 42, h: 36 }, m: { w: 52, h: 47 }, l: { w: 68, h: 57 } };
const LEAF = {
  oak: ramp('#0f2e1a', '#1c4a26', '#24602e', '#2f7a38', '#46994a', '#6fbf5c'),
  pine: ramp('#08201a', '#123a2a', '#1a4e36', '#226244', '#348058', '#56a274'),
  birch: ramp('#1e3a10', '#2e5a1a', '#3c7422', '#4e902c', '#6cae42', '#9cd068'),
  blossom: ramp('#5a1a3a', '#a8406a', '#d0608a', '#ec88aa', '#f8b0c8', '#ffd8e6'),
  apple: ramp('#123018', '#1e4c22', '#2a662c', '#3a8236', '#5aa448', '#8cc862'),
  willow: ramp('#203a10', '#34561a', '#467024', '#5a8c30', '#7aaa48', '#a6cc6c'),
  bush: ramp('#143a1c', '#215a2a', '#2d7534', '#3b9442', '#5ab455', '#8ad672'),
  hedge: ramp('#0c2a14', '#16401e', '#1e5428', '#286a32', '#3c8644', '#5ea85e'),
  fern: ramp('#1a3a10', '#2a5a18', '#387420', '#4a9028', '#6ab03e', '#96d064'),
  dune: ramp('#3a4a1c', '#5a6e2a', '#728a36', '#8aa246', '#a8bc62', '#c8d68a'),
};
const BARK = ramp('#2a1608', '#4a2a14', '#5e3a1c', '#7a4e28', '#946238', '#b07a4c');
const BIRCH_BARK = ramp('#5a5a5a', '#b8b4a8', '#d4d0c4', '#ece8de', '#f6f4ee', '#ffffff');

function leafClusters(s, leaf, area, count, rng, size) {
  const clusters = [];
  for (let i = 0; i < count * 6 && clusters.length < count; i++) {
    const x = area.x + rng() * area.w, y = area.y + rng() * area.h;
    if (s.px[Math.round(y) * s.w + Math.round(x)]) clusters.push([x, y]);
  }
  // Seen from above, the higher clusters are nearer the camera, so they're painted last and overlap the lower ones
  clusters.sort((a, b) => b[1] - a[1]);
  for (const [x, y] of clusters) s.part(Shape.ellipse(x, y, size + rng() * 1.5, size * 0.8 + rng()), leaf, { merge: false, clip: true, outline: false });
}

function sprinkle(s, rng, n, area, colours, onlyOn) {
  for (let i = 0; i < n; i++) {
    const x = Math.round(area.x + rng() * area.w), y = Math.round(area.y + rng() * area.h);
    if (!s.inside(x, y) || !s.px[y * s.w + x] || (onlyOn && !onlyOn.includes(s.px[y * s.w + x]))) continue;
    const c = colours[i % colours.length];
    s.set(x, y, c[0]); if (c[1]) { s.set(x + 1, y, c[1]); s.set(x, y + 1, c[1]); }
  }
}

function treeSprite(style, size, seed) {
  const { w: W, h: H } = TREE_SIZES[size], rng = seeded(seed);
  const s = new PixelSprite(W, H), cx = W / 2, base = H - 4, k = W / 64; // k scales shapes with the size
  const leaf = LEAF[style];
  if (style === 'pine') {
    s.part(Shape.rect(cx - 3 * k, base - 16 * k, 6 * k, 16 * k, 2), BARK);
    const tiers = 4;
    // Layered triangles, painted from the widest bottom tier up, so each higher tier overlaps the one below
    for (let i = tiers - 1; i >= 0; i--) {
      const top = 4 + i * (H - 26 * k) / tiers, bottom = top + (H - 20 * k) / tiers + 8 * k, half = (10 + i * 7) * k;
      s.part(Shape.poly([[cx, top], [cx + half, bottom], [cx + half * 0.3, bottom - 3 * k], [cx - half * 0.3, bottom - 3 * k], [cx - half, bottom]]), leaf, { merge: false });
      for (let x = Math.round(cx - half + 3); x < cx + half - 3; x++) if (s.get(x, bottom + 2) && (x + i) % 3) s.set(x, bottom + 2, leaf.d); // shadow on the tier below
    }
    sprinkle(s, rng, 30 * k, { x: 4, y: 6, w: W - 8, h: H - 24 * k }, [[leaf.l], [leaf.h]], [leaf.b, leaf.s]);
    return Object.assign(s.toCanvas(), { anchorX: cx, anchorY: base });
  }
  const trunk = style === 'birch' ? BIRCH_BARK : BARK;
  const tw = (style === 'birch' ? 7 : 11) * k;
  s.part(Shape.union(
    Shape.rect(cx - tw / 2, base - 34 * k, tw, 34 * k, 2),
    Shape.poly([[cx - tw / 2 - 5 * k, base + 1], [cx - tw / 2 + 1, base - 10 * k], [cx - tw / 2 + 4 * k, base + 1]]),
    Shape.poly([[cx + tw / 2 + 5 * k, base + 1], [cx + tw / 2 - 1, base - 10 * k], [cx + tw / 2 - 4 * k, base + 1]]),
  ), trunk);
  if (style === 'birch') for (let i = 0; i < 6; i++) s.rect(Math.round(cx - tw / 2 + rng() * (tw - 2)), Math.round(base - 6 - rng() * 28 * k), 2, 1, '#2a2a2a');
  else for (const dx of [-2, 1, 3]) s.line(cx + dx * k, base - 28 * k, cx + dx * k, base - 6 * k, trunk.s);

  const ch = H - 32 * k; // canopy height
  if (style === 'willow') {
    s.part(Shape.union(Shape.ellipse(cx, ch * 0.42, 27 * k, ch * 0.36), Shape.ellipse(cx, ch * 0.2, 17 * k, ch * 0.2)), leaf);
    leafClusters(s, leaf, { x: 6 * k, y: 4, w: W - 12 * k, h: ch * 0.7 }, 26 * k, rng, 4 * k);
    for (let i = 0; i < 14; i++) { // drooping strands
      const x = cx - 26 * k + (i / 13) * 52 * k, y0 = ch * 0.45 + Math.abs(i - 6.5) * 1.5 * k;
      s.part(Shape.capsule(x, y0, x + (rng() - 0.5) * 3, y0 + (18 + rng() * 14) * k, 1.4 * k, 0.8), leaf, { merge: false, outline: i % 2 === 0 });
    }
    // The top dome sits in front of where the strands start
    s.part(Shape.ellipse(cx, ch * 0.24, 18 * k, ch * 0.2), leaf, { merge: false });
    leafClusters(s, leaf, { x: cx - 16 * k, y: 4, w: 32 * k, h: ch * 0.36 }, 10 * k, rng, 4 * k);
    return Object.assign(s.toCanvas(), { anchorX: cx, anchorY: base });
  }
  const airy = style === 'birch';
  const blobs = airy
    ? [[cx - 12 * k, ch * 0.55, 13, 11], [cx + 13 * k, ch * 0.5, 13, 11], [cx, ch * 0.3, 15, 12], [cx - 2 * k, ch * 0.72, 12, 8]]
    : [[cx, ch * 0.52, 27, ch * 0.33 / k], [cx - 16 * k, ch * 0.66, 13, 11], [cx + 16 * k, ch * 0.66, 13, 11], [cx, ch * 0.24, 17, 12], [cx, ch * 0.78, 18, 9]];
  s.part(Shape.union(...blobs.map(([x, y, rx, ry]) => Shape.ellipse(x, y, rx * k, ry * k))), leaf);
  leafClusters(s, leaf, { x: 5 * k, y: 3, w: W - 10 * k, h: ch * 0.9 }, (airy ? 22 : 34) * k, rng, (airy ? 4 : 5) * k);
  sprinkle(s, rng, 26 * k, { x: 8 * k, y: 6, w: W - 16 * k, h: ch * 0.8 }, [[leaf.h]], [leaf.b, leaf.l]);
  if (style === 'blossom') sprinkle(s, rng, 40 * k, { x: 6, y: 6, w: W - 12, h: ch * 0.85 }, [['#ffffff', '#ffe0ec'], ['#ff8ab0']], null);
  if (style === 'apple') sprinkle(s, rng, 14 * k, { x: 8, y: 10, w: W - 16, h: ch * 0.75 }, [['#e0303a', '#a01820']], null);
  return Object.assign(s.toCanvas(), { anchorX: cx, anchorY: base });
}

function bushSprite(style, size, seed) {
  const { w: W, h: H } = BUSH_SIZES[size], rng = seeded(seed);
  const s = new PixelSprite(W, H), cx = W / 2, base = H - 3, k = W / 40;
  if (style === 'dune') {
    // Beach grass: a little mound of sand with tall spiky blades
    const leaf = LEAF.dune, sandR = ramp('#7a6438', '#b89a62', '#d2b47a', '#e6cf98', '#f0dfb2', '#faf0d4');
    s.part(Shape.ellipse(cx, base - 3 * k, 15 * k, 5 * k), sandR);
    for (let i = 0; i < 13; i++) {
      const a = Math.PI * (0.12 + (i / 12) * 0.76) + (rng() - 0.5) * 0.15, len = (12 + rng() * 10) * k;
      s.part(Shape.capsule(cx + (i - 6) * 1.2 * k, base - 4 * k, cx - Math.cos(a) * len, base - 4 * k - Math.sin(a) * len, 1.2 * k, 0.5), leaf, { merge: false });
    }
    return Object.assign(s.toCanvas(), { anchorX: cx, anchorY: base });
  }
  if (style === 'hedge') {
    const leaf = LEAF.hedge;
    s.part(Shape.rect(2, 6 * k, W - 4, H - 8 * k, 6 * k), leaf);
    sprinkle(s, rng, 40 * k, { x: 3, y: 6 * k, w: W - 6, h: H - 10 * k }, [[leaf.l], [leaf.d]], null);
  } else if (style === 'fern') {
    const leaf = LEAF.fern;
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.1 + (i / 8) * 0.8), len = (14 + rng() * 6) * k;
      const x2 = cx - Math.cos(a) * len * 1.2, y2 = base - Math.sin(a) * len;
      s.part(Shape.capsule(cx, base - 2, x2, y2, 2.2 * k, 0.8), leaf, { merge: false });
      for (let j = 1; j < 5; j++) s.set(cx + (x2 - cx) * j / 5 + (j % 2 ? 2 : -2), base - 2 + (y2 - base + 2) * j / 5, leaf.h);
    }
  } else {
    const leaf = LEAF.bush;
    s.part(Shape.union(Shape.ellipse(cx, H * 0.56, W * 0.45, H * 0.33), Shape.ellipse(cx - W * 0.22, H * 0.66, W * 0.23, H * 0.22), Shape.ellipse(cx + W * 0.22, H * 0.66, W * 0.23, H * 0.22), Shape.ellipse(cx, H * 0.33, W * 0.28, H * 0.22)), leaf);
    leafClusters(s, leaf, { x: 3, y: 5, w: W - 6, h: H - 10 }, 18 * k, rng, 4 * k);
    if (style === 'berry') sprinkle(s, rng, 16 * k, { x: 4, y: 8, w: W - 8, h: H - 14 }, [['#d9455f', '#ff8a9a'], ['#5a4ad0', '#8a7aff']], null);
    if (style === 'flower') {
      const bloom = [['#ffffff', '#ffd84a'], ['#ff8fb1', '#ffd0e0'], ['#ffd84a', '#ffffff'], ['#d06aff', '#f0c0ff']][Math.floor(rng() * 4)];
      for (let i = 0; i < 14 * k; i++) {
        const x = Math.round(5 + rng() * (W - 10)), y = Math.round(6 + rng() * (H - 14));
        if (!s.px[y * s.w + x]) continue;
        s.dots([[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]], bloom[0]); s.set(x, y, bloom[1]);
      }
    }
  }
  return Object.assign(s.toCanvas(), { anchorX: cx, anchorY: base });
}

const TREE_STYLES = ['oak', 'pine', 'birch', 'blossom', 'apple', 'willow'];
const BUSH_STYLES = ['leafy', 'berry', 'flower', 'hedge', 'fern', 'dune'];

function buildSceneSprites() {
  const trees = {}, bushes = {};
  for (const style of TREE_STYLES) for (const size of ['s', 'm', 'l']) for (const v of [0, 1]) trees[`${style}_${size}_${v}`] = treeSprite(style, size, 11 + v * 37 + style.length * 7);
  for (const style of BUSH_STYLES) for (const size of ['s', 'm', 'l']) for (const v of [0, 1]) bushes[`${style}_${size}_${v}`] = bushSprite(style, size, 5 + v * 23 + style.length * 3);
  return { trees, bushes };
}

// ---- Pre-rendered ground ----
function renderGround(grid) {
  const { W, H } = grid;
  // Draw the ground that lies under furniture, mud and spills (recorded in grid.under)
  const tiles = grid.tiles.slice(), rawGet = grid.get;
  const PUDDLE = [T.MUD, T.SPILL];
  for (let i = 0; i < tiles.length; i++) {
    if (grid.under && grid.under[i] !== 255 && [T.FURN, T.TABLE, T.MUD, T.SPILL].includes(tiles[i])) tiles[i] = grid.under[i];
  }
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? rawGet(x, y) : tiles[y * W + x];
  const canvas = document.createElement('canvas');
  canvas.width = W * TILE;
  canvas.height = H * TILE;
  const g = canvas.getContext('2d');
  const px = (x, y, colour, w = 1, h = 1) => { g.fillStyle = colour; g.fillRect(x, y, w, h); };
  const speckle = (ox, oy, n, colours) => { for (let i = 0; i < n; i++) px(ox + rand(0, TILE - 1), oy + rand(0, TILE - 1), pick(colours)); };
  const GRASSY = [T.GRASS, T.FLOWER, T.BUSH, T.TREE, T.FENCE];
  const isGrassy = t => GRASSY.includes(t);

  const grass = (ox, oy) => {
    px(ox, oy, GROUND.grass, TILE, TILE);
    speckle(ox, oy, 26, [GROUND.grassDark, GROUND.grassLight]);
    for (let i = 0; i < 9; i++) {
      const x = ox + rand(1, TILE - 4), y = oy + rand(3, TILE - 2);
      if (Math.random() < 0.6) { px(x, y, GROUND.grassDarker); px(x + 1, y - 1, GROUND.grassDarker); px(x + 2, y, GROUND.grassDarker); }
      else { px(x, y, GROUND.grassLighter); px(x, y - 1, GROUND.grassLight); }
    }
  };
  const dirt = (ox, oy) => {
    px(ox, oy, GROUND.dirt, TILE, TILE);
    speckle(ox, oy, 34, [GROUND.dirtDark, GROUND.dirtLight, GROUND.dirtDark]);
    for (let i = 0, n = rand(0, 2); i < n; i++) {
      const x = ox + rand(2, TILE - 6), y = oy + rand(2, TILE - 5);
      px(x, y + 2, GROUND.dirtShadow, 4, 1);
      px(x, y, GROUND.pebble, 3, 2); px(x, y, GROUND.pebbleLight, 1, 1); px(x + 2, y + 1, GROUND.pebbleDark, 1, 1);
    }
  };

  // Indoor floors: style per tile comes from grid.floor (see FLOOR_STYLE in world.js)
  const floorStyle = (tx, ty) => (grid.floor ? grid.floor[ty * W + tx] : 0);
  const floor = (ox, oy, style, tx, ty) => {
    if (style === FLOOR_STYLE.wood) {
      px(ox, oy, '#b07a48', TILE, TILE);
      for (let y = 0; y < TILE; y += 8) {
        px(ox, oy + y, '#c48e58', TILE, 1); px(ox, oy + y + 7, '#8a5a32', TILE, 1);
        const seam = ((ty * 4 + y / 8) * 13) % TILE;
        px(ox + seam, oy + y, '#8a5a32', 1, 8);
      }
      speckle(ox, oy, 8, ['#a06c3e', '#bc8654']);
    } else if (style === FLOOR_STYLE.carpet) {
      px(ox, oy, '#8a6a9a', TILE, TILE);
      speckle(ox, oy, 60, ['#7a5a8a', '#9a7aaa', '#84649a']);
    } else if (style === FLOOR_STYLE.kitchen || style === FLOOR_STYLE.bath) {
      const [a, b] = style === FLOOR_STYLE.kitchen ? ['#ece4d4', '#c8504a'] : ['#e4f0f4', '#7ab4c8'];
      for (const [sx, sy] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
        const checker = ((sx + sy) / 16 + tx + ty) % 2 === 0;
        px(ox + sx, oy + sy, checker ? a : b, 16, 16);
        px(ox + sx, oy + sy, 'rgba(255,255,255,0.35)', 16, 1); px(ox + sx, oy + sy + 15, 'rgba(0,0,0,0.12)', 16, 1);
      }
    } else if (style === FLOOR_STYLE.concrete) {
      px(ox, oy, '#7a766e', TILE, TILE);
      speckle(ox, oy, 40, ['#6c6862', '#88847c', '#74706a']);
      if (Math.random() < 0.25) px(ox + rand(4, 24), oy + rand(4, 24), '#66625c', rand(3, 7), 1); // scuffs and tyre marks
      if (ty % 3 === 0) px(ox, oy, '#625e58', TILE, 1); // expansion joints between slabs
      if (tx % 3 === 0) px(ox, oy, '#625e58', 1, TILE);
    } else if (style === FLOOR_STYLE.store) { // pet store: big glossy tiles with the odd blue one
      const blue = (tx * 7 + ty * 13) % 11 === 0;
      px(ox, oy, blue ? '#c8dcf0' : '#eef0f2', TILE, TILE);
      px(ox, oy, '#d0d6dc', TILE, 1); px(ox, oy, '#d0d6dc', 1, TILE);
      px(ox + 3, oy + 3, 'rgba(255,255,255,0.7)', 8, 1);
      speckle(ox, oy, 6, ['#dfe3e8']);
    } else { // vet: speckled vinyl tiles
      px(ox, oy, '#dce8e4', TILE, TILE);
      speckle(ox, oy, 30, ['#c4d4d0', '#e8f2ee', '#b8ccc8']);
      px(ox, oy, '#c0d0cc', TILE, 1); px(ox, oy, '#c0d0cc', 1, TILE);
    }
  };
  const WALLS = {
    house: { face: '#e8d8bc', stripe: '#dcc8a8', top: '#5a4232', trim: '#ffffff' },
    garage: { face: '#a8a49a', stripe: '#96928a', top: '#4a4640', trim: '#7a766e' },
    vet: { face: '#cfe8e2', stripe: '#b8d8d0', top: '#3a5450', trim: '#ffffff' },
    store: { face: '#f4f0e6', stripe: '#e2ecf4', top: '#2e5a8a', trim: '#2e5a8a' },
  };
  const wallColours = WALLS[grid.area] || WALLS.house;

  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const t = tiles[ty * W + tx], ox = tx * TILE, oy = ty * TILE;
      const same = (dx, dy) => get(tx + dx, ty + dy) === t;

      if (t === T.PATH) {
        dirt(ox, oy);
      } else if (t === T.SAND) {
        // Dry pale sand, darker and smoother the closer it is to the water
        const wet = [1, 2, 3].findIndex(d => get(tx, ty + d) === T.WATER) + 1; // 1 = right by the water
        const base = wet ? ['#c8ad78', '#d4b984', '#dcc290'][wet - 1] : '#e6cf98';
        px(ox, oy, base, TILE, TILE);
        speckle(ox, oy, wet ? 12 : 28, wet ? ['#bea270', '#d0b888'] : ['#d8bf86', '#f0dcae', '#cfb37a']);
        if (!wet && (tx + ty * 3) % 4 === 0) for (let y = 6; y < TILE; y += 9) px(ox + 2, oy + y, '#d6bc82', TILE - 6, 1); // wind ripples
        if (Math.random() < 0.12) { const x = ox + rand(4, 24), y = oy + rand(4, 24); px(x, y, '#fff6ec', 3, 2); px(x + 1, y + 2, '#e0a890', 1, 1); } // a shell
      } else if (t === T.WATER) {
        px(ox, oy, GROUND.water, TILE, TILE);
        for (let i = 0; i < 6; i++) px(ox + rand(3, 24), oy + rand(4, 27), pick([GROUND.waterLight, GROUND.waterDeep]), rand(2, 5), 1);
        // Sandy bank with a pale waterline wherever the pond meets land
        if (!same(0, -1)) { px(ox, oy, GROUND.sand, TILE, 3); px(ox, oy + 3, GROUND.sandDark, TILE, 1); px(ox, oy + 4, GROUND.waterGlint, TILE, 1); }
        if (!same(0, 1)) { px(ox, oy + 29, GROUND.sand, TILE, 3); px(ox, oy + 28, GROUND.waterGlint, TILE, 1); }
        if (!same(-1, 0)) { px(ox, oy, GROUND.sand, 3, TILE); px(ox + 3, oy, GROUND.sandDark, 1, TILE); px(ox + 4, oy, GROUND.waterGlint, 1, TILE); }
        if (!same(1, 0)) { px(ox + 29, oy, GROUND.sand, 3, TILE); px(ox + 28, oy, GROUND.waterGlint, 1, TILE); }
      } else if (t === T.BED) {
        // Dark soil in furrows, inside a wooden frame
        px(ox, oy, GROUND.soil, TILE, TILE);
        for (let y = 3; y < TILE; y += 7) { px(ox, oy + y, GROUND.soilLight, TILE, 1); px(ox, oy + y + 2, GROUND.soilDark, TILE, 2); }
        speckle(ox, oy, 14, [GROUND.soilSpeck, GROUND.soilLight]);
        const plank = 5;
        if (!same(0, -1)) { px(ox, oy, WOOD.o, TILE, 1); px(ox, oy + 1, WOOD.l, TILE, 1); px(ox, oy + 2, WOOD.b, TILE, plank - 3); px(ox, oy + plank - 1, WOOD.d, TILE, 1); }
        if (!same(0, 1)) {
          // The raised bed's front face: a lit top rim, then the darker planks facing the camera
          px(ox, oy + TILE - 11, GROUND.soilSpeck, TILE, 1);
          px(ox, oy + TILE - 10, WOOD.o, TILE, 1); px(ox, oy + TILE - 9, WOOD.h, TILE, 1); px(ox, oy + TILE - 8, WOOD.l, TILE, 1);
          px(ox, oy + TILE - 7, WOOD.s, TILE, 6); px(ox, oy + TILE - 7, WOOD.b, TILE, 1);
          px(ox, oy + TILE - 4, WOOD.d, TILE, 1);
          for (let x = (tx * 11) % 12; x < TILE; x += 12) px(ox + x, oy + TILE - 7, WOOD.d, 1, 6);
          for (let i = 0; i < 3; i++) px(ox + rand(1, 26), oy + TILE - rand(3, 6), WOOD.d, rand(2, 5), 1);
          px(ox, oy + TILE - 1, WOOD.o, TILE, 1);
        }
        if (!same(-1, 0)) { px(ox, oy, WOOD.o, 1, TILE); px(ox + 1, oy, WOOD.l, 1, TILE); px(ox + 2, oy, WOOD.b, plank - 3, TILE); px(ox + plank - 1, oy, WOOD.d, 1, TILE); }
        if (!same(1, 0)) { px(ox + TILE - plank, oy, WOOD.l, 1, TILE); px(ox + TILE - plank + 1, oy, WOOD.b, plank - 3, TILE); px(ox + TILE - 2, oy, WOOD.s, 1, TILE); px(ox + TILE - 1, oy, WOOD.o, 1, TILE); }
        // Corner posts
        for (const [dx, dy, cx, cy] of [[-1, -1, 0, 0], [1, -1, TILE - 7, 0], [-1, 1, 0, TILE - 7], [1, 1, TILE - 7, TILE - 7]]) {
          if (!same(dx, 0) && !same(0, dy)) { px(ox + cx, oy + cy, WOOD.o, 7, 7); px(ox + cx + 1, oy + cy + 1, WOOD.s, 5, 5); px(ox + cx + 1, oy + cy + 1, WOOD.h, 4, 1); px(ox + cx + 1, oy + cy + 1, WOOD.l, 1, 4); }
        }
      } else if (t === T.HOUSE) {
        if (ty === 1) {
          // Roof: overlapping rows of shingles, offset every other row
          px(ox, oy, ROOF[2], TILE, TILE);
          for (let y = 0; y < TILE - 4; y += 7) {
            const off = (y / 7) % 2 ? 4 : 0;
            px(ox, oy + y + 6, ROOF[1], TILE, 1);
            for (let x = off; x < TILE; x += 8) { px(ox + x, oy + y, ROOF[3], 7, 1); px(ox + x + 7, oy + y, ROOF[1], 1, 6); }
          }
          px(ox, oy + TILE - 4, ROOF[0], TILE, 4);
          px(ox, oy + TILE - 4, ROOF[4], TILE, 1);
        } else {
          // Weatherboards
          px(ox, oy, '#ecdfc4', TILE, TILE);
          for (let y = 0; y < TILE; y += 6) { px(ox, oy + y, '#f8f0dc', TILE, 1); px(ox, oy + y + 5, '#cdbe9e', TILE, 1); }
          if (ty === 3) { px(ox, oy + TILE - 6, '#9c9282', TILE, 6); px(ox, oy + TILE - 6, '#b4ab9c', TILE, 1); for (let x = 0; x < TILE; x += 8) px(ox + x, oy + TILE - 5, '#857d70', 1, 5); }
        }
      } else if (t === T.PATIO) {
        // Square paving stones with bevelled edges
        for (const [sx, sy] of [[0, 0], [16, 0], [0, 16], [16, 16]]) {
          const x = ox + sx, y = oy + sy;
          px(x, y, GROUND.stoneGap, 16, 16);
          px(x + 1, y + 1, GROUND.stone, 14, 14);
          px(x + 1, y + 1, GROUND.stoneLight, 14, 1); px(x + 1, y + 1, GROUND.stoneLight, 1, 14);
          px(x + 1, y + 14, GROUND.stoneDark, 14, 1); px(x + 14, y + 1, GROUND.stoneDark, 1, 14);
          if (Math.random() < 0.4) px(x + rand(3, 11), y + rand(3, 11), GROUND.stoneDark, 2, 1);
        }
      } else if (t === T.DECK) {
        // Timber decking: planks with nail heads and staggered joins
        px(ox, oy, '#a8743e', TILE, TILE);
        for (let y = 0; y < TILE; y += 8) {
          px(ox, oy + y, '#c08a50', TILE, 1); px(ox, oy + y + 6, '#7a5028', TILE, 2);
          const join = ((tx * 7 + (oy + y) / 8 * 5) % 4) * 8;
          px(ox + join, oy + y, '#7a5028', 1, 7);
          px(ox + (join + 3) % TILE, oy + y + 3, '#5a3a1c', 1, 1);
        }
      } else if (t === T.POOL) {
        // Pool water with a tiled coping wherever it meets the yard
        px(ox, oy, '#3aa6e0', TILE, TILE);
        for (let i = 0; i < 5; i++) px(ox + rand(2, 26), oy + rand(4, 28), '#6ac4f0', rand(3, 6), 1);
        const edge = (dx, dy) => get(tx + dx, ty + dy) !== T.POOL;
        if (edge(0, -1)) { px(ox, oy, '#efe8dc', TILE, 5); px(ox, oy + 5, '#2a86c0', TILE, 3); for (let x = 0; x < TILE; x += 8) px(ox + x, oy, '#cfc6b6', 1, 5); }
        if (edge(0, 1)) { px(ox, oy + 27, '#efe8dc', TILE, 5); for (let x = 0; x < TILE; x += 8) px(ox + x, oy + 27, '#cfc6b6', 1, 5); }
        if (edge(-1, 0)) { px(ox, oy, '#efe8dc', 5, TILE); px(ox + 5, oy, '#2a86c0', 2, TILE); }
        if (edge(1, 0)) { px(ox + 27, oy, '#efe8dc', 5, TILE); }
      } else if (t === T.FLOWERBED) {
        // Mulched bed packed with roses, tulips and daisies, behind a low brick edge
        px(ox, oy, '#5a3a22', TILE, TILE);
        speckle(ox, oy, 30, ['#6e4a2c', '#4a2e18']);
        for (let i = 0; i < 7; i++) {
          const x = ox + rand(3, 28), y = oy + rand(3, 22);
          px(x - 1, y + 2, '#2f7a38', 3, 3); px(x, y + 4, '#24602e', 1, 4);
          const [c1, c2] = pick([['#e8304a', '#a01828'], ['#ffd84a', '#d8a820'], ['#ffffff', '#ffd84a'], ['#ff8fb1', '#d8608a'], ['#b48cff', '#8a60d8']]);
          px(x - 1, y - 1, c1, 3, 3); px(x, y, c2);
        }
        px(ox, oy + 26, '#a0503a', TILE, 6); px(ox, oy + 26, '#c06a4e', TILE, 1);
        for (let x = 0; x < TILE; x += 8) px(ox + x + ((ty % 2) * 4), oy + 27, '#7a3a28', 1, 5);
      } else if (t === T.STONE) {
        // Stepping stones sit in whatever they're set into: dirt on a path, otherwise lawn
        if (get(tx - 1, ty) === T.PATH || get(tx + 1, ty) === T.PATH || get(tx, ty - 1) === T.PATH) dirt(ox, oy); else grass(ox, oy);
        px(ox + 7, oy + 8, GROUND.stoneGap, 18, 16);
        px(ox + 8, oy + 7, GROUND.stoneGap, 16, 18);
        px(ox + 8, oy + 8, GROUND.stone, 16, 16);
        px(ox + 8, oy + 8, GROUND.stoneLight, 16, 2); px(ox + 8, oy + 22, GROUND.stoneDark, 16, 2);
      } else if (t === T.WALL) {
        const below = get(tx, ty + 1);
        if (below !== T.WALL && below !== T.FENCE) {
          // The visible face of the wall, with skirting board along the bottom
          px(ox, oy, wallColours.face, TILE, TILE);
          for (let x = 4; x < TILE; x += 8) px(ox + x, oy + 6, wallColours.stripe, 2, TILE - 12);
          px(ox, oy, wallColours.top, TILE, 6);
          px(ox, oy + 6, 'rgba(0,0,0,0.2)', TILE, 1);
          px(ox, oy + TILE - 5, wallColours.trim, TILE, 5); px(ox, oy + TILE - 5, 'rgba(0,0,0,0.15)', TILE, 1);
        } else {
          px(ox, oy, wallColours.top, TILE, TILE);
          px(ox, oy, 'rgba(255,255,255,0.08)', TILE, 2);
        }
      } else if (t === T.FLOOR || t === T.TABLE || t === T.FURN || t === T.RUG) {
        floor(ox, oy, floorStyle(tx, ty), tx, ty);
        if (t === T.RUG) {
          const rug = grid.area === 'vet' ? ['#4a8a9a', '#8ac4d0'] : ['#a0383a', '#e8c070'];
          const e = (dx, dy) => get(tx + dx, ty + dy) !== T.RUG;
          px(ox, oy, rug[0], TILE, TILE);
          for (let i = 4; i < TILE; i += 8) px(ox + i, oy + 4, rug[1], 2, TILE - 8);
          if (e(0, -1)) { px(ox, oy, rug[1], TILE, 3); px(ox, oy + 3, '#ffffff', TILE, 1); }
          if (e(0, 1)) { px(ox, oy + TILE - 3, rug[1], TILE, 3); px(ox, oy + TILE - 1, 'rgba(0,0,0,0.2)', TILE, 1); }
          if (e(-1, 0)) px(ox, oy, rug[1], 3, TILE);
          if (e(1, 0)) px(ox + TILE - 3, oy, rug[1], 3, TILE);
        }
      } else {
        grass(ox, oy);
      }

      if (t === T.FLOWER) {
        for (let f = 0, n = rand(2, 3); f < n; f++) {
          const x = ox + rand(4, 27), y = oy + rand(4, 27);
          const [petal, shade] = pick([['#ffffff', '#d8d8e8'], ['#ffd84a', '#d8a820'], ['#ff8fb1', '#d8608a'], ['#b48cff', '#8a60d8']]);
          px(x, y + 2, GROUND.grassDarker, 1, 2);
          px(x - 1, y, petal); px(x + 1, y, shade); px(x, y - 1, petal); px(x, y + 1, shade);
          px(x, y, '#ffb020');
        }
      } else if (t === T.TREE) {
        g.fillStyle = 'rgba(20,50,20,0.35)';
        g.beginPath();
        const size = grid.variants && grid.variants[ty * W + tx] ? grid.variants[ty * W + tx].split('_')[1] : 'm';
        g.ellipse(ox + 16, oy + 27, { s: 24, m: 32, l: 40 }[size], { s: 8, m: 10, l: 12 }[size], 0, 0, Math.PI * 2);
        g.fill();
      } else if (t === T.FENCE) {
        const side = (tx === 0 || tx === W - 1) && ty > 0 && ty < H - 1;
        if (side) {
          for (const x of [10, 19]) { px(ox + x, oy, WOOD.o, 4, TILE); px(ox + x + 1, oy, WOOD.b, 2, TILE); px(ox + x + 1, oy, WOOD.l, 1, TILE); }
          px(ox + 7, oy + 11, WOOD.o, 18, 10); px(ox + 8, oy + 12, WOOD.s, 16, 8); px(ox + 8, oy + 12, WOOD.h, 16, 1); px(ox + 8, oy + 12, WOOD.l, 1, 8);
        } else {
          px(ox, oy + 27, 'rgba(0,0,0,0.15)', TILE, 2);
          for (const y of [10, 19]) { px(ox, oy + y, WOOD.o, TILE, 5); px(ox, oy + y + 1, WOOD.b, TILE, 3); px(ox, oy + y + 1, WOOD.l, TILE, 1); px(ox, oy + y + 5, 'rgba(0,0,0,0.18)', TILE, 1); }
          px(ox + 12, oy + 3, WOOD.o, 8, 26); px(ox + 13, oy + 4, WOOD.s, 6, 24); px(ox + 13, oy + 4, WOOD.l, 1, 24); px(ox + 13, oy + 4, WOOD.h, 6, 1);
          for (const y of [9, 16, 22]) px(ox + 15, oy + y, WOOD.d, 2, 1);
        }
      }
    }
  }

  // Grass spills over onto neighbouring dirt, stone and pond banks in a ragged, overlapping fringe
  const FRINGE_ON = { [T.PATH]: GROUND.dirtShadow, [T.PATIO]: GROUND.stoneDark, [T.WATER]: GROUND.sandDark, [T.DECK]: '#6a4420', [T.SAND]: '#c4a870' };
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      if (!isGrassy(tiles[ty * W + tx]) || tiles[ty * W + tx] === T.FENCE) continue;
      const ox = tx * TILE, oy = ty * TILE;
      for (const [dx, dy] of DIRS) {
        const shadow = FRINGE_ON[get(tx + dx, ty + dy)];
        if (!shadow) continue;
        const p1 = Math.random() * 6, p2 = Math.random() * 6;
        for (let i = 0; i < TILE; i++) {
          const depth = Math.max(1, Math.min(5, Math.round(2.5 + 1.5 * Math.sin(i * 0.7 + p1) + Math.sin(i * 1.9 + p2))));
          for (let k = 0; k <= depth; k++) {
            const colour = k === depth ? shadow : k === depth - 1 ? GROUND.grassDarker : k === 0 ? GROUND.grassDark : GROUND.grass;
            const [x, y] = dx ? [dx > 0 ? ox + TILE + k : ox - 1 - k, oy + i] : [ox + i, dy > 0 ? oy + TILE + k : oy - 1 - k];
            px(x, y, colour);
          }
        }
      }
    }
  }

  // House details: windows with flower boxes, and a back door in the middle
  if (get(1, 2) === T.HOUSE) {
    for (let tx = 3; tx < W - 2; tx += 5) {
      if (Math.abs(tx - W / 2) < 4) continue;
      const ox = tx * TILE + 4, oy = 2 * TILE + 6;
      px(ox - 1, oy - 1, '#8a8070', 26, 28);
      px(ox, oy, '#ffffff', 24, 26);
      px(ox + 2, oy + 2, '#6fa8d8', 20, 22);
      px(ox + 2, oy + 2, '#9ccbee', 20, 6);
      px(ox + 4, oy + 4, '#d4ecfa', 4, 2);
      px(ox + 11, oy + 2, '#ffffff', 2, 22); px(ox + 2, oy + 12, '#ffffff', 20, 2);
      px(ox - 2, oy + 26, WOOD.o, 28, 6); px(ox - 1, oy + 27, WOOD.b, 26, 4); px(ox - 1, oy + 27, WOOD.l, 26, 1);
      for (let f = 0; f < 5; f++) { const fx = ox + 1 + f * 5; px(fx, oy + 24, '#3a9a3c', 3, 3); px(fx + 1, oy + 23, pick(['#ff8fb1', '#ffd84a', '#ffffff']), 1, 1); }
    }
    const dx = (W / 2 - 1) * TILE + 8, dy = 2 * TILE + 2;
    px(dx - 3, dy - 3, '#ffffff', 54, 63);
    px(dx, dy, '#6a3e22', 48, 60);
    px(dx + 2, dy + 2, '#80502e', 20, 56); px(dx + 26, dy + 2, '#80502e', 20, 56);
    px(dx + 2, dy + 2, '#9a6440', 20, 1); px(dx + 26, dy + 2, '#9a6440', 20, 1);
    px(dx + 5, dy + 6, '#9ccbee', 14, 16); px(dx + 29, dy + 6, '#9ccbee', 14, 16);
    px(dx + 21, dy + 32, '#ffd84a', 2, 3); px(dx + 25, dy + 32, '#ffd84a', 2, 3);
  }

  // Raised beds cast a short shadow onto the path in front of them
  for (let ty = 0; ty < H - 1; ty++) for (let tx = 0; tx < W; tx++) {
    if (get(tx, ty) === T.BED && get(tx, ty + 1) !== T.BED) px(tx * TILE, (ty + 1) * TILE, 'rgba(40,24,10,0.28)', TILE, 4);
  }

  drawPuddles(g, grid, tiles);
  return canvas;
}

// Mud, spills and oil as smooth organic puddles: each puddle tile adds a soft blob to a field, and
// pixels above a threshold are wet. Neighbouring tiles merge into one rounded shape, never a "+" of squares.
function drawPuddles(g, grid, baseTiles) {
  const { W, H, tiles } = grid;
  const wet = (x, y) => x >= 0 && y >= 0 && x < W && y < H && (tiles[y * W + x] === T.MUD || tiles[y * W + x] === T.SPILL);
  const S2 = 0.45;
  const jitter = (x, y) => 0.07 * Math.sin(x * 0.23 + y * 0.17) + 0.05 * Math.sin(x * 0.09 - y * 0.21 + 1.7) + 0.03 * Math.sin(x * 0.61 + y * 0.43);
  const field = (px, py) => { // px, py in world pixels
    const tx = Math.floor(px / TILE), ty = Math.floor(py / TILE);
    let f = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!wet(tx + dx, ty + dy)) continue;
      const cx = (tx + dx + 0.5) * TILE, cy = (ty + dy + 0.5) * TILE;
      const d2 = ((px - cx) / TILE) ** 2 + ((py - cy) / TILE) ** 2;
      f += Math.exp(-d2 / S2);
    }
    return f;
  };
  const style = grid.area === 'garage' ? 'oil' : grid.area === 'vet' ? 'mop' : grid.area === 'house' ? 'water' : 'mud';
  const C = {
    mud:   { rim: '#42291a', edge: '#553a24', body: '#6a4a30', deep: '#5c3e27', hi: '#8a6a4c', spec: '#c8bcae' },
    oil:   { rim: '#121018', edge: '#1c1a24', body: '#24222c', deep: '#1a1820', hi: '#3a3650', spec: '#9a8ac0' },
    water: { rim: 'rgba(60,120,190,0.8)', edge: 'rgba(90,150,215,0.7)', body: 'rgba(120,180,230,0.55)', deep: 'rgba(100,165,225,0.6)', hi: 'rgba(200,232,255,0.7)', spec: '#ffffff' },
    mop:   { rim: 'rgba(120,175,205,0.7)', edge: 'rgba(150,200,225,0.6)', body: 'rgba(175,218,238,0.5)', deep: 'rgba(160,208,232,0.55)', hi: 'rgba(230,248,255,0.7)', spec: '#ffffff' },
  }[style];
  const TH = 0.5, NO_PUDDLE = [T.WALL, T.FENCE, T.HOUSE, T.WATER, T.POOL, T.BED, T.FLOWERBED, undefined];
  for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
    if (!wet(tx, ty)) continue;
    for (let y = ty * TILE - 10; y < (ty + 1) * TILE + 10; y++) for (let x = tx * TILE - 10; x < (tx + 1) * TILE + 10; x++) {
      // Each pixel belongs to its own tile's pass (avoid painting twice), but may spill a little past the tile edge
      const ptx = Math.floor(x / TILE), pty = Math.floor(y / TILE), own = ptx === tx && pty === ty;
      if (!own && (wet(ptx, pty) || NO_PUDDLE.includes(baseTiles[pty * W + ptx]))) continue;
      const f = field(x, y) + jitter(x, y);
      if (f < TH) continue;
      let c = C.body;
      if (f < TH + 0.07) c = C.rim;
      else if (f < TH + 0.16) c = field(x - 2, y - 2) + jitter(x - 2, y - 2) < TH ? C.hi : C.edge;
      else if (f > TH + 0.7 && ((x * 3 + y * 5) % 7 === 0)) c = C.deep;
      g.fillStyle = c; g.fillRect(x, y, 1, 1);
    }
    // A glossy reflection streak and, on oil, a rainbow sheen
    const r = seeded(tx * 73 + ty * 151);
    const sx = tx * TILE + 8 + Math.floor(r() * 10), sy = ty * TILE + 9 + Math.floor(r() * 10);
    if (field(sx, sy) > TH + 0.3 && field(sx + 6, sy) > TH + 0.3) {
      g.fillStyle = C.spec; g.fillRect(sx, sy, 5, 1); g.fillRect(sx + 1, sy + 1, 2, 1);
      if (style === 'oil') { for (const [i, col] of ['#7a3a8a', '#3a6a9a', '#3a8a6a', '#9a8a3a'].entries()) { g.fillStyle = col; g.fillRect(sx - 3 + i * 3, sy + 4, 3, 1); } }
    }
    if (style === 'mud' && r() < 0.6) { // a few dark lumps in the mud
      for (let i = 0; i < 4; i++) { const x = tx * TILE + 6 + Math.floor(r() * 20), y = ty * TILE + 6 + Math.floor(r() * 20); if (field(x, y) > TH + 0.25) { g.fillStyle = C.rim; g.fillRect(x, y, 2, 1); } }
    }
  }
}
