// node rebirth/transcend.test.mjs — 2026-11-02 초월 · 220제 최하 등급 · 재련석 200제 전용 · 220 스타포스 비용 4배
import assert from 'node:assert/strict';
import {initialState,execute,makeItem,addItem} from './engine.mjs';
import {starCost,gearAttributes,gearStatRanges,rollBaseStats,bossTier,bossTierCount,rollBossTier,transcendCost,canTranscendTier} from './data.mjs';
import {rerollStoneAllowed} from './gear-refine.mjs';
// 2026-11-04: 초월 확률 도입 — 이 테스트는 비용·등급 흐름만 보므로 항상 성공(random=0)으로 고정. 확률·천장은 profession.test.mjs / transcend-odds 아래에서 검사.
let n=0;const ctx=(now=Date.UTC(2026,10,2,7),admin=false)=>({now,random:()=>0,uuid:()=>'t'+(++n),admin});
const s0=initialState('warrior','초월',ctx());s0.level=250;
const mk=(lv,slot,boss=true)=>{const it=makeItem(lv,'warrior',slot,boss,{...ctx(),random:Math.random});it.baseStats=rollBaseStats(it,Math.random);return it;};
const weapon=mk(220,0),armor=mk(220,2),old200=mk(200,0);
// 1) 220제는 얻을 때 무조건 가장 낮은 등급, 스탯은 그 등급 범위 안
for(let i=0;i<200;i++){assert.equal(rollBossTier({level:220,slot:i%9,boss:true},Math.random),0);}
for(const it of [weapon,armor]){assert.equal(bossTier(it),0);const r=gearStatRanges(it);for(const [k,v] of Object.entries(it.baseStats))assert.ok(v>=r[k].min&&v<=r[k].max,k);}
// 2) 재련석: 200제 보장만
assert.equal(rerollStoneAllowed(old200),true);assert.equal(rerollStoneAllowed(weapon),false);assert.equal(rerollStoneAllowed(mk(180,0,false)),false);
// 3) 220 스타포스 비용 4배, 별당 상승폭 증가
const c200=starCost({level:200,boss:true,stars:10}),c220=starCost({level:220,boss:true,stars:10});
assert.ok(c220/c200>4&&c220/c200<4.6,'220 cost ≈ 4x (+레벨 차이)');
const g=st=>gearAttributes({...weapon,stars:st}).attack;const r25=g(25)/g(0),r20=g(20)/g(0);assert.ok(r25>2.95&&r25<3.1,'25성 약 3.0배');assert.ok(r20<2,'20성까지 완만');
{const steps=[];for(let st=20;st<25;st++)steps.push(g(st+1)-g(st));const early=g(10)-g(9);assert.ok(steps.every((d,i)=>d>early*2&&(i===0||d>steps[i-1])),'21~25성 크게·점점 크게');}
// 4) 초월 흐름
let s=structuredClone(s0);s.materials.transcendStone=40;addItem(s,structuredClone(weapon));addItem(s,structuredClone(armor));
const wid=s.items.at(-2).id,aid=s.items.at(-1).id,W=()=>s.items.find(i=>i.id===wid),A=()=>s.items.find(i=>i.id===aid);
assert.throws(()=>execute(s,'transcend',{id:wid},ctx()),/TRANSCEND_STARS_REQUIRED/);
assert.throws(()=>execute(s,'statReroll',{id:wid},ctx()),/REROLL_STONE_200_ONLY/);
const costs=[];let stones=40;
for(let t=0;t<bossTierCount(W());t++){
 if(!canTranscendTier(W())){assert.throws(()=>{W().stars=25;execute(s,'transcend',{id:wid},ctx());},/TRANSCEND_UNAVAILABLE/);break;}
 W().bonusPct=7;s=execute(s,'sync',{},ctx()).state;W().stars=25;const linesBefore=JSON.stringify(W().lines);
 const r=execute(s,'transcend',{id:wid},ctx());s=r.state;const e=r.events.find(e=>e.type==='transcend');
 costs.push(e.cost);stones-=e.cost;assert.equal(s.materials.transcendStone,stones);
 assert.equal(bossTier(W()),t+1);assert.equal(W().stars,0);assert.equal(JSON.stringify(W().lines),linesBefore);assert.equal(W().bonusPct,7);
 const rg=gearStatRanges(W());for(const [k,v] of Object.entries(W().baseStats))assert.ok(v>=rg[k].min&&v<=rg[k].max,'new tier range '+k);
}
assert.deepEqual(costs,[2,4,6,8],'무기 초월석 2·4·6·8');assert.equal(bossTier(W()),4);
const acosts=[];for(;canTranscendTier(A());){A().stars=25;const r=execute(s,'transcend',{id:aid},ctx());s=r.state;acosts.push(r.events.find(e=>e.type==='transcend').cost);}
assert.deepEqual(acosts,[2,4],'방어구 초월석 2·4');assert.equal(bossTier(A()),2);
// 초월석 부족
let p=structuredClone(s0);p.materials.transcendStone=0;addItem(p,structuredClone(weapon));p.items.at(-1).stars=25;
assert.throws(()=>execute(p,'transcend',{id:p.items.at(-1).id},ctx()),/INSUFFICIENT_TRANSCENDSTONE/);
// 200제는 초월 대상 아님
let q=structuredClone(s0);addItem(q,structuredClone(old200));q.items.at(-1).stars=25;q.materials.transcendStone=5;
assert.throws(()=>execute(q,'transcend',{id:q.items.at(-1).id},ctx()),/TRANSCEND_UNAVAILABLE/);
console.log('transcend ok',{weaponCosts:costs,armorCosts:acosts,cost220vs200:(c220/c200).toFixed(2),growth20:(g(20)/g(0)).toFixed(2),growth25:(g(25)/g(0)).toFixed(2)});
