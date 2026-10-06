import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {abortable} from './request-lifecycle.mjs';

const source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const commands=source.slice(source.indexOf('const dungeonExitActions='),source.indexOf('async function loadArena('));
const storage=new Map(),packets=[],deferred=[];
const context=vm.createContext({
  AbortController,AbortSignal,DOMException,crypto,performance,queueMicrotask,abortable,
  busy:false,state:{coopRoom:'room',gold:0,level:200,lastAt:0},session:{user:{id:'account'}},coopRoom:{id:'room',status:'fighting'},coopRooms:[],
  localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},pendingKey:()=> 'pending',
  document:{querySelectorAll:()=>[]},$:()=>({hidden:true}),D:{normalizePotentialState:s=>s},sounds:{play(){}},toast(){},message:e=>e.message,
  ensureToken:async()=>{},render(){},showEvents(){},autoHuntPending:false,view:'game',rankingRevision:0,rankingUpdated:0,rankingLoading:false,
  lastHuntSettlement:0,lastBattleRequestAt:0,lastSync:0,connectionLost:false,retryAt:0,retryFailures:0,combatFrames:[],partyRoom:null,
  request:async(_,body,__,signal)=>{
    packets.push(body);
    if(body.command==='coopInput')return abortable(new Promise(resolve=>deferred.push(resolve)),signal);
    return {state:{coopRoom:body.command==='coopSync'?'room':undefined,gold:42,level:200,lastAt:0},coop:body.command==='coopSync'?{id:'room',status:'fighting'}:null,result:{events:[]}};
  },
});
vm.runInContext(commands,context);
const stats=()=>vm.runInContext('({busy,active:!!activeCoopInput,waiters:commandIdleWaiters.length,pending:!!pendingDungeonExit})',context);
for(let round=0;round<100;round++){
  context.state={coopRoom:'room',gold:0,level:200,lastAt:0};context.coopRoom={id:'room',status:'fighting'};
  const input=vm.runInContext('command("coopInput",{frames:[]},true)',context);
  for(let i=0;i<20&&!deferred.length;i++)await Promise.resolve();
  assert.equal(deferred.length,1);
  assert.equal(stats().busy,true);
  const priority=round%3===0?vm.runInContext('exitDungeon("coopLeave")',context):vm.runInContext('command("'+(round%3===1?'coopOpen':'coopSync')+'")',context);
  await Promise.all([input,priority]);
  const current=context.state;
  deferred.shift()({state:{coopRoom:'old-room',gold:999},coop:{id:'old-room'}});
  await Promise.resolve();assert.equal(context.state,current,'late input cannot undo the latest action');
  assert.equal(stats().busy,false);assert.equal(stats().active,false);assert.equal(stats().waiters,0);assert.equal(stats().pending,false);
  assert.equal(context.connectionLost,false,'intentional cancellation is not a network failure');
}

// A screen change also releases the input slot while token refresh is hanging.
context.ensureToken=()=>new Promise(()=>{});context.stop=new AbortController();
const hung=vm.runInContext('command("coopInput",{frames:[]},true,false,stop.signal)',context);
await Promise.resolve();context.stop.abort();await hung;
assert.equal(stats().busy,false);assert.equal(stats().active,false);

// Response from a different account cannot be applied even if transport completes.
context.ensureToken=async()=>{};context.session={user:{id:'account'}};
const stale=vm.runInContext('command("coopInput",{frames:[]},true)',context);
for(let i=0;i<20&&!deferred.length;i++)await Promise.resolve();
assert.equal(deferred.length,1);context.session={user:{id:'new-account'}};
const stateBefore=context.state;deferred.shift()({state:{gold:999},coop:null});await stale;
assert.equal(context.state,stateBefore);
console.log('PASS 100 repeats: input preemption, chest/exit/speed priority, cancelled token refresh, late response/account safety and empty wait queues');
