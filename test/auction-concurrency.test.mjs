// Real independent PostgreSQL connections in a NEW, loopback-only temp cluster.
// Requires QA_POSTGRES_BIN pointing to official PostgreSQL binaries. Never uses
// DATABASE_URL, an existing cluster, production accounts or production data.
import {spawn} from 'node:child_process';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,balance} from '../supabase/functions/_shared/economy.mjs';
const bin=process.env.QA_POSTGRES_BIN;if(!bin)throw Error('QA_POSTGRES_BIN required; refusing to connect to any existing database');
const dir=await mkdtemp(join(tmpdir(),'ringu-postgres-contention-')),data=join(dir,'data'),port='55439';
const executable=name=>join(resolve(bin),name+(process.platform==='win32'?'.exe':''));
function processRun(name,args,input=''){return new Promise((resolve,reject)=>{const p=spawn(executable(name),args,{cwd:dir,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='';p.stdout.on('data',s=>out+=s);p.stderr.on('data',s=>err+=s);p.on('error',reject);p.on('exit',code=>code===0?resolve(out):reject(Error(name+': '+err)));p.stdin.end(input);});}
const sql=text=>processRun('psql',['-X','-qAt','-h','127.0.0.1','-p',port,'-U','ringuqa','-d','postgres','-v','ON_ERROR_STOP=1','-f','-'],text);
const literal=v=>"'"+String(v).replaceAll("'","''")+"'";
const parse=out=>JSON.parse(out.trim().split(/\r?\n/).at(-1));
const users=Array.from({length:3},()=>({id:randomUUID(),sid:randomUUID()}));
async function call(u,action,args={},nonce=randomUUID()){
 return parse(await sql(`begin;set local statement_timeout='10s';set local test.uid=${literal(u.id)};set local test.sid=${literal(u.sid)};set local role authenticated;select public.ringu_auction(${literal(action)},${literal(JSON.stringify(args))}::jsonb,${literal(nonce)}::uuid);commit;`));
}
const state=async u=>parse(await sql(`select state from ringu_private.accounts where id=${literal(u.id)};`));
let started=false;
try{
 await processRun('initdb',['-D',data,'-U','ringuqa','-A','trust','--encoding=UTF8','--locale=C']);
 await processRun('pg_ctl',['-D',data,'-l',join(dir,'postgres.log'),'-o','-h 127.0.0.1 -p '+port,'-w','start']);started=true;
 await sql(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await sql(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
 for(const file of ['06-costume-foundation.sql','07-costume-price-100.sql','08-costume-integration.sql','09-open-costume-shop.sql','10-auction-foundation.sql','11-economy-command-gateway.sql'])await sql(await readFile(new URL('../supabase/'+file,import.meta.url),'utf8'));
 for(const u of users){
  const s=initialState(Date.now());s.essence=10000;s.autoBattle=false;s.inventory=[{...balance.gear[0],id:1,enhance:15,transcend:2,optionRolls:[.876,.942]}];
  await sql(`insert into auth.users values(${literal(u.id)});insert into auth.sessions(id,user_id) values(${literal(u.sid)},${literal(u.id)});set test.uid=${literal(u.id)};set test.sid=${literal(u.sid)};select public.ringu_account('activate');update ringu_private.accounts set state=${literal(JSON.stringify(s))}::jsonb where id=${literal(u.id)};select ringu_private.auction_import(${literal(u.id)});`);
 }
 await sql('update ringu_private.auction_release set economy_ready=true,enabled=true;');
 const [A,B,C]=users,original=(await state(A)).inventory[0];let owner=A;
 // Repeated real contention: callers start as separate OS processes/connections.
 for(let i=0;i<10;i++){
  const listing=await call(owner,'list',{itemId:original.id,price:7}),buyers=users.filter(u=>u!==owner);
  const outcome=await Promise.allSettled(buyers.map(u=>call(u,'buy',{listingId:listing.listingId})));
  assert.equal(outcome.filter(x=>x.status==='fulfilled').length,1);assert.match(outcome.find(x=>x.status==='rejected').reason.message,/ALREADY_SOLD/);
  owner=buyers[outcome.findIndex(x=>x.status==='fulfilled')];assert.deepEqual((await state(owner)).inventory.find(it=>it.id===original.id),original);
  assert.equal(Number((await sql("select sum((state->>'essence')::bigint) from ringu_private.accounts;")).trim()),30000);
 }
 for(let i=0;i<10;i++){
  const buyer=users.find(u=>u!==owner),listing=await call(owner,'list',{itemId:original.id,price:11});
  const outcome=await Promise.allSettled([call(buyer,'buy',{listingId:listing.listingId}),call(owner,'cancel',{listingId:listing.listingId})]);
  assert.equal(outcome.filter(x=>x.status==='fulfilled').length,1);assert.match(outcome.find(x=>x.status==='rejected').reason.message,/ALREADY_SOLD|LISTING_CLOSED/);
  if(outcome[0].status==='fulfilled')owner=buyer;
  assert.equal(Number((await sql(`select count(*) from ringu_private.accounts a cross join lateral jsonb_array_elements(a.state->'inventory') it where (it->>'id')::bigint=${original.id};`)).trim()),1);
 }
 const buyer=users.find(u=>u!==owner),listing=await call(owner,'list',{itemId:original.id,price:19}),nonce=randomUUID(),before=(await state(buyer)).essence;
 const repeated=await Promise.all(Array.from({length:8},()=>call(buyer,'buy',{listingId:listing.listingId},nonce)));
 repeated.forEach(r=>assert.deepEqual(r,repeated[0]));assert.equal((await state(buyer)).essence,before-19);
 // Opposite account lock order would deadlock without the global-first lock.
 const holders=[];for(const u of users){const it=(await state(u)).inventory[0];if(it)holders.push({u,it});}assert.ok(holders.length>=2);
 const [left,right]=holders;const [la,lb]=await Promise.all([call(left.u,'list',{itemId:left.it.id,price:13}),call(right.u,'list',{itemId:right.it.id,price:17})]);await Promise.all([call(left.u,'buy',{listingId:lb.listingId}),call(right.u,'buy',{listingId:la.listingId})]);
 assert.equal(Number((await sql("select sum((state->>'essence')::bigint) from ringu_private.accounts;")).trim()),30000);
 console.log('PostgreSQL independent-connection tests passed: 10 buy/buy races, 10 buy/cancel races, 8 identical concurrent requests, original attributes and total essence conserved.');
}finally{
 if(started)await processRun('pg_ctl',['-D',data,'-m','fast','-w','stop']);
 console.log('Stopped isolated PostgreSQL; test logs/data retained at '+dir);
}
