"""Title nameplates v2: painted plate backgrounds (plates/<id>.webp, AI-generated, no text)
+ title text set in Black Han Sans (SIL OFL, subset per title) as live SVG text.
Legend/myth plates get an animated light sweep, glow pulse and sparkles.

Usage: python3 build_plates.py   (reads titles.json + plates/plates.json, writes ../titles/<id>.svg)
"""
import base64, io, json, os
from fontTools import subset
from fontTools.ttLib import TTFont
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
FONT = os.path.join(HERE, 'BlackHanSans-Regular.ttf')
OUT = os.path.join(HERE, '..', 'titles')
W, H = 640, 192
TITLES = json.load(open(os.path.join(HERE, 'titles.json'), encoding='utf-8'))
META = json.load(open(os.path.join(HERE, 'plates', 'plates.json'), encoding='utf-8'))
BASE = TTFont(FONT)
UPM = BASE['head'].unitsPerEm
CMAP = BASE.getBestCmap()
HMTX = BASE['hmtx']

# fill top/mid/bottom, ink (outline), glow
STYLE = {
    'common': ('#fffaf0', '#ffe2a8', '#c7832f', '#2b1405', '#ffb35a'),
    'rare':   ('#ffffff', '#d8f1ff', '#5fb2ff', '#061a3d', '#6fd0ff'),
    'epic':   ('#fff8ff', '#f0d2ff', '#b46bff', '#1e0738', '#c47bff'),
    'legend': ('#fffef0', '#ffe36a', '#ff8a1a', '#3a0f00', '#ffb02e'),
    'myth':   ('#ffffff', '#ffe0f6', '#8fd8ff', '#24063a', '#ff8ad8'),
}


def f1(v):
    return f'{v:.1f}'


def font_b64(text):
    opts = subset.Options(); opts.flavor = None; opts.layout_features = ['*']; opts.name_IDs = []; opts.notdef_outline = True
    f = TTFont(FONT); s = subset.Subsetter(opts); s.populate(text=text + ' '); s.subset(f)
    b = io.BytesIO(); f.save(b); return base64.b64encode(b.getvalue()).decode()


def text_width(text, size, spacing):
    adv = sum(HMTX[CMAP.get(ord(c), '.notdef')][0] for c in text)
    return adv * size / UPM + spacing * (len(text) - 1)


def plate_image(uid, scale):
    im = Image.open(os.path.join(HERE, 'plates', uid + '.webp')).convert('RGBA')
    im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=84, alpha_quality=90, method=6)
    return base64.b64encode(b.getvalue()).decode(), im.width, im.height


def sparkle(x, y, r, i):
    p = f'M{f1(x)} {f1(y-r)}Q{f1(x)} {f1(y)} {f1(x+r)} {f1(y)}Q{f1(x)} {f1(y)} {f1(x)} {f1(y+r)}Q{f1(x)} {f1(y)} {f1(x-r)} {f1(y)}Q{f1(x)} {f1(y)} {f1(x)} {f1(y-r)}Z'
    return (f'<path d="{p}" fill="#fffbe6" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="{1.5+i%3*.45:.2f}s" '
            f'begin="{i*.31:.2f}s" repeatCount="indefinite"/></path>')


FIRE = {'cp50', 'kill50', 'citadel6', 'boss200set', 'lv250', 'tower20', 'streak10', 'raid2', 'star25', 'job6', 'tower25', 'fieldNew', 'lv275'}


def fx_back(kind, uid, cx, cy, iw, ih, ox, oy, glow):
    """Animated effect layers composited OVER the plate with screen blending (plates fill the canvas)."""
    out = [f'<filter id="b{uid}" x="-30%" y="-60%" width="160%" height="220%"><feGaussianBlur stdDeviation="3.2"/></filter>'
           f'<filter id="w{uid}"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter>'
           f'<mask id="k{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><use href="#p{uid}" filter="url(#w{uid})"/></mask>']
    scr = f'style="mix-blend-mode:screen" mask="url(#k{uid})"'
    if kind == 'myth':
        out.append(f'<radialGradient id="r{uid}" cx="{f1(cx)}" cy="{f1(cy)}" r="300" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset=".35" stop-color="#fff4d8" stop-opacity=".3"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>')
        rays = ''.join(f'<path d="M{f1(cx)} {f1(cy)}L{f1(cx-10)} {f1(cy-300)}L{f1(cx+10)} {f1(cy-300)}Z" transform="rotate({i*30} {f1(cx)} {f1(cy)})"/>' for i in range(12))
        out.append(f'<g fill="url(#r{uid})" filter="url(#b{uid})" {scr} opacity=".55"><g>{rays}<animateTransform attributeName="transform" type="rotate" from="0 {f1(cx)} {f1(cy)}" to="360 {f1(cx)} {f1(cy)}" dur="16s" repeatCount="indefinite"/></g>'
                   f'<animate attributeName="opacity" values=".3;.7;.3" dur="3s" repeatCount="indefinite"/></g>')
    if kind == 'fire':
        out.append(f'<linearGradient id="fl{uid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff3a0a" stop-opacity="0"/><stop offset=".25" stop-color="#ff5a12" stop-opacity=".9"/><stop offset=".6" stop-color="#ffb02e" stop-opacity=".85"/><stop offset="1" stop-color="#fff2a0" stop-opacity="0"/></linearGradient>')
        base = oy + ih * .5
        flames = []
        n = 13
        for i in range(n):
            x = ox + iw * (.06 + .88 * i / (n - 1)); h = ih * (.3 + .22 * ((i * 7) % 5) / 4) * (1.25 if abs(i - n // 2) <= 1 else 1); w = iw * .045
            d = f'M{f1(x-w)} {f1(base)}Q{f1(x-w*.9)} {f1(base-h*.5)} {f1(x)} {f1(base-h)}Q{f1(x+w*.9)} {f1(base-h*.5)} {f1(x+w)} {f1(base)}Z'
            dur = .55 + (i % 4) * .13
            k = [.8, 1.15, .9, .8]
            t = ';'.join(f'0 {f1(base / kk - base)}' for kk in k)
            flames.append(f'<path d="{d}"><animateTransform attributeName="transform" type="scale" values="{";".join(f"1 {kk}" for kk in k)}" dur="{dur:.2f}s" repeatCount="indefinite"/>'
                          f'<animateTransform attributeName="transform" type="translate" additive="sum" values="{t}" dur="{dur:.2f}s" repeatCount="indefinite"/></path>')
        out.append(f'<g fill="url(#fl{uid})" filter="url(#b{uid})" {scr} opacity=".9">{"".join(flames)}</g>')
    return ''.join(out)


def aura_behind(uid, glow, strong):
    r, g, b = (int(glow[i:i+2], 16) / 255 for i in (1, 3, 5))
    return (f'<filter id="ag{uid}" x="-15%" y="-40%" width="130%" height="180%"><feColorMatrix type="matrix" values="0 0 0 0 {r:.3f}  0 0 0 0 {g:.3f}  0 0 0 0 {b:.3f}  0 0 0 1.6 0"/>'
            f'<feGaussianBlur stdDeviation="{9 if strong else 7}"/></filter>'
            f'<use href="#p{uid}" filter="url(#ag{uid})" opacity=".8"><animate attributeName="opacity" values=".35;1;.35" dur="{2.0 if strong else 2.6}s" repeatCount="indefinite"/></use>')


def embers(uid, ox, oy, iw, ih):
    out = []
    for i in range(9):
        x = ox + iw * (.12 + .76 * ((i * 37) % 9) / 8); y0 = oy + ih * .7; y1 = oy + ih * .05
        dur = 1.4 + (i % 3) * .5
        out.append(f'<circle cx="{f1(x)}" cy="{f1(y0)}" r="{2.2 + i % 3}" fill="#ffd27a"><animate attributeName="cy" values="{f1(y0)};{f1(y1)}" dur="{dur:.1f}s" begin="{i*.23:.2f}s" repeatCount="indefinite"/>'
                   f'<animate attributeName="opacity" values="0;1;0" dur="{dur:.1f}s" begin="{i*.23:.2f}s" repeatCount="indefinite"/></circle>')
    return ''.join(out)


def build(t):
    uid, name, grade, rank = t['id'], t['name'], t['grade'], t['rank']
    m = META[uid]; pw, ph = m['w'], m['h']
    s = min(W / pw, H / ph)
    data, iw, ih = plate_image(uid, s * 0.8)
    iw, ih = round(iw / 0.8), round(ih / 0.8)
    ox, oy = (W - iw) / 2, (H - ih) / 2
    bx0, by0, bx1, by1 = m['band']
    bx0, bx1 = ox + bx0 * s, ox + bx1 * s
    by0, by1 = oy + by0 * s, oy + by1 * s
    cx, cy, bw, bh = (bx0 + bx1) / 2, (by0 + by1) / 2, bx1 - bx0, by1 - by0
    spacing = 1.0 if len(name) <= 5 else 0
    size = bh * 1.04
    while text_width(name, size, spacing) > bw * 0.98 and size > 8:
        size -= 0.5
    top, mid, bot, ink, glow = STYLE[grade]
    anim = rank >= 3
    fb = font_b64(name)
    cls = f't{uid}'
    tx = f'x="{f1(cx)}" text-anchor="middle" dominant-baseline="central" class="{cls}"'
    sw = size * 0.17
    fill = (f'<linearGradient id="f{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset=".45" stop-color="{mid}"/>'
            f'<stop offset=".55" stop-color="{bot}"/><stop offset="1" stop-color="{mid}"/></linearGradient>')
    if grade == 'myth':
        fill = (f'<linearGradient id="f{uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".3" stop-color="#ffd0f2"/>'
                f'<stop offset=".6" stop-color="#c8e8ff"/><stop offset="1" stop-color="#e6d0ff"/></linearGradient>')
    defs = (f'<defs><style>@font-face{{font-family:"T{uid}";src:url(data:font/ttf;base64,{fb}) format("truetype");}}'
            f'.{cls}{{font-family:"T{uid}","Black Han Sans","Noto Sans KR",sans-serif;font-size:{f1(size)}px;letter-spacing:{spacing}px}}</style>'
            + fill +
            f'<filter id="g{uid}" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="{f1(size*.12)}"/></filter>'
            f'<linearGradient id="s{uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/>'
            f'<stop offset=".5" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
            f'<clipPath id="h{uid}"><rect x="0" y="0" width="{W}" height="{f1(cy-size*.04)}"/></clipPath>'
            f'<mask id="m{uid}"><text y="{f1(cy)}" {tx} fill="#fff">{name}</text></mask></defs>')
    img = f'<image id="p{uid}" href="data:image/webp;base64,{data}" x="{f1(ox)}" y="{f1(oy)}" width="{iw}" height="{ih}"/>'
    glow_el = (f'<text y="{f1(cy+1)}" {tx} fill="{glow}" stroke="{glow}" stroke-width="{f1(sw*1.6)}" stroke-linejoin="round" '
               f'opacity="{.75 if anim else .5}" filter="url(#g{uid})">{name}'
               + ('<animate attributeName="opacity" values=".45;.95;.45" dur="2.4s" repeatCount="indefinite"/>' if anim else '') + '</text>')
    extrude = ''.join(f'<text y="{f1(cy+size*.035*i)}" {tx} fill="{ink}" stroke="{ink}" stroke-width="{f1(sw)}" stroke-linejoin="round">{name}</text>'
                      for i in (3, 2, 1))
    body = (f'<text y="{f1(cy)}" {tx} fill="url(#f{uid})" stroke="{ink}" stroke-width="{f1(sw)}" stroke-linejoin="round" paint-order="stroke">{name}</text>'
            f'<text y="{f1(cy)}" {tx} fill="#fff" opacity=".3" clip-path="url(#h{uid})">{name}</text>')
    sweep = sparks = back = front = behind = ''
    if anim:
        kind = 'myth' if grade == 'myth' else 'fire' if uid in FIRE else 'aura'
        back = fx_back(kind, uid, cx, cy, iw, ih, ox, oy, glow)
        behind = aura_behind(uid, glow, kind == 'myth')
        if kind == 'fire': front = embers(uid, ox, oy, iw, ih)
        sweep = (f'<g mask="url(#m{uid})"><rect x="{f1(bx0-120)}" y="0" width="{f1(size*1.4)}" height="{H}" fill="url(#s{uid})" transform="skewX(-22)">'
                 f'<animate attributeName="x" values="{f1(bx0-120)};{f1(bx1+120)}" dur="{2.2 if grade=="legend" else 1.7}s" repeatCount="indefinite"/></rect></g>')
        pts = [(bx0 + 6, by0 + 2, 9), (bx1 - 8, by0 + 4, 10), (bx0 + bw * .3, by1 - 2, 6), (bx1 - bw * .25, by1, 7), (cx, by0 - 6, 6)]
        if grade == 'myth':
            pts += [(bx0 - 30, cy, 8), (bx1 + 30, cy - 6, 8), (cx - bw * .45, by0 - 14, 5)]
        sparks = ''.join(sparkle(x, y, r, i) for i, (x, y, r) in enumerate(pts))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{defs}'
            f'{behind}{img}{back}{glow_el}{extrude}{body}{sweep}{front}{sparks}</svg>')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    total = 0
    for t in TITLES:
        if t['id'] not in META:
            print('no plate for', t['id']); continue
        svg = build(t); total += len(svg)
        open(os.path.join(OUT, t['id'] + '.svg'), 'w', encoding='utf-8').write(svg)
    print('wrote', len(TITLES), 'titles', round(total / 1024), 'KB')
