# Individual equipment catalog v3

Each of 5 classes, 21 equipment levels (1,10,...200), 9 slots and 2 origins (ordinary/boss) has 4-6 distinct catalog entries. Counts vary with level/class/slot/origin; each class-slot has 210 entries, 9,450 in total. A weapon slot includes a changing mixture of all three class weapon types, not 4-6 of each type.

Catalog keys include the design identity. Independent item identities survive trade, storage, restoration and collection. Existing equipment is retained with old identities. New equipment has four independently rolled, permanently stored base stats. Cube options remain separate. New gear cannot spend resources on the legacy quality reroll.

Within the selected class/level/slot/origin, ascending power weights are 60/28/11/1 for 4 entries, 50/28/15/6/1 for 5, and 44/26/16/9/4/1 for 6. The best named item is therefore 1% conditional on its group, not 1% per monster. Rolls within its own range prefer lower values; no generic quality or rarity tier controls the new stats.

Ordinary item ranges scale from .75-.91 at the weakest design to 2.25-2.41 for the strongest design in a six-item group. Boss ranges start at 2.8-2.96 and increase by .45 per design. All have individual absolute integer ranges derived from level and slot. Enhancement operates on the stored base roll. Existing boss gear receives stronger base scaling while retaining level, stars, quality and potential.

Crafting selects a slot, then level and design are randomized with the same weights. It does not permit selecting the rarest named weapon through a weapon-type filter. SQL party rewards use the same design and stat rules. Mail stacking includes all four base rolls, and recovery requires the same catalog identity.

Artwork: existing transparent equipment atlases and their cell bounds are reused, choosing distinct cells within each same-type group. Some designs at different levels reuse source illustrations. The generated draft sheets were not deployed because they did not fulfill the required transparent-background and exact-cell asset requirements. A wholly new unique illustration for each of 9,450 entries is NOT completed.

No test suites or visual verification were run at the user's request. Deployment status is checked only to report whether publishing succeeded.
