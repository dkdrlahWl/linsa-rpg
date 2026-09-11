import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {balance,itemAttack,options} from '../supabase/functions/_shared/economy.mjs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const source=html.split('\n').filter(s=>/^(const RINGU_ITEM_BASE_LIMITS_RG1=|function (itemAttackText|optionText|optionName)\()/.test(s)).join('\n');
const context=vm.createContext({itemAtk:itemAttack,subOptions:options,fmt:n=>Number(n).toLocaleString('ko-KR')});vm.runInContext(source,context);
test('display bounds equal actual server catalogue across every rarity and slot',()=>{
 for(const slot of balance.slots)for(let rarity=0;rarity<=6;rarity++){
 const gear=balance.gear.filter(it=>it.slot===slot&&it.rarity===rarity);if(!gear.length)continue;
 for(const enhance of [0,6,15])for(const transcend of [0,3]){
 const attacks=gear.map(it=>itemAttack({...it,enhance,transcend}));
 const expected='('+Math.min(...attacks).toLocaleString('ko-KR')+'~'+Math.max(...attacks).toLocaleString('ko-KR')+')';
 for(const base of gear){const it={...base,enhance,transcend};assert.ok(context.itemAttackText(it).includes(expected));assert.ok(context.itemAttackText(it).startsWith(itemAttack(it).toLocaleString('ko-KR')+' '));}
 }
 }
});
test('option bounds include rounded random endpoints and fixed transcend bonuses',()=>{
 for(const base of balance.gear)for(const transcend of [0,3]){
 const it={...base,transcend,optionRolls:[1.12,1.12]},before=JSON.stringify(it),text=context.optionText(it);
 const low=options({...it,optionRolls:[.8,.8]}),high=options({...it,optionRolls:[1.2,1.2]});
 options(it).forEach(([key,value],i)=>{assert.ok(text.includes('+'+value+'%'));if(low[i][1]!==high[i][1])assert.ok(text.includes('('+low[i][1]+'%~'+high[i][1]+'%)'));});
 assert.equal(JSON.stringify(it),before);
 }
});
