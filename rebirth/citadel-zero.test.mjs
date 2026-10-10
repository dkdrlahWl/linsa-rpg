import assert from 'node:assert/strict';
import {startCoop,advanceCoop,advanceCoopRaw,coopClientView} from './coop-model.mjs';
import {CITADEL_STAGES,citadelStats,citadelDamageFactor,citadelBossTick,citadelAfterDamage,makeCitadelDungeon} from './citadel-zero.mjs';
import {explorationFloor,explorationProgress} from './exploration-data.mjs';
import {dungeonWalkable} from './exploration-dungeon.mjs';
const power={attack:49108,hp:67525,defense:1373,crit:.41,critDamage:1.6,boss:3.2,cadence:1,advancement:4,firstJob:true,level:200,combatPower:206123};
const create=(count=4)=>{const w=startCoop({mode:'exploration',tier:3,status:'waiting',owner:'p0',id:'citadel',members:Array.from({length:count},(_,i)=>({id:'p'+i,classId:['warrior','mage','archer','priest'][i],power:{...power},advanced:true,ready:true}))},123456);w.entryWaiting=false;return w;};
for(let floor=1;floor<=21;floor++)for(let n=1;n<=4;n++)for(const boss of [false,true]){const one=citadelStats(floor,1,boss),many=citadelStats(floor,n,boss);assert.equal(many.hp,one.hp*n);assert.equal(many.attack,one.attack);}
// Random maps must have a path from spawn to exit and every resident room.
for(let floor=1;floor<=21;floor++)for(let seed=1;seed<=20;seed++){
 const d=makeCitadelDungeon(floor,seed),seen=new Set(),queue=[[Math.floor(d.start.x/100),Math.floor(d.start.y/100)]];
 for(let head=0;head<queue.length;head++){const [x,y]=queue[head],key=x+','+y;if(seen.has(key))continue;seen.add(key);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])if(d.tiles[y+dy]?.[x+dx]&&d.tiles[y+dy][x+dx]!=='0'&&!seen.has((x+dx)+','+(y+dy)))queue.push([x+dx,y+dy]);}
 assert.ok(seen.has(Math.floor(d.exit.x/100)+','+Math.floor(d.exit.y/100)),`exit ${floor}/${seed}`);
 for(const r of d.rooms)assert.ok(seen.has(Math.floor(r.x+r.w/2)+','+Math.floor(r.y+r.h/2)),`room ${floor}/${seed}/${r.id}`);
}
const campaign=create();for(let f=1;f<=21;f++){
 assert.equal(campaign.floor,f);assert.equal(campaign.monsters.filter(e=>e.boss).length,{harbingers:2,serpents:3}[CITADEL_STAGES[f-1].boss]||(CITADEL_STAGES[f-1].boss?1:0));
 for(const e of campaign.monsters)assert.ok(dungeonWalkable(campaign.dungeon,e.x,e.y));
 if(CITADEL_STAGES[f-1].boss){assert.equal(campaign.exitOpen,false);campaign.monsters=[];}
 campaign.members[0].x=campaign.exit.x;campaign.members[0].y=campaign.exit.y;explorationProgress(campaign);
}assert.equal(campaign.status,'won');assert.equal(campaign.floor,21);
for(const f of [5,10,13,16,19,21]){const w=create();w.floor=f;explorationFloor(w);const boss=w.monsters.find(e=>e.boss);w.members[0].x=boss.x+300;w.members[0].y=boss.y;w.tick=100;citadelBossTick(w,boss,w.members);assert.ok(w.hazards.length);if(f===10){assert.equal(citadelDamageFactor(w,boss),0);const old=boss.hp;w.monsters.find(e=>e.channel).hp=0;citadelAfterDamage(w);assert.ok(boss.hp<old);}if(f===21)for(const fraction of [.9,.5,.1]){boss.hp=boss.maxHp*fraction;boss.skillReady=0;citadelBossTick(w,boss,w.members);assert.equal(boss.phase,Math.min(2,Math.floor((1-fraction)*3)));}}
// Stress all 21 stages with four independently moving clients and attack inputs.
const started=performance.now();let peakBytes=0;
for(let floor=1;floor<=21;floor++){
 let w=create();w.floor=floor;explorationFloor(w);for(const m of w.members){m.immune=1e9;m.power.attack=1;const e=w.monsters[0];m.x=e.x;m.y=e.y+180;}
 for(let tick=0;tick<300;tick++){const frames=w.members.map((m,i)=>({user:m.id,tick,input:[Math.sin(tick/30+i)*.2,Math.cos(tick/40+i)*.2,123]}));w=advanceCoopRaw(w,null,null,w.started+(tick+1)*100,frames,true);if(w.status!=='fighting')break;assert.ok(w.hazards.length<=120);assert.ok(w.effects.length<=100);assert.ok(w.numbers.length<=100);}
 peakBytes=Math.max(peakBytes,JSON.stringify(coopClientView({...w,me:'p0'},2)).length);assert.ok(w.tick>=299||w.floor>floor);
}
// Reordered inputs must converge for all four players in the larger dungeon.
let early=create(),late=create();const packets=Array.from({length:20},(_,tick)=>early.members.map((m,i)=>({user:m.id,tick,input:[.1*(i%2?1:-1),.1,1]}))).flat();
early=advanceCoop({...early,_queuedInputs:packets},'p0',{frames:[]},early.started+2000);
late=advanceCoop(late,'p0',{frames:[]},late.started+2000);late=advanceCoop({...late,_queuedInputs:packets},'p0',{frames:[]},late.started+2000);
assert.deepEqual(late.members.map(m=>[m.x,m.y,m.hp,m.damage]),early.members.map(m=>[m.x,m.y,m.hp,m.damage]));
console.log('PASS citadel: 420 connected maps, 21 stages, six encounters, HP-only 1–4×, four-player stress/reordered replay',{ms:Math.round(performance.now()-started),peakBytes});
