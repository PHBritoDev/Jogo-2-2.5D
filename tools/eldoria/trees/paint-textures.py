#!/usr/bin/env python3
"""Eldória — texturas autorais das árvores tropicais (pintura procedural, sem assets de terceiros).

Gera em <saída>/:
  folhas.png  1024x1024 RGBA, 4 células 512x512:
      [0] tufo de folhas largas (copa arredondada, estilo pintado em camadas)
      [1] tufo de folhas miúdas (copa "couve-flor", sumaúma/figueira)
      [2] folha de palmeira (raque central + folíolos pendentes)
      [3] folhas palmadas de embaúba (lóbulos radiais, verso prateado)
  cascas.jpg  512x1024 RGB, 4 colunas 128 px, cada uma repete na vertical:
      [0] castanho-avermelhado com fibras (copa larga)  [1] cinza-claro liso (sumaúma)
      [2] branco-acinzentado com anéis (embaúba)         [3] estipe anelado (palmeira)

Uso: python3 paint-textures.py <pasta-de-saída>
Supersample 2x + redução Lanczos = bordas suaves sem serrilhado no alfa.
"""
import math, os, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1] if len(sys.argv) > 1 else 'build'
os.makedirs(OUT, exist_ok=True)
SS = 2  # supersample
CELL = 512 * SS


def hexrgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def mix(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def ramp(stops, t):
    t = min(1, max(0, t))
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]; t1, c1 = stops[i + 1]
        if t <= t1:
            return mix(c0, c1, (t - t0) / max(1e-6, t1 - t0))
    return stops[-1][1]


def leaf_poly(cx, cy, length, width, ang, tip=.18, n=9):
    """Folha lanceolada: duas curvas que se encontram na ponta (ang = direção da ponta)."""
    pts = []
    ca, sa = math.cos(ang), math.sin(ang)
    for side in (1, -1):
        rng = range(n + 1) if side == 1 else range(n, -1, -1)
        for i in rng:
            t = i / n
            w = width * math.sin(math.pi * t) ** (.75 + tip) * .5 * side
            u = t * length
            pts.append((cx + ca * u - sa * w, cy + sa * u + ca * w))
    return pts


def paint_clump(rnd, small=False):
    """Tufo de folhas: 7-10 lóbulos que formam uma silhueta recortada; cada lóbulo é sombreado como
    um volume (claro no alto-esquerda, escuro embaixo-direita), em 3-4 tons como pintura de cenário."""
    img = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    c = CELL / 2; R = CELL * .43
    light = (-.55, -.75); ll = math.hypot(*light); light = (light[0] / ll, light[1] / ll)
    if small:
        stops = [(0, hexrgb('#1d4d22')), (.35, hexrgb('#2f6f2c')), (.65, hexrgb('#4f9a35')), (.88, hexrgb('#86c043')), (1, hexrgb('#b6dc6a'))]
    else:
        stops = [(0, hexrgb('#1a4f1c')), (.33, hexrgb('#2c7426')), (.62, hexrgb('#4b9b2c')), (.86, hexrgb('#7cbd35')), (1, hexrgb('#a9d84f'))]
    # lóbulos: um central maior e uma coroa irregular em volta
    lobes = [(c + rnd.uniform(-.04, .04) * CELL, c + rnd.uniform(-.02, .05) * CELL, R * .62)]
    k = rnd.randint(7, 9)
    for i in range(k):
        a = i / k * math.tau + rnd.uniform(-.25, .25)
        rr = R * rnd.uniform(.36, .5)
        dist = R - rr * rnd.uniform(.85, 1.05)
        lobes.append((c + math.cos(a) * dist, c + math.sin(a) * dist * .92, rr))
    # desenha de trás (baixo/sombra) para frente (alto/luz)
    lobes.sort(key=lambda L: (L[0] - c) * light[0] + (L[1] - c) * light[1])
    for (lx, ly, lr) in lobes:
        # base escura do lóbulo (massa) para não haver buracos
        n = 26 if not small else 34
        base = []
        for i in range(n):
            a = i / n * math.tau; wob = 1 + .07 * math.sin(a * 7 + lx) + .05 * math.sin(a * 13 + ly)
            base.append((lx + math.cos(a) * lr * .8 * wob, ly + math.sin(a) * lr * .8 * wob))
        sh = (lx - c) * light[0] + (ly - c) * light[1]
        d.polygon(base, fill=ramp(stops, .12 + .1 * (sh / R)) + (255,))
        count = int((lr / (CELL * .2)) ** 2 * (95 if not small else 210))
        leaves = []
        for _ in range(count):
            a = rnd.uniform(0, math.tau); r = lr * math.sqrt(rnd.random()) * .95
            px, py = lx + math.cos(a) * r, ly + math.sin(a) * r
            nx, ny = (px - lx) / lr, (py - ly) / lr
            lit = .5 - .5 * (nx * light[0] + ny * light[1]) * -1  # 0 = sombra, 1 = luz
            lit = .5 + .5 * (nx * -light[0] * -1 + ny * -light[1] * -1)
            lit = max(0, min(1, (-(nx * light[0] + ny * light[1]) * .5 + .5) * .85 + (1 - r / lr) * .25))
            leaves.append((r / lr, px, py, a, lit))
        # bordas primeiro (mais escuras), centro e luz por cima
        leaves.sort(key=lambda L: (L[4], -L[0]))
        for (rn, px, py, a, lit) in leaves:
            if small:
                L = rnd.uniform(.032, .05) * CELL; W = L * rnd.uniform(.7, .95)
            else:
                L = rnd.uniform(.05, .085) * CELL; W = L * rnd.uniform(.38, .5)
            ang = a + rnd.uniform(-.6, .6) - math.pi * .5 * (1 - rn) * rnd.uniform(-.4, .4)
            tone = ramp(stops, lit * .92 + rnd.uniform(-.06, .06))
            d.polygon(leaf_poly(px - math.cos(ang) * L * .35, py - math.sin(ang) * L * .35, L, W, ang, tip=.05 if small else .2), fill=tone + (255,))
            if lit > .72 and rnd.random() < .35:  # nervura/brilho de borda nas folhas iluminadas
                hl = ramp(stops, min(1, lit + .18))
                d.line([(px, py), (px + math.cos(ang) * L * .5, py + math.sin(ang) * L * .5)], fill=hl + (255,), width=max(1, SS))
    return img


def paint_frond(rnd):
    img = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    stops = [(0, hexrgb('#1e4f22')), (.5, hexrgb('#3c8130')), (1, hexrgb('#8cc650'))]
    # raque na vertical (v=0 base -> v=1 ponta), centrada em x
    x0 = CELL / 2; y0 = CELL * .985; y1 = CELL * .015
    n = 34
    for side in (-1, 1):
        for i in range(n):
            t = (i + .5) / n
            y = y0 + (y1 - y0) * t
            L = CELL * .47 * (1 - .78 * t ** 1.3) * rnd.uniform(.9, 1.05)
            W = CELL * .034 * (1 - .5 * t)
            ang = (math.pi / 2 - (.95 - .35 * t)) * side + math.pi * (0 if side > 0 else 1) - math.pi / 2 * 0
            # direção: para fora e levemente para a ponta (y decresce)
            dx, dy = side * math.cos(.55 - .2 * t), -math.sin(.55 - .2 * t)
            a = math.atan2(dy, dx)
            lit = .45 + .4 * rnd.random() + (.15 if side < 0 else 0)
            d.polygon(leaf_poly(x0, y, L, W, a, tip=.35, n=10), fill=ramp(stops, lit) + (255,))
            d.line([(x0, y), (x0 + dx * L * .9, y + dy * L * .9)], fill=ramp(stops, min(1, lit + .25)) + (255,), width=max(1, SS))
    d.line([(x0, y0), (x0, y1)], fill=hexrgb('#a7b56b') + (255,), width=4 * SS)
    return img


def paint_palmate(rnd):
    img = Image.new('RGBA', (CELL, CELL), (0, 0, 0, 0)); d = ImageDraw.Draw(img)
    top = [(0, hexrgb('#24552a')), (.55, hexrgb('#3f7f3a')), (1, hexrgb('#88b866'))]
    under = [(0, hexrgb('#7e9c84')), (1, hexrgb('#c9d8c4'))]
    leaves = [(.5, .5, .46, 0, top), (.3, .32, .26, .4, under), (.72, .7, .25, 1.3, top)]
    for (fx, fy, fr, rot, st) in leaves:
        cx, cy, r = fx * CELL, fy * CELL, fr * CELL
        lobes = 9
        for i in range(lobes):
            a = rot + i / lobes * math.tau
            L = r * rnd.uniform(.82, 1)
            lit = .35 + .55 * (.5 + .5 * math.cos(a + 2.2)) + rnd.uniform(-.05, .05)
            d.polygon(leaf_poly(cx, cy, L, L * .34, a, tip=.1, n=12), fill=ramp(st, lit) + (255,))
            d.line([(cx, cy), (cx + math.cos(a) * L * .92, cy + math.sin(a) * L * .92)], fill=ramp(st, min(1, lit + .3)) + (255,), width=max(1, SS))
        d.ellipse([cx - r * .1, cy - r * .1, cx + r * .1, cy + r * .1], fill=ramp(st, .3) + (255,))
    return img


def periodic_noise(h, w, scale_y, scale_x, rnd_np, power=2.0):
    """Ruído periódico (FFT filtrado) — repete sem emenda nos dois eixos."""
    z = rnd_np.standard_normal((h, w))
    F = np.fft.fft2(z)
    fy = np.fft.fftfreq(h)[:, None] * scale_y; fx = np.fft.fftfreq(w)[None, :] * scale_x
    f = np.sqrt(fx * fx + fy * fy); f[0, 0] = 1
    n = np.real(np.fft.ifft2(F / f ** power))
    n -= n.min(); n /= max(1e-9, n.max()); return n


def paint_bark(kind, rnd_np, w=128, h=1024):
    """Casca que repete na vertical (ruído periódico). sy grande = traço alongado na vertical (fibras)."""
    y = np.arange(h)[:, None] / h; x = np.arange(w)[None, :] / w
    if kind == 0:   # castanho com fibras verticais e sulcos (referência dos adesivos)
        fib = periodic_noise(h, w, 9, 1, rnd_np, 1.3)
        mid_ = periodic_noise(h, w, 3, 1, rnd_np, 1.8)
        t = .6 * fib + .4 * mid_
        dark, mid, light = np.array([52, 30, 17]), np.array([112, 66, 36]), np.array([176, 118, 68])
        shade = np.where(fib < .32, .55, np.where(fib > .78, 1.15, 1.0))
    elif kind == 1:  # sumaúma: cinza claro, liso, estrias leves e lenticelas horizontais
        fib = periodic_noise(h, w, 6, 1, rnd_np, 1.6)
        big = periodic_noise(h, w, 1, 1, rnd_np, 2.4)
        len_ = periodic_noise(h, w, .25, 3, rnd_np, 1.2)
        t = .3 * fib + .7 * big
        dark, mid, light = np.array([102, 98, 86]), np.array([156, 150, 132]), np.array([204, 198, 178])
        shade = np.where(len_ < .12, .72, 1.0) * np.where(fib < .2, .85, 1.0)
    elif kind == 2:  # embaúba: branco-acinzentado com anéis irregulares de cicatriz foliar
        big = periodic_noise(h, w, 1, 1, rnd_np, 2.2)
        wob = periodic_noise(h, w, .2, 4, rnd_np, 1.5)
        ph = y * 12 + (wob - .5) * .25 + .04 * np.sin(x * math.tau)
        ring = np.abs(((ph % 1) - .5)) * 2
        t = .75 * big + .25 * ring
        dark, mid, light = np.array([118, 120, 108]), np.array([180, 182, 168]), np.array([226, 226, 212])
        shade = np.where(ring > .9, .62, np.where(ring > .82, .85, 1.0))
    else:            # estipe de palmeira: anéis apertados e ondulados
        big = periodic_noise(h, w, 1, 2, rnd_np, 2)
        wob = periodic_noise(h, w, .2, 4, rnd_np, 1.5)
        ph = y * 34 + (wob - .5) * .5
        ring = np.abs(((ph % 1) - .5)) * 2
        t = .65 * big + .35 * (1 - ring)
        dark, mid, light = np.array([74, 64, 50]), np.array([126, 112, 90]), np.array([176, 162, 134])
        shade = np.where(ring > .86, .6, 1.0)
    t = np.clip(t, 0, 1)[..., None]
    col = np.where(t < .5, dark + (mid - dark) * (t / .5), mid + (light - mid) * ((t - .5) / .5)) * shade[..., None]
    return np.clip(col, 0, 255).astype(np.uint8)


def main():
    rnd = random.Random(2911)
    rnd_np = np.random.default_rng(2911)
    atlas = Image.new('RGBA', (1024 * SS, 1024 * SS), (0, 0, 0, 0))
    cells = [paint_clump(rnd, False), paint_clump(rnd, True), paint_frond(rnd), paint_palmate(rnd)]
    for i, c in enumerate(cells):
        atlas.paste(c, ((i % 2) * CELL, (i // 2) * CELL), c)
    atlas = atlas.resize((1024, 1024), Image.LANCZOS)
    # sangra a cor para fora do alfa (evita halo escuro no mipmap) mantendo o alfa original
    rgb = atlas.convert('RGB'); a = atlas.getchannel('A')
    bleed = rgb
    for r in (2, 4, 8, 16):
        blur = atlas.filter(ImageFilter.GaussianBlur(r)); ba = np.array(blur.getchannel('A'), dtype=np.float32)[..., None] / 255
        bc = np.array(blur.convert('RGB'), dtype=np.float32) / np.maximum(ba, 1e-3)
        cur = np.array(bleed, dtype=np.float32); cura = np.array(a, dtype=np.float32)[..., None] / 255
        bleed = Image.fromarray(np.clip(np.where(cura > .02, cur, np.where(ba > .01, bc, cur)), 0, 255).astype(np.uint8))
    out = bleed.copy(); out.putalpha(a)
    out.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(OUT, 'folhas.png'), optimize=True)
    bark = np.concatenate([paint_bark(k, rnd_np) for k in range(4)], axis=1)
    Image.fromarray(bark).save(os.path.join(OUT, 'cascas.jpg'), quality=90)
    print('ok', OUT)


if __name__ == '__main__':
    main()
