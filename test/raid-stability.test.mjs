import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {startRaid,advanceRaidRaw} from '../rebirth/raid-model.mjs';
import {advanceCoop,coopClientView,predictCoopStep} from '../rebirth/coop-model.mjs';
import {CoopPredictionCore} from '../rebirth/coop-prediction-core.mjs';
import {raidDanger,raidBossSource,raidDamageRows} from '../rebirth/raid-presentation.mjs';
import {incomingDamage} from '../rebirth/journey-balance.mjs';
const classes=['priest','warrior','mage','archer','rogue','pirate','priest','warrior'];
export function room(tier=2,count=8){
 const members=classes.slice(0,count).map((classId,i)=>({id:'player-'+i,name:'테스트'+i,classId,advanced:true,advancement:3,power:{hp:1000000,attack:1000,defense:2000,crit:.4,critDamage:1.6,boss:1,cadence:1,level:150,firstJob:true,advancement:3,stats:Object.fromEntries(['STR','DEX','INT','LUK'].map(k=>[k,{base:500,growth:300,fixed:100,percent:81,total:1629}])),bonuses:{hp:100,attack:100,crit:35,boss:0},combatPower:100000}}));
 const w=startRaid({id:'fixture',mode:'raid',tier,status:'waiting',owner:members[0].id,members},0);
 for(const m of w.members){m.x=1400;m.y=1400;}return w;
}
const clean=w=>JSON.parse(JSON.stringify(w,(key,value)=>['_net','inputAck','pendingOutcome','me','revision','predictionBase','predictionInputs','protocol'].includes(key)?undefined:value));
for(let tier=0;tier<4;tier++){
 let w=room(tier);w.nextPattern=Infinity;w.nextCorruption=Infinity;w.nextJudgment=Infinity;
 advanceRaidRaw(w,null,null,1600);
 assert(w.hazards.some(h=>h.basic&&h.label==='평타'&&h.start===15&&h.at===25));
 w=room(tier);w.nextPattern=Infinity;w.nextBasic=Infinity;w.nextCorruption=Infinity;
 advanceRaidRaw(w,null,null,30100);
 assert.equal(raidDanger(w).kind,'judgment');assert(w.hazards.some(h=>h.warningOnly&&h.at===335));
 const hp=w.members[0].hp;
 advanceRaidRaw(w,null,null,33600);
 const {RAID_ENCOUNTERS}=await import('../rebirth/raid-content.mjs');
 assert.equal(w.members[0].hp,hp-Math.round(w.members[0].power.hp*(tier?.6:.3)+incomingDamage(RAID_ENCOUNTERS[tier].attack,2000)*2));
 w=room(tier);w.nextPattern=Infinity;w.nextBasic=Infinity;w.nextJudgment=Infinity;
 advanceRaidRaw(w,null,null,9100);assert.equal(raidDanger(w).kind,'corruption');
 assert(w.hazards.some(h=>h.warningOnly&&h.at===120));
}
// Eight players' late packets must rewind to the same canonical fight as
// receiving all eight inputs before each tick, with no duplicate skill damage.
let perfect=room(),queued=structuredClone(perfect);perfect.hp=queued.hp=1e9;perfect.maxHp=queued.maxHp=1e9;
for(let tick=0;tick<360;tick+=6){
 const frames=[];
 for(let n=0;n<6;n++)for(let i=0;i<8;i++)frames.push({user:'player-'+i,tick:tick+n,input:[0,0,1|2|8|16|32]});
 advanceRaidRaw(perfect,null,null,(tick+6)*100,frames);
 for(let i=0;i<8;i++)queued=advanceCoop(queued,'player-'+i,{frames:frames.filter(f=>f.user==='player-'+i).map(({user,...f})=>f)},(tick+6)*100);
 assert.deepEqual(clean(queued),clean(perfect));
}
assert(queued._net.points.every(p=>p.members.every(m=>!Object.hasOwn(m,'power'))));
queued.me='player-0';const view=coopClientView(queued,2);assert(view.members.every(m=>m.power));
const core=new CoopPredictionCore();core.reset({room:view,target:view.tick});
let expected=structuredClone(queued);delete expected._net;
for(let n=0;n<8;n++){
 expected=predictCoopStep(expected,'player-0',[0,0,33],true);
 const packet=core.step(view.tick+n,[0,0,33]);assert.deepEqual(clean(packet.world),clean(expected));
}
// Predicted victory and subsequent chest walking must agree with the server.
let victory=room(2,1);victory.hp=1;victory.members[0].classId='mage';victory.members[0].x=victory.enemy.x;victory.members[0].y=victory.enemy.y+180;
victory=advanceCoop(victory,'player-0',{frames:[{tick:0,input:[0,0,1]}]},100);
assert.equal(victory.status,'won');assert(victory.chest);
const x=victory.members[0].x;victory=advanceCoop(victory,'player-0',{input:[1,0,0]},600);assert(victory.members[0].x>x);
assert.equal(raidBossSource(2),'tower/raid-boss-2-portrait.webp');
const hits=Array.from({length:40},(_,id)=>({id,value:id+1,kind:'outgoing',start:id,end:50}));
const rows=raidDamageRows([...hits,{value:900,kind:'heal',end:50},{value:800,kind:'incoming',end:50}],40);
assert(rows.length<=8);assert.equal(rows.reduce((sum,n)=>sum+n.value,0),820);
// Every worker dependency must use the same formulas as the server graph.
const norm=s=>s.replace(/(\.mjs)\?v=[a-zA-Z0-9_-]+/g,'$1').trim();
for(const name of await readdir(new URL('../rebirth/worker-sim/',import.meta.url)))if(name.endsWith('.mjs')){
 assert.equal(norm(await readFile(new URL('../rebirth/worker-sim/'+name,import.meta.url),'utf8')),norm(await readFile(new URL('../rebirth/'+name,import.meta.url),'utf8')),name+' worker drift');
}
console.log('PASS four raid tiers: basic/burst/corruption warnings, exact burst damage, eight-player delayed input replay, compact history, worker parity, victory and chest movement.');
