// AL8 regression tests. Synthetic accounts in a NEW temporary DB only.
// Optional PG mode is restricted to loopback/al8_qa; no production URL is read.
import {readFile,mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';import {join} from 'node:path';
import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
import {initialState,balance} from '../supabase/functions/_shared/economy.mjs';
let db,dir,pool,checks=0;
const eq=(a,b,label)=>{assert.deepEqual(a,b,label);checks++;};
const ok=(a,label)=>{assert.ok(a,label);checks++;};
const denied=async(fn,pattern)=>{await assert.rejects(fn,pattern);checks++;};
const usePg=!!process.env.AL8_QA_PG_URL;
if(usePg){
 const url=new URL(process.env.AL8_QA_PG_URL);
 assert.ok(['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname==='/al8_qa','Refusing non-local/non-test database');
 const {Pool}=await import(process.env.QA_PG_MODULE||'pg');pool=new Pool({connectionString:url.href,max:5});
 db={exec:text=>pool.query(text),query:(text,args)=>pool.query(text,args)};
}else{
 const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
 dir=await mkdtemp(join(tmpdir(),'linsa-al8-'));db=new PGlite(dir);
}
const users=Array.from({length:3},()=>({id:randomUUID(),sid:randomUUID()}));
async function call(u,action,args={},nonce=randomUUID()){
 const c=pool?await pool.connect():db;
 try{
  await c.query('begin');
  await c.query("select set_config('test.uid',$1,true),set_config('test.sid',$2,true)",[u.id,u.sid]);
  await c.query('set local role authenticated');
  const res=await c.query('select public.ringu_auction($1,$2,$3) r',[action,JSON.stringify(args),nonce]);
  await c.query('commit');return res.rows[0].r;
 }catch(e){await c.query('rollback');throw e;}finally{if(pool)c.release();}
}
const saved=async u=>(await db.query('select state,revision from ringu_private.accounts where id=$1',[u.id])).rows[0];
const inventory=async u=>(await saved(u)).state.inventory;
const count=async u=>(await call(u,'status')).activeListingCount;
async function list(u,nonce=randomUUID()){
 const item=(await inventory(u))[0];return call(u,'list',{itemId:item.id,price:7},nonce);
}
const migration=await readFile(new URL('../supabase/18-auction-listing-limit.sql',import.meta.url),'utf8');
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const f of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+f,import.meta.url),'utf8'));
 for(const f of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await db.exec(await readFile(new URL('../supabase/'+f,import.meta.url),'utf8'));
 for(const u of users){
  await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);
  await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
  // Account activation must stay in one session in PG pool mode.
  const s=initialState(Date.now());Object.assign(s,{playerName:'같은 닉네임',essence:1000,gold:1234,autoBattle:false});
  s.inventory=Array.from({length:24},(_,i)=>({...balance.gear[i],id:i+1,enhance:0,transcend:0,optionRolls:[.876,.942]}));
  await db.query('insert into ringu_private.accounts(id,state,active_session,session_started) values($1,$2,$3,now())',[u.id,JSON.stringify(s),u.sid]);
  await db.query('select ringu_private.auction_import($1)',[u.id]);
 }
 await db.exec('update ringu_private.auction_release set enabled=true,economy_ready=true');
 const [A,B,C]=users;const legacy=[];let replay;
 for(let i=0;i<9;i++){
  const args={itemId:(await inventory(A))[0].id,price:7},nonce=randomUUID();
  const result=await call(A,'list',args,nonce);legacy.push(result);replay={args,nonce,result};
 }
 for(let i=0;i<7;i++)await list(B);
 const before=await db.query('select id,status,item,price from ringu_private.auction_listings order by id');
 const accounts=await Promise.all(users.map(saved));
 await db.exec('begin;\n'+migration+'\ncommit;');
 eq((await db.query('select id,status,item,price from ringu_private.auction_listings order by id')).rows,before.rows,'migration preserves all preexisting listings');
 eq(await Promise.all(users.map(saved)),accounts,'migration changes no account, inventory, revision or currency');
 eq(await count(A),9,'grandfathered nine count unchanged');eq(await count(B),7,'existing seven included');eq(await count(C),0,'other accounts independent');eq((await call(A,'status')).listingLimit,8);
 eq(await call(A,'list',replay.args,replay.nonce),replay.result,'successful request replay above cap works');
 await denied(()=>list(A),/AUCTION_LISTING_LIMIT/);eq(await saved(A),accounts[0],'cap rejection preserves full inventory/revision');
 await call(A,'cancel',{listingId:legacy[0].listingId});eq(await count(A),8);
 await denied(()=>list(A),/AUCTION_LISTING_LIMIT/);
 await call(A,'cancel',{listingId:legacy[1].listingId});eq(await count(A),7);
 await list(A);eq(await count(A),8,'one slot reopens at seven');
 const eighth=await list(B);eq(await count(B),8,'eighth registration succeeds');
 const bstate=await saved(B);await denied(()=>list(B),/AUCTION_LISTING_LIMIT/);eq(await saved(B),bstate);
 const item=(await db.query('select item from ringu_private.auction_listings where id=$1',[eighth.listingId])).rows[0].item;
 const bMoney=(await saved(B)).state.essence,cMoney=(await saved(C)).state.essence;
 await call(C,'buy',{listingId:eighth.listingId});eq(await count(B),7,'sold listing excluded');eq(await count(C),0,'buying does not consume seller slots');
 eq((await saved(B)).state.essence,bMoney+7);eq((await saved(C)).state.essence,cMoney-7);
 eq((await inventory(C)).find(x=>x.id===item.id),item,'exact original item transferred');
 await list(B);eq(await count(B),8);
 eq((await call(B,'mine',{query:'no-such-item'})).total,0);eq(await count(B),8,'filter cannot reduce server cap count');
 // Direct private table writes remain inaccessible to clients.
 ok(!(await db.query("select has_table_privilege('authenticated','ringu_private.auction_listings','INSERT') p")).rows[0].p);
 ok(!(await db.query("select has_function_privilege('anon','public.ringu_auction(text,jsonb,uuid)','EXECUTE') p")).rows[0].p);
 await db.exec('begin;\n'+migration+'\ncommit;');eq(await count(A),8,'migration is repeat-safe');
 for(let i=0;i<7;i++)await list(C);
 const cs=await saved(C),items=cs.state.inventory.slice(0,2),nonces=[randomUUID(),randomUUID()];
 let outcomes;
 if(usePg){outcomes=await Promise.allSettled(items.map((it,i)=>call(C,'list',{itemId:it.id,price:7},nonces[i])));}
 else{outcomes=[];for(const [i,it] of items.entries())try{outcomes.push({status:'fulfilled',value:await call(C,'list',{itemId:it.id,price:7},nonces[i])});}catch(reason){outcomes.push({status:'rejected',reason});}}
 eq(outcomes.filter(x=>x.status==='fulfilled').length,1);ok(/AUCTION_LISTING_LIMIT/.test(outcomes.find(x=>x.status==='rejected').reason.message));eq(await count(C),8);
 eq((await inventory(C)).length,cs.state.inventory.length-1);eq((await saved(C)).state.essence,cs.state.essence);
 const wi=outcomes.findIndex(x=>x.status==='fulfilled');
 eq(await call(C,'list',{itemId:items[wi].id,price:7},nonces[wi]),outcomes[wi].value,'retry at eight returns receipt');
 await denied(()=>call(C,'list',{itemId:items[wi].id,price:8},nonces[wi]),/REQUEST_ID_REUSED/);
 const notify=await readFile(new URL('../supabase/20-auction-sale-notifications.sql',import.meta.url),'utf8');
 await db.exec('begin;'+notify+'commit;');
 eq((await call(B,'status')).unreadSales,1,'existing completed sale becomes unread');
 eq((await call(C,'status')).unreadSales,0,'purchases never count as sales');
 eq((await call(B,'history')).total,1,'history defaults to seller side');
 eq((await call(B,'status')).unreadSales,1,'ordinary refresh does not mark read');
 await call(C,'history',{markSalesRead:true});
 eq((await call(B,'status')).unreadSales,1,'another account cannot clear seller alerts');
 await call(B,'history',{side:'sell',markSalesRead:true});
 eq((await call(B,'status')).unreadSales,0,'explicit history acknowledgement clears all');
 await call(B,'history',{markSalesRead:true});
 eq((await call(B,'status')).unreadSales,0,'acknowledgement replay is harmless');
 const sold=(await call(B,'mine')).rows[0];await call(A,'buy',{listingId:sold.id});
 eq((await call(B,'status')).unreadSales,1,'new sale after acknowledgement creates one alert');
 const cancelled=(await call(B,'mine')).rows[0];await call(B,'cancel',{listingId:cancelled.id});
 eq((await call(B,'status')).unreadSales,1,'cancellation never creates a sale alert');
 ok(!(await db.query("select has_table_privilege('authenticated','ringu_private.auction_sale_reads','INSERT') p")).rows[0].p);
 ok((await db.query("select relrowsecurity p from pg_class where oid='ringu_private.auction_sale_reads'::regclass")).rows[0].p);
 await db.exec('begin;'+notify+'commit;');eq((await call(B,'status')).unreadSales,1,'reapplying preserves unread count');
 console.log(JSON.stringify({suite:'AN1 plus AL8 regression',assertions:checks,productionDataUsed:false}));
}finally{
 if(pool)await pool.end();else{await db.close();if(dir)await rm(dir,{recursive:true,force:true});}
}
