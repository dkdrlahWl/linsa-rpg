-- 2026-10-29: 코인 포지션 절반 판매 + 카피 대상에서 관리자 숨김.
-- investSell args에 portion:'half'를 주면 수량 절반(내림)만 판다. 판 절반은 'sold' 행으로 따로 남고 나머지는 그대로 보유.
-- 카피 트레이딩: 리더가 절반 팔면 팔로워도 자기 포지션 절반을 판다. 팔로워가 직접 절반 팔아도 카피는 종료된다.

-- (이미 적용) 관리자 계정은 카피 후보에서 숨기고 카피 신청도 막는다.
do $m$
declare def text; a text:='coalesce(pl.state->>''isTester'',''false'')<>''true''';
 b text:='not exists(select 1 from rebirth_private.players where id=p_leader and state is not null)';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position('isAdmin' in def)=0 then
  if position(a in def)=0 then raise exception 'COPY_STATUS_DRIFT'; end if;
  execute replace(def,a,a||' and coalesce(pl.state->>''isAdmin'',''false'')<>''true''');
 end if;
 def:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 if position('isAdmin' in def)=0 then
  if position(b in def)=0 then raise exception 'COPY_START_DRIFT'; end if;
  execute replace(def,b,'not exists(select 1 from rebirth_private.players where id=p_leader and state is not null and coalesce(state->>''isAdmin'',''false'')<>''true'')');
 end if;
end $m$;

create or replace function rebirth_private.coin_copy_sell(p_leader uuid,p_coin integer,p_side text,p_leverage smallint,p_half boolean) returns void language plpgsql security definer set search_path='' as $$
declare f record; c rebirth_private.coin_market%rowtype; gross numeric; v_fee numeric; v_payout numeric; v_q numeric; v_a numeric;
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
   insert into rebirth_private.coin_positions(user_id,coin,side,amount,entry,quantity,leverage,status,opened_at,closed_at,payout,fee)
   values(f.user_id,f.coin,f.side,v_a,f.entry,v_q,f.leverage,'sold',f.opened_at,clock_timestamp(),v_payout,v_fee);
  else
   update rebirth_private.coin_positions set status='sold',closed_at=clock_timestamp(),payout=v_payout,fee=v_fee where id=f.id;
  end if;
  update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::numeric+v_payout)),revision=revision+1,updated_at=now() where id=f.user_id;
 end loop;
end $$;
revoke all on function rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean) from public,anon,authenticated;

do $m$
declare def text; p text;
 a1 text:='    gross:=greatest(0,pos.amount+pos.quantity*(c.price-pos.entry)*case when pos.side=''short'' then -1 else 1 end);';
 a2 text:='    result:=jsonb_build_object(''events'',jsonb_build_array(jsonb_build_object(''type'',''investSell'',''amount'',payout,''fee'',fee)));';
 a3 text:='    perform rebirth_private.coin_copy_sell(u,pos.coin,pos.side,pos.leverage);';
begin
 def:=pg_get_functiondef('rebirth_private.investment(text,jsonb,uuid)'::regprocedure);
 if (length(def)-length(replace(def,a1,'')))/length(a1)<>1 or position(a2 in def)=0 or position(a3 in def)=0 then raise exception 'INVESTMENT_HALF_DRIFT'; end if;
 p:=replace(def,a1,'    if coalesce(p_args->>''portion'',''all'') not in (''all'',''half'') then raise exception ''INVALID_INVESTMENT_PORTION'';end if;
    if p_args->>''portion''=''half'' then
     if pos.quantity<2 then raise exception ''INVESTMENT_HALF_TOO_SMALL'';end if;
     v_quantity:=floor(pos.quantity/2);amount:=floor(pos.amount*v_quantity/pos.quantity);
     update rebirth_private.coin_positions h set quantity=h.quantity-trade.v_quantity,amount=h.amount-trade.amount where h.id=pos.id;
     insert into rebirth_private.coin_positions(user_id,coin,side,amount,entry,quantity,leverage,status,opened_at,closed_at)
     values(u,pos.coin,pos.side,trade.amount,pos.entry,trade.v_quantity,pos.leverage,''sold'',pos.opened_at,v_now) returning * into pos;
    end if;
'||a1);
 p:=replace(p,a2,a2||'
    if p_args->>''portion''=''half'' then result:=jsonb_set(result,''{events,0,half}'',''true''::jsonb);end if;');
 p:=replace(p,a3,'    perform rebirth_private.coin_copy_sell(u,pos.coin,pos.side,pos.leverage,coalesce(p_args->>''portion'','''')=''half'');');
 execute p;
end $m$;
-- 이전 4인자 coin_copy_sell은 더 이상 호출되지 않는다(남겨 둠).
