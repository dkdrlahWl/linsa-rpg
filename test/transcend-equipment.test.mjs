import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {balance,itemAttack,options,stats,initialState} from '../supabase/functions/_shared/economy.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8'),lines=html.split('\n');
const ctx=vm.createContext({itemIndex:()=>0,itemName:()=>undefined,fmt:String});
for(const prefix of ['function transcendEquipmentRate(','function enhanceMultiplier(','function enhancedBaseAtk(','function subOptions(','function optionName(','function optionText(','function rankSnapshotAttack('])vm.runInContext(lines.find(x=>x.startsWith(prefix)),ctx);
vm.runInContext(lines.find(x=>x.startsWith('itemAtk=function(it){if(!it)return 0;const idx=')),ctx);
const rateByRarity={4:[.6,.4],5:[.65,.4],6:[.8,.5]};
test('all eligible slots and saved transcend levels agree across server, client and ranking',()=>{
 for(const base of balance.gear.filter(x=>x.rarity>=4))for(const t of [0,1,2,3]){
 const it={...base,id:1,enhance:15,transcend:t,optionRolls:[1,1]},plain={...it,transcend:0};
 const rate=rateByRarity[it.rarity][it.slot==='무기'?0:1];
 assert.equal(itemAttack(it),Math.floor(itemAttack(plain)*(1+t*rate)));
 assert.equal(ctx.itemAtk(it),itemAttack(it));
 assert.equal(ctx.rankSnapshotAttack({s:it.slot,r:it.rarity,ba:it.baseAtk,e:15,t,a:999999}),itemAttack(it));
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.subOptions(it))),options(it));
 const s=initialState(1800000000000);s.inventory=[it];s.equipped={[it.slot]:1};
 const before=stats({...s,inventory:[plain]}),after=stats(s);
 assert.equal(after.atkPercent,before.atkPercent);
 assert.equal(after.equipmentAtk,itemAttack(it));
 if(t)assert.ok(ctx.optionText(it).includes('초월 장비 공격력 +'+t*Math.round(rate*100)+'%'));
 }
});
test('transcending a weapon does not multiply unrelated equipment',()=>{
 const weapon={...balance.gear.find(x=>x.rarity===4&&x.slot==='무기'),id:1,enhance:15,transcend:1};
 const armor={...balance.gear.find(x=>x.rarity===5&&x.slot==='갑옷'),id:2,enhance:15,transcend:0};
 const s={...initialState(1800000000000),inventory:[weapon,armor],equipped:{무기:1,갑옷:2}};
 const after=stats(s),before=stats({...s,inventory:[{...weapon,transcend:0},armor]});
 assert.equal(after.atkPercent,0);
 assert.equal(after.attack-before.attack,itemAttack(weapon)-itemAttack({...weapon,transcend:0}));
});
test('inline classic scripts compile',()=>{
 for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi))if(!/\bsrc=|type=["'](?:module|application\/)/.test(match[1]))new vm.Script(match[2]);
});
