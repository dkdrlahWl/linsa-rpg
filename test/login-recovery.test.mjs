// Actual login form + transport, with entirely fake network/credentials/storage.
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const root=process.env.LI2_ROOT||fileURLToPath(new URL('../',import.meta.url));
let assertions=0;const ok=(x,m)=>{assert.ok(x,m);assertions++};const eq=(a,b,m)=>{assert.deepEqual(a,b,m);assertions++};
const delay=ms=>new Promise(r=>setTimeout(r,ms));
function setup(mode='ok',baseline=false){
 const store=new Map([['existing-game-save','DO_NOT_TOUCH']]),calls=[],redirects=[],events=[];
 const nodes=new Map();class El{constructor(){this.value='';this.dataset={};this.attrs={};this.handlers={};this.disabled=false;this.textContent='';}addEventListener(t,f){this.handlers[t]=f}setAttribute(k,v){this.attrs[k]=v}focus(){} }
 for(const id of ['auth-form','feedback','login-tab','register-tab','form-title','form-description','submit-label','confirm-field','password-confirm','password','username','submit-button'])nodes.set(id,new El());
 nodes.get('username').value='qa_only';nodes.get('password').value='NOT_A_REAL_PASSWORD';
 const document={getElementById:id=>nodes.get(id),querySelectorAll:q=>q==='.visibility'?[]:[nodes.get('login-tab'),nodes.get('register-tab'),nodes.get('submit-button')]};
 class Storage{getItem(k){return store.get(k)||null}setItem(k,v){store.set(k,String(v))}removeItem(k){store.delete(k)}}
 const native=async(url,init)=>{
  if(!url.startsWith('https://qa.invalid/'))throw Error('Unexpected network target');
  const body=JSON.parse(init.body||'{}');calls.push(url);
  let result,status=200;
  if(url.includes('/auth/v1/token')){
   if(mode==='authHang')return new Promise(()=>{});
   if(mode==='lateAuth')await delay(120);
   if(mode==='authBodyHang')return {ok:true,status:200,json:()=>new Promise(()=>{})};
   if(mode==='badPassword'){result={message:'Invalid login credentials'};status=401;}
   else result={access_token:'FAKE',expires_in:3600,user:{id:'QA_ONLY_ACCOUNT'}};
  }else if(url.includes('/rest/v1/rpc/ringu_account')){
   eq(body.p_action,'activate','server activation is still mandatory');
   if(mode==='accountHang')return new Promise(()=>{});
   if(mode==='lateAccount')await delay(120);
   if(mode==='sessionReplaced'){result={message:'SESSION_REPLACED'};status=401;}
   else result={account:{id:mode==='wrongAccount'?'OTHER':'QA_ONLY_ACCOUNT'},state:{inventory:Array(757).fill({id:1})},revision:1,economyReady:true};
  }else if(url.includes('/ringu_admin_status')){
   if(mode==='adminHang')return new Promise(()=>{});
   result={currencyFloor:0};
  }else throw Error('Unexpected fixture request: '+url);
  return new Response(JSON.stringify(result),{status});
 };
 const listeners=new Map();
 const window={document,Storage,localStorage:new Storage(),Response,Request,Headers,URL,AbortController,DOMException,Date,console,fetch:native,
  location:{href:'https://qa.local/linsa-rpg/login.html',origin:'https://qa.local',assign:url=>redirects.push(url)},
  RinguCloudConfig:{url:'https://qa.invalid',publishableKey:'FAKE',base:'/linsa-rpg/'},
  setTimeout:(fn,ms,...args)=>setTimeout(fn,ms===30000?70:ms,...args),clearTimeout,setInterval,clearInterval,
  CustomEvent:class{constructor(type,init){this.type=type;this.detail=init?.detail}},
  addEventListener(t,f){const a=listeners.get(t)||[];a.push(f);listeners.set(t,a)},
  dispatchEvent(e){events.push(e.detail?.stage);for(const fn of listeners.get(e.type)||[])fn(e)}
 };
 window.window=window;const context=vm.createContext(window);
 vm.runInContext(readFileSync(root+'/cloud-adapter.js','utf8'),context);
 vm.runInContext(readFileSync(root+'/auth-client.mjs','utf8'),context);
 return {nodes,store,calls,redirects,events,submit:()=>nodes.get('auth-form').handlers.submit({preventDefault(){}})};
}
for(const scenario of ['ok','adminHang']){
 const t=setup(scenario);await t.submit();eq(t.redirects.length,1,'login succeeds without optional admin lookup');
 eq(t.calls.length,2,'exactly two required requests');ok(!t.calls.some(x=>x.includes('admin')),'no optional login metadata');
 eq(t.events,['auth','account','complete']);eq(t.nodes.get('submit-button').disabled,false);eq(t.store.get('existing-game-save'),'DO_NOT_TOUCH');
}
for(const [scenario,code] of [['authHang','LI2-AUTH'],['accountHang','LI2-ACCOUNT'],['authBodyHang','LI2-AUTH']]){
 const t=setup(scenario);await t.submit();eq(t.redirects.length,0,'timeout never navigates');
 ok(t.nodes.get('feedback').textContent.includes(code),'phase-specific failure');eq(t.nodes.get('submit-button').disabled,false,'button unlocked despite ignored abort');
}
for(const scenario of ['badPassword','wrongAccount','sessionReplaced']){
 const t=setup(scenario);await t.submit();eq(t.redirects.length,0,'invalid login never navigates');eq(t.nodes.get('submit-button').disabled,false);ok(t.nodes.get('feedback').textContent.includes('LI2-'),'diagnostic error');
}
for(const scenario of ['lateAuth','lateAccount']){
 const t=setup(scenario);await t.submit();await delay(160);eq(t.redirects.length,0,'late responses cannot navigate');
 ok(!t.events.includes('complete'),'late responses cannot mark complete');eq(t.store.get('existing-game-save'),'DO_NOT_TOUCH');
 if(scenario==='lateAuth')eq([...t.store.keys()].filter(x=>x.startsWith('ringu.supabase')).length,0,'cancelled auth cannot persist a late token');
}
{
 const t=setup();await Promise.all([t.submit(),t.submit()]);eq(t.calls.length,2,'double submit one request sequence');eq(t.redirects.length,1);
}
console.log('PASS LI2',assertions,'assertions; all HTTP, accounts, credentials and storage were synthetic');
