// Runs the actual transport and session bridge with in-memory storage and RPCs.
// No real network, tokens, accounts or production data are accessed.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {initialState,balance} from '../supabase/functions/_shared/economy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const fixture=initialState(Date.now());
Object.assign(fixture,{autoBattle:false,sfxOn:false,bgmOn:false,playerUid:'QAONLY',playerName:'테스트',uid:20000});
fixture.inventory=Array.from({length:757},(_,i)=>({...balance.gear[i%balance.gear.length],id:10000+i,auctionUid:'qa-'+i,enhance:0,transcend:0,optionRolls:[1,1]}));
for(const x of fixture.inventory)fixture.discovered[x.slot+'|'+x.rarity+'|'+x.name]=true;
let checks=0;
function eq(a,b,m){assert.deepEqual(a,b,m);checks++;}
function truth(a,m){assert.ok(a,m);checks++;}
export function setup({pending=false,lost=false,replaced=false,abortSync=false,delaySync=false}={}){
 const records=new Map(),archives=new Map(),calls=[],listeners=new Map();
 const owner='QA_ONLY_ACCOUNT';let state=structuredClone(fixture),revision=10,syncCalls=0,firstLost=lost,releaseSync;
 class Storage {
  get length(){return records.size}key(i){return [...records.keys()][i]??null}
  getItem(k){return records.get(k)??null}setItem(k,v){records.set(String(k),String(v))}
  removeItem(k){records.delete(k)}clear(){records.clear()}
 }
 const storage=new Storage();
 const session={access_token:'NOT_REAL',refresh_token:'NOT_REAL',expires_at:Date.now()/1000+3600,user:{id:owner,user_metadata:{username:'qa'}}};
 storage.setItem('ringu.supabase.v1.qa.invalid',JSON.stringify(session));
 storage.setItem('ringu.session.v1.owner',owner);
 storage.setItem('swordEnhanceRPG_balance_20260617_v5',JSON.stringify(state));
 if(pending)storage.setItem('ringu.session.v1.account.'+owner+'.pending',JSON.stringify({accountId:owner,state,revision}));
 const events=[];
 class El{
  constructor(){this.children=[];this.style={};}append(...els){this.children.push(...els)}
  replaceChildren(){this.children=[]}remove(){}setAttribute(){}addEventListener(){}
  querySelector(){return null}querySelectorAll(){return []}focus(){}contains(){return false}
 }
 const document={body:new El(),head:new El(),createElement:()=>new El(),addEventListener(){},querySelector(){return null},getElementById(){return null},visibilityState:'visible'};
 const indexedDB={open(){const req={};setTimeout(()=>{
  req.result={createObjectStore(){},transaction(){const tx={objectStore:()=>({put:(v,k)=>archives.set(k,v)})};setTimeout(()=>tx.oncomplete?.(),0);return tx}};
  req.onsuccess?.();
 },0);return req;}};
 const receipts=new Map();
 async function fetch(url,init={}){
  assert.ok(url.startsWith('https://qa.invalid/'),'All requests use fake transport');
  const body=JSON.parse(init.body||'{}');calls.push({url,body,signal:!!init.signal});let result;
  if(init.signal?.aborted)throw new DOMException('Aborted','AbortError');
  if(url.includes('/ringu_account')){
   if(replaced)return new Response(JSON.stringify({message:'SESSION_REPLACED'}),{status:401});
   result=body.p_action==='ping'?{ok:true}:{account:{id:owner},revision,state:structuredClone(state),economyReady:true};
  }else if(url.includes('/functions/v1/ringu-economy')){
   syncCalls++;
   if(abortSync)return await new Promise((_,reject)=>init.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));
   if(receipts.has(body.requestId))result=receipts.get(body.requestId);
   else{revision++;state.serverClock=Date.now();result={state:structuredClone(state),revision,result:{events:[]}};receipts.set(body.requestId,result)}
   if(delaySync&&syncCalls>1)await new Promise(resolve=>{releaseSync=resolve;});
   if(firstLost){firstLost=false;throw new TypeError('Lost response after server committed');}
  }else if(url.includes('/ringu_admin_status'))result={currencyFloor:0};
  else if(url.includes('/ringu_save_preferences')){Object.assign(state,body.p_preferences);revision++;result={state:structuredClone(state),revision};}
  else if(url.includes('/ringu_claim_party'))result={state:structuredClone(state),revision,stoneAward:0};
  else throw Error('Unexpected fixture request '+url);
  return new Response(JSON.stringify(result),{status:200});
 }
 const window={Storage,localStorage:storage,document,indexedDB,console,crypto:webcrypto,Response,Headers,Request,URL,AbortController,DOMException,TypeError,structuredClone,Date,fetch,
  RinguCloudConfig:{url:'https://qa.invalid',publishableKey:'NOT_REAL',base:'/linsa-rpg/'},
  location:{href:'https://qa.local/linsa-rpg/',origin:'https://qa.local',hostname:'qa.local',replace(x){events.push(['redirect',x])},assign(x){events.push(['redirect',x])}},
  setTimeout:(fn,ms,...args)=>{const t=setTimeout(fn,ms,...args);t.unref();return t},clearTimeout,setInterval:()=>0,clearInterval(){},
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},
  addEventListener(type,fn){const a=listeners.get(type)||[];a.push(fn);listeners.set(type,a)},
  dispatchEvent(e){events.push(e);for(const fn of listeners.get(e.type)||[])fn(e)}
 };
 window.window=window;const ctx=vm.createContext(window);
 vm.runInContext(readFileSync(root+'cloud-adapter.js','utf8'),ctx);
 return {window,calls,records,archives,get releaseSync(){return releaseSync},get syncCalls(){return syncCalls},
  start(){vm.runInContext(readFileSync(root+'safety.js','utf8'),ctx);return window.RinguSession.ready}};
}
const plain=x=>JSON.parse(JSON.stringify(x));
for(const pending of [false,true]){
 const t=setup({pending});const result=await t.start();
 truth(t.window.RinguSession.active,'boot active');eq(result.state.inventory.length,757);
 eq(plain(result.state.inventory),fixture.inventory,'all attributes preserved');eq(t.syncCalls,1,'one initial sync');
 if(pending){truth(t.archives.size>=2,'existing and pending copies archived');eq(t.records.has('ringu.session.v1.account.QA_ONLY_ACCOUNT.pending'),false,'acknowledged preference save complete');}
}
{
 const t=setup();const first=await (await t.window.fetch('/api/session')).json();const second=await (await t.window.fetch('/api/session')).json();
 eq(first.revision,second.revision,'recheck must not mutate revision');eq(t.syncCalls,1);
 t.window.RinguCore={state:first.state};await t.window.fetch('/api/session');eq(t.syncCalls,1);
}
{
 const t=setup({lost:true});await assert.rejects(t.window.fetch('/api/session'),/Lost response/);checks++;
 const second=await (await t.window.fetch('/api/session')).json();const attempts=t.calls.filter(c=>c.url.includes('ringu-economy'));
 eq(attempts.length,2);eq(attempts[0].body.requestId,attempts[1].body.requestId,'same receipt retry');eq(second.revision,11,'no duplicate settlement');
}
{
 const t=setup();await Promise.all([t.window.fetch('/api/session'),t.window.fetch('/api/session')]);eq(t.syncCalls,1,'concurrent initialization shares one sync');
}
{
 const t=setup({abortSync:true});const ctrl=new AbortController();
 const request=t.window.fetch('/api/session',{signal:ctrl.signal});await new Promise(r=>setTimeout(r,10));ctrl.abort();
 await assert.rejects(request,e=>e.name==='AbortError');checks++;truth(t.calls.every(c=>c.signal),'abort reaches nested requests');
}
{
 const t=setup({replaced:true});const result=await t.window.fetch('/api/session');eq(result.status,401,'session replacement still blocks');eq(t.syncCalls,0);
}
console.log('PASS LOGIN REGRESSION',checks,'assertions; zero real network requests');
