# Builds the dog sprite sheets used by the game from the Sprite Fusion frames in spritefusion/frames.
#   python3 art_src/build_dog_sheets.py
# For each dog (Harley as drawn, Bobbin recoloured) and each coat (plain, raincoat) it packs every
# animation into one sheet: 64x66 cells, one animation per row, with every frame's feet on y=62.
# The sheets are written as data URLs into js/art/dogsheets.js, so the game works from file://
# (no image files to load, and nothing ever has to read pixels back out of a canvas).
import os, sys, json, base64, colorsys, io
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from pngio import read, write

F = os.path.join(HERE, 'spritefusion', 'frames')
CW, CH, FOOT = 64, 66, 62
hls = lambda p: colorsys.rgb_to_hls(p[0] / 255, p[1] / 255, p[2] / 255)
hexc = lambda h: (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16), 255)

def to64(f):
    """Fits a frame of any size into a 64x64 cell (centred, standing on the bottom)."""
    H, W = len(f), len(f[0])
    cell = [[(0, 0, 0, 0)] * 64 for _ in range(64)]
    ox, oy = (64 - W) // 2, 64 - H
    for y in range(H):
        for x in range(W):
            if 0 <= x + ox < 64 and 0 <= y + oy < 64:
                cell[y + oy][x + ox] = f[y][x]
    return cell

def strip(name, fw=64):
    """An animation strip: frames side by side, each `fw` wide (the strip's height tall)."""
    W, H, px = read(os.path.join(F, name))
    return [to64([row[i * fw:(i + 1) * fw] for row in px]) for i in range(W // fw)]
def fit(name, k=1.0, frames=8, despeck=False, stick=False, water=False, fix=None):
    """A strip of `frames` frames of any size (the newer Sprite Fusion strips are cropped to the dog),
    each resized by k (nearest neighbour, standing on the bottom) and fitted into a 64x64 cell."""
    W, H, px = read(os.path.join(F, name))
    fw, out = W // frames, []
    raw = [[row[i * fw:(i + 1) * fw] for row in px] for i in range(frames)]
    if fix:
        raw = fix(raw)
    for f in raw:
        if despeck:
            f = clean_specks(f)
        if stick or water:
            f = mark_props(f, stick, water)
        if k != 1.0:
            nw, nh = max(1, round(fw * k)), max(1, round(H * k))
            f = [[f[min(H - 1, int((y + 0.5) / k))][min(fw - 1, int((x + 0.5) / k))] for x in range(nw)] for y in range(nh)]
        out.append(to64(f))
    return out

def fix_creep(frames, tail_w=13, tail_h=18, slack=0):
    """The plain side-on creep came back with stray black spikes over the head, a line by the nose and
    the tail flicking straight up in some frames. Frame 0 is clean, so: the tail and rump (top-left
    corner) come from frame 0, and anything sticking up above frame 0's outline (give or take `slack` rows)
    is erased."""
    ref, H, W = frames[0], len(frames[0]), len(frames[0][0])
    top = [next((y for y in range(H) if ref[y][x][3]), H) for x in range(W)]
    out = [ref]
    for f in frames[1:]:
        g = [list(r) for r in f]
        for y in range(H):
            for x in range(W):
                if x < tail_w and y < tail_h:
                    g[y][x] = ref[y][x]
                elif y < top[x] - slack:
                    g[y][x] = (0, 0, 0, 0)
        out.append(g)
    return out

def mark_props(f, stick, water):
    """Marks the wooden stick's browns and the shake's blue water drops (alpha 254, like the snake) so
    recolouring Bobbin leaves them as drawn."""
    out = [list(r) for r in f]
    for y, row in enumerate(f):
        for x, p in enumerate(row):
            if p[3]:
                h, l, sat = hls(p)
                if (stick and 0.04 <= h <= 0.11 and sat > 0.25 and 0.12 <= l <= 0.45) or (water and 0.5 <= h <= 0.67 and sat > 0.3):
                    out[y][x] = (p[0], p[1], p[2], 254)
    return out

def clean_specks(f, keep=30):
    """Removes little loose blobs of pixels (fewer than `keep`, not touching the dog)."""
    H, W = len(f), len(f[0])
    seen, out = set(), [list(r) for r in f]
    for y in range(H):
        for x in range(W):
            if f[y][x][3] == 0 or (x, y) in seen:
                continue
            blob, todo = [], [(x, y)]
            seen.add((x, y))
            while todo:
                cx, cy = todo.pop(); blob.append((cx, cy))
                for nx, ny in ((cx + 1, cy), (cx - 1, cy), (cx, cy + 1), (cx, cy - 1), (cx + 1, cy + 1), (cx - 1, cy - 1), (cx + 1, cy - 1), (cx - 1, cy + 1)):
                    if 0 <= nx < W and 0 <= ny < H and f[ny][nx][3] and (nx, ny) not in seen:
                        seen.add((nx, ny)); todo.append((nx, ny))
            if len(blob) < keep:
                for bx, by in blob:
                    out[by][bx] = (0, 0, 0, 0)
    return out

def still(name):
    return [read(os.path.join(F, name))[2]]

# Every animation: view, game animation name, frames. All side views face right.
SOURCES = {
    'happyRun': strip('anim_131c87dd_sheet.png'),   # running happily
    'fastRun':  strip('anim_f6b1ca3f_sheet.png'),   # running really fast
    'sniff':    strip('anim_8f60f11a_sheet.png'),   # sniffing the ground
    'nervous':  strip('anim_04e8391e_sheet.png'),   # nervous and scared
    'sitDown':  strip('anim_89e5c904_sheet.png'),   # sits down and wags
    'happySit': strip('anim_93beed5b_sheet.png'),   # sitting, tongue out, wagging (three-quarter)
    'creep':    strip('anim_a4e5ca08_sheet.png'),   # creeping slowly, low to the ground
    'walkS':    strip('out_walk_S_0_sheet.png'),
    'walkN':    strip('out_walk_N_0_sheet.png'),
    'poop':     strip('anim_poop_sheet.png'),       # squats down for a poop, then gets back up (16 frames)
    'tug':      strip('anim_tug_sheet.png'),        # playing tug with a rope toy (16 frames)
    'shake':    strip('anim_shake_sheet.png'),      # shaking the toy about violently (16 frames)
    'dig':      strip('anim_dig_sheet.png')[2:],    # digging in the sand, head down (a loop)
    'E': still('dirs2_E.png'), 'S': still('dirs2_S.png'), 'N': still('dirs2_N.png'),
    # Wearing the yellow raincoat (rainy levels, once it's found)
    'coatE': still('coat_E.png'), 'coatS': still('coat_S.png'), 'coatN': still('coat_N.png'),
    'coatRun': strip('coat_runE_sheet.png'), 'coatWalkS': strip('coat_walkS_sheet.png'), 'coatWalkN': strip('coat_walkN_sheet.png'),
    'coatSprint': strip('coat_sprint_sheet.png'), 'coatCreep': strip('coat_creep_sheet.png'), 'coatSniff': strip('coat_sniff_sheet.png'),
    'coatNervous': strip('coat_nervous_sheet.png'), 'coatHappy': strip('coat_happy_sheet.png'), 'coatPoop': strip('coat_poop_sheet.png'),
    'coatTug': strip('coat_tug_sheet.png', 66), 'coatShake': strip('coat_shake_sheet.png', 66),
    # Batch 2 (2026-10-16): proper versions of the moves that were made in code, and side-on creep/happy.
    # The raincoat ones were edited from the plain poses, so they're already the plain dog's size.
    'carry':     fit('anim_carry_sheet.png', despeck=True, stick=True),     # trotting with a stick in its mouth
    'roll':      fit('anim_roll_sheet.png', 0.85),               # belly-up, wriggling in a smell
    'creepSide': fit('anim_creep_side_sheet.png', 0.93, fix=fix_creep),         # creeping low, side-on
    'wetShake':  fit('anim_wetshake_sheet.png', 0.9, water=True),            # shaking the water off
    'stand':     fit('anim_stand_sheet.png', 0.95),              # up on the hind legs, sniffing
    'woof':      fit('anim_bark_sheet.png'),                     # standing and barking
    'drink':     fit('anim_drink_sheet.png')[3:],                # lapping water, head down (a loop)
    'happySide': fit('anim_happy_side_sheet.png'),               # sitting side-on, panting and wagging
    'coatCarry': fit('coat_carry_sheet.png', despeck=True, stick=True), 'coatRoll': fit('coat_roll_sheet.png', 0.85),
    'coatCreepSide': fit('coat_creep_side_sheet.png', 0.79), 'coatWetShake': fit('coat_wetshake_sheet.png', 0.9, water=True),
    'coatStand': fit('coat_stand_sheet.png', 0.95), 'coatWoof': fit('coat_bark_sheet.png'),
    'coatDrink': fit('coat_drink_sheet.png')[3:], 'coatDig': fit('coat_dig_sheet.png')[2:],
    'coatSquat': fit('coat_squat_sheet.png', 1.2),               # holding the poo squat (a loop)
    # 2026-10-19: curled up fast asleep (one still frame, for the bedtime ending; the breathing is done in code)
    'sleep':     fit('anim_sleep.png', 0.85, frames=1),
}

# ---- Bobbin's snake fight: the tug strip, with the rope toy turned into the red-bellied black snake ----
SNAKE_PX = {'body': [(5, 5, 8, 255), (16, 16, 22, 254), (26, 26, 34, 254), (36, 36, 46, 254)], 'belly': (208, 48, 58, 254), 'bellyLight': (240, 90, 90, 254)}
SNAKE_SET = set(SNAKE_PX['body']) | {SNAKE_PX['belly'], SNAKE_PX['bellyLight']}  # alpha 254 marks them so the recolour leaves them alone
def toy_to_snake(f):
    out = [list(r) for r in f]
    for y, row in enumerate(f):
        for x, p in enumerate(row):
            if not p[3]:
                continue
            h, l, sat = hls(p)
            if sat > 0.35 and (h < 0.06 or h > 0.95) and l < 0.75:
                # mostly glossy black, with the red belly showing along the middle tones
                out[y][x] = SNAKE_PX['body'][3] if l > 0.6 else SNAKE_PX['belly'] if l > 0.4 else SNAKE_PX['body'][2] if l > 0.2 else SNAKE_PX['body'][1] if l > 0.1 else SNAKE_PX['body'][0]
    return out
# ---- Menace Run: the same toy shake with the rope turned into a stick or a red sneaker (alpha 254
# marks them too, so recolouring Bobbin leaves them alone) ----
STICK_PX = [(58, 36, 16, 254), (106, 70, 34, 254), (138, 90, 42, 254), (170, 118, 62, 254)]
SHOE_PX = [(90, 14, 14, 254), (200, 40, 40, 254), (240, 240, 240, 254), (255, 255, 255, 254)]
def toy_to(f, px):
    out = [list(r) for r in f]
    for y, row in enumerate(f):
        for x, p in enumerate(row):
            if not p[3]:
                continue
            h, l, sat = hls(p)
            if sat > 0.35 and (h < 0.06 or h > 0.95) and l < 0.75:
                out[y][x] = px[3] if l > 0.6 else px[2] if l > 0.4 else px[1] if l > 0.15 else px[0]
    return out

LAYOUT = [
    ('side', 'idle', SOURCES['E']),
    ('side', 'run', SOURCES['happyRun']),
    ('side', 'sprint', SOURCES['fastRun']),
    ('side', 'sniff', SOURCES['sniff']),
    ('side', 'nervous', SOURCES['nervous']),
    ('side', 'squat', SOURCES['poop']),
    ('side', 'sitDown', SOURCES['sitDown']),
    ('side', 'happy', SOURCES['happySide']),
    ('side', 'slow', SOURCES['creepSide']),
    ('side', 'tug', SOURCES['tug']),
    ('side', 'shake', SOURCES['shake']),
    ('side', 'shakeSnake', [toy_to_snake(f) for f in SOURCES['tug']]),  # Bobbin's snake fight: the tug strip, rope turned into the snake
    ('side', 'shakeStick', [toy_to(f, STICK_PX) for f in SOURCES['shake']]),
    ('side', 'shakeShoe', [toy_to(f, SHOE_PX) for f in SOURCES['shake']]),
    ('side', 'dig', SOURCES['dig']),
    ('side', 'carry', SOURCES['carry']),
    ('side', 'roll', SOURCES['roll']),
    ('side', 'stand', SOURCES['stand']),
    ('side', 'shakeWet', SOURCES['wetShake']),
    ('side', 'woof', SOURCES['woof']),
    ('side', 'drink', SOURCES['drink']),
    ('side', 'sleep', SOURCES['sleep']),
    ('down', 'idle', SOURCES['S']),
    ('down', 'run', SOURCES['walkS']),
    ('up', 'idle', SOURCES['N']),
    ('up', 'run', SOURCES['walkN']),
    ('down', 'bandaged', SOURCES['S']),
]
# In the raincoat: the same rows, filled from the raincoat frames
_c = SOURCES
COAT_LAYOUT = [
    ('side', 'idle', _c['coatE']), ('side', 'run', _c['coatRun']), ('side', 'sprint', _c['coatSprint']),
    ('side', 'sniff', _c['coatSniff']), ('side', 'nervous', _c['coatNervous']), ('side', 'squat', _c['coatSquat']),
    ('side', 'sitDown', _c['coatHappy']), ('side', 'happy', _c['coatHappy']), ('side', 'slow', _c['coatCreepSide']),
    ('side', 'tug', _c['coatTug']), ('side', 'shake', _c['coatShake']),
    ('side', 'shakeSnake', [toy_to_snake(f) for f in _c['coatTug']]),
    ('side', 'shakeStick', [toy_to(f, STICK_PX) for f in _c['coatShake']]), ('side', 'shakeShoe', [toy_to(f, SHOE_PX) for f in _c['coatShake']]),
    ('side', 'dig', _c['coatDig']),
    ('side', 'carry', _c['coatCarry']), ('side', 'roll', _c['coatRoll']), ('side', 'stand', _c['coatStand']),
    ('side', 'shakeWet', _c['coatWetShake']), ('side', 'woof', _c['coatWoof']), ('side', 'drink', _c['coatDrink']),
    ('side', 'sleep', _c['sleep']),  # (only at bedtime, indoors: no raincoat)
    ('down', 'idle', _c['coatS']), ('down', 'run', _c['coatWalkS']),
    ('up', 'idle', _c['coatN']), ('up', 'run', _c['coatWalkN']),
    ('down', 'bandaged', _c['S']),
]
assert [(v, n) for v, n, _ in COAT_LAYOUT] == [(v, n) for v, n, _ in LAYOUT]

def bbox(px):
    pts = [(x, y) for y, r in enumerate(px) for x, p in enumerate(r) if p[3] > 0]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

# Sprite Fusion drew some animations at a slightly different scale. These factors resize them
# (around the feet) so the dog is the same size in every animation. Judged against the standing
# side view, comparing whole-body sizes in the same pose family.
SCALE = {
    ('coat', 'carry'): 1.0, ('coat', 'roll'): 1.0, ('coat', 'stand'): 1.0, ('coat', 'shakeWet'): 1.0, ('coat', 'slow'): 1.0,
    ('plain', 'tug'): 0.96, ('plain', 'shake'): 0.96, ('plain', 'shakeSnake'): 0.96, ('plain', 'shakeStick'): 0.96, ('plain', 'shakeShoe'): 0.96,
    ('coat', 'tug'): 0.9, ('coat', 'shake'): 0.9, ('coat', 'shakeSnake'): 0.9, ('coat', 'shakeStick'): 0.9, ('coat', 'shakeShoe'): 0.9,
    ('coat', 'down'): 0.86, ('coat', 'up'): 0.92,
}
COAT_SIDE_SCALE = 1.05  # the raincoat dog was drawn a touch small side-on

def resize(f, k, ax, ay):
    """Nearest-neighbour resize of a 64x64 frame by k around the point (ax, ay)."""
    out = [[(0, 0, 0, 0)] * 64 for _ in range(64)]
    for y in range(64):
        for x in range(64):
            sx, sy = int(ax + (x + 0.5 - ax) / k), int(ay + (y + 0.5 - ay) / k)
            if 0 <= sx < 64 and 0 <= sy < 64:
                out[y][x] = f[sy][sx]
    return out

def place(frames, k=1.0):
    """Resizes an animation by k (around its feet), then moves every frame down by the same amount
    so the feet sit on y=FOOT."""
    if k != 1.0:
        x0, _, x1, y1 = bbox(frames[0])
        frames = [resize(f, k, (x0 + x1 + 1) / 2, y1 + 1) for f in frames]
    dy = FOOT - bbox(frames[0])[3]
    out = []
    for f in frames:
        cell = [[(0, 0, 0, 0)] * CW for _ in range(CH)]
        for y in range(64):
            if 0 <= y + dy < CH:
                cell[y + dy] = list(f[y])
        out.append(cell)
    return out


# ---- Bobbin: Harley's black coat becomes white, the green collar pink, dark outlines warm brown,
# and the nose pink ----
def palette(coat, collar, outline, dark, ear, nose=None):
    return {'coat': [hexc(c) for c in coat], 'collar': [hexc(c) for c in collar], 'outline': hexc(outline),
            'dark': hexc(dark), 'ear': hexc(ear), 'nose': [hexc(c) for c in nose] if nose else None}
PALETTES = {
    'bobbin': palette(('#a39283', '#c9bcae', '#e9e1d6', '#f6f1ea', '#ffffff'), ('#5e1233', '#a3245b', '#cc3a78', '#ec5596', '#f78bb8'),
                      '#6b574c', '#3a2a24', '#d88a98', ('#b04060', '#e0607f', '#ffc2d2')),
    # The other dogs at the dog park: Staffies in red, blue, fawn and chocolate, each with its own collar
    'rusty': palette(('#5a2610', '#7a3818', '#984a22', '#b4612e', '#cc7e46'), ('#0a2a5a', '#14408a', '#1e58b8', '#3a7ad8', '#7aa8ee'),
                     '#2a1208', '#1a0a04', '#8a4a3a'),
    'blue':  palette(('#3a424c', '#4c5560', '#5e6874', '#727e8a', '#8c98a6'), ('#5a2a00', '#9a4a08', '#d06a10', '#f08a2a', '#f8b46a'),
                     '#1a1e24', '#0e1014', '#7a6068'),
    'fawn':  palette(('#8a6440', '#a47a52', '#bc9064', '#d2a878', '#e4c296'), ('#2a1048', '#4a1e7a', '#6a2ea6', '#8a4ac8', '#b07ae0'),
                     '#4a301a', '#2a1a0c', '#b07a6a'),
    'choc':  palette(('#3a2014', '#4e2c1c', '#623a26', '#784a32', '#925e42'), ('#5a4a00', '#9a8000', '#d0b010', '#f0d02a', '#f8e46a'),
                     '#1a0c06', '#0e0604', '#7a4a40'),
}
B_COLLAR = PALETTES['bobbin']['collar']

def bobbin_px(p, edge, cuts=(0.13, 0.185, 0.235, 0.30), pal=PALETTES['bobbin']):
    h, l, s = hls(p)
    if 0.25 < h < 0.45 and s > 0.3:                       # collar
        return pal['collar'][0 if l < 0.12 else 1 if l < 0.24 else 2 if l < 0.31 else 3 if l < 0.45 else 4]
    if (h > 0.9 or h < 0.05) and s > 0.35 and l > 0.15:   # tongue and mouth: keep
        return p
    if 0.05 <= h <= 0.2 and s > 0.4 and l > 0.07:         # the yellow raincoat: keep
        return p
    if 0.78 < h < 0.9 and s > 0.6:                        # inner ear
        return pal['ear']
    if l < 0.07:                                          # outline, eyes, mouth line
        return pal['outline'] if edge else pal['dark']
    if l > 0.55:                                          # chest and highlights stay pale
        return hexc('#ffffff') if l > 0.85 else hexc('#efe8de') if l > 0.7 else hexc('#ddd3c8')
    return pal['coat'][sum(l >= c for c in cuts)]

def is_edge(f, x, y):
    return any(not (0 <= x + dx < CW and 0 <= y + dy < CH) or f[y + dy][x + dx][3] == 0 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))

def find_nose(view, f):
    """The nose: among the dark blobs inside the face (not touching the outline), the one furthest
    forward that isn't an eye (eyes have a white glint next to them). Returns its pixels."""
    if view == 'up':
        return set()
    x0, y0, x1, y1 = bbox(f)
    W, H = x1 - x0, y1 - y0
    if view == 'side':
        region = lambda x, y: x >= x0 + 0.62 * W and y <= y0 + 0.42 * H
    else:
        region = lambda x, y: abs(x - (x0 + x1) / 2) <= 0.22 * W and y <= y0 + 0.45 * H
    dark = {(x, y) for y in range(CH) for x in range(CW)
            if f[y][x][3] and hls(f[y][x])[1] < 0.07 and not is_edge(f, x, y) and region(x, y)}
    blobs, seen = [], set()
    for p in dark:
        if p in seen:
            continue
        stack, blob = [p], set()
        while stack:
            q = stack.pop()
            if q in seen or q not in dark:
                continue
            seen.add(q); blob.add(q)
            stack += [(q[0] + 1, q[1]), (q[0] - 1, q[1]), (q[0], q[1] + 1), (q[0], q[1] - 1)]
        glint = any(0 <= x + dx < CW and 0 <= y + dy < CH and f[y + dy][x + dx][3] and hls(f[y + dy][x + dx])[1] > 0.8
                    for x, y in blob for dx in (-1, 0, 1) for dy in (-1, 0, 1))
        if len(blob) >= 3 and not glint:
            blobs.append(blob)
    if view == 'side':
        # Side on, the nose is the tip of the snout, so it's part of the outline: take the dark pixels
        # at the very front of the head as well
        rows = [y for y in range(int(y0 + 0.12 * H), int(y0 + 0.42 * H) + 1)]
        tip = set()
        for y in rows:
            xs = [x for x in range(CW) if f[y][x][3]]
            if xs and max(xs) >= x1 - 5:
                for x in range(max(xs) - 3, max(xs) + 1):
                    if f[y][x][3] and hls(f[y][x])[1] < 0.07:
                        tip.add((x, y))
        best = max(blobs, key=lambda b: (max(x for x, _ in b), len(b))) if blobs else set()
        near = {p for p in tip if not best or min(abs(p[0] - q[0]) + abs(p[1] - q[1]) for q in best) <= 3}
        return best | (near if best else tip)
    return max(blobs, key=len) if blobs else set()

def coat_cuts(f):
    """Brightness cut-offs for the coat shades, taken from this frame's own spread of greys, so every
    animation comes out the same white however light or dark Sprite Fusion shaded Harley."""
    ls = sorted(hls(p)[1] for r in f for p in r if p[3] and p not in SNAKE_SET and hls(p)[2] < 0.3 and 0.07 <= hls(p)[1] <= 0.55)
    if len(ls) < 20:
        return (0.13, 0.185, 0.235, 0.30)
    q = lambda k: ls[min(len(ls) - 1, int(k * len(ls)))]
    return (q(0.08), q(0.25), q(0.5), q(0.8))

def recolour(f, view, pal=PALETTES['bobbin']):
    out = [list(r) for r in f]
    nose = find_nose(view, f) if pal['nose'] else set()
    cuts = coat_cuts(f)
    for y in range(CH):
        for x in range(CW):
            if f[y][x][3] and f[y][x][3] != 254:  # 254 marks the snake and the stick: left as drawn
                out[y][x] = bobbin_px(f[y][x], is_edge(f, x, y), cuts, pal)
    if nose:
        top, bottom = min(y for _, y in nose), max(y for _, y in nose)
        for x, y in nose:
            out[y][x] = pal['nose'][2] if y == top else pal['nose'][0] if y == bottom and bottom > top + 1 else pal['nose'][1]
    return out

# ---- Bandaged (after a vet trip): a bandage round the head and one front paw ----
BANDAGE = [hexc(c) for c in ('#7a7468', '#dcd6ca', '#ffffff')]
def bandage(f):
    out = [list(r) for r in f]
    x0, y0, x1, y1 = bbox(f)
    def band(xa, xb, ya, yb):
        for y in range(ya, yb + 1):
            for x in range(xa, xb + 1):
                if f[y][x][3]:
                    out[y][x] = BANDAGE[0] if is_edge(f, x, y) or y == yb else BANDAGE[2] if y == ya else BANDAGE[1]
    band(x0, x1, y0 + 3, y0 + 5)                # round the head
    band(x0 + 4, x0 + 11, y1 - 6, y1 - 1)       # the left front paw
    out[y0 + 4][(x0 + x1) // 2] = hexc('#e05a6a')  # a little red cross
    return out

def sheet(dog, coat):
    rows = []
    for view, name, frames in (COAT_LAYOUT if coat else LAYOUT):
        key = 'coat' if coat else 'plain'
        default = COAT_SIDE_SCALE if coat and view == 'side' else 1.0
        fr = place(frames, SCALE.get((key, name if view == 'side' else view), default) if name != 'bandaged' else 1.0)
        if name == 'bandaged':
            fr = [bandage(fr[0])]
        if dog != 'harley':
            fr = [recolour(f, view, PALETTES[dog]) for f in fr]
        rows.append(fr)
    rows = [[[[(p[0], p[1], p[2], 255) if p[3] == 254 else p for p in r] for r in f] for f in fr] for fr in rows]
    cols = max(len(r) for r in rows)
    px = [[(0, 0, 0, 0)] * (cols * CW) for _ in range(len(rows) * CH)]
    for ri, r in enumerate(rows):
        for ci, f in enumerate(r):
            for y in range(CH):
                px[ri * CH + y][ci * CW:(ci + 1) * CW] = f[y]
    path = os.path.join(HERE, f'sheet_{dog}{"_coat" if coat else ""}.png')
    write(path, px)
    return 'data:image/png;base64,' + base64.b64encode(open(path, 'rb').read()).decode()

if __name__ == '__main__':
    data = {dog: {'plain': sheet(dog, False), 'coat': sheet(dog, True)} for dog in ('harley', 'bobbin')}
    for dog in ('rusty', 'blue', 'fawn', 'choc'):  # the dog-park dogs never need a raincoat
        data[dog] = {'plain': sheet(dog, False)}
    layout = {key: [{'view': v, 'anim': n, 'frames': len(fr)} for v, n, fr in lay] for key, lay in (('plain', LAYOUT), ('coat', COAT_LAYOUT))}
    js = ('// Generated by art_src/build_dog_sheets.py from the Sprite Fusion frames. Do not edit by hand.\n'
          f'const DOG_SHEET = {{ cellW: {CW}, cellH: {CH}, footX: 32, footY: {FOOT}, rows: {json.dumps(layout)} }};\n'
          f'const DOG_SHEET_DATA = {json.dumps(data, indent=1)};\n')
    open(os.path.join(HERE, '..', 'js', 'art', 'dogsheets.js'), 'w').write(js)
    print('wrote js/art/dogsheets.js', len(js) // 1024, 'KB')
