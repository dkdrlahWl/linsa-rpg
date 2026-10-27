# 6th / 7th advancement art, 2026-10-27

Generated with the built-in image_gen tool. Four separate requests, using each illustration as identity reference for its transparent sprite. Final project assets are the four `advancement-*-v1.webp` files beside this document. PNG outputs were encoded as WebP quality 90 with alpha retained; no manual background removal or repainting. All gameplay stats, encounter IDs, rewards and combat timing remain unchanged.

## Chronovas illustration

Use case: stylized-concept. Create production boss illustration for a Korean fantasy mobile RPG, sixth advancement boss 'Chronovas, Devourer of Time'. One magnificent ancient humanoid chronomancer titan, imposing full-body three-quarter frontal stance. Dark navy ceremonial robes beneath intricate weathered antique gold and ivory armor, hooded faceless head with two cyan burning eyes, enormous broken astronomical clock halo floating behind shoulders, long clock-hand glaive in right hand, suspended ornate hourglass in left. Realistic painted fantasy game key art, exceptionally detailed elegant materials, powerful readable silhouette, blue and gold time currents and shattered clockwork ruins in a dark celestial observatory background. Subject centered, entire body and weapon fit in frame with breathing room, shoulders at upper middle, no cropping of halo, weapon or feet. Portrait composition, no letters, no numbers, no UI, no borders, no watermark. This is final polished illustration, not a simple cartoon, not geometric vector art.

## Apocalis illustration

Use case: stylized-concept. Production boss key illustration for Korean fantasy mobile RPG, seventh and final advancement boss 'Apocalis, Void Dragon'. One colossal ancient four-legged dragon, obsidian black armored scales with exquisitely detailed jagged violet crystal spines, huge powerful bat wings, swept back ivory-black horns, sinister glowing magenta eyes, bright violet cosmic singularity embedded in chest, very long serpentine tail. Menacing noble intelligent face, not humanoid, no clothes or weapons. Fully rendered premium dark fantasy game painting, dramatic three-quarter front view on ruined floating temple, a broken eclipse and violet nebula behind it, void lightning, starlight and shattered stones. Majestic enormous final boss, strong anatomy and readable silhouette, polished painterly realism rather than flat cartoon. Portrait composition, whole dragon including wing tips, feet and tail fits within frame with margin. Wings partly raised and arched, head centered, violet magic surrounding dragon but not obscuring anatomy. No letters, no UI, no border, no watermark.

## Chronovas transparent sprite

Reference image: Chronovas illustration above. Transparent background enabled.

Use case: stylized-concept. Reference image is character identity and costume reference. Create ONE isolated full-body in-game boss sprite of this exact Chronovas character on a genuinely transparent background. Keep hooded featureless black face and cyan eyes, intricate antique gold/ivory armor over dark navy robes, broken clock halo, clock-hand glaive, hourglass. Adapt into a highly polished hand-painted 2.5D fantasy RPG battle sprite with slightly exaggerated readable proportions and clean high-contrast edges suitable to display 160px high. Three-quarter frontal combat-ready stance, elevated game-camera angle approximately 20 degrees, entire character, both weapons, cloak, clock halo and feet completely visible, centered with at least 8% transparent margin on all four sides. NO scenery, no floor, no background, no rectangle, no shadow plane, no text, no UI, no border, no additional figures, no sprite sheet. Preserve subtle tight cyan magic and metallic highlights, avoid large clouds and disconnected particles. Broad clear silhouette, clothing and armor richly painted and detailed, not geometric/cartoon placeholders. Only this single character cutout, alpha background.

## Apocalis transparent sprite

Reference image: Apocalis illustration above. Transparent background enabled.

Use case: stylized-concept. Reference is identity reference for Apocalis. Create ONE production in-game boss sprite, a full-body cutout of this exact obsidian-black four-legged void dragon with violet crystal spines, curved horns, magenta eyes and brilliant violet singularity in chest. Real transparent alpha background, absolutely no environment. Hand painted premium 2.5D fantasy RPG monster, clean readable silhouette at small game scale, elevated camera 20 degrees and three-quarter front view. Strong four legs crouched ready to attack, tail curls beside rear feet. Two bat wings partly raised, folded inward enough that ALL wing tips and tail fit comfortably inside a square canvas, with generous 10% empty transparent margins on every side. Dragon should take about 80% of image width and height. Anatomically magnificent and threatening, detailed metallic obsidian scales and bright purple highlights, body must remain visible and not black-on-black. No floor, no shadow plane, no background aura disk, no smoke clouds, no scattered particles, no text, no UI, no decorative frame, no other characters, no sprite sheet. Complete character only, suitable to layer directly over an existing combat arena.

## Integration and verification

- `advancement-art.mjs` maps stable encounter IDs to separate illustration / sprite paths.
- Advancement list and waiting-room cover use illustrations; TowerRenderer asset resolution and preload use the transparent sprites.
- Existing single-frame movement, attack/cast sway and facing are preserved. No new frame sequence is claimed.
- Checked alpha, asset presence, syntax, previous advancement portrait fallback, 250/300 trial regression, and 390px mobile rendering.
