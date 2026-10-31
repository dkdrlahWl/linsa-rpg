-- 2026-10-31: 카피 계좌. 카피 중인 유저(팔로워)만 쓸 수 있는 별도 계좌.
-- - 입금/출금은 누군가를 카피 중일 때만 가능 (리더는 카피를 못 하므로 자동으로 못 씀)
-- - 리더 매수 시 팔로워는 보유 골드가 아니라 카피 계좌 잔액 비율로 따라 산다
-- - 리더 매도로 같이 팔린 금액은 카피 계좌로 돌아온다
-- - 카피를 끝내면(종료 버튼/직접 매도) 카피 계좌 잔액은 자동으로 보유 골드로 돌아간다
create table if not exists rebirth_private.coin_copy_wallet(
 user_id uuid primary key,
 balance numeric not null default 0 check (balance>=0 and balance=floor(balance)),
 updated_at timestamptz not null default now());
revoke all on table rebirth_private.coin_copy_wallet from public,anon,authenticated;

-- 카피 계좌 잔액을 보유 골드로 돌려준다. 호출 전 플레이어 행이 잠겨 있어야 한다.
create or replace function rebirth_private.coin_copy_wallet_refund(u uuid)
returns numeric language plpgsql security definer set search_path to '' as $f$
declare amt numeric;
begin
 select balance into amt from rebirth_private.coin_copy_wallet where user_id=u for update;
 amt:=least(coalesce(amt,0),greatest(0,9007199254740991-coalesce((select (state->>'gold')::numeric from rebirth_private.players where id=u),0)));
 if amt>0 then
  update rebirth_private.coin_copy_wallet set balance=balance-amt,updated_at=now() where user_id=u;
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(coalesce((state->>'gold')::numeric,0)+amt)),revision=revision+1,updated_at=now() where id=u;
 end if;
 return coalesce(amt,0);
end $f$;
revoke all on function rebirth_private.coin_copy_wallet_refund(uuid) from public,anon,authenticated;

create or replace function rebirth_private.coin_copy_wallet_move(p_action text,p_amount numeric)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare u uuid:=rebirth_private.session_user(); p rebirth_private.players%rowtype; bal numeric; gold numeric;
begin
 if p_action not in ('deposit','withdraw') then raise exception 'INVALID_COPY_WALLET_ACTION'; end if;
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 perform pg_advisory_xact_lock(71823081);
 if not exists(select 1 from rebirth_private.coin_copy where follower=u) then raise exception 'COPY_WALLET_NOT_COPYING'; end if;
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
  if gold+p_amount>9007199254740991 then raise exception 'INVALID_INVESTMENT_GOLD_RANGE'; end if;
  update rebirth_private.coin_copy_wallet set balance=balance-p_amount,updated_at=now() where user_id=u;
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(gold+p_amount)),revision=revision+1,updated_at=now() where id=u;
 end if;
 select * into p from rebirth_private.players where id=u;
 return rebirth_private.coin_copy_status(u)||jsonb_build_object('serverNow',clock_timestamp(),'state',p.state,'revision',p.revision);
end $f$;
revoke all on function rebirth_private.coin_copy_wallet_move(text,numeric) from public,anon;
grant execute on function rebirth_private.coin_copy_wallet_move(text,numeric) to authenticated;

create or replace function public.rebirth_coin_copy_wallet(p_action text,p_amount numeric)
returns jsonb language sql set search_path to '' as $f$select rebirth_private.coin_copy_wallet_move(p_action,p_amount)$f$;
revoke all on function public.rebirth_coin_copy_wallet(text,numeric) from public,anon;
grant execute on function public.rebirth_coin_copy_wallet(text,numeric) to authenticated;

do $m$
declare def text;
 b1 text:='  g:=coalesce((f.state->>''gold'')::numeric,0);';
 b2 text:='  update rebirth_private.players set state=jsonb_set(state,''{gold}'',to_jsonb((state->>''gold'')::numeric-amt)),revision=revision+1,updated_at=now() where id=f.id;';
 s1 text:='  update rebirth_private.players set state=jsonb_set(state,''{gold}'',to_jsonb((state->>''gold'')::numeric+v_payout)),revision=revision+1,updated_at=now() where id=f.user_id;
  v_n:=v_n+1;';
 c1 text:='   delete from rebirth_private.coin_copy where follower=u;';
 i1 text:='if exists(select 1 from rebirth_private.coin_copy where follower=u) then delete from rebirth_private.coin_copy where follower=u;';
 st text:='''myMinGold'',';
begin
 -- 1) 카피 매수: 카피 계좌 잔액 비율로, 카피 계좌에서 차감
 def:=pg_get_functiondef('rebirth_private.coin_copy_buy(uuid,integer,text,smallint,numeric)'::regprocedure);
 if position(b1 in def)=0 or position(b2 in def)=0 then raise exception 'COPY_WALLET_BUY_DRIFT'; end if;
 def:=replace(def,b1,'  g:=coalesce((select w.balance from rebirth_private.coin_copy_wallet w where w.user_id=f.id),0);');
 def:=replace(def,b2,'  update rebirth_private.coin_copy_wallet set balance=balance-amt,updated_at=now() where user_id=f.id;
  update rebirth_private.players set revision=revision+1,updated_at=now() where id=f.id;');
 execute def;
 -- 2) 카피 매도: 수령액을 카피 계좌로
 def:=pg_get_functiondef('rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure);
 if position(s1 in def)=0 then raise exception 'COPY_WALLET_SELL_DRIFT'; end if;
 def:=replace(def,s1,'  insert into rebirth_private.coin_copy_wallet as w(user_id,balance,updated_at) values(f.user_id,v_payout,now())
  on conflict(user_id) do update set balance=w.balance+excluded.balance,updated_at=now();
  update rebirth_private.players set revision=revision+1,updated_at=now() where id=f.user_id;
  v_n:=v_n+1;');
 execute def;
 -- 3) 카피 종료 버튼: 잔액 환급
 def:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 if position(c1 in def)=0 then raise exception 'COPY_WALLET_STOP_DRIFT'; end if;
 execute replace(def,c1,c1||'
   perform rebirth_private.coin_copy_wallet_refund(u);');
 -- 4) 직접 매도로 카피 종료: 잔액 환급
 def:=pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure);
 if position(i1 in def)=0 then raise exception 'COPY_WALLET_INVEST_DRIFT'; end if;
 execute replace(def,i1,i1||'perform rebirth_private.coin_copy_wallet_refund(u);');
 -- 5) 상태에 카피 계좌 잔액
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position(st in def)=0 or position('copyWallet' in def)>0 then raise exception 'COPY_WALLET_STATUS_DRIFT'; end if;
 execute replace(def,st,'''copyWallet'',coalesce((select w.balance from rebirth_private.coin_copy_wallet w where w.user_id=u),0),'||st);
end $m$;
