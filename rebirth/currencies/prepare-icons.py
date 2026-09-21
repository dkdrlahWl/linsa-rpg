"""Resize generated currency art without changing composition or transparency."""
from pathlib import Path
from PIL import Image
import json,base64,io,sys
out=Path(__file__).parent
for key, source in json.loads(sys.stdin.read()).items():
    with Image.open(source) as im:
        im.thumbnail((256,256),Image.Resampling.LANCZOS)
        buffer=io.BytesIO()
        im.save(buffer,format='WEBP',quality=90,method=6)
        w,h=im.size
        data=base64.b64encode(buffer.getvalue()).decode()
        (out/(key+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}"><image width="{w}" height="{h}" href="data:image/webp;base64,{data}"/></svg>')
print('Icons prepared')
