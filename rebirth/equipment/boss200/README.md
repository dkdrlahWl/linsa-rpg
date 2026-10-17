# Level 200 boss armor: three cosmetic sets

24 separate, transparent generated illustrations. Eight shared slots per set: helmet, cuirass,
greaves, gauntlets, boots, ring, earrings, pendant. Weapons retain their existing artwork.

Generated with the built-in image generation tool, one request per item. Prompt set:

- Afterglow / 잔광: radiant ivory and brushed gold, amber sunstone, sunburst crest.
- Twilight / 황혼: deep indigo and dark silver, violet moonstone, crescent and star filigree.
- Finality / 종언: obsidian and antique gold, crimson ruby, dragon horn and eclipse crest.

Every request specifies one isolated, hand-painted Korean fantasy RPG boss-loot icon,
consistent set materials, a full silhouette, transparent background, no text or frame,
no weapon or character, and generous safe margins. Pairs are requested for gauntlets,
boots and earrings; the pendant includes its necklace chain.

The SVG files embed WebP rasters at 224px inside a 256px square, with a fixed 16px inset
and `xMidYMid meet`. No atlas cell or neighboring item can be rendered. Reproduce the
packing step with `scripts/pack-boss200-art.py` and a generated-image source manifest.

`equipment.mjs` selects the matching artwork directly from the item's existing
`bossTier` (0 = Afterglow, 1 = Twilight, 2 = Finality). No new classification or
migration is introduced. This does not modify saved items, combat stats, potential
grades, drop rates, class restrictions, inventory identities or weapon artwork.
