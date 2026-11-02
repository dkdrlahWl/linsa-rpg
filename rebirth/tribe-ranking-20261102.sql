-- 2026-11-02 종족: 랭킹 전투력(combat_power)에 종족 효과 반영 + 랭킹 행에 tribe 추가.
-- 엔진 power()와 같은 규칙: 공격력·보스·HP·치명타 %는 잠재처럼 더하고, 치명타 피해는 배율에 더한다.
-- 함수 전체를 다시 쓰지 않고 현재 정의에서 필요한 곳만 바꿔 다시 만든다(바뀐 곳이 없으면 오류로 중단).
do $tribe$
declare d text; n text;
begin
 d:=pg_get_functiondef('rebirth_private.combat_power'::regproc);
 if position('t_cd' in d)=0 then
  n:=replace(d,' crit double precision; crit_damage double precision; cadence double precision;',' crit double precision; crit_damage double precision; cadence double precision;
 t_atk double precision; t_boss double precision; t_hp double precision; t_crit double precision; t_cd double precision;');
  if n=d then raise exception 'tribe patch: declare not found'; end if; d:=n;
  n:=replace(d,' gear_atk:=atk;',' -- tribe bonus
 select v.a,v.b,v.h,v.c,v.d into t_atk,t_boss,t_hp,t_crit,t_cd from (values (''dwarf'',1,0,8,0,0),(''halfling'',1,0,0,2,0),(''orc'',2,0,3,0,0),(''gnome'',0,3,0,0,2),(''goblin'',1,0,0,1,2),(''elf'',2,0,0,3,0),(''beastkin'',4,0,0,0,5),(''merfolk'',0,3,10,0,0),(''lizardfolk'',0,0,0,1,8),(''harpy'',0,3,0,2,0),(''demon'',3,8,-5,0,0),(''darkelf'',0,0,0,4,8),(''giant'',4,0,15,0,0),(''vampire'',5,5,-3,0,0),(''golem'',0,3,20,0,0),(''dragonkin'',6,8,0,0,5),(''celestial'',7,6,8,0,0),(''spirit'',4,0,0,5,10),(''jujak'',6,4,12,0,0),(''ancientdragon'',8,12,0,0,8),(''divine'',9,8,12,2,0)) v(id,a,b,h,c,d) where v.id=s->>''tribe'';
 atk_pct:=atk_pct+coalesce(t_atk,0);boss_pct:=boss_pct+coalesce(t_boss,0);hp_pct:=hp_pct+coalesce(t_hp,0);crit_pct:=crit_pct+coalesce(t_crit,0);
 gear_atk:=atk;');
  if n=d then raise exception 'tribe patch: bonus anchor not found'; end if; d:=n;
  n:=replace(d,'else ''[]''::jsonb end) x);','else ''[]''::jsonb end) x)+coalesce(t_cd,0)/100;');
  if n=d then raise exception 'tribe patch: crit damage anchor not found'; end if; d:=n;
  execute d;
 end if;
 d:=pg_get_functiondef('public.rebirth_rankings'::regproc);
 if position('as tribe' in d)=0 then
  n:=replace(d,'state->>''title'' as title,','state->>''title'' as title,coalesce(state->>''tribe'',''human'') as tribe,');
  if n=d then raise exception 'tribe patch: rankings select not found'; end if; d:=n;
  n:=replace(d,'"costumeId",title,level,xp,','"costumeId",title,tribe,level,xp,');
  if n=d then raise exception 'tribe patch: rankings output not found'; end if; d:=n;
  execute d;
 end if;
end $tribe$;
