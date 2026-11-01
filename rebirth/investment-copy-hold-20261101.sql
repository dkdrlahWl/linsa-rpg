-- 2026-11-01 카피 계좌 최소 유지
-- 카피 시작 시 리더 최소 자본(최소 1천만)만큼 카피 계좌로 자동 입금.
-- 클라이언트는 상태의 copyHold 플래그가 있을 때만 경고창/안내를 띄움.
-- 직접 출금 후 잔액이 최소 자본보다 적으면 카피 해제 + 잔액 전부 환급. 매매 손실로 줄어든 건 검사 안 함.
create or replace function rebirth_private.coin_copy_required(p_leader uuid) returns numeric language sql stable security definer set search_path='' as $$
 select greatest(10000000,coalesce((select s.min_gold from rebirth_private.coin_copy_settings s where s.leader=p_leader),0));
$$;
revoke all on function rebirth_private.coin_copy_required(uuid) from public,anon,authenticated;

do $m$ declare def text;
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position($a$'startedAt',c.started_at) from rebirth_private.coin_copy c join rebirth_private.players pl on pl.id=c.leader where c.follower=u)$a$ in def)=0 then raise exception 'COPY_STATUS_DRIFT'; end if;
 def:=replace(def,$a$'startedAt',c.started_at) from rebirth_private.coin_copy c join rebirth_private.players pl on pl.id=c.leader where c.follower=u)$a$,$a$'startedAt',c.started_at,'minGold',rebirth_private.coin_copy_required(c.leader)) from rebirth_private.coin_copy c join rebirth_private.players pl on pl.id=c.leader where c.follower=u)$a$);
 if position($a$'maxCopiers',5,$a$ in def)=0 then raise exception 'COPY_STATUS_DRIFT_MAX'; end if;
 def:=replace(def,$a$'maxCopiers',5,$a$,$a$'maxCopiers',5,'copyHold',true,$a$);
 execute def;
end $m$;

create or replace function rebirth_private.coin_copy(p_action text, p_leader uuid default null::uuid)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare u uuid; p rebirth_private.players%rowtype; req numeric; gold numeric;
begin
 if p_action not in ('status','start','stop','disband') then raise exception 'INVALID_COPY_ACTION'; end if;
 u:=rebirth_private.session_user();
 if p_action<>'status' then
  select * into p from rebirth_private.players where id=u for update;
  if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
  if p_action='disband' then
   perform 1 from rebirth_private.players where id in (select c.follower from rebirth_private.coin_copy c where c.leader=u) order by id for update;
  end if;
  perform pg_advisory_xact_lock(71823081);
  if p_action='disband' then
   if not exists(select 1 from rebirth_private.coin_copy where leader=u) then raise exception 'COPY_NO_FOLLOWERS'; end if;
   if exists(select 1 from rebirth_private.coin_positions where user_id=u and status='open') then raise exception 'COPY_DISBAND_OPEN_POSITIONS'; end if;
   perform rebirth_private.coin_copy_wallet_refund(c.follower) from rebirth_private.coin_copy c where c.leader=u;
   delete from rebirth_private.coin_copy where leader=u;
  elsif p_action='stop' then
   delete from rebirth_private.coin_copy where follower=u;
   perform rebirth_private.coin_copy_wallet_refund(u);
  else
   if p_leader is null or p_leader=u or not exists(select 1 from rebirth_private.players where id=p_leader and state is not null and coalesce(state->>'isAdmin','false')<>'true') then raise exception 'INVALID_COPY_LEADER'; end if;
   if exists(select 1 from rebirth_private.coin_copy where follower=u) then raise exception 'COPY_ALREADY_ACTIVE'; end if;
   if exists(select 1 from rebirth_private.coin_copy where leader=u) then raise exception 'COPY_HAS_FOLLOWERS'; end if;
   if exists(select 1 from rebirth_private.coin_copy where follower=p_leader) then raise exception 'COPY_LEADER_IS_COPYING'; end if;
   if (select count(*) from rebirth_private.coin_copy where leader=p_leader)>=5 then raise exception 'COPY_LEADER_FULL'; end if;
   gold:=coalesce((p.state->>'gold')::numeric,0);
   if gold<10000000 then raise exception 'COPY_GOLD_REQUIRED'; end if;
   req:=rebirth_private.coin_copy_required(p_leader);
   if gold<req then raise exception 'COPY_LEADER_MIN_GOLD'; end if;
   if exists(select 1 from rebirth_private.coin_positions where user_id=u and status='open') then raise exception 'COPY_OPEN_POSITIONS'; end if;
   insert into rebirth_private.coin_copy(follower,leader) values(u,p_leader);
   insert into rebirth_private.coin_copy_wallet as w(user_id,balance,updated_at) values(u,req,now())
   on conflict(user_id) do update set balance=w.balance+excluded.balance,updated_at=now();
   update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(gold-req)),revision=revision+1,updated_at=now() where id=u;
  end if;
 end if;
 select * into p from rebirth_private.players where id=u;
 return rebirth_private.coin_copy_status(u)||jsonb_build_object('serverNow',clock_timestamp())||case when p_action<>'status' then jsonb_build_object('state',p.state,'revision',p.revision) else '{}'::jsonb end;
end $function$;

create or replace function rebirth_private.coin_copy_wallet_move(p_action text, p_amount numeric)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare u uuid:=rebirth_private.session_user(); p rebirth_private.players%rowtype; bal numeric; gold numeric; req numeric; v_leader uuid; ended boolean:=false;
begin
 if p_action not in ('deposit','withdraw') then raise exception 'INVALID_COPY_WALLET_ACTION'; end if;
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 perform pg_advisory_xact_lock(71823081);
 select leader into v_leader from rebirth_private.coin_copy where follower=u;
 if v_leader is null then raise exception 'COPY_WALLET_NOT_COPYING'; end if;
 if p_amount is null or p_amount<>floor(p_amount) or p_amount<1 then raise exception 'COPY_WALLET_INVALID_AMOUNT'; end if;
 select coalesce((select balance from rebirth_private.coin_copy_wallet where user_id=u for update),0) into bal;
 gold:=coalesce((p.state->>'gold')::numeric,0);
 if p_action='deposit' then
  if p_amount>gold then raise exception 'INSUFFICIENT_GOLD'; end if;
  if bal+p_amount>9007199254740991 then raise exception 'COPY_WALLET_INVALID_AMOUNT'; end if;
  insert into rebirth_private.coin_copy_wallet as w(user_id,balance,updated_at) values(u,p_amount,now())
  on conflict(user_id) do update set balance=w.balance+excluded.balance,updated_at=now();
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(gold-p_amount)),revision=revision+1,updated_at=now() where id=u;
 else
  if p_amount>bal then raise exception 'COPY_WALLET_INSUFFICIENT'; end if;
  req:=rebirth_private.coin_copy_required(v_leader);
  if bal-p_amount<req then
   delete from rebirth_private.coin_copy where follower=u;
   perform rebirth_private.coin_copy_wallet_refund(u);
   ended:=true;
  else
   if gold+p_amount>9007199254740991 then raise exception 'INVALID_INVESTMENT_GOLD_RANGE'; end if;
   update rebirth_private.coin_copy_wallet set balance=balance-p_amount,updated_at=now() where user_id=u;
   update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(gold+p_amount)),revision=revision+1,updated_at=now() where id=u;
  end if;
 end if;
 select * into p from rebirth_private.players where id=u;
 return rebirth_private.coin_copy_status(u)||jsonb_build_object('serverNow',clock_timestamp(),'state',p.state,'revision',p.revision,'copyEnded',ended);
end $function$;
