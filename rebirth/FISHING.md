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

## 2026-10-11 gold rebalance (protocol 4)

- Every bite is caught automatically (100%); no reeling challenge. Bite wait 5–9 s.
- Rewards: fish 99.2%, diamond chest 0.6%, dungeon key 0.2%. Cubes, potential scrolls and lock stones removed.
- Price = grade value [1,3,9,30,120,600] × spot scale [70,55,47,15,7] × (0.55+1.45×weight/max). Worm bait 50 for 2,500 G.
- Perfect play ~420 casts/h: rod1 ≈26k, rod20 ≈71k, rod40 ≈159k, rod50 ≈185k net G/h (Lv.200 hunting ≈385k/h runs in parallel).
- Aquarium: 2× sale price per hour (mythic 0.8×); expansion 300k×1.6^(slots−3) (last slot ≈5M). Rod Lv.1→50 ≈17M G (Lv.30+ grows 7%/level).
- `node rebirth/fishing-gold.test.mjs`.

## 2026-10-11 hunting-class income (update 219)

Spot scale [60,100,128,41,19]. ~300 casts/h net: rod1 ≈15k, rod10 ≈70k, rod20 ≈148k, rod30 ≈231k, rod40 ≈304k, rod50 ≈358k G/h (Lv.200 hunting ≈385k/h). Aquarium 0.75× sale price per hour (mythic 0.3×).

## 2026-10-11 10× (update 220)
Spot scale ×10 [600,1000,1280,410,190]: ~300 casts/h ≈ rod1 0.29M, rod20 1.48M, rod40 3.04M, rod50 3.58M G/h. Aquarium kept at previous absolute income (0.075× sale price, mythic 0.03×).

## Lv.70 expansion (2026-10-25)

- Rod cap 70. Lv.50+ costs grow 15%/level in gold and 20 + 2/level in diamonds (Lv.50→70 ≈ 146.7M G + 780 diamonds). The rod bonus to higher grades keeps growing to 70.
- New spots: 용궁 해구 (Lv.50, price ×1.65, grade luck 1.95) and 태고의 바다 (Lv.60, ×1.7, 2.0). 20 new fish (fish-51~70).
- New grade 태고 (rod 65+, 태고의 바다 only, 2 species). About 1 in 7,300 casts with worms at rod 70, 1 in 3,400 with star bait.
- Diamond exchange: 5 → 에디셔널 큐브, 3 → 블랙 큐브, 5 → 잠재 잠금석, at most 30 items per Korean day.
- Weekly big-fish contest (from Monday 2026-10-26, KST weeks): one target species from one spot per week, heaviest single fish ranks.
  1st: 100 diamonds + 50 에디셔널 큐브, 2nd–3rd: 50 + 30, no other rewards. Ranks come from `rebirth_fishing_contest` (fishing-contest.sql);
  claims are validated by the engine against that server ranking and can be collected within 4 weeks.
- Placeholder art for the new fish and spots is recolored existing art; see FISHING-70-ART.md for the real art request.
