# Responsiveness update

## Changes

- Reuse inventory card DOM by item ID and actual item/equipped statistics; update only changed cards and order. No new inventory limit.
- Combat-only paints do not rebuild inventory. Menu icon observer decorates affected subtrees, not the entire document on HP changes.
- Auction registration renders 20 available items per page, retaining every eligible item and exact selection.
- Interactive economy and auction actions wait for an in-flight passive sync. Immediate pending feedback; server authorization, idempotency and locking remain required.
- `supabase/16-economy-differential-commit.sql` updates the existing commit function only. Unchanged inventory skips gear writes; changed/new items retain ownership and escrow checks; removals retain tombstones. Release flags, balances and gameplay rules are not reset.

## Deployment

Publish the tested frontend files together. Apply SQL 16 in the existing project SQL Editor; do not rerun the full initial schema. Edge entrypoint and private credentials do not change. Confirm the success result and that auction release flags remain enabled. Preserve the current transactional ledger during any rollback.

## Executed tests

- Isolated real-browser/SQL integration: two accounts, summon, enhancement presentation, auction transfer and offline proceeds, replay after lost response, tamper rejection, reload and quota recovery passed.
- 2,400-item benchmark: repeated full paint approximately 8–10 ms versus approximately 400 ms before keyed reuse; combat-only paint approximately 2 ms, zero inventory rebuilds. These are local headless-browser timings, not end-to-end network latency promises.
- Metadata changes: zero inventory rebuilds and zero global menu scans; unchanged item card identity preserved when adding equipment.
- Auction registration pagination: 20 / 20 / 1 cards; final page selects the exact item. UI-only fixture is not submitted to a live server.
- Delayed passive sync followed by an auction list request completes without a spurious busy rejection.
- Isolated DB differential test: 2,400 unchanged items produce zero item-row writes; one enhancement produces one item write; one removal produces one tombstone.
- PostgreSQL concurrent connections: 10 buy/buy races, 10 buy/cancel races, 8 identical requests, original attributes and total essence conservation passed.

No production player equipment, balances, or live trades were used as test fixtures. Server confirmation still requires network time; pending feedback is not optimistic payment or item delivery.
