import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,makeItem,execute,huntingRate,settle} from './engine.mjs';
import {STAGES,REGIONS,MONSTERS,fieldMonster,fieldDropRates} from './data.mjs';

function context(seed=17,now=0) {
  return {now,uuid:randomUUID,random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}};
}
assert.equal(REGIONS.length,11);
assert.equal(STAGES.length,33);
assert.equal(MONSTERS.length,63);
for(let stage=0;stage<30;stage++)for(let kills=0;kills<4;kills++)
  assert.equal(fieldMonster(stage,kills).id,stage*2+kills%2,'existing two-monster rotation');

const expected=[{level:195,hp:270000,attack:10335,xp:1172,gold:728},{level:200,hp:300000,attack:11130,xp:1268,gold:792},{level:205,hp:330000,attack:11925,xp:1365,gold:857}];
for(const [index,values] of expected.entries()) {
  const id=30+index,stage=STAGES[id],ctx=context(100+index);
  for(const [key,value] of Object.entries(values))assert.equal(stage[key],value);
  assert.equal(stage.dropLevel,190);
  assert.equal(fieldDropRates(stage).bossEquipment,0);
  for(let kills=0;kills<7;kills++)assert.equal(fieldMonster(id,kills).stage,id,'one dedicated monster per new field');
  const newPlayer=initialState('warrior','새지역시험',ctx);
  assert.equal(execute(newPlayer,'stage',{id},ctx).state.stage,id,'recommended level never blocks entry');
  assert.throws(()=>execute(newPlayer,'stage',{id:33},ctx),/INVALID_STAGE/);
  const player=initialState('warrior','정산시험',ctx);
  Object.assign(player,{level:200,stage:id,advancement:4,firstAdvancement:true,balanceVersion:'journey-20260925'});
  const weapon=makeItem(190,'warrior',0,false,ctx);
  weapon.baseStats={attack:1e9,stat:1e6,hp:1e9,defense:1e6};
  player.items=[weapon];player.equipped={0:weapon.id};
  const online=structuredClone(player),rate=huntingRate(player),before=player.gold;
  ctx.now=21600000;
  const result=settle(player,ctx);
  assert.ok(rate.survives);
  assert.equal(result.kills,2700);
  assert.equal(result.gold,2700*stage.gold);
  assert.equal(result.xp,2700*stage.xp);
  assert.equal(player.gold-before,result.gold);
  const gear=player.items.slice(1);
  assert.ok(gear.length>0,'seeded six-hour ordinary equipment drops');
  assert.ok(gear.every(item=>item.level===190&&!item.boss),'only ordinary level-190 gear');
  assert.ok(player.materials.fragment>0,'new field material probability is consumed');
  const onlineCtx=context(100+index);
  for(let at=30000;at<=21600000;at+=30000){onlineCtx.now=at;settle(online,onlineCtx);}
  assert.equal(online.gold,player.gold,'online/offline rewards agree');
  assert.equal(online.huntKills,player.huntKills,'online/offline combat cadence agrees');
}
console.log('PASS: three new fields, entry validation, existing monster rotation, field-specific ordinary-190 loot and online/offline reward parity.');
