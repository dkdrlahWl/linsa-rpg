# Daily boss, dismantling and protection choice

Mobile entry: Menu → 일일보스. New original artwork: `art/daily-boss-morgas.png`.

## Rules

- One account, three attempts per KST date. A transaction spends the attempt at start. Request replay returns the original attempt.
- Ten server-generated, one-second attacks use the owned equipment/pet/aura/costume snapshot at start. Browser damage, grade, quantity and reward values are not accepted.
- Each attempt starts at 10,000,000,000 reference HP. Damage measurement continues for ten seconds even when the displayed HP reaches zero. The HP is personal, never shared.
- A battle crossing midnight belongs to its start date. Its sealed ten-hit plan is included in midnight settlement, while its animation continues to its original ten-second deadline. No attempt is shortened, restored or moved to the next day.
- Rankings sum all attempts, break ties by the time that total was reached, then account UUID for an exact timestamp tie. Hidden accounts stay excluded.
- All eight supplied probability rows and expected values are preserved. PostgreSQL pgcrypto uses rejection sampling for exactly 100 equally likely reward buckets.
- A private `(day, account_id)` record and mail creation commit together. Existing atomic mailbox claims remove mail and credit essence once.
- Cron runs at 15:00 UTC (00:00 KST). Every login/economy request also catches up all unclosed dates.
- Inventory NPC removal is dismantling, including the legacy `sell` API alias. Each actual equipment ID has an independent, exactly 1/1000 chance, with rarity + 1 essence on success. No dismantling gold. Auction and pet sales remain separate.
- Equipment removal and payout use the existing revision check, request receipt and permanent item tombstone transaction. Up to 10,000 safe-integer IDs fit the bounded request. Inventory redraws once.
- Protection toggles are immediately displayed and serialized through `setProtect`. An enhancement waits for the choice save, uses that same value, and persists it in its response. Toggles are disabled during the enhancement itself. There is no daily dismantling limit.

## Validation

- `test/daily-boss.test.mjs`: exact buckets for all seven rarities; 1,248-item zero/one/multiple successes; mixed rarities; field essence removed; ten-second plan; 7,000,000 production CSPRNG draws.
- `test/daily-boss-db.test.mjs`: actual PostgreSQL SQL in PGlite, injected clock/random bytes only; three attempts, 9,999/10,000ms boundary, sums, eight ranks, ties, midnight crossover, 800 rank/bucket combinations, multi-day catch-up, mail uniqueness/replay and 1,248-item atomic deletion.
- `test/daily-boss-concurrency.test.mjs`: real isolated PostgreSQL, separate processes/connections, 24 repeated concurrent starts, competing starts, eight simultaneous settlements/claims/deletions, real pgcrypto coverage. Set `QA_POSTGRES_BIN` to Windows PostgreSQL `bin`.
- `test/daily-boss-browser.test.mjs`: actual page and synthetic SQL backend; 320/390/768px, eight ranks, 48 probability cells, ten-second battle, refresh recovery, Escape/X restrictions, acknowledgement, 1,248-item result and exactly one inventory redraw.
- `test/protect-choice-browser.test.mjs`: actual ON/OFF clicks, immediate enhancement after toggle, protected/unprotected failure, delayed sync, rapid toggles, refresh and +15 equipment.
- Existing economy unit/HTTP/database/browser, login/recovery, protection, offline selected-monster, stat bounds, original tower HP and auction database tests passed. Updated old omnibus browser fixtures to current auction migrations/selectors and paginated inventory.

Live rollout: database and cron first, authenticated Edge handler second, Pages assets last. The Edge verifies Auth explicitly and the database checks active sessions; `verify_jwt=false` retains the existing architecture. New tables deny browser access and the new RPC is service-role only.

## Artwork

Generated with the built-in image generator. Prompt: premium painterly dark-fantasy Korean mobile RPG boss, Morgas Judge of Twilight, ancient horned-crown armored undead king holding a downward sword in a ruined Gothic cathedral; weathered bronze, charcoal stone, burgundy cape, amber eyes; portrait 3:4, strong silhouette, no text, logos or UI. The same original image supplies the menu emblem.
