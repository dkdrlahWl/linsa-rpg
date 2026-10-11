import {journeyXP,levelHours} from './journey-balance.mjs?v=journey-250-20261011';
// Continue the final field's slope, then increase only these new fields by 50%.
export const ENDGAME_FIELD_VERSION = 'fallen-star-250-20261011';
const FIELD_MULTIPLIER = 1.5;
export const ENDGAME_FIELDS = [
  {level:195,name:'멸성의 관문',monster:'멸성 파수병',art:'monsters/fallen-star-sentinel.webp'},
  {level:200,name:'포식자의 균열',monster:'균열 포식수',art:'monsters/rift-devourer.webp'},
  {level:205,name:'종말의 분화구',monster:'종말의 거신',art:'monsters/apocalypse-colossus.webp'},
];
export const NEW_ENDGAME_REGIONS = [
  {id:11,name:'유성의 묘역',level:207,background:'region-meteor-grave.webp',stages:[
    {level:207,name:'별무덤의 추적로',monster:'운석 추적자',art:'monsters/meteor-tracker.webp'},
    {level:212,name:'충돌의 분지',monster:'운석 포식수',art:'monsters/meteor-maw.webp'},
    {level:215,name:'별무덤의 안뜰',monster:'묘역 수호거상',art:'monsters/graveward-colossus.webp'},
  ]},
  {id:12,name:'공허 관측소',level:217,background:'region-abyssal-observatory.webp',stages:[
    {level:217,name:'심연의 회랑',monster:'공허 순례자',art:'monsters/void-pilgrim.webp'},
    {level:220,name:'균열 포식지',monster:'균열 잠복수',art:'monsters/rift-stalker.webp'},
    {level:222,name:'종언의 관측실',monster:'심연의 별왕',art:'monsters/abyssal-star-king.webp'},
  ]},
];
export function extendEndgameFields(regions,stages,monsters) {
  if (regions.some(r=>r.id===11||r.id===12)) return;
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
  let priorStage=stages.find(s=>s.id===32);
  for(const region of NEW_ENDGAME_REGIONS){
    regions.push({id:region.id,name:region.name,level:region.level,background:region.background,stages:region.stages.map(s=>s.name)});
    for(const field of region.stages){
      const id=stages.length,delta=field.level-priorStage.level;
      const baseHp=Math.round(priorStage.hp*(1+delta/20)),baseAttack=Math.round(priorStage.attack*(1+delta/20));
      const hp=Math.round(baseHp*(1+delta*.04)),attack=Math.round(baseAttack*(1+delta*.025));
      const xp=Math.round(Math.max(1,Math.ceil((journeyXP(field.level)*8/(levelHours(field.level)*3600)+baseHp*.002)*1.6))*1.5);
      const gold=Math.round((4+field.level*.3+baseHp*.001)*3);
      stages.push({id,name:field.name,region:region.id,level:field.level,star:0,hp,attack,xp,gold,dropLevel:190,
        drops:{equipment:.0026,bossEquipment:0,cube:.0004,fragment:.006,scroll:0},
      });
      monsters.push({id:monsters.length,name:field.monster,stage:id,art:field.art});
      priorStage=stages.at(-1);
    }
  }
}
