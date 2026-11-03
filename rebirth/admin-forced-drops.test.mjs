// node rebirth/admin-forced-drops.test.mjs — 2026-11-03 운영자 지정 드롭: 탐험 순서 큐 · 일일 보스 adminNextBossGear
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {grantExplorationChest} from './exploration-rewards.mjs';
import {EXPLORATIONS} from './exploration-data.mjs';
import {BOSSES} from './data.mjs';
let n=0;const ctx=(now=Date.UTC(2026,10,3,6),random=()=>.999)=>({now,random,uuid:()=>'f'+(++n)});

// 탐험: 7단계 다음 판 펜던트(8), 세 번째 판 장갑(4). 다른 단계 클리어는 순서를 건드리지 않는다.
{
 let s=initialState('rogue','큐시험',ctx());
 s.adminExplorationQueue=[{tier:7,skip:0,item:{level:200,classId:'rogue',slot:8}},{tier:7,skip:1,item:{level:200,classId:'rogue',slot:4}}];
 const room=tier=>({tier,status:'won',cleared:EXPLORATIONS[tier].floors,tick:600});
 const run=tier=>{const out=grantExplorationChest(s,room(tier),ctx());s=out.state;return out.reward.items;};
 assert.equal(run(6).length,0,'다른 단계는 무시');assert.equal(s.adminExplorationQueue.length,2);
 let items=run(7);assert.equal(items.length,1);assert.equal(items[0].slot,8);assert.equal(items[0].level,200);
 items=run(7);assert.equal(items.length,0,'두 번째 판은 평소 확률(이 테스트 random=.999 → 없음)');
 items=run(7);assert.equal(items.length,1);assert.equal(items[0].slot,4);assert.equal(items[0].level,200);
 assert.equal(s.adminExplorationQueue,undefined,'큐 소진 후 삭제');
 assert.equal(run(7).length,0);
}

// 일일 보스: after 전에는 평소대로, after 이후 첫 보상 처치에 지정 부위 확정.
{
 const boss=BOSSES.find(b=>b.name==='유리등 해마'),after=Date.UTC(2026,10,3,15);
 const win=(s,now)=>{s=execute(s,'boss',{id:boss.id},ctx(now)).state;s.battle.enemyHp=0;s.battle.won=true;return execute(s,'sync',{},ctx(now+1000));};
 let s=initialState('warrior','일보시험',ctx());s.adminNextBossGear={bossId:boss.id,after,slot:5};s.hunting=false;
 let r=win(structuredClone(s),after-3600e3);assert.ok(r.state.adminNextBossGear,'오늘은 아직 확정 안 함');
 r=win(structuredClone(s),after+3600e3);const st=r.state,reward=r.events.find(e=>e.type==='boss');
 assert.equal(st.adminNextBossGear,undefined);assert.ok(reward&&reward.items.length===1,JSON.stringify(reward));
 const it=st.items.find(i=>i.id===reward.items[0]);assert.equal(it.slot,5);assert.equal(it.level,200);assert.equal(it.boss,true);
}
console.log('PASS admin forced drops: exploration queue (7단계 1·3번째 판), daily boss after-time slot');
