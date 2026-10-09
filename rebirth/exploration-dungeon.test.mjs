import assert from 'node:assert/strict';
import {makeExplorationDungeon,dungeonTile,dungeonWalkable,dungeonMove,dungeonSight,dungeonRoute,revealDungeon} from './exploration-dungeon.mjs';
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {explorationFloor} from './exploration-data.mjs';
const power={attack:1,hp:1e9,defense:1e9,boss:1,crit:0,critDamage:1,cadence:1,advancement:4,firstJob:true,level:200};
const create=()=>{const w=startCoop({mode:'exploration',tier:0,status:'waiting',members:[{id:'a',classId:'mage',power,ready:true}]},0);w.entryWaiting=false;return w;};
const signatures=new Set();
for(let tier=0;tier<3;tier++)for(let floor=1;floor<=12;floor++)for(const seed of [1,174,90000]){
 const d=makeExplorationDungeon(tier,floor,seed);assert.deepEqual(d,makeExplorationDungeon(tier,floor,seed));signatures.add(d.tiles.join(''));
 const start=[Math.floor(d.start.x/100),Math.floor(d.start.y/100)],visited=new Set([start.join(',')]),queue=[start];
 for(let i=0;i<queue.length;i++){const [x,y]=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(d.tiles[ny]?.[nx]&&d.tiles[ny][nx]!=='0'&&!visited.has(key)){visited.add(key);queue.push([nx,ny]);}}}
 assert.equal(visited.size,d.tiles.join('').replace(/0/g,'').length,'every floor cell reachable');
 assert.ok(dungeonWalkable(d,d.exit.x,d.exit.y));
 const walker={...d.start};for(let tick=0;tick<1800&&Math.hypot(walker.x-d.exit.x,walker.y-d.exit.y)>30;tick++){
  const goal=dungeonRoute(d,walker,d.exit),distance=Math.max(1,Math.hypot(goal.x-walker.x,goal.y-walker.y));dungeonMove(d,walker,(goal.x-walker.x)/distance*Math.min(20,distance),(goal.y-walker.y)/distance*Math.min(20,distance));assert.ok(dungeonWalkable(d,walker.x,walker.y));
 }assert.ok(Math.hypot(walker.x-d.exit.x,walker.y-d.exit.y)<35,'AI can follow corridors to stairs');
 const blocked={...d.start};dungeonMove(d,blocked,4000,0);assert.ok(dungeonWalkable(d,blocked.x,blocked.y),'long dash cannot tunnel through walls');assert.ok(blocked.x<3100);
 assert.equal(dungeonSight(d,d.start,{x:10,y:10}),false);
}
assert.ok(signatures.size>50,'floor layouts vary');
const w=create();for(let floor=1;floor<=10;floor++){w.floor=floor;explorationFloor(w);for(const m of w.members)assert.ok(dungeonWalkable(w.dungeon,m.x,m.y));for(const m of w.monsters)assert.ok(dungeonWalkable(w.dungeon,m.x,m.y,26),'monster spawns inside room');}
const fog=create(),initial=fog.dungeon.seen.join('').replace(/0/g,'').length;assert.ok(initial>0&&initial<400);fog.members[0].x=fog.exit.x;fog.members[0].y=fog.exit.y;revealDungeon(fog);assert.ok(fog.dungeon.seen.join('').replace(/0/g,'').length>initial);
// A damaged monster remembers aggro and navigates around walls, without teleporting.
let chase=create();const enemy=chase.monsters[0];enemy.hp--;const initialDistance=Math.hypot(enemy.x-chase.members[0].x,enemy.y-chase.members[0].y);
for(let i=0;i<100;i++)chase=advanceCoopRaw(chase,null,null,(i+1)*100,[],true);
const pursued=chase.monsters.find(e=>e.id===enemy.id);assert.ok(dungeonWalkable(chase.dungeon,pursued.x,pursued.y,26));assert.ok(Math.hypot(pursued.x-chase.members[0].x,pursued.y-chase.members[0].y)<initialDistance);
const boss=create();boss.floor=10;explorationFloor(boss);assert.equal(boss.floorDeadline,1800);const king=boss.monsters.find(e=>e.boss);boss.members[0].x=king.x-180;boss.members[0].y=king.y;advanceCoopRaw(boss,null,null,100,[],true);assert.equal(boss.bossBattleAt,0);assert.equal(boss.floorDeadline,1200);
console.log('PASS dungeon: 108 layouts connected, wall/dash collision, corridor navigation, valid spawns, shared exploration fog, monster pursuit, boss combat clock');
