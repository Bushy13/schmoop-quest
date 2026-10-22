// World generation: the level cycle, difficulty settings, and a generator for each place.
// Outdoor places (park, veggie garden, pool yard) can also come in a rainy version; indoor places
// (house, garage, vet) have walls, rooms and furniture. Snacks and creatures are only placed on
// tiles the dog can actually reach (checked with a flood fill).

const TILE = 32;
const T = {
  GRASS: 0, PATH: 1, TREE: 2, WATER: 3, BUSH: 4, FENCE: 5, FLOWER: 6, MUD: 7, BED: 8, HOUSE: 9, PATIO: 10,
  DECK: 11, POOL: 12, FLOWERBED: 13, STONE: 14, FLOOR: 15, WALL: 16, TABLE: 17, FURN: 18, SPILL: 19, RUG: 20,
  SAND: 21,
};
const SOLID = [];
for (const t of [T.TREE, T.WATER, T.FENCE, T.BED, T.HOUSE, T.POOL, T.FLOWERBED, T.WALL, T.FURN]) SOLID[t] = true;
const COVER = [T.BUSH, T.TABLE];     // the dog (and snacks) can hide underneath
const SLIPPY = [T.MUD, T.SPILL];      // slows the dog down
const FLOOR_STYLE = { wood: 0, carpet: 1, kitchen: 2, concrete: 3, vet: 4, bath: 5, store: 6 };

const SNACKS = {
  bone:      { sprite: 'bone', points: 10, time: 1.5 },
  sausage:   { sprite: 'sausage', points: 15, time: 1.5 },
  biscuit:   { sprite: 'biscuit', points: 10, time: 1.5 },
  golden:    { sprite: 'goldenBone', points: 50, time: 5, golden: true },
  burger:    { sprite: 'burger', points: 15, time: 1.5 },
  toast:     { sprite: 'toast', points: 10, time: 1.5 },
  drumstick: { sprite: 'drumstick', points: 15, time: 1.5 },
  cookie:    { sprite: 'cookie', points: 10, time: 1.5 },
  kibble:    { sprite: 'kibble', points: 10, time: 1.5 },
  sandwich:  { sprite: 'sandwich', points: 15, time: 1.5 },
  vetTreat:  { sprite: 'vetTreat', points: 10, time: 1.5 },
  // Rare snacks set off zoomies and don't count toward the goal
  cheese:    { sprite: 'cheese', points: 25, time: 0, rare: true },
  pizza:     { sprite: 'pizza', points: 25, time: 0, rare: true },
  // Honey from the beehive is a bonus treat (doesn't count toward the goal) that refills
  honey:     { sprite: 'honey', points: 30, time: 3, bonus: true },
  chew:      { sprite: 'bone', points: 20, time: 2, bonus: true }, // waiting in your dog house
};
// Garden produce grows on plants in the beds and is picked from the bed's edge
const CROPS = ['carrot', 'tomato', 'peas', 'strawberry', 'corn', 'eggplant', 'cucumber'];
const CROP_SNACKS = Object.fromEntries(CROPS.map(c => [c, { sprite: c, points: 10, time: 1.5, grown: true, reach: 30 }]));
const PLACE_SNACKS = {
  park: ['bone', 'sausage', 'biscuit'],
  pool: ['sausage', 'burger', 'bone', 'biscuit'],
  house: ['toast', 'drumstick', 'cookie', 'biscuit'],
  garage: ['kibble', 'sandwich', 'bone', 'biscuit'],
  vet: ['vetTreat', 'biscuit', 'bone', 'kibble'],
  dogpark: ['bone', 'biscuit', 'sausage', 'kibble'],
  beach: ['sausage', 'sandwich', 'burger', 'drumstick'],
  store: ['kibble', 'vetTreat', 'bone', 'cookie', 'biscuit'],
};

// ---- Levels and difficulty ----
// 50 hand-ordered levels, in five sections of ten, so difficulty climbs: every place is met in the
// daytime first, then rain from about level 14 and night from about 16. Outdoors can be sunny, rainy or
// night; indoors can be day or night. Specials are spread through, never two in a row.
// mode: 'menace' (30s of zoomies, smash things, race the other dogs), 'fetch' (the owner throws the
// ball, race the other dog for it) or 'beg' (look cute at people for snacks). remix: a harder "II"
// version of a place with a fresh layout.
const LEVELS = (() => {
  const L = (area, weather = 'clear', extra = {}) => ({ area, weather, ...extra });
  const M = (area, weather) => L(area, weather, { mode: 'menace' }), F = (area, weather) => L(area, weather, { mode: 'fetch' });
  const B = (area, weather, extra) => L(area, weather, { mode: 'beg', ...extra }), R = area => L(area, 'clear', { remix: true });
  return [
    L('park'), L('garden'), L('house'), M('park'), L('pool'), L('dogpark'), F('park'), L('garage'), B('market'), L('beach'),
    L('vet'), M('garden'), L('store'), L('park', 'rain'), F('beach'), L('house', 'night'), B('house', 'clear', { party: true }), L('garden', 'rain'), M('pool'), L('park', 'night'),
    L('pool', 'rain'), F('dogpark'), L('garage', 'night'), M('beach'), L('garden', 'night'), B('market', 'rain'), L('dogpark', 'rain'), M('park', 'rain'), L('vet', 'night'), L('beach', 'night'),
    F('park', 'rain'), R('park'), B('house', 'night', { party: true }), L('pool', 'night'), M('dogpark'), L('beach', 'rain'), R('garden'), F('beach', 'rain'), L('dogpark', 'night'), B('market', 'night'),
    L('store', 'night'), M('pool', 'rain'), R('garage'), F('park', 'night'), R('beach'), B('market', 'clear', { remix: true }), R('dogpark'), R('store'), R('vet'), M('dogpark', 'night'),
  ];
})();
const LEVEL_COUNT = LEVELS.length;
// The 29-level cycle before this (it repeated for ever, busier each time round), kept to move saves across
const LEVEL_CYCLE_V3 = [
  { area: 'park' }, { area: 'garden' }, { area: 'house' }, { area: 'pool' }, { area: 'dogpark' },
  { area: 'park', mode: 'menace' }, { area: 'park', weather: 'rain' }, { area: 'garage' }, { area: 'park', mode: 'fetch' }, { area: 'beach' },
  { area: 'house', weather: 'night' }, { area: 'vet' }, { area: 'market', mode: 'beg' }, { area: 'garden', weather: 'rain' }, { area: 'park', weather: 'night' },
  { area: 'store' }, { area: 'pool', mode: 'menace' }, { area: 'pool', weather: 'rain' }, { area: 'house', mode: 'beg', party: true }, { area: 'garage', weather: 'night' },
  { area: 'garden', weather: 'night' }, { area: 'dogpark', weather: 'rain' }, { area: 'vet', weather: 'night' }, { area: 'beach', weather: 'night' }, { area: 'dogpark', mode: 'menace' },
  { area: 'pool', weather: 'night' }, { area: 'beach', weather: 'rain' }, { area: 'dogpark', weather: 'night' }, { area: 'store', weather: 'night' },
];
function migrateV3Level(old) { // any level of the endless cycle -> the matching one of the 50
  const c = LEVEL_CYCLE_V3[(old - 1) % LEVEL_CYCLE_V3.length];
  return LEVELS.findIndex(e => !e.remix && e.area === c.area && e.weather === (c.weather || 'clear') && (e.mode || null) === (c.mode || null) && !!e.party === !!c.party) + 1;
}
// The 23-level order before the special levels were added (saved progress moves across; and each
// ordinary place keeps the map layout it had then, so the seeds don't shift)
const LEVEL_CYCLE_V2 = [
  ['park', 'clear'], ['garden', 'clear'], ['house', 'clear'], ['pool', 'clear'], ['dogpark', 'clear'], ['park', 'rain'], ['garage', 'clear'], ['beach', 'clear'],
  ['house', 'night'], ['vet', 'clear'], ['garden', 'rain'], ['park', 'night'], ['store', 'clear'], ['pool', 'rain'], ['garage', 'night'], ['garden', 'night'],
  ['dogpark', 'rain'], ['vet', 'night'], ['beach', 'night'], ['pool', 'night'], ['beach', 'rain'], ['dogpark', 'night'], ['store', 'night'],
];
const v3Index = (area, weather) => LEVEL_CYCLE_V3.findIndex(c => !c.mode && c.area === area && (c.weather || 'clear') === weather);
function migrateV2Level(old) { // (to the 29-level cycle)
  const [area, weather] = LEVEL_CYCLE_V2[(old - 1) % LEVEL_CYCLE_V2.length], tier = Math.floor((old - 1) / LEVEL_CYCLE_V2.length);
  return tier * LEVEL_CYCLE_V3.length + v3Index(area, weather) + 1;
}
// The order before the levels were rearranged (used once to move old saved progress across)
const OLD_LEVEL_CYCLE = [
  ['park', 'clear'], ['garden', 'clear'], ['house', 'clear'], ['pool', 'clear'], ['garage', 'clear'], ['park', 'rain'], ['vet', 'clear'],
  ['garden', 'rain'], ['pool', 'rain'], ['dogpark', 'clear'], ['beach', 'clear'], ['store', 'clear'], ['house', 'night'],
];
function migrateOldLevel(old) { // (to the 23-level order; migrateV2Level and migrateV3Level then take it on)
  const [area, weather] = OLD_LEVEL_CYCLE[(old - 1) % OLD_LEVEL_CYCLE.length], tier = Math.floor((old - 1) / OLD_LEVEL_CYCLE.length);
  return tier * LEVEL_CYCLE_V2.length + LEVEL_CYCLE_V2.findIndex(([a, w]) => a === area && w === weather) + 1;
}
const AREA_NAMES = { park: 'PARK', garden: 'VEGGIE GARDEN', pool: 'POOL YARD', house: 'HOUSE', garage: 'GARAGE', vet: 'VET', dogpark: 'DOG PARK', beach: 'BEACH', store: 'PET STORE', market: 'MARKET' };
const OUTDOOR = ['park', 'garden', 'pool', 'dogpark', 'beach', 'market'];
const MODE_NAMES = { menace: 'MENACE RUN', fetch: 'FETCH', beg: 'BEG' };

function levelInfo(level) {
  level = Math.max(1, Math.min(LEVEL_COUNT, level));
  const { area, weather, mode = null, party = false, remix = false } = LEVELS[level - 1];
  const place = `THE ${weather === 'rain' ? 'RAINY ' : ''}${AREA_NAMES[area]}${weather === 'night' ? ' AT NIGHT' : ''}${remix ? ' II' : ''}`;
  const v2 = LEVEL_CYCLE_V2.findIndex(([a, w]) => a === area && w === weather);
  const name = party ? (weather === 'night' ? 'THE PARTY AT NIGHT' : 'THE FAMILY PARTY')
    : mode === 'beg' ? (weather === 'night' ? 'THE NIGHT MARKET' : place)
    : mode ? `${MODE_NAMES[mode]}: ${place}` : place;
  return {
    area, weather, mode, party, remix,
    outdoor: OUTDOOR.includes(area),
    name,
    // the map's seed: ordinary places keep the layouts they had before; remixes and specials get their own
    seed: mode ? 5000 + level : remix ? 9000 + level : v2 + 1,
    n: 1 + Math.round((8 * (level - 1)) / (LEVEL_COUNT - 1)) + (remix ? 1 : 0), // how busy the level is: 1 at the start, 9 by the end
  };
}

const DIFFICULTY = {
  easy:   { name: 'EASY', snacks: 1.4, cats: 0.5, critters: 0.5, catFollow: 0, catSpeed: 1 },
  medium: { name: 'MEDIUM', snacks: 1, cats: 1, critters: 1, catFollow: 4.5, catSpeed: 1 },
  hard:   { name: 'HARD', snacks: 0.7, cats: 2, critters: 1.5, catFollow: 10, catSpeed: 1.2 },
};
const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
const weighted = table => { // { key: weight } → key
  let r = Math.random() * Object.values(table).reduce((a, b) => a + b, 0);
  for (const [k, w] of Object.entries(table)) { r -= w; if (r <= 0) return k; }
  return Object.keys(table)[0];
};

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// Snacks, critters and cats use real randomness, so a level's layout stays the same but every play
// hides things somewhere new
const trueRandom = Math.random;
function unseeded(fn) {
  const seededRandom = Math.random;
  Math.random = trueRandom;
  try { return fn(); } finally { Math.random = seededRandom; }
}

// Each level number always builds the same layout (so the level picker's thumbnails match what you
// play): Math.random is swapped for a seeded generator while the level is generated, except while
// snacks and creatures are placed (see unseeded above).
function generateWorld(level, difficulty = 'medium') {
  const info = levelInfo(level);
  // (the party at night is an evening do: the house lamps stay on and nobody's asleep in bed)
  const evening = info.party && info.weather === 'night';
  const opts = { ...info, diff: DIFFICULTY[difficulty], rain: info.weather === 'rain', night: info.weather === 'night' && !evening };
  const gen = { park: generatePark, garden: generateGarden, pool: generatePool, house: generateHouse, garage: generateGarage, vet: generateVet, dogpark: generateDogPark, beach: generateBeach, store: generateStore, market: generateMarket }[info.area];
  const realRandom = Math.random;
  Math.random = seeded(info.seed * 7919 + 1013);
  try {
    const world = { ...gen(opts), area: info.area, name: info.name, weather: info.weather, outdoor: info.outdoor, difficulty, level, mode: info.mode, party: info.party, remix: info.remix };
    if (opts.night) dressNight(world, opts);
    if (evening) dressEvening(world);
    if (info.mode) dressMode(world, opts);
    return world;
  } finally {
    Math.random = realRandom;
  }
}

// ---- The special levels (Menace Run, Fetch, Beg): a normal map, re-dressed for the mode ----
const MENACE_KINDS = {
  park: ['bin', 'bin', 'wheelieBin', 'cone', 'cone', 'plant', 'plantSmall', 'urn', 'gnome', 'boxes', 'bagPile', 'bucketSpade', 'wateringCan', 'gardenChair'],
  pool: ['plant', 'plantSmall', 'plantBig', 'urn', 'gnome', 'wateringCan', 'bucketSpade', 'gardenChair', 'gardenChair', 'bin', 'wheelieBin', 'boxes', 'cone'],
  dogpark: ['bin', 'bin', 'wheelieBin', 'cone', 'cone', 'cone', 'boxes', 'bagPile', 'bucketSpade', 'plant', 'gnome', 'gardenChair'],
  garden: ['plant', 'plantSmall', 'plantBig', 'urn', 'gnome', 'gnome', 'wateringCan', 'wateringCan', 'birdBath', 'bucketSpade', 'gardenChair', 'wheelieBin', 'bagPile', 'boxes'],
  beach: ['sandcastle', 'sandcastle', 'sandcastle', 'bucketSpade', 'bucketSpade', 'esky', 'bin', 'cone', 'gardenChair', 'boxes', 'wheelieBin'],
};
function dressMode(world, opts) {
  const { W, H, tiles } = world;
  // Nothing to find and nothing to dodge: no snacks, cats, critters or snake
  world.treats = []; world.digs = []; world.smells = []; world.cats = []; world.critters = []; world.hoverers = [];
  world.snake = null; world.sprinklers = []; world.produce = []; world.goal = 0;
  world.stashes = world.stashes.filter(st => st.kind === 'knock').map(st => ({ ...st, type: null }));
  world.pickups = (world.pickups || []).filter(p => p.kind !== 'raincoat'); // in the rain the dog starts in its raincoat
  if (opts.mode === 'beg') return dressBeg(world, opts);
  if (opts.night) world.shade = 'rgba(8,12,40,0.5)'; // a brighter night, so there's something to see at full tilt
  // Walkable open ground, by walking distance from the start
  const sx = Math.floor(world.start.x / TILE), sy = Math.floor((world.start.y - 4) / TILE);
  const dist = new Int16Array(W * H).fill(-1), order = [sy * W + sx];
  dist[order[0]] = 0;
  for (let q = 0; q < order.length; q++) {
    const i = order[q], x = i % W, y = Math.floor(i / W);
    for (const [dx, dy] of DIRS) {
      const j = (y + dy) * W + x + dx;
      if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H && dist[j] === -1 && !SOLID[tiles[j]]) { dist[j] = dist[i] + 1; order.push(j); }
    }
  }
  const ground = [T.GRASS, T.PATH, T.FLOWER, T.DECK, T.SAND, T.PATIO, T.STONE];
  const open = shuffle(order.filter(i => dist[i] >= 3 && ground.includes(tiles[i])));
  if (opts.mode === 'fetch') { world.fetchSpot = { ...world.start }; return; }
  // Menace Run: dozens of things to smash, spread out with a gap round each, and sticks and shoes to shake
  const used = new Set(world.objects.flatMap(o => { const out = []; for (let y = o.ty - 1; y <= o.ty + o.h; y++) for (let x = o.tx - 1; x <= o.tx + o.w; x++) out.push(y * W + x); return out; }));
  // (the dog park has five menaces racing, so it gets lots more)
  const kinds = MENACE_KINDS[opts.area] || MENACE_KINDS.park, want = opts.area === 'dogpark' ? 82 + Math.floor(Math.random() * 14) : 44 + Math.floor(Math.random() * 14);
  let placed = 0;
  for (const i of open) {
    if (placed >= want) break;
    const x = i % W, y = Math.floor(i / W);
    if ([-1, 0, 1].some(dy => [-1, 0, 1].some(dx => used.has((y + dy) * W + x + dx)))) continue;
    const kind = pick(kinds);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) used.add((y + dy) * W + x + dx);
    world.under[i] = tiles[i];
    tiles[i] = T.FURN;
    const o = { kind, tx: x, ty: y, w: 1, h: 1 };
    world.objects.push(o);
    world.stashes.push({ kind: 'knock', obj: o, x: (x + 0.5) * TILE, y: (y + 1) * TILE, type: null, done: false, progress: 0, revealed: 0, phase: Math.random() * 6 });
    placed++;
  }
  const spare = open.filter(i => !used.has(i) && !SOLID[tiles[i]]);
  world.items = spare.slice(0, 8).map((i, k) => ({ kind: k % 3 === 2 ? 'shoe' : 'stick', x: (i % W) * TILE + 16, y: Math.floor(i / W) * TILE + 22, angle: (Math.random() - 0.5) * 0.6 }));
  world.menaceSpots = spare.slice(8, 20).map(i => ({ x: (i % W) * TILE + 16, y: Math.floor(i / W) * TILE + 22 })); // where the rivals start
}

// ---- The market (Beg): a paved square with food trucks along the top, two rows of stalls, and
// picnic tables in between, strung with bunting ----
const BEG_FOODS = {
  truckChips: [['HOT CHIPS', 'chips']], truckTaco: [['TACO', 'taco']], truckIceCream: [['ICE CREAM', 'iceCream']], truckPizza: [['PIZZA', 'pizza']],
  stallSausage: [['SAUSAGE', 'sausage'], ['SAUSAGE SANGA', 'sausage']], stallBakery: [['BREAD ROLL', 'sandwich'], ['COOKIE', 'cookie']],
  stallCheese: [['CHEESE', 'cheese']], stallFish: [['FISH AND CHIPS', 'chips']], stallFruit: [['APPLE', 'cookie']],
  party: [['SAUSAGE ROLL', 'sausage'], ['SANDWICH', 'sandwich'], ['CAKE', 'cake'], ['CHEESE', 'cheese'], ['CHICKEN', 'drumstick'], ['PIZZA', 'pizza'], ['COOKIE', 'cookie']],
};
function generateMarket(opts) {
  const W = 44, H = 30;
  const grid = makeGrid(W, H);
  const { get, set } = grid;
  fillRect(grid, 3, 6, W - 4, H - 4, T.PATIO);
  const add = (kind, x, y, extra) => addObject(grid, kind, x, y, extra);
  // Food trucks parked along the top edge, each with its own food
  ['truckChips', 'truckTaco', 'truckIceCream', 'truckPizza'].forEach((k, i) => add(k, 5 + i * 9, 2));
  // Two rows of stalls with an aisle of picnic tables between them
  const stalls = shuffle(['stallFruit', 'stallSausage', 'stallBakery', 'stallCheese', 'stallFish', 'stallSausage', 'stallBakery', 'stallFruit']);
  for (let i = 0; i < 4; i++) { add(stalls[i], 5 + i * 9, 9); add(stalls[4 + i], 5 + i * 9, 19); }
  for (const [x, y] of [[6, 14], [15, 14], [24, 14], [33, 14], [10, 24], [20, 24], [30, 24]]) add('picnicTable', x, y);
  for (const [k, x, y] of [['bin', 4, 13], ['bin', W - 5, 13], ['bin', 14, 25], ['bench', 36, 24], ['plantBig', 3, 6], ['plantBig', W - 4, 6],
    ['urn', 3, H - 5], ['urn', W - 4, H - 5], ['plant', 40, 17], ['plant', 3, 17]]) if (get(x, y) === T.PATIO || get(x, y) === T.GRASS) add(k, x, y);
  // Shade trees and hedges round the edge
  for (let i = 0; i < 22; i++) {
    const x = pick([1, 2, W - 3, W - 2]), y = rand(1, H - 2);
    if (get(x, y) === T.GRASS) set(x, y, chance(0.4) ? T.TREE : T.BUSH);
  }
  for (let x = 2; x < W - 2; x += 3) if (get(x, H - 2) === T.GRASS && chance(0.6)) set(x, H - 2, T.BUSH);
  const start = { x: W >> 1, y: H - 4 };
  const world = finishWorld(grid, {
    treats: [], digs: [], stashes: [], goal: 10, cats: [], critters: [], hoverers: [], smells: [], items: [], snake: null,
    carriers: [], ducks: [], pickups: [], vacuums: [], vets: [], bushSurprise: null,
    start: { x: start.x * TILE + 16, y: start.y * TILE + 24 },
  }, opts);
  // Bunting strung across the square, pole to pole
  world.bunting = [[3, 6, W - 4, 6], [3, 13, W - 4, 13], [3, 18, W - 4, 18], [3, 23, W - 4, 23]].map(([x0, y, x1]) => ({ x0: x0 * TILE, x1: (x1 + 1) * TILE, y: y * TILE + 4 }));
  return world;
}

// People for the beg levels: shoppers at the market, guests at the family party. Some are generous;
// each holds something to eat. A few sit at the tables with a plate (and might leave it unattended).
function dressBeg(world, opts) {
  const { W, H, tiles } = world;
  const party = opts.party;
  world.goal = 10;
  world.cats = []; world.items = [];
  const sx = Math.floor(world.start.x / TILE), sy = Math.floor((world.start.y - 4) / TILE);
  const seen = new Int16Array(W * H).fill(-1), order = [sy * W + sx];
  seen[order[0]] = 0;
  for (let q = 0; q < order.length; q++) {
    const i = order[q], x = i % W, y = Math.floor(i / W);
    for (const [dx, dy] of DIRS) {
      const j = (y + dy) * W + x + dx;
      if (x + dx >= 0 && x + dx < W && y + dy >= 0 && y + dy < H && seen[j] === -1 && !SOLID[tiles[j]]) { seen[j] = seen[i] + 1; order.push(j); }
    }
  }
  const floorish = party ? [T.FLOOR, T.RUG] : [T.PATIO, T.GRASS, T.PATH];
  const open = order.filter(i => seen[i] >= 3 && floorish.includes(tiles[i]));
  if (party) { // party dressing: a food table, balloons about, the owner hosting
    const spot = open.find(i => { const x = i % W, y = Math.floor(i / W); return [0, 1, 2].every(d => floorish.includes(tiles[i + d])) && floorish.includes(tiles[i + W]) && floorish.includes(tiles[i - W]) && x > 2 && y > 2; });
    if (spot !== undefined) {
      for (let d = 0; d < 3; d++) { world.under[spot + d] = tiles[spot + d]; tiles[spot + d] = T.TABLE; }
      world.objects.push({ kind: 'partyTable', tx: spot % W, ty: Math.floor(spot / W), w: 3, h: 1 });
    }
    for (const i of shuffle(open.slice()).slice(0, 7)) world.objects.push({ kind: 'balloons', tx: i % W, ty: Math.floor(i / W), w: 1, h: 1 });
  }
  // Where people stand: by the stalls and trucks (the market), or about the rooms (the party)
  const foodsNear = (x, y) => {
    if (party) return BEG_FOODS.party;
    let best = null, bd = 1e9;
    for (const o of world.objects) if (BEG_FOODS[o.kind]) { const d = Math.hypot(o.tx + o.w / 2 - x, o.ty + o.h - y); if (d < bd) { bd = d; best = o.kind; } }
    return bd < 6 ? BEG_FOODS[best] : [['SAUSAGE', 'sausage'], ['HOT CHIPS', 'chips'], ['PIZZA', 'pizza'], ['ICE CREAM', 'iceCream'], ['TACO', 'taco']];
  };
  // (fewer shoppers brave the rain; Market II is packed, and stingier)
  const count = party ? 16 + rand(0, 3) : Math.round((21 + rand(0, 5)) * (opts.rain ? 0.8 : 1)) + (opts.remix ? 6 : 0);
  const spots = shuffle(open.slice());
  const looks = shuffle(Object.keys(GUEST_LOOKS));
  world.guests = [];
  // Table sitters first: just below a picnic table (or a dining chair at the party)
  const seats = world.objects.filter(o => o.kind === (party ? 'chair' : 'picnicTable')).map(o => ({ x: (o.tx + o.w / 2) * TILE, y: (o.ty + o.h) * TILE + 22, table: o }));
  for (let k = 0; k < count; k++) {
    const seat = k < Math.min(seats.length, party ? 3 : 5) ? seats[k] : null;
    const i = spots[k % spots.length];
    const x = seat ? seat.x : (i % W) * TILE + 16, y = seat ? seat.y : Math.floor(i / W) * TILE + 24;
    const [foodName, foodSprite] = pick(foodsNear(x / TILE, y / TILE));
    world.guests.push({
      x, y, home: { x, y }, dir: 'down', animT: Math.random() * 4, moving: false, look: looks[k % looks.length], kid: party && chance(0.25),
      food: { name: foodName, sprite: foodSprite }, generous: chance(seat ? 0.5 : party ? 0.7 : opts.remix ? 0.5 : 0.62), umbrella: !!opts.rain && !seat && chance(0.7), begged: null,
      state: seat ? 'sit' : 'wander', seat, waitT: 1 + Math.random() * 4, path: null, plateT: 0,
    });
  }
  // There are always enough generous people to reach the goal (and a few spare)
  for (const g of shuffle(world.guests.filter(q => !q.generous))) { if (world.guests.filter(q => q.generous).length >= world.goal + 3) break; g.generous = true; }
  world.guestSpots = open.filter((i, k) => k % 3 === 0).map(i => ({ tx: i % W, ty: Math.floor(i / W) }));
  if (party) { // the owner, hosting
    const i = spots[count % spots.length];
    world.guests.push({ x: (i % W) * TILE + 16, y: Math.floor(i / W) * TILE + 24, home: null, dir: 'down', animT: 0, moving: false, owner: true,
      food: { name: 'CAKE', sprite: 'cake' }, generous: true, begged: null, state: 'wander', waitT: 2, path: null, plateT: 0 });
  }
}

// ---- Night time: dark, lit by the moon, lamp posts, porch and pool lights. Indoors the lamps are
// off; the house and garage have a noise meter (a full one wakes the owner), and at the vet and the
// pet store noise brings the janitor or the security guard to have a look. ----
const NIGHT_SHADE = { outdoor: 'rgba(8,12,40,0.62)', indoor: 'rgba(4,6,18,0.72)' };
function dressNight(world, opts) {
  const { area } = opts, { W, H, tiles } = world;
  world.night = true;
  world.dark = true;
  if (area === 'house') return; // the house sets up its own night (the owner asleep in bed)
  world.shade = OUTDOOR.includes(area) ? NIGHT_SHADE.outdoor : area === 'store' ? 'rgba(4,6,18,0.85)' : NIGHT_SHADE.indoor; // the store's white floor needs a deeper dark
  world.lights = world.lights.filter(L => !L.lamp);
  const light = (tx, ty, r, colour, extra = {}) => world.lights.push({ x: tx * TILE + 16, y: ty * TILE + 16, r, colour, ...extra });
  const busy = new Set([...world.treats, ...(world.digs || [])].map(o => Math.floor(o.y / TILE) * W + Math.floor(o.x / TILE)));
  const startI = Math.floor((world.start.y - 4) / TILE) * W + Math.floor(world.start.x / TILE);
  if (OUTDOOR.includes(area)) {
    // Moonlight: soft pale-blue pools across the map
    for (let y = 3; y < H; y += 8) for (let x = 4 + (y % 16 ? 5 : 0); x < W; x += 11) light(x, y, 100, '150,175,255');
    // Lamp posts beside the paths (on clear ground, never boxing anything in)
    const open = i => !SOLID[tiles[i]] && !COVER.includes(tiles[i]);
    const roomy = i => [-W - 1, -W, -W + 1, -1, 1, W - 1, W, W + 1].every(o => open(i + o)) && !busy.has(i) && [1, -1, W, -W].every(o => !busy.has(i + o));
    const byPath = i => [1, -1, W, -W].some(o => tiles[i + o] === T.PATH || tiles[i + o] === T.STONE || tiles[i + o] === T.DECK);
    const ground = area === 'beach' ? [T.SAND, T.GRASS] : [T.GRASS, T.FLOWER];
    const spots = [];
    for (let i = W * 2; i < tiles.length - W * 2; i++) {
      const x = i % W;
      if (x < 2 || x > W - 3 || !ground.includes(tiles[i]) || !byPath(i) || !roomy(i) || Math.abs(i - startI) < 3) continue;
      if (spots.every(j => Math.max(Math.abs((j % W) - x), Math.abs(Math.floor(j / W) - Math.floor(i / W))) >= 8)) spots.push(i);
    }
    for (const i of spots.slice(0, 8)) {
      tiles[i] = T.FURN;
      world.objects.push({ kind: 'lampPost', tx: i % W, ty: Math.floor(i / W), w: 1, h: 1 });
      const foot = (Math.floor(i / W) + 1) * TILE;
      world.lights.push({ x: (i % W) * TILE + 16, y: foot - 8, bulbY: foot - 88, r: 96, colour: '255,214,140' });
    }
    if (area === 'pool') for (let i = 0; i < tiles.length; i++) { // the pool lights glow under the water
      if (tiles[i] === T.POOL && (i % W) % 4 === 1 && Math.floor(i / W) % 3 === 1) light(i % W, Math.floor(i / W), 60, '120,220,255');
    }
    if (area === 'market') { // the night market: festoon lights along the bunting, and the stalls and trucks lit up
      world.shade = 'rgba(8,12,40,0.5)';
      for (const b of world.bunting || []) for (let x = b.x0 + 16, k = 0; x < b.x1; x += 64, k++) world.lights.push({ x, y: b.y + 6, r: 70, colour: ['255,214,140', '255,170,200', '170,230,255', '255,236,150'][k % 4] });
      for (const o of world.objects) if (/^(stall|truck)/.test(o.kind)) world.lights.push({ x: (o.tx + o.w / 2) * TILE, y: (o.ty + o.h) * TILE, r: 120, colour: '255,206,140' });
    }
    if (area === 'garden') { // a porch light by the back door and fairy lights over the patio
      for (const x of [10, 24, 38]) light(x, 4, 90, '255,214,140');
      for (let x = 17; x <= 30; x += 3) light(x, 4, 34, x % 2 ? '255,170,200' : '255,236,150');
    }
  } else if (area === 'vet') {
    for (const [x, y] of [[4, 2], [12, 3], [22, 3], [29, 3], [22, 14], [29, 14]]) light(x, y, 70, '150,175,255');
    light(11, 3, 46, '140,220,255'); // the reception computer, left on
    light(8, 11, 40, '120,255,150'); // the exit sign
  } else if (area === 'store') {
    for (const o of world.objects.filter(o => o.kind === 'aquarium')) light(o.tx + 0.5, o.ty + 1, 64, '90,190,255');
    light(18, 21, 44, '120,255,150'); // the exit sign over the door
    for (const [x, y] of [[3, 17], [32, 17]]) light(x, y, 44, '120,130,190'); // dim security lights by the front
  }
  // Who's listening: the owner (house and garage), or the janitor / guard (vet and store)
  if (area === 'garage') world.hush = 'owner';
  if (area === 'vet' || area === 'store') world.hush = 'patrol';
  if (world.hush) world.noise = 0;
  if (area === 'vet') { // the janitor mops the floors, leaving them wet behind him
    const { dist, order } = floodFill({ W, tiles }, Math.floor(world.start.x / TILE), Math.floor((world.start.y - 4) / TILE));
    const floor = order.filter(i => tiles[i] === T.FLOOR && dist[i] >= 3);
    world.staffPoints = shuffle(floor.filter(i => (i % W) % 3 === 0 && Math.floor(i / W) % 3 === 0)).slice(0, 14).map(i => ({ tx: i % W, ty: Math.floor(i / W) }));
    const far = floor.filter(i => dist[i] >= 10);
    const spot = pick(far.length ? far : floor);
    world.staff = [{ x: (spot % W) * TILE + 16, y: Math.floor(spot / W) * TILE + 24, dir: 'down', animT: 0, moving: false, look: 'janitor', role: 'janitor',
      state: 'patrol', path: null, waitT: 1, seenT: 0, chaseT: 0, mopT: 0 }];
    world.wetSpots = [];
  }
  if (area === 'store') for (const st of world.staff) { // each guard's torch is a light that moves with them
    st.torch = { x: st.x, y: st.y, r: 84, colour: '255,240,190' };
    world.lights.push(st.torch);
  }
}

// The party at night: dusk-blue windows, every lamp on, warm pools of light through the rooms
function dressEvening(world) {
  const { W, H, tiles } = world;
  world.dark = true; world.evening = true;
  world.shade = 'rgba(14,12,44,0.42)';
  for (let y = 3; y < H - 1; y += 5) for (let x = 3 + (y % 10 ? 3 : 0); x < W - 1; x += 7) {
    const i = y * W + x;
    if (!SOLID[tiles[i]]) world.lights.push({ x: x * TILE + 16, y: y * TILE + 16, r: 130, colour: '255,206,140' });
  }
}

// ---- Shared helpers ----

function makeGrid(W, H, border = T.FENCE, fill = T.GRASS) {
  const tiles = new Uint8Array(W * H).fill(fill);
  const inside = (x, y) => x > 0 && y > 0 && x < W - 1 && y < H - 1;
  const get = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? border : tiles[y * W + x];
  const set = (x, y, v) => { if (inside(x, y)) tiles[y * W + x] = v; };
  for (let x = 0; x < W; x++) { tiles[x] = border; tiles[(H - 1) * W + x] = border; }
  for (let y = 0; y < H; y++) { tiles[y * W] = border; tiles[y * W + W - 1] = border; }
  // `under` remembers the ground beneath furniture, mud and spills (255 = nothing recorded)
  return { W, H, tiles, inside, get, set, variants: new Array(W * H).fill(null), objects: [], under: new Uint8Array(W * H).fill(255) };
}

// Fills a rough ellipse with `tile`, only over the tile types listed in `over`
function blob(grid, cx, cy, rx, ry, tile, over) {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 + Math.random() * 0.4 && over.includes(grid.get(x, y)) && grid.inside(x, y)) {
        if (grid.under[y * grid.W + x] === 255) grid.under[y * grid.W + x] = grid.get(x, y);
        grid.set(x, y, tile);
      }
    }
  }
}

function fillRect(grid, x0, y0, x1, y1, tile) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid.set(x, y, tile);
}

// Places a piece of furniture: marks its footprint (solid, or walk-under cover for tables)
// Decor (rugs, hoses, things lying on the ground) marks no tiles; arches only block their two posts.
function addObject(grid, kind, tx, ty, extra = {}) {
  const f = FURNITURE[kind];
  if (!f.decor) {
    for (let y = ty; y < ty + f.h; y++) for (let x = tx; x < tx + f.w; x++) {
      if (f.posts && x !== tx && x !== tx + f.w - 1) continue;
      if (grid.inside(x, y) && grid.under[y * grid.W + x] === 255) grid.under[y * grid.W + x] = grid.get(x, y);
      grid.set(x, y, f.cover ? T.TABLE : T.FURN);
    }
  }
  const obj = { kind, tx, ty, w: f.w, h: f.h, ...extra };
  grid.objects.push(obj);
  return obj;
}
// Places an object only if its whole footprint (plus an optional margin) is on the allowed tiles
function tryObject(grid, kind, tx, ty, allowed, margin = 0, extra = {}) {
  const f = FURNITURE[kind];
  for (let y = ty - margin; y < ty + f.h + margin; y++) for (let x = tx - margin; x < tx + f.w + margin; x++) {
    if (!grid.inside(x, y) || !allowed.includes(grid.get(x, y))) return null;
  }
  if (grid.objects.some(o => tx < o.tx + o.w + margin && tx + f.w + margin > o.tx && ty < o.ty + o.h + margin && ty + f.h + margin > o.ty)) return null;
  return addObject(grid, kind, tx, ty, extra);
}
// Scatters `count` of the kinds in a rectangle, wherever they fit
function scatterObjects(grid, kinds, count, x0, y0, x1, y1, allowed, margin = 1) {
  let placed = 0;
  for (let tries = 0; placed < count && tries < count * 40; tries++) {
    if (tryObject(grid, pick(kinds), rand(x0, x1), rand(y0, y1), allowed, margin)) placed++;
  }
  return placed;
}

// Walking distance (in tiles) from the start to every reachable tile, plus the tiles in visit order
function floodFill(grid, sx, sy) {
  const { W, tiles } = grid;
  const dist = new Int16Array(tiles.length).fill(-1);
  const order = [sy * W + sx];
  dist[order[0]] = 0;
  for (let qi = 0; qi < order.length; qi++) {
    const i = order[qi], x = i % W, y = Math.floor(i / W);
    for (const [dx, dy] of DIRS) {
      const j = (y + dy) * W + x + dx;
      if (dist[j] === -1 && !SOLID[tiles[j]]) { dist[j] = dist[i] + 1; order.push(j); }
    }
  }
  return { dist, order };
}

// Picks tiles from shuffled pools while keeping everything a few tiles apart
function makePicker(W) {
  const chosen = [];
  const spaced = (i, gap) => chosen.every(c =>
    Math.max(Math.abs(c % W - i % W), Math.abs(Math.floor(c / W) - Math.floor(i / W))) > gap);
  return {
    take(pool, n, gap = 2) {
      const out = [];
      for (const i of pool) {
        if (out.length >= n) break;
        if (spaced(i, gap)) { chosen.push(i); out.push(i); }
      }
      return out;
    },
  };
}

const tileCentre = (grid, i, dy = 18) => ({ x: (i % grid.W) * TILE + 16, y: Math.floor(i / grid.W) * TILE + dy });
const snackAt = (grid, i, type) => ({
  ...tileCentre(grid, i), type,
  hidden: COVER.includes(grid.tiles[i]),
  collected: false, revealed: 0, phase: Math.random() * Math.PI * 2,
});

// Chooses a style and size for every tree and bush, with a mix per place
function assignVariants(grid, area) {
  const treeMix = {
    park: { oak: 4, birch: 2, pine: 3 },
    garden: { apple: 3, blossom: 2, oak: 1 },
    pool: { blossom: 3, birch: 2, oak: 1 },
    dogpark: { oak: 3, birch: 2, pine: 1 },
    beach: { pine: 1 }, // tall Norfolk pines along the dunes
    market: { blossom: 2, oak: 2 },
  }[area];
  const bushMix = {
    park: { leafy: 3, berry: 2, fern: 2, flower: 1 },
    garden: { flower: 2, berry: 2, hedge: 1, leafy: 1 },
    pool: { flower: 3, hedge: 2, leafy: 1 },
    dogpark: { leafy: 3, flower: 1, fern: 1 },
    beach: { dune: 1 },
    market: { hedge: 2, flower: 1 },
  }[area];
  const nearWater = i => { const x = i % grid.W, y = Math.floor(i / grid.W); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (grid.get(x + dx, y + dy) === T.WATER) return true; return false; };
  for (let i = 0; i < grid.tiles.length; i++) {
    const t = grid.tiles[i];
    if (t === T.TREE) {
      const style = area === 'park' && nearWater(i) && chance(0.6) ? 'willow' : weighted(treeMix);
      const size = (grid.treeSize && grid.treeSize[i]) || weighted({ s: 5, m: 4, l: 1 });
      grid.variants[i] = `${style}_${size}_${rand(0, 1)}`;
    } else if (t === T.BUSH) {
      grid.variants[i] = `${weighted(bushMix)}_${weighted({ s: 3, m: 5, l: 2 })}_${rand(0, 1)}`;
    }
  }
}

// ---- Finding snacks: how many a place gets, and the ways they're hidden ----
// The count grows with how much of the map you can walk on (indoors is denser), and each place
// mixes the methods: on the ground, in cover, trails (3-4 in a row, good for combos), buried
// (stop on a mound and dig), knock-over (run into bins and boxes), rummage (stand still beside the
// sofa, toy box...) and up on tables (walk up beside them).
const KNOCK_KINDS = ['bin', 'boxes', 'boxesWide', 'bagPile', 'paintTins', 'plant', 'plantBig', 'plantSmall', 'urn', 'gnome', 'wateringCan',
  'birdBath', 'bucketSpade', 'sandcastle', 'coatRack', 'floorLamp', 'statue', 'cone', 'wheelieBin', 'gardenChair']; // the statue only goes over with zoomies
const RUMMAGE_KINDS = ['sofa', 'armchair', 'dogBed', 'toyBox', 'shoeRack', 'petBedDisplay', 'hosePile', 'hoseReel', 'toolbox', 'magazineRack',
  'dogHouse', 'wheelbarrow', 'towel', 'wardrobe', 'dresser', 'fridge', 'garageFridge'];
const EITHER_KINDS = ['laundryBasket', 'esky']; // knocked over or rummaged through, decided per one
const REACH_KINDS = ['bbq'];                     // up on the hind legs to have a go at the grill
const NO_SNACK_KINDS = ['fridge', 'garageFridge', 'statue']; // nice try
const TOP_KINDS = { coffeeTable: 20, sideTable: 34, bedside: 34, diningTable: 40, island: 40, checkout: 42, desk: 44, outdoorTable: 42, examTable: 34, workbench: 44 }; // px up to the table top
const FIND_MIX = {
  park:    { density: 75, dig: 0.25, cover: 0.25, trails: 1 },
  garden:  { density: 75, dig: 0.2, cover: 0.1, trails: 1, produce: 0.5 },
  pool:    { density: 75, dig: 0.2, cover: 0.2, trails: 1, top: 1, stash: 1 },
  dogpark: { density: 75, dig: 0.25, cover: 0.2, trails: 1, stash: 1 },
  beach:   { density: 75, dig: 0.6, trails: 1, stash: 1 },
  house:   { density: 55, cover: 0.12, trails: 1, top: 3, stash: 5 },
  garage:  { density: 55, cover: 0.1, trails: 1, top: 1, stash: 6 },
  vet:     { density: 55, cover: 0.12, trails: 1, top: 3, stash: 3 },
  store:   { density: 55, cover: 0.08, trails: 2, top: 1, stash: 4 },
};

// Places every snack for a level. Returns the treats (including table-top ones), buried digs,
// stashes (knock-over and rummage spots), the goal, and how many of the goal are garden produce.
function snackMix(grid, opts, picker, { order, dist, open, cover = [], digGround = [], kinds, golden = null, rare = 1 }) {
  return unseeded(() => {
    const mix = FIND_MIX[opts.area], W = grid.W, tiles = grid.tiles;
    const reach = new Set(order.filter(i => dist[i] >= 2 && !SOLID[tiles[i]] && !SLIPPY.includes(tiles[i])));
    const total = Math.max(6, Math.round(Math.min(30, order.length / mix.density + 2 * opts.n) * opts.diff.snacks));
    const produce = Math.round(total * (mix.produce || 0));
    let left = total - produce;
    const treats = [], regular = () => SNACKS[pick(kinds)];
    open = shuffle([...open]); cover = shuffle([...cover]);
    if (golden) picker.take(shuffle([...golden]), 1).forEach(i => { treats.push(snackAt(grid, i, SNACKS.golden)); left--; });

    // Up on tables: the snack sits on the top, collected from the floor in front
    for (const o of shuffle(grid.objects.filter(o => TOP_KINDS[o.kind] !== undefined))) {
      if (treats.filter(tr => tr.lift).length >= Math.min(mix.top || 0, left)) break;
      const fx = o.tx + Math.floor(o.w / 2), i = (o.ty + o.h) * W + fx;
      if (!reach.has(i) || !picker.take([i], 1, 1).length) continue;
      treats.push({ x: (o.tx + o.w / 2) * TILE + (o.w % 2 ? 0 : (Math.random() < 0.5 ? -8 : 8)), y: (o.ty + o.h) * TILE + 2, type: regular(), lift: TOP_KINDS[o.kind], reach: 30, hidden: false, collected: false, revealed: 0, phase: Math.random() * 6 });
      left--;
    }

    // Stashes: every bin, box pile, sofa... can be knocked over or rummaged; some hide a snack
    const besideTile = o => { // a reachable floor tile next to the object (front first)
      const ring = [];
      for (let x = o.tx; x < o.tx + o.w; x++) ring.push([x, o.ty + o.h], [x, o.ty - 1]);
      for (let y = o.ty; y < o.ty + o.h; y++) ring.push([o.tx - 1, y], [o.tx + o.w, y]);
      return ring.map(([x, y]) => y * W + x).find(i => reach.has(i));
    };
    const stashes = [];
    for (const o of grid.objects) {
      const knock = KNOCK_KINDS.includes(o.kind), rummage = RUMMAGE_KINDS.includes(o.kind), either = EITHER_KINDS.includes(o.kind), reach = REACH_KINDS.includes(o.kind);
      if (!knock && !rummage && !either && !reach) continue;
      if (besideTile(o) === undefined) continue;
      stashes.push({ kind: reach ? 'reach' : knock || (either && chance(0.5)) ? 'knock' : 'rummage', obj: o, x: (o.tx + o.w / 2) * TILE, y: (o.ty + o.h) * TILE, type: null, done: false, progress: 0, revealed: 0, phase: Math.random() * 6 });
    }
    // Hide snacks in some of them, mixing knock-overs and rummages
    const canHold = st => !NO_SNACK_KINDS.includes(st.obj.kind) && st.obj.kind !== 'dogHouse';
    const byKind = [shuffle(stashes.filter(st => st.kind === 'knock' && canHold(st))), shuffle(stashes.filter(st => st.kind !== 'knock' && canHold(st)))];
    for (let k = 0, want = Math.min(mix.stash || 0, left, stashes.length); k < want; ) {
      const list = byKind[k % 2].length ? byKind[k % 2] : byKind[(k + 1) % 2];
      list.shift().type = regular();
      k++; left--;
    }

    // Your own dog house always has a chew in it (a bonus, not part of the goal)
    for (const st of stashes) if (st.obj.kind === 'dogHouse') st.type = SNACKS.chew;

    // Trails: a dropped bag's worth in a short line (eat them in a row for a combo)
    const openSet = new Set(open);
    const steps = [[1, 0], [0, 1], [1, 1], [1, -1], [-1, 0], [0, -1]];
    for (let k = 0, n = (mix.trails || 0) + (total >= 22 ? 1 : 0); k < n && left >= 3; k++) {
      const len = Math.min(left, rand(3, 4)), type = regular();
      let placed = null;
      for (const s0 of open) {
        if (!openSet.has(s0)) continue;
        for (const [dx, dy] of shuffle([...steps])) {
          const line = [];
          for (let j = 0; j < len; j++) {
            const x = (s0 % W) + dx * j, y = Math.floor(s0 / W) + dy * j, i = y * W + x;
            if (x < 1 || x >= W - 1 || !openSet.has(i)) break;
            line.push(i);
          }
          if (line.length === len && picker.take([line[0]], 1, 2).length) { placed = line; break; }
        }
        if (placed) break;
      }
      if (!placed) break;
      placed.forEach((i, j) => {
        if (j) picker.take([i], 1, 0);
        openSet.delete(i);
        const sn = snackAt(grid, i, type);
        sn.x += Math.round((Math.random() - 0.5) * 8); sn.y += Math.round((Math.random() - 0.5) * 6);
        sn.trail = true;
        treats.push(sn);
      });
      left -= len;
    }

    // Buried: mounds to dig (some empty)
    const buried = Math.min(left, Math.round(total * (mix.dig || 0)));
    const empties = buried ? Math.max(2, Math.round(buried * 0.35)) : 0;
    const underCanopy = i => [W, 2 * W, W - 1, W + 1].some(o => tiles[i + o] === T.TREE);
    const digs = picker.take(shuffle(digGround.filter(i => !underCanopy(i))), buried + empties, 2).map((i, k) => ({
      ...tileCentre(grid, i, 20), type: k < buried ? regular() : null, ground: tiles[i] === T.SAND ? 'sand' : 'soil',
      dug: false, progress: 0, revealed: 0, phase: Math.random() * 6,
    }));
    left -= digs.filter(d => d.type).length;

    // In cover, then the rest on the ground (and whatever didn't fit elsewhere)
    picker.take(cover, Math.min(left, Math.round(total * (mix.cover || 0)))).forEach(i => { treats.push(snackAt(grid, i, regular())); left--; });
    picker.take(open, left).forEach(i => { treats.push(snackAt(grid, i, regular())); left--; });
    if (left > 0) picker.take(cover, left).forEach(i => { treats.push(snackAt(grid, i, regular())); left--; });

    const goal = treats.length + digs.filter(d => d.type).length + stashes.filter(st => st.type && !st.type.bonus).length + produce;
    picker.take(open, rare).forEach(i => treats.push(snackAt(grid, i, pick([SNACKS.cheese, SNACKS.pizza]))));
    return { treats, digs, stashes, goal, produce };
  });
}

// Hazards, distractions and pickups shared by all places
function placeCreatures(...args) { return unseeded(() => placeCreaturesNow(...args)); }
function placeCreaturesNow(grid, opts, dist, order, picker) {
  const { W, tiles } = grid, { diff, rain, n, area } = opts;
  const indoor = !OUTDOOR.includes(area);
  // Round down a little so halving one cat (Easy, or rain) really means none
  const scale = (base, mult, cap = 8) => Math.min(cap, Math.max(0, Math.floor(base * mult + 0.25)));
  const walkable = i => !SOLID[tiles[i]] && !COVER.includes(tiles[i]) && !SLIPPY.includes(tiles[i]);
  const open = shuffle(order.filter(i => dist[i] >= 6 && walkable(i)));
  const far = open.filter(i => dist[i] >= 10);
  const nearWater = open.filter(i => [1, -1, W, -W].some(o => tiles[i + o] === T.WATER || tiles[i + o] === T.POOL));
  const byWall = open.filter(i => [1, -1, W, -W].some(o => tiles[i + o] === T.WALL));
  const dry = open.filter(i => [T.PATH, T.PATIO, T.DECK, T.STONE].includes(tiles[i]));
  const feet = i => tileCentre(grid, i, 22);

  // Cats: fewer in the rain. Indoors there's a household cat or two, sometimes fast asleep.
  // No cats at the dog park or the beach; the pet store has one sleepy shop cat; at night every
  // cat in the house is asleep (and there are more of them)
  const indoorNight = opts.night && indoor;
  const catBase = ['dogpark', 'beach'].includes(area) ? 0 : indoorNight ? (area === 'house' ? 2 + (n > 4 ? 1 : 0) : 1)
    : indoor ? (area === 'vet' ? 0 : area === 'house' ? 1 + (n > 2 ? 1 : 0) : 1) : Math.min(4, 1 + Math.floor(n / 2));
  const cats = picker.take(far.length ? far : open, indoorNight ? catBase : scale(catBase, diff.cats * (rain ? 0.5 : 1), 6), 3).map(i => ({
    ...feet(i), dir: 'down', vx: 0, vy: 0, t: 0, animT: 0, cooldown: 0, flee: 0, swipeT: 0, moving: false,
    asleep: indoorNight || area === 'store' || (indoor && chance(0.5)),
  }));

  const critter = kind => i => { const p = feet(i); return { kind, ...p, home: { ...p }, state: 'idle', t: 0, animT: Math.random() * 3, facing: chance(0.5) ? -1 : 1, hop: 0, wanderT: Math.random() * 2 }; };
  const critters = [];
  const cm = diff.critters;
  if (area === 'beach') {
    // Crabs scuttle about near the rock pools and the water's edge
    const shore = open.filter(i => [1, -1, W, -W, 2 * W].some(o => tiles[i + o] === T.WATER));
    critters.push(...picker.take(shore.length ? shore : open, scale(4 + (n > 4 ? 1 : 0) + (opts.night ? 3 : 0), cm), 3).map(critter('crab'))); // more come out at night
  } else if (!indoor) {
    const frogs = scale((area === 'dogpark' ? 1 : 2) + (n > 3 ? 1 : 0) + (rain || opts.night ? 2 : 0), cm); // frogs love the rain and the night
    critters.push(...picker.take(nearWater.length ? nearWater : open, frogs, 3).map(critter('frog')));
    if (!rain && !opts.night) critters.push(...picker.take(dry.length ? dry : open, scale(2 + (n > 2 ? 1 : 0), cm), 3).map(critter('lizard'))); // lizards sleep at night
    if (area === 'dogpark') { // balls lying about to pounce on
      critters.push(...picker.take(open, scale(3, cm, 4), 3).map(i => ({ ...critter('toy')(i), toy: pick(['toyBall', 'toyBall', 'toyRope']) })));
    }
  } else {
    critters.push(...picker.take(byWall.length ? byWall : open, scale(area === 'vet' ? 1 : 2, cm), 3).map(critter('mouse')));
    critters.push(...picker.take(open, scale(area === 'garage' ? 2 : 1, cm), 3).map(critter('beetle')));
    const toyKinds = shuffle(['toyBall', 'toyRope', 'toyChicken', 'toyPlush']);
    critters.push(...picker.take(open, scale(area === 'house' || area === 'store' ? 3 : 1, cm, 4), 3).map((i, k) => ({ ...critter('toy')(i), toy: toyKinds[k % 4] })));
    for (const o of grid.objects.filter(o => o.kind === 'tvUnit' && !opts.night)) { // the TV is off at night
      critters.push({ kind: 'tv', x: (o.tx + o.w / 2) * TILE, y: (o.ty + o.h + 1) * TILE + 12, state: 'idle', t: 0, animT: 0, facing: 1, hop: 0, obj: o });
    }
  }

  const extra = {};
  // Robot vacuum (house and vet) and the vet herself, plus pets waiting in carriers
  extra.vacuums = ['house', 'vet'].includes(area) && !opts.night ? picker.take(open, 1, 3).map(i => ({ ...feet(i), vx: 1, vy: 0.6, cooldown: 0 })) : [];
  extra.vets = area === 'vet' && !opts.night ? picker.take(far.length ? far : open, 1, 3).map(i => ({ ...feet(i), dir: 'down', animT: 0, cooldown: 0, t: 0, vx: 0, vy: 0, moving: false })) : [];
  extra.carriers = grid.objects.filter(o => o.kind === 'carrier').map(o => ({ x: o.tx * TILE + 16, y: o.ty * TILE + 30, pet: o.pet, t: Math.random() * 4, shake: 0 }));

  // The snake: rarest hazard, only outdoors and only on about 1 in 6 levels
  extra.snake = null;
  if (!indoor && area !== 'beach' && chance(1 / 6)) {
    const spot = picker.take(shuffle(order.filter(i => dist[i] >= 12 && tiles[i] === T.GRASS)), 1, 3)[0];
    if (spot !== undefined) extra.snake = { ...feet(spot), state: 'idle', t: 0 };
  }

  // Rain: a raincoat lies somewhere far away; finding it brings the dog back to full speed
  extra.pickups = [];
  if (rain) {
    const spot = picker.take(far.length ? far : open, 1, 2)[0];
    if (spot !== undefined) extra.pickups.push({ kind: 'raincoat', ...tileCentre(grid, spot), phase: 0 });
  }

  // Some bushes hide a moth or a bird that bursts out when the dog pushes in
  extra.bushSurprise = new Map();
  extra.hoverers = [];
  if (!indoor) {
    for (let i = 0; i < tiles.length; i++) {
      if (tiles[i] === T.BUSH && dist[i] >= 0 && chance(0.07 * Math.min(1.5, cm + 0.2))) extra.bushSurprise.set(i, opts.night ? 'moth' : 'bird'); // birds roost at night
    }
    // Moths and butterflies flutter around some bushes and flowers (moths more in the rain)
    const spots = shuffle(order.filter(i => dist[i] >= 6 && (tiles[i] === T.BUSH || tiles[i] === T.FLOWER || tiles[i] === T.FLOWERBED)));
    const n = scale(rain ? 3 : opts.night ? 7 : 5, cm, 9);
    for (const i of picker.take(spots, n, 4)) {
      // At night there are no butterflies: moths, and fireflies glowing in the dark
      const kind = opts.night ? (chance(0.6) ? 'firefly' : 'moth') : chance(rain ? 0.75 : 0.3) ? 'moth' : pick(['monarch', 'blue', 'yellow', 'white']);
      const c = tileCentre(grid, i, 14);
      extra.hoverers.push({ kind: kind === 'moth' || kind === 'firefly' ? 'moth' : 'butterfly', colour: kind, cx: c.x, cy: c.y, x: c.x, y: c.y, t: Math.random() * 6, alt: 18 });
    }
  }
  // Smells: bonus spots to find (a sniff shows them) and roll in, belly up
  const SMELLS = {
    park: ['FOX POO', 'A DEAD LEAF PILE', 'POSSUM WEE'], dogpark: ["ANOTHER DOG'S WEE", 'AN OLD TENNIS BALL', 'FOX POO'],
    garden: ['THE COMPOST', 'FERTILISER', 'A ROTTEN TOMATO'], pool: ['A BBQ RAG', 'OLD SAUSAGE FAT', 'A WET TOWEL'],
    beach: ['A DEAD FISH', 'SMELLY SEAWEED', 'A CRAB SHELL'], house: ['DIRTY LAUNDRY', 'BIN JUICE', 'AN OLD SOCK'],
    garage: ['AN OILY RAG', 'AN OLD GUMBOOT', 'MOULDY GRASS'], vet: ['A CAT SMELL', 'THE MOP BUCKET'], store: ['SPILLED FISH FOOD', 'A CATNIP TOY'],
  };
  const smellCount = Math.min(3, 1 + (n > 2 ? 1 : 0) + (chance(0.4) ? 1 : 0));
  extra.smells = picker.take(far.length ? far : open, smellCount, 4).map(i => ({ ...feet(i), label: pick(SMELLS[area]), found: false, revealed: 0, phase: Math.random() * 6 }));
  // Sticks lying about outdoors (pick one up and carry it to the owner)
  extra.items = [];
  if (!indoor) {
    const nearTree = open.filter(i => [-2, -1, 1, 2].some(o => tiles[i + o] === T.TREE || tiles[i + o * W] === T.TREE));
    extra.items = picker.take(nearTree.length ? nearTree : open, 2 + (chance(0.5) ? 1 : 0) + (n > 3 ? 1 : 0), 3).map(i => ({ kind: 'stick', ...tileCentre(grid, i, 22), angle: (Math.random() - 0.5) * 0.6 }));
  }
  // Ducks waddle in when it rains (run at them!)
  extra.ducks = [];
  if (rain && !indoor) {
    const wet = open.filter(i => [1, -1, W, -W, 2, -2].some(o => tiles[i + o] === T.WATER || tiles[i + o] === T.MUD));
    const spot = picker.take(wet.length ? wet : far.length ? far : open, 1, 3)[0];
    if (spot !== undefined) {
      const p = feet(spot), size = rand(2, 4);
      extra.ducks = Array.from({ length: size }, (_, k) => ({ x: p.x - k * 16, y: p.y, chick: k > 0, dir: 'right', step: Math.random() }));
    }
  }
  return { cats, critters, ...extra };
}

// Sprinkler heads on open lawn/paths, spaced well apart (garden and pool yard, not in the rain)
function placeSprinklers(grid, order, dist, picker, count) {
  const lawn = shuffle(order.filter(i => dist[i] >= 3 && [T.GRASS, T.PATH, T.FLOWER].includes(grid.tiles[i])));
  return picker.take(lawn, count, 5).map(i => ({ ...tileCentre(grid, i, 18), on: false }));
}

// Lamps and fridges carry a `light` (a warm pool on the floor and a glow at the bulb)
function objectLights(grid) {
  if (grid.night) return [];
  return grid.objects.filter(o => FURNITURE[o.kind].light).map(o => {
    const L = FURNITURE[o.kind].light, x = (o.tx + o.w / 2) * TILE, foot = (o.ty + o.h) * TILE;
    return { x, y: foot - 6, bulbY: foot + L.dy, r: L.r, colour: L.colour, flicker: false, lamp: true };
  });
}

function finishWorld(grid, props, opts) {
  const plants = props.plants || [];
  grid.area = opts.area;
  if (OUTDOOR.includes(opts.area)) assignVariants(grid, opts.area);
  const sprinklers = props.sprinklers || [];
  return {
    found: 0, poops: [], plants, sprinklers, sprinklerT: 30, hive: null, doors: [],
    ...props,
    W: grid.W, H: grid.H, tiles: grid.tiles, get: grid.get, floor: grid.floor || null, under: grid.under,
    variants: grid.variants, objects: grid.objects,
    lights: [...(props.lights || []), ...objectLights(grid)],
    pxW: grid.W * TILE, pxH: grid.H * TILE,
    ground: renderGround(grid),
  };
}

// ---- The park ----

function generatePark(opts) {
  const { n, rain, diff } = opts;
  const W = 48, H = 32;
  const grid = makeGrid(W, H);
  const { tiles, inside, get, set } = grid;
  const start = { x: W >> 1, y: H >> 1 };
  const nearStart = (x, y, r) => Math.abs(x - start.x) <= r && Math.abs(y - start.y) <= r;

  for (let p = 0; p < 4; p++) { // winding dirt paths
    let x = rand(2, W - 3), y = rand(2, H - 3), [dx, dy] = pick(DIRS);
    for (let i = 0; i < 80; i++) {
      set(x, y, T.PATH);
      if (chance(0.12)) [dx, dy] = pick(DIRS);
      x = Math.min(W - 2, Math.max(1, x + dx));
      y = Math.min(H - 2, Math.max(1, y + dy));
    }
  }
  const ponds = 2 + Math.min(2, Math.floor(n / 2));
  for (let placed = 0, tries = 0; placed < ponds && tries < 50; tries++) {
    const cx = rand(5, W - 6), cy = rand(5, H - 6);
    if (nearStart(cx, cy, 7)) continue;
    blob(grid, cx, cy, rand(2, 4), rand(1, 3), T.WATER, [T.GRASS, T.PATH]);
    placed++;
  }
  for (let c = 0; c < 11 + n * 2; c++) { // clumps of trees (the trees are big, so fewer of them)
    const cx = rand(1, W - 2), cy = rand(1, H - 2), k = rand(1, 3);
    for (let i = 0; i < k; i++) {
      const x = cx + rand(-2, 2), y = cy + rand(-2, 2);
      if (inside(x, y) && get(x, y) === T.GRASS && !nearStart(x, y, 2)) set(x, y, T.TREE);
    }
  }
  for (let i = 0; i < 50; i++) {
    const x = rand(1, W - 2), y = rand(1, H - 2);
    if (get(x, y) === T.GRASS && !nearStart(x, y, 2)) set(x, y, T.BUSH);
  }
  for (let i = 0; i < 90; i++) {
    const x = rand(1, W - 2), y = rand(1, H - 2);
    if (get(x, y) === T.GRASS && !nearStart(x, y, 1)) set(x, y, T.FLOWER);
  }
  const mud = Math.round((3 + n) * (rain ? 2.5 : 1));
  for (let m = 0; m < mud; m++) {
    const cx = rand(3, W - 4), cy = rand(3, H - 4);
    if (!nearStart(cx, cy, 4)) blob(grid, cx, cy, rand(1, rain ? 3 : 2), rand(1, rain ? 2 : 1), T.MUD, [T.GRASS, T.PATH, T.FLOWER]);
  }

  const { dist, order } = floodFill(grid, start.x, start.y);
  const reachable = order.filter(i => dist[i] >= 6);
  const bushes = shuffle(reachable.filter(i => tiles[i] === T.BUSH));
  const open = shuffle(reachable.filter(i => !COVER.includes(tiles[i]) && !SLIPPY.includes(tiles[i])));
  const picker = makePicker(W);
  const farBushes = bushes.filter(i => dist[i] >= 15);
  const found = snackMix(grid, opts, picker, {
    order, dist, open, cover: bushes, kinds: PLACE_SNACKS.park, rare: n >= 3 ? 2 : 1,
    digGround: open.filter(i => tiles[i] === T.GRASS || tiles[i] === T.FLOWER),
    golden: farBushes.length ? farBushes : bushes.length ? bushes : open,
  });
  return finishWorld(grid, {
    ...found, start: { x: start.x * TILE + 16, y: start.y * TILE + 24 },
    ...placeCreatures(grid, opts, dist, order, picker),
  }, opts);
}

// ---- The veggie garden: house along the top, patio, raised beds, a fountain plaza, a beehive ----

function generateGarden(opts) {
  const { n, rain, diff } = opts;
  const W = 48, H = 36;
  const grid = makeGrid(W, H);
  const { tiles, get, set } = grid;
  const start = { x: 24, y: 6 };
  const nearStart = (x, y, r) => Math.abs(x - start.x) <= r && Math.abs(y - start.y) <= r;

  fillRect(grid, 1, 1, W - 2, 3, T.HOUSE);
  fillRect(grid, 17, 4, 30, 6, T.PATIO);
  fillRect(grid, 4, 8, 43, 32, T.PATH);
  // Grass strips and stepping stones break up the dirt between the beds
  for (let x = 4; x <= 43; x++) { if (x % 7 === 3) for (let y = 8; y <= 32; y++) set(x, y, T.GRASS); }
  for (const y of [12, 22]) for (let x = 4; x <= 43; x++) if (get(x, y) === T.PATH && x % 2 === 0) set(x, y, T.STONE);

  // 6 x 5 grid of 4x2 beds with 3-wide paths; the middle two make room for a fountain plaza
  const plaza = (col, row) => row === 2 && (col === 2 || col === 3);
  const beds = [];
  for (let row = 0; row < 5; row++) for (let col = 0; col < 6; col++) if (!plaza(col, row)) beds.push([5 + col * 7, 9 + row * 5]);
  const crops = shuffle([...Array(beds.length)].map((_, i) => CROPS[i % CROPS.length]));
  const plants = [];
  beds.forEach(([bx, by], k) => {
    for (let y = by; y < by + 2; y++) for (let x = bx; x < bx + 4; x++) {
      set(x, y, T.BED);
      plants.push({ x: x * TILE + 16, y: y * TILE + 16, crop: crops[k], ripe: false });
    }
  });
  fillRect(grid, 17, 17, 31, 22, T.STONE);
  addObject(grid, 'fountain', 23, 19, { fountain: true });
  addObject(grid, 'statue', 19, 18); addObject(grid, 'urn', 29, 18);
  addObject(grid, 'bench', 18, 22); addObject(grid, 'bench', 28, 22);
  addObject(grid, 'plantSmall', 17, 17); addObject(grid, 'plantSmall', 31, 17);

  // Arches over some of the paths between beds (you walk under them)
  const arches = shuffle(beds.filter(([bx]) => bx < 40)).slice(0, 5);
  for (const [bx, by] of arches) if (get(bx + 4, by) === T.PATH && get(bx + 6, by) !== T.BED && get(bx + 5, by) !== T.FURN) addObject(grid, 'arch', bx + 4, by);
  // A scarecrow stands in one bed (replacing a plant)
  const [sbx, sby] = pick(beds);
  addObject(grid, 'scarecrow', sbx + 1, sby + 1);
  plants.splice(plants.findIndex(p => p.x === (sbx + 1) * TILE + 16 && p.y === (sby + 1) * TILE + 16), 1);
  // Trellis panels and pots along the house wall
  for (const x of [2, 6, 10, 34, 38, 42]) tryObject(grid, 'trellisPanel', x, 4, [T.GRASS]);
  for (const x of [15, 32]) { addObject(grid, 'plantBig', x, 4); addObject(grid, 'plant', x, 6); }
  // Pots at bed corners, and garden bits on the paths
  for (const [bx, by] of shuffle([...beds]).slice(0, 8)) tryObject(grid, pick(['plant', 'plantSmall', 'plantBig']), bx + pick([-1, 4]), by + pick([-1, 2]), [T.PATH, T.STONE], 0);
  for (const kind of ['wheelbarrow', 'birdBath', 'wateringCan', 'wateringCan']) scatterObjects(grid, [kind], 1, 5, 9, 42, 31, [T.PATH, T.GRASS, T.STONE], 1);

  // Lawn down both sides: big trees, bushes, flowers, a pond
  blob(grid, 45, 33, 2, 1, T.WATER, [T.GRASS]);
  grid.treeSize = {};
  for (const [x, y, size] of [[2, 10, 'l'], [2, 19, 'm'], [45, 13, 'l'], [45, 23, 'm'], [2, 30, 'l']]) { set(x, y, T.TREE); grid.treeSize[y * W + x] = size; }
  for (let i = 0; i < 16; i++) {
    const x = pick([1, 2, 3, 44, 45, 46]), y = rand(8, 31);
    if (get(x, y) === T.GRASS) set(x, y, T.BUSH);
  }
  for (let i = 0; i < 40; i++) {
    const x = rand(1, W - 2), y = rand(7, H - 2);
    if (get(x, y) === T.GRASS && (x < 4 || x > 43 || y > 32)) set(x, y, T.FLOWER);
  }
  const mud = Math.round((3 + Math.floor(n / 2)) * (rain ? 2.5 : 1));
  for (let m = 0; m < mud; m++) {
    const cx = rand(4, W - 5), cy = rand(8, H - 4);
    if (!nearStart(cx, cy, 3)) blob(grid, cx, cy, rand(1, 2), rand(1, rain ? 2 : 1), T.MUD, [T.GRASS, T.PATH, T.FLOWER]);
  }

  // Langstroth beehive on the side lawn, honey in front
  const hiveSpots = shuffle([...Array(H).keys()].flatMap(y => [1, 2, 3, 44, 45, 46].map(x => [x, y])).filter(([x, y]) =>
    y >= 8 && y <= 30 && get(x, y) === T.GRASS && get(x, y + 1) !== T.TREE && !SOLID[get(x, y + 1)] && get(x, y + 1) !== T.WATER));
  let hive = null;
  if (hiveSpots.length) {
    const [hx, hy] = hiveSpots[0];
    addObject(grid, 'hive', hx, hy);
    set(hx, hy + 1, T.GRASS);
    hive = { tx: hx, ty: hy, x: hx * TILE + 16, y: hy * TILE + 16, honeyX: hx * TILE + 16, honeyY: (hy + 1) * TILE + 12, honey: true, refill: 0, beeT: 2 + Math.random() * 2 };
  }

  const { dist, order } = floodFill(grid, start.x, start.y);
  const picker = makePicker(W);
  const open = shuffle(order.filter(i => dist[i] >= 8 && !COVER.includes(tiles[i]) && !SLIPPY.includes(tiles[i])));
  // About half the snacks are produce picked from the beds; the rest are dropped, hidden and buried
  const bushes = shuffle(order.filter(i => dist[i] >= 6 && tiles[i] === T.BUSH));
  const found = snackMix(grid, opts, picker, {
    order, dist, open, cover: bushes, kinds: PLACE_SNACKS.park, rare: n >= 3 ? 1 : 0,
    digGround: open.filter(i => [T.GRASS, T.PATH, T.FLOWER].includes(tiles[i])),
  });
  const treats = found.treats;
  // A leftover pizza slice on the patio
  const patio = shuffle(order.filter(i => tiles[i] === T.PATIO && dist[i] >= 2));
  unseeded(() => picker.take(shuffle(patio), 1).forEach(i => treats.push(snackAt(grid, i, SNACKS.pizza))));

  return finishWorld(grid, {
    ...found, plants, hive,
    maxRipe: Math.max(3, Math.round(6 * diff.snacks)), growT: 0,
    sprinklers: rain ? [] : placeSprinklers(grid, order, dist, picker, 4),
    tugSpot: tugSpot(grid, order, dist, picker),
    start: { x: start.x * TILE + 16, y: start.y * TILE + 24 },
    ...placeCreatures(grid, opts, dist, order, picker),
  }, opts);
}

// Where the other dog waits with the tug rope (backyards, about half the time): open ground, away from the start
function tugSpot(grid, order, dist, picker) {
  if (!chance(0.5)) return null;
  const spots = shuffle(order.filter(i => dist[i] >= 10 && [T.GRASS, T.PATH, T.STONE, T.FLOWER].includes(grid.tiles[i]) &&
    DIRS.every(([dx, dy]) => !SOLID[grid.tiles[i + dx + dy * grid.W]])));
  const i = picker.take(spots, 1, 3)[0];
  return i === undefined ? null : tileCentre(grid, i, 22);
}

// ---- The pool yard: deck, in-ground pool, a lawn full of backyard life, sprinklers ----

function generatePool(opts) {
  const { n, rain, diff } = opts;
  const W = 44, H = 36;
  const grid = makeGrid(W, H);
  const { tiles, get, set } = grid;
  const start = { x: 22, y: 6 };

  fillRect(grid, 1, 1, W - 2, 3, T.HOUSE);
  fillRect(grid, 6, 4, 37, 8, T.DECK);
  fillRect(grid, 15, 12, 28, 17, T.POOL);
  // Flower beds along the fences, with gaps
  for (let y = 10; y <= H - 4; y++) { if (y % 6 !== 0) { set(1, y, T.FLOWERBED); set(W - 2, y, T.FLOWERBED); } }
  for (let x = 3; x <= W - 4; x++) if (x % 7 !== 0) set(x, H - 2, T.FLOWERBED);
  for (let y = 9; y <= 31; y += 2) { set(9, y, T.STONE); set(34, y, T.STONE); } // stepping stones
  for (let x = 10; x <= 33; x += 2) set(x, 21, T.STONE);

  // Deck: BBQ, table and chairs, loungers, pots along the edge
  addObject(grid, 'bbq', 8, 5);
  addObject(grid, 'outdoorTable', 26, 4);
  addObject(grid, 'chair', 25, 5); addObject(grid, 'chair', 29, 5);
  addObject(grid, 'plantBig', 6, 4); addObject(grid, 'plantBig', 37, 4);
  for (const x of [12, 16, 31, 35]) addObject(grid, 'plantSmall', x, 8);
  addObject(grid, 'lounger', 12, 12); addObject(grid, 'lounger', 30, 12);
  addObject(grid, 'lounger', 12, 15);
  // Floating in the pool
  addObject(grid, 'poolRing', 18, 13); addObject(grid, 'lilo', 23, 15);

  // The lawn: a round table under an umbrella, the dog house, shed, clothesline, mower and more
  addObject(grid, 'roundTable', 5, 24);
  addObject(grid, 'chair', 4, 25); addObject(grid, 'chair', 7, 25);
  addObject(grid, 'dogHouse', 37, 26);
  addObject(grid, 'shed', 3, 31);
  addObject(grid, 'rotaryLine', 29, 27);
  addObject(grid, 'mower', 17, 29);
  addObject(grid, 'hoseReel', 38, 9);
  addObject(grid, 'gnome', 21, 25); addObject(grid, 'gnome', 12, 33);
  addObject(grid, 'birdBath', 24, 32);
  addObject(grid, 'plant', 36, 30); addObject(grid, 'urn', 10, 26);
  for (const [x, y] of [[9, 31], [33, 24], [14, 22], [26, 30]]) if (tryObject(grid, 'bin', x, y, [T.GRASS, T.DECK, T.FLOWER], 1)) break; // knock it over!

  // Big shade trees in the corners and along the side fences
  grid.treeSize = {};
  for (const [x, y, size] of [[4, 12, 'l'], [39, 13, 'l'], [3, 19, 'm'], [40, 20, 'l'], [33, 33, 'm'], [20, 34, 'm']]) {
    if (get(x, y) === T.GRASS) { set(x, y, T.TREE); grid.treeSize[y * W + x] = size; }
  }
  for (let i = 0; i < 14; i++) {
    const x = rand(2, W - 3), y = rand(10, H - 3);
    if (get(x, y) === T.GRASS && (x < 12 || x > 31 || y > 20)) set(x, y, T.BUSH);
  }
  for (let i = 0; i < 30; i++) {
    const x = rand(2, W - 3), y = rand(10, H - 3);
    if (get(x, y) === T.GRASS) set(x, y, T.FLOWER);
  }
  const mud = Math.round((1 + Math.floor(n / 2)) * (rain ? 3 : 1));
  for (let m = 0; m < mud; m++) blob(grid, rand(3, W - 4), rand(20, H - 4), rand(1, 2), 1, T.MUD, [T.GRASS, T.FLOWER]);

  const { dist, order } = floodFill(grid, start.x, start.y);
  const picker = makePicker(W);
  const reachable = order.filter(i => dist[i] >= 4);
  const cover = shuffle(reachable.filter(i => COVER.includes(tiles[i]) && tiles[i] !== T.TABLE));
  const open = shuffle(reachable.filter(i => !COVER.includes(tiles[i]) && !SLIPPY.includes(tiles[i])));
  const found = snackMix(grid, opts, picker, {
    order, dist, open, cover, kinds: PLACE_SNACKS.pool, rare: n >= 3 ? 1 : 0,
    digGround: open.filter(i => tiles[i] === T.GRASS || tiles[i] === T.FLOWER),
  });
  // Pizza on the outdoor table (hidden underneath it, like snacks in bushes)
  const table = grid.objects.find(o => o.kind === 'outdoorTable');
  found.treats.push(snackAt(grid, (table.ty + 1) * W + table.tx + 1, SNACKS.pizza));

  return finishWorld(grid, {
    ...found,
    sprinklers: rain ? [] : placeSprinklers(grid, order, dist, picker, 4),
    tugSpot: tugSpot(grid, order, dist, picker),
    start: { x: start.x * TILE + 16, y: start.y * TILE + 24 },
    ...placeCreatures(grid, opts, dist, order, picker),
  }, opts);
}

// ---- Indoor places ----

function makeIndoor(W, H, style) {
  const grid = makeGrid(W, H, T.WALL, T.FLOOR);
  grid.floor = new Uint8Array(W * H).fill(style);
  grid.doors = [];
  return grid;
}
function wallLine(grid, x0, y0, x1, y1, doors) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid.set(x, y, T.WALL);
  for (const [x, y] of doors) { grid.set(x, y, T.FLOOR); grid.doors.push([x, y]); }
}
function floorRect(grid, x0, y0, x1, y1, style) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) grid.floor[y * grid.W + x] = style;
}
function spills(grid, count, area) {
  for (let i = 0, tries = 0; i < count && tries < 60; tries++) {
    const x = rand(2, grid.W - 3), y = rand(2, grid.H - 3);
    if (grid.get(x, y) !== T.FLOOR) continue;
    blob(grid, x, y, rand(1, 2), 1, T.SPILL, [T.FLOOR]);
    i++;
  }
}
function finishIndoor(grid, opts, start, kinds) {
  const { n } = opts;
  const { dist, order } = floodFill(grid, start.x, start.y);
  const picker = makePicker(grid.W);
  const reachable = order.filter(i => dist[i] >= 4);
  const cover = shuffle(reachable.filter(i => grid.tiles[i] === T.TABLE));
  const open = shuffle(reachable.filter(i => grid.tiles[i] === T.FLOOR || grid.tiles[i] === T.RUG));
  const found = snackMix(grid, opts, picker, { order, dist, open, cover, kinds, rare: 1 + (n >= 4 ? 1 : 0) });
  return finishWorld(grid, {
    ...found, doors: grid.doors,
    start: { x: start.x * TILE + 16, y: start.y * TILE + 24 },
    ...placeCreatures(grid, opts, dist, order, picker),
  }, opts);
}

// The house: kitchen, lounge with the TV, bedroom, and a bathroom/laundry with a spilled water bowl
function generateHouse(opts) {
  const W = 36, H = 26;
  const grid = makeIndoor(W, H, FLOOR_STYLE.wood);
  wallLine(grid, 1, 12, W - 2, 12, [[6, 12], [7, 12], [27, 12], [28, 12]]);
  wallLine(grid, 15, 1, 15, 11, [[15, 6], [15, 7]]);
  wallLine(grid, 23, 13, 23, H - 2, [[23, 17], [23, 18]]);
  floorRect(grid, 1, 1, 14, 11, FLOOR_STYLE.kitchen);
  floorRect(grid, 1, 13, 22, H - 2, FLOOR_STYLE.carpet);
  floorRect(grid, 24, 13, W - 2, H - 2, FLOOR_STYLE.bath);
  const add = (kind, x, y, extra) => addObject(grid, kind, x, y, extra);

  // Kitchen: benches along the wall, an island, the dining table, the dog's bed
  add('fridge', 1, 1); add('counter', 2, 1); add('sink', 3, 1); add('counter', 4, 1); add('stove', 5, 1);
  add('counter', 6, 1); add('counter', 7, 1); add('bin', 8, 1); add('plantBig', 13, 1); add('plantSmall', 10, 1);
  add('island', 3, 4);
  add('diningTable', 7, 7);
  add('chair', 6, 7); add('chair', 6, 8); add('chair', 10, 7); add('chair', 10, 8);
  add('dogBed', 12, 10); add('plant', 1, 10); add('waterBowl', 11, 10);
  // Lounge: TV, rug, sofa and armchairs, bookshelves, lamps, toys
  fillRect(grid, 20, 4, 29, 9, T.RUG);
  add('tvUnit', 23, 1); add('floorLamp', 21, 1); add('floorLamp', 27, 1);
  add('bookshelf', 16, 1); add('bookshelf', 32, 1); add('plantBig', 34, 3);
  add('coffeeTable', 24, 5);
  add('sofa', 23, 8); add('sideTable', 22, 8); add('sideTable', 27, 8);
  add('armchair', 19, 5); add('armchair', 29, 5);
  add('toyBox', 33, 9); add('plantSmall', 16, 10); add('plant', 34, 7);
  // Bedroom: bed with bedside lamps, wardrobe, dresser, laundry basket; hall stand by the door
  add('bedside', 1, 14); add(opts.night ? 'bedOwner' : 'bed', 2, 14); add('bedside', 5, 14); // at night she's asleep in it
  add('wardrobe', 9, 13); add('dresser', 12, 13); add('plantBig', 16, 13);
  fillRect(grid, 3, 19, 10, 22, T.RUG);
  add('laundryBasket', 21, 14); add('coatRack', 1, 23); add('shoeRack', 13, 23); add('toyBox', 19, 23);
  add('plantSmall', 22, 23);
  // Bathroom and laundry
  add('toilet', 24, 13); add('washer', 29, 13); add('washer', 30, 13); add('bathtub', 31, 13);
  add('laundryBasket', 34, 17); add('plant', 34, 23); add('bin', 24, 23); add('waterBowl', 28, 23);
  spills(grid, (opts.night ? 1 : 2) + Math.floor(opts.n / 3), 'house');
  if (!opts.night) return finishIndoor(grid, opts, { x: 18, y: 10 }, PLACE_SNACKS.house);
  // At night: lamps off, moonlight through the windows, a little night light in the lounge.
  // Every cat is asleep, and so is the owner. Make too much noise and she wakes up.
  grid.night = true;
  const world = finishIndoor(grid, opts, { x: 18, y: 10 }, PLACE_SNACKS.house);
  const moon = [[5, 3], [11, 5], [20, 3], [31, 4], [7, 16], [17, 18], [29, 16], [28, 22]];
  world.lights = [
    ...moon.map(([x, y]) => ({ x: x * TILE + 16, y: y * TILE + 16, r: 70, colour: '150,175,255' })),
    { x: 18 * TILE, y: 10 * TILE, bulbY: 9 * TILE + 20, r: 48, colour: '255,200,120' },
  ];
  world.dark = true;
  world.night = true;
  world.noise = 0;
  world.hush = 'owner'; // a full noise meter wakes her up
  return world;
}

// The garage: dim concrete, two cars, workbench, tall shelving, box piles and oil stains,
// lit by a few ceiling lights (some of them flicker)
function generateGarage(opts) {
  const W = 36, H = 26;
  const grid = makeIndoor(W, H, FLOOR_STYLE.concrete);
  const add = (kind, x, y, extra) => addObject(grid, kind, x, y, extra);
  add('carRed', 8, 11); add('carBlue', 20, 11);
  // Back wall
  add('workbench', 2, 1); add('shelf', 7, 1); add('shelf', 10, 1); add('toolbox', 12, 1);
  add('garageFridge', 15, 1); add('laundrySink', 17, 1); add('ladder', 19, 1); add('broom', 20, 1);
  add('paintTins', 21, 1); add('tyres', 22, 1); add('shelf', 24, 1); add('shelf', 27, 1); add('shelf', 30, 1); add('boxes', 33, 1); add('boxes', 34, 1);
  // Side walls and corners: shelving, box piles, the mower, a hose, a bike
  add('shelf', 1, 5); add('boxes', 1, 8); add('boxesWide', 1, 9); add('boxes', 2, 13); add('paintTins', 1, 16);
  add('shelf', 33, 5); add('boxesWide', 33, 8); add('boxes', 34, 12); add('hosePile', 34, 15);
  add('mower', 30, 19); add('bike', 3, 20); add('boxesWide', 1, 23); add('boxes', 3, 23); add('boxesWide', 32, 23);
  add('boxes', 34, 21); add('tyres', 7, 23); add('hosePile', 27, 23);
  spills(grid, 3 + Math.floor(opts.n / 3), 'garage');
  // Ceiling lights: pools of light in the gloom. Some flicker.
  const lights = [[5, 6], [17, 7], [29, 6], [11, 18], [23, 19], [17, 2]].map(([x, y], i) => ({
    x: x * TILE + 16, y: y * TILE + 16, r: 96 + (i % 2) * 18, colour: '255,222,160', ceiling: true, flicker: i === 1 || i === 4 || (i === 3 && opts.n > 3),
  }));
  const world = finishIndoor(grid, opts, { x: 17, y: 21 }, PLACE_SNACKS.garage);
  if (opts.night) { // dim and spooky; the owner's asleep in the house, so keep it down
    world.lights.push(...lights);
    world.dark = true;
  } else { // the roller door's up: sunshine pours in along the bottom, and the tubes glow warm
    world.lights.push(...lights.map(L => ({ ...L, flicker: false, r: L.r * 0.8 })));
    for (let x = 4; x < W - 3; x += 6) world.lights.push({ x: x * TILE + 16, y: (H - 2) * TILE, r: 120, colour: '255,240,200' });
  }
  return world;
}

// The vet: waiting room with pets in carriers, reception, two exam rooms and a mopped floor
function generateVet(opts) {
  const W = 34, H = 22;
  const grid = makeIndoor(W, H, FLOOR_STYLE.vet);
  const add = (kind, x, y, extra) => addObject(grid, kind, x, y, extra);
  wallLine(grid, 17, 1, 17, H - 2, [[17, 9], [17, 10]]);
  wallLine(grid, 18, 11, W - 2, 11, [[24, 11], [25, 11]]);
  add('desk', 10, 2); add('plantBig', 15, 1); add('magazineRack', 8, 1);
  for (const x of [2, 3, 4, 6, 7, 8]) { add('waitChair', x, 5); add('waitChair', x, 9); }
  add('plantSmall', 1, 5); add('plantSmall', 1, 9);
  fillRect(grid, 4, 13, 10, 15, T.RUG);
  add('plantBig', 1, 1); add('plant', 16, 19); add('scales', 12, 12); add('bin', 15, 6);
  add('carrier', 2, 17, { pet: 'cat' }); add('carrier', 6, 18, { pet: 'dog' }); add('carrier', 10, 17, { pet: pick(['cat', 'dog']) });
  add('magazineRack', 13, 18);
  // Exam rooms
  add('examTable', 22, 4); add('cabinet', 31, 1); add('laundrySink', 28, 1); add('plantSmall', 18, 1); add('bin', 18, 9);
  add('examTable', 22, 15); add('cabinet', 31, 12); add('laundrySink', 28, 12); add('plant', 18, 19); add('scales', 28, 18);
  spills(grid, 2 + Math.floor(opts.n / 3), 'vet');
  return finishIndoor(grid, opts, { x: 8, y: 11 }, PLACE_SNACKS.vet);
}

// ---- The dog park: a fenced park with an agility course, and other dogs everywhere ----
function generateDogPark(opts) {
  const { n, diff } = opts;
  const W = 46, H = 34;
  const grid = makeGrid(W, H);
  const { tiles, get, set } = grid;
  const start = { x: 7, y: H - 5 };
  const add = (kind, x, y, extra) => tryObject(grid, kind, x, y, [T.GRASS, T.PATH], 0, extra);
  // A gravel loop round the park
  for (let x = 4; x <= W - 5; x++) { set(x, 4, T.PATH); set(x, H - 5, T.PATH); }
  for (let y = 4; y <= H - 5; y++) { set(4, y, T.PATH); set(W - 5, y, T.PATH); }
  // The agility course in the middle: jumps, a tunnel to run through, weave poles, an A-frame
  for (const x of [12, 17, 22]) add('agilityJump', x, 10);
  add('tunnel', 13, 15); add('weavePoles', 21, 15); add('aFrame', 28, 10);
  add('agilityJump', 29, 16); add('agilityJump', 29, 20);
  // Benches, water stations, bins, a sign, and shade trees
  for (const [k, x, y] of [['bench', 9, 2], ['bench', 22, 2], ['bench', 34, 2], ['bench', 20, H - 3], ['waterStation', 6, 7],
    ['waterStation', 38, 25], ['bin', 7, H - 3], ['bin', 37, 2], ['bin', 40, H - 3], ['dogParkSign', 2, H - 7], ['bench', 12, 22], ['bench', 30, 26]]) add(k, x, y);
  grid.treeSize = {};
  for (const [x, y, size] of [[34, 8, 'l'], [36, 18, 'm'], [10, 25, 'l'], [24, 24, 'm'], [40, 12, 'm'], [8, 13, 'm']]) { if (get(x, y) === T.GRASS) { set(x, y, T.TREE); grid.treeSize[y * W + x] = size; } }
  for (let i = 0; i < 18; i++) {
    const x = pick([1, 2, 3, W - 4, W - 3, W - 2]), y = rand(1, H - 2);
    if (get(x, y) === T.GRASS) set(x, y, chance(0.3) ? T.TREE : T.BUSH);
  }
  for (let i = 0; i < 10; i++) { const x = rand(5, W - 6), y = rand(5, H - 6); if (get(x, y) === T.GRASS && Math.abs(x - start.x) + Math.abs(y - start.y) > 4) set(x, y, T.BUSH); }
  for (let i = 0; i < 40; i++) { const x = rand(1, W - 2), y = rand(1, H - 2); if (get(x, y) === T.GRASS) set(x, y, T.FLOWER); }
  blob(grid, 38, 27, 2, 1, T.WATER, [T.GRASS, T.FLOWER]);
  for (let m = 0; m < 2 + Math.floor(n / 2); m++) blob(grid, rand(6, W - 7), rand(6, H - 7), rand(1, 2), 1, T.MUD, [T.GRASS, T.FLOWER]);

  const { dist, order } = floodFill(grid, start.x, start.y);
  const picker = makePicker(W);
  const reachable = order.filter(i => dist[i] >= 5);
  const bushes = shuffle(reachable.filter(i => COVER.includes(tiles[i])));
  const open = shuffle(reachable.filter(i => !COVER.includes(tiles[i]) && !SLIPPY.includes(tiles[i])));
  const found = snackMix(grid, opts, picker, {
    order, dist, open, cover: bushes, kinds: PLACE_SNACKS.dogpark, rare: 1,
    digGround: open.filter(i => tiles[i] === T.GRASS || tiles[i] === T.FLOWER),
  });
  // The other dogs: Staffies in red, blue, fawn and chocolate, wandering about
  const dogCount = Math.max(opts.night ? 1 : 2, Math.min(6, Math.round(4 * diff.critters * (opts.night ? 0.5 : 1))));
  const coats = shuffle(['rusty', 'blue', 'fawn', 'choc']);
  const parkDogs = picker.take(open.filter(i => dist[i] >= 8), dogCount, 4).map((i, k) => ({
    key: coats[k % coats.length], ...tileCentre(grid, i, 22), dir: 'down', vx: 0, vy: 0, t: Math.random() * 2, animT: Math.random() * 8,
    moving: false, state: 'wander', cooldown: 2 + Math.random() * 4,
  }));
  return finishWorld(grid, {
    ...found, parkDogs,
    start: { x: start.x * TILE + 16, y: start.y * TILE + 24 },
    ...placeCreatures(grid, opts, dist, order, picker),
  }, opts);
}

// ---- The beach: dunes and Norfolk pines along the top, sand, rock pools, and the sea. Most of the
// snacks are buried: stop on a sand mound and dig. Waves wash in now and then. ----
function generateBeach(opts) {
  const W = 52, H = 32;
  const grid = makeGrid(W, H, T.FENCE, T.SAND);
  const { tiles, get, set } = grid;
  const sea = H - 7, start = { x: W >> 1, y: 8 };
  fillRect(grid, 1, 1, W - 2, 3, T.GRASS);
  for (let x = 1; x <= W - 2; x++) set(x, 2, T.PATH);
  // The sea runs right to the bottom and sides (no fence in the water)
  for (let y = sea; y < H; y++) for (let x = 0; x < W; x++) tiles[y * W + x] = T.WATER;
  for (let y = 1; y < sea; y++) { tiles[y * W] = T.FENCE; tiles[y * W + W - 1] = T.FENCE; }
  // Dunes with beach grass, and tall Norfolk pines behind them
  grid.treeSize = {};
  for (let x = 1; x <= W - 2; x++) {
    if (chance(0.45)) set(x, 4, T.BUSH);
    if (chance(0.25)) set(x, 5, T.BUSH);
    if (x % 9 === 3) { set(x, 3, T.TREE); grid.treeSize[3 * W + x] = pick(['m', 'l']); }
  }
  for (let x = start.x - 2; x <= start.x + 2; x++) { set(x, 4, T.SAND); set(x, 5, T.SAND); set(x, 3, T.PATH); } // the path down onto the beach
  // Rock pools near the water, with rocks round them
  const pools = [[9, sea - 4], [40, sea - 5], [25, sea - 3]];
  for (const [x, y] of pools) blob(grid, x, y, 2, 1, T.WATER, [T.SAND]);
  const add = (kind, x, y, extra) => tryObject(grid, kind, x, y, [T.SAND], 0, extra);
  for (const [x, y] of pools) for (const [dx, dy] of [[-3, 0], [3, -1], [-2, -2], [2, 1]]) add('rocks', x + dx, y + dy);
  // Beach life: umbrellas with towels, an esky, sandcastles, surfboards, the lifeguard tower
  for (const [x, y] of [[8, 11], [21, 9], [35, 12], [44, 9]]) { add('beachUmbrella', x, y); add('towel', x + 2, y + 1); }
  for (const [k, x, y] of [['esky', 11, 13], ['sandcastle', 17, 16], ['sandcastle', 31, 18], ['bucketSpade', 18, 17], ['surfboard', 47, 15],
    ['surfboard', 48, 15], ['lifeguardTower', 28, 7], ['esky', 38, 14], ['driftwood', 14, sea - 2], ['sandcastle', 44, 19], ['bucketSpade', 45, 20]]) add(k, x, y);
  // More sandcastles dotted over the dry sand (above the strip the waves wash over)
  for (let k = 0, want = rand(8, 12), tries = 0; k < want && tries < 400; tries++) if (tryObject(grid, 'sandcastle', rand(3, W - 4), rand(7, sea - 5), [T.SAND], 1)) k++;
  const { dist, order } = floodFill(grid, start.x, start.y);
  const picker = makePicker(W);
  const sand = shuffle(order.filter(i => dist[i] >= 4 && tiles[i] === T.SAND && Math.floor(i / W) < sea - 1));
  // Most snacks are buried in the sand; a few picnic leftovers lie about, and the eskies can be knocked over
  const found = snackMix(grid, opts, picker, { order, dist, open: sand, digGround: sand, kinds: PLACE_SNACKS.beach, rare: 1 });
  // What's inside each sandcastle: about a third a snack, a third a crab (it bursts out and bolts), a
  // third just sand. Decided fresh each play, like the snacks.
  unseeded(() => {
    for (const st of found.stashes) {
      if (st.obj.kind !== 'sandcastle' || st.type) continue;
      const r = Math.random();
      if (r < 0.3) { st.type = SNACKS[pick(PLACE_SNACKS.beach)]; found.goal++; }
      else if (r < 0.65) st.surprise = 'crab';
    }
  });
  const people = opts.night ? [] : placeBeachPeople(grid, opts, sea);
  return finishWorld(grid, {
    ...found,
    beachPeople: people,
    waves: { t: 10, period: 17, wetTop: (sea - 3) * TILE, shore: sea * TILE },
    start: { x: start.x * TILE + 16, y: start.y * TILE + 24 },
    ...placeCreatures(grid, opts, dist, order, picker),
  }, opts);
}

// Beach-goers: swimmers out past the waves, sunbakers on the towels (you can run right over them),
// readers under the umbrellas, and kids building some of the sandcastles. In the rain only a hardy
// few are out; at night nobody.
function placeBeachPeople(grid, opts, sea) {
  const { W, tiles } = grid, people = [], looks = shuffle(Object.keys(GUEST_LOOKS));
  let n = 0;
  const look = () => looks[n++ % looks.length];
  const block = (tx, ty) => { const i = ty * W + tx; if (tiles[i] !== T.SAND) return false; grid.under[i] = tiles[i]; tiles[i] = T.FURN; return true; };
  const rain = opts.rain;
  // Swimmers (one on a pool ring)
  for (let k = 0, m = rain ? 1 : rand(2, 4); k < m; k++)
    people.push({ kind: 'swim', look: look(), x: rand(4, W - 5) * TILE + 16, y: (sea + 1 + rand(0, 2)) * TILE + 20, vx: (chance(0.5) ? -1 : 1) * (6 + Math.random() * 8), ring: k === 1, t: Math.random() * 4 });
  const towels = shuffle(grid.objects.filter(o => o.kind === 'towel'));
  const umbrellas = grid.objects.filter(o => o.kind === 'beachUmbrella');
  if (!rain) for (const o of towels.slice(0, rand(2, 3))) { // sunbakers: their towel becomes walkable so you can trot over them
    for (let x = o.tx; x < o.tx + o.w; x++) { const i = o.ty * W + x; if (tiles[i] === T.FURN) tiles[i] = grid.under[i] !== 255 ? grid.under[i] : T.SAND; }
    o.walkable = true;
    people.push({ kind: 'sun', look: look(), x: (o.tx + o.w / 2) * TILE, y: (o.ty + 1) * TILE - 6, towel: o, t: Math.random() * 6 });
  }
  for (const u of shuffle(umbrellas.slice()).slice(0, rain ? 1 : rand(1, 2))) { // readers, just in front of the umbrella's pole
    const tx = u.tx + (u.w >> 1), ty = u.ty + u.h;
    if (block(tx, ty)) people.push({ kind: 'read', look: look(), x: tx * TILE + 16, y: ty * TILE + 28, t: Math.random() * 6 });
  }
  if (!rain) for (const c of shuffle(grid.objects.filter(o => o.kind === 'sandcastle')).slice(0, rand(2, 3))) { // kids building castles
    const tx = c.tx - 1, ty = c.ty;
    if (block(tx, ty)) people.push({ kind: 'kid', look: look(), x: tx * TILE + 18, y: ty * TILE + 28, castle: c, t: Math.random() * 6 });
  }
  return people;
}

// ---- The pet store: aisles of shelves, aquariums, birds, a dog wash, and staff who'll catch you ----
function generateStore(opts) {
  const W = 36, H = 24;
  const grid = makeIndoor(W, H, FLOOR_STYLE.store);
  const add = (kind, x, y, extra) => addObject(grid, kind, x, y, extra);
  // Along the back wall: fish tanks, bird cages, a cat tree, and shelves of pet food
  for (const x of [2, 5, 8]) add('aquarium', x, 1);
  add('birdCage', 11, 1); add('birdCage', 13, 1); add('catTree', 15, 1);
  for (const x of [20, 23, 26, 29]) add(x % 2 ? 'toyShelf' : 'petShelf', x, 1);
  add('plantBig', 33, 1); add('plantBig', 1, 9);
  // Two long aisles with a cross-aisle down the middle, and a short one near the front
  const kinds = ['petShelf', 'toyShelf', 'petShelf', 'bagPile'];
  let k = 0;
  for (const y of [6, 11]) for (let x = 4; x <= 29; x += 2) { if (x === 16) continue; add(kinds[k++ % kinds.length], x, y); }
  for (let x = 10; x <= 24; x += 2) add(kinds[k++ % kinds.length], x, 15);
  // The dog wash (bottom left) and the checkout (bottom right)
  floorRect(grid, 1, 18, 9, H - 2, FLOOR_STYLE.bath);
  add('dogWash', 2, 19); add('bin', 7, 19); add('bagPile', 1, 22); add('waterBowl', 6, 22);
  add('checkout', 27, 19); add('bagPile', 32, 20); add('petBedDisplay', 25, 22);
  const world = finishIndoor(grid, opts, { x: 18, y: 21 }, PLACE_SNACKS.store);
  world.washSpot = { x: 4 * TILE + 16, y: 21 * TILE + 24 };
  // The staff patrol between points in the aisles
  const aisle = [];
  for (let i = 0; i < world.tiles.length; i++) {
    const x = i % W, y = Math.floor(i / W);
    if (world.tiles[i] === T.FLOOR && [4, 9, 13, 17].includes(y) && x % 4 === 2) aisle.push({ tx: x, ty: y });
  }
  // By day the staff patrol the aisles; at night it's closed, and a security guard walks the aisles with a torch
  const staffCount = opts.night ? ({ 0.5: 1, 1: 1, 2: 2 }[opts.diff.cats] || 1) : ({ 0.5: 2, 1: 3, 2: 4 }[opts.diff.cats] || 3);
  const looks = shuffle(['red', 'blue', 'green', 'red']);
  world.staff = shuffle(aisle).slice(0, staffCount).map((a, i) => ({
    x: a.tx * TILE + 16, y: a.ty * TILE + 24, dir: 'down', animT: 0, moving: false, look: opts.night ? 'guard' : looks[i], role: opts.night ? 'guard' : 'staff',
    state: 'patrol', path: null, waitT: 1 + Math.random() * 2, seenT: 0, chaseT: 0,
  }));
  world.staffPoints = aisle;
  return world;
}
