
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const auth=source.slice(source.indexOf('async function request('),source.indexOf('const icon ='));
const old=JSON.stringify({command:'cube',args:{id:'old-item',kind:'primeCube'},requestId:'old-request'});
for(const stale of [old,'{broken json','{"command":"sync","args":{},"requestId":"stale-sync"}']){
 for(const status of [200,503]){
  const saved=new Map([['pending',stale]]),sent=[];
  const ctx=vm.createContext({Date,JSON,Error,AbortSignal,queueMicrotask,crypto:{randomUUID:()=> 'new-sync-id'},
    config:{url:'https://example.invalid',publishableKey:'public'},fetch:async(url,options)=>{sent.push(JSON.parse(options.body));return {ok:status===200,status,headers:{get:()=>null},json:async()=>status===200?{state:{level:42},result:{events:[]}}:{error:'SERVER_RETRY_REQUIRED'}};},
    localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
    document:{querySelectorAll:()=>[]},D:{normalizePotentialState:s=>s},render(){},showEvents(){},toast(){},message:e=>e.message,unavailable(){},$:()=>null,pendingKey:()=> 'pending'});
  vm.runInContext('let session={access_token:"valid",refresh_token:"valid",expires_at:Date.now()/1000+3600},state=null,busy=false,view="game",connectionLost=false,retryFailures=0,retryAt=0,lastSync=0,rankingRevision=0,rankingUpdated=0,coopRoom=null,coopRooms=[],partyRoom=null,partyRooms=[],combatFrames=[];'+auth,ctx);
  if(status===200){await vm.runInContext('command("sync")',ctx);assert.equal(vm.runInContext('state.level',ctx),42);assert.equal(saved.has('pending'),false);assert.equal(saved.get('pending_recovered'),stale);}
  else{await assert.rejects(vm.runInContext('command("sync")',ctx));assert.equal(saved.get('pending'),stale);}
  assert.deepEqual(sent,[{command:'sync',args:{},requestId:'new-sync-id'}]);
  if(status===200){saved.set('pending',old);sent.length=0;await vm.runInContext('command("sync",{},false,true)',ctx);assert.equal(sent[0].command,'sync');}
 }
}
console.log('PASS: startup and reconnect bypass stale/corrupt requests; failed reads preserve pending; successful reads restore server state.');

