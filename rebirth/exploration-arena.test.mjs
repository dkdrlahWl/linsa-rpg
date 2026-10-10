import assert from 'node:assert/strict';
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {EXPLORATIONS,explorationFloor} from './exploration-data.mjs';
import {dungeonWalkable,dungeonSight} from './exploration-dungeon.mjs';
const power={attack:1e8,hp:100000,defense:2000,crit:0,critDamage:1.5,boss:1,cadence:1,advancement:4,firstJob:true,level:200};
for(const theme of EXPLORATIONS){
 const w=startCoop({mode:'exploration',tier:theme.id,status:'waiting',id:'test',owner:'p',members:[{id:'p',classId:'warrior',name:'test',power,advanced:true,ready:true,left:false}]},0);
 w.entryWaiting=false;w.floor=theme.floors;explorationFloor(w);
 assert.ok(w.dungeon.arena);assert.equal(w.dungeon.tiles.flatMap(r=>[...r]).filter(c=>c!=='0').length,196);
 for(let y=950;y<=2250;y+=100)for(let x=950;x<=2250;x+=100)assert.ok(dungeonWalkable(w.dungeon,x,y));
 assert.ok(dungeonSight(w.dungeon,{x:950,y:950},{x:2250,y:2250}));
 const boss=w.monsters.find(e=>e.boss);boss.x=1700;boss.y=1700;boss.hp=1;w.monsters=[boss];
 const me=w.members[0];me.x=1700;me.y=1770;
 const result=advanceCoopRaw(w,'p',null,100,[{user:'p',tick:0,input:[0,0,1]}]);
 assert.equal(result.status,'won');assert.deepEqual(result.chest,{x:1700,y:1700});assert.notDeepEqual(result.chest,result.exit);
 assert.equal(result.effects.length,0);assert.equal(result.hazards.length,0);
}
console.log('PASS compact open final arenas for all three themes; chest at actual moved boss death position, immediate clean clear');
