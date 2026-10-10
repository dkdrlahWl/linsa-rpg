import assert from 'node:assert/strict';
import {dungeonWalkable,dungeonMove,dungeonSeen} from './exploration-dungeon.mjs';
import {makeCitadelDungeon} from './citadel-zero.mjs';
import {drawExplorationFog} from './exploration-renderer.mjs';
const visible=makeCitadelDungeon(1,123);assert.equal(dungeonSeen(visible,visible.exit.x,visible.exit.y),true);
drawExplorationFog(new Proxy({}, {get(){throw Error('Citadel must not paint exploration fog');}}),{dungeon:visible},null,1000,1000,{});
// A fast dash cannot tunnel through an intervening wall or leave a narrow road.
const road={cell:100,size:7,tiles:['0000000','0110110','0000000']};
for(const [dx,dy] of [[600,0],[600,600],[0,600],[-600,0],[0,-600]]){
 const actor={x:150,y:150};dungeonMove(road,actor,dx,dy);assert.ok(dungeonWalkable(road,actor.x,actor.y));assert.ok(actor.x>=130&&actor.x<270);assert.ok(actor.y>=130&&actor.y<170);
}
assert.equal(dungeonWalkable({cell:100,tiles:['111','101','111']},150,150,130),false,'body cannot cover a wall even when all corners are floor');
assert.equal(dungeonWalkable({cell:100,tiles:['xxx']},150,50),false,'unknown terrain is blocked');
assert.equal(dungeonWalkable(road,NaN,150),false);
// Walking, diagonal input and dash-sized moves remain on floor in every biome.
let moves=0;
for(let floor=1;floor<=21;floor++)for(let seed=1;seed<=5;seed++){
 const d=makeCitadelDungeon(floor,seed),actor={...d.start};assert.ok(dungeonWalkable(d,actor.x,actor.y));
 for(let n=0;n<180;n++){const angle=n*2.399963,step=n%3===0?900:46;dungeonMove(d,actor,Math.cos(angle)*step,Math.sin(angle)*step);assert.ok(dungeonWalkable(d,actor.x,actor.y),`${floor}/${seed}/${n}`);moves++;}
}
console.log('PASS citadel path-only walking/diagonal/dash, blocked edges and full-body collision:',moves,'moves across all 21 regions');
