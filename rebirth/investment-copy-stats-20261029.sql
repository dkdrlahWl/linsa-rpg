-- 2026-10-29: 카피 트레이딩 승률. 리더가 팔아서 팔로워 포지션이 "카피로" 같이 팔린 경우만 기록한다.
-- 팔로워가 직접 판 것·청산된 것은 기록하지 않는다. 리더 판매 1번 = 1건, 팔로워들의 손익 합이 +면 익절, 아니면 손절.
create table if not exists rebirth_private.coin_copy_trades(
 id bigint generated always as identity primary key,
 leader uuid not null references auth.users(id) on delete cascade,
 coin integer not null, side text not null, leverage smallint not null, half boolean not null default false,
 followers integer not null, pnl numeric not null,
 closed_at timestamptz not null default clock_timestamp());
create index if not exists coin_copy_trades_leader on rebirth_private.coin_copy_trades(leader);
alter table rebirth_private.coin_copy_trades enable row level security;
revoke all on rebirth_private.coin_copy_trades from public,anon,authenticated;

create or replace function rebirth_private.coin_copy_sell(p_leader uuid,p_coin integer,p_side text,p_leverage smallint,p_half boolean) returns void language plpgsql security definer set search_path='' as $$
declare f record; c rebirth_private.coin_market%rowtype; gross numeric; v_fee numeric; v_payout numeric; v_q numeric; v_a numeric; v_n integer:=0; v_pnl numeric:=0;
begin
 select * into c from rebirth_private.coin_market where id=p_coin;
 for f in select h.*,pl.state as pstate from rebirth_private.coin_positions h join rebirth_private.coin_copy cc on cc.follower=h.user_id join rebirth_private.players pl on pl.id=h.user_id
  where cc.leader=p_leader and h.status='open' and h.coin=p_coin and h.side=p_side and h.leverage=p_leverage order by h.user_id for update of h,pl loop
  if p_half then v_q:=floor(f.quantity/2); if v_q<1 then continue; end if; v_a:=floor(f.amount*v_q/f.quantity);
  else v_q:=f.quantity; v_a:=f.amount; end if;
  gross:=greatest(0,v_a+v_q*(c.price-f.entry)*case when f.side='short' then -1 else 1 end);
  v_fee:=ceil(gross*.01*f.leverage);v_payout:=greatest(0,floor(gross-v_fee));
  if coalesce((f.pstate->>'gold')::numeric,0)+v_payout>9007199254740991 then continue; end if;
  if p_half then
   update rebirth_private.coin_positions h set quantity=h.quantity-v_q,amount=h.amount-v_a where h.id=f.id;
   insert into rebirth_private.coin_positions(user_id,coin,side,amount,entry,quantity,leverage,status,opened_at,closed_at,payout,fee,closed_reason)
   values(f.user_id,f.coin,f.side,v_a,f.entry,v_q,f.leverage,'sold',f.opened_at,clock_timestamp(),v_payout,v_fee,'copy');
  else
   update rebirth_private.coin_positions set status='sold',closed_at=clock_timestamp(),payout=v_payout,fee=v_fee,closed_reason='copy' where id=f.id;
  end if;
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric+v_payout)),revision=revision+1,updated_at=now() where id=f.user_id;
  v_n:=v_n+1; v_pnl:=v_pnl+(v_payout-v_a);
 end loop;
 if v_n>0 then
  insert into rebirth_private.coin_copy_trades(leader,coin,side,leverage,half,followers,pnl) values(p_leader,p_coin,p_side,p_leverage,p_half,v_n,v_pnl);
 end if;
end $$;
revoke all on function rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean) from public,anon,authenticated;

create or replace function rebirth_private.coin_copy_status(u uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'following',(select jsonb_build_object('id',c.leader,'name',pl.state->>'name','startedAt',c.started_at) from rebirth_private.coin_copy c join rebirth_private.players pl on pl.id=c.leader where c.follower=u),
  'followers',coalesce((select jsonb_agg(jsonb_build_object('id',c.follower,'name',pl.state->>'name','startedAt',c.started_at) order by c.started_at) from rebirth_private.coin_copy c join rebirth_private.players pl on pl.id=c.follower where c.leader=u),'[]'::jsonb),
  'myStats',(select jsonb_build_object('wins',count(*) filter (where t.pnl>0),'losses',count(*) filter (where t.pnl<=0)) from rebirth_private.coin_copy_trades t where t.leader=u),
  'minGold',10000000,
  'candidates',coalesce((select jsonb_agg(jsonb_build_object('id',pl.id,'name',pl.state->>'name',
     'open',(select count(*) from rebirth_private.coin_positions h where h.user_id=pl.id and h.status='open'),
     'copiers',(select count(*) from rebirth_private.coin_copy c where c.leader=pl.id),
     'copying',exists(select 1 from rebirth_private.coin_copy c where c.follower=pl.id),
     'wins',(select count(*) from rebirth_private.coin_copy_trades t where t.leader=pl.id and t.pnl>0),
     'losses',(select count(*) from rebirth_private.coin_copy_trades t where t.leader=pl.id and t.pnl<=0)) order by pl.state->>'name')
   from rebirth_private.players pl where pl.id<>u and pl.state is not null and coalesce(pl.state->>'isTester','false')<>'true' and coalesce(pl.state->>'isAdmin','false')<>'true'),'[]'::jsonb))
$$;
revoke all on function rebirth_private.coin_copy_status(uuid) from public,anon,authenticated;
