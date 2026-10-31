-- 2026-10-31: 리더가 나를 카피 중인 유저의 카피 계좌 잔액·포지션 증거금을 볼 수 있게 상태에 포함.
do $m$
declare def text;
 a text:='''followers'',coalesce((select jsonb_agg(jsonb_build_object(''id'',c.follower,''name'',pl.state->>''name'',''startedAt'',c.started_at)';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position(a in def)=0 then raise exception 'COPY_WALLET_VIEW_DRIFT'; end if;
 execute replace(def,a,'''followers'',coalesce((select jsonb_agg(jsonb_build_object(''id'',c.follower,''name'',pl.state->>''name'',''startedAt'',c.started_at,''wallet'',coalesce((select w.balance from rebirth_private.coin_copy_wallet w where w.user_id=c.follower),0),''margin'',coalesce((select sum(h.amount) from rebirth_private.coin_positions h where h.user_id=c.follower and h.status=''open''),0))');
end $m$;
