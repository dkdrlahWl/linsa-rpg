import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createServer} from 'node:http';
import {resolve,extname} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite(),users=Array.from({length:10},(_,i)=>({id:randomUUID(),sid:randomUUID(),name:'도전자 '+(i+1)}));
let queue=Promise.resolve(),requests=0;const streams=new Map(),errors=[];
function serial(fn){const p=queue.then(fn);queue=p.catch(()=>{});return p;}
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;
create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());
create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;
create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;
create schema realtime;create table realtime.messages(extension text);alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql as $$select current_setting('test.topic',true)$$;
create function realtime.send(jsonb,text,text,boolean) returns void language sql as $$select null::void$$;
create schema cron;create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;`);
for(const name of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+name,import.meta.url),'utf8'));
for(const name of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await db.exec(await readFile(new URL('../supabase/'+name,import.meta.url),'utf8'));
await db.exec(await readFile(new URL('../supabase/migrations/20260914092650_world_boss_stage_one.sql',import.meta.url),'utf8'));
 await db.exec((await readFile(new URL('../supabase/migrations/20260914122035_world_boss_combat_v3.sql',import.meta.url),'utf8')));
 await db.exec((await readFile(new URL('../supabase/migrations/20260914123914_world_boss_attack_cadence.sql',import.meta.url),'utf8')));
 await db.exec((await readFile(new URL('../supabase/migrations/20260914124948_world_boss_mobile_attacks.sql',import.meta.url),'utf8')));
 await db.exec((await readFile(new URL('../supabase/migrations/20260914142815_weekly_boss_stage_one_rewards.sql',import.meta.url),'utf8')));
await db.exec(await readFile(new URL('../supabase/migrations/20260919161257_celestial_expansion.sql',import.meta.url),'utf8'));
for(const [i,u] of users.entries()){
 await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);
 await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);await db.query("select public.ringu_account('activate')");
 await db.query('update ringu_private.accounts set state=$2 where id=$1',[u.id,JSON.stringify({playerName:u.name,playerGender:i%2?'female':'male',remodelProfile:{power:2000}})]);
 if(i%4>=2){const costume=i%4===2?'kael':'serin';await db.query('insert into ringu_private.costume_ownership values($1,$2,now())',[u.id,costume]);await db.query('insert into ringu_private.costume_selection values($1,$2)',[u.id,costume]);}
}
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.webp':'image/webp'};
const server=createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');const actor=Number(url.searchParams.get('actor')||0);
 if(url.pathname==='/qa'){
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/world-boss.css"><div class="main-quick"></div><script>
  window.RinguSession={active:true,flush:async()=>{},onEnded:()=>{}};window.RinguCore={state:{},fn:{attack:()=>{},toast:console.log}};
  const nativeFetch=window.fetch.bind(window);window.fetch=(url,init)=>nativeFetch(url==='/api/world-boss'?url+'?actor=${actor}':url,init);
  window.RinguCloud={subscribeWorldBoss:(id,onState,onStatus)=>{const s=new EventSource('/events?actor=${actor}&room='+id);s.onmessage=e=>onState(JSON.parse(e.data));s.onopen=()=>onStatus('connected');return()=>s.close();}};
  </script><script src="/world-boss-model.js"></script><script src="/world-boss.js"></script></html>`);return;
 }
 if(url.pathname==='/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.write(': ready\n\n');streams.set(actor,{res,room:url.searchParams.get('room')});req.on('close',()=>streams.delete(actor));return;}
 if(url.pathname==='/api/world-boss'){
  const chunks=[];for await(const c of req)chunks.push(c);const body=JSON.parse(Buffer.concat(chunks));requests++;
  const data=await serial(async()=>{const u=users[actor];await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);await db.exec('set role authenticated');try{return(await db.query('select public.ringu_world_boss($1,$2,$3) r',[body.action,body.room,JSON.stringify(body.args)])).rows[0].r;}finally{await db.exec('reset role');}});
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));
  if(data.room)for(const [i,s] of streams)if(s.room===data.room.id&&data.room.members.some(m=>m.id===users[i].id&&m.present))s.res.write('data: '+JSON.stringify({room:data.room,serverNow:data.serverNow})+'\n\n');return;
 }
 const path=resolve('.','.'+url.pathname);if(!path.startsWith(resolve('.')+(process.platform==='win32'?'\\':'/')))throw Error('Invalid path');res.setHeader('Content-Type',mime[extname(path)]||'application/octet-stream');res.end(await readFile(path));
}catch(e){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:e.message}));if(req.url.startsWith('/api/'))errors.push(e.message);}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});const pages=[];let roomId;
const query=(sql,args=[])=>serial(()=>db.query(sql,args));
const pause=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir('test-output/world-boss',{recursive:true});
try{
 for(let i=0;i<2;i++){
  const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const p=await ctx.newPage();pages.push(p);p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/qa?actor='+i);await p.getByRole('button',{name:'주간보스',exact:true}).click();
  if(i===0){await p.setViewportSize({width:1280,height:844});await pause(700);assert.match(await p.locator('#wb-screen').evaluate(x=>getComputedStyle(x).backgroundImage),/dragon-surround-v1/);await p.screenshot({path:'test-artifacts/dragon-surround-1280.png'});await p.setViewportSize({width:390,height:844});await p.locator('[data-action="stage"][data-stage="2"]').click();assert.equal(await p.locator('#wb-screen').getAttribute('data-stage'),'2');await p.getByRole('button',{name:'방 만들기',exact:true}).click();await p.getByRole('button',{name:'혼자 시작',exact:true}).waitFor();roomId=(await query('select id from ringu_private.wb_rooms limit 1')).rows[0].id;}
  else{await p.getByRole('button',{name:'참가',exact:true}).click();await p.getByRole('button',{name:'준비 완료',exact:true}).click();}
 }
 const p=pages[0];await p.getByRole('button',{name:'전투 시작',exact:true}).click();await p.locator('#wb-arena').waitFor({state:'visible'});await pause(4200);
 assert.ok((await query('select hp from ringu_private.wb_rooms where id=$1',[roomId])).rows[0].hp<8400000);
 assert.match(await p.locator('.wb-header h2').innerText(),/아우리엘/);
 assert.match(await p.locator('#wb-pattern').innerText(),/백익|성환|빛의/);
 for(const width of [320,390,1280]){await p.setViewportSize({width,height:844});await pause(350);assert.ok(await p.locator('#wb-arena').evaluate(x=>x.getBoundingClientRect().width>=200));await p.screenshot({path:'test-artifacts/auriel-'+width+'.png'});}
 await p.keyboard.press('d');await pause(700);assert.ok((await query('select seq from ringu_private.wb_members where room_id=$1 and account_id=$2',[roomId,users[0].id])).rows[0].seq>0);
 await query('update ringu_private.wb_rooms set hp=0 where id=$1',[roomId]);await p.getByRole('button',{name:'보상 확인',exact:true}).waitFor({timeout:10000});await p.getByRole('button',{name:'보상 확인',exact:true}).click();await p.locator('#wb-screen').waitFor({state:'hidden'});assert.deepEqual(errors,[]);console.log('PASS celestial raid browser: stage selection, two-player join/start, 8.4M HP, new pattern labels, movement, 3 viewport sizes, win and exit.');
}catch(e){await pages[0]?.screenshot({path:'test-artifacts/auriel-failure.png'}).catch(()=>{});console.error(e);console.error(errors);process.exitCode=1;}
finally{await browser.close();for(const s of streams.values())s.res.end();await new Promise(r=>server.close(r));await db.close();}
