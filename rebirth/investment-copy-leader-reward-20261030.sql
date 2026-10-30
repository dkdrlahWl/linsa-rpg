-- 2026-10-30: 카피 리더 보상. 리더 매도로 카피 포지션이 수익으로 닫힐 때마다
-- 팔로워 순수익(수령액-증거금)의 1%를 리더에게 새로 지급한다(팔로워 몫에서 빼지 않음).
-- 손실·청산은 보상 없음. 지금까지 수익난 카피 거래분은 같은 기준으로 한 번에 소급 지급.
alter table rebirth_private.coin_copy_trades add column if not exists leader_reward numeric not null default 0;
create table if not exists rebirth_private.coin_copy_reward_backfill(
 leader uuid primary key, amount numeric not null, positions integer not null, granted_at timestamptz not null default now());
do $m$
declare def text;
 a text:='  v_n:=v_n+1; v_pnl:=v_pnl+(v_payout-v_a);';
 b text:=' if v_n>0 then
  insert into rebirth_private.coin_copy_trades(leader,coin,side,leverage,half,followers,pnl) values(p_leader,p_coin,p_side,p_leverage,p_half,v_n,v_pnl);';
 c text:='    perform rebirth_private.coin_copy_sell(u,pos.coin,pos.side,pos.leverage,coalesce(p_args->>''portion'','''')=''half'');';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure);
 if position(a in def)=0 or position(b in def)=0 or position('v_pnl numeric:=0;' in def)=0 then raise exception 'COPY_REWARD_SELL_DRIFT'; end if;
 def:=replace(def,'v_pnl numeric:=0;','v_pnl numeric:=0; v_reward numeric:=0;');
 def:=replace(def,a,a||'
  if v_payout>v_a then v_reward:=v_reward+floor((v_payout-v_a)*.01); end if;');
 def:=replace(def,b,' if v_reward>0 then
  update rebirth_private.players set state=jsonb_set(state,''{gold}'',to_jsonb(least(9007199254740991,coalesce((state->>''gold'')::numeric,0)+v_reward))),revision=revision+1,updated_at=now() where id=p_leader;
 end if;
 if v_n>0 then
  insert into rebirth_private.coin_copy_trades(leader,coin,side,leverage,half,followers,pnl,leader_reward) values(p_leader,p_coin,p_side,p_leverage,p_half,v_n,v_pnl,v_reward);');
 execute def;
 -- 리더 화면 골드가 보상을 바로 반영하도록 카피 매도 처리 뒤 리더 행을 다시 읽는다.
 def:=pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure);
 if position(c in def)=0 then raise exception 'COPY_REWARD_INVEST_DRIFT'; end if;
 execute replace(def,c,c||'
    select * into p from rebirth_private.players where id=u;');
end $m$;
-- 소급 지급: 지금까지 카피로 판매된 수익 거래마다 순수익의 1%.
with r as (
 select copy_leader leader, sum(floor((payout-amount)*.01)) amount, count(*)::integer positions
 from rebirth_private.coin_positions where copy_leader is not null and status='sold' and payout>amount group by copy_leader
), ins as (
 insert into rebirth_private.coin_copy_reward_backfill(leader,amount,positions) select leader,amount,positions from r where amount>0
 on conflict(leader) do nothing returning leader,amount
)
update rebirth_private.players p set state=jsonb_set(p.state,'{gold}',to_jsonb(least(9007199254740991,coalesce((p.state->>'gold')::numeric,0)+ins.amount))),revision=revision+1,updated_at=now()
from ins where p.id=ins.leader;
