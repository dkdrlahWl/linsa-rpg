// Isolated SQL + real browser integration. No production requests or accounts.
import {planBattle} from '../supabase/functions/_shared/daily-boss.mjs';
import {mkdir} from 'node:fs/promises';
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
let queue=Promise.resolve(),dropCommand=null,dropped=0,delaySync=0;
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
await db.exec("create schema extensions;create function extensions.gen_random_bytes(int) returns bytea language sql as $$select decode('00','hex')$$;");
await db.exec(await readFile(new URL('../supabase/16-economy-differential-commit.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20260911132759_daily_boss.sql',import.meta.url),'utf8'));
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
  if(body.command==='sync'&&delaySync)await new Promise(resolve=>setTimeout(resolve,delaySync));
  let snap=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});
  if(!snap.enrolled){
   // Fixture provision only. The production Edge initializer starts at zero.
   const seed=initialState(snap.now);seed.autoBattle=false;seed.gold=100000;seed.essence=100;seed.petStone=100;seed.playerUid=entry.user.id.slice(0,10);seed.playerName='독립 테스트';
   seed.inventory=[{...balance.gear[0],id:1,enhance:3,transcend:0,optionRolls:[.876,1.12],locked:false}];
   await db.query('update ringu_private.accounts set state=$1 where id=$2',[JSON.stringify(seed),entry.user.id]);
   await rpc('ringu_economy_enroll',{p_user:entry.user.id,p_session:entry.sid,p_initial:initialState(snap.now)});snap=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});
  }
  let dailyBoss=await rpc('ringu_daily_boss',{p_user:entry.user.id,p_session:entry.sid});
  snap=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});
  if(['dailyBossStart','dailyBossStatus','dailyBossAck'].includes(body.command)){
   if(body.command!=='dailyBossStatus')dailyBoss=await rpc('ringu_daily_boss',{p_user:entry.user.id,p_session:entry.sid,p_action:body.command==='dailyBossStart'?'start':'ack',p_request_id:body.command==='dailyBossStart'?body.requestId:body.args.id,p_revision:snap.revision,p_hits:body.command==='dailyBossStart'?planBattle(snap.state,0,()=>.5):null});
   const fresh=await rpc('ringu_economy_snapshot');return {state:fresh.state,revision:fresh.revision,result:{events:[],dailyBoss},requestId:body.requestId};
  }
  const computed=snap.receipt?{state:snap.state,events:snap.receipt.events}:execute(snap.state,body.command,body.args,{...snap,random:()=>.999999,randomInt:()=>0,uuid:randomUUID});
  const result=await rpc('ringu_economy_commit',{p_user:entry.user.id,p_session:entry.sid,p_revision:snap.revision,p_request_id:body.requestId,p_fingerprint:{command:body.command,args:body.args},p_state:computed.state,p_result:{events:computed.events}});
  const fresh=await rpc('ringu_economy_snapshot');return {state:fresh.state,revision:fresh.revision,result:{...result.result,dailyBoss},requestId:body.requestId};
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
 const a=await player('protectchoiceqa');await a.setViewportSize({width:390,height:844});await a.waitForFunction(()=>window.RinguDailyBoss);await a.waitForFunction(()=>RinguSession.active&&!document.body.classList.contains('economy-pending'));
 const entry=[...tokens.values()][0];await db.query("update ringu_private.accounts set state=jsonb_set(state,'{downgradeProtect}','3'),revision=revision+1 where id=$1",[entry.user.id]);await run(a,'sync');
 await a.evaluate(()=>RinguCore.fn.openEnhance(RinguCore.state.inventory[0].id));
 await a.locator('#protectToggle').click();assert.equal(await a.locator('#protectToggle').getAttribute('aria-pressed'),'true');
 // Press enhancement immediately, while the choice request may still be in flight.
 await a.evaluate(()=>{window.qaForge=RinguCore.fn.tryEnhance();});await a.evaluate(()=>window.qaForge);
 assert.deepEqual(await a.evaluate(()=>({enabled:RinguCore.state.useProtect,tickets:RinguCore.state.downgradeProtect,level:RinguCore.state.inventory[0].enhance})),{enabled:true,tickets:2,level:3});
 assert.match(await a.locator('#protectToggle').innerText(),/ON/);
 await a.locator('#protectToggle').click();assert.equal(await a.locator('#protectToggle').getAttribute('aria-pressed'),'false');await a.evaluate(()=>RinguCore.fn.tryEnhance());
 assert.deepEqual(await a.evaluate(()=>({enabled:RinguCore.state.useProtect,tickets:RinguCore.state.downgradeProtect,level:RinguCore.state.inventory[0].enhance})),{enabled:false,tickets:2,level:2});
 delaySync=800;await a.evaluate(()=>{window.qaSync=RinguEconomy.command('sync');});await a.waitForTimeout(30);
 await a.evaluate(()=>{toggleProtectUse();toggleProtectUse();toggleProtectUse();});assert.equal(await a.locator('#protectToggle').getAttribute('aria-pressed'),'true');await a.evaluate(()=>window.qaSync);delaySync=0;
 await a.waitForFunction(()=>RinguSession.active&&!document.body.classList.contains('economy-pending'));await a.evaluate(()=>RinguSession.flush());await a.reload();await a.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);assert.equal(await a.evaluate(()=>RinguCore.state.useProtect),true);
 // A max-enhanced item can still change the protection preference for later gear.
 await db.query("update ringu_private.accounts set state=jsonb_set(state,'{inventory,0,enhance}','15'),revision=revision+1 where id=$1",[entry.user.id]);await run(a,'sync');await a.evaluate(()=>RinguCore.fn.openEnhance(RinguCore.state.inventory[0].id));assert.equal(await a.locator('#enhanceBtn').isDisabled(),true);await a.locator('#protectToggle').click();await a.waitForFunction(()=>RinguSession.active&&!document.body.classList.contains('economy-pending'));assert.equal(await a.evaluate(()=>RinguCore.state.useProtect),false);
 assert.deepEqual(errors,[]);console.log('PASS actual protection button: immediate ON/OFF, click-then-forge queue, ON failure preserves level/uses one ticket, OFF failure drops level, rapid toggles during delayed sync, reload, +15 control.');
}finally{await browser.close();server.close();await db.close();}
