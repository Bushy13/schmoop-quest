// Props and furniture, drawn in the three-quarter top-down view with proper materials and detail.
// Each FURNITURE entry has a collision footprint in tiles (w × h), a sprite size in px (sw × sh),
// and a draw function. The sprite's bottom-centre sits on the footprint's bottom-centre and
// rises/overhangs from there. `cover: true` means the dog can walk underneath (tables, arches);
// `decor: true` means it doesn't block anything at all (rugs, hoses, things on the ground).

// ---- Material colour ramps (dark → light) ----
const M = {
  wood:      ramp('#2e1a0c', '#5a3418', '#764622', '#925a2e', '#ae7440', '#c89058'),
  timber:    ramp('#3a2814', '#6a4a28', '#8a6436', '#a87e48', '#c49a62', '#dcb880'),
  darkWood:  ramp('#1a0e08', '#3a2010', '#4e2c16', '#64381c', '#7e4a28', '#9a6238'),
  metal:     ramp('#20242c', '#4a505c', '#6a707c', '#8a909c', '#b0b6c0', '#dfe4ea'),
  steel:     ramp('#101216', '#24282e', '#33383f', '#444a52', '#5c636c', '#7c848e'),
  chrome:    ramp('#30343c', '#6a7280', '#9aa2ae', '#c4cad2', '#e2e6ec', '#ffffff'),
  white:     ramp('#5e5e66', '#a8a8b2', '#c8c8d2', '#e2e2ea', '#f2f2f8', '#ffffff'),
  cream:     ramp('#6a604c', '#b8ac90', '#d4c8aa', '#ece0c4', '#f6eed8', '#fffaf0'),
  red:       ramp('#3a0808', '#7a1414', '#a01e1e', '#c42a2a', '#de4a42', '#f0806a'),
  green:     ramp('#0a2a10', '#145a20', '#1e7a2c', '#2a9a3a', '#4cba52', '#8ade82'),
  mowerRed:  ramp('#3a0a06', '#7a1a10', '#a42818', '#c83a22', '#e45e3c', '#f8987a'),
  blue:      ramp('#0a1e3a', '#163a6a', '#22508e', '#2e68b0', '#5088cc', '#86b2e6'),
  navy:      ramp('#0a1020', '#18223e', '#222e54', '#2e3c6c', '#46568a', '#6e80b0'),
  teal:      ramp('#0a2a2a', '#164848', '#1e6060', '#287a7a', '#3e9898', '#6ec0bc'),
  black:     ramp('#050508', '#121216', '#1c1c22', '#28282e', '#3c3c44', '#56565e'),
  tyre:      ramp('#050505', '#121212', '#1c1c1c', '#262626', '#363636', '#4a4a4a'),
  terracotta:ramp('#3a1608', '#7a3418', '#9a4422', '#b85a30', '#d07a4c', '#e8a070'),
  glaze:     ramp('#0e2a3a', '#1a4a66', '#245e80', '#2e769c', '#4a96ba', '#7ebcd8'),
  stone:     ramp('#3a3a3e', '#6a6a70', '#86868c', '#a2a2a8', '#bcbcc0', '#dadade'),
  sandstone: ramp('#4a3e2a', '#8a7a5a', '#a8966e', '#c4b088', '#d8c6a0', '#ece0c0'),
  cardboard: ramp('#4a2e14', '#8a6034', '#a87a48', '#c49660', '#d8b07c', '#ecd0a4'),
  fabricBlue:ramp('#1a2a4a', '#2a4272', '#34528c', '#4066a8', '#5a82c4', '#86a8dc'),
  fabricMus: ramp('#3a2a08', '#7a5a18', '#9a7424', '#b88e34', '#d0aa50', '#e8c878'),
  fabricRose:ramp('#3a1020', '#6e2240', '#8c3052', '#a84068', '#c4608a', '#e090b0'),
  purple:    ramp('#2a1238', '#4e2266', '#642e82', '#7a3e9c', '#9658b8', '#b882d4'),
  leaf:      ramp('#0e2a12', '#1c4a20', '#26622a', '#327c34', '#4a9a46', '#78c062'),
  hoseGreen: ramp('#0a2a0e', '#14501a', '#1c6a24', '#26862e', '#40a446', '#78cc70'),
  yellow:    ramp('#5a3e00', '#a87400', '#d09a10', '#f2c42a', '#ffdc5a', '#fff0a0'),
  glass:     ramp('#10202e', '#1e3a52', '#2c5272', '#3e6e94', '#6a9ac0', '#b8dcf2'),
};
const OUT = '#14100c';     // general dark outline
const SHINE = '#ffffff';

const furn = (w, h, sw, sh, draw, extra = {}) => ({ w, h, sw, sh, draw, ...extra });

// A market stall: a striped awning on posts over a counter with its goods, and a sign
function drawStall(s, W, H, colour, goods, sign) {
  s.shadow(W / 2, H - 3, W / 2 - 4, 4);
  for (const x of [6, W - 10]) s.part(Shape.rect(x, 14, 4, H - 18), M.timber);           // posts
  s.box(4, H - 42, W - 8, 8, 30, M.timber);                                              // the counter
  for (let x = 8; x < W - 8; x += 10) s.rect(x, H - 32, 1, 26, M.timber.s);
  goods(10, H - 46);
  s.part(Shape.rect(0, 4, W, 18, 2), M.white);                                           // the awning: white
  for (let x = 0; x < W; x += 16) s.part(Shape.rect(x, 4, 8, 18), colour, { merge: false, outline: false }); // and stripes
  for (let x = 2; x < W; x += 8) s.part(Shape.ellipse(x + 2, 22, 4, 3), x % 16 < 8 ? colour : M.white, { merge: false });
  s.part(Shape.rect(W / 2 - 24, H - 30, 48, 10, 1), M.cream, { merge: false });          // the sign
  for (let k = 0; k < Math.min(8, sign.length); k++) s.rect(W / 2 - 20 + k * 5, H - 26, 3, 2, M.darkWood.b);
}
// A food truck: a big van with a serving hatch, an awning, a menu board, wheels and a glow
function drawTruck(s, W, H, colour, name, trim) {
  s.shadow(W / 2, H - 4, W / 2 - 6, 5);
  s.part(Shape.rect(4, 10, W - 8, H - 26, 8), colour);                                   // the body
  s.part(Shape.rect(4, H - 30, W - 8, 8), trim, { merge: false });                       // a stripe
  s.part(Shape.rect(18, 26, W - 52, 34, 2), M.darkWood, { merge: false });               // the hatch, open
  s.part(Shape.rect(20, 28, W - 56, 30, 1), ramp('#5a3a10', '#a87a30', '#d0a050', '#f0c870', '#ffe0a0', '#fff4d8'), { merge: false, outline: false }); // warm light inside
  s.part(Shape.rect(14, 16, W - 44, 10, 2), M.white, { merge: false });                  // awning over it
  for (let x = 14; x < W - 30; x += 12) s.part(Shape.rect(x, 16, 6, 10), trim, { merge: false, outline: false });
  s.part(Shape.rect(W - 30, 22, 20, 30, 2), M.glass, { merge: false });                  // the cab window
  s.part(Shape.rect(24, H - 22, 30, 6, 1), M.steel, { merge: false });                   // the serving shelf
  s.part(Shape.rect(W - 56, 2, 40, 12, 2), M.black, { merge: false });                   // the menu board on the roof
  for (let k = 0; k < Math.min(7, name.length); k++) s.rect(W - 52 + k * 5, 6, 3, 3, M.yellow.h);
  wheel(s, 26, H - 12, 9); wheel(s, W - 28, H - 12, 9);
}

// Small reusable bits
function bolt(s, x, y, r = M.metal) { s.set(x, y, r.h); s.set(x + 1, y + 1, r.d); }
function wheel(s, cx, cy, rad, hub = M.chrome) {
  s.part(Shape.ellipse(cx, cy, rad, rad), M.tyre);
  s.part(Shape.ellipse(cx, cy, rad * 0.5, rad * 0.5), hub, { merge: false });
  s.set(cx - 1, cy - 1, SHINE);
  for (let a = 0; a < 6; a++) s.set(cx + Math.cos(a) * rad * 0.8, cy + Math.sin(a) * rad * 0.8, M.tyre.l); // tread
}
function leafCluster(s, cx, cy, r, leaf = M.leaf, seed = 1) {
  const rng = seeded(seed);
  s.part(Shape.ellipse(cx, cy, r, r * 0.85), leaf);
  for (let i = 0; i < r * 2.2; i++) {
    const a = rng() * Math.PI * 2, d = rng() * r * 0.8;
    s.part(Shape.ellipse(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8 - 1, 2 + rng() * 2.2, 1.6 + rng() * 1.6), leaf, { merge: false, clip: true, outline: false });
  }
  for (let i = 0; i < r; i++) { const a = rng() * 6.28, d = rng() * r * 0.7; s.set(cx + Math.cos(a) * d, cy + Math.sin(a) * d - r * 0.2, leaf.h); }
}
function pot(s, cx, bottom, w, h, r = M.terracotta) {
  // Tapered pot with a rolled rim and soil showing
  s.shadow(cx, bottom - 1, w * 0.55, 3);
  s.part(Shape.poly([[cx - w / 2, bottom - h], [cx + w / 2, bottom - h], [cx + w * 0.36, bottom], [cx - w * 0.36, bottom]]), r);
  s.part(Shape.rect(cx - w / 2 - 1, bottom - h - 1, w + 2, 4, 1), r, { merge: false });
  s.rect(cx - w / 2 + 1, bottom - h, w - 2, 1, '#3a2414');
  s.line(cx - w * 0.3, bottom - h + 5, cx - w * 0.24, bottom - 3, r.l);
}

const FURNITURE = {
  // ======================= Outdoors =======================
  mower: furn(1, 1, 46, 50, (s, W, H) => {
    // Push mower: red deck with vents, engine on top, fabric grass-catcher at the back, U handle
    s.shadow(23, H - 5, 20, 4);
    s.part(Shape.rect(4, H - 30, 22, 18, 3), M.fabricMus);                      // grass-catcher bag
    s.grain(6, H - 28, 18, 14, [M.fabricMus.s, M.fabricMus.l], { horizontal: false, density: 0.25, len: [2, 4] });
    s.line(5, H - 24, 25, H - 24, M.fabricMus.d);
    for (const x of [3, 25]) s.part(Shape.capsule(x, H - 24, x + 2 + (x > 10 ? 2 : -2), H - 48, 1.2), M.steel); // handle uprights
    s.part(Shape.capsule(3, H - 47, 29, H - 47, 1.4), M.steel);                  // handle bar
    s.part(Shape.capsule(5, H - 46, 27, H - 46, 1.6), M.black, { merge: false }); // foam grip
    s.part(Shape.capsule(7, H - 43, 25, H - 43, 0.8), M.chrome, { merge: false }); // control bar
    const top = s.box(12, H - 26, 32, 10, 8, M.mowerRed);                          // deck
    for (let x = 16; x < 40; x += 4) s.rect(x, top + 2, 2, 3, M.mowerRed.d);     // side vents
    s.part(Shape.rect(19, H - 36, 18, 13, 3), M.black);                          // engine block
    s.rect(21, H - 34, 14, 2, M.black.l);
    for (let y = H - 31; y < H - 25; y += 2) s.rect(21, y, 10, 1, M.black.d);    // cooling fins
    s.part(Shape.ellipse(33, H - 33, 2.4, 2), M.yellow);                         // fuel cap
    s.part(Shape.ellipse(24, H - 38, 3, 1.6), M.red, { merge: false });          // pull-cord handle
    s.line(24, H - 37, 27, H - 33, M.black.l);
    s.rect(15, top - 6, 8, 2, M.white.h); s.set(15, top - 6, M.yellow.b);         // decal
    wheel(s, 15, H - 7, 4.5); wheel(s, 40, H - 7, 4.5);
    wheel(s, 12, H - 13, 3.5); wheel(s, 43, H - 13, 3.5);
  }),

  bbq: furn(2, 1, 66, 82, (s, W, H) => {
    // Hooded gas BBQ on a trolley with side shelves, a gas bottle and hanging utensils
    s.shadow(33, H - 4, 30, 5);
    for (const x of [12, 54]) s.part(Shape.rect(x - 2, H - 34, 4, 30), M.steel);  // legs
    wheel(s, 12, H - 6, 4); wheel(s, 54, H - 6, 4);
    s.part(Shape.rect(10, H - 22, 46, 3), M.steel, { merge: false });             // lower shelf
    s.part(Shape.capsule(36, H - 20, 36, H - 9, 6, 6), M.white);                   // gas bottle
    s.part(Shape.ellipse(36, H - 21, 2.5, 1.5), M.metal, { merge: false });
    s.line(32, H - 15, 40, H - 15, M.red.b);
    s.box(2, H - 50, 14, 6, 3, M.timber, { round: 0 });                            // side shelves
    s.box(50, H - 50, 14, 6, 3, M.timber, { round: 0 });
    s.grain(3, H - 49, 12, 4, [M.timber.s], { density: 0.4 });
    s.grain(51, H - 49, 12, 4, [M.timber.s], { density: 0.4 });
    s.box(14, H - 52, 38, 10, 14, M.black);                                         // firebox
    for (let x = 18; x < 48; x += 6) s.part(Shape.ellipse(x + 2, H - 33, 1.5, 1.5), M.chrome, { merge: false }); // knobs
    s.part(Shape.union(Shape.ellipse(33, H - 54, 19, 13), Shape.rect(14, H - 56, 38, 6)), M.black);  // hood
    s.line(18, H - 62, 30, H - 66, M.black.h); s.line(31, H - 66, 38, H - 66, M.black.h);              // hood shine
    s.part(Shape.capsule(24, H - 58, 42, H - 58, 1.4), M.chrome, { merge: false });                    // hood handle
    s.part(Shape.ellipse(33, H - 63, 3, 2.2), M.white, { merge: false });                               // thermometer
    s.set(33, H - 63, M.red.b);
    for (const [x, len] of [[5, 9], [9, 7], [57, 8], [61, 10]]) { s.line(x, H - 44, x, H - 44 + len, M.chrome.s); s.rect(x - 1, H - 44 + len, 3, 2, M.chrome.b); } // utensils
  }),

  outdoorTable: furn(3, 2, 100, 82, (s, W, H) => {
    s.shadow(50, H - 14, 44, 10);
    for (const [x, y] of [[8, H - 34], [88, H - 34], [10, H - 10], [86, H - 10]]) s.part(Shape.rect(x, y - 16, 5, 18), M.timber);
    const ty = s.box(2, 6, 96, 46, 6, M.timber);
    for (let y = 10; y < 50; y += 8) { s.rect(3, y, 94, 1, M.timber.s); }          // slats
    s.grain(3, 8, 94, 44, [M.timber.b, M.timber.h], { density: 0.08 });
    s.line(4, ty + 1, 96, ty + 1, M.timber.h);
  }, { cover: true }),

  chair: furn(1, 1, 32, 60, (s, W, H) => {
    // Slatted chair seen three-quarter: back rest rising above the seat
    s.shadow(16, H - 3, 13, 3);
    for (const x of [6, 25]) s.part(Shape.rect(x, H - 16, 3, 15), M.wood);
    s.part(Shape.rect(5, 2, 22, 24, 3), M.wood);                                    // back
    for (let y = 6; y < 22; y += 5) s.rect(7, y, 18, 2, M.wood.l);                 // back slats
    s.rect(7, 4, 18, 1, M.wood.h);
    s.box(4, H - 32, 24, 14, 4, M.wood);                                             // seat
    s.grain(5, H - 31, 22, 12, [M.wood.b, M.wood.h], { density: 0.12 });
  }),

  lounger: furn(1, 2, 46, 92, (s, W, H) => {
    // Pool lounger: white frame, striped cushion, raised back rest
    s.shadow(23, H - 6, 20, 5);
    s.part(Shape.rect(4, 4, 38, H - 10, 4), M.white);
    s.part(Shape.rect(7, 26, 32, H - 36, 2), M.blue, { merge: false });             // cushion
    for (let y = 30; y < H - 12; y += 8) s.rect(8, y, 30, 3, M.white.h);            // stripes
    s.part(Shape.rect(6, 6, 34, 22, 3), M.blue, { merge: false });                  // back rest
    for (let y = 9; y < 26; y += 6) s.rect(8, y, 30, 2, M.white.h);
    s.rect(8, 7, 30, 1, M.blue.h);
    s.part(Shape.ellipse(23, 13, 8, 4), M.white, { merge: false });                  // rolled towel
    for (const x of [5, 39]) s.rect(x, H - 8, 3, 6, M.white.s);
  }),

  plant: furn(1, 1, 30, 46, (s, W, H) => {
    pot(s, 15, H - 2, 18, 12);
    for (const [x, y, r, sd] of [[9, H - 24, 6, 1], [21, H - 25, 6, 2], [15, H - 33, 7, 3], [15, H - 20, 5, 4]]) leafCluster(s, x, y, r, M.leaf, sd);
  }),
  plantBig: furn(1, 1, 44, 78, (s, W, H) => {
    // Fiddle-leaf fig in a big glazed pot
    pot(s, 22, H - 2, 26, 18, M.glaze);
    s.rect(14, H - 17, 16, 1, M.glaze.h);
    s.part(Shape.capsule(22, H - 20, 21, H - 60, 1.6, 1.2), M.darkWood);
    const leaves = [[12, -58], [31, -62], [16, -46], [29, -48], [12, -34], [32, -34], [22, -70], [20, -40]];
    leaves.forEach(([x, y], i) => {
      s.part(Shape.ellipse(x, H + y, 7, 5), M.leaf, { merge: false });
      s.line(x - 4, H + y + 1, x + 4, H + y - 1, M.leaf.s);
      s.set(x - 2, H + y - 2, M.leaf.h);
    });
  }),
  plantSmall: furn(1, 1, 26, 30, (s, W, H) => {
    pot(s, 13, H - 2, 14, 9);
    for (let i = 0; i < 7; i++) s.part(Shape.capsule(13, H - 11, 6 + i * 2.2, H - 22 - (i % 3) * 3, 1.3, 0.6), M.leaf, { merge: false });
    s.dots([[8, H - 21], [17, H - 23], [12, H - 25]], '#ff8fb1');
  }),
  urn: furn(1, 1, 44, 70, (s, W, H) => {
    // Big stone urn with a clipped ball shrub
    s.shadow(22, H - 2, 18, 4);
    s.part(Shape.union(Shape.ellipse(22, H - 16, 14, 11), Shape.rect(15, H - 8, 14, 6, 1), Shape.rect(6, H - 30, 32, 5, 2)), M.stone);
    s.line(9, H - 28, 35, H - 28, M.stone.h);
    for (let x = 12; x < 34; x += 5) s.line(x, H - 22, x + 1, H - 10, M.stone.s);   // fluting
    leafCluster(s, 22, H - 44, 15, M.leaf, 9);
  }),

  roundTable: furn(2, 2, 92, 120, (s, W, H) => {
    // Round garden table with a striped umbrella overhead
    s.shadow(46, H - 16, 34, 10);
    s.part(Shape.rect(44, 30, 4, H - 46), M.metal);                                   // umbrella pole
    s.part(Shape.ellipse(46, H - 26, 30, 14), M.white);                              // table top
    s.part(Shape.ellipse(46, H - 28, 26, 10), M.white, { merge: false, outline: false });
    s.part(Shape.rect(42, H - 16, 8, 12), M.metal);
    s.part(Shape.ellipse(46, H - 5, 12, 3), M.metal, { merge: false });
    // Umbrella canopy: 8 panels alternating colours
    for (let i = 0; i < 8; i++) {
      const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
      const pts = [[46, 6], [46 + Math.cos(a0) * 44, 30 + Math.sin(a0) * 16], [46 + Math.cos(a1) * 44, 30 + Math.sin(a1) * 16]];
      s.part(Shape.poly(pts), i % 2 ? M.white : M.teal, { merge: false, outline: false });
    }
    s.outlineAll(M.teal.o);
    s.part(Shape.ellipse(46, 6, 3, 2), M.metal, { merge: false });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; s.set(46 + Math.cos(a) * 44, 31 + Math.sin(a) * 16, M.teal.d); }
  }, { cover: true }),

  dogHouse: furn(2, 2, 82, 96, (s, W, H) => {
    // Timber kennel with a shingled pitched roof, arched door, paw-print plate and food bowl
    s.shadow(41, H - 6, 38, 7);
    s.box(8, 34, 66, 10, H - 46, M.timber, { round: 0 });                             // body
    for (let y = 46; y < H - 6; y += 6) s.rect(9, y, 64, 1, M.timber.s);              // weatherboards
    s.grain(9, 46, 64, H - 52, [M.timber.b, M.timber.h], { density: 0.06 });
    s.part(Shape.union(Shape.rect(29, 52, 24, H - 58), Shape.ellipse(41, 53, 12, 10)), M.black, { outline: false });  // door
    s.rect(30, 62, 22, 1, M.black.l);
    s.part(Shape.rect(34, 40, 14, 9, 2), M.cream, { merge: false });                  // name plate
    s.dots([[39, 44], [43, 44], [41, 45], [40, 42], [42, 42]], M.wood.b);               // paw print
    s.part(Shape.poly([[2, 40], [41, 4], [80, 40], [74, 44], [41, 14], [8, 44]]), M.red);  // roof
    for (let y = 14; y < 42; y += 5) s.line(41 - (y - 8), y, 41 + (y - 8), y, M.red.d);    // shingle rows
    s.line(41, 5, 6, 39, M.red.h);
    s.part(Shape.ellipse(68, H - 6, 9, 4), M.steel, { merge: false });                  // bowl
    s.part(Shape.ellipse(68, H - 7, 6, 2), M.wood, { merge: false, outline: false });
  }),

  shed: furn(3, 2, 104, 124, (s, W, H) => {
    // Garden shed: corrugated roof, timber walls, a door with a window, a window box
    s.shadow(52, H - 4, 50, 6);
    s.box(4, 40, 96, 6, H - 46, M.cream, { round: 0 });
    for (let x = 8; x < 98; x += 6) s.line(x, 47, x, H - 3, M.cream.s);               // board seams
    s.part(Shape.rect(58, 54, 30, H - 58, 1), M.green);                                 // door
    s.part(Shape.rect(63, 60, 20, 16, 1), M.glass, { merge: false });
    s.line(73, 60, 73, 75, M.green.l); s.line(63, 68, 82, 68, M.green.l);
    s.part(Shape.ellipse(83, 90, 2, 2), M.yellow, { merge: false });
    s.part(Shape.rect(14, 60, 30, 20, 1), M.glass, { merge: false });                   // window
    s.rect(15, 61, 10, 4, M.glass.h);
    s.box(12, 80, 34, 3, 6, M.wood, { round: 0 });                                      // window box
    for (let x = 15; x < 44; x += 4) { s.set(x, 79, '#e84a6a'); s.set(x + 1, 78, '#ffd84a'); s.set(x, 80, M.leaf.l); }
    s.part(Shape.poly([[0, 44], [10, 6], [94, 6], [104, 44]]), M.steel);               // roof
    for (let x = 6; x < 100; x += 5) s.line(x + 4, 8, x, 42, M.steel.l);                // corrugations
    s.line(10, 7, 94, 7, M.steel.h);
  }),

  hoseReel: furn(1, 1, 38, 38, (s, W, H) => {
    s.shadow(19, H - 3, 16, 4);
    s.part(Shape.union(Shape.rect(6, 6, 4, H - 10), Shape.rect(28, 6, 4, H - 10)), M.green);
    s.part(Shape.ellipse(19, 18, 11, 11), M.green, { merge: false });
    for (let r = 9; r > 3; r -= 2) s.part(Shape.minus(Shape.ellipse(19, 18, r, r), Shape.ellipse(19, 18, r - 1.2, r - 1.2)), M.hoseGreen, { merge: false, outline: false });
    s.part(Shape.ellipse(19, 18, 2.5, 2.5), M.yellow, { merge: false });
    s.part(Shape.capsule(30, 26, 36, H - 4, 1.4), M.hoseGreen, { merge: false });
  }),

  // ---- The market: food stalls (striped awnings over a counter of goods) and food trucks ----
  stallFruit: furn(3, 2, 100, 96, (s, W, H) => drawStall(s, W, H, M.green, (x, y) => {
    for (let k = 0; k < 18; k++) s.part(Shape.ellipse(x + 8 + (k % 6) * 13, y + 4 + Math.floor(k / 6) * 6, 4, 3.5), [M.red, M.green, M.yellow][k % 3], { merge: false });
  }, 'FRUIT & VEG')),
  stallSausage: furn(3, 2, 100, 96, (s, W, H) => drawStall(s, W, H, M.red, (x, y) => {
    s.part(Shape.rect(x + 6, y, 70, 10, 1), M.steel, { merge: false });                  // the hotplate
    for (let k = 0; k < 7; k++) s.part(Shape.capsule(x + 10 + k * 9, y + 3, x + 16 + k * 9, y + 3, 2), ramp('#4a1a10', '#7e2e1a', '#a8442a', '#c85a38', '#e07a52', '#f4a07a'), { merge: false });
    for (let k = 0; k < 4; k++) s.part(Shape.ellipse(x + 20 + k * 14, y - 18 - (k % 2) * 6, 5, 4), ramp('#5a5a62', '#9a9aa4', '#bcbcc4', '#d8d8de', '#ececf0', '#ffffff'), { merge: false, outline: false }); // smoke
  }, 'SAUSAGE SIZZLE')),
  stallBakery: furn(3, 2, 100, 96, (s, W, H) => drawStall(s, W, H, M.fabricMus, (x, y) => {
    for (let k = 0; k < 6; k++) s.part(Shape.ellipse(x + 10 + k * 12, y + 5, 5.5, 4), ramp('#6a4420', '#b07a40', '#d09a58', '#e8b878', '#f4d098', '#fff0c8'), { merge: false });
  }, 'BAKERY')),
  stallCheese: furn(3, 2, 100, 96, (s, W, H) => drawStall(s, W, H, M.blue, (x, y) => {
    for (let k = 0; k < 5; k++) s.part(Shape.poly([[x + 6 + k * 15, y + 9], [x + 18 + k * 15, y + 9], [x + 18 + k * 15, y + 2]]), M.yellow, { merge: false });
  }, 'CHEESE')),
  stallFish: furn(3, 2, 100, 96, (s, W, H) => drawStall(s, W, H, M.teal, (x, y) => {
    s.part(Shape.rect(x + 4, y + 1, 76, 9, 1), M.white, { merge: false });              // ice
    for (let k = 0; k < 5; k++) s.part(Shape.union(Shape.ellipse(x + 13 + k * 15, y + 5, 5, 2.5), Shape.poly([[x + 18 + k * 15, y + 5], [x + 22 + k * 15, y + 2], [x + 22 + k * 15, y + 8]])), M.metal, { merge: false });
  }, 'FISH')),
  truckChips: furn(4, 2, 132, 104, (s, W, H) => drawTruck(s, W, H, M.red, 'HOT CHIPS', M.yellow)),
  truckTaco: furn(4, 2, 132, 104, (s, W, H) => drawTruck(s, W, H, M.teal, 'TACOS', M.fabricRose)),
  truckIceCream: furn(4, 2, 132, 104, (s, W, H) => drawTruck(s, W, H, M.fabricRose, 'ICE CREAM', M.white)),
  truckPizza: furn(4, 2, 132, 104, (s, W, H) => drawTruck(s, W, H, M.green, 'PIZZA', M.red)),
  // A timber picnic table (you can duck underneath)
  picnicTable: furn(2, 1, 76, 50, (s, W, H) => {
    s.shadow(38, H - 3, 34, 4);
    for (const x of [10, 60]) s.part(Shape.poly([[x, 12], [x + 6, 12], [x + 10, H - 4], [x - 4, H - 4]]), M.timber);
    s.box(2, 4, 72, 14, 4, M.timber);
    for (let x = 8; x < 72; x += 12) s.rect(x, 5, 1, 13, M.timber.s);
    s.box(0, H - 22, 76, 4, 3, M.timber);                                                // the bench seats
  }, { cover: true }),
  // The party: a long table of food under a cloth, and bunches of balloons
  partyTable: furn(3, 1, 100, 54, (s, W, H) => {
    s.shadow(50, H - 3, 46, 4);
    s.part(Shape.rect(2, 6, 96, 30, 2), M.white);                                        // tablecloth
    for (let x = 6; x < 96; x += 10) s.part(Shape.poly([[x, 36], [x + 5, 36], [x + 2.5, 44]]), M.fabricRose, { merge: false });
    s.part(Shape.ellipse(20, 14, 10, 5), M.cream, { merge: false });                     // the cake
    s.part(Shape.rect(12, 6, 16, 8, 2), ramp('#8a6a7a', '#d8aec0', '#f0c8d8', '#fce0ec', '#fff0f6', '#ffffff'), { merge: false });
    for (const x of [15, 20, 25]) { s.rect(x, 2, 1, 4, M.blue.h); s.set(x, 1, '#ffd84a'); } // candles
    s.part(Shape.ellipse(48, 16, 9, 5), M.white, { merge: false });                      // sandwiches
    for (const x of [43, 48, 53]) s.part(Shape.poly([[x - 3, 18], [x + 3, 18], [x, 12]]), ramp('#6a4420', '#b07a40', '#d09a58', '#e8b878', '#f4d098', '#fff0c8'), { merge: false });
    s.part(Shape.ellipse(78, 16, 10, 5), M.white, { merge: false });                     // cheese and sausage rolls
    for (let k = 0; k < 4; k++) s.part(Shape.capsule(71 + k * 4, 15, 73 + k * 4, 17, 1.6), k % 2 ? M.yellow : ramp('#6a3a18', '#a8643a', '#c8845a', '#e0a47a', '#f0c49a', '#fce4c4'), { merge: false });
  }, { cover: true }),
  balloons: furn(1, 1, 34, 70, (s, W, H) => {
    for (const [x, y, c] of [[10, 12, M.red], [22, 10, M.blue], [16, 22, M.yellow], [26, 24, M.fabricRose]]) {
      s.line(x, y + 6, 17, H - 4, M.white.s);
      s.part(Shape.ellipse(x, y, 6, 7), c, { merge: false });
      s.set(x - 2, y - 3, '#ffffff');
    }
    s.part(Shape.rect(14, H - 6, 6, 4, 1), M.metal, { merge: false });                   // a little weight
  }, { decor: true }),
  // A traffic cone: orange with white reflective bands
  cone: furn(1, 1, 22, 30, (s, W, H) => {
    const orange = ramp('#4a1a04', '#8a3008', '#c04a10', '#e86a1c', '#f89040', '#ffc080');
    s.shadow(11, H - 2, 9, 2);
    s.part(Shape.rect(2, H - 5, 18, 4, 1), orange);                                       // the square base
    s.part(Shape.poly([[7, H - 6], [15, H - 6], [12, 2], [10, 2]]), orange, { merge: false });
    s.part(Shape.poly([[8, H - 12], [14, H - 12], [13.4, H - 15], [8.6, H - 15]]), M.white, { merge: false, outline: false });
    s.part(Shape.poly([[9, H - 19], [13, H - 19], [12.6, H - 21], [9.4, H - 21]]), M.white, { merge: false, outline: false });
    s.line(10, 4, 8, H - 7, orange.h);
  }),
  // A green wheelie bin, lid shut, with a handle and wheels
  wheelieBin: furn(1, 1, 30, 50, (s, W, H) => {
    s.shadow(15, H - 2, 12, 2);
    s.part(Shape.poly([[4, 10], [26, 10], [24, H - 6], [6, H - 6]]), M.green);
    s.box(2, 5, 26, 4, 3, M.green);                                                      // the lid
    s.part(Shape.rect(9, 2, 12, 3, 1), M.black, { merge: false });                       // handle
    s.line(8, 14, 9, H - 9, M.green.h);
    wheel(s, 7, H - 5, 3); wheel(s, 23, H - 5, 3);
    s.part(Shape.rect(11, 18, 8, 5, 1), M.white, { merge: false });                      // a sticker with the house number
  }),
  // A white plastic garden chair
  gardenChair: furn(1, 1, 30, 44, (s, W, H) => {
    s.shadow(15, H - 2, 12, 2);
    for (const x of [5, 24]) s.part(Shape.rect(x, H - 16, 3, 14, 1), M.white);          // legs
    s.part(Shape.rect(3, H - 20, 24, 5, 2), M.white, { merge: false });                 // seat
    s.part(Shape.rect(5, 4, 20, 18, 4), M.white, { merge: false });                     // back
    for (let x = 9; x < 23; x += 4) s.line(x, 8, x, 18, M.white.s);                      // slats
  }),
  gnome: furn(1, 1, 24, 40, (s, W, H) => {
    s.shadow(12, H - 2, 9, 2);
    s.part(Shape.ellipse(12, H - 10, 8, 8), M.blue);                                     // coat
    s.part(Shape.rect(4, H - 5, 16, 3, 1), M.darkWood, { merge: false });              // boots
    s.part(Shape.poly([[6, H - 14], [18, H - 14], [12, H - 2]]), M.white, { merge: false });  // beard
    s.part(Shape.ellipse(12, H - 17, 4, 3.5), ramp('#7a4a32', '#b9785a', '#d99a7a', '#f0bc98', '#f8d4b6', '#ffe8d6'), { merge: false }); // face
    s.set(12, H - 16, '#e05a5a');
    s.part(Shape.poly([[5, H - 19], [19, H - 19], [13, H - 38]]), M.red, { merge: false });  // pointy hat
    s.line(13, H - 36, 8, H - 21, M.red.h);
  }),

  rotaryLine: furn(1, 1, 124, 116, (s, W, H) => {
    // An Aussie rotary clothesline: centre pole, arms and lines with washing pegged on
    s.shadow(62, H - 4, 50, 8, 0.18);
    s.part(Shape.rect(60, 26, 4, H - 28), M.metal);
    s.part(Shape.ellipse(62, H - 3, 5, 2), M.metal, { merge: false });
    const cx = 62, cy = 26;
    for (const [dx, dy] of [[1, 0.35], [-1, 0.35], [0.45, -0.3], [-0.45, -0.3]]) s.line(cx, cy, cx + dx * 58, cy + dy * 40, M.metal.b);
    for (const k of [0.4, 0.7, 1]) { // rings of line
      const pts = [[1, 0.35], [0.45, -0.3], [-0.45, -0.3], [-1, 0.35], [0, 0.75]];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        s.line(cx + ax * 58 * k, cy + ay * 40 * k, cx + bx * 58 * k, cy + by * 40 * k, M.white.s);
      }
    }
    const clothes = [[24, 34, M.red], [44, 22, M.blue], [80, 22, M.yellow], [98, 34, M.fabricRose], [62, 50, M.white], [36, 44, M.teal], [88, 44, M.green]];
    clothes.forEach(([x, y, r], i) => {
      if (i % 2) s.part(Shape.union(Shape.rect(x - 7, y, 14, 10, 1), Shape.rect(x - 9, y, 4, 5), Shape.rect(x + 5, y, 4, 5)), r, { merge: false }); // t-shirt
      else s.part(Shape.union(Shape.rect(x - 6, y, 12, 4), Shape.rect(x - 6, y + 3, 5, 9), Shape.rect(x + 1, y + 3, 5, 9)), r, { merge: false }); // shorts
      s.dots([[x - 4, y - 1], [x + 3, y - 1]], M.yellow.b); // pegs
    });
  }, { cover: true }),

  hive: furn(1, 1, 40, 64, (s, W, H) => {
    // Langstroth hive: stand, brood box, honey super, telescoping lid, entrance with honey drips
    s.shadow(20, H - 2, 18, 3);
    for (const x of [6, 32]) s.part(Shape.rect(x, H - 9, 3, 8), M.wood);
    s.box(2, H - 13, 36, 3, 3, M.wood, { round: 0 });                                   // landing board
    const box = ramp('#6a5a2a', '#b8a868', '#d4c486', '#ece0a8', '#f6eec6', '#fffae4');
    s.box(4, H - 38, 32, 2, 24, box, { round: 0 });                                     // brood box
    s.box(4, H - 54, 32, 2, 16, box, { round: 0 });                                     // honey super
    s.rect(5, H - 37, 30, 1, box.s); s.rect(5, H - 53, 30, 1, box.s);
    for (const y of [H - 27, H - 46]) { s.part(Shape.rect(16, y, 8, 3, 1), box, { merge: false }); s.rect(17, y + 1, 6, 1, box.d); } // hand holds
    s.box(1, H - 62, 38, 4, 5, M.chrome, { round: 0 });                                 // lid
    s.rect(10, H - 16, 20, 2, '#1a1008');                                                 // entrance
    const honey = ramp('#5a2a00', '#a85a08', '#d0820e', '#eea020', '#f8c050', '#fff0a0');
    for (const [x, len] of [[13, 5], [18, 8], [24, 4], [27, 6]]) s.part(Shape.capsule(x, H - 14, x, H - 14 + len, 0.9, 1.3), honey, { outline: false, merge: false });
    s.dots([[15, H - 15], [22, H - 15]], '#f2c42a');
  }),

  fountain: furn(2, 2, 92, 108, (s, W, H) => {
    // Two-tier stone fountain (the water is animated in the game)
    s.shadow(46, H - 10, 44, 10);
    s.part(Shape.ellipse(46, H - 22, 44, 18), M.stone);                                   // basin rim
    s.part(Shape.ellipse(46, H - 24, 38, 13), M.glass, { merge: false });                 // water
    s.part(Shape.union(Shape.rect(4, H - 22, 84, 12), Shape.ellipse(46, H - 10, 42, 8)), M.stone, { merge: false });  // basin wall
    for (let x = 10; x < 86; x += 10) s.line(x, H - 18, x, H - 6, M.stone.s);
    s.part(Shape.rect(40, H - 64, 12, 42, 2), M.stone);                                   // column
    s.part(Shape.ellipse(46, H - 66, 22, 8), M.stone, { merge: false });                  // upper bowl
    s.part(Shape.ellipse(46, H - 68, 18, 5), M.glass, { merge: false });
    s.part(Shape.rect(43, H - 86, 6, 18, 2), M.stone, { merge: false });                  // spout
    s.part(Shape.ellipse(46, H - 88, 5, 4), M.stone, { merge: false });
    s.rect(10, H - 26, 70, 1, M.glass.h); s.rect(34, H - 69, 22, 1, M.glass.h);
  }),

  statue: furn(1, 1, 44, 90, (s, W, H) => {
    // A stone Staffy sitting proudly on a plinth
    s.shadow(22, H - 2, 20, 4);
    s.box(4, H - 30, 36, 6, 24, M.sandstone, { round: 0 });                              // plinth
    s.rect(6, H - 14, 32, 1, M.sandstone.s);
    s.part(Shape.rect(14, H - 22, 16, 6, 1), M.sandstone.s ? ramp(M.sandstone.o, M.sandstone.d, M.sandstone.s, M.sandstone.b, M.sandstone.l, M.sandstone.h) : M.sandstone, { merge: false }); // plaque
    s.dots([[17, H - 20], [20, H - 20], [23, H - 20], [26, H - 20]], M.sandstone.d);
    const St = M.stone;
    s.part(Shape.union(Shape.ellipse(22, H - 44, 12, 12), Shape.rect(12, H - 40, 20, 10)), St);  // body sitting
    s.part(Shape.union(Shape.capsule(16, H - 44, 16, H - 31, 3), Shape.capsule(28, H - 44, 28, H - 31, 3)), St, { merge: false }); // front legs
    s.part(Shape.union(Shape.ellipse(22, H - 66, 11, 10), Shape.ellipse(22, H - 60, 8, 6)), St, { merge: false }); // head
    // Folded rose ears, broad cheeks and a wide muzzle (a Staffy, not a cat)
    s.part(Shape.ellipse(12, H - 72, 4, 3), St, { merge: false }); s.part(Shape.ellipse(32, H - 72, 4, 3), St, { merge: false });
    s.part(Shape.ellipse(22, H - 60, 7, 4.5), St, { merge: false });
    s.dots([[17, H - 67], [27, H - 67]], St.o); s.rect(20, H - 63, 4, 2, St.o); s.line(19, H - 59, 25, H - 59, St.d);
    s.line(15, H - 74, 29, H - 74, St.h);
  }),

  trellisPanel: furn(2, 1, 66, 96, (s, W, H) => {
    // Timber lattice panel with climbing roses
    s.shadow(33, H - 2, 30, 3);
    for (const x of [4, 60]) s.part(Shape.rect(x, 4, 4, H - 6), M.wood);
    for (let i = -8; i < 12; i++) { s.line(8 + i * 6, 6, 8 + i * 6 + 50, H - 4, M.wood.l); s.line(8 + i * 6 + 50, 6, 8 + i * 6, H - 4, M.wood.b); }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if ((x < 8 || x > 59) && !(x >= 4 && x < 8) && !(x >= 60 && x < 64)) s.erase(x, y);
    const rng = seeded(4);
    for (let i = 0; i < 26; i++) {
      const x = 10 + rng() * 48, y = 8 + rng() * (H - 20);
      s.part(Shape.ellipse(x, y, 4, 3), M.leaf, { merge: false });
      if (i % 3 === 0) { s.part(Shape.ellipse(x + 1, y - 1, 2.2, 2.2), M.fabricRose, { merge: false }); s.set(x + 1, y - 1, '#ffd0e0'); }
    }
  }),

  arch: furn(1, 1, 96, 104, (s, W, H) => {
    // Garden arch with climbing vines; you walk underneath it
    for (const x of [6, 86]) s.part(Shape.rect(x, 26, 4, H - 28), M.wood);
    s.part(Shape.minus(Shape.ellipse(48, 30, 44, 28), Shape.ellipse(48, 32, 38, 23)), M.wood);
    s.part(Shape.rect(6, 28, 84, 4), M.wood, { merge: false });
    const rng = seeded(8);
    for (let i = 0; i < 34; i++) {
      const a = Math.PI + rng() * Math.PI, x = 48 + Math.cos(a) * (41 + rng() * 4), y = 30 + Math.sin(a) * (26 + rng() * 3);
      s.part(Shape.ellipse(x, y, 4, 3), M.leaf, { merge: false });
      if (i % 4 === 0) s.part(Shape.ellipse(x, y - 1, 2, 2), M.purple, { merge: false });
    }
    for (let i = 0; i < 14; i++) { const x = rng() < 0.5 ? 8 : 88, y = 34 + rng() * (H - 40); s.part(Shape.ellipse(x, y, 3.5, 3), M.leaf, { merge: false }); }
  }, { decor: true, overhead: true }),

  bench: furn(2, 1, 76, 56, (s, W, H) => {
    s.shadow(38, H - 3, 34, 4);
    for (const x of [8, 64]) s.part(Shape.union(Shape.rect(x, 4, 4, H - 6), Shape.rect(x - 2, H - 22, 8, 4)), M.steel);
    s.part(Shape.rect(6, 4, 64, 20, 2), M.timber);
    for (let y = 8; y < 22; y += 5) s.rect(7, y, 62, 1, M.timber.s);
    s.box(4, H - 28, 68, 12, 4, M.timber);
    for (let x = 8; x < 70; x += 12) s.rect(x, H - 27, 1, 11, M.timber.s);
    s.grain(5, 6, 66, 16, [M.timber.h], { density: 0.05 });
  }),

  wheelbarrow: furn(2, 1, 70, 46, (s, W, H) => {
    s.shadow(34, H - 3, 30, 4);
    s.part(Shape.union(Shape.capsule(6, H - 18, 30, H - 14, 1.5), Shape.capsule(6, H - 10, 30, H - 12, 1.5)), M.wood); // handles
    s.part(Shape.poly([[20, H - 34], [64, H - 34], [56, H - 12], [28, H - 12]]), M.green);  // tray
    s.part(Shape.poly([[22, H - 33], [62, H - 33], [58, H - 27], [26, H - 27]]), ramp('#2a1a0c', '#4a2e18', '#5c3a20', '#6e4a2c', '#86603a', '#9e784c'), { merge: false }); // soil
    s.line(24, H - 30, 58, H - 22, M.green.h);
    wheel(s, 58, H - 8, 6);
    s.part(Shape.capsule(30, H - 12, 30, H - 4, 1.2), M.steel, { merge: false });
  }),

  birdBath: furn(1, 1, 40, 54, (s, W, H) => {
    s.shadow(20, H - 2, 14, 3);
    s.part(Shape.union(Shape.rect(15, 18, 10, H - 22, 2), Shape.ellipse(20, H - 4, 10, 4)), M.stone);
    s.part(Shape.ellipse(20, 16, 18, 8), M.stone, { merge: false });
    s.part(Shape.ellipse(20, 14, 14, 5), M.glass, { merge: false });
    s.rect(12, 13, 10, 1, M.glass.h);
    for (let y = 26; y < H - 8; y += 5) s.line(16, y, 24, y, M.stone.s);
  }),

  scarecrow: furn(1, 1, 52, 92, (s, W, H) => {
    s.part(Shape.rect(24, 20, 4, H - 20), M.wood);
    s.part(Shape.rect(4, 36, 44, 4), M.wood, { merge: false });
    s.part(Shape.union(Shape.rect(14, 34, 24, 28, 3), Shape.capsule(6, 38, 14, 40, 4), Shape.capsule(46, 38, 38, 40, 4)), M.fabricBlue, { merge: false }); // shirt
    for (let i = 0; i < 4; i++) s.line(16 + i * 6, 36, 16 + i * 6, 60, M.fabricBlue.s);
    s.part(Shape.union(Shape.rect(15, 60, 10, 18, 1), Shape.rect(27, 60, 10, 18, 1)), M.fabricMus, { merge: false }); // trousers
    for (const [x, y] of [[4, 40], [48, 40], [20, 78], [32, 78], [26, 32]]) for (let k = 0; k < 4; k++) s.line(x, y, x + (k - 1.5) * 2, y + 4, M.yellow.l); // straw
    s.part(Shape.ellipse(26, 24, 9, 9), M.cardboard, { merge: false });                  // sack head
    s.dots([[22, 23], [30, 23]], M.black.b); s.line(22, 28, 30, 28, M.black.b);
    s.part(Shape.union(Shape.ellipse(26, 15, 15, 4), Shape.rect(19, 4, 14, 11, 3)), M.fabricMus, { merge: false }); // hat
    s.rect(19, 12, 14, 2, M.red.b);
  }),

  wateringCan: furn(1, 1, 30, 24, (s, W, H) => {
    s.shadow(15, H - 2, 12, 2);
    s.part(Shape.union(Shape.rect(5, 8, 16, 13, 2), Shape.capsule(20, 16, 28, 6, 1.6)), M.green);
    s.part(Shape.minus(Shape.ellipse(13, 8, 7, 6), Shape.ellipse(13, 8, 5, 4)), M.green, { merge: false });
    s.part(Shape.ellipse(28, 5, 2.5, 2), M.green, { merge: false });
    s.line(7, 11, 7, 18, M.green.h);
  }, { decor: true }),

  poolRing: furn(1, 1, 40, 30, (s, W, H) => {
    // An inflatable ring floating in the pool (the game bobs it gently)
    const ring = Shape.minus(Shape.ellipse(20, 15, 17, 11), Shape.ellipse(20, 14, 8, 4.5));
    s.part(ring, M.red);
    // White segments every quarter turn
    const white = withBox((x, y) => ring(x, y) && Math.floor((Math.atan2(y + 0.5 - 15, (x + 0.5 - 20) * 0.65) + Math.PI) / (Math.PI / 4)) % 2 === 0, ring.box);
    s.part(white, M.white, { merge: false, outline: false });
    s.line(9, 7, 15, 5, M.white.h); s.set(33, 10, SHINE);
  }, { decor: true, bob: true }),
  lilo: furn(2, 1, 66, 34, (s, W, H) => {
    s.part(Shape.rect(2, 4, 62, 24, 8), M.yellow);
    for (let x = 12; x < 58; x += 8) s.line(x, 6, x, 25, M.yellow.s);
    s.part(Shape.rect(4, 6, 12, 20, 6), M.yellow, { merge: false });       // pillow end
    s.line(6, 6, 58, 6, M.yellow.h);
  }, { decor: true, bob: true }),
  sprinklerProp: furn(1, 1, 20, 18, () => {}, { decor: true }), // drawn by the game (animated)

  // ======================= House =======================
  sofa: furn(4, 1, 132, 76, (s, W, H) => {
    const F = M.fabricBlue;
    s.shadow(66, H - 3, 62, 4);
    s.part(Shape.rect(6, 2, W - 12, 36, 8), F);                                         // back
    for (const x of [44, 88]) s.line(x, 6, x, 34, F.s);
    s.box(10, 32, W - 20, 18, 14, F, { round: 2 });                                     // seat cushions
    for (const x of [46, 88]) s.line(x, 33, x, 62, F.d);
    s.part(Shape.rect(0, 18, 16, H - 22, 6), F, { merge: false });                      // arms
    s.part(Shape.rect(W - 16, 18, 16, H - 22, 6), F, { merge: false });
    s.part(Shape.rect(24, 14, 20, 18, 4), M.fabricMus, { merge: false });               // cushions
    s.part(Shape.rect(92, 14, 18, 18, 4), M.fabricRose, { merge: false });
    s.grain(10, 4, W - 20, 30, [F.l], { density: 0.04 });
    for (const x of [6, W - 10]) s.rect(x, H - 4, 4, 4, M.darkWood.b);
  }),
  armchair: furn(2, 1, 60, 66, (s, W, H) => {
    const F = M.fabricMus;
    s.shadow(30, H - 3, 28, 4);
    s.part(Shape.rect(6, 2, 48, 32, 8), F);
    s.box(10, 28, 40, 16, 14, F, { round: 2 });
    s.part(Shape.rect(0, 16, 14, H - 20, 6), F, { merge: false });
    s.part(Shape.rect(W - 14, 16, 14, H - 20, 6), F, { merge: false });
    s.grain(8, 4, 44, 26, [F.l, F.s], { density: 0.06 });
    s.part(Shape.rect(20, 12, 20, 14, 4), M.teal, { merge: false });
  }),
  coffeeTable: furn(2, 1, 76, 46, (s, W, H) => {
    s.shadow(38, H - 3, 34, 4);
    for (const x of [6, 66]) s.part(Shape.rect(x, 16, 4, H - 18), M.wood);
    s.box(2, 4, 72, 18, 6, M.wood);
    s.grain(3, 5, 70, 16, [M.wood.b, M.wood.h], { density: 0.1 });
    s.part(Shape.rect(12, 8, 16, 10, 1), M.white, { merge: false }); s.rect(14, 10, 12, 1, M.red.b); // magazine
    s.part(Shape.ellipse(54, 12, 5, 3.5), M.white, { merge: false }); s.part(Shape.ellipse(54, 11, 3, 2), M.darkWood, { merge: false, outline: false }); // mug
  }, { cover: true }),
  diningTable: furn(3, 2, 100, 84, (s, W, H) => {
    s.shadow(50, H - 12, 46, 10);
    for (const [x, y] of [[8, H - 18], [88, H - 18], [8, 60], [88, 60]]) s.part(Shape.rect(x, y - 22, 5, 24), M.wood);
    s.box(2, 6, 96, 48, 7, M.wood);
    s.grain(3, 7, 94, 46, [M.wood.b, M.wood.h], { density: 0.08 });
    s.part(Shape.rect(14, 14, 72, 32, 2), M.cream, { merge: false });                  // table runner/cloth
    for (const x of [28, 72]) { s.part(Shape.ellipse(x, 30, 9, 6), M.white, { merge: false }); s.part(Shape.ellipse(x, 30, 5, 3), M.cream, { merge: false, outline: false }); }
    s.part(Shape.capsule(50, 22, 50, 34, 2.2), M.glass, { merge: false }); s.part(Shape.ellipse(50, 20, 4, 3), M.fabricRose, { merge: false }); // vase of flowers
  }, { cover: true }),
  bed: furn(3, 3, 100, 136, (s, W, H) => {
    s.shadow(50, H - 3, 48, 4);
    s.box(2, 2, 96, 6, 22, M.darkWood);                                                  // headboard
    s.grain(3, 9, 94, 14, [M.darkWood.l], { density: 0.08 });
    s.part(Shape.rect(4, 20, 92, H - 26, 4), M.white);                                   // mattress/sheet
    s.part(Shape.rect(4, 56, 92, H - 62, 4), M.purple, { merge: false });               // duvet
    for (let y = 64; y < H - 10; y += 14) s.line(6, y, 94, y + 2, M.purple.s);
    s.line(6, 58, 94, 58, M.purple.h);
    for (const x of [12, 54]) { s.part(Shape.rect(x, 26, 34, 22, 6), M.white, { merge: false }); s.line(x + 4, 40, x + 30, 40, M.white.s); }
    s.rect(4, H - 8, 92, 6, M.darkWood.b); s.rect(4, H - 8, 92, 1, M.darkWood.l);
  }),
  wardrobe: furn(2, 1, 72, 104, (s, W, H) => {
    s.shadow(36, H - 2, 34, 3);
    s.box(2, 2, 68, 6, H - 6, M.wood, { round: 0 });
    s.line(36, 10, 36, H - 8, M.wood.o);
    for (const x of [8, 40]) { s.rect(x, 14, 24, H - 30, M.wood.s); s.rect(x + 1, 15, 22, H - 32, M.wood.b); }
    s.grain(9, 15, 54, H - 32, [M.wood.l], { horizontal: false, density: 0.06 });
    s.dots([[33, 52], [39, 52], [33, 53], [39, 53]], M.yellow.l);
    s.rect(4, H - 8, 64, 4, M.wood.d);
  }),
  dresser: furn(2, 1, 72, 70, (s, W, H) => {
    s.shadow(36, H - 2, 34, 3);
    s.box(2, 20, 68, 8, H - 26, M.wood, { round: 0 });
    for (let y = 32; y < H - 8; y += 12) { s.rect(6, y, 60, 10, M.wood.s); s.rect(7, y + 1, 58, 8, M.wood.b); s.dots([[22, y + 5], [50, y + 5]], M.yellow.l); }
    s.part(Shape.rect(46, 4, 18, 18, 2), M.glass, { merge: false });                    // mirror frame
    s.part(Shape.ellipse(14, 16, 5, 6), M.white, { merge: false }); s.part(Shape.ellipse(14, 9, 3, 3), M.fabricRose, { merge: false }); // vase
  }),
  bookshelf: furn(2, 1, 72, 110, (s, W, H) => {
    s.shadow(36, H - 2, 34, 3);
    s.box(2, 2, 68, 4, H - 4, M.wood, { round: 0 });
    const colours = [M.red, M.blue, M.green, M.yellow, M.purple, M.teal, M.fabricRose, M.cream];
    const rng = seeded(21);
    for (let row = 0; row < 4; row++) {
      const y = 10 + row * 24;
      s.rect(5, y, 62, 20, M.darkWood.d);
      let x = 6;
      while (x < 64) {
        const w = 3 + Math.floor(rng() * 3), h = 13 + Math.floor(rng() * 6), c = colours[Math.floor(rng() * colours.length)];
        if (x + w > 66) break;
        if (rng() < 0.12) { s.part(Shape.poly([[x, y + 19], [x + 3, y + 19], [x + 10, y + 7], [x + 7, y + 6]]), c, { merge: false }); x += 10; continue; } // leaning book
        s.rect(x, y + 20 - h, w, h, c.b); s.rect(x, y + 20 - h, 1, h, c.l); s.rect(x, y + 22 - h, w, 1, c.h);
        x += w + (rng() < 0.2 ? 1 : 0);
      }
      s.rect(4, y + 20, 64, 3, M.wood.l);
    }
  }),
  counter: furn(1, 1, 32, 66, (s, W, H) => {
    s.box(0, 14, 32, 10, H - 24, M.white, { round: 0 });
    s.rect(0, 14, 32, 10, '#3e3e46'); s.rect(0, 14, 32, 1, '#6a6a76'); s.rect(0, 23, 32, 1, '#2a2a30');  // stone benchtop
    s.speckle(0, 15, 32, 8, ['#54545e', '#2e2e36'], 18);
    s.rect(2, 28, 28, H - 32, M.white.s); s.rect(3, 29, 26, H - 34, M.white.b);
    s.line(16, 29, 16, H - 6, M.white.s);
    s.rect(12, 34, 2, 6, M.chrome.b); s.rect(18, 34, 2, 6, M.chrome.b);
    s.part(Shape.ellipse(10, 10, 3, 4), M.terracotta, { merge: false }); s.part(Shape.ellipse(10, 5, 3, 3), M.leaf, { merge: false }); // little herb pot
  }),
  stove: furn(1, 1, 32, 66, (s, W, H) => {
    s.box(0, 14, 32, 10, H - 24, M.chrome, { round: 0 });
    s.rect(0, 14, 32, 10, '#18181e');
    for (const [x, y] of [[8, 17], [24, 17], [8, 21], [24, 21]]) s.part(Shape.minus(Shape.ellipse(x, y, 4, 2), Shape.ellipse(x, y, 2, 1)), M.black, { merge: false });
    s.part(Shape.rect(4, 30, 24, 20, 2), M.black, { merge: false }); s.part(Shape.rect(6, 33, 20, 14, 1), M.glass, { merge: false });
    s.rect(4, 28, 24, 1, M.chrome.d);
    for (let x = 6; x < 28; x += 5) s.part(Shape.ellipse(x, 26, 1.4, 1.4), M.black, { merge: false });
    s.part(Shape.ellipse(16, 8, 7, 4), M.steel, { merge: false });                      // pot on the stove
    s.rect(9, 6, 14, 1, M.steel.h);
  }),
  sink: furn(1, 1, 32, 66, (s, W, H) => {
    FURNITURE.counter.draw(s, W, H);
    s.rect(4, 15, 24, 8, M.chrome.s); s.rect(5, 16, 22, 6, M.chrome.d); s.rect(5, 16, 22, 1, M.chrome.h);
    s.part(Shape.union(Shape.capsule(16, 15, 16, 6, 1.2), Shape.capsule(16, 6, 21, 6, 1.2)), M.chrome, { merge: false });
    s.erase(8, 2, 6, 8);
  }),
  fridge: furn(1, 1, 36, 98, (s, W, H) => {
    s.shadow(18, H - 2, 16, 2);
    s.box(1, 2, 34, 6, H - 6, M.white, { round: 2 });
    s.line(3, 38, 32, 38, M.white.s);
    for (const [y0, y1] of [[14, 32], [44, 80]]) s.part(Shape.rect(28, y0, 2.5, y1 - y0, 1), M.chrome, { merge: false });
    for (const [x, y, c] of [[8, 16, M.yellow], [16, 22, M.red], [10, 48, M.blue], [18, 56, M.green]]) s.rect(x, y, 5, 5, c.b);
    s.part(Shape.rect(8, 60, 12, 14, 1), M.white, { merge: false }); s.line(10, 64, 18, 64, M.blue.b); s.line(10, 67, 16, 67, M.blue.b); // a drawing stuck on
  }),
  island: furn(3, 1, 100, 70, (s, W, H) => {
    s.shadow(50, H - 2, 48, 3);
    s.box(0, 8, 100, 14, H - 22, M.wood, { round: 1 });
    s.rect(1, 9, 98, 12, '#3e3e46'); s.rect(1, 9, 98, 1, '#6a6a76'); s.speckle(1, 10, 98, 11, ['#54545e', '#2e2e36'], 60);
    for (let x = 6; x < 96; x += 22) { s.rect(x, 26, 20, H - 32, M.wood.s); s.rect(x + 1, 27, 18, H - 34, M.wood.b); s.rect(x + 8, 32, 4, 2, M.chrome.b); }
    s.part(Shape.ellipse(26, 14, 8, 4), M.white, { merge: false }); for (const [x, c] of [[23, '#e8394a'], [27, '#f2c42a'], [29, '#5cbc52']]) s.part(Shape.ellipse(x, 12, 2.4, 2.2), solid(c), { merge: false, outline: false }); // fruit bowl
    s.part(Shape.rect(70, 8, 14, 10, 1), M.cardboard, { merge: false }); // bread board
  }),
  tvUnit: furn(3, 1, 104, 96, (s, W, H) => {
    s.shadow(52, H - 2, 50, 3);
    s.box(2, H - 36, 100, 6, 32, M.darkWood, { round: 0 });
    for (const x of [6, 54]) { s.rect(x, H - 26, 44, 20, M.darkWood.d); s.rect(x + 1, H - 25, 42, 18, M.darkWood.b); }
    s.rect(20, H - 22, 18, 10, M.black.b); s.rect(22, H - 20, 4, 2, '#3ae06a');           // console in the cabinet
    s.part(Shape.rect(46, H - 44, 12, 9), M.black);                                        // stand
    s.part(Shape.rect(10, 4, 84, 50, 2), M.black, { merge: false });                       // the TV
    s.rect(13, 7, 78, 44, '#141a24');
    s.line(14, 8, 30, 8, '#2a3446');
    for (const x of [2, 96]) s.part(Shape.rect(x, H - 54, 6, 20, 2), M.black, { merge: false }); // speakers
  }),
  washer: furn(1, 1, 36, 54, (s, W, H) => {
    s.shadow(18, H - 2, 16, 2);
    s.box(1, 2, 34, 8, H - 10, M.white, { round: 2 });
    s.rect(4, 12, 28, 6, M.white.s); s.rect(6, 14, 6, 2, '#3ae06a'); s.part(Shape.ellipse(26, 15, 2.4, 2.4), M.chrome, { merge: false });
    s.part(Shape.ellipse(18, 33, 11, 11), M.chrome, { merge: false });
    s.part(Shape.ellipse(18, 33, 8, 8), M.glass, { merge: false });
    s.part(Shape.ellipse(17, 36, 5, 3), M.fabricRose, { merge: false, outline: false });  // clothes inside
    s.line(13, 28, 16, 26, M.glass.h);
  }),
  bathtub: furn(3, 2, 100, 78, (s, W, H) => {
    s.shadow(50, H - 2, 48, 4);
    s.part(Shape.rect(2, 4, 96, H - 8, 14), M.white);
    s.part(Shape.rect(8, 10, 84, H - 22, 10), M.glass, { merge: false });
    s.part(Shape.rect(10, 12, 80, 12, 6), ramp('#9ab8cc', '#c4dcea', '#d8eaf4', '#eaf4fa', '#f6fbfe', '#ffffff'), { merge: false, outline: false }); // bubbles
    for (let i = 0; i < 18; i++) s.part(Shape.ellipse(14 + i * 4.3, 18 + (i % 3), 2.5, 2.2), M.white, { merge: false, outline: false });
    s.part(Shape.union(Shape.capsule(90, 8, 90, 2, 1.4), Shape.capsule(90, 2, 84, 2, 1.4)), M.chrome, { merge: false });
    s.part(Shape.ellipse(24, 34, 4, 3), M.yellow, { merge: false }); s.set(26, 33, '#e05a20');  // rubber duck
    for (const x of [8, 88]) s.part(Shape.ellipse(x, H - 3, 3, 2), M.chrome, { merge: false });
  }),
  toilet: furn(1, 1, 30, 52, (s, W, H) => {
    s.shadow(15, H - 2, 12, 2);
    s.box(3, 2, 24, 6, 14, M.white);                                                       // cistern
    s.part(Shape.ellipse(15, 5, 2, 1.2), M.chrome, { merge: false });
    s.part(Shape.union(Shape.ellipse(15, 32, 11, 10), Shape.rect(9, 36, 12, 12, 2)), M.white, { merge: false });
    s.part(Shape.ellipse(15, 31, 8, 6.5), M.white, { merge: false });
    s.part(Shape.ellipse(15, 31, 5, 4), M.glass, { merge: false, outline: false });
  }),
  floorLamp: furn(1, 1, 30, 92, (s, W, H) => {
    s.shadow(15, H - 2, 10, 2);
    s.part(Shape.ellipse(15, H - 3, 8, 3), M.steel);
    s.part(Shape.rect(14, 16, 2.5, H - 18), M.steel, { merge: false });
    s.part(Shape.poly([[4, 18], [26, 18], [22, 2], [8, 2]]), M.cream, { merge: false });
    s.line(5, 17, 25, 17, M.cream.h); s.line(9, 3, 21, 3, M.cream.s);
    s.rect(10, 18, 10, 2, '#fff2b0');
  }, { light: { dy: -80, r: 70, colour: '255,214,140' } }),
  sideTable: furn(1, 1, 34, 62, (s, W, H) => {
    s.shadow(17, H - 2, 14, 2);
    for (const x of [5, 27]) s.part(Shape.rect(x, H - 20, 3, 18), M.wood);
    s.box(2, H - 30, 30, 10, 6, M.wood);
    s.part(Shape.union(Shape.ellipse(17, H - 32, 5, 3), Shape.rect(16, H - 44, 2.5, 12)), M.chrome, { merge: false });
    s.part(Shape.poly([[8, H - 44], [26, H - 44], [23, H - 58], [11, H - 58]]), M.fabricMus, { merge: false });
    s.rect(12, H - 44, 10, 1, '#fff2b0');
  }, { light: { dy: -50, r: 56, colour: '255,214,140' } }),
  bedside: furn(1, 1, 34, 62, (s, W, H) => { FURNITURE.sideTable.draw(s, W, H); }, { light: { dy: -50, r: 50, colour: '255,214,140' } }),
  dogBed: furn(2, 1, 64, 40, (s, W, H) => {
    s.shadow(32, H - 6, 30, 5);
    s.part(Shape.ellipse(32, H - 18, 30, 16), M.fabricRose);
    s.part(Shape.ellipse(32, H - 16, 22, 10), M.cream, { merge: false });
    s.grain(12, H - 24, 40, 14, [M.cream.s], { density: 0.08 });
    s.part(Shape.capsule(26, H - 18, 38, H - 14, 2), M.cream.l ? ramp('#6a604c', '#b8ac90', '#d4c8aa', '#ffffff', '#ffffff', '#ffffff') : M.white, { merge: false }); // a bone toy
  }, { decor: true }),
  toyBox: furn(1, 1, 40, 42, (s, W, H) => {
    s.shadow(20, H - 2, 18, 3);
    s.box(2, 10, 36, 8, H - 14, M.blue);
    for (const [x, c] of [[8, M.red], [18, M.yellow], [28, M.green]]) s.part(Shape.ellipse(x, 10, 4, 4), c, { merge: false });
    s.part(Shape.capsule(26, 6, 34, 2, 1.5), M.fabricRose, { merge: false });
    s.dots([[8, 26], [20, 30], [30, 26]], M.yellow.l);
  }),
  bin: furn(1, 1, 26, 42, (s, W, H) => {
    s.shadow(13, H - 2, 10, 2);
    s.part(Shape.poly([[3, 8], [23, 8], [21, H - 3], [5, H - 3]]), M.chrome);
    s.box(1, 4, 24, 4, 3, M.chrome);
    s.part(Shape.rect(10, 1, 6, 3, 1), M.black, { merge: false });
    s.line(7, 12, 8, H - 6, M.chrome.h);
  }),
  laundryBasket: furn(1, 1, 36, 36, (s, W, H) => {
    s.shadow(18, H - 2, 15, 3);
    s.part(Shape.poly([[2, 8], [34, 8], [30, H - 3], [6, H - 3]]), M.timber);
    for (let y = 12; y < H - 4; y += 3) s.line(4, y, 32, y, M.timber.s);
    for (let x = 6; x < 32; x += 4) s.line(x, 9, x + 1, H - 4, M.timber.l);
    for (const [x, c] of [[10, M.fabricRose], [18, M.blue], [26, M.white]]) s.part(Shape.ellipse(x, 7, 6, 4), c, { merge: false });
  }),
  coatRack: furn(1, 1, 34, 92, (s, W, H) => {
    s.shadow(17, H - 2, 12, 3);
    s.part(Shape.union(Shape.rect(15, 6, 4, H - 8), Shape.capsule(17, H - 3, 6, H - 1, 1.5), Shape.capsule(17, H - 3, 28, H - 1, 1.5)), M.darkWood);
    for (const [x, y] of [[8, 10], [26, 10]]) s.part(Shape.capsule(17, y + 2, x, y, 1.2), M.darkWood, { merge: false });
    s.part(Shape.union(Shape.rect(4, 12, 12, 30, 3)), M.fabricRose, { merge: false });          // coat
    s.part(Shape.union(Shape.rect(19, 12, 12, 22, 3)), M.navy, { merge: false });              // jacket
    s.part(Shape.capsule(10, 14, 6, 40, 0.8), M.green, { merge: false });                       // a lead hanging!
    s.part(Shape.ellipse(17, 4, 7, 3), M.fabricMus, { merge: false });                          // hat on top
  }),
  shoeRack: furn(2, 1, 64, 40, (s, W, H) => {
    s.shadow(32, H - 2, 30, 3);
    s.box(2, 6, 60, 6, H - 10, M.wood, { round: 0 });
    s.rect(4, 22, 56, 2, M.wood.d);
    for (const [x, y, c] of [[6, 14, M.red], [18, 14, M.white], [32, 13, M.navy], [46, 15, M.green], [8, 28, M.cardboard], [26, 28, M.black], [44, 28, M.fabricRose]]) {
      s.part(Shape.union(Shape.rect(x, y, 10, 5, 2), Shape.rect(x, y - 3, 5, 4, 1)), c, { merge: false });
    }
  }),

  // ======================= Garage =======================
  workbench: furn(4, 1, 132, 104, (s, W, H) => {
    // Bench with a pegboard of tools on the wall behind it, a vice and a drawer unit
    s.shadow(66, H - 2, 64, 3);
    s.part(Shape.rect(4, 2, 124, 54, 2), M.cardboard);                                   // pegboard
    for (let y = 6; y < 54; y += 5) for (let x = 8; x < 126; x += 5) s.set(x, y, M.cardboard.d);
    const tool = (shape, r) => s.part(shape, r, { merge: false });
    tool(Shape.union(Shape.rect(14, 8, 4, 22, 1), Shape.rect(9, 6, 14, 6, 1)), M.wood);   // hammer
    s.rect(9, 6, 14, 6, M.steel.b); s.rect(9, 6, 14, 1, M.steel.h);
    tool(Shape.union(Shape.poly([[30, 10], [50, 10], [50, 22], [30, 30]]), Shape.rect(48, 8, 8, 10, 2)), M.chrome);  // saw
    s.rect(48, 8, 8, 10, M.red.b);
    for (let x = 31; x < 49; x += 2) s.set(x, 29 - (x - 30) * 0.4, M.chrome.d);
    for (let i = 0; i < 5; i++) tool(Shape.capsule(64 + i * 6, 8, 64 + i * 6, 22 + i * 2, 1.4), M.chrome);  // spanners
    tool(Shape.capsule(100, 8, 100, 30, 2), M.yellow); tool(Shape.capsule(100, 24, 100, 34, 1), M.chrome);  // screwdriver
    tool(Shape.capsule(110, 8, 110, 28, 2), M.red); tool(Shape.capsule(110, 22, 110, 34, 1), M.chrome);
    tool(Shape.minus(Shape.ellipse(120, 40, 7, 7), Shape.ellipse(120, 40, 4, 4)), M.hoseGreen);   // coil of wire
    for (const x of [8, 120]) s.part(Shape.rect(x, H - 40, 5, 38), M.wood);
    s.box(0, H - 52, 132, 10, 6, M.timber, { round: 0 });                                  // bench top
    s.grain(1, H - 51, 130, 8, [M.timber.s, M.timber.h], { density: 0.1 });
    s.part(Shape.rect(80, H - 38, 40, 34, 1), M.red);                                       // drawer unit
    for (let y = H - 35; y < H - 6; y += 9) { s.rect(82, y, 36, 7, M.red.s); s.rect(83, y + 1, 34, 5, M.red.b); s.rect(96, y + 3, 8, 1, M.chrome.l); }
    s.part(Shape.union(Shape.rect(16, H - 62, 14, 10, 1), Shape.rect(12, H - 58, 22, 4)), M.steel, { merge: false }); // vice
    s.part(Shape.rect(46, H - 60, 20, 8, 1), M.cardboard, { merge: false });               // a plank on the bench
    s.part(Shape.ellipse(72, H - 56, 4, 2.5), M.yellow, { merge: false });                  // tape measure
  }),
  shelf: furn(2, 1, 72, 120, (s, W, H) => {
    // Tall steel shelving packed with labelled boxes, paint tins and bottles
    s.shadow(36, H - 2, 34, 3);
    const rng = seeded(31);
    for (let row = 0; row < 4; row++) {
      const y = 6 + row * 28;
      const items = [];
      let x = 6;
      while (x < 64) {
        const kind = Math.floor(rng() * 3), w = kind === 0 ? 16 + Math.floor(rng() * 6) : kind === 1 ? 9 : 6;
        if (x + w > 66) break;
        items.push([x, kind, w]);
        x += w + 1;
      }
      for (const [ix, kind, w] of items) {
        if (kind === 0) { // labelled box
          const h = 16 + Math.floor(rng() * 6);
          s.box(ix, y + 22 - h, w, 4, h - 4, M.cardboard, { round: 0 });
          s.rect(ix + 3, y + 22 - h + 8, w - 6, 4, M.white.b); s.line(ix + 4, y + 22 - h + 9, ix + w - 5, y + 22 - h + 9, M.black.l);
        } else if (kind === 1) { // paint tin
          const c = [M.blue, M.red, M.yellow, M.green][Math.floor(rng() * 4)];
          s.part(Shape.rect(ix, y + 10, w, 12, 1), M.chrome, { merge: false });
          s.rect(ix + 1, y + 13, w - 2, 6, c.b);
          s.rect(ix + 1, y + 9, w - 2, 2, M.chrome.h);
        } else { // bottle
          const c = [M.green, M.teal, M.white][Math.floor(rng() * 3)];
          s.part(Shape.union(Shape.rect(ix, y + 10, w, 12, 2), Shape.rect(ix + 2, y + 6, 2, 5)), c, { merge: false });
        }
      }
      s.box(2, y + 22, 68, 3, 2, M.steel, { round: 0 });
    }
    for (const x of [2, 66]) s.part(Shape.rect(x, 2, 4, H - 4), M.steel, { merge: false });
    for (let y = 8; y < H; y += 10) { s.set(3, y, M.steel.h); s.set(67, y, M.steel.h); }
  }),
  toolbox: furn(1, 1, 40, 50, (s, W, H) => {
    // Rolling red tool chest with drawers
    s.shadow(20, H - 2, 18, 3);
    s.box(2, 8, 36, 6, H - 18, M.red);
    for (let y = 18; y < H - 12; y += 7) { s.rect(4, y, 32, 5, M.red.s); s.rect(5, y + 1, 30, 3, M.red.b); s.rect(14, y + 2, 12, 1, M.chrome.l); }
    s.part(Shape.capsule(6, 6, 34, 6, 1.4), M.chrome, { merge: false });
    wheel(s, 8, H - 6, 3); wheel(s, 32, H - 6, 3);
  }),
  boxes: furn(1, 1, 42, 62, (s, W, H) => {
    s.shadow(21, H - 2, 20, 3);
    s.box(1, H - 30, 40, 8, 22, M.cardboard, { round: 0 });
    s.rect(18, H - 30, 6, 30, '#c8b088'); s.rect(18, H - 30, 6, 1, M.cardboard.h);    // tape
    s.box(5, H - 54, 32, 6, 18, M.cardboard, { round: 0 });
    s.rect(18, H - 54, 6, 24, '#c8b088');
    s.rect(8, H - 44, 10, 5, M.white.b); s.line(9, H - 42, 16, H - 42, M.black.l);   // label
    s.part(Shape.poly([[16, H - 18], [24, H - 26], [28, H - 22], [20, H - 14]]), M.red, { merge: false }); // "fragile" mark
  }),
  boxesWide: furn(2, 1, 72, 70, (s, W, H) => {
    s.shadow(36, H - 2, 34, 3);
    s.box(1, H - 30, 34, 8, 22, M.cardboard, { round: 0 });
    s.box(37, H - 26, 34, 8, 18, M.cardboard, { round: 0 });
    s.box(12, H - 52, 30, 6, 16, M.cardboard, { round: 0 });
    s.box(40, H - 46, 26, 6, 14, M.cardboard, { round: 0 });
    s.box(20, H - 68, 22, 5, 12, M.cardboard, { round: 0 });
    for (const [x, y] of [[16, H - 30], [52, H - 26], [26, H - 52], [52, H - 46], [30, H - 68]]) s.rect(x, y, 4, 20, '#c8b088');
    s.erase(0, H - 2, W, 2);
  }),
  bike: furn(2, 1, 82, 58, (s, W, H) => {
    const tyre = M.tyre;
    for (const x of [18, 64]) {
      s.part(Shape.minus(Shape.ellipse(x, H - 18, 15, 15), Shape.ellipse(x, H - 18, 12, 12)), tyre);
      for (let a = 0; a < 8; a++) s.line(x, H - 18, x + Math.cos(a * 0.785) * 11, H - 18 + Math.sin(a * 0.785) * 11, M.chrome.s);
      s.part(Shape.ellipse(x, H - 18, 2, 2), M.chrome, { merge: false });
    }
    const frame = M.blue;
    s.part(Shape.union(Shape.capsule(18, H - 18, 38, H - 20, 1.6), Shape.capsule(38, H - 20, 60, H - 34, 1.6), Shape.capsule(38, H - 20, 32, H - 38, 1.6), Shape.capsule(32, H - 38, 60, H - 34, 1.6), Shape.capsule(18, H - 18, 32, H - 38, 1.4), Shape.capsule(60, H - 34, 64, H - 18, 1.6)), frame, { merge: false });
    s.part(Shape.rect(26, H - 44, 14, 4, 2), M.black, { merge: false });                  // saddle
    s.part(Shape.union(Shape.capsule(58, H - 40, 64, H - 44, 1.2), Shape.capsule(64, H - 44, 70, H - 42, 1.2)), M.black, { merge: false }); // handlebars
    s.part(Shape.ellipse(38, H - 20, 4, 4), M.chrome, { merge: false });                  // chainring
  }),
  hosePile: furn(1, 1, 46, 30, (s, W, H) => {
    s.shadow(23, H - 4, 21, 5);
    for (let r = 0; r < 4; r++) s.part(Shape.minus(Shape.ellipse(22 - r, H - 12 - r, 18 - r * 2, 9 - r), Shape.ellipse(22 - r, H - 12 - r, 15 - r * 2, 6.5 - r)), M.hoseGreen, { merge: false });
    s.part(Shape.capsule(36, H - 10, 44, H - 4, 1.8), M.hoseGreen, { merge: false });
    s.part(Shape.ellipse(44, H - 4, 2.5, 2), M.yellow, { merge: false });                  // nozzle
  }),
  laundrySink: furn(1, 1, 40, 62, (s, W, H) => {
    s.shadow(20, H - 2, 18, 3);
    for (const x of [4, 34]) s.part(Shape.rect(x, 26, 3, H - 28), M.chrome);
    s.box(1, 10, 38, 10, 14, M.white);
    s.rect(5, 12, 30, 7, M.white.s); s.rect(6, 13, 28, 5, M.chrome.s);
    s.part(Shape.union(Shape.capsule(20, 10, 20, 2, 1.2), Shape.capsule(20, 2, 25, 2, 1.2)), M.chrome, { merge: false });
    s.part(Shape.union(Shape.ellipse(15, 4, 2, 1.4), Shape.ellipse(25, 6, 2, 1.4)), M.chrome, { merge: false });
    s.part(Shape.rect(8, 40, 10, 12, 1), M.blue, { merge: false });                         // a bucket underneath
  }),
  garageFridge: furn(1, 1, 40, 88, (s, W, H) => {
    // An older bar fridge with a glass door full of drinks
    s.shadow(20, H - 2, 18, 3);
    s.box(1, 2, 38, 6, H - 6, M.cream, { round: 2 });
    s.part(Shape.rect(5, 12, 30, 52, 2), M.steel, { merge: false });
    s.rect(7, 14, 26, 48, M.glass.d);
    for (let row = 0; row < 3; row++) for (let i = 0; i < 5; i++) {
      const c = [M.red, M.green, M.yellow, M.blue, M.white][(i + row) % 5];
      s.rect(9 + i * 5, 18 + row * 15, 3, 10, c.b); s.set(9 + i * 5, 18 + row * 15, c.h);
    }
    for (let y = 30; y < 62; y += 15) s.rect(7, y, 26, 1, M.chrome.s);
    s.line(8, 15, 14, 15, M.glass.h);
    s.part(Shape.rect(31, 20, 2.5, 30, 1), M.chrome, { merge: false });
    s.rect(6, H - 16, 28, 6, M.steel.b); for (let x = 8; x < 33; x += 3) s.rect(x, H - 15, 1, 4, M.steel.d); // vent
  }, { light: { dy: -40, r: 44, colour: '160,210,255' } }),
  ladder: furn(1, 1, 30, 100, (s, W, H) => {
    s.part(Shape.union(Shape.capsule(6, H - 2, 10, 4, 1.8), Shape.capsule(24, H - 2, 20, 4, 1.8)), M.metal);
    for (let y = 12; y < H - 4; y += 11) s.part(Shape.capsule(9 - (y - H) * 0.04 + 1, y, 21 + (y - H) * 0.04 - 1, y, 1.2), M.metal, { merge: false });
    s.rect(4, H - 4, 8, 3, M.black.b); s.rect(18, H - 4, 8, 3, M.black.b);
  }),
  paintTins: furn(1, 1, 38, 34, (s, W, H) => {
    s.shadow(19, H - 2, 17, 3);
    for (const [x, y, c] of [[2, H - 16, M.blue], [16, H - 18, M.red], [8, H - 30, M.yellow], [26, H - 14, M.green]]) {
      s.part(Shape.rect(x, y, 12, 14, 1), M.chrome, { merge: false });
      s.rect(x + 1, y + 4, 10, 7, c.b); s.rect(x + 1, y + 1, 10, 2, M.chrome.h);
      s.part(Shape.capsule(x + 2, y, x + 10, y, 0.6), M.steel, { merge: false });
    }
    s.part(Shape.capsule(30, H - 22, 36, H - 34, 1), M.wood, { merge: false }); s.rect(28, H - 22, 6, 4, M.white.b); // a brush
  }),
  tyres: furn(1, 1, 42, 50, (s, W, H) => {
    s.shadow(21, H - 2, 19, 3);
    for (let i = 0; i < 3; i++) {
      const y = H - 10 - i * 12;
      s.part(Shape.minus(Shape.union(Shape.ellipse(21, y, 19, 7), Shape.rect(2, y - 7, 38, 7)), Shape.rect(0, y - 20, 0, 0)), M.tyre, { merge: false });
      for (let x = 5; x < 38; x += 4) s.rect(x, y - 4, 2, 3, M.tyre.l);
    }
    s.part(Shape.ellipse(21, H - 37, 19, 7), M.tyre, { merge: false });
    s.part(Shape.ellipse(21, H - 37, 9, 3.5), M.black.o ? solid('#0a0a0a') : M.tyre, { merge: false, outline: false });
  }),
  broom: furn(1, 1, 24, 84, (s, W, H) => {
    s.part(Shape.capsule(12, 4, 12, H - 18, 1.4), M.wood);
    s.part(Shape.poly([[4, H - 20], [20, H - 20], [22, H - 2], [2, H - 2]]), M.fabricMus, { merge: false });
    for (let x = 4; x < 21; x += 2) s.line(x, H - 16, x - 1, H - 3, M.fabricMus.s);
    s.rect(4, H - 20, 16, 3, M.red.b);
  }, { decor: true }),

  // ======================= Vet =======================
  desk: furn(4, 1, 132, 88, (s, W, H) => {
    s.shadow(66, H - 2, 64, 3);
    s.box(0, 30, 132, 12, H - 34, M.teal, { round: 1 });
    s.rect(1, 30, 130, 12, M.white.b); s.rect(1, 30, 130, 1, M.white.h); s.rect(1, 41, 130, 1, M.white.s);  // counter top
    for (let x = 8; x < 128; x += 20) s.line(x, 44, x, H - 6, M.teal.s);
    s.part(Shape.union(Shape.ellipse(22, 58, 9, 9)), M.white, { merge: false });            // paw-print logo
    s.dots([[22, 60], [18, 55], [22, 53], [26, 55], [20, 58], [24, 58], [21, 61], [23, 61]], M.teal.b);
    s.part(Shape.rect(84, 4, 30, 22, 2), M.black, { merge: false });                        // monitor
    s.rect(86, 6, 26, 17, '#5ab0e0'); s.rect(88, 8, 10, 2, '#ffffff'); s.rect(88, 12, 18, 1, '#cfe8f8');
    s.part(Shape.rect(96, 26, 6, 5), M.black, { merge: false });
    s.part(Shape.rect(70, 32, 22, 6, 1), M.white, { merge: false });                        // keyboard
    s.part(Shape.union(Shape.rect(16, 12, 16, 18, 3), Shape.rect(18, 8, 12, 4, 1)), M.glass, { merge: false }); // treat jar
    s.dots([[20, 18], [24, 22], [27, 17], [21, 25], [26, 26]], '#d06a90'); s.rect(18, 8, 12, 4, M.red.b);
    s.part(Shape.ellipse(52, 34, 5, 2.5), M.chrome, { merge: false }); s.set(52, 32, M.chrome.h); // bell
  }),
  waitChair: furn(1, 1, 34, 60, (s, W, H) => {
    s.shadow(17, H - 2, 14, 3);
    for (const x of [6, 26]) s.part(Shape.rect(x, H - 18, 3, 16), M.chrome);
    s.part(Shape.rect(5, 2, 24, 26, 6), M.blue);
    s.line(9, 6, 9, 24, M.blue.h);
    s.box(3, H - 32, 28, 12, 5, M.blue, { round: 2 });
  }),
  examTable: furn(2, 1, 82, 70, (s, W, H) => {
    s.shadow(41, H - 2, 38, 3);
    s.part(Shape.rect(36, 28, 10, H - 30), M.chrome);
    s.part(Shape.ellipse(41, H - 4, 18, 4), M.chrome, { merge: false });
    s.box(2, 8, 78, 16, 8, M.chrome);
    s.rect(4, 10, 74, 12, M.chrome.h); s.line(4, 16, 78, 16, M.chrome.b);
    s.part(Shape.rect(56, 2, 16, 10, 2), M.white, { merge: false }); s.line(58, 6, 70, 6, M.teal.b);  // clipboard of notes
    s.part(Shape.rect(10, 4, 20, 8, 3), M.glass, { merge: false });                         // paper roll
  }),
  cabinet: furn(1, 1, 38, 96, (s, W, H) => {
    s.shadow(19, H - 2, 17, 3);
    s.box(1, 2, 36, 6, H - 6, M.white, { round: 0 });
    s.part(Shape.rect(5, 12, 28, 40, 1), M.glass, { merge: false });
    for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) {
      const c = [M.red, M.blue, M.yellow, M.green][(i + row) % 4];
      s.part(Shape.rect(8 + i * 6, 16 + row * 12, 4, 8, 1), c, { merge: false, outline: false });
      s.set(8 + i * 6, 16 + row * 12, M.white.h);
    }
    s.line(19, 56, 19, H - 8, M.white.s);
    s.dots([[16, 70], [22, 70]], M.chrome.b);
    s.line(6, 13, 12, 13, M.glass.h);
  }),
  magazineRack: furn(1, 1, 32, 48, (s, W, H) => {
    s.shadow(16, H - 2, 14, 2);
    s.part(Shape.rect(4, 10, 24, H - 12, 2), M.chrome);
    for (const [x, c] of [[6, M.red], [12, M.blue], [18, M.yellow]]) s.part(Shape.rect(x, 4 + (x % 5), 8, 16, 1), c, { merge: false });
    s.rect(4, 22, 24, 2, M.chrome.d);
  }),
  scales: furn(2, 1, 66, 30, (s, W, H) => {
    s.shadow(33, H - 3, 31, 4);
    s.box(2, 4, 62, 14, 6, M.chrome);
    s.rect(4, 6, 58, 10, M.black.l); s.rect(4, 6, 58, 1, M.black.h);
    s.part(Shape.rect(26, 8, 14, 6, 1), M.glass, { merge: false }); s.dots([[29, 11], [32, 11], [35, 11]], '#3ae06a');
  }, { decor: true }),
  carrier: furn(1, 1, 42, 40, () => {}, { animated: true }), // drawn by the game (SPRITES.carrier)

  // ======================= Dog park =======================
  agilityJump: furn(3, 1, 98, 52, (s, W, H) => {
    // Two striped wing posts with a bar across: posts block, the dog runs (jumps) through the middle
    s.shadow(49, H - 3, 46, 4);
    for (const x of [6, 86]) {
      s.part(Shape.rect(x, 4, 7, H - 8, 2), M.white);
      for (let y = 8; y < H - 8; y += 8) s.rect(x + 1, y, 5, 4, M.blue.b);
      s.part(Shape.ellipse(x + 3.5, H - 4, 8, 3), M.white, { merge: false });
    }
    s.part(Shape.capsule(12, 20, 86, 20, 2), M.yellow, { merge: false });
    for (let x = 16; x < 86; x += 12) s.rect(x, 18, 6, 4, M.red.b);
  }, { posts: true }),
  tunnel: furn(4, 1, 132, 60, (s, W, H) => {
    // A long fabric agility tunnel: the dog runs through it (drawn over the dog while it's inside)
    s.shadow(66, H - 4, 64, 6);
    s.part(Shape.union(Shape.rect(10, 8, 112, H - 16, 18), Shape.ellipse(10, H / 2 + 2, 10, (H - 14) / 2), Shape.ellipse(122, H / 2 + 2, 10, (H - 14) / 2)), M.blue);
    for (let x = 18; x < 118; x += 10) s.line(x, 9, x - 2, H - 9, M.blue.d);
    s.line(14, 12, 118, 12, M.blue.h);
    for (const cx of [8, 124]) { s.part(Shape.ellipse(cx, H / 2 + 2, 7, (H - 18) / 2), M.black, { merge: false }); s.part(Shape.ellipse(cx, H / 2 + 2, 4, (H - 26) / 2), M.navy, { merge: false, outline: false }); }
  }, { cover: true, overhead: true }),
  weavePoles: furn(4, 1, 132, 54, (s, W, H) => {
    s.shadow(66, H - 3, 62, 4);
    s.part(Shape.rect(6, H - 8, 120, 4, 1), M.white);
    for (let i = 0; i < 8; i++) {
      const x = 10 + i * 16;
      s.part(Shape.rect(x, 4, 4, H - 10, 1), i % 2 ? M.yellow : M.white, { merge: false });
      for (let y = 8; y < H - 10; y += 8) s.rect(x + 1, y, 2, 3, i % 2 ? M.red.b : M.blue.b);
    }
  }, { decor: true }),
  aFrame: furn(2, 2, 68, 70, (s, W, H) => {
    s.shadow(34, H - 4, 32, 5);
    s.part(Shape.poly([[2, H - 6], [34, 6], [66, H - 6]]), M.timber);
    s.part(Shape.poly([[4, H - 7], [20, H - 36], [48, H - 36], [64, H - 7]]), M.yellow, { merge: false });   // contact zone paint
    for (let y = 16; y < H - 8; y += 6) s.line(34 - (y - 6) * 0.5, y, 34 + (y - 6) * 0.5, y, M.timber.s);
  }),
  waterBowl: furn(1, 1, 26, 16, (s, W, H) => {
    // The dog's water bowl: steel, with water in it (stand still beside it to drink)
    s.shadow(13, H - 3, 11, 2);
    s.part(Shape.ellipse(13, H - 7, 11, 5), M.chrome);
    s.part(Shape.ellipse(13, H - 8, 8, 3), M.glass, { merge: false, outline: false });
    s.rect(9, H - 9, 3, 1, '#e8f6ff');
  }, { decor: true }),
  lampPost: furn(1, 1, 26, 100, (s, W, H) => {
    // A park lamp post: cast-iron base and pole, a glass lantern with a glowing bulb under a little roof
    s.shadow(13, H - 2, 9, 2);
    s.part(Shape.poly([[7, H - 2], [19, H - 2], [17, H - 9], [9, H - 9]]), M.black);
    s.part(Shape.rect(11, 22, 4, H - 30), M.black, { merge: false });
    s.part(Shape.rect(9.5, 40, 7, 3, 1), M.black, { merge: false });
    s.line(12, 24, 12, H - 10, M.black.h);
    s.part(Shape.poly([[6, 10], [20, 10], [18, 22], [8, 22]]), M.yellow, { merge: false });   // glowing glass
    s.rect(11, 13, 4, 6, '#fffbe0');
    s.line(13, 10, 13, 22, M.black.s);
    s.part(Shape.poly([[4, 10], [22, 10], [16, 3], [10, 3]]), M.black, { merge: false });      // the roof
    s.part(Shape.ellipse(13, 2.5, 2, 2), M.black, { merge: false });
    s.rect(8, 22, 10, 2, M.black.m);
  }),
  waterStation: furn(1, 1, 30, 52, (s, W, H) => {
    // A drinking fountain with a dog bowl at the bottom
    s.shadow(15, H - 3, 13, 3);
    s.part(Shape.rect(10, 6, 10, H - 14, 2), M.steel);
    s.part(Shape.ellipse(15, 8, 7, 4), M.chrome, { merge: false });
    s.part(Shape.ellipse(15, H - 6, 12, 4), M.chrome, { merge: false });
    s.part(Shape.ellipse(15, H - 7, 9, 2.5), M.glass, { merge: false, outline: false });
    s.part(Shape.capsule(20, 18, 24, 18, 1.4), M.chrome, { merge: false });
  }),
  dogParkSign: furn(1, 1, 50, 64, (s, W, H) => {
    s.shadow(25, H - 3, 18, 3);
    for (const x of [8, 40]) s.part(Shape.rect(x, 20, 3, H - 22), M.wood);
    s.box(2, 4, 46, 4, 24, M.green, { round: 1 });
    s.rect(6, 12, 38, 1, M.green.h);
    s.part(Shape.ellipse(12, 19, 4, 4), M.white, { merge: false });                 // a paw print
    s.dots([[9, 14], [12, 13], [15, 14]], M.white.b);
    for (let i = 0; i < 4; i++) s.rect(20 + i * 6, 16, 4, 6, M.white.h);             // "DOGS"
  }),

  // ======================= Beach =======================
  rocks: furn(1, 1, 40, 34, (s, W, H) => {
    s.shadow(20, H - 3, 18, 4);
    s.part(Shape.union(Shape.ellipse(15, H - 12, 12, 9), Shape.ellipse(27, H - 9, 10, 7), Shape.ellipse(20, H - 18, 8, 6)), M.stone);
    s.speckle(4, 6, 32, 24, [M.stone.s, M.stone.l], 20, 5);
    s.dots([[10, H - 6], [26, H - 4], [31, H - 8]], '#2e6e3a'); // a bit of weed
  }),
  beachUmbrella: furn(2, 2, 92, 112, (s, W, H) => {
    s.shadow(46, H - 14, 38, 11);
    s.part(Shape.capsule(46, 26, 50, H - 10, 1.6), M.chrome);
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2, a1 = ((i + 1) / 10) * Math.PI * 2;
      s.part(Shape.poly([[46, 6], [46 + Math.cos(a0) * 44, 28 + Math.sin(a0) * 15], [46 + Math.cos(a1) * 44, 28 + Math.sin(a1) * 15]]), i % 2 ? M.white : M.red, { merge: false, outline: false });
    }
    s.outlineAll(M.red.o);
    s.part(Shape.ellipse(46, 6, 3, 2), M.chrome, { merge: false });
  }, { cover: true }),
  towel: furn(2, 1, 60, 30, (s, W, H) => {
    s.part(Shape.rect(4, 3, 52, 24, 2), M.blue);
    for (let x = 8; x < 54; x += 10) s.rect(x, 4, 4, 22, M.white.l);
    s.rect(5, 4, 50, 1, M.blue.h);
    s.dots([[4, 5], [4, 9], [4, 13], [55, 5], [55, 9], [55, 13]], M.white.b); // fringe
  }, { decor: true }),
  esky: furn(1, 1, 40, 38, (s, W, H) => {
    // An Aussie esky (cool box)
    s.shadow(20, H - 3, 18, 3);
    s.box(2, 8, 36, 10, H - 18, M.blue);
    s.box(1, 4, 38, 6, 5, M.white, { round: 1 });
    s.part(Shape.rect(14, 2, 12, 3, 1), M.white, { merge: false });
    s.rect(6, 22, 28, 2, M.white.b);
  }),
  sandcastle: furn(1, 1, 40, 40, (s, W, H) => {
    const sand = ramp('#6a5228', '#a88a52', '#c8a868', '#e0c488', '#ecd6a4', '#f8ecca');
    s.shadow(20, H - 3, 18, 3);
    s.part(Shape.union(Shape.rect(4, H - 16, 32, 13, 1), Shape.rect(4, H - 22, 8, 7), Shape.rect(28, H - 22, 8, 7), Shape.rect(14, H - 30, 12, 15)), sand);
    for (const x of [4, 8, 28, 32]) s.rect(x, H - 23, 2, 2, sand.s);
    s.rect(17, H - 10, 6, 7, sand.d);                              // door
    s.part(Shape.capsule(20, H - 30, 20, H - 38, 0.6), M.wood, { merge: false });
    s.part(Shape.poly([[20, H - 38], [27, H - 36], [20, H - 34]]), M.red, { merge: false }); // a little flag
  }),
  bucketSpade: furn(1, 1, 32, 30, (s, W, H) => {
    s.shadow(15, H - 3, 12, 3);
    s.part(Shape.poly([[4, 8], [20, 8], [18, H - 4], [6, H - 4]]), M.red);
    s.part(Shape.minus(Shape.ellipse(12, 7, 8, 4), Shape.ellipse(12, 7, 6, 2.5)), M.yellow, { merge: false });
    s.part(Shape.capsule(22, 4, 26, H - 10, 1), M.yellow, { merge: false });
    s.part(Shape.ellipse(27, H - 7, 3, 4), M.blue, { merge: false });
  }, { decor: true }),
  surfboard: furn(1, 1, 22, 74, (s, W, H) => {
    s.shadow(11, H - 3, 9, 3);
    s.part(Shape.union(Shape.ellipse(11, 34, 8, 30), Shape.rect(4, 34, 14, 34, 7)), M.white);
    s.part(Shape.rect(10, 6, 2, H - 14), M.teal, { merge: false, outline: false });   // stringer stripe
    s.part(Shape.ellipse(11, 20, 6, 8), M.teal, { merge: false, outline: false });
  }),
  lifeguardTower: furn(2, 2, 70, 118, (s, W, H) => {
    s.shadow(35, H - 6, 32, 7);
    for (const [x0, x1] of [[8, 14], [62, 56]]) s.part(Shape.capsule(x0, H - 6, x1, 44, 2), M.white);
    s.part(Shape.capsule(10, H - 30, 60, H - 30, 1.4), M.white, { merge: false });
    s.box(6, 34, 58, 6, 18, M.red, { round: 0 });                                   // lookout box
    s.part(Shape.rect(14, 14, 42, 22, 2), M.red, { merge: false });                  // back rest and roof
    s.part(Shape.poly([[4, 16], [35, 2], [66, 16]]), M.yellow, { merge: false });
    s.rect(24, 40, 22, 6, M.white.h); s.rect(33, 38, 4, 10, M.white.h);              // the red cross sign (white on red)
  }),
  driftwood: furn(2, 1, 64, 26, (s, W, H) => {
    s.shadow(32, H - 3, 28, 3);
    s.part(Shape.union(Shape.capsule(6, H - 10, 58, H - 8, 4, 3), Shape.capsule(40, H - 9, 50, H - 18, 1.8)), M.sandstone);
    s.grain(6, H - 14, 52, 8, [M.sandstone.s], { density: 0.2 });
  }, { decor: true }),

  // ======================= Pet store =======================
  petShelf: furn(2, 1, 72, 110, (s, W, H) => {
    // Store shelving stacked with bags of dog food and tins
    s.shadow(36, H - 2, 34, 3);
    s.box(2, 2, 68, 4, H - 4, M.white, { round: 0 });
    const rng = seeded(41);
    for (let row = 0; row < 4; row++) {
      const y = 8 + row * 25;
      s.rect(5, y, 62, 22, '#d8dde4');
      let x = 6;
      while (x < 62) {
        const bag = rng() < 0.6, c = [M.red, M.blue, M.green, M.yellow, M.purple, M.teal][Math.floor(rng() * 6)];
        const w = bag ? 12 : 7;
        if (x + w > 66) break;
        if (bag) { s.part(Shape.rect(x, y + 3, w, 19, 2), c, { merge: false }); s.part(Shape.ellipse(x + w / 2, y + 12, 3, 3), M.white, { merge: false }); s.dots([[x + w / 2 - 1, y + 11], [x + w / 2 + 1, y + 11]], c.d); }
        else { s.part(Shape.rect(x, y + 12, w, 10, 1), M.chrome, { merge: false }); s.rect(x + 1, y + 15, w - 2, 4, c.b); }
        x += w + 1;
      }
      s.rect(4, y + 22, 64, 3, M.white.s);
      s.rect(10, y + 23, 8, 2, M.yellow.b); // price tags
      s.rect(40, y + 23, 8, 2, M.yellow.b);
    }
  }),
  toyShelf: furn(2, 1, 72, 110, (s, W, H) => {
    s.shadow(36, H - 2, 34, 3);
    s.box(2, 2, 68, 4, H - 4, M.white, { round: 0 });
    const rng = seeded(57);
    for (let row = 0; row < 4; row++) {
      const y = 8 + row * 25;
      s.rect(5, y, 62, 22, '#d8dde4');
      for (let x = 8; x < 62; x += 10) {
        const kind = Math.floor(rng() * 3), c = [M.red, M.blue, M.yellow, M.green, M.fabricRose][Math.floor(rng() * 5)];
        if (kind === 0) s.part(Shape.ellipse(x + 4, y + 17, 4, 4), c, { merge: false });                                       // balls
        else if (kind === 1) { s.part(Shape.capsule(x, y + 18, x + 8, y + 14, 1.6), c, { merge: false }); s.dots([[x, y + 18], [x + 8, y + 14]], M.white.h); } // rope toys
        else s.part(Shape.union(Shape.ellipse(x + 4, y + 15, 4, 5), Shape.ellipse(x + 4, y + 9, 3, 3)), c, { merge: false });  // plush toys
      }
      s.rect(4, y + 22, 64, 3, M.white.s);
    }
  }),
  bagPile: furn(1, 1, 36, 50, (s, W, H) => {
    s.shadow(18, H - 2, 16, 3);
    for (const [x, y, c] of [[2, H - 18, M.red], [18, H - 18, M.blue], [9, H - 34, M.yellow]]) {
      s.part(Shape.rect(x, y, 16, 16, 3), c, { merge: false });
      s.rect(x + 2, y + 2, 12, 1, c.h);
      s.part(Shape.ellipse(x + 8, y + 9, 3.5, 3), M.white, { merge: false });
    }
  }),
  aquarium: furn(2, 1, 72, 84, (s, W, H) => {
    s.shadow(36, H - 2, 34, 3);
    s.box(2, H - 32, 68, 6, 26, M.darkWood, { round: 0 });                            // cabinet
    s.part(Shape.rect(4, 6, 64, 46, 2), M.steel);
    s.rect(6, 8, 60, 42, '#3a8ac8');
    s.rect(6, 8, 60, 6, '#5aa8e0');
    s.rect(6, 44, 60, 6, M.sandstone.l);                                                 // gravel
    for (const x of [14, 50]) for (let y = 30; y < 46; y += 2) s.set(x + Math.round(Math.sin(y) * 1.5), y, M.leaf.l); // weed
    for (const [x, y, c] of [[22, 22, '#ffa030'], [40, 30, '#ffd84a'], [54, 18, '#ff6a8a'], [30, 36, '#5ae0ff']]) { s.rect(x, y, 5, 3, c); s.set(x - 1, y + 1, c); s.set(x + 4, y, '#101010'); }
    s.dots([[44, 12], [45, 16], [44, 20]], '#d8f0ff');                                  // bubbles
    s.rect(6, 8, 2, 40, 'rgba(255,255,255,0.35)');
  }),
  birdCage: furn(1, 1, 32, 70, (s, W, H) => {
    s.shadow(16, H - 2, 10, 3);
    s.part(Shape.rect(14, 36, 4, H - 38), M.chrome);
    s.part(Shape.ellipse(16, H - 3, 8, 3), M.chrome, { merge: false });
    s.part(Shape.minus(Shape.union(Shape.ellipse(16, 14, 13, 10), Shape.rect(3, 14, 26, 22)), Shape.rect(5, 14, 22, 20)), M.chrome, { merge: false });
    for (let x = 6; x < 28; x += 3) s.line(x, 10, x, 34, M.chrome.b);
    s.part(Shape.ellipse(16, 24, 4, 5), M.green, { merge: false });                      // a budgie
    s.part(Shape.ellipse(16, 19, 3, 3), M.yellow, { merge: false });
    s.set(17, 19, '#101010'); s.set(19, 19, '#e0a020');
    s.rect(5, 34, 22, 2, M.chrome.d);
  }),
  catTree: furn(1, 1, 40, 96, (s, W, H) => {
    const carpet = ramp('#4a3a2e', '#7a6656', '#968070', '#b09a88', '#c8b4a2', '#e0d0c0');
    s.shadow(20, H - 2, 18, 3);
    s.part(Shape.rect(16, 20, 8, H - 26), ramp('#5a4a30', '#a8946a', '#c4ae80', '#d8c49a', '#e8d8b4', '#f6ecd4'));  // sisal post
    for (let y = 24; y < H - 8; y += 3) s.line(16, y, 23, y, '#a8946a');
    s.box(2, H - 10, 36, 4, 6, carpet);
    s.box(4, 40, 32, 4, 5, carpet);
    s.part(Shape.union(Shape.rect(6, 6, 28, 14, 6)), carpet);                           // the cubby on top
    s.part(Shape.ellipse(20, 14, 6, 4), M.black, { merge: false, outline: false });
    s.part(Shape.capsule(30, 44, 32, 56, 1.4), M.fabricRose, { merge: false }); s.part(Shape.ellipse(32, 58, 2.5, 2.5), M.fabricRose, { merge: false }); // dangly toy
  }),
  dogWash: furn(3, 1, 100, 88, (s, W, H) => {
    // A raised stainless dog-wash tub full of suds, with a shower hose and a ramp
    s.shadow(50, H - 2, 48, 4);
    s.box(4, 30, 92, 10, H - 36, M.chrome, { round: 1 });
    s.rect(8, 32, 84, 7, M.glass.b);
    for (let i = 0; i < 16; i++) s.part(Shape.ellipse(12 + i * 5.2, 33 + (i % 3), 3.2, 2.6), M.white, { merge: false, outline: false }); // suds
    s.part(Shape.capsule(88, 30, 88, 4, 1.6), M.chrome, { merge: false });              // shower riser
    s.part(Shape.ellipse(82, 6, 7, 3), M.chrome, { merge: false });
    s.part(Shape.capsule(86, 10, 70, 22, 1.2), M.black, { merge: false });              // hose
    s.part(Shape.poly([[4, H - 2], [4, H - 20], [-10, H - 2]]), M.steel, { merge: false });
    for (let y = 46; y < H - 6; y += 6) s.rect(10, y, 80, 1, M.chrome.s);
    s.rect(30, 50, 40, 8, M.teal.b); s.rect(32, 52, 36, 4, M.white.h);                   // "DOG WASH" sign
  }),
  checkout: furn(3, 1, 100, 76, (s, W, H) => {
    s.shadow(50, H - 2, 48, 3);
    s.box(0, 22, 100, 12, H - 26, M.teal, { round: 1 });
    s.rect(1, 23, 98, 10, M.white.b); s.rect(1, 23, 98, 1, M.white.h);
    s.part(Shape.rect(60, 6, 24, 18, 2), M.black, { merge: false });                    // till
    s.rect(62, 8, 20, 8, '#5ab0e0'); s.part(Shape.rect(58, 22, 28, 6, 1), M.steel, { merge: false });
    s.part(Shape.rect(40, 18, 8, 10, 1), M.black, { merge: false }); s.rect(41, 19, 6, 4, '#3ae06a'); // card machine
    s.part(Shape.union(Shape.rect(12, 8, 16, 18, 3), Shape.rect(14, 4, 12, 4, 1)), M.glass, { merge: false }); // treat jar
    s.dots([[16, 14], [20, 18], [23, 13], [17, 21], [22, 22]], '#c08a50'); s.rect(14, 4, 12, 4, M.red.b);
    for (let x = 6; x < 96; x += 16) s.line(x, 36, x, H - 6, M.teal.s);
  }),
  petBedDisplay: furn(2, 1, 64, 40, (s, W, H) => {
    s.shadow(32, H - 6, 30, 5);
    s.part(Shape.ellipse(32, H - 18, 30, 16), M.fabricBlue);
    s.part(Shape.ellipse(32, H - 16, 22, 10), M.cream, { merge: false });
    s.part(Shape.rect(38, 4, 18, 10, 1), M.yellow, { merge: false }); s.rect(41, 7, 12, 3, M.red.b); // SALE tag
  }, { decor: true }),

  // ======================= The house at night =======================
  bedOwner: furn(3, 3, 100, 136, (s, W, H) => {
    FURNITURE.bed.draw(s, W, H);
    // The owner fast asleep: blonde hair across the pillow, eyes shut, the duvet pulled up
    const O = OWNER_COLOURS;
    s.part(Shape.union(Shape.ellipse(30, 38, 13, 10), Shape.ellipse(30, 46, 15, 6)), O.hair, { merge: false });
    s.part(Shape.ellipse(30, 40, 8, 8), O.skin, { merge: false });
    s.part(Shape.ellipse(30, 33, 10, 5), O.hair, { merge: false });
    s.dots([[26, 41], [27, 42], [28, 41], [32, 41], [33, 42], [34, 41]], O.eyes);  // closed eyes
    s.rect(29, 45, 3, 1, O.lips);
    s.dots([[25, 44], [35, 44]], O.blush);
    s.part(Shape.union(Shape.ellipse(48, 72, 36, 16), Shape.rect(6, 56, 88, 24, 6)), M.purple, { merge: false }); // a bump under the duvet
    s.line(8, 58, 92, 58, M.purple.h);
  }),

  // ---- Cars: properly drawn side-on three-quarter vehicles, about 2x the old size ----
  carRed: furn(7, 3, 236, 150, (s, W, H) => drawCar(s, W, H, 'hatch', M.red)),
  carBlue: furn(7, 3, 236, 150, (s, W, H) => drawCar(s, W, H, 'wagon', M.blue)),
};

// A car seen from the side and slightly above (facing right): roof, glasshouse with reflections,
// doors with handles, mirror, lights, bumpers, number plate, chunky tyres with alloy wheels
function drawCar(s, W, H, model, body) {
  const wagon = model === 'wagon';
  const ground = H - 8, wheelY = ground - 22, wr = 21;
  const front = W - 10, rear = 10;
  s.shadow(W / 2, ground + 2, W / 2 - 6, 9, 0.32);
  // Lower body (the "box") with a bulge over the wheel arches
  s.part(Shape.union(
    Shape.rect(rear, ground - 62, front - rear, 46, 14),
    Shape.ellipse(rear + 52, ground - 30, 36, 20),
    Shape.ellipse(front - 50, ground - 30, 36, 20),
  ), body);
  // Roof and pillars (the "glasshouse")
  const roofTop = ground - (wagon ? 116 : 112), roofRear = wagon ? rear + 10 : rear + 30, roofFront = front - 74;
  s.part(Shape.poly([
    [rear + 14, ground - 60], [roofRear, roofTop + 6], [roofRear + 10, roofTop], [roofFront, roofTop], [front - 48, ground - 62],
  ]), body);
  // Windows (glass with sky reflections), split by the pillars
  const glassTop = roofTop + 8, glassBottom = ground - 64;
  const win = Shape.poly([[rear + 22, glassBottom], [roofRear + 6, glassTop + 4], [roofRear + 14, glassTop], [roofFront - 4, glassTop], [front - 58, glassBottom]]);
  s.part(win, M.glass, { merge: false });
  for (let i = 0; i < 4; i++) s.line(roofFront - 30 + i * 6, glassTop + 2, roofFront - 50 + i * 6, glassBottom - 2, M.glass.h); // reflections
  s.line(rear + 34, glassBottom - 4, roofRear + 26, glassTop + 4, M.glass.l);
  const pillars = wagon ? [rear + 52, rear + 104, rear + 150] : [rear + 74, rear + 136];
  for (const px of pillars) s.part(Shape.poly([[px, glassTop - 1], [px + 7, glassTop - 1], [px + 5, glassBottom + 1], [px - 2, glassBottom + 1]]), M.black, { merge: false });
  // Roof highlight, roof racks on the wagon
  s.line(roofRear + 12, roofTop + 2, roofFront - 4, roofTop + 2, body.h);
  if (wagon) for (const x of [roofRear + 30, roofFront - 30]) s.part(Shape.rect(x, roofTop - 6, 6, 7, 1), M.steel, { merge: false });
  if (wagon) s.part(Shape.rect(roofRear + 26, roofTop - 7, roofFront - roofRear - 50, 3, 1), M.steel, { merge: false });
  // Body side: shoulder crease, sill shadow, door shut lines and handles
  s.line(rear + 6, ground - 56, front - 6, ground - 58, body.h);
  s.line(rear + 6, ground - 40, front - 8, ground - 40, body.s);
  s.rect(rear + 10, ground - 22, front - rear - 20, 4, body.d);
  const doors = wagon ? [rear + 52, rear + 104, rear + 150] : [rear + 74, rear + 136];
  for (const dx of doors) s.line(dx, ground - 62, dx - 2, ground - 22, body.d);
  for (const dx of doors.slice(0, -1)) s.rect(dx + 30, ground - 52, 10, 3, M.chrome.b);
  // Bonnet, bumpers, lights and grille
  s.part(Shape.poly([[front - 50, ground - 64], [front - 6, ground - 56], [front, ground - 46], [front - 50, ground - 58]]), body, { merge: false });
  s.line(front - 48, ground - 62, front - 8, ground - 55, body.h);
  s.part(Shape.rect(front - 8, ground - 44, 10, 20, 3), M.black, { merge: false });        // front bumper end
  s.part(Shape.rect(front - 14, ground - 52, 14, 8, 2), M.yellow, { merge: false });       // headlight
  s.rect(front - 12, ground - 50, 5, 2, '#ffffff');
  for (let y = ground - 42; y < ground - 28; y += 3) s.rect(front - 6, y, 6, 1, M.chrome.s); // grille slats
  s.part(Shape.rect(rear - 2, ground - 44, 10, 20, 3), M.black, { merge: false });         // rear bumper
  s.part(Shape.rect(rear, ground - 56, 8, 10, 2), M.red, { merge: false });                 // tail light
  s.rect(rear + 2, ground - 54, 2, 4, '#ff9a8a');
  s.part(Shape.rect(rear - 1, ground - 36, 8, 8, 1), M.white, { merge: false });            // number plate
  s.dots([[rear + 1, ground - 33], [rear + 3, ground - 33], [rear + 5, ground - 33]], M.black.b);
  // Side mirror
  s.part(Shape.union(Shape.rect(front - 62, glassBottom - 6, 10, 7, 2)), body, { merge: false });
  s.rect(front - 60, glassBottom - 4, 6, 3, M.glass.b);
  // Wheel arches (dark) and wheels: chunky tyres with alloy rims
  for (const cx of [rear + 52, front - 50]) {
    s.part(Shape.ellipse(cx, wheelY, wr + 4, wr + 3), M.black, { merge: false });
    s.part(Shape.ellipse(cx, wheelY + 2, wr, wr), M.tyre, { merge: false });
    s.part(Shape.ellipse(cx, wheelY + 2, wr * 0.62, wr * 0.62), M.chrome, { merge: false });
    for (let a = 0; a < 5; a++) {
      const ang = a * (Math.PI * 2 / 5) - Math.PI / 2;
      s.part(Shape.capsule(cx, wheelY + 2, cx + Math.cos(ang) * wr * 0.55, wheelY + 2 + Math.sin(ang) * wr * 0.55, 2.2, 1.6), M.metal, { merge: false, outline: false });
    }
    s.part(Shape.ellipse(cx, wheelY + 2, 3.5, 3.5), M.steel, { merge: false });
    for (let a = 0; a < 16; a++) { const ang = a * 0.39; s.set(cx + Math.cos(ang) * (wr - 2), wheelY + 2 + Math.sin(ang) * (wr - 2), M.tyre.l); }
  }
}

function buildFurnitureSprites() {
  const out = {};
  for (const [kind, f] of Object.entries(FURNITURE)) {
    const s = new PixelSprite(f.sw, f.sh);
    f.draw(s, f.sw, f.sh);
    out[kind] = s.toCanvas();
  }
  return out;
}

// Robot vacuum (30x18): a dark disc with a glowing light, a bumper and side brushes
function buildVacuumSprite() {
  const s = new PixelSprite(32, 20);
  s.shadow(16, 15, 15, 4);
  s.part(Shape.ellipse(16, 10, 14, 8), M.black);
  s.part(Shape.ellipse(16, 8.5, 9, 4.5), M.steel, { merge: false });
  s.part(Shape.ellipse(16, 7.5, 3, 1.6), M.chrome, { merge: false });
  s.dots([[15, 7], [16, 7]], '#3ae06a');
  s.line(4, 13, 28, 13, M.steel.l);
  for (const x of [5, 27]) { s.set(x, 16, M.chrome.b); s.set(x - 1, 17, M.chrome.b); s.set(x + 1, 17, M.chrome.b); }
  return s.toCanvas();
}
