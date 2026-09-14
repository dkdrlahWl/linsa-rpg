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
