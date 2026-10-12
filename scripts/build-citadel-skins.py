"""Build citadel/skin-NN.webp floor skins from the AI-painted floor maps (B_maps 13-33) and their floor plans.
Run from the unpacked art package dir; outputs skins/skin-NN.png (convert to webp in rebirth/citadel). Floors 11/12 use the path row for rooms."""
import numpy as np,json
from PIL import Image
maps=json.load(open('/tmp/claude-0/bp/maps.json'))
OFF={1:(0,0),2:(0,0),3:(0,0),4:(0,0),5:(-4,-12),6:(0,-2),7:(-4,-6),8:(0,0),9:(-2,6),10:(-10,-12),11:(0,0),12:(0,0),13:(0,-8),14:(2,0),15:(4,-12),16:(-12,-10),17:(12,0),18:(4,-8),19:(8,-12),20:(0,0),21:(-8,-6)}
V=16
for m in maps:
  f=m['floor'];T=np.array([list(r) for r in m['tiles']]);n=64
  img=Image.open(f'src/B_maps/{12+f}-B-floor-{f:02d}.png').convert('RGB').resize((2048,2048),Image.LANCZOS)
  dx,dy=OFF[f];A=np.roll(np.roll(np.asarray(img),dy*2,0),dx*2,1)
  get=lambda x,y:T[y,x] if 0<=x<n and 0<=y<n else '0'
  cats={'room':[],'path':[],'top':[],'face':[]}
  for y in range(1,n-1):
    for x in range(1,n-1):
      t=T[y,x];nb=[get(x+i,y+j) for i in (-1,0,1) for j in (-1,0,1)]
      p=A[y*32:(y+1)*32,x*32:(x+1)*32]
      if t in '12' and all(v==t for v in nb):cats['room' if t=='2' else 'path'].append(p)
      elif t=='0':
        if get(x,y+1) in '12' and get(x,y-1)=='0' and get(x-1,y)=='0' and get(x+1,y)=='0':cats['face'].append(p)
        elif all(get(x+i,y+j)=='0' for i in range(-2,3) for j in range(-2,4)):cats['top'].append(p)
  rng=np.random.default_rng(f)
  out=Image.new('RGB',(32*V,32*4))
  counts={}
  for r,k in enumerate(['room','path','top','face']):
    c=cats[k] or cats['room'] or cats['path']
    if k=='path' and len(cats['path'])<6:c=cats['room']
    if k=='room' and len(cats['room'])<6:c=cats['path'] or c
    counts[k]=len(cats[k])
    P=np.array(c).astype(float)
    col=P.reshape(len(P),-1,3).mean(1);sd=P.mean(-1).reshape(len(P),-1).std(1)
    med=np.median(col,0);dist=np.linalg.norm(col-med,axis=1)
    # keep the patches closest to the typical colour and not too busy (drops props, torches, misaligned walls)
    score=dist/ (dist.std()+1e-6)+ np.maximum(0,(sd-np.median(sd)))/(sd.std()+1e-6)
    ok=np.argsort(score)[:max(V,len(P)//3)]
    pick=rng.choice(ok,V,replace=len(ok)<V)
    target=np.median(col[ok],0)
    for i,j in enumerate(pick):
      p=P[j]*(target/np.maximum(col[j],1))**.85
      out.paste(Image.fromarray(np.clip(p,0,255).astype(np.uint8)),(i*32,r*32))
  out.save(f'skins/skin-{f:02d}.png');print(f,counts)
