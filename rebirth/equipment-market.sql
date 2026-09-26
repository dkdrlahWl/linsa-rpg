CREATE OR REPLACE FUNCTION rebirth_private.market(p_action text, p_args jsonb, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; p rebirth_private.players%rowtype; v_seller rebirth_private.players%rowtype; l rebirth_private.listings%rowtype; it jsonb; result jsonb; old rebirth_private.receipts%rowtype; fingerprint jsonb:=jsonb_build_object('market',p_action,'args',p_args); v_price bigint; item_id text; page integer; filter_slot integer; filter_class text; collection_key text;
begin
 -- Acquire the shared market lock before session_user can lock a player row.
 if p_action<>'list' then perform pg_advisory_xact_lock(71823001); end if;
 u:=rebirth_private.session_user();
 if p_action='list' then
  page:=least(1000,greatest(0,coalesce((p_args->>'page')::integer,0)));filter_slot:=nullif(p_args->>'slot','')::integer;filter_class:=nullif(p_args->>'classId','');
  select coalesce(jsonb_agg(q),'[]') into result from (select id,item,price,expires_at,seller=u as own,status from rebirth_private.listings where (case when coalesce((p_args->>'mine')::boolean,false) then seller=u else status='open' and expires_at>now() end) and (filter_slot is null or (item->>'slot')::integer=filter_slot) and (filter_class is null or item->>'classId'=filter_class) order by created_at desc,id limit 21 offset page*20) q;
  return result;
 end if;
 -- Serialize market mutations, lock buyers/sellers consistently; small game transaction.
 select * into old from rebirth_private.receipts where user_id=u and request_id=p_request;
 if found then if old.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;return old.result;end if;
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if (p.state->>'level')::integer<5 and p_action<>'cancel' then raise exception 'TRADE_LEVEL_REQUIRED'; end if;
 if p.state->'battle'<>'null'::jsonb or nullif(p.state->>'partyRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS'; end if;
 if p_action='sell' then
  v_price:=(p_args->>'price')::bigint;item_id:=p_args->>'itemId';
  if v_price is null or v_price<100 or v_price>1000000000 then raise exception 'INVALID_PRICE'; end if;
  if (select count(*) from rebirth_private.listings where seller=u and status='open')>=20 then raise exception 'LISTING_LIMIT'; end if;
  select value into it from jsonb_array_elements(p.state->'items') where value->>'id'=item_id;
  if it is null then raise exception 'ITEM_NOT_FOUND'; end if;
  if coalesce((it->>'bound')::boolean,false) or (it->>'locked')::boolean or (it->>'broken')::boolean or p.state->'pendingCube'->>'id'=item_id or exists(select 1 from jsonb_each_text(p.state->'equipped') where value=item_id) then raise exception 'ITEM_PROTECTED'; end if;
  update rebirth_private.players set state=jsonb_set(state,'{items}',(select coalesce(jsonb_agg(value),'[]') from jsonb_array_elements(state->'items') where value->>'id'<>item_id)),revision=revision+1,updated_at=now() where id=u;
  insert into rebirth_private.listings(seller,item,price) values(u,it,v_price) returning * into l;result:=jsonb_build_object('listed',l.id);
 elsif p_action in ('buy','cancel') then
  select * into l from rebirth_private.listings where id=(p_args->>'id')::uuid for update;
  if not found or l.status<>'open' then raise exception 'LISTING_UNAVAILABLE'; end if;
  if jsonb_array_length(p.state->'items')>=300 then raise exception 'INVENTORY_FULL'; end if;
  if p_action='cancel' then
   if l.seller<>u then raise exception 'NOT_OWNER'; end if;
   update rebirth_private.players set state=jsonb_set(state,'{items}',(state->'items')||jsonb_build_array(l.item)),revision=revision+1,updated_at=now() where id=u;
   update rebirth_private.listings set status='cancelled' where id=l.id;result:=jsonb_build_object('cancelled',l.id);
  else
   if l.seller=u or l.expires_at<=now() then raise exception 'LISTING_UNAVAILABLE'; end if;
   if (p.state->>'gold')::bigint<l.price then raise exception 'INSUFFICIENT_GOLD'; end if;
   select * into v_seller from rebirth_private.players where id=l.seller for update;
   if not found then raise exception 'LISTING_UNAVAILABLE'; end if;
   update rebirth_private.players set state=jsonb_set(jsonb_set(state,'{items}',(state->'items')||jsonb_build_array(l.item)),'{gold}',to_jsonb((state->>'gold')::bigint-l.price)),revision=revision+1,updated_at=now() where id=u;
   collection_key:=concat_ws(':',l.item->>'level',l.item->>'classId',l.item->>'slot',l.item->>'boss');
   if l.item->>'slot'='0' and coalesce(l.item->>'weaponVariant','0') in ('1','2') then collection_key:=collection_key||':'||(l.item->>'weaponVariant'); end if;
   update rebirth_private.players set state=jsonb_set(state,'{collection}',coalesce(state->'collection','[]'::jsonb)||jsonb_build_array(collection_key)) where id=u and not coalesce(state->'collection','[]'::jsonb) ? collection_key;
   update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint+floor(l.price*.95)::bigint)),revision=revision+1,updated_at=now() where id=l.seller;
   update rebirth_private.listings set status='sold',buyer=u where id=l.id;result:=jsonb_build_object('bought',l.id,'fee',l.price-floor(l.price*.95));
  end if;
 else raise exception 'INVALID_ACTION';end if;
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(u,p_request,fingerprint,result);return result;
end $function$

