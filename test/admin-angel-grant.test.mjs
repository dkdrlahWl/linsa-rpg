import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {initialState,execute} from '../supabase/functions/_shared/economy.mjs';
const db=new PGlite(),admin=crypto.randomUUID(),other=crypto.randomUUID(),now=Date.now();
try{
 await db.exec(`create schema ringu_private;
 create table ringu_private.accounts(id uuid primary key,state jsonb,revision bigint default 0,updated_at timestamptz default now());
 create table ringu_private.admin_accounts(account_id uuid primary key);
 create table ringu_private.gift_campaigns(id text primary key);
 create table ringu_private.gift_receipts(campaign_id text,account_id uuid,primary key(campaign_id,account_id));
 create sequence ringu_private.auction_item_ids start 1000000000000000;
 create table ringu_private.auction_items(id bigint primary key,uid uuid unique,owner_id uuid,item jsonb);`);
 const s={...initialState(now),autoBattle:false,gold:12345};for(const id of [admin,other])await db.query('insert into ringu_private.accounts(id,state) values($1,$2)',[id,JSON.stringify(s)]);
 await db.query('insert into ringu_private.admin_accounts values($1)',[admin]);const sql=await readFile(new URL('../supabase/admin-angel-seven.sql',import.meta.url),'utf8');await db.exec(sql);
 const get=async()=> (await db.query('select state,revision from ringu_private.accounts where id=$1',[admin])).rows[0];const before=await get();
 assert.equal(before.state.inventory.length,7);assert.equal(new Set(before.state.inventory.map(x=>x.slot)).size,7);assert.ok(before.state.inventory.every(x=>x.rarity===7&&x.enhance===0&&x.transcend===0));assert.equal(before.state.gold,12345);assert.deepEqual(before.state.equipped,{});assert.equal(before.revision,1);
 assert.equal((await db.query('select count(*)::int n from ringu_private.auction_items where owner_id=$1',[admin])).rows[0].n,7);
 await db.exec(sql);assert.deepEqual(await get(),before);assert.deepEqual((await db.query('select state from ringu_private.accounts where id=$1',[other])).rows[0].state,s);
 const synced=execute(before.state,'sync',{}, {now,random:()=>.5,itemIds:[],uuid:()=>crypto.randomUUID()});assert.equal(synced.state.inventory.length,7);
 console.log('PASS admin grant: exactly 7 canonical items, ownership registration, discoveries, revision, no other-account/resource changes, retry idempotence and economy sync.');
}finally{await db.close();}
