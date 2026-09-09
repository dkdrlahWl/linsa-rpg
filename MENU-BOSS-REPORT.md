# Menu and boss presentation follow-up

- Sidebar plaques reuse the original forged-material texture with raised brass rims, inset emoji medallions, keyboard focus and reduced-motion handling.
- Portrait weapons rotate around their authored handle socket to point down/out with the relaxed arm. Two-handed items mirror this orientation; gauntlets keep their existing fit. Combat animation and stats are unchanged.
- Tower artwork extracts thirty connected silhouettes, using authored row boundaries. Two touching pairs are separated along minimum-opacity seams; isolated canvases include padding and use contain sizing, not raw atlas background offsets.
- Gold dungeon's twenty stages share their name and art index between the stage list, battle heading and contained monster artwork. HP, reward, entry and unlock logic are untouched.
- Image data URLs are generated once and cached; the animation loop only updates an enemy background when its identity changes.

Validation: isolated-account Playwright suite passed, including thirty tower cutouts, twenty stage labels, stages 1/10/20 battle titles and art, 124 gender/weapon socket combinations, six viewport widths, equipment totals, summon dialogs, pet controls, forge success/failure and save/reload. No page errors or missing assets. Tower contact sheet, menu plaques and weapon pose sheet were visually inspected. These tests do not use or modify live players.
