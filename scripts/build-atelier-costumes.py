"""Build the atelier collection with the existing 5x5 / 80-frame costume rig.

Usage: python scripts/build-atelier-costumes.py inputs.json
The inputs use the same {id, classId, motion} format as build-costume50m.py.
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
if '--portraits-only' not in sys.argv:
    subprocess.run([sys.executable, str(root / 'scripts/build-costume50m.py'), sys.argv[1]], check=True)
for item in json.loads(Path(sys.argv[1]).read_text()):
    target = root / 'rebirth/costumes'
    atlas = Image.open(target / f"{item['id']}-motion-ratio-v3.webp").convert('RGBA')
    for row in range(5):
        for col in range(5):
            tile = atlas.crop((col*320, row*320, (col+1)*320, (row+1)*320))
            mask = np.asarray(tile)[:, :, 3] > 8
            ys, xs = np.where(mask)
            assert xs.min() >= 19 and xs.max() <= 300, (item['id'], row, col, 'horizontal gutter')
            assert ys.min() >= 19 and ys.max() <= 300, (item['id'], row, col, 'vertical gutter')
    # The shop uses the exact neutral front pose from the battle atlas.
    portrait = atlas.crop((0, 0, 320, 320))
    rgba = np.array(portrait)
    rgba[:, :, 3][rgba[:, :, 3] <= 8] = 0
    portrait = Image.fromarray(rgba)
    portrait = portrait.crop(portrait.getchannel('A').getbbox())
    portrait.thumbnail((736, 768), Image.Resampling.LANCZOS)
    # Upscale the extracted pose uniformly, keeping the standard portrait canvas.
    scale = min(736 / portrait.width, 768 / portrait.height)
    portrait = portrait.resize((round(portrait.width*scale), round(portrait.height*scale)), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (768, 960))
    canvas.alpha_composite(portrait, ((768-portrait.width)//2, (960-portrait.height)//2))
    canvas.save(target / f"{item['id']}-portrait-ratio-v3.webp", quality=90, method=6)
    print(item['id'], '25 isolated cells with transparent gutters; matching portrait')
