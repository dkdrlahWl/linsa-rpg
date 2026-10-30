-- 2026-10-31: 그랜드마스터 이상(2600점 이상 + 10위 이내)은 점수 근처가 아니라 내 순위보다 위에 있는
-- 상대(봇·유저)만 매칭한다. 바로 위 순위부터 최대 4명. 챔피언(1위)은 2위만 매칭.
-- 순위는 화면 순위표와 같은 기준(점수 내림차순, 동점은 id, 테스터 제외)으로 계산한다.
do $m$
declare def text;
 a text:='v_top1 boolean;';
 b text:='  with nearest as (';
 c text:='   select * from varied order by class_order,abs(score-v_target),md5(id||u::text||v_bucket::text) limit 4
  ) q;';
 board text:='with board as (
   select ''bot:''||b.id as id,b.name,b.class_id,b.score,''bot''::text as kind from rebirth_private.arena_bots b
   union all
   select ''player:''||ap.user_id,coalesce(p.state->>''name'',''모험가''),p.state->>''classId'',ap.score,''player''
   from rebirth_private.arena_players ap join rebirth_private.players p on p.id=ap.user_id
   where not rebirth_private.is_tester(ap.user_id) and ap.season_start=v_season and ap.score is not null and p.state is not null
  ), numbered as (select *,row_number() over(order by score desc,id)::integer as rk from board)';
begin
 def:=pg_get_functiondef('rebirth_private.arena_status()'::regprocedure);
 if position(a in def)=0 or position(b in def)=0 or position(c in def)=0 or position('v_gm' in def)>0 then raise exception 'ARENA_GM_DRIFT'; end if;
 def:=replace(def,a,'v_top1 boolean; v_myrank integer; v_gm boolean;');
 def:=replace(def,b,'  '||board||'
  select rk into v_myrank from numbered where id=''player:''||u;
  v_gm:=v_target>=2600 and v_myrank between 1 and 10;
  if v_gm then
  '||board||'
  select coalesce(jsonb_agg(jsonb_build_object(''id'',id,''name'',name,''classId'',class_id,''score'',score,''kind'',kind,''used'',false) order by rk desc),''[]''::jsonb)
  into v_offers from (select * from numbered where case when v_myrank=1 then rk=2 else rk<v_myrank end order by rk desc limit 4) q;
  else
'||b);
 def:=replace(def,c,c||'
  end if;');
 execute def;
end $m$;
