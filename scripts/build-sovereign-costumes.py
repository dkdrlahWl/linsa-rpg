"""Package generated costume atlases and derive frame bounds for the existing rig.

Usage: python scripts/build-sovereign-costumes.py inputs.json
inputs.json maps costume IDs to generated PNG source paths.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1] / 'rebirth'
SPECS = [
    ('warrior', 'sunrose-empress'),
    ('mage', 'astral-tea-mage'),
    ('archer', 'aurora-huntress'),
    ('rogue', 'moonjewel-bladedancer'),
    ('pirate', 'scarlet-sky-pilot'),
    ('priest', 'opal-dream-priest'),
]
sources = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8-sig'))
layout_path = ROOT / 'costume-motion-layout.mjs'
text = layout_path.read_text(encoding="utf-8")
layouts = json.loads(text.split('export default ', 1)[1].rstrip().removesuffix(';'))
out = ROOT / 'costumes'
out.mkdir(parents=True, exist_ok=True)

for cls, costume_id in SPECS:
    if costume_id not in sources: continue
    image = Image.open(sources[costume_id]).convert('RGBA')
    pixels = np.asarray(image)
    alpha = pixels[:, :, 3] > 64
    rows = 9 if cls == 'priest' else 10
    source_columns = 7 if costume_id == 'sunrose-empress' else 8
    occupied = np.flatnonzero(alpha.sum(axis=1) > 10)
    start, end = int(occupied[0]), int(occupied[-1]) + 1
    counts = ndimage.uniform_filter1d(alpha.sum(axis=1).astype(float), size=3)
    cuts = [0]
    for row in range(1, rows):
        target = start + (end - start) * row / rows
        margin = (end - start) / rows * .3
        lo, hi = round(target - margin), round(target + margin)
        cuts.append(lo + int(counts[lo:hi].argmin()))
    cuts.append(image.height)
    frames = []
    for row in range(rows):
        y, bottom = cuts[row:row + 2]
        strip = alpha[y:bottom]
        cols = [0]
        column_counts = ndimage.uniform_filter1d(strip.sum(axis=0).astype(float), size=3)
        for col in range(1, source_columns):
            target, margin = image.width * col / source_columns, image.width / source_columns * .18
            lo, hi = round(target - margin), round(target + margin)
            cols.append(lo + int(column_counts[lo:hi].argmin()))
        cols.append(image.width)
        for col in range(source_columns):
            x, right = cols[col:col + 2]
            local_alpha = strip[:, x:right]
            core = ndimage.binary_opening(local_alpha, iterations=2)
            labels, _ = ndimage.label(core)
            areas = np.bincount(labels.ravel())
            areas[0] = 0
            ys, xs = np.where(labels == areas.argmax())
            top = int(ys.min())
            foot = min(bottom - y, int(ys.max()) + 2)
            lower = ys >= top + (ys.max() - top) * .65
            anchor = round(float(np.median(xs[lower])), 1)
            frames.append(dict(x=x, y=y, w=right-x, h=bottom-y, anchor=anchor, foot=foot, body=foot-top))
    if source_columns != 8:
        physical = frames
        frames = [physical[row*source_columns+min(source_columns-1,phase*source_columns//8)] for row in range(rows) for phase in range(8)]
    reference = float(np.median([frame['body'] for frame in frames[:8]]))
    layouts[costume_id] = dict(width=image.width, height=image.height, rows=(9 if cls == 'priest' else 10), bodyHeight=reference, frames=frames)
    image.save(out / f'{costume_id}-motion-v1.webp', quality=90, method=6)

    # The neutral front frame is also the shop, character and ranking portrait.
    frame = frames[0]
    portrait = image.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h']))
    alpha = np.array(portrait.getchannel('A'))
    labels, _ = ndimage.label(alpha > 8)
    areas = np.bincount(labels.ravel())
    areas[0] = 0
    main = int(areas.argmax())
    keep = areas >= areas[main] * .012
    keep[0] = False
    rgba = np.array(portrait)
    rgba[:, :, 3][~keep[labels]] = 0
    portrait = Image.fromarray(rgba)
    portrait = portrait.crop(portrait.getchannel('A').getbbox())
    portrait.save(out / f'{costume_id}-portrait-v3.webp', quality=94, method=6)

layout_path.write_text('// Source bounds and body anchors for both costume collections.\nexport default ' + json.dumps(layouts, separators=(',', ':')) + ';\n')
print('Packaged costume atlases and portraits.')
