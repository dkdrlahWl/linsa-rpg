-- 2026-11-04 도현: 거래소 "구매 요청"(사겠다) — 소모품만.
-- 구매자가 품목·개당 가격·수량을 올리면 골드(가격×수량)가 바로 묶이고(에스크로),
-- 그 소모품을 가진 다른 유저가 원하는 만큼 팔면 즉시 골드를 받는다. 수수료 없음, 7일 만료(남은 골드 자동 환불).
create table if not exists rebirth_private.buy_orders(
 id uuid primary key default gen_random_uuid(),
 buyer uuid not null references auth.users(id) on delete cascade,
 key text not null,
 price bigint not null check(price between 1 and 1000000000),
 quantity bigint not null check(quantity>=0),
 original bigint not null check(original between 1 and 1000000),
 filled bigint not null default 0,
 status text not null default 'open' check(status in ('open','filled','cancelled','expired')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days'
);
alter table rebirth_private.buy_orders enable row level security;
create index if not exists buy_orders_open on rebirth_private.buy_orders(status,expires_at) where status='open';
create index if not exists buy_orders_buyer on rebirth_private.buy_orders(buyer,created_at desc);

-- 소모품 위치(거래소 판매와 같은 규칙)
create or replace function rebirth_private.buy_order_path(p_key text) returns text[]
language sql immutable set search_path to '' as $f$
 select case when p_key='diamond' then array['fishing','diamonds'] when p_key='companionTicket' then array['companions','tickets'] when p_key='treasureTicket' then array['treasure','tickets'] else array['materials',p_key] end
$f$;
-- 상위 객체가 없어도 안전하게 수량을 더한다.
create or replace function rebirth_private.buy_order_add(p_state jsonb,p_key text,p_amount bigint) returns jsonb
language sql immutable set search_path to '' as $f$
 select p_state||jsonb_build_object(path[1],coalesce(case when jsonb_typeof(p_state->path[1])='object' then p_state->path[1] end,'{}'::jsonb)||jsonb_build_object(path[2],coalesce((p_state#>>path)::bigint,0)+p_amount))
 from (select rebirth_private.buy_order_path(p_key) path) x
$f$;

-- 만료된 요청은 남은 골드를 구매자에게 돌려준다(시장 잠금 안에서 호출).
create or replace function rebirth_private.buy_order_expire() returns integer
language plpgsql security definer set search_path to '' as $f$
declare o rebirth_private.buy_orders%rowtype; n int:=0;
begin
 for o in select * from rebirth_private.buy_orders where status='open' and expires_at<=now() order by expires_at limit 200 for update skip locked loop
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(least(9000000000000,(state->>'gold')::bigint+o.price*o.quantity))),revision=revision+1,updated_at=now() where id=o.buyer;
  update rebirth_private.buy_orders set status='expired' where id=o.id;n:=n+1;
 end loop;
 return n;
end $f$;

create or replace function rebirth_private.buy_order(p_action text, p_args jsonb, p_request uuid)
 returns jsonb language plpgsql security definer set search_path to '' as $f$
declare u uuid; p rebirth_private.players%rowtype; s rebirth_private.players%rowtype; o rebirth_private.buy_orders%rowtype; old rebirth_private.receipts%rowtype;
 fingerprint jsonb:=jsonb_build_object('buyOrder',p_action,'args',p_args); result jsonb; k text; qty bigint; v_price bigint; total bigint; path text[];
begin
 u:=rebirth_private.session_user();
 if p_action='list' then
  return jsonb_build_object(
   'orders',(select coalesce(jsonb_agg(q order by q.price desc,q.created_at),'[]') from (
     select b.id,b.key,b.price,b.quantity,b.original,b.expires_at,b.created_at,b.buyer=u own,coalesce(pl.state->>'name','?') buyer_name
     from rebirth_private.buy_orders b left join rebirth_private.players pl on pl.id=b.buyer
     where b.status='open' and b.expires_at>now() order by b.price desc,b.created_at limit 200) q),
   'mine',(select coalesce(jsonb_agg(q order by q.created_at desc),'[]') from (
     select id,key,price,quantity,original,filled,status,expires_at,created_at from rebirth_private.buy_orders
     where buyer=u and (status='open' or created_at>now()-interval '3 days') order by created_at desc limit 30) q));
 end if;
 perform pg_advisory_xact_lock(71823001); -- 거래소와 같은 잠금(플레이어 행 잠금 순서 일치)
 if rebirth_private.is_tester(u) then raise exception 'TESTER_BLOCKED';end if;
 select * into old from rebirth_private.receipts where user_id=u and request_id=p_request;
 if found then if old.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED';end if;return old.result;end if;
 perform rebirth_private.buy_order_expire();
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED';end if;
 if (p.state->>'level')::integer<5 and p_action<>'cancel' then raise exception 'TRADE_LEVEL_REQUIRED';end if;
 if p.state->'battle'<>'null'::jsonb or nullif(p.state->>'partyRoom','') is not null or nullif(p.state->>'coopRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS';end if;
 if p_action='create' then
  k:=p_args->>'key';
  if k is null or k not in ('primeCube','cube','highCube','fragment','scroll','potentialLock','dungeonKey','diamond','companionTicket','treasureTicket') then raise exception 'INVALID_MATERIAL';end if;
  if coalesce(p_args->>'quantity','')!~'^[0-9]+$' or coalesce(p_args->>'price','')!~'^[0-9]+$' then raise exception 'INVALID_QUANTITY';end if;
  qty:=(p_args->>'quantity')::bigint;v_price:=(p_args->>'price')::bigint;
  if qty<1 or qty>1000000 or v_price<1 or v_price>1000000000 then raise exception 'INVALID_PRICE';end if;
  total:=v_price*qty;
  if total>1000000000000 then raise exception 'INVALID_PRICE';end if;
  if (select count(*) from rebirth_private.buy_orders where buyer=u and status='open')>=10 then raise exception 'BUY_ORDER_LIMIT';end if;
  if (p.state->>'gold')::bigint<total then raise exception 'INSUFFICIENT_GOLD';end if;
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint-total)),revision=revision+1,updated_at=now() where id=u;
  insert into rebirth_private.buy_orders(buyer,key,price,quantity,original) values(u,k,v_price,qty,qty) returning * into o;
  result:=jsonb_build_object('created',o.id,'escrow',total);
 elsif p_action='cancel' then
  select * into o from rebirth_private.buy_orders where id=(p_args->>'id')::uuid for update;
  if not found or o.status<>'open' then raise exception 'BUY_ORDER_UNAVAILABLE';end if;
  if o.buyer<>u then raise exception 'NOT_OWNER';end if;
  total:=o.price*o.quantity;
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(least(9000000000000,(state->>'gold')::bigint+total))),revision=revision+1,updated_at=now() where id=u;
  update rebirth_private.buy_orders set status='cancelled' where id=o.id;
  result:=jsonb_build_object('cancelled',o.id,'refund',total);
 elsif p_action='fill' then
  select * into o from rebirth_private.buy_orders where id=(p_args->>'id')::uuid for update;
  if not found or o.status<>'open' or o.expires_at<=now() then raise exception 'BUY_ORDER_UNAVAILABLE';end if;
  if o.buyer=u then raise exception 'BUY_ORDER_OWN';end if;
  if coalesce(p_args->>'quantity','')!~'^[0-9]+$' then raise exception 'INVALID_QUANTITY';end if;
  qty:=(p_args->>'quantity')::bigint;
  if qty<1 or qty>o.quantity then raise exception 'INVALID_QUANTITY';end if;
  path:=rebirth_private.buy_order_path(o.key);
  if coalesce((p.state#>>path)::bigint,0)<qty then raise exception 'INSUFFICIENT_MATERIAL';end if;
  if o.key='dungeonKey' and coalesce((p.state->'materials'->>'dungeonKey')::bigint,0)-qty<(select count(*) from rebirth_private.coop_rooms q where q.world->>'keyOwner'=u::text and q.world->>'status' in ('waiting','fighting') and (q.world->>'status'='fighting' or q.created_at>now()-interval '15 minutes')) then raise exception 'EXPLORATION_KEY_RESERVED';end if;
  total:=o.price*qty;
  if (p.state->>'gold')::bigint+total>9000000000000 then raise exception 'INVALID_BALANCE';end if;
  select * into s from rebirth_private.players where id=o.buyer for update;
  if not found or s.state is null then raise exception 'BUY_ORDER_UNAVAILABLE';end if;
  -- 판매자: 소모품 차감, 골드 지급 / 구매자: 소모품 지급(골드는 이미 묶여 있음)
  update rebirth_private.players set state=jsonb_set(jsonb_set(state,path,to_jsonb((state#>>path)::bigint-qty)),'{gold}',to_jsonb((state->>'gold')::bigint+total)),revision=revision+1,updated_at=now() where id=u;
  update rebirth_private.players set state=rebirth_private.buy_order_add(state,o.key,qty),revision=revision+1,updated_at=now() where id=o.buyer;
  update rebirth_private.buy_orders set quantity=quantity-qty,filled=filled+qty,status=case when quantity=qty then 'filled' else 'open' end where id=o.id;
  result:=jsonb_build_object('filled',o.id,'quantity',qty,'total',total,'remaining',o.quantity-qty);
 else raise exception 'INVALID_ACTION';end if;
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(u,p_request,fingerprint,result);
 return result;
end $f$;

create or replace function public.rebirth_buy_order(p_action text, p_args jsonb, p_request uuid)
 returns jsonb language sql set search_path to '' as $f$select rebirth_private.buy_order(p_action,p_args,p_request)$f$;
revoke all on function public.rebirth_buy_order(text,jsonb,uuid) from public, anon;
grant execute on function public.rebirth_buy_order(text,jsonb,uuid) to authenticated, service_role;
revoke all on function rebirth_private.buy_order(text,jsonb,uuid) from public, anon;
grant execute on function rebirth_private.buy_order(text,jsonb,uuid) to authenticated;
revoke all on function rebirth_private.buy_order_expire() from public, anon, authenticated;
revoke all on function rebirth_private.buy_order_path(text) from public, anon;
revoke all on function rebirth_private.buy_order_add(jsonb,text,bigint) from public, anon;
grant execute on function rebirth_private.buy_order_path(text), rebirth_private.buy_order_add(jsonb,text,bigint) to authenticated;
select cron.schedule('rebirth-buy-order-expire','41 * * * *','select rebirth_private.buy_order_expire()');
