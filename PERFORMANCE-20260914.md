# Rendering and input responsiveness

- Stop drawing offscreen combat/portrait canvases using IntersectionObserver.
- Paint visible scenery at 30 fps; cache the filtered background and gradient until the region or canvas dimensions change. Cap backing resolution at 1.5x CSS pixels.
- Serialize the inventory once per economy paint, rather than twice.
- Reserve interactive commands and show feedback before waiting for an in-flight passive sync. Repeated clicks cannot create duplicate commands.
- Poll at one-second intervals during combat and five-second intervals while idle. Schedule the next poll after completion so a slow response does not force another whole timer interval of waiting. Requests never overlap.
- Present confirmed field hits separately, at least 650 ms apart, with a bounded six-hit visual backlog. Hidden pages, stopping combat, changing monsters, or ending the session clears stale effects. Economic results remain entirely server authoritative; the visual queue does not award anything.

## Verification

Synthetic accounts only; no live player state used as fixtures. In the same headless Edge environment, over 1.5 seconds, combat drawImage calls fell from 273 to 135 and portrait calls from 91 to 45. Over one second offscreen, these fell from 180/60 to 0/0. These are rendering-work counts, not a claim about every player's frame rate or network latency.

The 2,400-item integration fixture measured combat UI updates at approximately 1.2 ms with zero inventory rebuilds. Confirmed hits 11 and critical 22 remained distinct, approximately 650 ms apart instead of simultaneous.

Run `node test/render-performance.test.mjs`, `node test/economy-browser.test.mjs`, `node --test test/economy.test.mjs`, `node test/world-boss-actions-v4.test.mjs`, and `node test/world-boss-input-v3.test.mjs`. The rendering test also covers idle polling, slow-network scheduling, and immediate click feedback while a passive request is pending. Browser/database fixtures are local PGlite; they do not measure production PostgreSQL contention.

Production database statistics were inspected read-only. Historical outlier request times exist, so these client changes do not establish that all server/network stalls are eliminated. Database locking, rewards, authentication, and transaction receipts are unchanged.

## Follow-up: server and periodic-save work

`ringu_economy_prepare` now settles daily rewards and retrieves the current snapshot in a single database request. The normal Edge handler makes three database requests instead of five, with one full snapshot fetched before computation instead of two. Auth verification, final post-commit state retrieval, CAS retries, receipt replay, daily reset settlement, and the existing global-before-account lock order are retained. No account identifiers are accepted by the new authenticated endpoint; it derives them from the validated session. The old snapshot endpoint remains compatible.

Unchanged periodic preference saves now perform zero storage writes and zero UI refreshes. Explicit saves still restore authoritative economic state, and changed preferences retain the existing backup/flush flow. Stationary portraits redraw only when their appearance changes; aura portraits animate at 15 fps. Costume readiness is part of the invalidation key so delayed image loading updates the portrait. Removed the per-frame color filter from moving combat sprites.

The repeat browser benchmark measured zero stationary portrait draws versus 45 in the prior release's 1.5-second sample. Twenty unchanged periodic saves caused zero writes and zero paints. Existing tamper rejection, changed audio preferences, lost-response replay, and economy browser checks passed. `test/economy-prepare-db.test.mjs` exercises real daily settlement through the new endpoint, including midnight catch-up, 800 reward probability cases, enrollment, current-session authorization, anonymous rejection, and one-time mail delivery. `test/economy-edge.test.mjs` checks the actual handler's three-request path and authentication/retry behavior. Production function deployed as version 21; anonymous requests remain rejected and database grants were verified. Measurements use local synthetic fixtures and do not imply every production connection has the same latency.
