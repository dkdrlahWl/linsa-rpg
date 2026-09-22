# Field progression update

Field entry has no character-level requirement. Prior boss clears and star-force gates remain. Weekly, daily and party boss difficulty is unchanged.

New equipment uses levels 1, 10, 20, ... 200. Each ordinary region rolls its lower tier at 70.710678% and upper tier at 29.289322%; region 0 gives 1/10, region 1 gives 20/30, etc. Level-200 rewards give only 200. Applies to field, boss, dungeon, crafting and SQL party rewards. Existing owned/listed/mail equipment retains its level, stars and potential. Catalog keys and market discoveries use ten-level tiers; old discoveries remain, and held/mail equipment is backfilled.

## Monster stats

Region | First-stage HP | First-stage attack
---|---:|---:
Green fields | 90 | 8
Moonlit forest | 2300 | 520
Forgotten mine | 5200 | 1050
Red canyon | 8500 | 1600
Dead castle | 12000 | 2150
Frost plains | 16000 | 2750
Black desert | 20500 | 3350
Sky temple | 26000 | 3950
Time rift | 32000 | 4650
Abyss throne | 39000 | 5300

Stages 2/3 have +20%/+40% HP and +12%/+24% attack. Intro region is separately tuned: HP 90/360/900, attack 8/55/180.

## Economy calibration

Model: warrior, all level points in main stat, nine same-level ordinary items, quality 50, no potential. Expected upgrade cost sums cost/success for each step through 10 stars (failures hold at these steps). Figures exclude item acquisition, cube expenses, selling and boss unlock delays. Boss gold is conditional on clearing eligible daily bosses, not guaranteed income.

Level | Stars per item | CP | First-stage seconds | Gold/hour | Expected nine-item upgrade gold
---|---:|---:|---:|---:|---:
20 | 3 | 797 | 7 | 4243 | 17523
40 | 4 | 1597 | 7 | 6943 | 53578
60 | 5 | 2449 | 8 | 8438 | 127672
100 | 7 | 4301 | 8 | 13163 | 483017
140 | 9 | 6331 | 8 | 17888 | 1351206
180 | 10 | 8392 | 9 | 20100 | 2412939

At these kill rates, material and equipment income also slows: probabilities per kill are unchanged. Nine class-matched distinct slots take about 45*H9/0.0045 = 28,290 kills in expectation before any tier/quality requirements, ignoring trading, boss drops and crafting. Trade and boss rewards therefore remain meaningful. No rare potential or perfect quality is assumed in the baseline.

A live level-29 CP-1061 equipment snapshot produces approximately 639 DPS: forest stages take 4/5/6 seconds; mine, canyon and frost entry stages fail survival. This is a calculation from that snapshot, not a universal CP threshold. Actual class, gear, potentials and resource allocation affect outcomes. Long-term retention is not guaranteed by this calibration.
