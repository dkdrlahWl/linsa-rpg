# WB2 — 멸겁룡 카르가론

Created with the built-in image generation tool. WebP versions are compressed copies for runtime loading; original generated PNGs are retained locally.

## Arena — arena-v2.webp
Production-ready square top-down battle floor. Dark realistic Korean fantasy RPG, ruined basalt cathedral courtyard. Eight by eight equal worn stone slabs edge to edge, perfectly orthographic. Subtle chipped seams, charcoal slate, ash brown, dim ember cracks. No characters, UI, text, green, circles, perspective or raised obstacles. Low contrast for readable combat overlays.

## UI — ui-v2.webp
Production texture atlas, exactly four equal quadrants. Weathered gunmetal, antique bronze, dragon-scale corner ornaments. Top left: tactile square button, large ivory engraved UP arrow. Top right: empty thin bronze frame with near-black leather interior. Bottom left: ruby health surface. Bottom right: dark embossed dragon-scale leather panel. No words or green. Live accessible labels are rendered separately.

## Attacks — fx-v2.webp
Two by two equal cells on pure black for screen compositing. Top left: thin circular crimson warning ritual ring, runes and empty center. Top right: orange-red dragon fire impact with sparks and molten stone. Bottom left: ivory-gold upward projectile with particle trail. Bottom right: violet-white shockwave. Real painted effects, no green, labels or grid lines. Each sprite contained in its quadrant.

## Tomb — tomb-v2.webp
Single weathered gray stone gravestone viewed slightly from above and front. Chipped rounded top, engraved sword, stones at base. Transparent background, no ground plane, green, glow, words or frame. Realistic painted sprite with readable silhouette.

## Rendering correction
Clear and opaquely repaint the entire battle canvas every frame. Previously, transparent grid seams preserved old green player outlines and HP bars. The local body outline remains green as requested.
