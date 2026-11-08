"""Generates the strata-style cover art for Research cards and the placeholder avatar.

    python3 scripts/make_covers.py      -> assets/img/research/*.webp, assets/img/avatar.webp

Each cover is a stack of contour lines cut into flat strokes. A field bends the
lines into a shape that says something about the paper; a zone colors them.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SCALE = 3                                   # supersampling for clean edges

CREAM = '#eee9dc'
INK = '#1c1d1f'
GREY = '#b9bdc3'
PALE = '#f7f3e8'
BLUE = ('#1a73e8', '#1550ad', '#8fb3f3')
VIOLET = ('#8430ce', '#5b1fa6', '#c9a6f2')
TEAL = ('#12858f', '#0b5d66', '#8fd0d4')
ORANGE = ('#e8710a', '#b3540a', '#f5bb85')
GREEN = ('#188038', '#0f5c28', '#93cfa6')
RED = ('#d93025', '#a31f17', '#f0a29c')


def gauss(x, center, width):
    return np.exp(-((x - center) / width) ** 2)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def stroke(draw, xs, ys, width, color):
    """Fills one flat-ended stroke of constant width along a polyline."""
    if len(xs) < 2:                             # a line that only grazes a letter edge
        return
    dx, dy = np.gradient(xs), np.gradient(ys)
    length = np.hypot(dx, dy) + 1e-6
    nx, ny = -dy / length * width / 2, dx / length * width / 2
    top = list(zip(xs + nx, ys + ny))
    bottom = list(zip(xs - nx, ys - ny))
    draw.polygon(top + bottom[::-1], fill=color)


def strata(size, field, zone, lines, seed, reach=.25):
    """Draws `lines` contours through `field`, cut into strokes colored by `zone`."""
    w, h = size[0] * SCALE, size[1] * SCALE
    image = Image.new('RGB', (w, h), CREAM)
    draw = ImageDraw.Draw(image)
    rng = np.random.default_rng(seed)
    gap = h / lines

    xs = np.linspace(-.02, 1.02, 420)
    for v in np.linspace(-reach, 1 + reach, int(lines * (1 + 2 * reach))):
        ys = field(xs, v)
        i = 0
        while i < len(xs) - 2:
            run = int(rng.integers(14, 150))
            j = min(i + run, len(xs) - 1)
            x_mid, y_mid = xs[(i + j) // 2], ys[(i + j) // 2]
            width = rng.choice([.14, .24, .36, .6, .95], p=[.18, .3, .28, .17, .07]) * gap
            color = zone(x_mid, y_mid, rng)
            if color is not None:
                stroke(draw, xs[i:j + 1] * w, ys[i:j + 1] * h, width, color)
            i = j + int(rng.integers(1, 6))
    return image


def hero(image, field, v, start, end, width, color):
    """Lays one bold stroke over the stack: the line the cover is about."""
    draw = ImageDraw.Draw(image)
    w, h = image.size
    xs = np.linspace(start, end, 240)
    stroke(draw, xs * w, field(xs, v) * h, width * SCALE, color)


def family(colors, rng):
    return rng.choice(colors, p=[.55, .27, .18])


# ---- One cover per paper ----

def vibevideobench():
    """Code-driven video: a waveform of peaks, one take after another."""
    peaks = lambda x: (gauss(x, .2, .08) + .85 * gauss(x, .4, .07) + 1.1 * gauss(x, .62, .09) + .8 * gauss(x, .84, .07))
    field = lambda x, v: v - .2 * np.clip(1.25 - abs(v - .55) * 1.6, 0, 1) * peaks(x)

    def zone(x, y, rng):
        if y < .3:
            return rng.choice([GREY, PALE, family(VIOLET, rng)], p=[.5, .1, .4])
        return family(VIOLET, rng) if rng.random() < .82 else GREY

    image = strata((960, 600), field, zone, 34, seed=11)
    hero(image, field, .52, .28, .92, 13, VIOLET[0])
    hero(image, field, .34, .32, .74, 7, INK)
    return image


def gats():
    """Guide, then let go: teacher lines run with the student, then fall away."""
    field = lambda x, v: v - .34 * smoothstep(.05, .95, x) + .12 * np.sin(x * 5 + v * 3) * .4

    def zone(x, y, rng):
        if x > .62 and y < .42:                     # the teacher has withdrawn
            return GREY if rng.random() < .6 else None
        if y < .42:
            return INK
        return family(BLUE, rng) if rng.random() < .85 else GREY

    image = strata((960, 600), field, zone, 30, seed=23)
    hero(image, field, .78, .12, 1.02, 15, BLUE[0])
    hero(image, field, .6, .02, .6, 9, INK)
    return image


def gsm():
    """Shared global state: every line funnels through one band."""
    field = lambda x, v: v + (.5 - v) * .78 * gauss(x, .56, .24)

    def zone(x, y, rng):
        if abs(y - .5) < .085 and .34 < x < .78:
            return INK
        if y < .5:
            return family(TEAL, rng) if rng.random() < .8 else GREY
        return GREY if rng.random() < .62 else family(TEAL, rng)

    image = strata((960, 600), field, zone, 36, seed=37, reach=1.6)
    hero(image, field, .5, .3, .84, 22, INK)
    hero(image, field, .32, .02, .3, 8, TEAL[0])
    return image


def lngram():
    """Discrete memory: smooth lines snap onto terraces."""
    steps = lambda x: sum(smoothstep(a, a + .05, x) for a in (.16, .38, .6, .82))
    field = lambda x, v: v - .11 * steps(x) + .24

    def zone(x, y, rng):
        if y < .38:
            return rng.choice([INK, GREY], p=[.78, .22])
        return family(ORANGE, rng) if rng.random() < .78 else GREY

    image = strata((960, 600), field, zone, 32, seed=41)
    hero(image, field, .62, .02, .98, 13, ORANGE[0])
    return image


def videorover():
    """Video deep research: a search that swings wider as it goes."""
    field = lambda x, v: v + (.03 + .17 * x) * (2 * np.abs(((x * 4.6 + .12) % 1) - .5) * 2 - 1) * np.clip(1.3 - abs(v - .5) * 1.5, 0, 1)

    def zone(x, y, rng):
        if y < .22:
            return rng.choice([GREY, PALE], p=[.8, .2])
        return family(GREEN, rng) if rng.random() < .8 else GREY

    image = strata((960, 600), field, zone, 34, seed=53)
    hero(image, field, .6, .24, 1.0, 14, GREEN[0])
    hero(image, field, .4, .3, .72, 8, INK)
    return image


def kat_coder():
    """Agentic RL for coding: a climbing reward curve."""
    field = lambda x, v: v + .34 - .68 * np.clip(x, 0, None) ** 1.3 + .022 * np.sin(x * 34 + v * 7) * (1 - x * .5)

    def zone(x, y, rng):
        depth = y + .68 * max(x, 0) ** 1.3 - .34
        if depth < .5:
            return INK if rng.random() < .9 else GREY
        return family(RED, rng) if rng.random() < .78 else GREY

    image = strata((960, 600), field, zone, 32, seed=67)
    hero(image, field, .68, .06, 1.02, 15, RED[0])
    return image


def avatar():
    """Placeholder until there is a photo: the name, carved out of the strata."""
    size = 800
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 300)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).text((size / 2, size / 2), 'Roy', font=font, fill=255, anchor='mm')
    letters = np.asarray(mask) > 128

    w = h = size * SCALE
    image = Image.new('RGB', (w, h), CREAM)
    draw = ImageDraw.Draw(image)
    rng = np.random.default_rng(7)
    lines = 58
    gap = h / lines
    xs = np.linspace(-.02, 1.02, 900)
    for v in np.linspace(-.1, 1.1, int(lines * 1.2)):
        ys = v + .03 * np.sin(xs * 5 + v * 4)
        inside = letters[np.clip(ys * size, 0, size - 1).astype(int), np.clip(xs * size, 0, size - 1).astype(int)]
        cuts = np.flatnonzero(np.diff(inside.astype(int))) + 1
        for run_x, run_y, run_in in zip(np.split(xs, cuts), np.split(ys, cuts), np.split(inside, cuts)):
            if run_in[0]:                           # letters: solid black stripes
                stroke(draw, run_x * w, run_y * h, .72 * gap, INK)
                continue
            i = 0
            while i < len(run_x) - 2:               # background: broken pale strokes
                j = min(i + int(rng.integers(40, 260)), len(run_x) - 1)
                color = rng.choice([GREY, BLUE[2], BLUE[0], PALE], p=[.6, .2, .08, .12])
                width = rng.choice([.14, .24, .4], p=[.4, .4, .2]) * gap
                stroke(draw, run_x[i:j + 1] * w, run_y[i:j + 1] * h, width, color)
                i = j + int(rng.integers(3, 12))
    return image


def save(image, path, size):
    path.parent.mkdir(parents=True, exist_ok=True)
    image.resize(size, Image.LANCZOS).save(path, quality=88, method=6)
    print(path.relative_to(ROOT), f'{path.stat().st_size // 1024} KB')


if __name__ == '__main__':
    covers = {
        'vibevideobench': vibevideobench, 'gats': gats, 'gsm': gsm,
        'lngram-v2': lngram, 'videorover': videorover, 'kat-coder': kat_coder,
    }
    for name, make in covers.items():
        save(make(), ROOT / f'assets/img/research/{name}.webp', (960, 600))
    save(avatar(), ROOT / 'assets/img/avatar.webp', (800, 800))

