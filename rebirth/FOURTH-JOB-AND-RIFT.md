# Fourth job and rift response update

## Combat synchronization

Co-op now records 100 ms input frames, predicts the complete battle locally, and replays late inputs on the server within a bounded three-second window. Stable per-hit RNG keeps replayed damage deterministic. Each response includes a personal confirmed simulation baseline so inputs made during the request are replayed rather than discarded. Requests run at up to 100 ms intervals with only one in flight; duplicate frames cannot deal extra damage. Inputs outside the time window or numeric/button limits are rejected or expired. Private replay history never reaches the browser.

Dash direction is normalized, including a short touch or partial-frame press: a light joystick movement no longer shortens the dash. Room locking is scoped to the room rather than serializing every room in the game.

## Fourth job

Level 150, previous jobs required, 120-second dedicated trial. Aureon has 2,050,000 HP and 1,000 attack. Each job adds 10% attack and HP, preserving the existing progression rule. Practice remains available after completion.

All five fourth skills total 1800% base attack before existing combat modifiers, with a 30-second cooldown. More projectiles/ornaments do not create more damage rolls beyond the fixed pulse count.

| Class | Skill | Hits | Damage per hit | Duration between first/last hit |
|---|---|---:|---:|---:|
| Warrior | 천검 만화진 | 12 | 150% | 6.6 s |
| Mage | 성운의 종말 | 15 | 120% | 5.6 s |
| Archer | 천풍 화살비 | 18 | 100% | 6.8 s |
| Rogue | 월영 윤무 | 20 | 90% | 7.6 s |
| Pirate | 대해의 포화 | 10 | 180% | 7.2 s |

Warrior/rogue fields follow the caster; other fields stay at their cast location. Targets outside the visible field take no pulse damage. Keyboard: O; mobile: fourth skill button.

## Recorded checks

- Delayed-input replay at 500–1000 ms matched the local simulation, including dash immunity and critical-hit RNG; malformed/future/duplicate inputs were covered.
- A browser fixture with 600 ms round-trip delay confirmed dash and fourth skill response before the next server reply.
- At level 150 with nine 17-star boss items, unique main-stat potentials, and the dodge policy in `reports/fourth-balance.mjs`, the fourth trial cleared in 49.3–51.4 seconds across five classes. This is a defined simulation, not a guarantee for every build or player.
- Fourth pulse budgets, 150 gate, victory unlock, practice, rankings, co-op rewards and mobile controls were checked.

New music: original acoustic sample arrangements, lobby `lobby-green-road.mp3` and combat `battle-wild-oath.mp3`; see audio credits. No vocals or oscillator/synth tracks.

Art: built-in ImageGen, transparent full-body ivory/bronze lion knight with teal cloth and crescent halberd; generated source preserved, runtime asset `tower/boss-aureon.webp`. Full-body frame is treated as one sprite to prevent cropping.

Fourth skill atlas: built-in ImageGen, five transparent painted components: ivory celestial sword, burning meteor, emerald arrow, violet crescent blade, sea-spray cannonball. Saved as `tower/fourth-job-atlas.webp`; source image preserved. Components are animated through `fourth-effects.mjs`.

Follow-up balance and melee movement: see FIELD-BALANCE.md.
