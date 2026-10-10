import assert from 'node:assert/strict';
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {EXPLORATIONS,explorationFloor} from './exploration-data.mjs';
import {dungeonWalkable,dungeonSight} from './exploration-dungeon.mjs';
const power={attack:1e8,hp:100000,defense:2000,crit:0,critDamage:1.5,boss:1,cadence:1,advancement:4,firstJob:true,level:200};
for(const theme of EXPLORATIONS.slice(0,3)){
 const w=startCoop({mode:'exploration',tier:theme.id,status:'waiting',id:'test',owner:'p',members:[{id:'p',classId:'warrior',name:'test',power,advanced:true,ready:true,left:false}]},0);
 w.entryWaiting=false;w.floor=theme.floors;explorationFloor(w);
 assert.ok(w.dungeon.arena);assert.equal(w.dungeon.arenaBounds.width,theme.id===0?2800:1400);
 assert.ok(dungeonWalkable(w.dungeon,w.dungeon.start.x,w.dungeon.start.y));assert.ok(dungeonWalkable(w.dungeon,w.exit.x,w.exit.y));
 const bounds=w.dungeon.arenaBounds;for(const [x,y] of [[.05,.05],[.95,.05],[.05,.95],[.95,.95],[.05,.5],[.5,.05]])assert.equal(dungeonWalkable(w.dungeon,bounds.x+x*bounds.width,bounds.y+y*bounds.height),false,'painted outer terrain blocked');
 assert.equal(new Set([...w.monsters,...w.hearts].map(m=>m.x+":"+m.y)).size,w.monsters.length+w.hearts.length,"unique floor spawns");
 for(const m of [...w.members,...w.monsters,...w.hearts])assert.ok(dungeonWalkable(w.dungeon,m.x,m.y),'spawn on actual floor');
 assert.ok(dungeonSight(w.dungeon,w.dungeon.start,w.exit));
 const boss=w.monsters.find(e=>e.boss);boss.x=1700;boss.y=1700;boss.hp=1;w.monsters=[boss];
 const me=w.members[0];me.x=1700;me.y=1770;
 const result=advanceCoopRaw(w,'p',null,100,[{user:'p',tick:0,input:[0,0,1]}]);
 assert.equal(result.status,'won');assert.deepEqual(result.chest,{x:1700,y:1700});assert.notDeepEqual(result.chest,result.exit);
 assert.equal(result.effects.length,0);assert.equal(result.hazards.length,0);
}
console.log('PASS painted terrain collision and doubled 10-floor arena for all three themes; chest at actual moved boss death position, immediate clean clear');
