-- 2026-10-29: 코인 카피 트레이딩.
-- 이미 다른 사람을 카피 중이면 새로 신청 불가(먼저 종료). 나를 카피 중인 유저 목록은 상태에 표시.
-- 신청 조건: 보유 골드 1,000만 이상 · 열린 포지션 없음 · 나를 카피 중인 유저가 없음 · 상대가 다른 사람을 카피 중이 아님.
-- 카피 중: 직접 매수 불가. 리더가 매수하면 리더가 그 매수에 쓴 "보유 골드 대비 비율"만큼 같은 종목·방향·레버리지로 자동 매수.
--          리더가 포지션을 팔면 같은 종목·방향·레버리지 포지션을 같이 판다(수수료 규칙 동일).
--          팔로워가 직접 포지션을 팔면 카피가 종료된다.
-- 잠금 순서: 관련 캐릭터 행(id 순) → 코인 전역 잠금(71823081).

create table if not exists rebirth_private.coin_copy(
 follower uuid primary key references auth.users(id) on delete cascade,
 leader uuid not null references auth.users(id) on delete cascade,
 started_at timestamptz not null default clock_timestamp(),
 check (follower<>leader));
create index if not exists coin_copy_leader on rebirth_private.coin_copy(leader);
alter table rebirth_private.coin_copy enable row level security;
revoke all on rebirth_private.coin_copy from public,anon,authenticated;

create or replace function rebirth_private.coin_copy_status(u uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'following',(select jsonb_build_object('id',c.leader,'name',pl.state->>'name','startedAt',c.started_at) from rebirth_private.coin_copy c join rebirth_private.players pl on pl.id=c.leader where c.follower=u),
  'followers',coalesce((select jsonb_agg(jsonb_build_object('id',c.follower,'name',pl.state->>'name','startedAt',c.started_at) order by c.started_at) from rebirth_private.coin_copy c join rebirth_private.players pl on pl.id=c.follower where c.leader=u),'[]'::jsonb),
  'minGold',10000000,
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',pl.id,'name',pl.state->>'name',
     'open',(select count(*) from rebirth_private.coin_positions h where h.user_id=pl.id and h.status='open'),
     'copiers',(select count(*) from rebirth_private.coin_copy c where c.leader=pl.id),
     'copying',exists(select 1 from rebirth_private.coin_copy c where c.follower=pl.id)) order by pl.state->>'name')
   from rebirth_private.players pl where pl.id<>u and pl.state is not null and coalesce(pl.state->>'isTester','false')<>'true'),'[]'::jsonb))
$$;
revoke all on function rebirth_private.coin_copy_status(uuid) from public,anon,authenticated;

-- 리더 매수 복제. 호출 전 리더·팔로워 캐릭터 행과 전역 잠금이 잡혀 있어야 한다.
create or replace function rebirth_private.coin_copy_buy(p_leader uuid,p_coin integer,p_side text,p_leverage smallint,p_fraction numeric) returns void language plpgsql security definer set search_path='' as $$
declare f record; c rebirth_private.coin_market%rowtype; g numeric; q numeric; amt numeric;
begin
 if p_fraction is null or p_fraction<=0 then return; end if;
 select * into c from rebirth_private.coin_market where id=p_coin;
 for f in select pl.id,pl.state from rebirth_private.players pl join rebirth_private.coin_copy cc on cc.follower=pl.id where cc.leader=p_leader order by pl.id for update of pl loop
  g:=coalesce((f.state->>'gold')::numeric,0);
  q:=floor(floor(g*least(1,p_fraction))*p_leverage/c.price);
  if q<1 then continue; end if;
  amt:=ceil(q*c.price/p_leverage);
  if amt>g then q:=q-1; amt:=ceil(q*c.price/p_leverage); end if;
  if q<1 or amt>g then continue; end if;
  insert into rebirth_private.coin_positions as holding(user_id,coin,side,amount,entry,quantity,leverage)
  values(f.id,c.id,p_side,amt,c.price,q,p_leverage)
  on conflict(user_id,coin,side,leverage) where status='open' do update
  set amount=holding.amount+excluded.amount,quantity=holding.quantity+excluded.quantity,
      entry=(holding.quantity*holding.entry+excluded.quantity*excluded.entry)/(holding.quantity+excluded.quantity);
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric-amt)),revision=revision+1,updated_at=now() where id=f.id;
 end loop;
end $$;
revoke all on function rebirth_private.coin_copy_buy(uuid,integer,text,smallint,numeric) from public,anon,authenticated;

-- 리더 매도 복제: 같은 종목·방향·레버리지의 팔로워 포지션을 같은 가격·수수료 규칙으로 판다.
create or replace function rebirth_private.coin_copy_sell(p_leader uuid,p_coin integer,p_side text,p_leverage smallint) returns void language plpgsql security definer set search_path='' as $$
declare f record; c rebirth_private.coin_market%rowtype; gross numeric; v_fee numeric; v_payout numeric;
begin
 select * into c from rebirth_private.coin_market where id=p_coin;
 for f in select h.*,pl.state as pstate from rebirth_private.coin_positions h join rebirth_private.coin_copy cc on cc.follower=h.user_id join rebirth_private.players pl on pl.id=h.user_id
  where cc.leader=p_leader and h.status='open' and h.coin=p_coin and h.side=p_side and h.leverage=p_leverage order by h.user_id for update of h,pl loop
  gross:=greatest(0,f.amount+f.quantity*(c.price-f.entry)*case when f.side='short' then -1 else 1 end);
  v_fee:=ceil(gross*.01*f.leverage);v_payout:=greatest(0,floor(gross-v_fee));
  if coalesce((f.pstate->>'gold')::numeric,0)+v_payout>9007199254740991 then continue; end if;
  update rebirth_private.coin_positions set status='sold',closed_at=clock_timestamp(),payout=v_payout,fee=v_fee where id=f.id;
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric+v_payout)),revision=revision+1,updated_at=now() where id=f.user_id;
 end loop;
end $$;
revoke all on function rebirth_private.coin_copy_sell(uuid,integer,text,smallint) from public,anon,authenticated;

-- 신청·종료·상태 조회
create or replace function rebirth_private.coin_copy(p_action text,p_leader uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; p rebirth_private.players%rowtype;
begin
 if p_action not in ('status','start','stop') then raise exception 'INVALID_COPY_ACTION'; end if;
 u:=rebirth_private.session_user();
 if p_action<>'status' then
  select * into p from rebirth_private.players where id=u for update;
  if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
  perform pg_advisory_xact_lock(71823081);
  if p_action='stop' then
   delete from rebirth_private.coin_copy where follower=u;
  else
   if p_leader is null or p_leader=u or not exists(select 1 from rebirth_private.players where id=p_leader and state is not null) then raise exception 'INVALID_COPY_LEADER'; end if;
   if exists(select 1 from rebirth_private.coin_copy where follower=u) then raise exception 'COPY_ALREADY_ACTIVE'; end if;
   if exists(select 1 from rebirth_private.coin_copy where leader=u) then raise exception 'COPY_HAS_FOLLOWERS'; end if;
   if exists(select 1 from rebirth_private.coin_copy where follower=p_leader) then raise exception 'COPY_LEADER_IS_COPYING'; end if;
   if coalesce((p.state->>'gold')::numeric,0)<10000000 then raise exception 'COPY_GOLD_REQUIRED'; end if;
   if exists(select 1 from rebirth_private.coin_positions where user_id=u and status='open') then raise exception 'COPY_OPEN_POSITIONS'; end if;
   insert into rebirth_private.coin_copy(follower,leader) values(u,p_leader);
  end if;
 end if;
 return rebirth_private.coin_copy_status(u)||jsonb_build_object('serverNow',clock_timestamp());
end $$;
revoke all on function rebirth_private.coin_copy(text,uuid) from public,anon;
grant execute on function rebirth_private.coin_copy(text,uuid) to authenticated;
create or replace function public.rebirth_coin_copy(p_action text,p_leader uuid default null) returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.coin_copy(p_action,p_leader)$$;
revoke all on function public.rebirth_coin_copy(text,uuid) from public,anon;
grant execute on function public.rebirth_coin_copy(text,uuid) to authenticated;

-- investment(): 잠금 순서, 카피 중 매수 차단, 리더 매수·매도 복제, 직접 매도 시 카피 종료, 목록에 카피 상태 포함
do $m$
declare def text; p text;
 a1 text:=' else
  select * into p from rebirth_private.players where id=u for update;
  perform pg_advisory_xact_lock(71823081);';
 a2 text:='   if p_action=''buy'' then
    if p_args ? ''leverage''';
 a3 text:='    result:=jsonb_build_object(''events'',jsonb_build_array(jsonb_build_object(''type'',''investBuy'',''amount'',amount,''leverage'',v_leverage)));';
 a4 text:='    result:=jsonb_build_object(''events'',jsonb_build_array(jsonb_build_object(''type'',''investSell'',''amount'',payout,''fee'',fee)));';
 a5 text:='''investment'',jsonb_build_object(''coins'',market,';
begin
 def:=pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure);
 if position(a1 in def)=0 or position(a2 in def)=0 or position(a3 in def)=0 or position(a4 in def)=0 or position(a5 in def)=0 then raise exception 'INVESTMENT_COPY_DRIFT'; end if;
 p:=replace(def,a1,' else
  perform 1 from rebirth_private.players where id=u or id in (select follower from rebirth_private.coin_copy where leader=u) order by id for update;
  select * into p from rebirth_private.players where id=u for update;
  perform pg_advisory_xact_lock(71823081);');
 p:=replace(p,a2,'   if p_action=''buy'' then
    if exists(select 1 from rebirth_private.coin_copy where follower=u) then raise exception ''COPY_TRADING_ACTIVE'';end if;
    if p_args ? ''leverage''');
 p:=replace(p,a3,a3||'
    perform rebirth_private.coin_copy_buy(u,c.id,p_args->>''side'',v_leverage,amount/greatest(1,(p.state->>''gold'')::numeric+amount));');
 p:=replace(p,a4,a4||'
    if exists(select 1 from rebirth_private.coin_copy where follower=u) then delete from rebirth_private.coin_copy where follower=u;result:=jsonb_set(result,''{events}'',(result->''events'')||jsonb_build_array(jsonb_build_object(''type'',''copyStopped'',''reason'',''manualSell'')));end if;
    perform rebirth_private.coin_copy_sell(u,pos.coin,pos.side,pos.leverage);');
 p:=replace(p,a5,'''investment'',jsonb_build_object(''copy'',rebirth_private.coin_copy_status(u),''coins'',market,');
 execute p;
end $m$;
