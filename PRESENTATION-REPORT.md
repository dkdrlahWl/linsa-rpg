# UI / sound verification — 2026-09-09

## Baseline and scope

Fresh main baseline: ce204bc9a3f16e9b8c9fc1397cac025f96e58612.
No production database operations, balance/probability changes, account resets, or inventory migrations.

## Actual changes

- remodel.js: attack text refreshed independently of the equipment image signature; pet level participates in that signature. Portrait attack reads getPlayerStats().attack, which getPower() also returns. Hidden former header counter is not presented as a second final attack.
- Monster selection now uses the same 36 isolated monsterFrames as combat, encoded once per frame and cached. No original grid background in selection cards. Locked labels no longer receive whole-card brightness suppression.
- index.html/remodel.css: dedicated pet-management grid, single column on mobile, four 44px buttons in two columns, long-name wrapping, distinct equipped/locked states. Summon/codex grids remain separate.
- Three original generated raster assets: citadel-stage-v1.webp (147,912 bytes), forged-material-v1.webp (50,702 bytes), citadel-frame-v1.webp (28,842 bytes). Backgrounds, panel/button textures, nine-slice decorative borders, login background and portrait floor use these assets. Text remains real DOM text.
- weapon-pose-fix-v4.js: sampled fist center aligned to the weapon socket, character/pet contact shadows. Existing per-weapon grip lookup retained, rather than applying a global weapon offset.
- index.html now loads compatibility scripts deterministically. audio-engine no longer downloads unrelated patches. visual-polish keeps the transcend icon but no longer replaces the portrait renderer. mobile-draw-fix-v8 is explicitly refreshed by the actual rm-drop-card renderer instead of observing DOM mutations.
- Cache reference versions changed without clearing user storage.

## Sound routing

Additional requested forge work: original forge-hammer-v1.webp (16,832 bytes) replaces the hidden geometric hammer. Two 600ms-sequence strike frames at 140/380ms align with filtered steel transients and inharmonic metal resonances. At 600ms, forge-success emits a short bright finish; forge-failure emits a damped low impact. Actual local success/failure paths, animation name/image, busy state and double-charge prevention were tested; forge-strike.png records the impact pose. Costs, success rates, protection and transcend rules are unchanged.

The existing attack animation calls swing at its start, then the real damage path calls playHitSound(critical) once. This now selects a short filtered-noise/low-frequency impact; critical adds a deeper body and short high-frequency transient, not a duplicate normal hit. playDefeatSound selects one short inharmonic coin clink, not the former reward melody. Other success/reveal/BGM paths remain.

One capture-phase click delegate handles active native/role buttons, including dynamically created controls. First pointer/key input unlocks audio, but only click plays UI feedback. 55ms click-only throttling, disabled/inert rejection, independent SFX/music buses. Login uses the same engine and saved sound preference. No new external audio downloads.

## Actually executed

Isolated PGlite account store plus intercepted Supabase transport in headless Microsoft Edge; no live resources consumed.

- Widths 320/360/390/412/768/1440; portrait screenshots, desktop resize and 844×390 landscape document overflow check.
- Nine modal families opened and closed at six widths: tower, dungeon, shop, equipment codex, settings, ranking, pets, inventory, mail. No document overflow.
- Pet management 0/1/12 pets, long name, short 480px-high viewport, 320/390/768 widths: no body overflow; buttons ≥44px and nowrap.
- 36 monster image elements loaded from isolated frames. All-monster contact sheet visually inspected: no neighboring monster fragments. Some original magenta fringe/interior matte coloration remains in the existing artwork; this is not claimed fully corrected.
- 124 male/female weapon combinations: opaque grip pivots and no canvas side-edge intersections. Representative sword, curved blade, dual blade, katana and axe contact sheet visually inspected. Not all 124 poses individually judged for aesthetic quality.
- 5/10 actual rm-drop-card summons at all six widths: five columns, correct card count, confirmation button reachable. Existing 70ms reveal and reduced-motion CSS preserved; reduced-motion behavior not separately exercised.
- Keyboard, touch and dynamically created button each produced one click event; disabled button and SFX OFF produced none. Hit/critical/reward routes distinct. Voices returned to zero after sounds expired.
- Isolated signup, game entry and save/reload preserved test gold. No page errors or asset/script 404s in the test.

## Attack checks

Pet equipped 83 → removed 50 → equipped 83 → level-up 85 → weapon 101 → strengthened 106 → transcended 133 → aura 136. Each displayed value equaled getPower() and getPlayerStats().attack. Immediate pet equip/unequip also tested without a manual render. Gear-only attack remained separately 0/16/21/30. First pet base attack remained 33 (not divided a second time).

## Evidence

Local screenshots: test-artifacts/before/character-{width}.png, before/pets.png; after/character-{width}.png, after/pets.png, after/weapon-poses.png, after/all-monsters.png. Machine results: after/metrics.json and after/weapon-sockets.json. Screenshots are intentionally not shipped as game assets.

## Not claimed / remaining

Physical iOS/Android Safari, device speakers/headphones, subjective listening quality, native home-button background/return behavior, long-duration memory profiling, all 124 weapon poses' aesthetic review, fresh multiplayer/takeover regression, and all shop purchase/strengthening/claim transaction flows were not exhaustively tested this pass. Existing combat and progression rules were preserved, not redesigned. Generated texture/frame appearance has been inspected in representative character and pet views, not every modal screenshot.

## Reproduction

Install the pinned dev dependencies and Edge (or adjust the browser channel in the test). Run with QA_PHASE=after. Test schema fixtures are isolated historical schema copies, not deployment migrations. QA_PGLITE_MODULE and QA_PLAYWRIGHT_MODULE may point to existing local dependency installations.

## Commit / deployment

This report describes validated working-tree changes. Commit and live deployment status are reported separately in the final handoff; this file alone is not proof of deployment.
