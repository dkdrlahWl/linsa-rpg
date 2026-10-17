-- 링구의 탐험 열쇠: 파티원 누구든 상자를 처음 여는 순간 방장(keyOwner) 열쇠 1개 차감(판당 1회).
-- 상자 보상 저장 시 열쇠 개수는 서버 DB 값을 유지해, 클라이언트 상태로 차감이 되돌려지지 않게 한다.
do $mig$
declare d text:=pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure); n text:=d;
 a_old text:=$a$   if w->>'mode'='exploration' and (w->>'tier')::int<3 and w->>'status'='won' and w->>'keyOwner' is not null and not coalesce((w->>'keyConsumed')::boolean,false) then$a$;
 a_new text:=$a$   if action='open' and w->>'mode'='exploration' and (w->>'tier')::int<3 and w->>'status' in ('won','complete') and w->>'keyOwner' is not null and not coalesce((w->>'keyConsumed')::boolean,false) then$a$;
 b_old text:=$b$   if reward is null or st is null or reward->>'type'<>'coop' then raise exception 'COOP_INVALID_REWARD';end if;
   st:=(st-'coopRoom')||jsonb_build_object('hunting',true,'lastAt',ms,'lastReward',reward);$b$;
 b_new text:=$b$   if reward is null or st is null or reward->>'type'<>'coop' then raise exception 'COOP_INVALID_REWARD';end if;
   st:=(st-'coopRoom')||jsonb_build_object('hunting',true,'lastAt',ms,'lastReward',reward);
   if w->>'mode'='exploration' then st:=jsonb_set(st,'{materials,dungeonKey}',coalesce(actor.state->'materials'->'dungeonKey','0'::jsonb),true);end if;$b$;
begin
 if (length(n)-length(replace(n,a_old,'')))/length(a_old)<>1 or (length(n)-length(replace(n,b_old,'')))/length(b_old)<>1 then
  raise exception 'rebirth_coop_action exploration key patch did not match';
 end if;
 n:=replace(replace(n,a_old,a_new),b_old,b_new);
 execute n;
end $mig$;
