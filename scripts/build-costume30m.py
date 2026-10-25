"""Pack approved portraits and 5x5 authored motion sheets: python ... inputs.json."""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1] / 'rebirth'
OUT = ROOT / 'costumes'
OUT.mkdir(exist_ok=True)
source = json.loads(Path(sys.argv[1]).read_text())
layout_file = ROOT / 'costume-motion-layout.mjs'
layouts = json.loads(layout_file.read_text().split('export default ', 1)[1].strip().removesuffix(';'))
CELL, PAD = 320, 20

def cuts(projection, extent):
    smoothed = ndimage.uniform_filter1d(projection.astype(float), size=3)
    result = [0]
    for i in range(1, 5):
        target = extent * i / 5
        lo, hi = round(target - extent / 5 * .16), round(target + extent / 5 * .16)
        result.append(lo + int(smoothed[lo:hi].argmin()))
    return result + [extent]

for costume_id, paths in source.items():
    portrait = Image.open(paths['portrait']).convert('RGBA')
    portrait = portrait.crop(portrait.getchannel('A').getbbox())
    portrait.thumbnail((736, 928), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (768, 960))
    canvas.alpha_composite(portrait, ((768-portrait.width)//2, (960-portrait.height)//2))
    canvas.save(OUT / f'{costume_id}-portrait-approved-30m-20261025.webp', quality=90, method=6)
    if 'motion' not in paths:
        continue
    image = Image.open(paths['motion']).convert('RGBA')
    alpha = np.asarray(image.getchannel('A')) > 32
    ys = cuts(alpha.sum(axis=1), image.height)
    atlas = Image.new('RGBA', (CELL*5, CELL*5))
    physical = []
    for row in range(5):
        strip = alpha[ys[row]:ys[row+1]]
        xs = cuts(strip.sum(axis=0), image.width)
        for col in range(5):
            tile = image.crop((xs[col], ys[row], xs[col+1], ys[row+1]))
            rgba = np.array(tile)
            labels, _ = ndimage.label(rgba[:, :, 3] > 8)
            areas = np.bincount(labels.ravel()); areas[0] = 0
            assert areas.max() > 100, (costume_id, row, col, 'empty cell')
            keep = areas >= max(4, areas.max()*.002); keep[0] = False
            rgba[:, :, 3][~keep[labels]] = 0
            tile = Image.fromarray(rgba)
            tile = tile.crop(tile.getchannel('A').getbbox())
            tile.thumbnail((CELL-2*PAD, CELL-2*PAD), Image.Resampling.LANCZOS)
            frame = Image.new('RGBA', (CELL, CELL))
            frame.alpha_composite(tile, ((CELL-tile.width)//2, CELL-PAD-tile.height))
            atlas.alpha_composite(frame, (col*CELL, row*CELL))
            mask = np.asarray(frame.getchannel('A')) > 64
            labels, _ = ndimage.label(ndimage.binary_opening(mask, iterations=1))
            areas = np.bincount(labels.ravel()); areas[0] = 0
            yy, xx = np.where(labels == areas.argmax())
            # Robust torso/head extent excludes thin raised weapon tips.
            top, foot = np.percentile(yy, [3, 99.7])
            lower = yy >= top + (foot-top)*.68
            anchor = float(np.median(xx[lower]))
            physical.append(dict(x=col*CELL, y=row*CELL, w=CELL, h=CELL,
                                 anchor=round(anchor, 1), foot=round(float(foot)+1, 1),
                                 body=round(float(foot-top)+1, 1)))
    # Rig expects 5 direction rows of 8 walk phases, then 5 attack rows of 8.
    frames = []
    for direction in range(5):
        for physical_row in [0, 1, 1, 0, 0, 2, 2, 0]:
            frames.append(physical[physical_row*5+direction])
    for direction in range(5):
        for physical_row in [3, 3, 3, 4, 4, 4, 4, 0]:
            frames.append(physical[physical_row*5+direction])
    layouts[costume_id] = dict(width=CELL*5, height=CELL*5, rows=10,
                              bodyHeight=physical[0]['body'], frames=frames, precleaned=True, authoredAttack=True,
                              attackRowsByDirection=[5,6,7,8,9])
    atlas.save(OUT / f'{costume_id}-motion-30m-20261025.webp', quality=88, method=4)
    print(costume_id, '25 authored poses, 80 rig frames')

layout_file.write_text('// Source bounds and body anchors for costume atlases.\nexport default '+json.dumps(layouts, separators=(',',':'))+';\n')
