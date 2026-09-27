import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy import ndimage

root=Path('rebirth')
layout=json.loads((root/'motion-layout.mjs').read_text().removeprefix('export default ').strip().removesuffix(';'))
for cls in ['warrior','mage','archer','rogue','pirate']:
    im=Image.open(root/'tower'/f'hero-{cls}-directions.webp')
    sw,sh=im.width//4,im.height//4
    layout[cls+'Directions']={'bodyHeight':sh*.75,'frames':[{'x':i%4*sw,'y':i//4*sh,'w':sw,'h':sh,'foot':sh-1} for i in range(16)]}
lines=['// Body height and foot anchor for each frame in motion-layout.mjs.',
       '// Measurements exclude detached fragments and thin weapons; artwork is unchanged.',
       '// Each entry is [bodyHeight, anchorX, anchorY], in source-frame pixels.',
       'export default {']
for cls,spec in layout.items():
    src='hero-warrior-east-v4.webp' if cls=='warriorEast' else f'hero-{cls.removesuffix("Directions")}-directions.webp' if cls.endswith('Directions') else f'hero-{cls}-motion-v4.webp'
    im=Image.open(root/'tower'/src).convert('RGBA')
    radius=max(2,round(spec['bodyHeight']*.032))
    yy,xx=np.ogrid[-radius:radius+1,-radius:radius+1]
    disk=xx*xx+yy*yy<=radius*radius
    metrics=[]
    for frame,r in enumerate(spec['frames']):
        alpha=np.asarray(im.crop((r['x'],r['y'],r['x']+r['w'],r['y']+r['h'])))[:,:,3]>64
        core=ndimage.binary_opening(alpha,structure=disk)
        labels,count=ndimage.label(core)
        areas=np.bincount(labels.ravel());areas[0]=0
        ys,xs=np.where(labels==areas.argmax())
        top=int(ys.min())
        # The original foot marker keeps separate shoes and robe hems at ground level.
        foot=int(ys.max()+1) if cls.endswith('Directions') else min(r['h'],r['foot']+1)
        # Raised gauntlets and broad blades stay connected to the body mask.
        # Use the actual crown of the head in those hand-annotated sword poses.
        if cls=='warriorEast':
            top=[258,259,251,273,261,330,252,266][frame]
        elif cls=='warrior' and frame>=64:
            top=[12,25,22,28,22,22,22,24][frame-64]
        lower=ys>=top+(ys.max()-top)*.6
        anchor=round(float(np.median(xs[lower])),1)
        metrics.append([foot-top,anchor,foot])
    lines.append(f'  {cls}: [')
    for start in range(0,len(metrics),8):
        lines.append('    '+','.join(json.dumps(m,separators=(',',':')) for m in metrics[start:start+8])+',')
    lines.append('  ],')
lines.append('};')
(root/'motion-body-layout.mjs').write_text('\n'.join(lines)+'\n',encoding='utf-8')
