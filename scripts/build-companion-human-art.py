"""Slice the generated 3x2 human portrait atlases and transparent rarity frames.
Usage: python scripts/build-companion-human-art.py portraits1.png portraits2.png portraits3.png frames.png [icons.png]
"""
from pathlib import Path
from PIL import Image
import sys
out=Path(__file__).resolve().parents[1]/'rebirth'/'companions'
out.mkdir(exist_ok=True)
ids=['s1','s2','a1','a2','a3','b1','b2','b3','c1','c2','c3','d1','d2','d3','f1','f2','f3','f4']
def cells(path,cols,rows):
    im=Image.open(path).convert('RGBA')
    for row in range(rows):
        for col in range(cols):
            yield im.crop((round(col*im.width/cols),round(row*im.height/rows),round((col+1)*im.width/cols),round((row+1)*im.height/rows)))
for group,path in enumerate(sys.argv[1:4]):
    for index,im in enumerate(cells(path,3,2)):
        im.convert('RGB').resize((512,512),Image.Resampling.LANCZOS).save(out/f'{ids[group*6+index]}-human-v1.webp',quality=91,method=6)
for grade,im in zip('sab cdf'.replace(' ',''),cells(sys.argv[4],3,2)):
    box=im.getbbox()
    if box: im=im.crop(box)
    im.resize((480,360),Image.Resampling.LANCZOS).save(out/f'frame-{grade}-v1.webp',quality=92,method=6)
if len(sys.argv)>5:
    for name,im in zip(['summon-ticket-v1','companion-menu-human-v1'],cells(sys.argv[5],2,1)):
        box=im.getbbox()
        if box: im=im.crop(box)
        im.thumbnail((160,160),Image.Resampling.LANCZOS)
        canvas=Image.new('RGBA',(176,176))
        canvas.alpha_composite(im,((176-im.width)//2,(176-im.height)//2))
        canvas.save(out/f'{name}.webp',quality=92,method=6)
print('Prepared 18 human portraits, 6 transparent rarity frames'+(', 2 icons' if len(sys.argv)>5 else ''))
