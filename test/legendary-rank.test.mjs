import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {balance,itemAttack,execute,initialState} from '../supabase/functions/_shared/economy.mjs';
import {gearWeights} from '../supabase/functions/_shared/gear-selection.mjs';
const lines=readFileSync(new URL('../index.html',import.meta.url),'utf8').split('\n');
const ctx={slots:balance.slots,fmt:String,itemIndex:it=>balance.gear.find(x=>x.slot===it.slot&&x.name===it.name)?.index||0,itemName:(slot,rarity,index)=>balance.gear.find(x=>x.slot===slot&&x.rarity===rarity&&x.index===index)?.name};
for(const prefix of ['function transcendEquipmentRate(','const RINGU_ITEM_BASE_LIMITS_RG1=','function enhanceMultiplier(','function enhancedBaseAtk(','fixedBaseAtk=function(slot,rarity,idx){rarity=Number(rarity)','itemAtk=function(it){if(!it)return 0;const idx=','function itemAttackText(','function rankSnapshotAttack('])vm.runInNewContext(lines.find(s=>s.startsWith(prefix)),ctx);
for(const rarity of [4,5])for(const slot of balance.slots)test('rank '+rarity+' '+slot+' rank, probability, stale gear, rendering and migration',()=>{
 const pool=balance.gear.filter(it=>it.rarity===rarity&&it.slot===slot).sort((a,b)=>globalThis.RinguGearSets.rank(b).rank-globalThis.RinguGearSets.rank(a).rank);
 assert.equal(pool.length,10);
 assert.deepEqual(gearWeights(pool,rarity),[10,9,8,7,6,5,4,3,2,1]);
 for(let i=0;i<10;i++){
  const base=pool[i];assert.equal(globalThis.RinguGearSets.rank(base).rank,10-i);
  if(i)assert.ok(base.baseAtk>pool[i-1].baseAtk);
  assert.equal(ctx.fixedBaseAtk(slot,rarity,base.index),base.baseAtk);
  for(const enhance of [0,1,10,11,15])for(const transcend of [0,1,2,3]){
   const stale={...base,baseAtk:123,enhance,transcend};
   assert.equal(ctx.itemAtk(stale),itemAttack(stale));
   assert.equal(ctx.itemAtk(stale),itemAttack({...base,enhance,transcend}));
   assert.equal(ctx.rankSnapshotAttack({s:slot,r:rarity,n:base.name,ba:123,e:enhance,t:transcend}),itemAttack(stale));
   assert.ok(ctx.itemAttackText(stale).startsWith(String(itemAttack(stale))+' '));
  }
 }
 const now=1800000000000,s=initialState(now);s.autoBattle=false;
 s.inventory=pool.map((it,i)=>({...it,id:i+1,auctionUid:'keep-'+i,baseAtk:123,enhance:15,transcend:2,locked:true,optionRolls:[.9,1.1],cubeVersion:1,cubeTier:1}));s.equipped={[slot]:1};
 const result=execute(s,'sync',{}, {now,random:()=>.5,itemIds:[],uuid:randomUUID});
 for(let i=0;i<10;i++){const before=s.inventory[i],after=result.state.inventory[i];assert.equal(after.baseAtk,pool[i].baseAtk);for(const key of ['id','auctionUid','enhance','transcend','locked','optionRolls'])assert.deepEqual(after[key],before[key]);}
 assert.equal(result.state.equipped[slot],1);
 assert.equal(result.state.remodelProfile.equipment[0].a,itemAttack({...pool[0],enhance:15,transcend:2}));
 const again=execute(result.state,'sync',{}, {now,random:()=>.5,itemIds:[],uuid:randomUUID});
 assert.deepEqual(again.state.inventory,result.state.inventory);
});
