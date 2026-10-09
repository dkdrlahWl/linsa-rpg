# Fishing release

The event tab opens fishing instead of Lumi summons. Existing Lumi ownership,
equipment and healing remain available. The weekly lottery remains a separate
event page. `petSummon` is rejected by the authenticated engine.

## Content and balance

| Site | Rod level |
| --- | --- |
| 숲속 여울 | 1 |
| 달빛 호수 | 10 |
| 단풍 협곡 | 20 |
| 산호 해안 | 30 |
| 천상의 심해 | 40 |

50 unique fish: 12 common, 11 uncommon, 10 rare, 10 epic, 5 legendary,
2 mythical. Legendary fish require at least rod 35; mythical fish require 45.
Rod cap 50; level 1→50 costs 257,923,200 gold and 323 diamonds.
Gold directly fills XP; diamonds are consumed only after XP is full.

Every fish has server-rolled weight, increasing its selling price and catch
difficulty. A cast consumes one bait, waits 2–4 seconds, then runs an 8–23 second
hold/release challenge. Higher rarity/weight narrows the moving target and
raises the accuracy requirement. One failed cast consumes bait without rewards.

Successful casts grant one reward: fish 94%, diamond chest 1.5%, red cube 2%,
potential unlock scroll 1%, potential lock stone 1%, dungeon key 0.5%.
Diamond chests open immediately for 3–8 diamonds. Three Korean-calendar daily
quests award up to seven diamonds. Dungeon keys are stored for future key
dungeons; this release does not implement a new key dungeon.

Fish bag capacity 150; aquarium starts with three slots and expands to ten.
Fish move between bag/tank, cannot be sold while in the tank, and disappear
when sold. Aquarium hourly income is 3 × max(1, floor(sale price × 1.5%)),
exactly triple the original income for every fish.
Offline accrual caps at twelve hours; settle before changing tank residents,
retain fractional gold after claims. Expansion costs 100,000 × 3^(slots−3).

Potential locks preserve one chosen line per cube use, consume one stone in
addition to the cube, preserve equipment grade and do not advance upgrade pity.
Locked prime-cube use below epic is rejected. New lock/key resources are bound
and are not offered in the existing marketplace.

## Authority and performance

Uses existing authenticated `ringu-rebirth` execution, snapshot revision/session
checks and `rebirth_private.receipts` idempotency. No new public RPC or schema
migration. Cast ID, species, weight, reward, motion seed and start/expiry times
come from the server. The server replays bounded 100 ms inputs and rejects
early, malformed, unfinished or repeated finishes. Only cast/end actions use
network requests; no requests per frame.

The scene is an optimized WebP, with small separate site thumbnails. Fish and
loot use lazy decoded 256 px transparent WebPs; the angler uses 640 px. Only the
active casting screen has an animation loop. It stops on tab changes and when
hidden; pointer and keyboard listeners are removed on disposal. Reduced motion
disables decorative bobbing. No video or 3D renderer.

Artwork generated with built-in ImageGen from the user's approved moon-lake
reference. Five scenery prompts describe woodland sunlight, moonlight and
willows, autumn canyon, coral sunset and celestial aurora seas. Each of the
50 fish has a distinct full-body transparent sprite prompt using `FISH.art`.
Separate angler, rod, bait, chest, diamond, lock and key sprites use the same
painted fantasy style. Existing cube/scroll illustrations are reused.

## Validation

`node rebirth/fishing.test.mjs` covers counts/gates, growth costs, replay/time
validation, failed catches, every reward, duplicate finishes, sell/tank
exclusivity, accrual/claims, daily reset and potential lock charges/results.
Existing consumable/shop tests and syntax checks are also run.
