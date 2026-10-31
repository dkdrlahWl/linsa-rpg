-- 2026-10-31: 리더의 카피 해산. 나를 카피 중인 유저를 전부 해제하고, 각자의 카피 계좌 잔액은 보유 골드로 돌려준다.
-- 리더에게 열린 포지션이 있으면 해산할 수 없다(팔로워 카피 포지션이 남아 고아가 되는 것을 막기 위해 먼저 정리).
do $m$
declare def text;
 a text:='if p_action not in (''status'',''start'',''stop'') then';
 b text:='  perform pg_advisory_xact_lock(71823081);
  if p_action=''stop'' then';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 if position(a in def)=0 or position(b in def)=0 or position('disband' in def)>0 then raise exception 'COPY_DISBAND_DRIFT'; end if;
 def:=replace(def,a,'if p_action not in (''status'',''start'',''stop'',''disband'') then');
 def:=replace(def,b,'  if p_action=''disband'' then
   perform 1 from rebirth_private.players where id in (select c.follower from rebirth_private.coin_copy c where c.leader=u) order by id for update;
  end if;
  perform pg_advisory_xact_lock(71823081);
  if p_action=''disband'' then
   if not exists(select 1 from rebirth_private.coin_copy where leader=u) then raise exception ''COPY_NO_FOLLOWERS''; end if;
   if exists(select 1 from rebirth_private.coin_positions where user_id=u and status=''open'') then raise exception ''COPY_DISBAND_OPEN_POSITIONS''; end if;
   perform rebirth_private.coin_copy_wallet_refund(c.follower) from rebirth_private.coin_copy c where c.leader=u;
   delete from rebirth_private.coin_copy where leader=u;
  elsif p_action=''stop'' then');
 execute def;
end $m$;
