"""Pack image_gen 3x5 alpha sheets without changing their painted content.
Usage: python scripts/pack-skill-looks.py <inputs.json> <source-archive-dir> <qa-dir>
"""
import json, sys, shutil
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).resolve().parents[1]
inputs=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
sources=Path(sys.argv[2]);qa=Path(sys.argv[3]);out=root/'rebirth'/'skill-looks'
for p in (sources,qa,out):p.mkdir(parents=True,exist_ok=True)
CELL=384

def boundaries(projection,n,vertical=False):
    # Search only near the prescribed grid; the broad transparent gutters are
    # identified using alpha, not a color key. Preserve every source alpha.
    length=len(projection);result=[0]
    smooth=np.convolve(projection.astype(float),np.ones(7)/7,mode='same')
    for i in range(1,n):
        # ImageGen makes higher-tier VFX taller. Find actual transparent valleys
        # instead of assuming five equal source rows and cutting through the art.
        target=length*(i/n)**(1.2 if vertical else 1)
        lo=max(result[-1]+30,round(target-length/n*.32));hi=min(length-30,round(target+length/n*.32))
        segment=smooth[lo:hi];low=np.flatnonzero(segment<=segment.min()+smooth.max()*.015)
        groups=np.split(low,np.where(np.diff(low)>1)[0]+1)
        group=max(groups,key=lambda a:len(a)/(1+abs(lo+float(a.mean())-target)/(length/n)))
        result.append(lo+round(float(group.mean())))
    return result+[length]

report={};overview=Image.new('RGB',(1800,1440),'#091320');peaks=Image.new('RGB',(1800,1110),'#091320')
font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',18)
for index,(name,path) in enumerate(inputs.items()):
    assert path, name
    image=Image.open(path).convert('RGBA');alpha=np.array(image.getchannel('A'))
    assert (alpha<8).mean()>.05,(name,'not transparent')
    shutil.copy2(path,sources/(name+'.png'))
    ys=boundaries((alpha>96).sum(axis=1),5,vertical=True)
    atlas=Image.new('RGBA',(CELL*3,CELL*5));bounds=[]
    for row in range(5):
        xs=boundaries((alpha[ys[row]:ys[row+1]]>96).sum(axis=0),3)
        for col in range(3):
            box=(xs[col],ys[row],xs[col+1],ys[row+1]);tile=image.crop(box)
            assert (np.array(tile.getchannel('A'))>128).sum()>100,(name,row,col,'empty')
            tile.thumbnail((CELL-16,CELL-16),Image.Resampling.LANCZOS)
            atlas.alpha_composite(tile,(col*CELL+(CELL-tile.width)//2,row*CELL+(CELL-tile.height)//2))
            bounds.append(box)
    atlas_path=out/(name+'-skills-v1.webp')
    atlas.save(atlas_path,quality=88,method=4)
    preview=atlas.crop((CELL,CELL*4,CELL*2,CELL*5))
    preview.save(out/(name+'-preview-v1.webp'),quality=90,method=4)
    # Original art/complete grid and fifth-tier peaks for visual review.
    thumb=atlas.copy();thumb.thumbnail((285,450),Image.Resampling.LANCZOS)
    x=(index%6)*300;y=(index//6)*480;overview.paste(thumb,(x+(300-thumb.width)//2,y),thumb)
    ImageDraw.Draw(overview).text((x+7,y+454),name,font=font,fill='#e8e2f7')
    p=preview.copy();p.thumbnail((285,310),Image.Resampling.LANCZOS)
    x=(index%6)*300;y=(index//6)*370;peaks.paste(p,(x+(300-p.width)//2,y),p)
    ImageDraw.Draw(peaks).text((x+7,y+320),name,font=font,fill='#e8e2f7')
    report[name]={'source_size':image.size,'grid':[3,5],'source_bounds':bounds,'alpha_zero_fraction':round(float((alpha==0).mean()),3),'atlas':name+'-skills-v1.webp','atlas_bytes':(out/(name+'-skills-v1.webp')).stat().st_size}
overview.save(qa/'스킬외형-18종-전체프레임.jpg',quality=92)
peaks.save(qa/'스킬외형-18종-미리보기.jpg',quality=94)
(qa/'스킬외형-이미지-검수.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('Packed',len(report),'themes,',len(report)*5,'skill designs,',len(report)*15,'painted frames; bytes',sum(r['atlas_bytes'] for r in report.values()))
