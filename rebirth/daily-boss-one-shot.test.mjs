import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {BOSSES,dayKey} from './data.mjs';

const ctx={now:Date.parse('2026-10-06T23:00:00+09:00'),random:()=>.8,uuid:()=>crypto.randomUUID()};
const controls=['skill','battlePotion','abandon'];
function start(classId='warrior'){
  const s=initialState(classId,'원콤검증',ctx);
  Object.assign(s,{level:200,firstAdvancement:true,advancement:4,hunting:false});
  return execute(s,'boss',{id:0},ctx).state;
}
function victory(result,before){
  const s=result.state;
  assert.equal(s.battle,null);
  assert.equal(s.lastReward.type,'boss');
  assert.equal(s.lastReward.won,true);
  assert.equal(s.gold,before.gold+BOSSES[0].gold);
  assert.equal(s.materials.cube,before.materials.cube+BOSSES[0].cubes);
  assert.equal(s.daily.boss,before.daily.boss+1);
  assert.equal(s.bossClaims[0],dayKey(ctx.now));
  assert.equal(result.events.filter(e=>e.type==='boss').length,1);
  return s;
}
function queuedControls(s,at){
  for(const command of controls){
    const result=execute(s,command,{slot:1},at);
    assert.deepEqual(result.state,s,'queued '+command+' must not change rewards or resources');
    assert.deepEqual(result.events,[]);
  }
  const ack=execute(s,'ack',{},at).state;
  for(const command of controls)assert.deepEqual(execute(ack,command,{slot:1},at).state,ack);
}

// A normal attack kills during the settlement preceding a queued combat action.
for(const command of ['sync',...controls]){
  const s=start();s.battle.power.attack=1e9;
  const at={...ctx,now:ctx.now+1000};
  const done=victory(execute(s,command,{slot:1},at),s);
  queuedControls(done,at);
  assert.throws(()=>execute(done,'boss',{id:0},at),/BOSS_LIMIT/);
}

// Zero normal-attack cadence isolates lethal damage from every class/skill slot.
for(const classId of ['warrior','mage','archer','rogue','pirate','priest']){
  for(const slot of [1,2,3,4,5]){
    const s=start(classId);
    Object.assign(s.battle.power,{attack:1e6,cadence:0,crit:0});s.battle.enemyHp=100;
    const cast=execute(s,'skill',{slot},ctx);
    const at={...ctx,now:ctx.now+2000};
    if(cast.state.battle){
      const done=victory(execute(cast.state,'skill',{slot:1},at),s);
      queuedControls(done,at);
    }else{
      const done=victory(cast,s); // Priest's immediate skills settle in the same response.
      queuedControls(done,ctx);
    }
  }
}

// Finished losses also commit and allow retry; active controls keep their rules.
for(const ending of ['death','timeout'])for(const command of controls){
  const s=start();
  if(ending==='death')s.battle.hp=0;else s.battle.tick=BOSSES[0].seconds;
  const result=execute(s,command,{slot:1},ctx);
  assert.equal(result.state.battle,null);assert.equal(result.state.lastReward.won,false);
  assert.equal(result.state.gold,s.gold);
  assert.ok(execute(result.state,'boss',{id:0},ctx).state.battle);
}
const active=execute(start(),'skill',{slot:1},ctx).state;
assert.throws(()=>execute(active,'skill',{slot:1},ctx),/SKILL_COOLDOWN/);
const healed=execute(start(),'battlePotion',{},ctx).state;
assert.equal(healed.battle.potions,1);
assert.throws(()=>execute(healed,'battlePotion',{},ctx),/SKILL_COOLDOWN/);
assert.equal(execute(start(),'abandon',{},ctx).state.battle,null);
console.log('PASS daily boss: normal/30 skill one-shots, immediate priest kills, queued controls, one reward, loss retries and active cooldowns');
