// Isolated SQL + real browser integration. No production requests or accounts.
import {createServer} from 'node:http';
import {readFile,readdir} from 'node:fs/promises';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {execute,initialState,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const db=new PGlite(),users=new Map(),tokens=new Map(),errors=[];
let queue=Promise.resolve(),dropCommand=null,dropped=0,delaySync=0;
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql','16-economy-differential-commit.sql','17-black-market.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
await db.exec('begin;\n'+await readFile(new URL('../supabase/18-auction-listing-limit.sql',import.meta.url),'utf8')+'\ncommit;');
await db.exec('begin;\n'+await readFile(new URL('../supabase/19-stone-hp-third.sql',import.meta.url),'utf8')+'\ncommit;');
for(const n of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort())if(/_black_market_(prices_bp[12]|consumables_bm3|refresh_bm4)\.sql$/.test(n))await db.exec('begin;'+await readFile(new URL('../supabase/migrations/'+n,import.meta.url),'utf8')+'commit;');
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
   seed.inventory=Array.from({length:9},(_,i)=>({...balance.gear[0],id:i+1,enhance:3,transcend:0,optionRolls:[.876,1.12],locked:false}));
   await db.query('update ringu_private.accounts set state=$1 where id=$2',[JSON.stringify(seed),entry.user.id]);
   await rpc('ringu_economy_enroll',{p_user:entry.user.id,p_session:entry.sid,p_initial:initialState(snap.now)});snap=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});
  }
  const computed=snap.receipt?{state:snap.state,events:snap.receipt.events}:execute(snap.state,body.command,body.args,{...snap,random:()=>.5,uuid:randomUUID});
  const result=await rpc('ringu_economy_commit',{p_user:entry.user.id,p_session:entry.sid,p_revision:snap.revision,p_request_id:body.requestId,p_fingerprint:{command:body.command,args:body.args},p_state:computed.state,p_result:{events:computed.events}});
  const fresh=await rpc('ringu_economy_snapshot');return {state:fresh.state,revision:fresh.revision,result:result.result,requestId:body.requestId};
 }
 assert.ok(['ringu_account','ringu_save_preferences','ringu_save_costume','ringu_costume','ringu_party','ringu_claim_party','ringu_ranking','ringu_auction','ringu_black_market'].includes(name),name);
 return rpc(name,body);
}
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(req.url.split('?')[0]);if(!path.startsWith('/linsa-rpg/')||path.includes('..'))throw Error();const file=path.slice(11)||'index.html';const data=await readFile(new URL('../'+file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'image/png');res.end(data);}catch{res.writeHead(404);res.end();}});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port+'/linsa-rpg/',browser=await chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE});
async function player(name){
 const password=randomUUID(); // Ephemeral fixture only; every Auth request is mocked below.
 const c=await browser.newContext({viewport:{width:1440,height:1000}});
 await c.route('https://ekgihnyojihpearcudtd.supabase.co/**',route=>{queue=queue.then(async()=>{try{const value=await service(route.request());if(dropCommand&&route.request().postDataJSON()?.command===dropCommand){dropCommand=null;dropped++;await route.abort('failed');return;}await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message,error:e.message})});}});return queue;});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'login.html',{waitUntil:'domcontentloaded'});await p.locator('#register-tab').click();await p.locator('#username').fill(name);await p.locator('#password').fill(password);await p.locator('#password-confirm').fill(password);await p.locator('#submit-button').click();try{await p.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);}catch(e){console.log('BOOT_DIAGNOSTIC',name,errors,await p.locator('body').innerText().then(s=>s.slice(-1400)));throw e;}return p;
}
async function run(p,command,args={}){await p.waitForFunction(()=>RinguSession.active&&!document.body.classList.contains('economy-pending'));return p.evaluate(async({command,args})=>RinguEconomy.command(command,args),{command,args});}

try{
 const a=await player('bm3fixture');await run(a,'auto',{enabled:false});
 const product=(resource,name)=>({kind:'consumable',resource,quantity:1,name});
 const items=[product('transcendStone','초월석'),product('downgradeProtect','하락방지권'),...([0,2,3].map(r=>({...balance.gear.find(g=>g.rarity===r),enhance:0,transcend:0,optionRolls:[.876,1.12]})))];
 const offers=items.map((item,slot)=>({slot,kind:slot<2?'consumable':'equipment',price:[18,8,3,10,15][slot],item}));
 const cycle=await rpc('ringu_black_market',{p_action:'status'});
 await db.query('update ringu_private.black_market_cycles set offers=$1,rates=$2 where id=$3',[JSON.stringify(offers),JSON.stringify([49.1,15,4.9,1,15,15]),cycle.rotation]);
 await a.setViewportSize({width:390,height:844});
 await a.locator('.rm-bottom-nav [data-target="menu"]').click();await a.locator('#blackMarketMenuButton').click();
 await a.waitForFunction(()=>document.querySelectorAll('#blackMarketItems [data-offer]').length===5);
 assert.match(await a.locator('.bm-footer').innerText(),/12시 · 18시 · 24시/);
 assert.equal(await a.evaluate(()=>RinguBlackMarket.version),'BM4');
 const get=()=>a.evaluate(()=>({essence:RinguCore.state.essence,stone:RinguCore.state.transcendStone,protect:RinguCore.state.downgradeProtect,inventory:JSON.stringify(RinguCore.state.inventory)}));
 const before=await get();
 assert.match(await a.locator('[data-offer="0"]').innerText(),/초월석 1개/);assert.match(await a.locator('[data-offer="1"]').innerText(),/하락방지권 1개/);
 assert.ok(!(await a.locator('[data-offer="0"]').innerText()).includes('공격력'));
 await a.locator('#blackMarketRates').click();
 const rates=await a.locator('#blackMarketRatesBody').innerText();for(const label of ['49.1%','15%','4.9%','1%','13~18','4~8'])assert.ok(rates.includes(label),label);
 await a.locator('#blackMarketRates').click();
 await a.locator('[data-bm-slot="0"]').click();
 await a.waitForFunction(()=>document.querySelector('#shopPurchaseConfirm')?.open);
 assert.equal(await a.locator('#shopPurchaseName').textContent(),'초월석 1개');assert.equal(await a.locator('#shopPurchasePrice').textContent(),'정수 18개');
 await a.locator('#shopPurchaseAccept').click();await a.waitForFunction(()=>!document.querySelector('#shopPurchaseConfirm')?.open);
 let after=await get();assert.equal(after.essence,before.essence-18);assert.equal(after.stone,before.stone+1);assert.equal(after.inventory,before.inventory);
 await a.locator('[data-bm-slot="1"]').click();await a.waitForFunction(()=>document.querySelector('#shopPurchaseConfirm')?.open);
 assert.equal(await a.locator('#shopPurchaseName').textContent(),'하락방지권 1개');await a.locator('#shopPurchaseAccept').click();await a.waitForFunction(()=>!document.querySelector('#shopPurchaseConfirm')?.open);
 after=await get();assert.equal(after.essence,before.essence-26);assert.equal(after.protect,before.protect+1);assert.equal(after.inventory,before.inventory);
 await a.waitForFunction(()=>document.querySelector('[data-bm-slot="0"]')?.disabled&&document.querySelector('[data-bm-slot="1"]')?.disabled);
 await a.locator('#blackMarketRetry').click();await a.waitForTimeout(350);assert.ok(await a.locator('[data-bm-slot="0"]').isDisabled());assert.equal((await get()).stone,after.stone);
 await a.locator('[data-bm-slot="4"]').click();await a.waitForFunction(()=>document.querySelector('#shopPurchaseConfirm')?.open);assert.equal(await a.locator('#shopPurchasePrice').textContent(),'정수 15개');await a.locator('#shopPurchaseAccept').click();await a.waitForFunction(()=>!document.querySelector('#shopPurchaseConfirm')?.open);
 assert.equal((await get()).essence,before.essence-41);assert.equal(JSON.parse((await get()).inventory).length,JSON.parse(before.inventory).length+1);
 const fs=await import('node:fs/promises');await fs.mkdir('test-output/BM3',{recursive:true});
 for(const width of [320,390,1440]){
  await a.setViewportSize({width,height:844});
  assert.ok(await a.locator('#blackMarketModal').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await a.screenshot({path:'test-output/BM3/black-market-'+width+'.png'});
 }
 await a.locator('#blackMarketClose').click();await a.reload({waitUntil:'domcontentloaded'});await a.waitForFunction(()=>RinguSession.active&&window.RinguBlackMarket);
 after=await get();assert.equal(after.stone,before.stone+1);assert.equal(after.protect,before.protect+1);assert.equal(after.essence,before.essence-41);
 assert.deepEqual(errors,[]);
 console.log('PASS BM3 browser: mobile consumable and equipment offers, six-category odds, real SQL debits/counter updates, confirmation, sold state, refresh/relogin persistence, three viewports, zero page errors. All Auth/SQL requests synthetic.');
}finally{await browser.close();server.close();await db.close();}
