import assert from 'node:assert/strict';
import {ADVANCEMENT_BOSSES} from './advancement.mjs';
import {startCoop,advanceCoop,predictCoopStep} from './coop-model.mjs?v=effective-defense-54';
import {newTowerBattle,towerStep} from './tower-model.mjs?v=effective-defense-54';
const power={attack:100,hp:1000000,defense:0,boss:1,crit:.2,critDamage:1.5,cadence:1,advancement:3,firstJob:true};
const member=(id,classId='warrior')=>({id,classId,power,advanced:true,left:false,ready:true});
for(const t of ADVANCEMENT_BOSSES)for(const cls of ['warrior','mage','archer','rogue','pirate']){
 let w=startCoop({id:'test',tier:t.stage,mode:'advancement',status:'waiting',members:[member('a',cls)]},0);
 const b=newTowerBattle(t.floor,cls,power,0,'test',1,true);Object.assign(b,{encounter:t,advancementStage:t.stage,enemyHp:t.hp});
 for(let i=0;i<1200&&!b.ended;i++){
  const input=[i%80<40?.3:-.3,0,i%100===0?63:1];
  towerStep(b,input);w=predictCoopStep(w,'a',input);
  assert.equal(w.hp,b.enemyHp,`${t.stage} ${cls} boss tick ${i}`);assert.equal(w.members[0].hp,b.hp,`${cls} HP tick ${i}`);
  assert.equal(w.members[0].x,b.player.x);assert.equal(w.enemy.x,b.enemy.x);assert.equal(w.phase,b.phase);
 }
 assert.equal(w.tick,b.tick);assert.equal(w.status,b.won?'won':'lost');
}
let w=startCoop({id:'pair',tier:0,mode:'advancement',status:'waiting',members:[member('a'),member('b')]},0);
assert.equal(w.maxHp,88000);assert.throws(()=>startCoop({...w,status:'waiting',members:[member('a'),member('b'),member('c')]},0),/INVALID_COOP_ROOM/);
let reference=structuredClone(w);
const frames=Array.from({length:10},(_,tick)=>({tick,input:[1,0,1]}));
for(let i=0;i<10;i++)reference=predictCoopStep(reference,'a',frames[i].input);
w=advanceCoop(w,'a',{frames:[]},1000);w=advanceCoop(w,'a',{frames},1000);
assert.equal(w.members[0].x,reference.members[0].x);assert.equal(w.hp,reference.hp);assert.equal(w.phase,reference.phase);
const solo=startCoop({id:'solo',tier:0,mode:'advancement',status:'waiting',members:[member('a')]},0);
const pair=startCoop({id:'pair',tier:0,mode:'advancement',status:'waiting',members:[member('a'),member('b')]},0);
for(const m of pair.members)Object.assign(m,{x:solo.members[0].x,y:solo.members[0].y});
let one=solo,two=pair;
for(let i=0;i<150;i++) {one=predictCoopStep(one,'a',[0,0,0]);two=predictCoopStep(two,'a',[0,0,0]);assert.equal(two.enemy.x,one.enemy.x);assert.equal(two.enemy.y,one.enemy.y);assert.equal(two.phase,one.phase);assert.equal(two.members[0].hp,one.members[0].hp);}
assert.equal(two.members[0].hp,two.members[1].hp);
console.log('PASS all four trials and five classes exactly match existing solo damage/patterns/timing; two members do not double boss movement, attacks or HP; delayed input replay matches prediction.');
