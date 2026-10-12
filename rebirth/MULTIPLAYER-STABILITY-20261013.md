# Multiplayer stall fixes — 2026-10-13

## Reproduced failures and changes

- Prediction starvation: with 250ms snapshots and 500ms worker completions, the old bridge discarded all 1,200 completions. It now displays completed work from the same room/floor/combat phase while coalescing queued resets. Explicit resyncs and phase/room changes still invalidate old work. The regression test applies all 1,200 completions and checks queue bounds and resync isolation.
- Reconciliation capped prediction at 20 ticks while sampling allowed 30. A delayed snapshot could rewind already sampled movement by nearly one second. Both now use the recoverable 30-tick lead.
- The input deadline previously started after token refresh. A never-resolving refresh could retain the global command slot indefinitely. A six-second deadline now covers the entire input request lifecycle; timeout releases the slot and enters normal retry handling. Priority chest/exit actions still cancel inputs immediately.
- Mobile canvas sizing ignored explicit multiplayer pixel ratios. It now honors the configured cap, and adaptive mode cannot increase resolution.
- Citadel terrain checked its time budget only after painting two full rows; decorations then ran in one uninterrupted pass. Painting now yields between tiles, trees, props and lights. Crown sprite caching is bounded to 512 entries. Art and gameplay rules remain the same.
- Updated stale regression fixtures to enter combat explicitly and provide current VM dependencies. Versioned every changed browser module through the import map.

## Validation

32 selected tests passed, zero failures:

```sh
node --test --test-concurrency=2 rebirth/coop-*.test.mjs rebirth/citadel-*.test.mjs rebirth/exploration-*.test.mjs rebirth/raid-latency.test.mjs rebirth/post-clear-movement.test.mjs rebirth/reconnect.test.mjs rebirth/trial-coop.test.mjs
```

- Eight players × 20 raids: 100 simulated combat minutes, 80,000 packet equivalents, delayed/duplicated/reordered input, bounded history.
- Four players × six exploration runs: 18 simulated minutes; four-player citadel runs: nine simulated minutes.
- Real Node module worker parity: six modes × six classes, remote actions, batched skills and recovery.
- Slow-worker storm: 2,400 snapshots, 2,400 queued inputs, 1,200 completions.
- 100 request preemption/exit/chest repetitions; hanging token refresh deadline; stale account responses; reconnect recovery.
- Incremental and monolithic terrain pixels AND decoration commands match across seven representative regions. A separate before/after CPU-only run compared exact base terrain pixels across all 21 regions. That isolated run measured maximum slices of 353ms before and 10ms after; these are not device FPS measurements or hard real-time guarantees. Concurrent test-process scheduling produced larger wall-clock slices.
- Local PGlite transport test verifies queued peer inputs, revision conflicts, atomic chest receipts and unchanged privileged ACLs.
- Syntax checks and git whitespace checks passed.

The archived `raid-v2.test.mjs` targets the removed `rebirth_party_action` combat API and is excluded from the current multiplayer gate. Its removal error is unrelated to this patch.

## Scope and limits

Production database was inspected read-only. Its cumulative RPC statistics contain occasional multi-second executions; these do not isolate their cause or prove current request latency. This patch changes browser code and tests, not database functions or authoritative combat rules. Stress traffic used local simulations and fixtures, not live player accounts.

Real mobile devices and a browser rendering engine were not exercised in this environment: the Chromium download failed. Canvas raster/GPU calls are mocked in the terrain regression test. Network outages can still exceed the finite prediction window; the patch does not claim zero latency under disconnection.
