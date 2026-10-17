"""Package generated single-item icons without atlas cropping or gameplay changes."""
import base64,json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'rebirth/equipment/boss200'
out.mkdir(parents=True,exist_ok=True)
manifest=json.load(open(sys.argv[1]))
for item in manifest:
    data=subprocess.check_output(['convert',item['source'],'-strip','-resize','224x224','-quality','88','webp:-'])
    encoded=base64.b64encode(data).decode()
    # A second safe inset protects even assets with translucent outer glow.
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><image x="16" y="16" width="224" height="224" preserveAspectRatio="xMidYMid meet" href="data:image/webp;base64,{encoded}"/></svg>'
    (out/f"{item['set']}-{item['index']}.svg").write_text(svg)
print(f'Packaged {len(manifest)} individual icons with 16px safe padding')
