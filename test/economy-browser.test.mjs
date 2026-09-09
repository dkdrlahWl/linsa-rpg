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
let queue=Promise.resolve(),dropCommand=null,dropped=0,delaySync=0;
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await db.exec(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
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
 const a=await player('economyqaA'),b=await player('economyqaB');
 await run(a,'auto',{enabled:false});
 const legacySaveWrites=await a.evaluate(()=>{let count=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='swordEnhanceRPG_balance_20260617_v5')count++;return set.call(this,k,v);};try{RinguCore.fn.save();}finally{Storage.prototype.setItem=set;}return count;});assert.equal(legacySaveWrites,0);console.log('Authoritative save skips the legacy duplicate save path.');
 const performanceResult=await a.evaluate(()=>{
  const original=RinguCore.state.inventory;RinguCore.state.inventory=Array.from({length:2400},(_,i)=>({...original[0],id:100000+i}));
  RinguEconomy.paint();let rebuilds=0;const render=RinguCore.fn.renderAll;
  let start=performance.now();for(let i=0;i<3;i++)render();const fullMs=(performance.now()-start)/3;
  RinguCore.fn.renderAll=()=>{rebuilds++;return render();};start=performance.now();for(let i=0;i<20;i++)RinguEconomy.paint();const tickMs=(performance.now()-start)/20;
  RinguCore.fn.renderAll=render;const first=document.querySelector('[data-item-id="100000"]');RinguCore.state.inventory.push({...original[0],id:999999});RinguCore.fn.renderInventory();if(document.querySelector('[data-item-id="100000"]')!==first)throw Error('Unchanged card recreated');if(!document.querySelector('[data-item-id="999999"]'))throw Error('New card missing');RinguCore.state.inventory=original;RinguEconomy.paint();return {items:2400,fullMs,tickMs,rebuilds};
 });
 console.log('Combat render benchmark',performanceResult);assert.equal(performanceResult.rebuilds,0);
 const invalidation=await a.evaluate(async()=>{
  let inventoryRebuilds=0,globalScans=0;const f=RinguCore.fn,render=f.renderInventory,query=document.querySelectorAll.bind(document),oldStep=RinguCore.state.monsterUnlockStep;
  f.renderInventory=(...args)=>{inventoryRebuilds++;return render(...args);};document.querySelectorAll=function(selector){if(selector==='button,.panel-title')globalScans++;return query(selector);};
  RinguCore.state.monsterUnlockStep=(oldStep||0)+1;RinguEconomy.paint();RinguCore.state.monsterUnlockStep=oldStep;RinguEconomy.paint();
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  f.renderInventory=render;document.querySelectorAll=query;return {inventoryRebuilds,globalScans};
 });assert.deepEqual(invalidation,{inventoryRebuilds:0,globalScans:0});console.log('Metadata/observer regression',invalidation);
 // UI-only inventory fixture, never submitted as a trade or save.
 await a.evaluate(()=>{const descriptor=Object.getOwnPropertyDescriptor(RinguCore,'state'),fixture=Array.from({length:41},(_,i)=>({...RinguCore.state.inventory[0],id:200000+i,name:'페이지 검사 '+i}));window.qaStateDescriptor=descriptor;Object.defineProperty(RinguCore,'state',{...descriptor,get:()=>({...descriptor.get(),inventory:fixture})});});
 await a.getByRole('button',{name:'⚖️ 경매장',exact:true}).click();await a.locator('[data-tab="list"]').click();try{await a.waitForFunction(()=>document.querySelectorAll('#auctionBody [data-row]').length===20);}catch(e){console.log('AUCTION_UI_DIAGNOSTIC',await a.locator('#ringuAuction').innerText(),await a.evaluate(()=>({count:RinguCore.state.inventory.length,errors:window.RinguAuctionMessages})));throw e;}
 await a.locator('#auctionBody [data-page="1"]').click();await a.waitForFunction(()=>document.querySelector('#auctionBody [data-row="0"] strong')?.textContent==='페이지 검사 20');
 await a.locator('#auctionBody [data-page="1"]').click();await a.waitForFunction(()=>document.querySelectorAll('#auctionBody [data-row]').length===1);await a.locator('#auctionBody [data-row="0"]').click();assert.equal(await a.locator('#auctionDetail strong').innerText(),'페이지 검사 40');await a.locator('#auctionClose').click();
 await a.evaluate(()=>{Object.defineProperty(RinguCore,'state',window.qaStateDescriptor);delete window.qaStateDescriptor;});console.log('Auction listing pagination passed: 20 / 20 / 1 cards, exact selected item.');
 delaySync=500;await a.evaluate(()=>{window.qaSync=RinguEconomy.command('sync');});await a.waitForTimeout(100);
 assert.equal(await a.evaluate(()=>RinguSession.active&&!document.body.classList.contains('economy-pending')),true);
 assert.ok(await a.evaluate(async()=>{const result=await RinguEconomy.command('equipBest');await window.qaSync;return !!result;}));delaySync=0;
 // Reproduce the live quota failure with historical copies filling localStorage.
 const archived=await a.evaluate(()=>{localStorage.setItem('quota-test-unrelated','preserve');let count=0;try{for(;count<100;count++)localStorage.setItem('ringu.session.v1.account.quota-fixture.archive.'+count,'x'.repeat(100000));}catch(e){if(e.name!=='QuotaExceededError')throw e;}return count;});
 assert.ok(archived>0);await a.reload();await a.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);
 assert.equal(await a.evaluate(()=>Object.keys(localStorage).filter(k=>k.includes('quota-fixture.archive.')).length),0);
 assert.equal(await a.evaluate(()=>localStorage.getItem('quota-test-unrelated')),'preserve');
 assert.equal(await a.evaluate(()=>new Promise((resolve,reject)=>{const r=indexedDB.open('ringu-recovery-archives-v1',1);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const q=r.result.transaction('archives').objectStore('archives').getAllKeys();q.onsuccess=()=>{resolve(q.result.filter(k=>k.includes('quota-fixture.archive.')).length);r.result.close();};};})),archived);
 assert.ok(await run(a,'unequip',{slot:'무기'}));
 await a.waitForFunction(()=>document.querySelector('#inventoryList [data-action="equip"]')?.textContent==='장착');
 await a.locator('#inventoryPanel .best').click();
 await a.waitForFunction(()=>document.querySelector('#inventoryList .item.equipped [data-action="equip"]')?.textContent==='해제');
 await a.locator('#inventoryList [data-action="equip"]').click();
 await a.waitForFunction(()=>!Object.keys(RinguCore.state.equipped).length&&document.querySelector('#inventoryList [data-action="equip"]')?.textContent==='장착');
 await a.waitForFunction(()=>RinguSession.active&&!document.body.classList.contains('economy-pending'));
 await a.locator('#inventoryList [data-action="equip"]').click();
 await a.waitForFunction(()=>Object.keys(RinguCore.state.equipped).length===1&&document.querySelector('#inventoryList .item.equipped [data-action="equip"]')?.textContent==='해제');
 console.log('Single-click equip regression passed: best equip, unequip, equip synchronize card badges and buttons.');
 await a.waitForFunction(()=>RinguSession.active);const before=await a.evaluate(()=>structuredClone(RinguCore.state));assert.equal(Object.values(before.equipped).length,1);
 // Forged snapshots cannot replace the authoritative balance or inventory.
 await a.evaluate(async()=>{RinguCore.state.essence=999999;RinguCore.state.inventory=[];RinguCore.fn.save();await RinguSession.flush();});
 assert.equal(await a.evaluate(()=>RinguCore.state.essence),100);assert.equal(await a.evaluate(()=>RinguCore.state.inventory.length),1);
 dropCommand='daily';assert.ok(await run(a,'daily'));assert.equal(dropped,1);assert.equal(await a.evaluate(()=>RinguCore.state.essence),113);
 assert.equal(await run(a,'daily'),false);assert.equal(await a.evaluate(()=>RinguCore.state.essence),113);
 assert.ok(await run(a,'unequip',{slot:'무기'}));const saleItem=await a.evaluate(()=>structuredClone(RinguCore.state.inventory[0]));
 await a.waitForFunction(()=>RinguSession.active);delaySync=500;await a.evaluate(()=>{window.qaAuctionSync=RinguEconomy.command('sync');});await a.waitForTimeout(50);const listing=await a.evaluate(async it=>{const result=await RinguSession.auctionTransaction('list',{itemId:it.id,price:7});await window.qaAuctionSync;return result;},saleItem);delaySync=0;
 assert.ok(listing);const listingId=(await db.query("select id from ringu_private.auction_listings where status='active'")).rows[0].id;
 await a.goto('about:blank');await b.waitForFunction(()=>RinguSession.active);
 await b.evaluate(id=>RinguSession.auctionTransaction('buy',{listingId:id}),listingId);
 assert.equal(await b.evaluate(()=>RinguCore.state.essence),93);assert.deepEqual(await b.evaluate(id=>RinguCore.state.inventory.find(x=>x.id===id),saleItem.id),saleItem);
 await a.goto(base);await a.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);assert.equal(await a.evaluate(()=>RinguCore.state.essence),120);assert.equal(await a.evaluate(()=>RinguCore.state.inventory.length),0);
 assert.ok(await run(a,'summon',{group:'weapon',count:1}));assert.equal(await a.evaluate(()=>RinguCore.state.inventory.length),1);
 assert.ok(await run(a,'petSummon',{count:1}));assert.equal(await a.evaluate(()=>RinguCore.state.ownedPets.length),1);
 await a.waitForFunction(()=>RinguSession.active&&!document.body.classList.contains('economy-pending'));
 assert.ok(await a.evaluate(async()=>{RinguCore.fn.openEnhance(RinguCore.state.inventory[0].id);return RinguCore.fn.tryEnhance();}));
 assert.equal(await a.evaluate(()=>RinguCore.state.inventory[0].enhance),1);assert.equal(await a.locator('#enhanceResult').textContent(),'성공');await a.evaluate(()=>RinguCore.fn.closeEnhance());
 await a.evaluate(async()=>{RinguCore.state.sfxVolume=.2;RinguCore.state.bgmVolume=.3;RinguCore.fn.save();await RinguSession.flush();});
 assert.equal(await a.evaluate(()=>RinguCore.state.sfxVolume),.2);assert.equal(await a.evaluate(()=>RinguCore.state.bgmVolume),.3);
 assert.ok(await run(a,'auto',{enabled:true}));await a.locator('.damage-pop').first().waitFor({state:'attached'});assert.ok(await run(a,'auto',{enabled:false}));
 await b.reload();await b.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);assert.equal(await b.evaluate(()=>RinguCore.state.essence),93);assert.equal(await b.evaluate(()=>RinguCore.state.inventory.length),2);
 assert.deepEqual(errors,[]);
 console.log('Authoritative browser integration passed: tampered-save rejection, daily lost-response replay, marketplace offline proceeds, original item transfer, summons, pets, forge presentation, audio preferences, combat damage animation and reload. PGlite requests serialized; not a PostgreSQL contention test.');
}finally{await browser.close();server.close();await db.close();}
