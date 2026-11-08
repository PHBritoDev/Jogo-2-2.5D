#!/usr/bin/env python3
"""Sangra cor/normal para fora do alfa (evita halo no mipmap) e grava impostor.png / impostor-normal.png."""
import sys, os
import numpy as np
from PIL import Image, ImageFilter
d = sys.argv[1] if len(sys.argv) > 1 else 'build'
alb = Image.open(os.path.join(d, 'impostor-raw.png')).convert('RGBA')
nor = Image.open(os.path.join(d, 'impostor-normal-raw.png')).convert('RGBA')
A = np.array(alb.getchannel('A'), dtype=np.float32) / 255
def bleed(img, alpha):
    cur = np.array(img.convert('RGB'), dtype=np.float32); have = alpha > .02
    for r in (1, 2, 4, 8, 16, 32):
        w = Image.fromarray((have * 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(r)); w = np.array(w, dtype=np.float32)[..., None] / 255
        c = np.stack([np.array(Image.fromarray((cur[..., k] * have).astype(np.uint8)).filter(ImageFilter.BoxBlur(r)), dtype=np.float32) for k in range(3)], -1)
        fill = c / np.maximum(w, 1e-3); grow = (~have) & (w[..., 0] > .01)
        cur[grow] = fill[grow]; have = have | grow
    cur[~have] = (128, 128, 255) if img is nor else (60, 80, 50)
    return np.clip(cur, 0, 255).astype(np.uint8)
a = bleed(alb, A)
out = Image.fromarray(a); out.putalpha(Image.fromarray((np.where(A > .5, 255, A * 255)).astype(np.uint8)))
# paleta de 256 cores com alfa (PNG-8): ~1/4 do tamanho, sem perda visível nesta escala
out.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(os.path.join(d, 'impostor.png'), optimize=True)
n = bleed(nor, A); Image.fromarray(n).save(os.path.join(d, 'impostor-normal.jpg'), quality=84)
print('ok')
