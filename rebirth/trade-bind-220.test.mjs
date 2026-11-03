// node rebirth/trade-bind-220.test.mjs — 2026-11-03: 220제 이상은 강화 순간 거래 불가(bound), 200제 이하는 그대로
import assert from 'node:assert/strict';
import {initialState,execute,makeItem,addItem} from './engine.mjs';
import {rollBaseStats} from './data.mjs';
let n=0;const ctx=()=>({now:Date.UTC(2026,10,3,6),random:Math.random,uuid:()=>'b'+(++n)});
const mk=(lv,slot=2)=>{const it=makeItem(lv,'warrior',slot,true,ctx());it.baseStats=rollBaseStats(it,Math.random);return it;};
const fresh=()=>{const s=initialState('warrior','귀속',ctx());s.hunting=false;s.level=250;s.gold=1e12;s.materials={...s.materials,cube:50,highCube:50,primeCube:50,addCube:50,scroll:50,bonusFlame:50,transcendStone:50,rerollStone:50};return s;};
const find=(s,id)=>s.items.find(i=>i.id===id);
for(const [cmd,args,prep] of [['star',{},it=>{it.stars=0;}],['bonusRoll',{},()=>{}],['cube',{kind:'cube'},it=>{it.potentialUnlocked=true;it.grade=2;it.lines=[{key:'STR',grade:2,value:3},{key:'STR',grade:2,value:3},{key:'STR',grade:2,value:3}];}],['transcend',{},it=>{it.stars=25;}]]){
 for(const lv of [220,200]){
  let s=fresh();const it=mk(lv,cmd==='transcend'?0:2);prep(it);addItem(s,it);
  let r;try{r=execute(s,cmd,{id:it.id,...args},ctx());}catch(e){if(lv===200&&/TRANSCEND/.test(e.message))continue;throw new Error(cmd+' '+lv+': '+e.message);}
  assert.equal(!!find(r.state,it.id)?.bound,lv>=220,cmd+' '+lv);
 }
}
// 실패한 명령(조건 미달)은 귀속시키지 않는다
{let s=fresh();const it=mk(220,0);it.stars=10;addItem(s,it);assert.throws(()=>execute(s,'transcend',{id:it.id},ctx()));assert.equal(!!find(s,it.id).bound,false);}
console.log('PASS 220+ gear binds on enhancement; 200 stays tradeable');
