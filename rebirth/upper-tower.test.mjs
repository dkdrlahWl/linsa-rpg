import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {TOWER_FLOORS,newTowerBattle,towerStep} from './tower-model.mjs';
import {UPPER_TOWER_FLOORS} from './upper-tower.mjs';
import {initialState,execute} from './engine.mjs';
import {towerLobby} from './tower-client.mjs';

const ctx={now:0,random:()=>.5,uuid:randomUUID};
const power={hp:1e10,attack:1,defense:0,boss:1,crit:0,critDamage:1.5,cadence:1};
assert.equal(TOWER_FLOORS.length,20);
assert.equal(new Set(TOWER_FLOORS.map(f=>f.art)).size,20,'every floor has distinct boss art');
assert.equal(new Set(UPPER_TOWER_FLOORS.map(f=>f.pattern)).size,10);
const signatures=[];
for(const f of UPPER_TOWER_FLOORS){
 assert.equal(f.level,200);
 assert.ok(f.hp>TOWER_FLOORS[f.floor-2].hp&&f.attack>TOWER_FLOORS[f.floor-2].attack);
 assert.ok(f.reward.gold>TOWER_FLOORS[f.floor-2].reward.gold);
 const initial=initialState('warrior','신규탑시험',ctx);
 const entry=execute(initial,'towerStart',{floor:f.floor},ctx).state;
 assert.equal(entry.battle.floor,f.floor,'new floors are enterable without a level gate');
 assert.throws(()=>execute(initial,'towerStart',{floor:21},ctx),/INVALID_TOWER_FLOOR/);
 for(const enraged of [false,true]){
  const a=newTowerBattle(f.floor,'warrior',power,0,'simulation',27),b=structuredClone(a);
  if(enraged)a.enemyHp=b.enemyHp=f.hp*.3;
  const fingerprints=new Set();let maxHazards=0,maxShots=0;
  for(let tick=0;tick<900;tick++){
   const input=[Math.sin(tick*.07),Math.cos(tick*.07),tick%35===0?4:0];
   towerStep(a,input);towerStep(b,input);
   if(a.tick===25){
    signatures.push(JSON.stringify({enraged,geometry:a.hazards.map(h=>[h.type,h.r,h.inner,h.width,h.at,h.end]),shots:a.projectiles.length}));
    assert.ok(a.hazards.every(h=>h.at-a.tick>=14),'strong attacks have at least 1.4 seconds of warning');
    assert.ok(a.projectiles.every(q=>q.at-a.tick>=14&&q.upperTower),'projectiles have explicit visible wind-up');
    if(enraged){const normal=newTowerBattle(f.floor,'warrior',power,0,'normal',27);for(let t=0;t<25;t++)towerStep(normal,[0,0,0]);assert.ok(a.nextPattern<normal.nextPattern,'enrage shortens the next attack interval');}
   }
   for(const h of a.hazards){assert.ok(Number.isFinite(h.at)&&h.end>h.at&&Number.isFinite(h.multiplier));if(h.at>a.tick)fingerprints.add(h.type+':'+h.r+':'+h.inner+':'+h.width);}
   for(const q of a.projectiles)assert.ok(Number.isFinite(q.dx)&&Number.isFinite(q.dy));
   maxHazards=Math.max(maxHazards,a.hazards.length);maxShots=Math.max(maxShots,a.projectiles.length);
  }
  assert.deepEqual(a,b,'serialized input replay is deterministic');
  assert.equal(a.tick,900);assert.ok(a.ended&&!a.won,'normal and enraged phases reach the 90-second timeout');
  assert.ok(fingerprints.size>=2,'boss uses multiple attack shapes');
  assert.ok(maxHazards<35&&maxShots<100,'hazards and projectiles stay bounded');
 }
 entry.battle.ended=true;entry.battle.won=true;entry.battle.tick=50;
 const before={gold:entry.gold,materials:structuredClone(entry.materials)};
 const result=execute(entry,'sync',{}, {...ctx,now:5000});
 assert.equal(result.state.gold-before.gold,f.reward.gold);
 for(const key of ['cube','highCube','primeCube'])assert.equal(result.state.materials[key]-(before.materials[key]||0),f.reward[key]||0);
 assert.ok(result.state.tower.cleared.includes(f.floor));
 let repeated=execute(result.state,'towerStart',{floor:f.floor},{...ctx,now:5000}).state;
 repeated.battle.ended=true;repeated.battle.won=true;repeated.battle.tick=40;
 const second=execute(repeated,'sync',{}, {...ctx,now:6000});
 assert.equal(second.state.gold,repeated.gold,'repeated clears grant no gold');
 assert.deepEqual(second.state.materials,repeated.materials,'repeated clears grant no cubes');
 const lost=execute(initial,'towerStart',{floor:f.floor},ctx).state;
 const failure=execute(lost,'towerLeave',{}, {...ctx,now:1000});
 assert.equal(failure.state.gold,lost.gold);assert.deepEqual(failure.state.materials,lost.materials);
}
assert.equal(signatures.length,20);
assert.equal(new Set(signatures.slice().filter((_,i)=>i%2===0)).size,10,'each boss opens with different attack geometry');
const lobby=towerLobby(initialState('warrior','목록시험',ctx));
assert.ok(lobby.includes('/ 20층 정복'));
assert.ok(lobby.includes('data-arg="20"'));
assert.ok(lobby.includes('프라임 큐브 2'));
assert.equal((lobby.match(/single-boss-art/g)||[]).length,10);
const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
assert.ok(app.includes('r.floor<TOWER_FLOORS.length'));
console.log('PASS: 20-floor entry, 10 unique bosses, 90-second normal/enraged replay, bounded attacks, first-only gold/cube/prime rewards, failures, retries and 20-floor UI.');
