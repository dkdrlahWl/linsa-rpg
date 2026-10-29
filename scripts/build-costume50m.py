"""Pack the 12 divine xianxia costumes using the existing 30M 5x5/80-frame rig.

Usage: python scripts/build-costume50m.py inputs.json
Inputs are a list of {id, classId, name, motion, portrait?}.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1] / 'rebirth'
OUT = ROOT / 'costumes'
items = json.loads(Path(sys.argv[1]).read_text())
layout_file = ROOT / 'costume-motion-layout.mjs'
layouts = json.loads(layout_file.read_text().split('export default ', 1)[1].strip().removesuffix(';'))
CELL, PAD = 320, 20

def cuts(projection, extent):
    smooth = ndimage.uniform_filter1d(projection.astype(float), size=3)
    result = [0]
    for i in range(1, 5):
        target = extent*i/5
        lo, hi = round(target-extent/5*.12), round(target+extent/5*.12)
        result.append(lo+int(smooth[lo:hi].argmin()))
    return result+[extent]

# Correct source directions observed in the generated source sheets.
MIRROR = {'azure-cloud-taoist': {(r,c) for r in range(5) for c in [1,2]},
          'ink-plum-assassin': {(2,0)}}
for item in items:
    cid = item['id']
    if item.get('portrait'):
        portrait = Image.open(item['portrait']).convert('RGBA')
        portrait = portrait.crop(portrait.getchannel('A').getbbox())
        portrait.thumbnail((736,928), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA',(768,960))
        canvas.alpha_composite(portrait,((768-portrait.width)//2,(960-portrait.height)//2))
        portrait_target=OUT/f'{cid}-portrait-50m-v1.webp'
        canvas.save(portrait_target,quality=90,method=6)
        if portrait_target.stat().st_size==0: canvas.save(portrait_target,lossless=True,method=4)
    if '--portraits-only' in sys.argv: continue
    image = Image.open(item['motion']).convert('RGBA')
    alpha = np.asarray(image.getchannel('A'))>32
    ys = cuts(alpha.sum(axis=1),image.height)
    atlas = Image.new('RGBA',(1600,1600))
    physical = []
    for row in range(5):
        xs = cuts(alpha[ys[row]:ys[row+1]].sum(axis=0),image.width)
        for col in range(5):
            tile = image.crop((xs[col],ys[row],xs[col+1],ys[row+1]))
            rgba = np.array(tile)
            labels,_ = ndimage.label(rgba[:,:,3]>8)
            areas = np.bincount(labels.ravel()); areas[0]=0
            assert areas.max()>100,(cid,row,col,'empty')
            keep = areas>=max(4,areas.max()*.002);keep[0]=False
            rgba[:,:,3][~keep[labels]]=0
            tile=Image.fromarray(rgba)
            tile=tile.crop(tile.getchannel('A').getbbox())
            if (row,col) in MIRROR.get(cid,set()):tile=ImageOps.mirror(tile)
            tile.thumbnail((CELL-2*PAD,CELL-2*PAD),Image.Resampling.LANCZOS)
            frame=Image.new('RGBA',(CELL,CELL))
            frame.alpha_composite(tile,((CELL-tile.width)//2,CELL-PAD-tile.height))
            atlas.alpha_composite(frame,(col*CELL,row*CELL))
            mask=np.asarray(frame.getchannel('A'))>64
            labels,_=ndimage.label(ndimage.binary_opening(mask,iterations=1))
            areas=np.bincount(labels.ravel());areas[0]=0
            yy,xx=np.where(labels==areas.argmax())
            top,foot=np.percentile(yy,[3,99.7])
            lower=yy>=top+(foot-top)*.68
            physical.append(dict(x=col*CELL,y=row*CELL,w=CELL,h=CELL,anchor=round(float(np.median(xx[lower])),1),foot=round(float(foot)+1,1),body=round(float(foot-top)+1,1)))
    # Lock each walk direction to its idle body scale, as in the current two-leg rig.
    for i in range(5,15): physical[i]['body']=physical[i%5]['body']
    frames=[]
    for direction in range(5):
        frames += [physical[r*5+direction] for r in [0,1,1,0,0,2,2,0]]
    for direction in range(5):
        frames += [physical[r*5+direction] for r in [3,3,3,4,4,4,4,0]]
    layouts[cid]=dict(width=1600,height=1600,rows=10,bodyHeight=physical[0]['body'],frames=frames,precleaned=True,authoredAttack=True,twoLegWalk=True,attackRowsByDirection=[5,6,7,8,9])
    atlas.save(OUT/f'{cid}-motion-twolegs-v1.webp',quality=88,method=4)
    target=OUT/f'{cid}-motion-twolegs-v1.webp'
    if target.stat().st_size==0: atlas.save(target,lossless=True,method=4)
    print(cid,'25 poses / 80 rig frames')
layout_file.write_text('// Source bounds and body anchors for costume atlases.\nexport default '+json.dumps(layouts,separators=(',',':'))+';\n')
