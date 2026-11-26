#!/usr/bin/env python3
"""Draw the app icons (the pixel-art flame from the favicon) as PNGs in icons/, with no dependencies."""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BG = (0x09, 0x0b, 0x11)
# the favicon's two flame shapes on a 16x16 grid, as rectilinear SVG paths
SHAPES = [((0xff, 0x8a, 0x3c), 'M7 2h2v2h1v2h1v2h1v3h-1v2H9v1H7v-1H5v-2H4V8h1V6h1V4h1z'),
          ((0xff, 0xe2, 0xa0), 'M7 7h2v2h1v2H9v1H7v-1H6V9h1z')]


def polygon(d):
    pts, x, y, i, toks = [], 0, 0, 0, []
    num = ''
    for ch in d:
        if ch.isalpha():
            if num: toks.append(float(num)); num = ''
            toks.append(ch)
        elif ch in ' ,':
            if num: toks.append(float(num)); num = ''
        else:
            num += ch
    if num: toks.append(float(num))
    while i < len(toks):
        c = toks[i]; i += 1
        if c == 'M': x, y = toks[i], toks[i + 1]; i += 2
        elif c == 'h': x += toks[i]; i += 1
        elif c == 'v': y += toks[i]; i += 1
        elif c == 'H': x = toks[i]; i += 1
        elif c == 'V': y = toks[i]; i += 1
        elif c == 'z': continue
        pts.append((x, y))
    return pts


def inside(pts, px, py):
    hit = False
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]):
        if (y1 > py) != (y2 > py) and px < x1 + (py - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit


def grid():
    g = [[BG] * 16 for _ in range(16)]
    for col, d in SHAPES:
        pts = polygon(d)
        for gy in range(16):
            for gx in range(16):
                if inside(pts, gx + .5, gy + .5):
                    g[gy][gx] = col
    return g


def png(path, size, art):
    # art: the flame's 16-grid scaled so the grid spans `art` pixels, centred (the flame's box is x 4..12, y 2..14)
    g, cell = grid(), art / 16.0
    ox, oy = size / 2 - 8 * cell, size / 2 - 8 * cell
    rows = []
    for y in range(size):
        row = bytearray(b'\x00')
        gy = int((y - oy) // cell)
        for x in range(size):
            gx = int((x - ox) // cell)
            row += bytes(g[gy][gx] if 0 <= gx < 16 and 0 <= gy < 16 else BG)
        rows.append(bytes(row))
    raw = zlib.compress(b''.join(rows), 9)
    chunk = lambda t, b: struct.pack('>I', len(b)) + t + b + struct.pack('>I', zlib.crc32(t + b) & 0xffffffff)
    data = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', raw) + chunk(b'IEND', b'')
    open(path, 'wb').write(data)
    return len(data)


def main():
    out = os.path.join(ROOT, 'icons'); os.makedirs(out, exist_ok=True)
    for name, size, art in [('icon-192.png', 192, 192), ('icon-512.png', 512, 512), ('apple-touch-icon.png', 180, 160),
                            ('icon-maskable-512.png', 512, 352)]:   # maskable: the flame inside the central safe zone
        print(name, png(os.path.join(out, name), size, art), 'bytes')


if __name__ == '__main__':
    main()
