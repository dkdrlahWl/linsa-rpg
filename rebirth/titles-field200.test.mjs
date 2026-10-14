import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {initialState,makeItem,settle} from './engine.mjs';
import {STAGES,fieldDropRates} from './data.mjs';
import {TITLES,newlyEarnedTitles} from './titles-data.mjs';
import fs from 'node:fs';
const ids=['lv220','lv230','kill100','fish10000','cube10000','star25set'];
for(const id of ids){assert(TITLES.some(t=>t.id===id));assert(fs.readFileSync(new URL(`./titles/${id}.svg`,import.meta.url),'utf8').includes('data:image/webp;base64,'));}
for(const stage of STAGES.filter(s=>s.level>=215)){
 assert.equal(stage.dropLevel,200);assert.equal(fieldDropRates(stage).equipment,.001);
 let seed=17;const ctx={now:0,uuid:randomUUID,random:()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;}};
 const s=initialState('warrior','드롭시험',ctx);Object.assign(s,{level:230,stage:stage.id,advancement:4,firstAdvancement:true,balanceVersion:'journey-20260925'});
 const weapon=makeItem(200,'warrior',0,false,ctx);weapon.baseStats={attack:1e9,stat:1e6,hp:1e9,defense:1e6};s.items=[weapon];s.equipped={0:weapon.id};ctx.now=43200000;settle(s,ctx);
 const loot=s.items.slice(1);assert(loot.length>0);assert(loot.every(i=>i.level===200&&!i.boss));
}
const s={level:230,huntKills:1000000,fishing:{totalCatch:10000},cubeUses:10000,items:Array.from({length:9},(_,i)=>({id:String(i),stars:25})),equipped:Object.fromEntries(Array.from({length:9},(_,i)=>[i,String(i)]))};
for(const id of ids)assert(newlyEarnedTitles(s,()=>0).includes(id));
for(const [id,state] of [['lv220',{level:219}],['lv230',{level:229}],['kill100',{huntKills:999999}],['fish10000',{fishing:{totalCatch:9999}}],['cube10000',{cubeUses:9999}],['star25set',{items:s.items,equipped:{0:'0'}}]])assert(!newlyEarnedTitles(state,()=>0).includes(id));
assert(!newlyEarnedTitles({...s,titles:Object.fromEntries(ids.map(id=>[id,1]))},()=>0).some(id=>ids.includes(id)));
console.log('PASS: 215+ ordinary 200 loot, exact .1% rates, six title boundaries, painted art and no duplicate awards');
