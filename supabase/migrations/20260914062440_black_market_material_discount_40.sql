-- BM6: new material offers have at most 40% off. Existing offers retain prices and receipts.
set local lock_timeout='5s';
select pg_advisory_xact_lock(70909,10);
create or replace function ringu_private.black_market_personal(p_user uuid)
returns ringu_private.black_market_cycles language plpgsql security definer set search_path='' as $$
declare cycle ringu_private.black_market_cycles%rowtype;cfg ringu_private.black_market_config%rowtype;
 gear ringu_private.black_market_catalogue%rowtype;offers jsonb:='[]';saved jsonb;seen text[]:='{}';
 i integer;r integer;j integer;roll numeric;chosen_slot text;price integer;template jsonb;key text;resource text;
begin
 perform pg_advisory_xact_lock(70909,10);
 if p_user is distinct from auth.uid() then raise exception 'LOGIN_REQUIRED';end if;
 cycle:=ringu_private.black_market_current();
 cycle.rates:='[29.1,15,4.9,1,15,15,10,10]'::jsonb;
 select p.offers into saved from ringu_private.black_market_personal_cycles p where p.account_id=p_user and p.rotation_id=cycle.id;
 if found then cycle.offers:=saved;return cycle;end if;
 select * into strict cfg from ringu_private.black_market_config where singleton;cfg.rates:=cycle.rates;
 for i in 0..4 loop
  roll:=random()*100;r:=7;
  for j in 0..7 loop
   roll:=roll-(cfg.rates->>j)::numeric;
   if roll<0 then r:=j;exit;end if;
  end loop;
  if r>=6 then
   resource:=case when r=6 then 'jadeCube' else 'sunCube' end;
   price:=case when r=6 then 12+floor(random()*9)::integer else 30+floor(random()*21)::integer end;
   template:=jsonb_build_object('kind','consumable','resource',resource,'quantity',1,'name',case when r=6 then '비취 큐브' else '태양 큐브' end);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','consumable','price',price,'item',template,'limit',5,'originalPrice',case when r=6 then 20 else 50 end));
  elsif r>=4 then
   resource:=case when r=4 then 'transcendStone' else 'downgradeProtect' end;
   -- Roll once when the shared offer is created, never on display or purchase.
   price:=case when r=4 then 15+floor(random()*11)::integer else 6+floor(random()*5)::integer end;
   template:=jsonb_build_object('kind','consumable','resource',resource,'quantity',1,
    'name',case when r=4 then '초월석' else '하락방지권' end);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','consumable','price',price,'item',template,'limit',case when r=4 then 10 else 5 end,'originalPrice',case when r=4 then 25 else 10 end));
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
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','equipment','price',price,'item',template,'limit',1));
  end if;
 end loop;

 -- Already bought slots retain their original product during this rollout.
 select jsonb_agg(case when exists(select 1 from ringu_private.black_market_purchases p where p.account_id=p_user and p.rotation_id=cycle.id and p.slot=(v->>'slot')::integer)
 then (cycle.offers->((v->>'slot')::integer))||jsonb_build_object('limit',case when cycle.offers->((v->>'slot')::integer)->'item'->>'resource'='transcendStone' then 10 when cycle.offers->((v->>'slot')::integer)->'item'->>'resource'='downgradeProtect' then 5 else 1 end) else v end order by ord)
 into offers from jsonb_array_elements(offers) with ordinality e(v,ord);
 insert into ringu_private.black_market_personal_cycles(account_id,rotation_id,offers) values(p_user,cycle.id,offers);
 cycle.offers:=offers;return cycle;
end $$;
revoke all on function ringu_private.black_market_personal(uuid) from public,anon,authenticated;
create or replace function public.ringu_black_market(
 p_action text default 'status',p_rotation text default null,p_slot integer default null,p_request_id uuid default null,p_quantity integer default 1
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;a ringu_private.accounts%rowtype;cycle ringu_private.black_market_cycles%rowtype;
 receipt ringu_private.black_market_purchases%rowtype;offer jsonb;it jsonb;inv jsonb;
 discovered jsonb;key text;balance bigint;iid bigint;item_uid uuid;result jsonb;rows jsonb;
 kind text;resource text;amount bigint;price integer;next_rates jsonb;stock integer;used integer;total bigint;
begin
 if p_action is null or p_action not in ('status','buy') then raise exception 'INVALID_ARGUMENTS';end if;
 perform pg_advisory_xact_lock(70909,10);
 u:=ringu_private.require_session(false);
 select * into strict a from ringu_private.accounts where id=u for update;
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready)
  or not exists(select 1 from ringu_private.auction_accounts where account_id=u) then
  if p_action='status' then return jsonb_build_object('ready',false,'reason','ECONOMY_NOT_READY');end if;
  raise exception 'BLACK_MARKET_NOT_READY';
 end if;
 if p_action='buy' then
  if p_quantity is null or p_quantity not between 1 and 10 then raise exception 'INVALID_ARGUMENTS';end if;
  if p_request_id is null or p_rotation is null or length(p_rotation)>40 or p_slot is null or p_slot not between 0 and 4 then raise exception 'INVALID_ARGUMENTS';end if;
  select * into receipt from ringu_private.black_market_purchases where account_id=u and request_id=p_request_id;
  if found then
   if receipt.rotation_id<>p_rotation or receipt.slot<>p_slot or receipt.quantity<>p_quantity then raise exception 'REQUEST_ID_REUSED';end if;
   return receipt.result;
  end if;
 end if;
 cycle:=ringu_private.black_market_personal(u);
 if p_action='status' then
  select jsonb_agg(o.value||jsonb_build_object('purchased',coalesce(p.used,0)>=coalesce((o.value->>'limit')::integer,1),
   'remaining',greatest(0,coalesce((o.value->>'limit')::integer,1)-coalesce(p.used,0))) order by (o.value->>'slot')::integer)
  into rows from jsonb_array_elements(cycle.offers) o left join lateral
   (select sum(quantity)::integer used from ringu_private.black_market_purchases where account_id=u and rotation_id=cycle.id and slot=(o.value->>'slot')::integer) p on true;
  next_rates:=cycle.rates;
  return jsonb_build_object('ready',true,'version','BM5','rotation',cycle.id,
   'serverNow',floor(extract(epoch from clock_timestamp())*1000),
   'startsAt',floor(extract(epoch from cycle.starts_at)*1000),'expiresAt',floor(extract(epoch from cycle.ends_at)*1000),
   'rates',cycle.rates,'nextRates',next_rates,'ratesApplyNextRotation',cycle.rates<>next_rates,
   'items',rows,'essence',a.state->'essence','revision',a.revision);
 end if;
 if p_rotation<>cycle.id then raise exception 'BLACK_MARKET_REFRESHED';end if;
 offer:=cycle.offers->p_slot;it:=offer->'item';kind:=coalesce(offer->>'kind','equipment');
 if offer is null or (offer->>'slot')::integer<>p_slot then raise exception 'BLACK_MARKET_OFFER_INVALID';end if;
 stock:=coalesce((offer->>'limit')::integer,1);
 select coalesce(sum(quantity),0) into used from ringu_private.black_market_purchases where account_id=u and rotation_id=cycle.id and slot=p_slot;
 if used+p_quantity>stock then raise exception 'BLACK_MARKET_PURCHASED';end if;
 price:=ringu_private.auction_integer(offer->'price',1);total:=price*p_quantity;
 balance:=ringu_private.auction_integer(a.state->'essence');
 if balance<total then raise exception 'INSUFFICIENT_ESSENCE';end if;
 if kind='consumable' then
  resource:=it->>'resource';
  if it->>'kind' is distinct from 'consumable' or resource is null or resource not in ('transcendStone','downgradeProtect','jadeCube','sunCube')
   or it->'quantity' is distinct from '1'::jsonb
   or (resource='transcendStone' and (case when offer ? 'originalPrice' then price not between 15 and 25 else price not between 13 and 18 end))
   or (resource='downgradeProtect' and (case when offer ? 'originalPrice' then price not between 6 and 10 else price not between 4 and 8 end))
   or (resource='jadeCube' and price not between 12 and 20)
   or (resource='sunCube' and price not between 30 and 50) then raise exception 'BLACK_MARKET_OFFER_INVALID';end if;
  amount:=ringu_private.auction_integer(coalesce(a.state->resource,'0'::jsonb));
  if amount>9007199254740991-p_quantity then raise exception 'RESOURCE_BALANCE_LIMIT';end if;
  -- Resource counters only: no fake equipment, catalogue/discovery changes, or new item ID.
  update ringu_private.accounts set state=state||jsonb_build_object(resource,amount+p_quantity,'essence',balance-total),
   revision=revision+1,updated_at=clock_timestamp() where id=u;
  result:=jsonb_build_object('ok',true,'kind',kind,'rotation',cycle.id,'slot',p_slot,
   'requestId',p_request_id,'item',it,'resource',resource,'quantity',p_quantity,'price',price,'totalPrice',total,'remaining',stock-used-p_quantity);
 elsif kind='equipment' then
  if p_quantity<>1 then raise exception 'INVALID_ARGUMENTS';end if;
  if jsonb_typeof(a.state->'inventory') is distinct from 'array' then raise exception 'INVALID_INVENTORY';end if;
  if it->>'kind'='consumable' then raise exception 'BLACK_MARKET_OFFER_INVALID';end if;
  iid:=nextval('ringu_private.auction_item_ids');item_uid:=gen_random_uuid();
  key:=it->>'slot'||'|'||(it->>'rarity')||'|'||(it->>'name');
  discovered:=coalesce(a.state->'discovered','{}'::jsonb);
  it:=it||jsonb_build_object('id',iid,'auctionUid',item_uid,'isNew',not coalesce((discovered->>key)::boolean,false));
  discovered:=discovered||jsonb_build_object(key,true);
  inv:=jsonb_build_array(it)||(a.state->'inventory');
  insert into ringu_private.auction_items(id,uid,owner_id,item) values(iid,item_uid,u,it);
  update ringu_private.accounts set state=state||jsonb_build_object('inventory',inv,'essence',balance-total,'discovered',discovered,
   'uid',least(9007199254740991,greatest(coalesce((state->>'uid')::bigint,1),iid+1))),
   revision=revision+1,updated_at=clock_timestamp() where id=u;
  result:=jsonb_build_object('ok',true,'kind',kind,'rotation',cycle.id,'slot',p_slot,'requestId',p_request_id,'item',it,'price',price);
 else raise exception 'BLACK_MARKET_OFFER_INVALID';
 end if;
 insert into ringu_private.black_market_purchases(account_id,rotation_id,slot,request_id,item_id,price,result,quantity)
 values(u,cycle.id,p_slot,p_request_id,iid,price,result,p_quantity);
 return result;
end $$;
revoke all on function public.ringu_black_market(text,text,integer,uuid,integer) from public,anon;
grant execute on function public.ringu_black_market(text,text,integer,uuid,integer) to authenticated;
