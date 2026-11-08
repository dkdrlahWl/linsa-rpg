import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {coopInputWire,deferCoopWrite,stampCoopWriter,COOP_WRITER_LEASE_MS} from './coop-transport-policy.mjs';
import {encodeCoopView} from './coop-wire.mjs';
const start=100000;
const room={id:'r',mode:'exploration',started:start,tick:0,status:'fighting',members:[]};
let writes=0;
for(let ms=0;ms<3000;ms+=80){if(!deferCoopWrite(room,start+ms,true)){writes++;room.tick=Math.floor(ms/100);}}
assert.ok(writes<=10&&writes>=8,'four participants coalesce to at most ten writes / 3 sec');
assert.equal(room.tick,27,'simulation catches up without dropping ticks');
for(const overrides of [{entryWaiting:true},{pendingOutcome:true},{status:'won'},{status:'lost'},{mode:'raid'}])assert.equal(deferCoopWrite({...room,...overrides},start+2800,true),false);
assert.equal(deferCoopWrite(room,start+2800,false),false);
// 2026-11-09: 저장자 임대 — 임대가 살아 있으면 저장자만 저장, 임대가 끝나거나 저장자가 나가면 누구나 저장, 2틱 미만이면 아무도 저장 안 함
{const r={...room,tick:10,members:['a','b','c','d'].map(id=>({id}))},t=start+1250;
 assert.equal(r.members.filter(m=>!deferCoopWrite(r,t,true,m.id)).map(m=>m.id).join(),'a,b,c,d','no lease: anyone may write');
 const leased=stampCoopWriter({...r},'b',t-500);
 assert.equal(r.members.filter(m=>!deferCoopWrite(leased,t,true,m.id)).map(m=>m.id).join(),'b','live lease: only the writer writes');
 assert.equal(r.members.filter(m=>!deferCoopWrite(leased,t-500+COOP_WRITER_LEASE_MS+1,true,m.id)).map(m=>m.id).join(),'a,b,c,d','expired lease: anyone writes');
 const gone={...leased,members:leased.members.map(m=>m.id==='b'?{...m,left:true}:m)};
 assert.equal(gone.members.filter(m=>!m.left&&!deferCoopWrite(gone,t,true,m.id)).map(m=>m.id).join(),'a,c,d','writer left: others write');
 assert.ok(r.members.every(m=>deferCoopWrite(leased,start+1050,true,m.id)),'under 2 ticks nobody writes');
 assert.ok(r.members.every(m=>!deferCoopWrite({...r,members:[{id:m.id}]},t,true,m.id)),'solo always writes');
 assert.equal(stampCoopWriter({mode:'citadel',status:'won'},'a',1).writer,undefined,'only fighting rooms get a lease');}
assert.equal(coopInputWire({wire:1}),null);
assert.deepEqual(coopInputWire({wire:2,cache:'x'.repeat(100),known:[[1,4],[7,6],[-1,2],['1',3],[8,9]]}),{wire:2,cache:'x'.repeat(64),known:[[1,4],[8,9]]});
const view={...room,dungeon:{id:'floor',walls:[1,2],seen:[0]},monsters:Array.from({length:20},(_,id)=>({id,name:'monster '+id,art:'boss-large-art',maxHp:1000,attack:200,hp:900,x:id,y:id}))};
const clients=await Promise.all([0,1,2,3].map(i=>import('./coop-wire.mjs?recovery-client='+i)));
let fullBytes=0,cachedBytes=0;
for(const client of clients){
 const full=encodeCoopView(view,coopInputWire(client.coopWireArgs()));client.decodeCoopReply(full);
 const compact=encodeCoopView(view,coopInputWire(client.coopWireArgs()));
 assert.equal(compact.monsters[0].name,undefined,'edge forwards known monster ids and actually strips cached statics');
 const decoded=client.decodeCoopReply(compact);assert.deepEqual(decoded.monsters,view.monsters);
 fullBytes+=JSON.stringify(full).length;cachedBytes+=JSON.stringify(compact).length;
 // Floor changes must send fresh terrain and statics to every participant.
 const next={...view,dungeon:{...view.dungeon,id:'floor-2'}};
 assert.deepEqual(client.decodeCoopReply(encodeCoopView(next,coopInputWire(client.coopWireArgs()))).dungeon,next.dungeon);
}
assert.ok(cachedBytes<fullBytes,'less data without losing monsters');
const source=readFileSync(new URL('./coop-client.mjs',import.meta.url),'utf8');
const method=source.slice(source.indexOf(' async flush(){'),source.indexOf('\n accept(room)'));
const context=vm.createContext({performance:{now:()=>10000},document:{hidden:false},navigator:{onLine:true},Math,isCitadel:()=>false,coopInputInterval:()=>320,coopWireArgs:()=>({wire:2,cache:''})});
const controller=vm.runInContext('({'+method+'})',context);
const member={id:'me',hp:100,inputAck:-1,x:0,y:0},world={id:'r',status:'fighting',mode:'exploration',me:'me',members:[member]};
let packet;
Object.assign(controller,{room:world,predicted:world,received:1000,frames:[{tick:3,input:[1,0,1]}],pendingBits:0,input:()=>[1,0,0],send:async(_,args)=>{packet=args;return {stateUnchanged:true};}});
await controller.flush();
assert.equal(packet.frames.length,0,'stale connection requests current snapshot instead of replaying stale inputs');
assert.equal(controller.needsResync,true,'missing/undecodable room is not counted as successful recovery');
assert.equal(controller.busy,false,'input loop always released');
controller.nextSend=0;controller.send=async()=>({coop:world});await controller.flush();
assert.equal(controller.needsResync,false,'confirmed room completes recovery');
assert.equal(controller.failures,0);
console.log('PASS exploration recovery: 4-client cache roundtrip and floor changes, coalesced writes, stale snapshot recovery, dropped snapshot retry, input release',{writes,fullBytes,cachedBytes});
