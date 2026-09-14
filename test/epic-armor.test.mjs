import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {balance,itemAttack,execute,initialState} from '../supabase/functions/_shared/economy.mjs';
import {gearWeights} from '../supabase/functions/_shared/gear-selection.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const starts={투구:80,갑옷:83,바지:86,신발:89};
const ctx={itemIndex:it=>balance.gear.find(x=>x.name===it.name&&x.slot===it.slot)?.index||0,itemName:(slot,rarity,index)=>balance.gear.find(x=>x.slot===slot&&x.rarity===rarity&&x.index===index)?.name,fmt:n=>String(n),slots:balance.slots};
const lines=html.split('\n');
for(const prefix of ['const RINGU_ITEM_BASE_LIMITS_RG1=','function enhanceMultiplier(','function enhancedBaseAtk('])vm.runInNewContext(lines.find(x=>x.startsWith(prefix)),ctx);
vm.runInNewContext(lines.find(x=>x.startsWith('fixedBaseAtk=function(slot,rarity,idx){rarity=Number(rarity)')),ctx);
vm.runInNewContext(lines.find(x=>x.startsWith('itemAtk=function(it){if(!it)return 0;const idx=')),ctx);
vm.runInNewContext(lines.find(x=>x.startsWith('function itemAttackText(')),ctx);
for(const [slot,start] of Object.entries(starts))test('EA1 '+slot+' order, strengthened old gear, client/server and displayed range',()=>{
 const pool=balance.gear.filter(x=>x.slot===slot&&x.rarity===3).sort((a,b)=>a.index-b.index);
 assert.deepEqual(pool.map(x=>x.baseAtk),Array.from({length:10},(_,i)=>start+i*7));
 assert.deepEqual(gearWeights(pool,3),[10,9,8,7,6,5,4,3,2,1]);
 for(const it of pool)for(const enhance of [0,1,10,15]){
 const old={...it,baseAtk:62,enhance,transcend:0};assert.equal(ctx.itemAtk(old),itemAttack(old));
 const text=ctx.itemAttackText(old);assert.ok(text.includes('('+ctx.enhancedBaseAtk(start,enhance)+'~'+ctx.enhancedBaseAtk(start+63,enhance)+')'));
 }
 const now=1800000000000,s=initialState(now);s.autoBattle=false;s.inventory=pool.map((x,i)=>({...x,id:i+1,baseAtk:62,enhance:15,locked:true}));s.equipped={[slot]:1};
 const result=execute(s,'sync',{}, {now,random:()=>.5,itemIds:[],uuid:randomUUID});
 assert.deepEqual(result.state.inventory.map(x=>x.baseAtk),pool.map(x=>x.baseAtk));assert.ok(result.state.inventory.every(x=>x.enhance===15&&x.locked));assert.equal(result.state.equipped[slot],1);
});
