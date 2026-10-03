"""Package generated costume atlases and derive frame bounds for the existing rig.

Usage: python scripts/build-costume-series.py inputs.json
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
    ('warrior', 'frost-crown-knight'),
    ('mage', 'rose-queen-mage'),
    ('archer', 'forest-fairy-ranger'),
    ('rogue', 'violet-moon-ninja'),
    ('pirate', 'azure-naval-admiral'),
    ('priest', 'dawn-saint'),
]
sources = json.loads(Path(sys.argv[1]).read_text())
layout_path = ROOT / 'costume-motion-layout.mjs'
text = layout_path.read_text()
layouts = json.loads(text.split('export default ', 1)[1].rstrip().removesuffix(';'))
out = ROOT / 'costumes'
out.mkdir(parents=True, exist_ok=True)

for cls, costume_id in SPECS:
    image = Image.open(sources[costume_id]).convert('RGBA')
    pixels = np.asarray(image)
    alpha = pixels[:, :, 3] > 64
    rows = 9 if cls == 'priest' else 10
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
        for col in range(1, 8):
            target, margin = image.width * col / 8, image.width / 8 * .18
            lo, hi = round(target - margin), round(target + margin)
            cols.append(lo + int(column_counts[lo:hi].argmin()))
        cols.append(image.width)
        for col in range(8):
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
    reference = float(np.median([frame['body'] for frame in frames[:8]]))
    layouts[costume_id] = dict(width=image.width, height=image.height, rows=rows, bodyHeight=reference, frames=frames)
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
    portrait.save(out / f'{costume_id}-portrait-v1.webp', quality=94, method=6)

layout_path.write_text('// Source bounds and body anchors for both costume collections.\nexport default ' + json.dumps(layouts, separators=(',', ':')) + ';\n')
print('Packaged six costume atlases and six portraits.')
