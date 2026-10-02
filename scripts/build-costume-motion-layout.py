"""Measure generated costume sheets without changing their pixels."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root = Path(__file__).resolve().parents[1] / 'rebirth'
specs = {}
for cls in ['warrior', 'mage', 'archer', 'rogue', 'pirate', 'priest']:
    im = Image.open(root / 'costumes' / f'{cls}-motion-v2.webp')
    a = np.array(im)[:, :, 3] > 64
    rows = 9 if cls == 'priest' else 10
    occupied = np.flatnonzero(a.sum(axis=1) > 10)
    start, end = int(occupied[0]), int(occupied[-1]) + 1
    counts = ndimage.uniform_filter1d(a.sum(axis=1).astype(float), size=3)
    cuts = [0]
    for row in range(1, rows):
        target = start + (end-start) * row / rows
        margin = (end-start) / rows * .3
        lo, hi = round(target-margin), round(target+margin)
        cuts.append(lo + int(counts[lo:hi].argmin()))
    cuts.append(im.height)
    frames = []
    for row in range(rows):
        y, bottom = cuts[row:row+2]
        strip = a[y:bottom]
        cols = [0]
        column_counts = ndimage.uniform_filter1d(strip.sum(axis=0).astype(float), size=3)
        for col in range(1, 8):
            target, margin = im.width*col/8, im.width/8*.18
            lo, hi = round(target-margin), round(target+margin)
            cols.append(lo + int(column_counts[lo:hi].argmin()))
        cols.append(im.width)
        for col in range(8):
            x, right = cols[col:col+2]
            pixels = strip[:, x:right]
            core = ndimage.binary_opening(pixels, iterations=2)
            labels, n = ndimage.label(core)
            areas = np.bincount(labels.ravel()); areas[0] = 0
            assert n and areas.max() > 300, (cls, row, col)
            ys, xs = np.where(labels == areas.argmax())
            top = int(ys.min())
            # Include the connected shoes/robe edge without nearby fragments.
            foot = min(bottom-y, int(ys.max()) + 2)
            lower = ys >= top + (ys.max()-top)*.65
            anchor = round(float(np.median(xs[lower])), 1)
            frames.append(dict(x=x, y=y, w=right-x, h=bottom-y, anchor=anchor, foot=foot, body=foot-top))
    reference = float(np.median([f['body'] for f in frames[:8]]))
    specs[cls] = dict(width=im.width, height=im.height, rows=rows, bodyHeight=reference, frames=frames)
    print(cls, im.size, rows, cuts, 'body', reference)
(root / 'costume-motion-layout.mjs').write_text('// Source bounds and body anchors; artwork remains unchanged.\nexport default '+json.dumps(specs, separators=(',', ':'))+';\n')
