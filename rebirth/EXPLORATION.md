# 링구의 탐험

Three new generated-art themes: moonlit forest ruins (10 floors), volcanic crystal mine (11 floors), celestial abyss temple (12 floors). One player can start; maximum four. Every resident must be defeated before the stair opens. The last floor includes three guards and a unique boss. No timed reinforcements or surviving monsters are skipped. Regular floors allow 180 seconds; final floor allows 180 seconds of exploration, with a fresh 120-second timer when its boss engages. Moving to the next floor restores 20% max HP and clears casts. Existing five-second teammate revival and all five job skills remain available.

## Calibration

Frozen baseline: 도현 warrior level 200, combat power 206,123, attack 49,108, HP 67,525, defense 1,373, boss multiplier 3.2. A stationary 120-second attack and skill simulation deals approximately 75.1 million damage at current attack and 112.6 million at 1.5× attack. Theme-one final boss has 95 million HP before party scaling, leaving the stronger build room for movement/guards. This is a tuning target; actual clears depend on positioning, skill timing, and avoiding telegraphs.

Theme multipliers are exactly 1, 1.5, 2.25. Floor depth runs from 48% to 100% of theme stats. Population freezes at start: HP multiplier 1 + 0.30×(players−1); attack multiplier 1 + 0.12×(players−1). Departures never lower it. Final boss damage respects boss potentials; regular creatures do not. First theme at two players has 1.3× HP and 1.12× attack versus solo.

## Multiplayer and rewards

Uses existing coop rooms, durable validated input queues, bounded late-input replay, acknowledgements, worker prediction, and idempotent personal chest receipts. Monotonic global tick survives floors. At most eleven creatures, four players, seventy active combat effects, and thirty-five damage numbers per tick. No per-monster network requests. Only local player skill effects are drawn as in the existing raid.

Final personal chest: 100,000/150,000/225,000 gold; 3/4/5 red cubes; 1/2/3 black cubes. Each character receives its own chest after contributing damage or priest healing/shields. No partial floor rewards. Clear/best-time records persist on the player state. SQL public entry remains executable only by postgres and service_role, keeping session/epoch/readiness/membership and receipt checks intact.

## Assets

Built-in ImageGen created all three 1024×1024 painted top-down backgrounds and twelve original 512×512 transparent creature assets. Prompt set: moonlit woodland ruins, volcanic crystal mining halls, celestial abyss temple, each with three distinct residents and one guardian boss. Production WebP files live in `rebirth/exploration/`; atlases were separated, padded, and visually checked.

## Validation

`node rebirth/exploration.test.mjs`: all-kill gating, 10/11/12 floors, final boss, monotonic floor transition, frozen party difficulty, exact theme scaling, timeout, chest movement/reward, delayed replay, bounded four-player combat.

`node rebirth/coop-worker.test.mjs`: actual worker equivalence for five modes and six classes. Existing raid latency, eight-player repeated-raid soak, and request lifecycle checks also pass. Legacy `coop-replay.test.mjs` fails its pre-entry movement setup on unchanged main as well; this feature has independent late-input coverage. Managed preview lacks the required control-browser capability, so browser visual QA is unavailable in this environment.

다음 테마는 직전 테마의 최종 보스를 처치하고 개인 보상을 수령한 후 해금됩니다. 잠긴 테마의 방 생성·참가·시작은 서버에서도 차단합니다.

## Room-and-corridor dungeon update

Each floor now has six tile rooms linked by two-tile corridors, branches and a loop. Seeded floor rotation and room dimensions vary across depths. Shared geometry enforces wall collision for entry movement, normal walking, dash, monster pursuit and post-win chest walking. Line of sight blocks attacks through walls. Monsters spawn in separate rooms and use cached breadth-first navigation through corridors. Shared discovery fog and an outlined minimap reveal explored rooms, enemies, allies and locked/active stairs. The existing generated backgrounds provide themed floor texture under rock walls. One half-resolution cached background per renderer bounds canvas memory.

`node rebirth/exploration-dungeon.test.mjs` validates 108 connected layouts, stairs reachable by navigation, dash collision, valid spawns, discovery, monster pursuit, and the final boss timer. Worker equivalence and prior floor progression tests remain required.
