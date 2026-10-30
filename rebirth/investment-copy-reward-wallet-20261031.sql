-- 2026-10-31: 카피 리더 보상(팔로워 수익의 5%)을 바로 골드로 넣지 않고 리더 보상함에 쌓는다.
-- 리더가 카피 창의 [수령] 버튼으로 한 번에 받는다. 이미 지급된 보상(소급분 포함)은 그대로 둔다.
create table if not exists rebirth_private.coin_copy_reward_wallet(
 leader uuid primary key,
 pending numeric not null default 0 check (pending>=0),
 claimed_total numeric not null default 0 check (claimed_total>=0),
 updated_at timestamptz not null default now());
revoke all on table rebirth_private.coin_copy_reward_wallet from public,anon,authenticated;

do $m$
declare def text;
 a text:=' if v_reward>0 then
  update rebirth_private.players set state=jsonb_set(state,''{gold}'',to_jsonb(least(9007199254740991,coalesce((state->>''gold'')::numeric,0)+v_reward))),revision=revision+1,updated_at=now() where id=p_leader;
 end if;';
 b text:='''myMinGold'',';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure);
 if position(a in def)=0 then raise exception 'COPY_WALLET_SELL_DRIFT'; end if;
 execute replace(def,a,' if v_reward>0 then
  insert into rebirth_private.coin_copy_reward_wallet as w(leader,pending,updated_at) values(p_leader,v_reward,now())
  on conflict(leader) do update set pending=w.pending+excluded.pending,updated_at=now();
 end if;');
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position(b in def)=0 or position('rewardPending' in def)>0 then raise exception 'COPY_WALLET_STATUS_DRIFT'; end if;
 execute replace(def,b,'''rewardPending'',coalesce((select w.pending from rebirth_private.coin_copy_reward_wallet w where w.leader=u),0),''rewardClaimed'',coalesce((select w.claimed_total from rebirth_private.coin_copy_reward_wallet w where w.leader=u),0),'||b);
end $m$;

create or replace function rebirth_private.coin_copy_reward_claim()
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare u uuid:=rebirth_private.session_user(); p rebirth_private.players%rowtype; w rebirth_private.coin_copy_reward_wallet%rowtype; amt numeric;
begin
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 select * into w from rebirth_private.coin_copy_reward_wallet where leader=u for update;
 amt:=least(coalesce(w.pending,0),greatest(0,9007199254740991-coalesce((p.state->>'gold')::numeric,0)));
 if amt<=0 then raise exception 'COPY_REWARD_EMPTY'; end if;
 update rebirth_private.coin_copy_reward_wallet set pending=pending-amt,claimed_total=claimed_total+amt,updated_at=now() where leader=u;
 update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(coalesce((state->>'gold')::numeric,0)+amt)),revision=revision+1,updated_at=now() where id=u;
 return rebirth_private.coin_copy_status(u)||jsonb_build_object('serverNow',clock_timestamp(),'claimed',amt);
end $f$;
revoke all on function rebirth_private.coin_copy_reward_claim() from public,anon;
grant execute on function rebirth_private.coin_copy_reward_claim() to authenticated;

create or replace function public.rebirth_coin_copy_claim()
returns jsonb language sql set search_path to '' as $f$select rebirth_private.coin_copy_reward_claim()$f$;
revoke all on function public.rebirth_coin_copy_claim() from public,anon;
grant execute on function public.rebirth_coin_copy_claim() to authenticated;
