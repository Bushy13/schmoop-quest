// Snacks (20x20, centred), crop plants for the garden beds (32x32, base at the bottom middle),
// and small UI icons (stars, warning bubble).

const ITEM = 20;
const solidRamp = c => ramp(c, c, c, c, c, c);

function itemSprite(draw) {
  const s = new PixelSprite(ITEM, ITEM);
  draw(s);
  return s.toCanvas();
}

const BONE_RAMP = ramp('#6b5a3a', '#b09a72', '#d2c09a', '#efe3c6', '#f8f1e0', '#ffffff');
const GOLD_RAMP = ramp('#6b4a08', '#b07a12', '#d8a01e', '#f5c842', '#ffe27a', '#fff6c0');
const boneShape = Shape.union(
  Shape.capsule(5, 10, 15, 10, 2.3),
  Shape.ellipse(4.5, 7.5, 2.7), Shape.ellipse(4.5, 12.5, 2.7),
  Shape.ellipse(15.5, 7.5, 2.7), Shape.ellipse(15.5, 12.5, 2.7),
);

function buildItemSprites() {
  const leaf = ramp('#123a16', '#1f5e24', '#2a7a2e', '#3a9a3c', '#5cbc52', '#8edc7a');
  return {
    bone: itemSprite(s => s.part(boneShape, BONE_RAMP)),
    goldenBone: itemSprite(s => {
      s.part(boneShape, GOLD_RAMP);
      s.dots([[8, 9], [9, 9]], '#ffffff');
    }),
    sausage: itemSprite(s => {
      const r = ramp('#4a1a10', '#7e2e1a', '#a8442a', '#c85a38', '#e07a52', '#f4a07a');
      s.part(Shape.capsule(4, 12, 16, 8, 3.6), r);
      s.dots([[2, 13], [18, 7]], r.d);
      s.line(7, 9, 12, 7, r.h);
    }),
    biscuit: itemSprite(s => {
      // Classic bone-shaped dog biscuit
      const r = ramp('#5a3414', '#9a6430', '#b87c40', '#d49a5a', '#e6b478', '#f6d4a0');
      s.part(Shape.union(Shape.rect(5, 7, 10, 6, 1), Shape.ellipse(4.5, 7.5, 2.6), Shape.ellipse(4.5, 12.5, 2.6), Shape.ellipse(15.5, 7.5, 2.6), Shape.ellipse(15.5, 12.5, 2.6)), r);
      s.dots([[7, 9], [10, 10], [13, 9], [8, 11], [12, 11]], r.d);
    }),
    cheese: itemSprite(s => {
      const r = ramp('#6a4a08', '#c08a14', '#e0a81e', '#ffcf3a', '#ffe070', '#fff2b0');
      s.part(Shape.poly([[2, 16], [18, 16], [18, 8], [3, 12]]), r); // front face
      s.part(Shape.poly([[3, 12], [18, 8], [16, 6], [3, 11]]), ramp(r.o, r.s, r.l, r.h, r.h, '#ffffff'), { merge: false });
      for (const [x, y, rr] of [[7, 13.5, 1.5], [13, 12, 1.2], [16, 14.5, 1], [10, 15, 0.9]]) {
        s.part(Shape.ellipse(x, y, rr, rr), solidRamp(r.s), { clip: true, outline: false });
      }
    }),
    strawberry: itemSprite(s => {
      const r = ramp('#5a0a14', '#a8162a', '#d02436', '#ec3a48', '#f8686a', '#ffa0a0');
      s.part(Shape.union(Shape.ellipse(10, 10, 6.5, 5.5), Shape.ellipse(10, 13.5, 4.5, 4.8)), r);
      for (const [x, y] of [[7, 9], [10, 10], [13, 9], [8, 13], [12, 13], [10, 16], [6, 11], [14, 11]]) s.set(x, y, '#ffe38a');
      s.part(Shape.union(Shape.poly([[4, 6], [10, 3], [16, 6], [12, 7], [10, 5.5], [8, 7]]), Shape.rect(9.5, 1, 1.5, 4)), leaf);
    }),
    carrot: itemSprite(s => {
      const r = ramp('#5a2a08', '#a84e12', '#d06a1c', '#f08a2a', '#f8a85a', '#ffd09a');
      s.part(Shape.poly([[5, 6], [15, 6], [11, 19], [9.5, 19]]), r);
      for (const y of [9, 12, 15]) s.line(8 + (y - 9) / 4, y, 10 + (y - 9) / 5, y, r.d);
      s.part(Shape.union(Shape.capsule(10, 6, 6, 1, 1.1), Shape.capsule(10, 6, 10, 0.5, 1.1), Shape.capsule(10, 6, 14, 1, 1.1)), leaf);
    }),
    tomato: itemSprite(s => {
      const r = ramp('#5a0a10', '#a01820', '#cc2a2e', '#ea4438', '#f87060', '#ffb0a0');
      s.part(Shape.ellipse(10, 11.5, 7.5, 6.8), r);
      s.part(Shape.poly([[5, 6], [8, 7], [10, 4], [12, 7], [15, 6], [12, 9], [10, 8], [8, 9]]), leaf);
      s.dots([[6, 10], [7, 9], [6, 11]], '#ffd0c0');
    }),
    peas: itemSprite(s => {
      const r = ramp('#1a4a10', '#3a7a1e', '#4e9a2a', '#68b83a', '#8cd45a', '#c0f08c');
      s.part(Shape.capsule(3, 13, 17, 8, 3.8, 3), r);
      for (const [x, y] of [[6, 12], [10, 10.5], [14, 9]]) s.part(Shape.ellipse(x, y, 1.8), ramp(r.d, r.l, r.l, r.h, r.h, '#ffffff'), { outline: false, merge: false });
      s.part(Shape.capsule(17, 8, 19, 4, 0.8), leaf);
    }),
  };
}

// ---- Crop plants: designed on a 32x32 grid, drawn 25% bigger (40x40) so they overhang their bed tile.
// The base sits at about y 36. The produce sprite is drawn on top when ripe. ----
const PLANT_SIZE = 40;
const PLANT_LEAF = ramp('#123a16', '#1f5e24', '#2a7a2e', '#3a9a3c', '#5cbc52', '#8edc7a');
const STAKE = ramp('#3a2410', '#5e3a1c', '#7a4e28', '#946238', '#b07a4c', '#c89464');

function buildPlantSprites() {
  const plant = draw => { const s = new PixelSprite(PLANT_SIZE, PLANT_SIZE); draw(scaledPainter(s, PLANT_SIZE / 32)); return s.toCanvas(); };
  return {
    carrot: plant(s => {
      // Feathery fronds fanning out of an orange shoulder
      const tops = ramp('#14401a', '#226628', '#2e8434', '#40a444', '#62c45c', '#98e486');
      for (const [x, y] of [[8, 10], [12, 6], [16, 4], [20, 6], [24, 10], [10, 14], [22, 14]]) {
        s.part(Shape.capsule(16, 25, x, y, 1.2, 0.8), tops);
        s.part(Shape.ellipse(x, y, 2.2, 1.6), tops);
      }
      s.part(Shape.ellipse(16, 26, 4, 2.5), ramp('#5a2a08', '#a84e12', '#d06a1c', '#f08a2a', '#f8a85a', '#ffd09a'));
    }),
    tomato: plant(s => {
      s.part(Shape.rect(15, 3, 2.5, 26), STAKE);
      for (const [x, y, r] of [[11, 22, 5], [21, 21, 5], [10, 13, 4.5], [22, 12, 4.5], [16, 7, 4], [16, 17, 5]]) {
        s.part(Shape.ellipse(x, y, r, r * 0.85), PLANT_LEAF, { merge: false });
      }
    }),
    peas: plant(s => {
      // Climbing vine on a little trellis
      s.part(Shape.union(Shape.rect(8, 4, 2, 25), Shape.rect(22, 4, 2, 25), Shape.rect(8, 8, 16, 1.6), Shape.rect(8, 17, 16, 1.6)), STAKE);
      for (const [x, y] of [[11, 24], [20, 22], [13, 14], [19, 12], [15, 6], [10, 9], [22, 16]]) {
        s.part(Shape.ellipse(x, y, 3.2, 2.4), PLANT_LEAF, { merge: false });
      }
      s.line(16, 28, 16, 6, PLANT_LEAF.s);
    }),
    strawberry: plant(s => {
      // Low rosette of three-lobed leaves with white flowers
      for (const [x, y] of [[9, 22], [23, 22], [16, 18], [12, 26], [20, 26], [16, 25]]) {
        s.part(Shape.union(Shape.ellipse(x - 2, y, 2.4, 2), Shape.ellipse(x + 2, y, 2.4, 2), Shape.ellipse(x, y - 2, 2.4, 2)), PLANT_LEAF, { merge: false });
      }
      for (const [x, y] of [[7, 17], [25, 18]]) {
        s.dots([[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]], '#ffffff');
        s.set(x, y, '#ffd84a');
      }
    }),
  };
}

// ---- UI icons ----
function buildIconSprites() {
  const star = filled => itemSprite(s => {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 3.8 : 8.5;
      pts.push([10 + Math.cos(a) * r, 10.5 + Math.sin(a) * r]);
    }
    s.part(Shape.poly(pts), filled ? GOLD_RAMP : ramp('#2a2a34', '#3e3e4a', '#4a4a58', '#585868', '#6a6a7c', '#80808e'));
  });
  // Padlock for locked levels
  const padlock = itemSprite(s => {
    const metal = ramp('#3a2a00', '#7a5a08', '#a87e12', '#d8a820', '#f2c84a', '#fff0a0');
    s.part(Shape.minus(Shape.ellipse(10, 7, 5, 5.5), Shape.ellipse(10, 7, 2.8, 3.4)), ramp('#30343c', '#6a7280', '#9aa2ae', '#c4cad2', '#e2e6ec', '#ffffff'));
    s.part(Shape.rect(3.5, 8, 13, 10, 2), metal);
    s.part(Shape.union(Shape.ellipse(10, 12, 1.8, 1.8), Shape.rect(9.3, 12, 1.4, 3.5)), solid('#2a1a00'), { outline: false });
    s.line(5, 10, 5, 15, metal.h);
  });
  // Garden sprinkler (22x20): base plate, brass riser, a head with a nozzle arm that turns.
  // idle, two warning "tick" frames, and four spinning frames
  const sprinkler = (angle, spray) => {
    const s = new PixelSprite(22, 20);
    const metal = ramp('#30343c', '#5a606c', '#7a808c', '#9aa0ac', '#c0c6d0', '#e8ecf2');
    const brass = ramp('#4a3000', '#8a6010', '#b0801c', '#d0a030', '#e8c060', '#fff0a8');
    const green = ramp('#0a2a0e', '#14501a', '#1c6a24', '#26862e', '#40a446', '#78cc70');
    s.shadow(11, 16, 9, 3);
    s.part(Shape.ellipse(11, 15, 7, 3), green);                                 // base plate
    s.part(Shape.ellipse(11, 14.5, 4.5, 1.8), green, { merge: false });
    s.part(Shape.rect(9.5, 6, 3, 9, 1), brass, { merge: false });               // riser
    s.part(Shape.ellipse(11, 6, 3.4, 2), metal, { merge: false });              // turning head
    const ax = Math.cos(angle), ay = Math.sin(angle) * 0.5;
    s.part(Shape.capsule(11, 5.5, 11 + ax * 8, 5 + ay * 8, 1.2, 0.9), metal, { merge: false }); // nozzle arm
    s.part(Shape.ellipse(11 + ax * 8, 5 + ay * 8, 1.4, 1.2), brass, { merge: false });
    if (spray) for (let k = 1; k < 4; k++) s.set(11 + ax * (8 + k * 2), 5 + ay * (8 + k * 2) - k, k % 2 ? '#a8d4f8' : '#ffffff');
    s.set(10, 7, brass.h);
    return s.toCanvas();
  };
  return {
    starOn: star(true), starOff: star(false), padlock,
    sprinkler: {
      idle: [sprinkler(0.4, false)],
      warn: [sprinkler(0.4, false), sprinkler(0.9, false)],
      spin: [0, 1, 2, 3].map(i => sprinkler(i * Math.PI / 2 + 0.3, true)),
    },
    faces: DOG_FACE,
  };
}

// ---- More snacks, toys and pickups ----
function buildMoreItemSprites() {
  const leaf = ramp('#123a16', '#1f5e24', '#2a7a2e', '#3a9a3c', '#5cbc52', '#8edc7a');
  const crust = ramp('#5a3010', '#9a5a24', '#c07a34', '#dc9a4a', '#ecb86a', '#f8d898');
  const bread = ramp('#6a4420', '#b07a40', '#d09a58', '#e8b878', '#f4d098', '#fff0c8');
  const meat = ramp('#3a1a0c', '#6a3018', '#8a4424', '#a85a30', '#c47848', '#dc9a68');
  return {
    // Beg-level foods (people hold these, and give some away)
    chips: itemSprite(s => {
      const fry = ramp('#7a5a08', '#c8a020', '#e8c038', '#ffd84a', '#ffe680', '#fff4c0');
      for (const [x, h] of [[6, 9], [8, 11], [10, 10], [12, 12], [14, 9]]) s.part(Shape.rect(x, 12 - h + 4, 2, h), fry, { merge: false });
      s.part(Shape.poly([[4, 10], [16, 10], [14, 19], [6, 19]]), ramp('#3a0808', '#7a1414', '#a01e1e', '#c42a2a', '#de4a42', '#f0806a'), { merge: false });
      s.line(7, 12, 8, 17, '#ffffff');
    }),
    taco: itemSprite(s => {
      s.part(Shape.ellipse(10, 13, 8, 6), crust);
      s.part(Shape.rect(3, 6, 14, 6, 2), ramp('#123a16', '#1f5e24', '#2a7a2e', '#3a9a3c', '#5cbc52', '#8edc7a'), { merge: false }); // lettuce
      s.dots([[6, 8], [10, 7], [13, 9]], '#e0303a'); s.dots([[8, 9], [12, 8]], '#ffd84a');
      s.part(Shape.poly([[2, 12], [18, 12], [16, 17], [4, 17]]), crust, { merge: false });
    }),
    iceCream: itemSprite(s => {
      s.part(Shape.poly([[6, 10], [14, 10], [10, 19]]), crust);
      for (let y = 11; y < 17; y += 2) s.line(7 + (y - 11) * 0.4, y, 13 - (y - 11) * 0.4, y, crust.s);
      s.part(Shape.ellipse(10, 7, 5.5, 4.5), ramp('#7a3a50', '#c0607a', '#e08aa0', '#f4aac0', '#fcc8d8', '#ffe8f0'), { merge: false });
      s.set(8, 5, '#ffffff'); s.dots([[11, 4], [13, 7]], '#e0303a');
    }),
    cake: itemSprite(s => {
      s.part(Shape.poly([[3, 9], [17, 6], [17, 17], [3, 17]]), ramp('#6a3a18', '#a8643a', '#c8845a', '#e0a47a', '#f0c49a', '#fce4c4'));
      s.part(Shape.poly([[3, 9], [17, 6], [17, 9], [3, 12]]), ramp('#8a6a7a', '#d8aec0', '#f0c8d8', '#fce0ec', '#fff0f6', '#ffffff'), { merge: false });
      s.line(3, 13, 17, 12, '#ffffff');
      s.set(12, 4, '#e0303a'); s.set(12, 5, '#c02028');                                  // a cherry on top
    }),
    pizza: itemSprite(s => {
      s.part(Shape.poly([[2, 4], [18, 4], [10, 19]]), ramp('#8a5a08', '#d8a020', '#f0c030', '#ffd84a', '#ffe680', '#fff4c0'));
      s.part(Shape.capsule(2.5, 4, 17.5, 4, 2.3), crust, { merge: false });
      for (const [x, y] of [[7, 8], [12, 9], [10, 13]]) s.part(Shape.ellipse(x, y, 1.9, 1.7), ramp('#5a0a10', '#9a1a20', '#b82a2a', '#d23a34', '#e85a4a', '#f88a70'), { outline: false, merge: false });
      s.dots([[5, 7], [14, 7], [9, 16]], '#3a9a3c');
    }),
    corn: itemSprite(s => {
      const k = ramp('#7a5a00', '#c89a10', '#e8b820', '#ffd640', '#ffe67a', '#fff4b8');
      s.part(Shape.capsule(10, 3, 10, 16, 3.6, 3), k);
      for (let y = 4; y <= 15; y += 2) s.line(7, y, 13, y, k.s);
      for (const x of [8.5, 11.5]) s.line(x, 3, x, 16, k.s);
      s.part(Shape.union(Shape.poly([[6, 18], [4, 9], [8, 14]]), Shape.poly([[14, 18], [16, 9], [12, 14]])), leaf);
      s.part(Shape.capsule(10, 17, 10, 19.5, 1.2), leaf);
    }),
    eggplant: itemSprite(s => {
      const p = ramp('#1a0a24', '#3a1450', '#521e6e', '#6a2a8a', '#8a46aa', '#b47ad0');
      s.part(Shape.union(Shape.ellipse(10, 13, 5.5, 5.5), Shape.ellipse(10, 8, 3.6, 4)), p);
      s.part(Shape.poly([[5.5, 5], [10, 7.5], [14.5, 5], [12, 3], [10, 4.5], [8, 3]]), leaf);
      s.part(Shape.capsule(10, 4, 10, 0.5, 1), leaf);
      s.dots([[7, 10], [7, 11], [8, 9]], '#e0c8f0');
    }),
    cucumber: itemSprite(s => {
      const g = ramp('#0e3010', '#1e5a20', '#2a722a', '#3a8e36', '#5cac4e', '#8ccc74');
      s.part(Shape.capsule(3, 14, 17, 6, 3.4, 3), g);
      s.line(5, 13, 15, 7, g.l);
      for (const [x, y] of [[6, 14], [10, 11], [14, 9], [8, 10]]) s.set(x, y, g.h);
      s.part(Shape.capsule(17, 6, 19, 3.5, 0.9), leaf);
    }),
    burger: itemSprite(s => {
      s.part(Shape.ellipse(10, 12, 8, 4.5), meat);
      s.dots([[6, 10], [10, 9], [13, 11], [8, 13]], meat.d);
      s.line(5, 9, 14, 9, '#e0a040');
    }),
    toast: itemSprite(s => {
      s.part(Shape.union(Shape.rect(3, 6, 14, 11, 2), Shape.ellipse(6, 6, 3.5, 3), Shape.ellipse(14, 6, 3.5, 3)), crust);
      s.part(Shape.rect(5, 7, 10, 8, 1), bread, { clip: true, outline: false });
      s.part(Shape.rect(7, 9, 5, 4, 1), ramp('#a87a00', '#e0b020', '#f0c840', '#ffe070', '#fff0a0', '#fff8d0'), { outline: false }); // butter
    }),
    drumstick: itemSprite(s => {
      s.part(Shape.union(Shape.ellipse(8, 11, 6, 5), Shape.capsule(11, 9, 16, 4, 2.2, 1.6)), ramp('#4a2008', '#8a4418', '#b0622a', '#cc8040', '#e0a060', '#f0c48a'));
      s.part(Shape.union(Shape.capsule(14, 6, 17.5, 2.5, 1.3), Shape.ellipse(18, 2.5, 1.6), Shape.ellipse(16.8, 1.5, 1.4)), BONE_RAMP, { merge: false });
    }),
    cookie: itemSprite(s => {
      s.part(Shape.ellipse(10, 10, 7, 6.5), bread);
      for (const [x, y] of [[7, 8], [12, 7], [9, 12], [13, 11], [6, 11]]) s.rect(x, y, 2, 2, '#4a2a10');
    }),
    kibble: itemSprite(s => {
      const k = ramp('#3a200c', '#6a3a18', '#8a5024', '#a86a34', '#c4864a', '#dca66a');
      for (const [x, y] of [[5, 13], [9, 12], [13, 13], [7, 15], [11, 15], [15, 15], [9, 9], [12, 10]]) s.part(Shape.ellipse(x, y, 2.2, 1.8), k, { merge: false });
    }),
    sandwich: itemSprite(s => {
      s.part(Shape.poly([[2, 16], [18, 16], [18, 6]]), bread);
      s.line(4, 14, 17, 9, '#5cbc52'); s.line(5, 15, 17, 11, '#e85a4a');
      s.part(Shape.poly([[2, 14], [18, 14], [18, 4]]), bread, { merge: false });
    }),
    vetTreat: itemSprite(s => {
      s.part(Shape.union(Shape.rect(5, 7, 10, 6, 1), Shape.ellipse(4.5, 7.5, 2.6), Shape.ellipse(4.5, 12.5, 2.6), Shape.ellipse(15.5, 7.5, 2.6), Shape.ellipse(15.5, 12.5, 2.6)), ramp('#4a1a2a', '#8a3050', '#b04870', '#d06a90', '#e690b0', '#f8c0d4'));
      s.dots([[8, 9], [12, 10]], '#ffffff');
    }),
    honey: itemSprite(s => {
      s.part(Shape.union(Shape.ellipse(10, 14, 8, 3.5), Shape.ellipse(6, 13, 3, 2)), ramp('#5a2a00', '#a85a08', '#d0820e', '#eea020', '#f8c050', '#fff0a0'));
      s.dots([[7, 13], [8, 13], [12, 14]], '#fff8d0');
    }),
    raincoat: itemSprite(s => {
      s.part(Shape.union(Shape.poly([[4, 6], [16, 6], [18, 17], [2, 17]]), Shape.ellipse(10, 6, 5, 3)), RAINCOAT);
      s.part(Shape.ellipse(10, 5.5, 3, 1.8), ramp('#3a2a00', '#6a5000', '#8a6a00', '#a88400', '#c09c20', '#d8b440'), { outline: false });
      s.dots([[10, 9], [10, 12], [10, 15]], '#6a4a00');
    }),
    poop: itemSprite(s => {
      const p = ramp('#1e0e04', '#3e2010', '#55301a', '#6c4024', '#865434', '#a8724c');
      s.part(Shape.ellipse(10, 15, 7, 3), p);
      s.part(Shape.ellipse(10, 11.5, 5, 2.6), p, { merge: false });
      s.part(Shape.union(Shape.ellipse(10, 8.5, 3.2, 2), Shape.poly([[9, 7], [12, 3.5], [11.5, 7.5]])), p, { merge: false });
      s.dots([[8, 10], [7, 14]], p.h);
    }),
    // Toys: they don't run away; the dog pounces on them and plays
    toyBall: itemSprite(s => {
      s.part(Shape.ellipse(10, 12, 6, 6), ramp('#4a5a00', '#8aa800', '#aacc10', '#cce830', '#e0f470', '#f4ffb0'));
      s.line(5, 10, 15, 14, '#ffffff');
    }),
    toyRope: itemSprite(s => {
      s.part(Shape.capsule(4, 12, 16, 10, 2.2), ramp('#3a1a3a', '#7a3a6a', '#a05088', '#c86aa8', '#e090c4', '#f4b8dc'));
      for (let x = 5; x <= 15; x += 2) s.line(x, 9, x + 1, 13, '#ffffff');
      s.part(Shape.ellipse(3, 12.5, 2.2, 2.5), ramp('#3a3a3a', '#8a8a8a', '#b0b0b0', '#d0d0d0', '#e8e8e8', '#ffffff'));
      s.part(Shape.ellipse(17, 10, 2.2, 2.5), ramp('#3a3a3a', '#8a8a8a', '#b0b0b0', '#d0d0d0', '#e8e8e8', '#ffffff'));
    }),
    toyChicken: itemSprite(s => {
      const y = ramp('#7a5a00', '#c89a10', '#e8b820', '#ffd640', '#ffe67a', '#fff4b8');
      s.part(Shape.union(Shape.ellipse(9, 13, 6, 4), Shape.capsule(13, 11, 15, 5, 1.8)), y);
      s.part(Shape.ellipse(15.5, 4.5, 2.4, 2.2), y);
      s.dots([[18, 4], [18, 5]], '#e05a20');
      s.set(16, 4, '#101010');
      s.dots([[15, 2], [16, 2]], '#e03030');
    }),
    toyPlush: itemSprite(s => {
      const b = ramp('#3a2010', '#7a4a28', '#9a6238', '#b87c4c', '#d09a6a', '#e8bc90');
      s.part(Shape.union(Shape.ellipse(10, 13, 5.5, 4.5), Shape.ellipse(10, 7, 4.5, 4)), b);
      s.part(Shape.ellipse(6.5, 4, 1.8), b, { merge: false }); s.part(Shape.ellipse(13.5, 4, 1.8), b, { merge: false });
      s.dots([[8, 7], [12, 7]], '#101010');
      s.part(Shape.ellipse(10, 9, 1.8, 1.2), ramp('#5a3a2a', '#a07060', '#c09080', '#e0b8a8', '#f0d0c0', '#ffe8e0'), { outline: false });
    }),
  };
}

function buildMorePlantSprites() {
  const plant = draw => { const s = new PixelSprite(PLANT_SIZE, PLANT_SIZE); draw(scaledPainter(s, PLANT_SIZE / 32)); return s.toCanvas(); };
  const stalk = ramp('#2a4a10', '#3e6a18', '#4e8422', '#62a02e', '#80bc48', '#a8d870');
  return {
    corn: plant(s => {
      // Tall stalk with long arching leaves (overhangs the top of the tile)
      s.part(Shape.rect(15, 0, 2.6, 30), stalk);
      for (const [x1, y1, x2, y2] of [[16, 22, 5, 14], [16, 18, 27, 10], [16, 12, 6, 4], [16, 8, 25, 1]]) s.part(Shape.capsule(16, y1, x2, y2, 1.6, 0.6), PLANT_LEAF, { merge: false });
      s.part(Shape.capsule(18, 14, 21, 9, 1.8, 1.3), ramp('#4a6a10', '#7a9a20', '#a0b830', '#c8d850', '#e0ec80', '#f4f8b0'), { merge: false });
      s.dots([[15, 0], [17, 0], [16, 1]], '#e0c060');
    }),
    eggplant: plant(s => {
      s.part(Shape.capsule(16, 29, 16, 12, 1.2), ramp('#2a0a2a', '#4a1a4a', '#5e2a5e', '#764076', '#905690', '#ac74ac'));
      for (const [x, y, r] of [[10, 22, 5.5], [22, 21, 5.5], [11, 13, 4.5], [21, 12, 4.5], [16, 8, 4]]) s.part(Shape.ellipse(x, y, r, r * 0.75), PLANT_LEAF, { merge: false });
      s.dots([[15, 5], [17, 5], [16, 4], [16, 6]], '#b48cff'); s.set(16, 5, '#ffd84a');
    }),
    cucumber: plant(s => {
      // Vine scrambling over a small A-frame trellis, with yellow flowers
      s.part(Shape.union(Shape.capsule(6, 29, 14, 3, 1), Shape.capsule(26, 29, 18, 3, 1), Shape.rect(7, 15, 18, 1.4)), STAKE);
      for (const [x, y] of [[9, 24], [22, 23], [11, 15], [21, 14], [15, 7], [18, 9]]) s.part(Shape.ellipse(x, y, 3.4, 2.6), PLANT_LEAF, { merge: false });
      for (const [x, y] of [[13, 21], [20, 18]]) { s.dots([[x, y - 1], [x - 1, y], [x + 1, y], [x, y + 1]], '#ffd84a'); s.set(x, y, '#e0a020'); }
    }),
  };
}
