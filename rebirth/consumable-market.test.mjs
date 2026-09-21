import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState} from './engine.mjs';
const db=new PGlite();
try {
await db.exec(`create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
await db.exec(await readFile(new URL('schema.sql',import.meta.url),'utf8'));
await db.exec(await readFile(new URL('consumable-market.sql',import.meta.url),'utf8'));
await db.exec('update rebirth_private.release set enabled=true');
const users=Array.from({length:3},()=>({id:randomUUID(),sid:randomUUID()}));
const auth=async u=>db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[u.id,u.sid]);
const snap=async()=>(await db.query('select public.rebirth_snapshot($1) s',[randomUUID()])).rows[0].s;
const market=async(action,args,id=randomUUID())=>(await db.query('select public.rebirth_market($1,$2,$3) r',[action,JSON.stringify(args),id])).rows[0].r;
const stock=async id=>(await db.query('select item,status,gross_sold,fee_paid from rebirth_private.listings where id=$1',[id])).rows[0];
for(const u of users){await db.query('insert into auth.users values($1)',[u.id]);await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[u.sid,u.id]);await auth(u);const p=await snap();const s=initialState('warrior','거래검증',{now:Date.now(),uuid:randomUUID});s.hunting=false;s.level=20;s.gold=100000;s.equipped={};s.items[0].bound=false;s.items[0].quality=98;s.materials={cube:100,highCube:100,scroll:100,expand:100,fragment:100};await db.query('select public.rebirth_commit($1,$2,$3,$4,$5,$6,$7,$8)',[u.id,u.sid,p.epoch,p.revision,randomUUID(),'{}',JSON.stringify(s),'{}']);}
await auth(users[0]);const {listed:id}=await market('sell',{material:'cube',quantity:10,price:100});assert.equal((await snap()).state.materials.cube,90);
await assert.rejects(()=>market('buy',{id,quantity:1}),/LISTING_UNAVAILABLE/);
await auth(users[1]);const rid=randomUUID(),r=await market('buy',{id,quantity:3},rid);assert.equal(r.remaining,7);assert.equal(r.fee,15);assert.equal((await snap()).state.gold,99700);assert.equal((await snap()).state.materials.cube,103);
assert.deepEqual(await market('buy',{id,quantity:3},rid),r);assert.equal((await snap()).state.materials.cube,103);await assert.rejects(()=>market('buy',{id,quantity:4},rid),/REQUEST_ID_REUSED/);
await assert.rejects(()=>market('cancel',{id}),/NOT_OWNER/);
for(const quantity of [0,-1,1.5,8])await assert.rejects(()=>market('buy',{id,quantity}),/INVALID_QUANTITY/);
await auth(users[0]);assert.equal((await snap()).state.gold,100285);assert.equal((await market('cancel',{id})).quantity,7);assert.equal((await snap()).state.materials.cube,97);await assert.rejects(()=>market('cancel',{id}),/LISTING_UNAVAILABLE/);
for(const material of ['cube','highCube','scroll','expand','fragment']){
 await auth(users[0]);const {listed}=await market('sell',{material,quantity:4,price:31});await auth(users[1]);await market('buy',{id:listed,quantity:1});await auth(users[2]);await market('buy',{id:listed,quantity:3});const l=await stock(listed);assert.equal(l.status,'sold');assert.equal(l.item.quantity,0);assert.equal(Number(l.fee_paid),6);await assert.rejects(()=>market('buy',{id:listed,quantity:1}),/LISTING_UNAVAILABLE/);
}
await auth(users[0]);const {listed:split}=await market('sell',{material:'scroll',quantity:20,price:1});await auth(users[1]);for(let i=0;i<20;i++)await market('buy',{id:split,quantity:1});assert.equal(Number((await stock(split)).fee_paid),1);
await auth(users[0]);for(const args of [{material:'hack',quantity:1,price:1},{material:'cube',quantity:101,price:1},{material:'cube',quantity:1.5,price:1},{material:'cube',quantity:1,price:0},{material:'cube',quantity:2,price:1000000000}])await assert.rejects(()=>market('sell',args),/INVALID|INSUFFICIENT/);
const {listed:expired}=await market('sell',{material:'expand',quantity:2,price:100});await db.query("update rebirth_private.listings set expires_at=now()-interval '1 second' where id=$1",[expired]);await auth(users[1]);await assert.rejects(()=>market('buy',{id:expired,quantity:1}),/LISTING_UNAVAILABLE/);await auth(users[0]);await market('cancel',{id:expired});
const {listed:expensive}=await market('sell',{material:'expand',quantity:1,price:1000000});await auth(users[1]);const before=(await snap()).state;await assert.rejects(()=>market('buy',{id:expensive,quantity:1}),/INSUFFICIENT_GOLD/);assert.deepEqual((await snap()).state,before);
await auth(users[0]);const item=(await snap()).state.items[0];const {listed:gear}=await market('sell',{itemId:item.id,price:1000});await auth(users[1]);await market('buy',{id:gear});assert.equal((await snap()).state.items.find(x=>x.id===item.id).quality,98);
assert.ok((await market('list',{kind:'consumable'})).every(x=>x.item.kind==='consumable'));assert.ok((await market('list',{kind:'gear'})).every(x=>x.item.kind!=='consumable'));
await db.exec('set role authenticated');await assert.rejects(()=>db.query('select * from rebirth_private.listings'),/permission denied/);await db.exec('reset role');
console.log('PASS consumable SQL: five materials, escrow, partial/multiple buyers, exact replay, quantity validation, cumulative 5% fee, cancellation remainder, expiry, gold, gear quality and permissions');
} finally {await db.close();}
