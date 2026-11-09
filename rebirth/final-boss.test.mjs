import test from 'node:test';
import assert from 'node:assert/strict';
import {RAID_ENCOUNTERS,isFinalRaid,FINAL_RAID_MAX} from './raid-content.mjs';
import {startRaid,advanceRaidRaw} from './raid-model.mjs';
import {initialState,grantRaidChest} from './engine.mjs';

const power={hp:1e6,defense:1e4,attack:1e5,crit:.5,critDamage:2,boss:1,cadence:1};
const member=i=>({id:'u'+i,classId:'warrior',power,ready:true});

test('final bosses are raid tiers 4-6 with displayed levels 300/350/400', () => {
  assert.deepEqual(RAID_ENCOUNTERS.filter(r=>r.final).map(r=>[r.id,r.level]),[[4,300],[5,350],[6,400]]);
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

test('final boss rewards are once per boss each Korean week', () => {
  let id=0;
  const ctx={now:Date.UTC(2026,10,8,14,59),random:()=>0,uuid:()=>String(++id)};
  const input=initialState('warrior','최종테스트',ctx);input.coopRoom='room';
  const luna=grantRaidChest(input,4,ctx);
  assert.deepEqual(luna.reward.items.map(i=>[i.level,i.boss]),[[250,true]]);
  assert.equal(luna.state.coopRoom,undefined);
  assert.equal(luna.state.titles.finalRaid4,ctx.now);
  const seraph=grantRaidChest(luna.state,5,ctx);
  assert.deepEqual(seraph.reward.items.map(i=>[i.level,i.boss]),[[300,true],[300,true]]);
  assert.equal(new Set(seraph.reward.items.map(i=>i.slot)).size,2);
  assert.equal(seraph.state.raidWeekly,undefined);
  assert.equal(seraph.state.gold,input.gold);
  const repeat=grantRaidChest(seraph.state,5,ctx);
  assert.equal(repeat.reward.practice,true);
  assert.equal(repeat.reward.titleId,undefined);
  assert.deepEqual(repeat.reward.items,[]);
  const nextWeek=grantRaidChest(repeat.state,5,{...ctx,now:ctx.now+60_000});
  assert.equal(nextWeek.reward.practice,false);
  assert.equal(nextWeek.reward.items.length,2);
});

test('the dragon grants a first-clear title and starts the ending without equipment', () => {
  const ctx={now:Date.UTC(2026,10,9),random:()=>0,uuid:()=>'id'};
  const input=initialState('warrior','최종테스트',ctx);
  const first=grantRaidChest(input,6,ctx);
  assert.equal(first.reward.ending,true);
  assert.equal(first.reward.titleId,'finalRaid6');
  assert.deepEqual(first.reward.items,[]);
  assert.deepEqual(first.state.finalCleared,[6]);
  const repeat=grantRaidChest(first.state,6,ctx);
  assert.equal(repeat.reward.ending,true);
  assert.equal(repeat.reward.practice,true);
});
