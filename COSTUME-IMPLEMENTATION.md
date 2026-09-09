# 월영의 방랑자 — costume-live-1

## Implemented integration
- Kael and Serin cost 100 essence each. Prices/descriptions come from the catalog; the server validates actual price and balance.
- Private unique ownership, equipped selection and request receipts are server-owned. Purchase debits and ownership insert are atomic, replay-safe and newest-session-only.
- The save queue serializes purchases/equip with saves. Concurrent earned essence is merged as a delta, not overwritten by the purchase snapshot.
- Costume receipt revisions reject stale pre-purchase snapshots. Old save API calls are rejected after a costume transaction, requesting an updated client.
- Equipped appearance restores from account load and appears in portraits, combat and ranking inspection. Portraits have no equipment overlays; combat retains the current weapon, aura and pose-specific grip. Pets are retained.
- Ownership grants +5% each (+10% combined), regardless of equipped appearance. Choosing the default character does not remove ownership bonuses.
- Admin accounts with a configured currency floor are not debited.
- Image decoding is lazy and cache-limited. All seven poses and hand/ground anchors live in the shared catalog. Original generation prompts: art/COSTUME-PROMPTS.md.

## Important security scope
This release fixes legitimate-client save collisions, purchase receipts, ownership authorization and equipped appearance. It does NOT migrate the entire legacy economy/combat to server-authoritative rewards. The legacy account state (including earned essence, gear and combat stats) is still client-trusted; a malicious modified client can still forge legacy balances. Do not claim full anti-cheat or authoritative currency earning.

The old essence_authoritative flag stays false. A separate purchases_enabled flag accurately describes costume shop availability. This is a deliberate scoped launch, not a completed authoritative-economy migration.

## Deployment
Apply 06, 07, then 08. Migration 08 was applied to production on 2026-09-09 and returned purchases_enabled=false. Deploy costume-live-1 frontend, verify public assets, then run 09 to open purchases.
No account reset or blanket ownership grant is performed. Existing prices are 100. Stored purchase receipts are never rewritten when prices change.
To pause new purchase/equip operations, set purchases_enabled=false; do not delete ownership or roll the account wrappers back after people purchase.

## Tests executed
- Catalog validation, unique additive attack bonuses, exact large-integer arithmetic, unknown future IDs retained.
- PGlite migration repeated; release gate; 100 cost; insufficient funds; duplicate/replayed requests; nonce reuse; injected receipt failure atomic rollback; account isolation; RLS restrictions; unowned equip; withdrawn product ownership; session takeover; old save rejection; stale receipt rejection; admin floor retention.
- Full application with isolated backend: purchase both, equip Kael, default appearance, +5/+10 bonus, field render selection, ranking costumeId, reload persistence and exact balance.
- Lost response after a committed purchase retried with the same nonce; double-click did not duplicate purchase; +3 essence earned while purchase was in-flight survived both immediate save and reload. Exactly two purchase receipts for two characters.
- Existing six-width UI, 124 base weapon cases, 36 monster images, forge success/failure, audio, account save/reload regression passed with no page errors.
- Art tests cover 72 pose/scale/mirror transforms and injected draw failures. This is not a claim of testing every weapon on every real mobile device or of full server combat authority.

## Future costumes
Use permanent unique IDs. Add art metadata, seven complete poses, price and bonus; add a matching forward server catalog migration. Never reuse an owned ID. Catalog/server parity tests must pass. Withdraw products by disabling new sales, not deleting ownership. Schema changes must preserve unknown future IDs and require explicit migrations.
