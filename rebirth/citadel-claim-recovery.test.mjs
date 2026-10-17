import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {abortable} from './request-lifecycle.mjs';
const app=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const storage=new Map(),packets=[];
const c=vm.createContext({AbortController,AbortSignal,DOMException,crypto,performance,queueMicrotask,abortable,decodeCoopReply:r=>r,
 stateRevision:null,busy:false,state:{coopRoom:'room',level:200,lastAt:0},session:{user:{id:'u'}},coopRoom:{id:'room',status:'fighting'},coopRooms:[],
 localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},pendingKey:()=> 'pending',
 document:{querySelectorAll:()=>[]},$:()=>({hidden:true}),D:{normalizePotentialState:s=>s},sounds:{play(){}},toast(){},message:e=>e.message,
 ensureToken:async()=>{},render(){},showEvents(){},fishingQuestsReady:()=>0,autoHuntPending:false,view:'game',rankingRevision:0,rankingUpdated:0,rankingLoading:false,
 lastHuntSettlement:0,lastBattleRequestAt:0,lastSync:0,connectionLost:false,retryAt:0,retryFailures:0,combatFrames:[],partyRoom:null,
 request:async(_,body)=>{packets.push(body);return {state:{coopRoom:'room',level:200,lastAt:0},coop:{id:'room',status:'fighting'},result:{events:[]}};},
});
vm.runInContext(app.slice(app.indexOf('const dungeonExitActions='),app.indexOf('async function loadArena(')),c);
const pending={command:'coopOpen',args:{protocol:2},requestId:crypto.randomUUID()};storage.set('pending',JSON.stringify(pending));
await vm.runInContext('command("coopInput",{frames:[]},true)',c);
assert.equal(packets.at(-1).command,'coopInput','movement cannot replay an unresolved reward');
assert.equal(JSON.parse(storage.get('pending')).requestId,pending.requestId,'movement preserves the durable reward request');
await vm.runInContext('command("coopOpen",{protocol:2},true)',c);
assert.equal(packets.at(-1).requestId,pending.requestId,'claim retry keeps its original idempotency ID');
assert.equal(storage.has('pending'),false);
let finishClaim;
c.request=async(_,body)=>body.command==='coopOpen'?new Promise(resolve=>{finishClaim=resolve;}):{state:{coopRoom:'room',level:200,lastAt:0,gold:100},revision:10,coop:{id:'room',revision:10,status:'fighting'},result:{events:[]}};
const delayed=vm.runInContext('command("coopOpen",{citadelClaim:true,protocol:2},true)',c);
for(let i=0;i<20&&!finishClaim;i++)await Promise.resolve();
assert.ok(finishClaim);assert.equal(vm.runInContext('busy',c),false,'claim cannot own the movement lock');
await vm.runInContext('command("coopInput",{frames:[]},true)',c);
assert.equal(c.state.gold,100);assert.ok(storage.has('pending_citadel_claim'),'movement preserves separate claim receipt');
finishClaim({state:{coopRoom:'room',level:200,lastAt:0,gold:999},revision:9,coop:{id:'room',revision:9,status:'fighting'},result:{events:[]}});
await delayed;
assert.equal(c.state.gold,100,'delayed claim cannot roll back newer personal state');
assert.equal(c.coopRoom.revision,10,'delayed claim cannot roll back the world');
assert.equal(storage.has('pending_citadel_claim'),false);
c.ensureToken=()=>new Promise(()=>{});c.AbortSignal={any:AbortSignal.any.bind(AbortSignal),timeout:()=>AbortSignal.timeout(15)};
const alive=setTimeout(()=>{},500);
try{await assert.rejects(vm.runInContext('command("coopOpen",{},true)',c),{name:'TimeoutError'});assert.equal(vm.runInContext('busy',c),false);}finally{clearTimeout(alive);}

const source=readFileSync(new URL('./coop-client.mjs',import.meta.url),'utf8');
const flush=vm.runInNewContext('(async function '+source.slice(source.indexOf('async flush(){')+6,source.indexOf('\n accept(room)'))+')',{
 document:{hidden:false},navigator:{onLine:true},performance,isCitadel:r=>r.mode==='citadel',coopInputInterval:()=>0,coopWireArgs:()=>({}),Math,
});
const room={id:'room',mode:'citadel',status:'fighting',tick:1,members:[{id:'u',hp:1,x:0,y:0,citadelChests:[1]}],me:'u'};
const controller={room,predicted:room,frames:[],pendingBits:0,input:()=>[0,0,0],inputAck:0,received:performance.now(),nextSend:0,
 send:async()=>{throw Error('network unavailable');}};
for(let i=0;i<4;i++){controller.nextSend=0;controller.citadelClaimRetry=0;await flush.call(controller);}
assert.equal(controller.citadelClaimed.size,0,'four failed claims must never become locally paid');
let sent;
controller.send=async command=>{sent=command;return {};};controller.nextSend=0;controller.citadelClaimRetry=performance.now()+30000;
await flush.call(controller);assert.equal(sent,'coopInput','movement continues during reward backoff');
controller.nextSend=0;controller.citadelClaimRetry=0;controller.send=async()=>({state:{citadelClaims:{room:'room',bosses:[1]}}});
await flush.call(controller);assert.equal(controller.citadelClaimed.has(1),true,'persisted claim confirms payment');
let movement=0;
controller.citadelClaimed.clear();controller.claimBusy=false;controller.nextSend=0;controller.citadelClaimRetry=0;
controller.send=command=>command==='coopOpen'?new Promise(()=>{}):Promise.resolve((movement++,{}));
await flush.call(controller);
assert.equal(movement,1,'world input completes even while reward transport never responds');
console.log('PASS separate claim lane, delayed state/world safety, lost claim receipt survives movement, same-ID retry, bounded token wait, no false paid flag, movement during retry backoff');
