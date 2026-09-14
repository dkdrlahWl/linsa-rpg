// Isolated SQL + real browser integration. No production requests or accounts.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {execute,initialState,balance} from '../supabase/functions/_shared/economy.mjs';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const db=new PGlite(),users=new Map(),tokens=new Map(),errors=[];
const syncStarts=[];let queue=Promise.resolve(),dropCommand=null,dropped=0,delaySync=0;
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql','16-economy-differential-commit.sql','18-auction-listing-limit.sql','20-auction-sale-notifications.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
await db.exec('update ringu_private.auction_release set economy_ready=true,enabled=true');
async function rpc(name,body={}){const entries=Object.entries(body);return (await db.query('select public.'+name+'('+entries.map(([k],i)=>k+'=> $'+(i+1)).join(',')+') r',entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v))).rows[0].r;}
async function service(req){
 const path=new URL(req.url()).pathname,body=req.postDataJSON()||{};
 if(path==='/auth/v1/settings')return {mailer_autoconfirm:true};
 if(path==='/auth/v1/signup'||path==='/auth/v1/token'){
  let user=users.get(body.email);if(!user){user={id:randomUUID(),email:body.email,user_metadata:body.data};users.set(body.email,user);await db.query('insert into auth.users values($1)',[user.id]);}
  const sid=randomUUID(),token=randomUUID();await db.query('insert into auth.sessions values($1,$2,now())',[sid,user.id]);tokens.set(token,{user,sid});return {access_token:token,refresh_token:token,expires_at:Date.now()/1000+3600,user};
 }
 const entry=tokens.get(req.headers().authorization?.replace('Bearer ',''));if(!entry)throw Error('LOGIN_REQUIRED');
 await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[entry.user.id,entry.sid]);
 if(path==='/auth/v1/user')return entry.user;
 const name=path.split('/').at(-1);if(name==='ringu_admin_status')return {currencyFloor:0};
 if(name==='ringu-economy'){
  if(body.command==='sync')syncStarts.push(Date.now());
  if(body.command==='sync'&&delaySync)await new Promise(resolve=>setTimeout(resolve,delaySync));
  let snap=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});
  if(!snap.enrolled){
   // Fixture provision only. The production Edge initializer starts at zero.
   const seed=initialState(snap.now);seed.autoBattle=false;seed.gold=100000;seed.essence=100;seed.petStone=100;seed.playerUid=entry.user.id.slice(0,10);seed.playerName='독립 테스트';
   seed.inventory=[{...balance.gear[0],id:1,enhance:3,transcend:0,optionRolls:[.876,1.12],locked:false}];
   await db.query('update ringu_private.accounts set state=$1 where id=$2',[JSON.stringify(seed),entry.user.id]);
   await rpc('ringu_economy_enroll',{p_user:entry.user.id,p_session:entry.sid,p_initial:initialState(snap.now)});snap=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});
  }
  const computed=snap.receipt?{state:snap.state,events:snap.receipt.events}:execute(snap.state,body.command,body.args,{...snap,random:()=>.5,uuid:randomUUID});
  const result=await rpc('ringu_economy_commit',{p_user:entry.user.id,p_session:entry.sid,p_revision:snap.revision,p_request_id:body.requestId,p_fingerprint:{command:body.command,args:body.args},p_state:computed.state,p_result:{events:computed.events}});
  const fresh=await rpc('ringu_economy_snapshot');return {state:fresh.state,revision:fresh.revision,result:result.result,requestId:body.requestId};
 }
 assert.ok(['ringu_account','ringu_save_preferences','ringu_save_costume','ringu_costume','ringu_party','ringu_claim_party','ringu_ranking','ringu_auction'].includes(name),name);
 return rpc(name,body);
}
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(req.url.split('?')[0]);if(!path.startsWith('/linsa-rpg/')||path.includes('..'))throw Error();const file=path.slice(11)||'index.html';const data=await readFile(new URL('../'+file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'image/png');res.end(data);}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port+'/linsa-rpg/',browser=await chromium.launch({channel:'msedge',headless:true});
async function player(name){
 const password=randomUUID(); // Ephemeral fixture only; every Auth request is mocked below.
 const c=await browser.newContext({viewport:{width:1440,height:1000}});
 await c.route('https://ekgihnyojihpearcudtd.supabase.co/**',route=>{queue=queue.then(async()=>{try{const value=await service(route.request());if(dropCommand&&route.request().postDataJSON()?.command===dropCommand){dropCommand=null;dropped++;await route.abort('failed');return;}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,error:e.message})});}});return queue;});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'login.html');await p.locator('#register-tab').click();await p.locator('#username').fill(name);await p.locator('#password').fill(password);await p.locator('#password-confirm').fill(password);await p.locator('#submit-button').click();try{await p.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);}catch(e){console.log('BOOT_DIAGNOSTIC',name,errors,await p.locator('body').innerText().then(s=>s.slice(-1400)));throw e;}return p;
}
async function run(p,command,args={}){await p.waitForFunction(()=>RinguSession.active&&!document.body.classList.contains('economy-pending'));return p.evaluate(async({command,args})=>RinguEconomy.command(command,args),{command,args});}
try{
 const a=await player('renderPerf');
 const report=await a.evaluate(async()=>{
  await RinguArt.ready;
  const canvas=document.getElementById('combatCanvas');canvas.scrollIntoView({block:'center'});
  const proto=CanvasRenderingContext2D.prototype,original=proto.drawImage;
  let draws=0,heroDraws=0,ms=0;
  proto.drawImage=function(...args){const t=performance.now();try{return original.apply(this,args);}finally{if(this.canvas.id==='combatCanvas'){draws++;ms+=performance.now()-t;}if(this.canvas.id==='heroCanvas')heroDraws++;}};
  await new Promise(r=>setTimeout(r,250));draws=heroDraws=0;ms=0;
  await new Promise(r=>setTimeout(r,1500));const visible={draws,heroDraws,drawMs:ms};
  const spacer=document.createElement('div');spacer.style.height='4000px';document.body.append(spacer);window.scrollTo(0,document.body.scrollHeight);
  await new Promise(r=>setTimeout(r,250));draws=heroDraws=0;ms=0;
  await new Promise(r=>setTimeout(r,1000));const offscreen={draws,heroDraws,drawMs:ms};
  proto.drawImage=original;spacer.remove();return {visible,offscreen};
 });console.log('RENDER_BENCHMARK',JSON.stringify(report));
 {assert.ok(report.visible.draws>0);assert.equal(report.offscreen.draws,0);assert.equal(report.offscreen.heroDraws,0);}
 // Slow passive poll: click feedback appears before the pending network response.
 delaySync=800;await a.evaluate(()=>{window.waitingSync=RinguEconomy.command('sync');});await a.waitForTimeout(50);
 await a.evaluate(()=>{window.waitingClick=RinguEconomy.command('equipBest');});
 assert.equal(await a.evaluate(()=>document.body.classList.contains('economy-pending')),true);
 assert.ok(await a.evaluate(()=>window.waitingClick));delaySync=0;
 // Two confirmed hits must not collapse into a single animation.
 const hits=await a.evaluate(async()=>{
  const descriptor=Object.getOwnPropertyDescriptor(RinguCore,'state'),fixture=structuredClone(RinguCore.state);Object.defineProperty(RinguCore,'state',{configurable:true,get:()=>fixture,set:()=>{}});const attack=RinguCore.fn.attack;RinguCore.fn.attack=()=>{};RinguCore.state.autoBattle=true;const old=RinguRemodel.serverHit,damage=RinguCore.presentation.showDamage;const times=[],values=[];
  RinguRemodel.serverHit=()=>times.push(performance.now());RinguCore.presentation.showDamage=(n,c)=>values.push([n,c]);
  RinguEconomy.paint([{type:'hit',target:'field',damage:11,crit:false},{type:'hit',target:'field',damage:22,crit:true}]);
  await new Promise(r=>setTimeout(r,1700));RinguCore.state.autoBattle=false;RinguEconomy.paint();RinguRemodel.serverHit=old;RinguCore.presentation.showDamage=damage;RinguCore.fn.attack=attack;Object.defineProperty(RinguCore,'state',descriptor);
  return {gap:times[1]-times[0],values};
 });{assert.ok(hits.gap>=600);assert.deepEqual(hits.values,[[11,false],[22,true]]);}console.log('HIT_SPACING',hits);
 await run(a,'auto',{enabled:false});syncStarts.length=0;await a.waitForTimeout(6000);assert.ok(syncStarts.length<=2);console.log('IDLE_POLLS_IN_6S',syncStarts.length);
 await run(a,'auto',{enabled:true});delaySync=1200;syncStarts.length=0;await a.waitForTimeout(4800);const intervals=syncStarts.slice(1).map((t,i)=>t-syncStarts[i]);assert.ok(intervals.length>=2);assert.ok(intervals.every(ms=>ms<1800));console.log('SLOW_NETWORK_POLL_GAPS_MS',intervals);delaySync=0;await run(a,'auto',{enabled:false});
 assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();await db.close();}
