# 월영의 방랑자 — implementation checkpoint

## Staged release status

- Supabase foundation was applied on 2026-09-09 through the project's SQL Editor. The result explicitly confirmed purchase_enabled=false. Existing account saves and balances were not updated.
- The game now includes a read-only Character preview in the existing shop. Standing and six-pose battle previews load on demand, close with Escape, and never mutate equipment, currency, power or ownership. Purchasing and actual equipped costumes are NOT released.
- Full presentation QA passed with the added preview at 320px and 1440px, existing six-width UI/forge/audio/save regression checks, no page errors and no document overflow.

## Implemented code

- Two original full-character atlases with portrait and six combat poses each. Created using the built-in imagegen skill; prompts in art/COSTUME-PROMPTS.md. Lossless WebP preserves transparency.
- costume-catalog.js is the versioned product and pose registry. Immutable definitions are validated at startup; unknown future ownership survives normalization without granting effects. Unsupported save versions fail rather than silently discarding ownership.
- costume-art.js reads registry data. Ground roots, hand sockets and weapon grip share scale/mirror transforms. Portraits never render equipment; combat renders the current weapon with foreground fingers. It does not mutate combat state or hitboxes.
- Image requests are deduplicated and failures have retry cooldowns. At most two decoded atlases remain cached; setActive pins the selected appearance. Shop thumbnails should not preload every combat atlas.
- The pure bonus function computes floor(originalAttack * (100 + uniqueOwnedBonus) / 100); it never writes increased attack back as base attack.
- supabase/06-costume-foundation.sql adds private ownership, selection, catalog and request receipts. Same-account row locking, revision checks and atomic balance/ownership updates prevent partial transactions. The shop defaults CLOSED because existing essence saves are still client-trusted. Do not enable the release flag until the authoritative economy migration is complete.

## Executed tests

- node --test test/costume-catalog.test.cjs: five tests passed (catalog validation, +5/+10 additive effects, duplication, future-save behavior, invalid inputs and exact large-integer attack arithmetic).
- test/costume-art-qa.mjs: 72 pose/scale/mirror transforms passed; the 14-pose contact sheet was visually inspected. Twelve hand anchor pixels were sampled on the actual atlases and were opaque skin pixels. These checks are not a claim that all weapon types or actual phone performance have been checked.
- test/costume-store-qa.mjs: isolated PGlite database passed idempotent migration, closed release gate, exact 100 cost (after price migration 07), replay, request-ID reuse, duplicate ownership, insufficient funds, unowned equip, stale revision, +10 combined ownership, equipment preservation and newer-session rejection. Release gate was opened ONLY inside the disposable test DB.

## Still required before release

1. Move essence reward verification and spending to authoritative server operations; preserve existing reward rates and admin behavior. Prevent old account saves from overwriting canonical balances. Stage old-client compatibility and rollback before production changes.
2. Integrate costume RPC responses with the existing save queue without dropping concurrently earned rewards. Source ownership from private server tables, not player-submitted state.
3. Wire the existing shop and character-management controls, confirmation dialog, actual scene renderer, player inspection and +5/+10 attack display. Use shared renderer and registry rather than duplicating hooks.
4. Verify full purchase-to-relogin flow, all weapon categories, mobile framing and live profile synchronization. Then apply tested migrations and deploy together.

Production Supabase has the closed foundation migration. No balance change or ownership grant has been performed. Public release in this stage is limited to read-only previews; do not describe this as a completed costume launch.

## Additional update-safety checks

- Catalog/server migration price, name and bonus parity is asserted against the disposable database. Adding a client product without matching server data fails the test.
- A deliberately failing receipt trigger verifies a debit and ownership insert both roll back, leaving balance, revision and ownership unchanged.
- Authenticated roles cannot read private ownership tables or unlock the shop directly. A second account cannot inspect or equip the first account's costumes.
- Withdrawing a product from sale retains existing ownership, equip access and ownership bonuses.
- Three injected rendering failures (body, weapon, foreground fingers) leave the canvas transform unchanged. All 72 pose/scale/mirror cases also pass after this change.
- These are local automated checks, not a guarantee of no bugs or a completed live launch. Separate-connection concurrency, actual production purchase flows and real-device performance remain release requirements.

## Adding a future costume

Use a permanent unique product ID. Add complete art metadata and all seven poses to the catalog, produce a matching server-catalog migration, and run the catalog/art/store tests. Never reuse an old ID for a different product. Preserve previously owned IDs when a product is withdrawn. Keep purchase prices and authority on the server. The current game is fixed-direction idle combat; free WASD movement, mouse aiming and dash are not implemented by this feature.
