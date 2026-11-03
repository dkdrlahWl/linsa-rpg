// Client presentation only: preserve all combat, drop and progression values.
export function applyFieldArt({REGIONS,STAGES,MONSTERS}) {
  for (const stage of STAGES) stage.background=`field-art/field-${stage.id}-v1.webp`;
  for (const region of REGIONS) {
    const first=STAGES.find(stage=>stage.region===region.id);
    if(first) region.background=first.background;
  }
  for (const monster of MONSTERS) monster.art=`field-art/monster-${monster.id}-v1.webp`;
}
