import {readFile} from 'node:fs/promises';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
const users=Array.from({length:3},()=>({id:randomUUID(),sid:randomUUID()}));const [a,b,c]=users;
const identify=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u?.id||'',u?.sid||'']);
const call=async(action='status',recipient=null,amount=null,id=null)=>(await db.query('select public.ringu_gold_transfer($1,$2,$3,$4) r',[action,recipient,amount,id])).rows[0].r;
const balances=async()=>(await db.query("select id,(state->>'gold')::bigint gold,revision from ringu_private.accounts order by id")).rows;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
 for(const f of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+f,import.meta.url),'utf8'));
 await db.exec('create table ringu_private.auction_release(singleton boolean,economy_ready boolean);insert into ringu_private.auction_release values(true,true)');
 for(const u of users){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await identify(u);await db.query("select public.ringu_account('activate')");await db.query('update ringu_private.accounts set state=$1 where id=$2',[{gold:1000,essence:22,playerName:u.id,rankingHidden:u===c,mailbox:[],inventory:[]},u.id]);}
 await db.exec(await readFile(new URL('../supabase/20-gold-transfer.sql',import.meta.url),'utf8'));

 await db.exec(await readFile(new URL('../supabase/21-gold-transfer-fee.sql',import.meta.url),'utf8'));
 await identify(a);const legacy=randomUUID();await call('send',b.id,100,legacy);
 await db.exec(await readFile(new URL('../supabase/22-gold-transfer-mail.sql',import.meta.url),'utf8'));
 const before=await balances();const replay=await call('send',b.id,100,legacy);assert.equal(replay.total,105);assert.equal(replay.delivery,'direct');assert.deepEqual(await balances(),before);
 await db.query("update ringu_private.accounts set state=jsonb_set(state,'{gold}','1000') where id=$1",[a.id]);
 const nonce=randomUUID(),r=await call('send',b.id,1000,nonce);assert.equal(r.total,1000);assert.equal(r.fee,50);assert.equal(r.received,950);assert.equal(r.delivery,'mail');
 const after=await balances();assert.equal(after.find(x=>x.id===a.id).gold,0);assert.equal(after.find(x=>x.id===b.id).gold,before.find(x=>x.id===b.id).gold);
 const readMail=async()=>(await db.query('select state from ringu_private.accounts where id=$1',[b.id])).rows[0].state.mailbox;
 let mails=await readMail();assert.equal(mails.length,1);assert.equal(mails[0].reward.gold,950);
 await call('send',b.id,1000,nonce);assert.equal((await readMail()).length,1);assert.deepEqual(await balances(),after);
 await assert.rejects(()=>call('send',b.id,999,nonce),/REQUEST_ID_REUSED/);
 await assert.rejects(()=>call('send',b.id,1,randomUUID()),/TRANSFER_TOO_SMALL/);
 await db.exec(await readFile(new URL('../supabase/23-resource-transfer.sql',import.meta.url),'utf8'));
 const transfer=async(resource,n,id=randomUUID(),recipient=b.id)=>(await db.query("select public.ringu_resource_transfer('send',$1,$2,$3,$4) r",[recipient,n,id,resource])).rows[0].r;
 await db.query("update ringu_private.accounts set state=state||'{\"essence\":100,\"transcendStone\":100}'::jsonb where id=$1",[a.id]);
 for(const resource of ['essence','transcendStone']){
  const id=randomUUID();const result=await transfer(resource,20,id);assert.equal(result.received,19);assert.equal(result.fee,1);
  const state=(await db.query('select state from ringu_private.accounts where id=$1',[a.id])).rows[0].state;assert.equal(state[resource],80);
  await transfer(resource,20,id);assert.equal((await readMail()).filter(m=>m.reward[resource]===19).length,1);
  await assert.rejects(()=>transfer(resource,21,id),/REQUEST_ID_REUSED/);
  await assert.rejects(()=>transfer(resource,1000),/INSUFFICIENT_RESOURCE/);
 }
 await assert.rejects(()=>transfer('petStone',2),/INVALID_ARGUMENTS/);
 await assert.rejects(()=>transfer('essence',2,randomUUID(),a.id),/TRANSFER_SELF/);
 await assert.rejects(()=>transfer('essence',2,randomUUID(),c.id),/TRANSFER_RECIPIENT_UNAVAILABLE/);
 await assert.rejects(()=>transfer('essence',2.5),/INVALID_ARGUMENTS/);
 await identify(null);await assert.rejects(()=>transfer('essence',2),/LOGIN_REQUIRED/);
 console.log('PASS resource transfer: two resources, atomic deduction, fee, mail, retries, insufficient balance, invalid input and recipient, anonymous rejection');
 console.log('PASS 1000 deducted, 950 in recipient mail, no direct credit, single mail on retry, historical receipts unchanged');
}finally{await db.close();}
