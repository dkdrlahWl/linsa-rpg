import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {TITLE_BY_ID,newlyEarnedTitles} from './titles-data.mjs';
import {TITLE_BY_ID as SERVER} from './edge-dist/titles-data.mjs';
import {initialState,execute} from './engine.mjs';
import {titleArt,titleBadge} from './title-ui.mjs';

const id='citadelFinal',title=TITLE_BY_ID[id];
assert.equal(title.grade,'myth');
assert.equal(title.name,SERVER[id].name);
for(const records of [
 {},{citadelBossClear:[1,2,3,4,5]},
 {citadelEver:[1,2,3,4,5,7]},
 {citadelEver:[6,6,6,6,6,6]},
])assert.equal(title.check(records),false,'incomplete or invalid stage records cannot unlock');
for(const records of [
 {citadelBossClear:[1,2,3,4,5,6]},
 {citadelEver:[1,2,3,4,5,6]},
 {citadelEver:[1,2,3],citadelBossClear:[4,5],citadelClaims:{bosses:[6]}},
]){
 assert.equal(title.check(records),true);
 assert.equal(SERVER[id].check(records),true);
 const ctx={now:1800000000000,random:()=>.99,uuid:()=>crypto.randomUUID()};
 const state={...initialState('warrior','성채검수',ctx),...records,hunting:false};
 const awarded=execute(state,'titleSync',{},ctx);
 assert.equal(awarded.state.titles[id],ctx.now);
 assert.equal(awarded.events.filter(x=>x.type==='titleEarned'&&x.id===id).length,1);
 assert.equal(newlyEarnedTitles(awarded.state,()=>0).includes(id),false);
 const restored=JSON.parse(JSON.stringify(awarded.state));
 assert.equal(execute(restored,'titleEquip',{id},ctx).state.title,id);
}
const svg=readFileSync(new URL('./titles/'+id+'.svg',import.meta.url),'utf8');
for(const part of [title.name,'data:image/webp;base64,','data:font/ttf;base64,','<animate'])assert.ok(svg.includes(part));
assert.ok(titleArt(id).includes('citadel-final-20261106'));
assert.ok(titleBadge(id).includes(title.name));
console.log('PASS six-stage title: historical records, incomplete/duplicate protection, server parity, one-time grant, equip persistence, painted animated badge');
