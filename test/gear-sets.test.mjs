import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
import {balance,stats,initialState,itemAttack,options} from '../supabase/functions/_shared/economy.mjs';
const sets=globalThis.RinguGearSets;
const gear=(r,i,slot)=>({...balance.gear.find(x=>x.rarity===r&&x.index===i&&x.slot===slot),id:slot,enhance:0,transcend:0});
const stateOf=items=>({...initialState(1800000000000),inventory:items,equipped:Object.fromEntries(items.map(it=>[it.slot,it.id]))});
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');const getStats=html.split('\n').find(x=>x.startsWith('function getPlayerStats(){'));
for(const r of [3,4,5])for(let i=0;i<10;i++)test(`sets ${r}/${i}: full/partial/mixed and client-server combat stats`,()=>{
 const items=balance.slots.map(slot=>gear(r,i,slot)),s=stateOf(items),bonus=sets.definitions.find(d=>d.rarity===r&&d.index===i).bonus;
 const result=sets.fromState(s);assert.equal(result.atkPercent,bonus);assert.equal(result.critDamage,bonus);assert.equal(result.rows.filter(x=>x.active).length,2);
 const ctx={state:s,RinguGearSets:sets,itemAtk:itemAttack,subOptions:options,ownedAuraAttackBonus:()=>0};vm.runInNewContext(getStats,ctx);const client=ctx.getPlayerStats(),server=stats(s);for(const key of ['attack','equipmentAtk','atkPercent','critChance','critDamage'])assert.equal(client[key],server[key]);
 const missing=stateOf(items.filter(x=>x.slot!=='무기'));assert.equal(sets.fromState(missing).atkPercent,0);assert.equal(sets.fromState(missing).critDamage,bonus);
 const mixed=stateOf(items.map(x=>x.slot==='신발'?gear(r,(i+1)%10,'신발'):x));assert.equal(sets.fromState(mixed).atkPercent,0);
 const forged=stateOf(items.map(x=>x.slot==='무기'?{...x,name:'invalid',index:i}:x));assert.equal(sets.fromState(forged).atkPercent,0);
 const display=sets.html(items);assert.match(display,/5\/5/);assert.match(display,/2\/2/);assert.match(display,/활성/);assert.match(sets.html(missing.inventory),/4\/5/);
 const old=stateOf(items.map(x=>({...x,rarity:2})));assert.equal(sets.fromState(old).atkPercent,0);
});
test('independent armor and jewelry series; slot IDs cannot count twice',()=>{const items=balance.slots.map(slot=>gear(slot==='반지'||slot==='귀걸이'?5:4,slot==='반지'||slot==='귀걸이'?9:0,slot));const s=stateOf(items);assert.equal(sets.fromState(s).atkPercent,11);assert.equal(sets.fromState(s).critDamage,26);s.equipped.신발=s.equipped.무기;assert.equal(sets.fromState(s).atkPercent,0);});
test('series definitions match real catalogue without duplicates',()=>{assert.equal(sets.definitions.length,30);for(const d of sets.definitions){assert.equal(Object.keys(d.items).length,7);for(const [slot,name]of Object.entries(d.items))assert.ok(balance.gear.some(x=>x.slot===slot&&x.name===name&&x.rarity===d.rarity&&x.index===d.index));}});
test('all seven slots share Roman ranks, descending bonuses and summon weights',()=>{for(const r of [3,4,5]){const defs=sets.definitions.filter(d=>d.rarity===r).sort((a,b)=>a.rank-b.rank);assert.deepEqual(defs.map(d=>d.rank),[1,2,3,4,5,6,7,8,9,10]);for(const d of defs){for(const slot of balance.slots)assert.equal(sets.rank(gear(r,d.index,slot)).rank,d.rank);assert.equal(d.bonus,(r-2)*10+1-d.rank);}}});

test('legendary keeps the existing weapon Roman order for every slot',()=>{const weapons=balance.gear.filter(x=>x.rarity===4&&x.slot==='무기').sort((a,b)=>b.baseAtk-a.baseAtk);weapons.forEach((it,i)=>{for(const slot of balance.slots)assert.equal(sets.rank(gear(4,it.index,slot)).rank,i+1);});});
