import assert from 'node:assert/strict';
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {explorationFloor,collectExplorationHearts,EXPLORATIONS,explorationMonsterMultiplier} from './exploration-data.mjs';
import {dungeonWalkable} from './exploration-dungeon.mjs';
import {TOWER_CLASSES} from './tower-model.mjs';
const power={attack:1,hp:10000,defense:99999,boss:1,crit:0,critDamage:1,cadence:1,advancement:4,firstJob:true};
const create=(tier=0,count=1)=>{const w=startCoop({mode:'exploration',tier,status:'waiting',members:Array.from({length:count},(_,i)=>({id:'p'+i,classId:'warrior',power:structuredClone(power)}))},0);w.entryWaiting=false;return w;};
for(let tier=0;tier<3;tier++)for(let floor=1;floor<=EXPLORATIONS[tier].floors;floor++){
 const w=create(tier);w.floor=floor;explorationFloor(w);const final=floor===EXPLORATIONS[tier].floors,base=final?3:6+Math.min(4,Math.floor((floor-1)/3));assert.equal(w.monsters.filter(e=>!e.boss).length,base*explorationMonsterMultiplier(tier,floor));assert.equal(w.monsters.filter(e=>e.boss).length,final?1:0);
 assert.equal(new Set(w.monsters.map(e=>e.x+','+e.y)).size,w.monsters.length,'spawns do not overlap');for(const h of w.hearts)assert.ok(dungeonWalkable(w.dungeon,h.x,h.y));
}
const moving=create(),m=moving.members[0],x=m.x;advanceCoopRaw(moving,null,null,100,[{user:m.id,tick:0,input:[1,0,0]}],true);assert.equal(m.x-x,TOWER_CLASSES.warrior.speed*1.3);
const shared=create(0,4);shared.hearts=[{id:1,x:shared.members[0].x,y:shared.members[0].y}];for(const m of shared.members){m.x=shared.hearts[0].x;m.y=shared.hearts[0].y;m.hp=5000;}collectExplorationHearts(shared);assert.equal(shared.members.reduce((sum,m)=>sum+m.hp,0),21000);assert.equal(shared.hearts.length,0);collectExplorationHearts(shared);assert.equal(shared.members[0].hp,6000,'same heart cannot heal twice');
const cap=create();cap.members[0].hp=9800;cap.hearts=[{id:1,x:cap.members[0].x,y:cap.members[0].y}];collectExplorationHearts(cap);assert.equal(cap.members[0].hp,10000);assert.equal(cap.numbers.at(-1).value,200);
const full=create();full.hearts=[{id:1,x:full.members[0].x,y:full.members[0].y}];collectExplorationHearts(full);assert.equal(full.hearts.length,1,'full-health player leaves heart for teammates');full.members[0].hp=0;collectExplorationHearts(full);assert.equal(full.hearts.length,1,'heart does not revive');
let absent=0,present=0;for(let seed=0;seed<100;seed++){const w=create();w.started=seed;explorationFloor(w);if(w.hearts.length)present++;else absent++;}assert.ok(absent>10&&present>30,'hearts are occasional, not every floor');
console.log('PASS exploration pickups: exact 30% movement, 2×/3× residents, unique room spawns, sparse walkable hearts, 10% healing cap, single multiplayer claim, no full-health waste or revival');
