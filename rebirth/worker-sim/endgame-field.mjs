import {journeyXP,levelHours} from './journey-balance.mjs?v=terrain-cubes-movement-202';
// Continue the final field's slope, then increase only these new fields by 50%.
export const ENDGAME_FIELD_VERSION = 'fallen-star-173';
const FIELD_MULTIPLIER = 1.5;
export const ENDGAME_FIELDS = [
  {level:195,name:'멸성의 관문',monster:'멸성 파수병',art:'monsters/fallen-star-sentinel.webp'},
  {level:200,name:'포식자의 균열',monster:'균열 포식수',art:'monsters/rift-devourer.webp'},
  {level:205,name:'종말의 분화구',monster:'종말의 거신',art:'monsters/apocalypse-colossus.webp'},
];
export function extendEndgameFields(regions,stages,monsters) {
  if (regions.some(r=>r.id===10)) return;
  const previous=stages.find(s=>s.id===29);
  const before=stages.find(s=>s.id===28);
  if (!previous||!before) throw new Error('ENDGAME_FIELD_BASE_REQUIRED');
  const levelGap=previous.level-before.level;
  const hpPerLevel=(previous.hp-before.hp)/levelGap,attackPerLevel=(previous.attack-before.attack)/levelGap;
  regions.push({id:10,name:'멸성의 황무지',level:195,background:'region-fallen-star.webp',stages:ENDGAME_FIELDS.map(s=>s.name)});
  for (const [index,field] of ENDGAME_FIELDS.entries()) {
    const id=30+index,levelDelta=field.level-previous.level;
    const baseHp=Math.round(previous.hp+hpPerLevel*levelDelta),baseAttack=Math.round(previous.attack+attackPerLevel*levelDelta);
    const baseXp=Math.max(1,Math.ceil((journeyXP(field.level)*8/(levelHours(field.level)*3600)+baseHp*.002)*1.6));
    const baseGold=Math.round((4+field.level*.3+baseHp*.001)*2);
    const hp=Math.round(baseHp*FIELD_MULTIPLIER),attack=Math.round(baseAttack*FIELD_MULTIPLIER);
    const xp=Math.round(baseXp*FIELD_MULTIPLIER),gold=Math.round(baseGold*FIELD_MULTIPLIER);
    stages.push({id,name:field.name,region:10,level:field.level,star:0,
      hp,attack,xp,gold,dropLevel:190,
      drops:{equipment:.0026,bossEquipment:0,cube:.0004,fragment:.006,scroll:0},
    });
    monsters.push({id:monsters.length,name:field.monster,stage:id,art:field.art});
  }
}
