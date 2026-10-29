-- 2026-10-29: 카피 트레이딩 인원 제한. 한 유저를 카피할 수 있는 사람은 최대 3명.
-- 신청은 전역 코인 잠금(71823081) 안에서 검사하므로 동시 신청으로 4명이 되는 일은 없다.
-- 상태에 maxCopiers(3)를 넣어 화면에서 꽉 찬 유저의 신청 버튼을 막는다.
do $m$
declare def text;
 a text:='if exists(select 1 from rebirth_private.coin_copy where follower=p_leader) then raise exception ''COPY_LEADER_IS_COPYING''; end if;';
 b text:='''minGold'',10000000,';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 if position('COPY_LEADER_FULL' in def)=0 then
  if position(a in def)=0 then raise exception 'COPY_LIMIT_DRIFT'; end if;
  execute replace(def,a,a||'
   if (select count(*) from rebirth_private.coin_copy where leader=p_leader)>=3 then raise exception ''COPY_LEADER_FULL''; end if;');
 end if;
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position('maxCopiers' in def)=0 then
  if position(b in def)=0 then raise exception 'COPY_LIMIT_STATUS_DRIFT'; end if;
  execute replace(def,b,b||'''maxCopiers'',3,');
 end if;
end $m$;
