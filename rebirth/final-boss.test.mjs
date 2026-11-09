import test from 'node:test';
import assert from 'node:assert/strict';
import {RAID_ENCOUNTERS,isFinalRaid,FINAL_RAID_MAX} from './raid-content.mjs';
import {startRaid,advanceRaidRaw} from './raid-model.mjs';
import {initialState,grantRaidChest} from './engine.mjs';

const power={hp:1e6,defense:1e4,attack:1e5,crit:.5,critDamage:2,boss:1,cadence:1};
const member=i=>({id:'u'+i,classId:'warrior',power,ready:true});

test('final bosses are raid tiers 4-6 with level gates 300/350/400', () => {
  assert.deepEqual(RAID_ENCOUNTERS.filter(r=>r.final).map(r=>[r.id,r.minLevel]),[[4,300],[5,350],[6,400]]);
  assert.equal(isFinalRaid(3),false);
  assert.equal(FINAL_RAID_MAX,7);
});

test('final boss rooms hold at most seven players', () => {
  assert.throws(()=>startRaid({status:'waiting',mode:'raid',tier:4,members:Array.from({length:8},(_,i)=>member(i))},0),/INVALID_COOP_ROOM/);
  assert.equal(startRaid({status:'waiting',mode:'raid',tier:4,members:Array.from({length:7},(_,i)=>member(i))},0).status,'fighting');
  assert.equal(startRaid({status:'waiting',mode:'raid',tier:3,members:Array.from({length:8},(_,i)=>member(i))},0).status,'fighting');
});

test('every final boss runs its patterns for the full five minutes', () => {
  for(const tier of [4,5,6]){
    let w=startRaid({status:'waiting',mode:'raid',tier,members:Array.from({length:7},(_,i)=>member(i))},0);
    w.hp=w.maxHp=1e15;const seen=new Set();
    for(let t=0;t<3000&&w.status==='fighting';t++){w=advanceRaidRaw(w,null,null,(t+1)*100,w.members.map(m=>({tick:t,user:m.id,input:[0,0,1]})));for(const m of w.members)m.hp=m.power.hp;if(w.announcement)seen.add(w.announcement);}
    assert.ok(seen.size>=4,`tier ${tier} announcements ${[...seen]}`);
  }
});

test('shared marker splits damage across everyone standing in it', () => {
  const run=stack=>{let w=startRaid({status:'waiting',mode:'raid',tier:5,members:Array.from({length:7},(_,i)=>member(i))},0);
    w.members.forEach((m,i)=>{m.x=stack||i===0?1600:600+i*300;m.y=stack||i===0?2600:600;});
    w.tick=10;w.started=0;w.nextBasic=w.nextPattern=w.nextCorruption=w.nextJudgment=1e9;
    w.hazards=[{type:'circle',x:1600,y:2600,r:330,inner:0,start:10,at:11,end:14,multiplier:1.2,share:7}];
    w=advanceRaidRaw(w,null,null,1200,[]);return w.members[0].power.hp-w.members[0].hp;};
  const together=run(true),alone=run(false);
  assert.equal(alone,power.hp,'alone soaker dies');assert.ok(together<power.hp*.6,`together ${together}`);
});

test('final boss chest records the clear without rewards or raid weekly usage', () => {
  const ctx={now:Date.UTC(2026,10,9),random:()=>0,uuid:()=>'id'};
  const s=initialState('warrior','최종테스트',ctx);s.coopRoom='room';
  const {state,reward}=grantRaidChest(s,5,ctx);
  assert.equal(reward.final,true);assert.equal(reward.gold,0);assert.deepEqual(reward.items,[]);
  assert.deepEqual(state.finalCleared,[5]);assert.equal(state.raidWeekly,undefined);assert.equal(state.gold,s.gold);
  assert.equal(state.coopRoom,undefined);
});
