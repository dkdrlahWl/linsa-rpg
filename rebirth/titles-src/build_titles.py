#!/usr/bin/env python3
"""칭호 이미지 생성기: rebirth/titles/<id>.svg  (배경 장식 + 칭호 글자, 전설·신화는 움직이는 효과)
Font: Black Han Sans (SIL OFL 1.1, see OFL.txt) — subset per title and embedded in each SVG.
Run: python3 rebirth/titles-src/build_titles.py
"""
import base64, io, json, math, os
from fontTools import subset
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'titles')
FONT = os.path.join(HERE, 'BlackHanSans-Regular.ttf')
TITLES = json.load(open(os.path.join(HERE, 'titles.json'), encoding='utf-8'))
W, H = 320, 96
CX, CY = 160, 50

def font_b64(text):
    opts = subset.Options(); opts.flavor = None; opts.layout_features = ['*']; opts.name_IDs = []; opts.notdef_outline = True
    f = TTFont(FONT); s = subset.Subsetter(opts); s.populate(text=text + ' '); s.subset(f)
    buf = io.BytesIO(); f.save(buf); return base64.b64encode(buf.getvalue()).decode()

def f1(v): return f'{v:.1f}'

# ---------- palettes: text gradient (top, mid, bottom), outline, glow, accent ----------
PAL = {
 'flame':  ('#fff6c8', '#ffb43a', '#e2400e', '#4a0c00', '#ff7a1a', '#ffd25a'),
 'gold':   ('#fffbe0', '#ffd45a', '#b8730e', '#3e2200', '#ffcf4a', '#fff1a8'),
 'ice':    ('#ffffff', '#9fe3ff', '#2a78d8', '#0a1f4a', '#6fd0ff', '#d6f6ff'),
 'violet': ('#fff0ff', '#d79bff', '#7a2fd8', '#24073f', '#b36bff', '#f0d6ff'),
 'rose':   ('#fff0f6', '#ff9ac8', '#d6286f', '#3f0620', '#ff5fa8', '#ffd0e6'),
 'jade':   ('#f2fff6', '#8ff0b8', '#139a5a', '#03301a', '#3fe08a', '#ccffe0'),
 'crimson':('#ffe8e8', '#ff6a6a', '#9a0a1a', '#2a0004', '#ff2a3a', '#ffb0b0'),
 'bronze': ('#fff0dc', '#e6a868', '#8a4a18', '#2e1504', '#d98a40', '#ffd8a8'),
 'silver': ('#ffffff', '#d8e4f2', '#6c7f99', '#18212e', '#b9d2f0', '#ffffff'),
 'ocean':  ('#f0fdff', '#7fe0ff', '#0f6aa8', '#03213a', '#3fc6ff', '#c8f4ff'),
 'cosmic': ('#ffffff', '#c9b8ff', '#4a2ad8', '#0c0530', '#8f6bff', '#e6dcff'),
 'emerald':('#f6fff0', '#b6f06a', '#3f8a10', '#132a03', '#8ee03f', '#e6ffc8'),
 'sunset': ('#fff4e0', '#ff9a6a', '#c02a6a', '#2e0620', '#ff6a8a', '#ffd0b0'),
 'rainbow':('#ffffff', '#ffd6f0', '#9a6bff', '#1a0630', '#ff8ad8', '#ffffff'),
 'shadow': ('#f2ecff', '#a99ac8', '#3a2a5a', '#0a0612', '#6a4a9a', '#d8ccff'),
 'blood':  ('#fff0f0', '#ff4a5a', '#5a0010', '#160002', '#ff1030', '#ffb0b8'),
}

# per-title design: palette, ornaments, animation
D = {
 'lv30':      ('jade',    ['sprout','ribbon'], None),
 'lv100':     ('silver',  ['laurel','ribbon'], None),
 'lv200':     ('ice',     ['wingsS','laurel','gemB'], None),
 'lv250':     ('gold',    ['rays','wingsL','crown'], 'aura'),
 'job5':      ('violet',  ['orbs5','wingsS'], None),
 'cp10':      ('silver',  ['anvil','plate'], None),
 'cp50':      ('flame',   ['flames','wingsL','crown'], 'fire'),
 'kill1':     ('bronze',  ['swordsX','ribbon'], None),
 'kill50':    ('blood',   ['skull','swordsX','drips'], 'blood'),
 'field':     ('emerald', ['mountains','flag'], None),
 'tower5':    ('bronze',  ['spire1','ribbon'], None),
 'tower10':   ('ice',     ['spire2','plate'], None),
 'tower15':   ('violet',  ['spire3','wingsS'], None),
 'tower20':   ('ice',     ['spire3','wingsL','bolts'], 'lightning'),
 'boss30':    ('crimson', ['horns','plate'], None),
 'boss1':     ('bronze',  ['plate','starsS'], None),
 'weekly':    ('violet',  ['orbs7','plate'], None),
 'expl0':     ('jade',    ['ruins','ribbon'], None),
 'expl1':     ('flame',   ['crystals','plate'], None),
 'expl2':     ('cosmic',  ['nebula','wingsL','starsS'], 'cosmos'),
 'citadel1':  ('shadow',  ['gate','plate'], None),
 'citadel11': ('shadow',  ['spikes','wingsS'], None),
 'citadel6':  ('crimson', ['gate','flames','swordsX'], 'fire'),
 'raid0':     ('ocean',   ['waves','ribbon'], None),
 'raid1':     ('flame',   ['dragon','plate'], None),
 'raid2':     ('gold',    ['starburst','wingsL','starsS'], 'stars'),
 'raid3':     ('cosmic',  ['eclipse','wingsL','halo'], 'eclipse'),
 'arena10':   ('bronze',  ['shieldS','ribbon'], None),
 'arena100':  ('crimson', ['swordsX','laurel'], None),
 'arena1st':  ('rainbow', ['rays','wingsL','crown','halo'], 'aura'),
 'streak10':  ('ice',     ['chevrons','wingsL','bolts'], 'lightning'),
 'fish1':     ('ocean',   ['fishS','ribbon'], None),
 'fish1000':  ('ocean',   ['fishS','waves'], None),
 'rod40':     ('ocean',   ['rod','plate'], None),
 'rod50':     ('gold',    ['rod','starsS','laurel'], None),
 'tank10':    ('ocean',   ['bubbles','plate'], None),
 'fishL':     ('gold',    ['waves','fishS','wingsS'], 'water'),
 'fishM':     ('rose',    ['waves','wingsL','crown'], 'water'),
 'fishAll':   ('rainbow', ['waves','wingsL','halo','starsS'], 'rainbow'),
 'star25':    ('gold',    ['starburst','wingsL'], 'stars'),
 'pot3':      ('violet',  ['gems3','plate'], None),
 'cube1000':  ('violet',  ['cubes','plate'], None),
 'star20set': ('ice',     ['shieldB','wingsL','starsS'], 'shine'),
 'boss200set':('flame',   ['flames','horns','wingsL'], 'fire'),
 'jackpot':   ('rose',    ['wheel','wingsL','coins'], 'spin'),
 'lotto':     ('sunset',  ['clover','wingsL','coins'], 'sparkle'),
 'invest':    ('emerald', ['chart','wingsL','coins'], 'pulse'),
 'market':    ('emerald', ['scales','ribbon'], None),
 'costume':   ('rose',    ['dress','ribbon'], None),
 'gold10':    ('gold',    ['coins','gemB','laurel'], None),
}

def grad(id_, a, b, c):
    return (f'<linearGradient id="tf{id_}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/>'
            f'<stop offset=".42" stop-color="{b}"/><stop offset=".58" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient>')

# ---------- ornaments ----------
def feather_wing(side, col, dark, size=1.0, layers=5, anim=False):
    s = -1 if side == 'L' else 1
    g = []
    for i in range(layers):
        L = (70 + i * 6) * size; ang = -38 + i * 15
        a = math.radians(ang)
        tipx, tipy = CX + s * (58 + math.cos(a) * L), CY - 8 + math.sin(a) * L * .55
        bx = CX + s * 58
        d = f'M{f1(bx)} {f1(CY-2)}Q{f1(bx + s*L*.45)} {f1(CY-14 - 10*(2-i)*.4)} {f1(tipx)} {f1(tipy)}Q{f1(bx + s*L*.5)} {f1(CY+8)} {f1(bx)} {f1(CY+10)}Z'
        g.append(f'<path d="{d}" fill="url(#wg{side})" stroke="{dark}" stroke-width="1.6" opacity="{.95 - i*.07:.2f}"/>')
    body = ''.join(reversed(g))
    if anim:
        body = (f'<g>{body}<animateTransform attributeName="transform" type="rotate" values="0 {CX+s*58} {CY};{-6*s} {CX+s*58} {CY};0 {CX+s*58} {CY}" dur="2.4s" repeatCount="indefinite"/></g>')
    return body

def ornament(name, P, uid, animated):
    top, mid, bot, ink, glow, acc = P
    o = {}
    o['ribbon'] = (f'<path d="M34 34h252l-12 16 12 16H34l12-16z" fill="{mid}" opacity=".35" stroke="{ink}" stroke-width="2"/>'
                   f'<path d="M58 30h204v40H58z" fill="url(#pl{uid})" stroke="{ink}" stroke-width="2.4" rx="6"/>')
    o['plate'] = (f'<rect x="40" y="24" width="240" height="52" rx="14" fill="url(#pl{uid})" stroke="{ink}" stroke-width="2.6"/>'
                  f'<rect x="46" y="29" width="228" height="42" rx="10" fill="none" stroke="{acc}" stroke-opacity=".55" stroke-width="1.4"/>')
    o['wingsS'] = f'<g transform="translate({CX} {CY}) scale(.78) translate({-CX} {-CY})">{feather_wing("L", mid, ink, .8, 4)}{feather_wing("R", mid, ink, .8, 4)}</g>'
    o['wingsL'] = feather_wing('L', mid, ink, 1.0, 6, animated) + feather_wing('R', mid, ink, 1.0, 6, animated)
    def crownp(cx=CX, y=6, sc=1.0):
        return (f'<g transform="translate({cx} {y}) scale({sc})"><path d="M-22 22l-4-18 12 8 14-14 14 14 12-8-4 18z" fill="url(#ac{uid})" stroke="{ink}" stroke-width="2"/>'
                f'<circle cx="0" cy="-4" r="3.4" fill="#ff4d6d" stroke="{ink}"/><circle cx="-26" cy="4" r="2.4" fill="#6fd6ff"/><circle cx="26" cy="4" r="2.4" fill="#6fd6ff"/></g>')
    o['crown'] = crownp(CX, 15, .78)
    o['laurel'] = ''.join(
        f'<g transform="translate({CX} {CY}) scale({s} 1)">' + ''.join(
            f'<ellipse cx="{f1(-112 + i*9)}" cy="{f1(10 - abs(i-3)*4 + (i*1.5))}" rx="7" ry="3.2" transform="rotate({-40 + i*14} {f1(-112 + i*9)} {f1(10 - abs(i-3)*4)})" fill="{acc}" stroke="{ink}" stroke-width="1"/>' for i in range(7)) + '</g>'
        for s in (1, -1))
    o['rays'] = (f'<g opacity=".8"><g>' + ''.join(
        f'<path d="M{CX} {CY}L{f1(CX+math.cos(math.radians(a))*170)} {f1(CY+math.sin(math.radians(a))*90)}L{f1(CX+math.cos(math.radians(a+7))*170)} {f1(CY+math.sin(math.radians(a+7))*90)}Z" fill="{acc}" opacity=".28"/>' for a in range(0, 360, 20))
        + (f'<animateTransform attributeName="transform" type="rotate" from="0 {CX} {CY}" to="360 {CX} {CY}" dur="18s" repeatCount="indefinite"/>' if animated else '') + '</g></g>')
    o['flames'] = ''.join(
        f'<path d="M{x} 70q-14-20 -2-46q2 14 10 18q-2-16 10-34q4 26 8 30q8-10 6-24q16 26 4 56z" fill="url(#fl{uid})" opacity="{.75 if i%2 else .95}" transform="translate({-18} 0)">'
        + (f'<animateTransform attributeName="transform" type="translate" values="-18 0;-18 -4;-18 1;-18 0" dur="{.8+i*.13:.2f}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".95;.6;1;.95" dur="{.7+i*.11:.2f}s" repeatCount="indefinite"/>' if animated else '')
        + '</path>' for i, x in enumerate([70, 112, 150, 190, 230, 262]))
    o['sprout'] = f'<path d="M{CX} 22v-12" stroke="{ink}" stroke-width="3"/><path d="M{CX} 14c-10 0-14-6-14-12 8 0 14 4 14 12zM{CX} 12c0-10 8-14 14-14 0 8-6 14-14 14z" fill="{acc}" stroke="{ink}" stroke-width="1.5"/>'
    o['gemB'] = f'<path d="M{CX-10} 82l6-8h8l6 8-10 12z" fill="#6fd6ff" stroke="{ink}" stroke-width="1.5"/>'
    o['orbs5'] = ''.join(f'<circle cx="{f1(CX + math.cos(math.radians(-90+i*72))*0 + (i-2)*44)}" cy="{f1(14 + abs(i-2)*4)}" r="5" fill="{acc}" stroke="{ink}" stroke-width="1.5"/>' for i in range(5))
    o['orbs7'] = ''.join(f'<circle cx="{f1(CX + (i-3)*34)}" cy="{f1(12 + abs(i-3)*3)}" r="{5 if i==3 else 3.5}" fill="{acc}" stroke="{ink}" stroke-width="1.3"/>' for i in range(7))
    o['anvil'] = f'<path d="M{CX-30} 14h50l-10 8h-6v6h10v4H{CX-26}v-4h10v-6h-8z" fill="{acc}" stroke="{ink}" stroke-width="1.5"/>'
    o['swordsX'] = ''.join(f'<g transform="translate({CX} {CY}) rotate({a})"><rect x="-4" y="-62" width="8" height="92" rx="3" fill="{acc}" stroke="{ink}" stroke-width="1.5"/><rect x="-14" y="26" width="28" height="6" rx="2" fill="{mid}" stroke="{ink}"/></g>' for a in (-58, 58))
    o['skull'] = f'<g transform="translate({CX} 4)"><path d="M0 0c-14 0-22 9-22 20 0 7 4 11 8 13v7h28v-7c4-2 8-6 8-13 0-11-8-20-22-20z" fill="#f2e6e6" stroke="{ink}" stroke-width="2"/><circle cx="-8" cy="20" r="5" fill="{ink}"/><circle cx="8" cy="20" r="5" fill="{ink}"/></g>'
    o['drips'] = ''.join(f'<path d="M{x} 74v{h}a3 3 0 0 1-6 0v-{h}z" fill="#c00018"/>' for x, h in ((96, 10), (130, 16), (204, 12), (232, 8)))
    o['mountains'] = f'<path d="M30 80l40-40 20 18 30-34 34 56z" fill="{mid}" opacity=".45" stroke="{ink}" stroke-width="1.5"/><path d="M290 80l-40-40-20 18-30-34-34 56z" fill="{mid}" opacity=".45" stroke="{ink}" stroke-width="1.5"/>'
    o['flag'] = f'<path d="M{CX} 22V2" stroke="{ink}" stroke-width="3"/><path d="M{CX} 2l18 6-18 6z" fill="#ff5a5a" stroke="{ink}"/>'
    def spire(n):
        g = ''
        for side in (-1, 1):
            for k in range(n):
                x = CX + side * (122 - k * 16); h = 40 + k * 10
                g += f'<path d="M{x-6} 82v-{h}l6-12 6 12v{h}z" fill="{mid}" opacity="{.5+k*.12:.2f}" stroke="{ink}" stroke-width="1.4"/>'
        return g
    o['spire1'], o['spire2'], o['spire3'] = spire(1), spire(2), spire(3)
    o['bolts'] = ''.join(f'<path d="{d}" fill="none" stroke="#dff6ff" stroke-width="2.6" stroke-linecap="round" opacity="0"><animate attributeName="opacity" values="0;1;0;0;1;0" keyTimes="0;.05;.12;.6;.66;1" dur="{1.5+i*.4:.1f}s" repeatCount="indefinite"/></path>' for i, d in enumerate(['M28 20l14 10-8 4 16 14', 'M292 18l-14 11 8 4-16 15', 'M160 0l-6 9 8 2-6 9']))
    o['horns'] = f'<path d="M{CX-30} 26c-16-6-28-18-30-30 12 6 22 10 34 12zM{CX+30} 26c16-6 28-18 30-30-12 6-22 10-34 12z" fill="{acc}" stroke="{ink}" stroke-width="2"/>'
    o['starsS'] = ''.join(f'<path d="{star(x,y,5)}" fill="#fff6c4" opacity="{.9 if not animated else 0}">' + (f'<animate attributeName="opacity" values="0;1;0" dur="1.8s" begin="{i*.3:.1f}s" repeatCount="indefinite"/>' if animated else '') + '</path>' for i, (x, y) in enumerate([(22, 22), (298, 26), (40, 82), (282, 80), (110, 10), (214, 8)]))
    o['ruins'] = f'<path d="M36 82V52h10v30M54 82V60h10v22M256 82V58h10v24M274 82V48h10v34" fill="{mid}" opacity=".55" stroke="{ink}" stroke-width="1.5"/>'
    o['crystals'] = ''.join(f'<path d="M{x} 84l-7-20 7-16 7 16z" fill="#ff8a3a" opacity=".8" stroke="{ink}" stroke-width="1.2"/>' for x in (40, 58, 262, 280))
    o['nebula'] = f'<ellipse cx="{CX}" cy="{CY}" rx="150" ry="40" fill="url(#nb{uid})"/>'
    o['gate'] = f'<path d="M{CX-36} 26V6l12-6v6l12-6 12 6 12-6v6l12 6v20" fill="{mid}" opacity=".6" stroke="{ink}" stroke-width="1.5"/>'
    o['spikes'] = ''.join(f'<path d="M{CX + s*(70+k*14)} 30l{s*6} -26 {s*6} 26z" fill="{mid}" stroke="{ink}" stroke-width="1.3"/>' for s in (-1, 1) for k in range(4))
    o['waves'] = ''.join(f'<path d="M20 {78+k*6}q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0" fill="none" stroke="{acc}" stroke-width="2.4" opacity="{.8-k*.25:.2f}"/>' for k in range(3))
    o['dragon'] = f'<path d="M{CX-40} 24c10-20 30-24 40-18 10-6 30-2 40 18-12-6-24-4-30 4-4-4-16-4-20 0-6-8-18-10-30-4z" fill="{acc}" stroke="{ink}" stroke-width="1.8"/>'
    o['starburst'] = f'<path d="{star(CX, CY, 46, 20, 12)}" fill="{acc}" opacity=".35"/>'
    o['eclipse'] = (f'<circle cx="{CX}" cy="{CY}" r="40" fill="#fff6d0" opacity=".9"/><circle cx="{CX+12}" cy="{CY-6}" r="36" fill="#120a2a"/>')
    o['halo'] = (f'<ellipse cx="{CX}" cy="{CY}" rx="148" ry="42" fill="none" stroke="url(#rb{uid})" stroke-width="3" stroke-dasharray="40 18" opacity=".9">' +
                 (f'<animate attributeName="stroke-dashoffset" from="0" to="-232" dur="3s" repeatCount="indefinite"/>' if animated else '') + '</ellipse>')
    o['shieldS'] = f'<path d="M{CX} 2l18 6v10c0 10-8 16-18 20-10-4-18-10-18-20V8z" fill="{acc}" stroke="{ink}" stroke-width="1.8"/>'
    o['shieldB'] = f'<path d="M{CX} -2l40 12v26c0 26-18 40-40 50-22-10-40-24-40-50V10z" fill="{mid}" opacity=".45" stroke="{ink}" stroke-width="2"/>'
    o['chevrons'] = ''.join(f'<path d="M{CX-30} {16-k*7}l30-12 30 12" fill="none" stroke="{acc}" stroke-width="4" stroke-linecap="round"/>' for k in range(3))
    o['fishS'] = ''.join(f'<path d="M{x} 18c8-9 22-10 30 0-8 10-22 9-30 0zM{x+30} 18l8-7v14z" fill="{acc}" stroke="{ink}" stroke-width="1.3" transform="scale({sx} 1) translate({0 if sx>0 else -320} 0)"/>' for x, sx in ((30, 1), (30, -1)))
    o['rod'] = f'<path d="M30 86L80 6M290 86L240 6" stroke="{ink}" stroke-width="4"/><path d="M80 6c6 20 4 32-4 44M240 6c-6 20-4 32 4 44" fill="none" stroke="{acc}" stroke-width="1.6"/>'
    o['bubbles'] = ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="none" stroke="{acc}" stroke-width="1.6"/>' for x, y, r in ((40, 70, 6), (52, 52, 4), (62, 40, 3), (280, 66, 6), (268, 48, 4), (258, 36, 3)))
    o['gems3'] = ''.join(f'<path d="M{CX + d - 10} 12l6-8h8l6 8-10 12z" fill="{c}" stroke="{ink}" stroke-width="1.4"/>' for d, c in ((-34, '#c69bff'), (0, '#ff7ad0'), (34, '#6fd6ff')))
    o['cubes'] = ''.join(f'<path d="M{x} 6l12 7v14l-12 7-12-7V13z" fill="{acc}" stroke="{ink}" stroke-width="1.4"/>' for x in (50, 270))
    o['wheel'] = (f'<g transform="translate({CX} {CY})"><g>' + ''.join(f'<path d="M0 0L{f1(math.cos(math.radians(a))*46)} {f1(math.sin(math.radians(a))*46)}A46 46 0 0 1 {f1(math.cos(math.radians(a+45))*46)} {f1(math.sin(math.radians(a+45))*46)}Z" fill="{["#ff7ab6","#ffd25a"][i%2]}" opacity=".45"/>' for i, a in enumerate(range(0, 360, 45))) +
                  (f'<animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="5s" repeatCount="indefinite"/>' if animated else '') + '</g></g>')
    o['coins'] = ''.join(f'<g transform="translate({x} {y})"><circle r="8" fill="#ffd25a" stroke="#6a4200" stroke-width="1.6"/><circle r="5" fill="none" stroke="#b8730e"/></g>' for x, y in ((30, 70), (44, 82), (290, 70), (276, 82)))
    o['clover'] = ''.join(f'<circle cx="{CX + dx}" cy="{12 + dy}" r="7" fill="#5fd67a" stroke="{ink}" stroke-width="1.3"/>' for dx, dy in ((-7, 0), (7, 0), (0, -7), (0, 7)))
    o['chart'] = f'<path d="M36 80l24-18 18 10 30-30" fill="none" stroke="{acc}" stroke-width="3.5"/><path d="M100 36h12v12z" fill="{acc}"/>'
    o['scales'] = f'<path d="M{CX} 4v20M{CX-26} 10h52" stroke="{ink}" stroke-width="2.4"/><path d="M{CX-34} 22a8 4 0 0 0 16 0zM{CX+18} 22a8 4 0 0 0 16 0z" fill="{acc}" stroke="{ink}"/>'
    o['dress'] = f'<path d="M{CX-8} 2l-8 6 4 6 4-2v14h16V12l4 2 4-6-8-6c-2 4-4 5-8 5s-6-1-8-5z" fill="{acc}" stroke="{ink}" stroke-width="1.4"/>'
    return o.get(name, '')

def star(cx, cy, r, ri=None, n=5):
    ri = ri or r * .45; d = ''
    for i in range(n * 2):
        a = -math.pi / 2 + i * math.pi / n; rr = ri if i % 2 else r
        d += ('L' if i else 'M') + f1(cx + math.cos(a) * rr) + ' ' + f1(cy + math.sin(a) * rr)
    return d + 'Z'

def fx_layer(kind, P, uid):
    top, mid, bot, ink, glow, acc = P
    if kind == 'aura':
        return f'<ellipse cx="{CX}" cy="{CY}" rx="120" ry="40" fill="url(#gw{uid})"><animate attributeName="opacity" values=".55;1;.55" dur="2.2s" repeatCount="indefinite"/></ellipse>'
    if kind == 'pulse':
        return f'<ellipse cx="{CX}" cy="{CY}" rx="110" ry="36" fill="url(#gw{uid})"><animate attributeName="rx" values="100;130;100" dur="2s" repeatCount="indefinite"/></ellipse>'
    if kind in ('fire', 'blood'):
        col = '#ff2a3a' if kind == 'blood' else '#ff7a1a'
        return f'<ellipse cx="{CX}" cy="{CY+6}" rx="130" ry="34" fill="{col}" opacity=".25" filter="url(#bl{uid})"><animate attributeName="opacity" values=".15;.4;.2;.35;.15" dur="1.3s" repeatCount="indefinite"/></ellipse>'
    if kind == 'water':
        return ''.join(f'<ellipse cx="{CX}" cy="82" rx="20" ry="4" fill="none" stroke="#aef0ff" stroke-width="2" opacity="0"><animate attributeName="rx" values="20;150" dur="2.7s" begin="{i*.9:.1f}s" repeatCount="indefinite"/><animate attributeName="ry" values="3;12" dur="2.7s" begin="{i*.9:.1f}s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0" dur="2.7s" begin="{i*.9:.1f}s" repeatCount="indefinite"/></ellipse>' for i in range(3))
    if kind in ('cosmos', 'eclipse', 'rainbow'):
        return f'<ellipse cx="{CX}" cy="{CY}" rx="140" ry="42" fill="url(#gw{uid})"><animate attributeName="opacity" values=".5;.95;.5" dur="3s" repeatCount="indefinite"/></ellipse>'
    if kind in ('stars', 'sparkle', 'spin', 'lightning', 'shine'):
        return f'<ellipse cx="{CX}" cy="{CY}" rx="120" ry="36" fill="url(#gw{uid})" opacity=".7"/>'
    return ''

METAL = {
 'common': ('#fff2d6', '#d9a066', '#7a4418', '#f5c58e', '#3a1c06'),
 'rare':   ('#ffffff', '#c9dcf2', '#5c7394', '#eaf4ff', '#16233a'),
 'epic':   ('#fbefff', '#c9a3ff', '#5e2aa8', '#efdcff', '#1e0a3a'),
 'legend': ('#fffbe2', '#ffd45a', '#a8640a', '#fff0a8', '#3a2000'),
 'myth':   ('#fff6fd', '#ffb6e6', '#a83a9a', '#ffe2f6', '#300a32'),
}

def feather(side, i, n, sc, uid, anim):
    s = -1 if side == 'L' else 1
    base = (CX + s * 64, CY - 2)
    ang = math.radians(-50 + i * (95 / max(1, n - 1)))
    L = (58 + (n - i) * 7) * sc
    tip = (base[0] + s * math.cos(ang) * L * 1.15, base[1] + math.sin(ang) * L * .62)
    w = 9 + (n - i) * 1.2
    nx, ny = -math.sin(ang) * w, math.cos(ang) * w * .55
    c1 = (base[0] + s * math.cos(ang) * L * .5 + s * nx * .2, base[1] + math.sin(ang) * L * .3 - abs(ny))
    c2 = (base[0] + s * math.cos(ang) * L * .55 - s * nx * .2, base[1] + math.sin(ang) * L * .35 + abs(ny))
    d = (f'M{f1(base[0])} {f1(base[1])}Q{f1(c1[0])} {f1(c1[1]-4)} {f1(tip[0])} {f1(tip[1])}'
         f'Q{f1(c2[0])} {f1(c2[1]+4)} {f1(base[0])} {f1(base[1]+7)}Z')
    vein = f'M{f1(base[0])} {f1(base[1]+3)}L{f1(base[0]+(tip[0]-base[0])*.85)} {f1(base[1]+(tip[1]-base[1])*.85+1)}'
    return (f'<path d="{d}" fill="url(#fw{side}{uid})" stroke="url(#mk2{uid})" stroke-width="2.2"/><path d="{d}" fill="none" stroke="url(#fe{uid})" stroke-width=".9"/>'
            f'<path d="{vein}" stroke="#ffffff" stroke-opacity=".55" stroke-width=".9" fill="none"/>')

def wings(uid, sc, n, anim):
    out = ''
    for side in ('L', 'R'):
        s = -1 if side == 'L' else 1
        g = ''.join(feather(side, i, n, sc, uid, anim) for i in range(n))
        g2 = ''.join(feather(side, i, max(3, n - 2), sc * .72, uid, anim) for i in range(max(3, n - 2)))
        body = f'<g opacity=".95">{g}</g><g>{g2}</g>'
        if anim:
            body = (f'<g>{body}<animateTransform attributeName="transform" type="rotate" values="0 {CX+s*64} {CY};{-5*s} {CX+s*64} {CY};0 {CX+s*64} {CY}" dur="2.6s" repeatCount="indefinite"/></g>')
        out += body
    return out

def scroll(side, uid, big):
    s = -1 if side == 'L' else 1
    x0 = CX + s * 104
    sc = 1.15 if big else .9
    def X(v): return f1(CX + s * (104 + v * sc))
    def Y(v): return f1(CY + v * sc)
    d = (f'M{X(0)} {Y(-14)}C{X(18)} {Y(-30)} {X(46)} {Y(-24)} {X(44)} {Y(-6)}C{X(42)} {Y(6)} {X(28)} {Y(4)} {X(30)} {Y(-4)}'
         f'M{X(0)} {Y(14)}C{X(18)} {Y(30)} {X(46)} {Y(24)} {X(44)} {Y(6)}C{X(42)} {Y(-6)} {X(28)} {Y(-4)} {X(30)} {Y(4)}')
    leaf = (f'<path d="M{X(46)} {Y(0)}c{f1(s*8*sc)} -6 {f1(s*16*sc)} -4 {f1(s*20*sc)} 0c{f1(-s*4*sc)} 4 {f1(-s*12*sc)} 6 {f1(-s*20*sc)} 0z" fill="url(#mt{uid})" stroke="url(#mk2{uid})" stroke-width=".8"/>')
    return (f'<path d="{d}" fill="none" stroke="url(#mk2{uid})" stroke-width="{5.2 if big else 4.4}" stroke-linecap="round"/>'
            f'<path d="{d}" fill="none" stroke="url(#mt{uid})" stroke-width="{2.8 if big else 2.4}" stroke-linecap="round"/>' + leaf)

def gem(x, y, r, c1, c2, uid):
    return (f'<g transform="translate({f1(x)} {f1(y)})"><path d="M0 {-r}L{r*.85} 0L0 {r}L{-r*.85} 0Z" fill="{c2}" stroke="url(#mk2{uid})" stroke-width="1.6"/>'
            f'<path d="M0 {-r}L{r*.85} 0L0 0Z" fill="{c1}"/><path d="M0 {-r}L{-r*.42} {-r*.2}L0 0Z" fill="#fff" opacity=".7"/></g>')

def sparkle(x, y, r, i, anim):
    p = f'M{x} {y-r}Q{x} {y} {x+r} {y}Q{x} {y} {x} {y+r}Q{x} {y} {x-r} {y}Q{x} {y} {x} {y-r}Z'
    a = f'<animate attributeName="opacity" values="0;1;0" dur="{1.6+i%3*.4:.1f}s" begin="{i*.27:.2f}s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" values="0 {x} {y};45 {x} {y}" dur="1.6s" repeatCount="indefinite"/>' if anim else ''
    return f'<path d="{p}" fill="#fffbe6" opacity="{0 if anim else .85}">{a}</path>'

GEMC = {'common': ('#ffb07a', '#b4461a'), 'rare': ('#a6e4ff', '#2a6ad8'), 'epic': ('#e3b8ff', '#7a2ad8'), 'legend': ('#ff9aa8', '#c4102a'), 'myth': ('#ffd0f4', '#d03aa8')}

def build(t):
    uid = t['id']; pal, orns, fx = D[uid]; P = PAL[pal]
    top, mid, bot, ink, glow, acc = P
    g = t['grade']; rank = t['rank']; animated = rank >= 3
    m1, m2, m3, m4, mink = METAL[g]
    name = t['name']; n = len(name.replace(' ', '')) + .45 * name.count(' ')
    fs = min(42, 214 / max(n, 1) * 1.08)
    fb = font_b64(name)
    gc1, gc2 = GEMC[g]
    tx = f'x="{CX}" text-anchor="middle" dominant-baseline="central" class="t{uid}"'
    defs = (f'<defs><style>@font-face{{font-family:"T{uid}";src:url(data:font/ttf;base64,{fb}) format("truetype");}}'
            f'.t{uid}{{font-family:"T{uid}","Black Han Sans","Noto Sans KR",sans-serif;font-size:{f1(fs)}px;letter-spacing:{"-.5" if n > 7 else ".8"}px}}</style>'
            f'<linearGradient id="tf{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".22" stop-color="{top}"/><stop offset=".47" stop-color="{mid}"/><stop offset=".52" stop-color="{bot}"/><stop offset=".72" stop-color="{mid}"/><stop offset="1" stop-color="{top}"/></linearGradient>'
            f'<linearGradient id="mt{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{m1}"/><stop offset=".35" stop-color="{m2}"/><stop offset=".55" stop-color="{m3}"/><stop offset=".8" stop-color="{m4}"/><stop offset="1" stop-color="{m3}"/></linearGradient>'
            f'<linearGradient id="mk2{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{mink}"/><stop offset="1" stop-color="#000"/></linearGradient>'
            f'<linearGradient id="pl{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{ink}" stop-opacity=".55"/><stop offset=".5" stop-color="{ink}" stop-opacity=".92"/><stop offset="1" stop-color="#000" stop-opacity=".95"/></linearGradient>'
            f'<linearGradient id="fwL{uid}" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="{bot}"/><stop offset=".4" stop-color="{mid}"/><stop offset=".85" stop-color="{top}"/><stop offset="1" stop-color="#ffffff"/></linearGradient>'
            f'<linearGradient id="fwR{uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{bot}"/><stop offset=".4" stop-color="{mid}"/><stop offset=".85" stop-color="{top}"/><stop offset="1" stop-color="#ffffff"/></linearGradient>'
            f'<linearGradient id="fe{uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{m1}"/><stop offset="1" stop-color="{m3}"/></linearGradient>'
            f'<radialGradient id="gw{uid}"><stop offset="0" stop-color="{glow}" stop-opacity=".95"/><stop offset=".5" stop-color="{glow}" stop-opacity=".35"/><stop offset="1" stop-color="{glow}" stop-opacity="0"/></radialGradient>'
            f'<linearGradient id="ac{uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{m1}"/><stop offset="1" stop-color="{m3}"/></linearGradient>'
            f'<linearGradient id="fl{uid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff2a0a"/><stop offset=".55" stop-color="#ffaa2e"/><stop offset="1" stop-color="#fff6b0"/></linearGradient>'
            f'<radialGradient id="nb{uid}"><stop offset="0" stop-color="#8f6bff" stop-opacity=".75"/><stop offset=".6" stop-color="#3a1a8a" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>'
            f'<linearGradient id="rb{uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff5f8f"/><stop offset=".25" stop-color="#ffd25a"/><stop offset=".5" stop-color="#6dffb0"/><stop offset=".75" stop-color="#6fb8ff"/><stop offset="1" stop-color="#d77bff"/></linearGradient>'
            f'<filter id="bl{uid}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>'
            f'<filter id="gl{uid}" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="{4.5 if animated else 3}"/></filter>'
            f'<linearGradient id="sw{uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".95"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>'
            f'<clipPath id="hi{uid}"><rect x="0" y="0" width="{W}" height="{CY-3}"/></clipPath>'
            f'<mask id="mk{uid}"><text y="{CY}" {tx} fill="#fff">{name}</text></mask>'
            '</defs>')
    # ---- background layers ----
    halo = f'<ellipse cx="{CX}" cy="{CY}" rx="{140 if rank>=3 else 118}" ry="{42 if rank>=3 else 34}" fill="url(#gw{uid})" opacity="{.75 if rank>=3 else .45}">' + ('<animate attributeName="opacity" values=".55;.95;.55" dur="2.4s" repeatCount="indefinite"/>' if animated else '') + '</ellipse>'
    fxl = fx_layer(fx, P, uid) if animated else ''
    motif = ''.join(ornament(o, P, uid, animated) for o in orns if o not in ('ribbon', 'plate', 'wingsS', 'wingsL'))
    wing = wings(uid, 1.15, 7, animated) if rank >= 3 else wings(uid, .95, 5, False) if rank == 2 else ''
    tails = '' if rank == 0 else ''.join(
        f'<path d="M{CX+s*96} 62q{s*14} 10 {s*8} 30q{s*10} -6 {s*16} -2q{-s*2} -16 {-s*12} -30z" fill="url(#mt{uid})" stroke="url(#mk2{uid})" stroke-width="1.2" opacity=".95"/>' for s in (-1, 1))
    plate_d = f'M{CX-112} {CY}L{CX-94} {CY-21}H{CX+94}L{CX+112} {CY}L{CX+94} {CY+21}H{CX-94}Z'
    plate = (f'<path d="{plate_d}" fill="url(#pl{uid})" stroke="url(#mk2{uid})" stroke-width="6.5" stroke-linejoin="round"/>'
             f'<path d="{plate_d}" fill="none" stroke="url(#mt{uid})" stroke-width="3.4" stroke-linejoin="round"/>'
             f'<path d="M{CX-100} {CY}L{CX-88} {CY-15}H{CX+88}L{CX+100} {CY}L{CX+88} {CY+15}H{CX-88}Z" fill="none" stroke="{m4}" stroke-opacity=".45" stroke-width="1"/>')
    scrolls = scroll('L', uid, rank >= 2) + scroll('R', uid, rank >= 2)
    topgem = (gem(CX, CY - 24, 9 if rank >= 3 else 7, gc1, gc2, uid)
              + (f'<path d="M{CX-22} {CY-24}q11-10 22-2q11-8 22 2" fill="none" stroke="url(#mt{uid})" stroke-width="2.6"/>' if rank >= 1 else ''))
    botgem = gem(CX, CY + 24, 6 if rank < 3 else 8, gc1, gc2, uid) + (
        ''.join(f'<path d="M{CX+dx} {CY+30}v{9+abs(dx)/4}" stroke="url(#mt{uid})" stroke-width="2"/><circle cx="{CX+dx}" cy="{CY+40+abs(dx)/4}" r="2" fill="{gc1}"/>' for dx in (-6, 0, 6)) if rank >= 3 else '')
    sideg = ''.join(gem(CX + s * 108, CY, 4.5, gc1, gc2, uid) for s in (-1, 1)) if rank >= 1 else ''
    sparks = ''.join(sparkle(x, y, r, i, animated) for i, (x, y, r) in enumerate(
        [(30, 24, 6), (292, 30, 7), (60, 84, 4), (262, 82, 5), (110, 12, 4), (214, 10, 5), (150, 92, 3), (8, 60, 4), (314, 64, 4)][:3 + rank * 2]))
    # ---- lavish text ----
    ext = ''.join(f'<text y="{f1(CY+1.1*i)}" {tx} fill="{ink}" stroke="{ink}" stroke-width="7.5" stroke-linejoin="round">{name}</text>' for i in range(4, 0, -1))
    text = (f'<text y="{CY+2}" {tx} fill="{glow}" stroke="{glow}" stroke-width="13" stroke-linejoin="round" opacity=".7" filter="url(#gl{uid})">{name}</text>'
            + ext +
            f'<text y="{CY}" {tx} fill="none" stroke="url(#mk2{uid})" stroke-width="8.5" stroke-linejoin="round">{name}</text>'
            f'<text y="{CY}" {tx} fill="none" stroke="url(#mt{uid})" stroke-width="4.6" stroke-linejoin="round">{name}</text>'
            f'<text y="{CY}" {tx} fill="url(#tf{uid})" stroke="{ink}" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke">{name}</text>'
            f'<text y="{CY}" {tx} fill="#fff" opacity=".28" clip-path="url(#hi{uid})">{name}</text>')
    sweep = (f'<g mask="url(#mk{uid})"><rect x="-80" y="0" width="54" height="{H}" fill="url(#sw{uid})" transform="skewX(-22)"><animate attributeName="x" values="-80;380" dur="{1.6 if fx=="shine" else 2.6}s" repeatCount="indefinite"/></rect></g>') if animated else ''
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">{defs}'
            f'{halo}{fxl}{wing}<g opacity=".9">{motif}</g>{tails}{scrolls}{plate}{sideg}{topgem}{botgem}{text}{sweep}{sparks}</svg>')

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    if f.endswith('.svg'): os.remove(os.path.join(OUT, f))
total = 0
for t in TITLES:
    svg = build(t); total += len(svg)
    open(os.path.join(OUT, t['id'] + '.svg'), 'w', encoding='utf-8').write(svg)
print('wrote', len(TITLES), 'titles', round(total / 1024), 'KB')
