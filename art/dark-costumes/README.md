# Dark / fallen costume collection

Twelve additional costumes: two per job, each 50,000,000 gold. Existing costumes remain available. Collection key: `dark-20261102`.

Generated with the built-in imagegen tool using the existing 50M costume portrait and motion sheet as visual references. Per-character identity, material, colors, weapon and attack directions are recorded in `specs.json`; shared prompts are in `prompts.json`.

## Production format

- Shop portrait: transparent WebP, 768 × 960; centered character bounded to 736 × 768, matching the existing 50M portrait pipeline.
- Gameplay atlas: transparent WebP, 1600 × 1600; 25 authored 320 × 320 cells. Big-head, two-head-high SD character, visible separate legs and boots.
- Columns: front, front/right diagonal, right side, back/right diagonal, back.
- Rows: idle, left-foot walk, right-foot walk, attack windup, attack release.
- Packed by the unchanged `scripts/build-costume50m.py` method. The same 80-frame layout, ground anchors, body normalization and mirrored eight-direction renderer are used.
- Portrait filenames: `rebirth/costumes/<id>-portrait-ratio-v3.webp`.
- Atlas filenames: `rebirth/costumes/<id>-motion-ratio-v3.webp`.

Source illustrations are retained by imagegen. To rebuild, supply their local paths in a JSON list of `{id, classId, name, portrait, motion}` and run `python scripts/build-costume50m.py inputs.json`.

## Verification

`node rebirth/costume50m.test.mjs` checks all 24 costumes priced at 50M, including the 12 new costumes (two per job), exact debit, duplicate ownership, insufficient funds, class restrictions, persistence, eight-direction motion, body scale and client/server parity. Existing ownership and motion suites cover all 60 costumes. `dark-costumes-preview.html` uses the actual gameplay renderer for visual inspection.
