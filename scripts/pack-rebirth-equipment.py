"""Encode generated artwork for the text-backed repository upload path."""
import base64, json, subprocess, sys, tempfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
for asset in json.load(open(sys.argv[1])):
    with tempfile.TemporaryDirectory() as temp:
        encoded=Path(temp)/'atlas.webp'
        subprocess.run(['convert',asset['source'],'-quality','88',str(encoded)],check=True)
        data=base64.b64encode(encoded.read_bytes()).decode()
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="1000" viewBox="0 0 1100 1000"><image width="1100" height="1000" preserveAspectRatio="none" href="data:image/webp;base64,{data}"/></svg>'
    (root/'rebirth/equipment'/f"{asset['id']}.svg").write_text(svg)
    print(asset['id'],len(svg))
