import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {randomUUID} from 'node:crypto';
import {balance,itemAttack,execute,initialState} from '../supabase/functions/_shared/economy.mjs';
import {gearWeights} from '../supabase/functions/_shared/gear-selection.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const starts={투구:66,갑옷:62,바지:65,신발:68};
const ctx={itemIndex:it=>balance.gear.find(x=>x.name===it.name&&x.slot===it.slot)?.index||0,itemName:(slot,rarity,index)=>balance.gear.find(x=>x.slot===slot&&x.rarity===rarity&&x.index===index)?.name,fmt:n=>String(n),slots:balance.slots};
const lines=html.split('\n');
for(const prefix of ['const RINGU_ITEM_BASE_LIMITS_RG1=','function enhanceMultiplier(','function enhancedBaseAtk('])vm.runInNewContext(lines.find(x=>x.startsWith(prefix)),ctx);
vm.runInNewContext(lines.find(x=>x.startsWith('fixedBaseAtk=function(slot,rarity,idx){rarity=Number(rarity)')),ctx);
vm.runInNewContext(lines.find(x=>x.startsWith('itemAtk=function(it){if(!it)return 0;const idx=')),ctx);
vm.runInNewContext(lines.find(x=>x.startsWith('function itemAttackText(')),ctx);
for(const [slot,start] of Object.entries(starts))test('EA1 '+slot+' order, corrected existing gear, client/server and displayed range',()=>{
 const pool=balance.gear.filter(x=>x.slot===slot&&x.rarity===3).sort((a,b)=>a.index-b.index);
 assert.deepEqual(pool.map(x=>x.baseAtk),Array.from({length:10},(_,i)=>start+i*3));
 assert.deepEqual(gearWeights(pool,3),[10,9,8,7,6,5,4,3,2,1]);
 for(const otherSlot of ['무기','반지','귀걸이']){const other=balance.gear.filter(x=>x.rarity===3&&x.slot===otherSlot).sort((a,b)=>a.baseAtk-b.baseAtk);assert.deepEqual(gearWeights(pool,3),gearWeights(other,3));}
 assert.ok(pool.at(-1).baseAtk<Math.min(...balance.gear.filter(x=>x.rarity===4&&x.slot===slot).map(x=>x.baseAtk)));
 for(const it of pool)for(const enhance of [0,1,10,15]){
 const old={...it,baseAtk:62,enhance,transcend:0};assert.equal(ctx.itemAtk(old),itemAttack(old));
 const text=ctx.itemAttackText(old);assert.ok(text.includes('('+ctx.enhancedBaseAtk(start,enhance)+'~'+ctx.enhancedBaseAtk(start+27,enhance)+')'));
 }
 const now=1800000000000,s=initialState(now);s.autoBattle=false;s.inventory=pool.map((x,i)=>({...x,id:i+1,baseAtk:62,enhance:15,locked:true}));s.equipped={[slot]:1};
 const result=execute(s,'sync',{}, {now,random:()=>.5,itemIds:[],uuid:randomUUID});
 assert.deepEqual(result.state.inventory.map(x=>x.baseAtk),pool.map(x=>x.baseAtk));assert.ok(result.state.inventory.every(x=>x.enhance===15&&x.locked));assert.equal(result.state.equipped[slot],1);
});
for(const rarity of [3,4,5,6])test('weapon accessory parity '+rarity,()=>{
 const pool=balance.gear.filter(x=>x.rarity===rarity&&x.slot==='무기').sort((a,b)=>a.index-b.index);
 const accessories=slot=>balance.gear.filter(x=>x.rarity===rarity&&x.slot===slot).map(x=>x.baseAtk).sort((a,b)=>a-b);
 const rings=accessories('반지'),ears=accessories('귀걸이');
 pool.forEach((it,i)=>{const rank=Math.round(i*(rings.length-1)/(pool.length-1));assert.equal(it.baseAtk,rings[rank]+ears[rank]);if(i)assert.ok(it.baseAtk>pool[i-1].baseAtk);for(const enhance of [0,10,15]){const old={...it,baseAtk:999,enhance};assert.equal(ctx.itemAtk(old),itemAttack(old));assert.ok(ctx.itemAttackText(old).includes('('+ctx.enhancedBaseAtk(pool[0].baseAtk,enhance)+'~'+ctx.enhancedBaseAtk(pool.at(-1).baseAtk,enhance)+')'));}});
 const now=1800000000000,s=initialState(now);s.inventory=pool.map((it,i)=>({...it,id:i+1,baseAtk:999,enhance:10,locked:true}));s.equipped={무기:1};const result=execute(s,'sync',{}, {now,random:()=>.5,itemIds:[],uuid:randomUUID});assert.deepEqual(result.state.inventory.map(x=>x.baseAtk),pool.map(x=>x.baseAtk));assert.equal(result.state.equipped.무기,1);
});
