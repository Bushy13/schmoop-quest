// A tiny pixel-art painter. Sprites are built from simple shapes (ellipses, tapered capsules,
// polygons, rounded rects). Each shape is shaded automatically with a colour ramp lit from the
// top-left and given a dark coloured outline; hand-placed detail pixels go on top. Everything is
// pixel-snapped with no anti-aliasing, and the result is rendered once into a small canvas.

// Ramps run from darkest to lightest: outline, deep shadow, shadow, base, light, highlight
function ramp(o, d, s, b, l, h) { return { o, d, s, b, l, h }; }
// The same material one step darker, for limbs on the far side of a body
function farRamp(r) {
  if (!r.far) r.far = { o: r.o, d: r.o, s: r.d, b: r.s, l: r.b, h: r.l };
  return r.far;
}

// Shapes are predicates over pixel coordinates (tested at the pixel centre). Each carries a bounding
// box (`box` = [x0, y0, x1, y1]) so painting only visits the pixels it can cover.
const withBox = (fn, box) => { fn.box = box; return fn; };
const Shape = {
  ellipse(cx, cy, rx, ry = rx) {
    return withBox((x, y) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1, [cx - rx, cy - ry, cx + rx, cy + ry]);
  },
  // A line segment with round ends; the radius tapers from r1 to r2 along its length
  capsule(x1, y1, x2, y2, r1, r2 = r1) {
    const dx = x2 - x1, dy = y2 - y1, len2 = dx * dx + dy * dy || 1, r = Math.max(r1, r2);
    return withBox((x, y) => {
      const px = x + 0.5, py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
      const rr = r1 + (r2 - r1) * t;
      return (px - x1 - dx * t) ** 2 + (py - y1 - dy * t) ** 2 <= rr * rr;
    }, [Math.min(x1, x2) - r, Math.min(y1, y2) - r, Math.max(x1, x2) + r, Math.max(y1, y2) + r]);
  },
  rect(x, y, w, h, r = 0) {
    return withBox((px, py) => {
      const cx = px + 0.5, cy = py + 0.5;
      if (cx < x || cy < y || cx > x + w || cy > y + h) return false;
      const nx = Math.max(x + r, Math.min(cx, x + w - r)), ny = Math.max(y + r, Math.min(cy, y + h - r));
      return (cx - nx) ** 2 + (cy - ny) ** 2 <= r * r + 0.01;
    }, [x, y, x + w, y + h]);
  },
  poly(points) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    return withBox((x, y) => {
      const px = x + 0.5, py = y + 0.5;
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const [xi, yi] = points[i], [xj, yj] = points[j];
        if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }, [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]);
  },
  union(...shapes) {
    const boxed = shapes.every(sh => sh.box);
    return withBox((x, y) => shapes.some(sh => sh(x, y)), boxed ? [
      Math.min(...shapes.map(sh => sh.box[0])), Math.min(...shapes.map(sh => sh.box[1])),
      Math.max(...shapes.map(sh => sh.box[2])), Math.max(...shapes.map(sh => sh.box[3])),
    ] : null);
  },
  minus(a, b) { return withBox((x, y) => a(x, y) && !b(x, y), a.box || null); },
};

class PixelSprite {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.px = new Array(w * h).fill(null);  // colour per pixel
    this.mat = new Array(w * h).fill(null); // which ramp ("material") painted it
  }

  inside(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  set(x, y, colour) {
    x = Math.round(x); y = Math.round(y);
    if (this.inside(x, y) && colour) { this.px[y * this.w + x] = colour; this.mat[y * this.w + x] = null; }
    return this;
  }

  dots(points, colour) { for (const [x, y] of points) this.set(x, y, colour); return this; }

  rect(x, y, w, h, colour) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, colour);
    return this;
  }

  line(x0, y0, x1, y1, colour) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, colour);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
    return this;
  }

  // Recolours already-painted pixels inside `shape` whose colour is one of `from`
  tint(shape, from, to) {
    const bx = shape.box || [0, 0, this.w, this.h];
    for (let y = Math.max(0, Math.floor(bx[1])); y <= Math.min(this.h - 1, Math.ceil(bx[3])); y++) {
      for (let x = Math.max(0, Math.floor(bx[0])); x <= Math.min(this.w - 1, Math.ceil(bx[2])); x++) {
        const i = y * this.w + x;
        if (shape(x, y) && from.includes(this.px[i])) this.px[i] = to;
      }
    }
    return this;
  }

  // Paints a shaded, outlined shape.
  //   clip:    only paint over pixels that are already painted (markings, collars)
  //   merge:   treat touching pixels of the same ramp as part of this shape when shading, so joins
  //            between parts (a leg meeting the body) don't get a highlight seam
  //   outline: draw the ramp's outline colour around the shape where it meets empty space or a
  //            different material
  //   crease:  where it overlaps the same material, draw a softer deep-shadow line instead
  //            (skipped along the top edge so joins stay clean)
  //   flat:    fill with the base colour only
  part(shape, r, { clip = false, merge = true, outline = true, crease = true, flat = false } = {}) {
    const { w, h } = this;
    const m = new Uint8Array(w * h);
    // Only visit the shape's bounding box (plus a pixel of margin for the outline)
    const bx = shape.box || [0, 0, w, h];
    const x0 = Math.max(0, Math.floor(bx[0]) - 1), y0 = Math.max(0, Math.floor(bx[1]) - 1);
    const x1 = Math.min(w - 1, Math.ceil(bx[2]) + 1), y1 = Math.min(h - 1, Math.ceil(bx[3]) + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (shape(x, y) && (!clip || this.px[y * w + x] !== null)) m[y * w + x] = 1;
      }
    }
    const solid = (x, y) => this.inside(x, y) && (m[y * w + x] === 1 || (merge && this.mat[y * w + x] === r));
    const run = (x, y, dx, dy) => {
      let k = 0;
      while (k < 4 && solid(x + dx * (k + 1), y + dy * (k + 1))) k++;
      return k;
    };

    const fills = [];
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!m[y * w + x]) continue;
        let c = r.b;
        if (!flat) {
          const up = run(x, y, 0, -1), left = run(x, y, -1, 0), down = run(x, y, 0, 1), right = run(x, y, 1, 0);
          if (up === 0) c = r.h;
          else if (up === 1 || left === 0) c = r.l;
          else if (down === 0) c = r.d;
          else if (down <= 2 || right === 0) c = r.s;
        }
        fills.push(y * w + x, c);
      }
    }

    const lines = [];
    if (outline) {
      for (let y = Math.max(0, y0 - 1); y <= Math.min(h - 1, y1 + 1); y++) {
        for (let x = Math.max(0, x0 - 1); x <= Math.min(w - 1, x1 + 1); x++) {
          const i = y * w + x;
          if (m[i]) continue;
          const above = y > 0 && m[i - w], below = y < h - 1 && m[i + w];
          const left = x > 0 && m[i - 1], right = x < w - 1 && m[i + 1];
          if (!above && !below && !left && !right) continue;
          if (this.px[i] === null || this.mat[i] !== r) lines.push(i, r.o);
          else if (crease && (above || left || right)) lines.push(i, r.d);
        }
      }
    }

    for (let k = 0; k < fills.length; k += 2) { this.px[fills[k]] = fills[k + 1]; this.mat[fills[k]] = r; }
    for (let k = 0; k < lines.length; k += 2) { this.px[lines[k]] = lines[k + 1]; this.mat[lines[k]] = r; }
    return this;
  }

  get(x, y) { x = Math.round(x); y = Math.round(y); return this.inside(x, y) ? this.px[y * this.w + x] : null; }

  erase(x, y, w = 1, h = 1) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const X = Math.round(x + i), Y = Math.round(y + j);
      if (this.inside(X, Y)) { this.px[Y * this.w + X] = null; this.mat[Y * this.w + X] = null; }
    }
    return this;
  }

  // Flat-fills a shape with one colour (no shading, no outline)
  fill(shape, colour, { clip = false } = {}) {
    const bx = shape.box || [0, 0, this.w, this.h];
    for (let y = Math.max(0, Math.floor(bx[1]) - 1); y <= Math.min(this.h - 1, Math.ceil(bx[3]) + 1); y++) {
      for (let x = Math.max(0, Math.floor(bx[0]) - 1); x <= Math.min(this.w - 1, Math.ceil(bx[2]) + 1); x++) {
        if (shape(x, y) && (!clip || this.px[y * this.w + x] !== null)) { this.px[y * this.w + x] = colour; this.mat[y * this.w + x] = null; }
      }
    }
    return this;
  }

  // A block seen from the three-quarter top-down view: a lit top face, a darker front face,
  // a highlight along the front edge and rounded corners. Returns the front face's top y.
  box(x, y, w, top, front, r, { round = 1, edge = true } = {}) {
    x = Math.round(x); y = Math.round(y);
    this.rect(x, y, w, top + front, r.o);
    this.rect(x + 1, y + 1, w - 2, top - 1, r.l);
    this.rect(x + 1, y + 1, w - 2, 1, r.h);
    this.rect(x + 1, y + 1, 1, top - 1, r.h);
    if (front > 1) {
      this.rect(x + 1, y + top, w - 2, front - 1, r.b);
      if (edge) this.rect(x + 1, y + top, w - 2, 1, r.h);
      this.rect(x + 1, y + top + front - 2, w - 2, 1, r.s);
      this.rect(x + w - 2, y + top + 1, 1, front - 2, r.s);
    }
    if (round) { // knock the corners off
      for (const [cx, cy] of [[x, y], [x + w - 1, y], [x, y + top + front - 1], [x + w - 1, y + top + front - 1]]) this.erase(cx, cy);
    }
    return y + top;
  }

  // Thin random strokes along a surface (wood grain, fabric weave, brushed metal)
  grain(x, y, w, h, colours, { horizontal = true, density = 0.12, seed = 7, len = [2, 6] } = {}) {
    const rng = seeded(seed + x * 31 + y * 17);
    const n = Math.round(w * h * density / ((len[0] + len[1]) / 2));
    for (let i = 0; i < n; i++) {
      const L = len[0] + Math.floor(rng() * (len[1] - len[0] + 1));
      const sx = x + Math.floor(rng() * w), sy = y + Math.floor(rng() * h), c = colours[Math.floor(rng() * colours.length)];
      for (let k = 0; k < L; k++) {
        const px = horizontal ? sx + k : sx, py = horizontal ? sy : sy + k;
        if (px < x + w && py < y + h && this.get(px, py)) this.set(px, py, c);
      }
    }
    return this;
  }

  // Random single-pixel flecks inside a rectangle (only over painted pixels)
  speckle(x, y, w, h, colours, n, seed = 3) {
    const rng = seeded(seed + x * 13 + y * 7);
    for (let i = 0; i < n; i++) {
      const px = x + Math.floor(rng() * w), py = y + Math.floor(rng() * h);
      if (this.get(px, py)) this.set(px, py, colours[i % colours.length]);
    }
    return this;
  }

  // A soft ground shadow under an object
  shadow(cx, cy, rx, ry, alpha = 0.28) {
    const c = `rgba(20,24,16,${alpha})`;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        if (((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1 && this.inside(x, y) && !this.px[y * this.w + x]) this.px[y * this.w + x] = c;
      }
    }
    return this;
  }

  // Outlines everything painted so far with a dark colour (pixels that are empty next to painted ones)
  outlineAll(colour) {
    const add = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const i = y * this.w + x;
        if (this.px[i] && !String(this.px[i]).startsWith('rgba')) continue;
        if (this.px[i]) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const c = this.get(x + dx, y + dy); return c && !String(c).startsWith('rgba'); });
        if (n) add.push(i);
      }
    }
    for (const i of add) this.px[i] = colour;
    return this;
  }

  // Copies another sprite's pixels into this one at an offset
  blit(src, ox, oy) {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const c = src.px[y * src.w + x];
        if (c && this.inside(x + ox, y + oy)) { this.px[(y + oy) * this.w + x + ox] = c; this.mat[(y + oy) * this.w + x + ox] = src.mat[y * src.w + x]; }
      }
    }
    return this;
  }

  toCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = this.w;
    canvas.height = this.h;
    const g = canvas.getContext('2d');
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const c = this.px[y * this.w + x];
        if (c) { g.fillStyle = c; g.fillRect(x, y, 1, 1); }
      }
    }
    return canvas;
  }
}

// Paints onto `s` with every coordinate and shape multiplied by k: lets a recipe drawn on a small
// grid render bigger at native resolution (1px outlines, crisp detail) instead of being stretched
function scaledPainter(s, k) {
  const sc = sh => withBox((x, y) => sh((x + 0.5) / k - 0.5, (y + 0.5) / k - 0.5), sh.box ? sh.box.map(v => v * k) : null);
  return {
    sprite: s, k,
    part: (sh, r, o) => s.part(sc(sh), r, o),
    tint: (sh, from, to) => s.tint(sc(sh), from, to),
    set: (x, y, c) => s.set(x * k, y * k, c),
    dots: (pts, c) => { for (const [x, y] of pts) s.set(x * k, y * k, c); },
    line: (x0, y0, x1, y1, c) => s.line(x0 * k, y0 * k, x1 * k, y1 * k, c),
    rect: (x, y, w, h, c) => s.rect(Math.round(x * k), Math.round(y * k), Math.round(w * k), Math.round(h * k), c),
  };
}

function flipCanvas(src) {
  const canvas = document.createElement('canvas');
  canvas.width = src.width;
  canvas.height = src.height;
  const g = canvas.getContext('2d');
  g.translate(src.width, 0);
  g.scale(-1, 1);
  g.drawImage(src, 0, 0);
  return canvas;
}

// Maps each frame list in a {anim: [frames]} set through flipCanvas (for left-facing views)
const flipSet = set => Object.fromEntries(Object.entries(set).map(([k, frames]) => [k, frames.map(flipCanvas)]));

// Small seeded random generator so procedural art (leaf clusters, textures) is the same every load
function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
