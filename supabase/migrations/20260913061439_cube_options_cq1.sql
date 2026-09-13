-- CQ1 one-time minimum options, with private pre-change backups.
set local lock_timeout='5s';
set local statement_timeout='60s';
select pg_advisory_xact_lock(70909,10);
create table if not exists ringu_private.cube_cq1_backups(scope text not null,id text not null,payload jsonb not null,created_at timestamptz not null default now(),primary key(scope,id));
alter table ringu_private.cube_cq1_backups enable row level security;
revoke all on ringu_private.cube_cq1_backups from public,anon,authenticated;
insert into ringu_private.cube_cq1_backups(scope,id,payload)
 select 'inventory',id::text,state->'inventory' from ringu_private.accounts where jsonb_typeof(state->'inventory')='array'
 on conflict do nothing;
insert into ringu_private.cube_cq1_backups(scope,id,payload)
 select 'item',id::text,item from ringu_private.auction_items on conflict do nothing;
insert into ringu_private.cube_cq1_backups(scope,id,payload)
 select 'listing',id::text,item from ringu_private.auction_listings where status='active' on conflict do nothing;
insert into ringu_private.cube_cq1_backups(scope,id,payload)
 select 'market',id::text,offers from ringu_private.black_market_cycles where ends_at>now() on conflict do nothing;
update ringu_private.accounts a set state=jsonb_set(a.state,'{inventory}',
 (select coalesce(jsonb_agg(case when v->>'cubeVersion'='1' then v else v||'{"optionRolls":[0.8,0.8],"cubeVersion":1,"cubeTier":0}'::jsonb end order by ord),'[]'::jsonb)
 from jsonb_array_elements(a.state->'inventory') with ordinality e(v,ord))),revision=revision+1,updated_at=now()
 where jsonb_typeof(a.state->'inventory')='array' and exists(select 1 from jsonb_array_elements(a.state->'inventory') v where v->>'cubeVersion' is distinct from '1');
update ringu_private.auction_items set item=item||'{"optionRolls":[0.8,0.8],"cubeVersion":1,"cubeTier":0}'::jsonb where item->>'cubeVersion' is distinct from '1';
update ringu_private.auction_listings set item=item||'{"optionRolls":[0.8,0.8],"cubeVersion":1,"cubeTier":0}'::jsonb where status='active' and item->>'cubeVersion' is distinct from '1';
update ringu_private.black_market_cycles c set offers=(select jsonb_agg(case when v->'item' ? 'rarity' then jsonb_set(v,'{item}',(v->'item')||'{"optionRolls":[0.8,0.8],"cubeVersion":1,"cubeTier":0}'::jsonb) else v end order by ord) from jsonb_array_elements(c.offers) with ordinality e(v,ord)) where ends_at>now();

create or replace function ringu_private.black_market_current()
returns ringu_private.black_market_cycles language plpgsql security definer set search_path='' as $$
declare period record; cycle ringu_private.black_market_cycles%rowtype;
 cfg ringu_private.black_market_config%rowtype; gear ringu_private.black_market_catalogue%rowtype;
 offers jsonb:='[]'; seen text[]:='{}'; i integer; r integer; j integer; roll numeric;
 chosen_slot text; price integer; template jsonb; key text; resource text;
begin
 perform pg_advisory_xact_lock(70909,10);
 select * into period from ringu_private.black_market_period(clock_timestamp());
 select * into cycle from ringu_private.black_market_cycles where id=period.id;
 if found then return cycle;end if;
 select * into strict cfg from ringu_private.black_market_config where singleton;
 if jsonb_array_length(cfg.rates)<>6 or
  (select sum(value::numeric) from jsonb_array_elements_text(cfg.rates))<>100 or
  exists(select 1 from jsonb_array_elements_text(cfg.rates) where value::numeric<0) then
  raise exception 'BLACK_MARKET_CONFIG_INVALID';
 end if;
 for i in 0..4 loop
  roll:=random()*100;r:=5;
  for j in 0..5 loop
   roll:=roll-(cfg.rates->>j)::numeric;
   if roll<0 then r:=j;exit;end if;
  end loop;
  if r>=4 then
   resource:=case when r=4 then 'transcendStone' else 'downgradeProtect' end;
   -- Roll once when the shared offer is created, never on display or purchase.
   price:=case when r=4 then 13+floor(random()*6)::integer else 4+floor(random()*5)::integer end;
   template:=jsonb_build_object('kind','consumable','resource',resource,'quantity',1,
    'name',case when r=4 then '초월석' else '하락방지권' end);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','consumable','price',price,'item',template));
  else
   chosen_slot:=cfg.slots->>floor(random()*jsonb_array_length(cfg.slots))::integer;
   select * into gear from ringu_private.black_market_catalogue c
    where c.rarity=r and c.slot=chosen_slot and not ((c.slot||'|'||c.rarity||'|'||c.name)=any(seen))
    order by random() limit 1;
   if not found then raise exception 'BLACK_MARKET_CATALOGUE_INVALID';end if;
   key:=gear.slot||'|'||gear.rarity||'|'||gear.name;seen:=array_append(seen,key);
   price:=(array[3,5,10,15])[r+1];
   template:=jsonb_build_object('slot',gear.slot,'rarity',gear.rarity,'name',gear.name,
    'baseAtk',gear.base_atk,'enhance',0,'transcend',0,
    'optionRolls',jsonb_build_array(0.8,0.8),'cubeVersion',1,'cubeTier',0);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','equipment','price',price,'item',template));
  end if;
 end loop;
 insert into ringu_private.black_market_cycles(id,starts_at,ends_at,offers,rates)
 values(period.id,period.starts_at,period.ends_at,offers,cfg.rates) returning * into cycle;
 return cycle;
end $$;
revoke all on function ringu_private.black_market_current() from public,anon,authenticated;

