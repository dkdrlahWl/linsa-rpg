-- 2026-11-02 종족 밸런스 조정(2차, 적용 완료) + 신화 성좌족 추가: 랭킹 전투력(combat_power)의 종족 수치표만 새 값으로 교체.
do $tribe$
declare d text; n text;
begin
 d:=pg_get_functiondef('rebirth_private.combat_power'::regproc);
 n:=regexp_replace(d,'\(values \(''dwarf''.*?\) v\(id,a,b,h,c,d\)','(values (''dwarf'',2,0,8,0,0),(''halfling'',1,0,0,2,0),(''orc'',3,0,3,0,0),(''gnome'',0,3,0,0,2),(''goblin'',1,0,0,1,2),(''elf'',2,0,0,3,0),(''beastkin'',3,0,0,0,5),(''merfolk'',0,5,10,0,0),(''lizardfolk'',0,0,0,1,6),(''harpy'',0,3,0,2,0),(''demon'',4,10,-5,0,0),(''darkelf'',0,0,0,3,6),(''giant'',6,4,15,0,0),(''vampire'',6,6,-3,0,0),(''golem'',0,12,20,0,0),(''dragonkin'',6,8,0,0,5),(''celestial'',8,8,8,0,0),(''spirit'',4,0,0,5,8),(''jujak'',8,8,12,0,0),(''ancientdragon'',8,12,0,0,8),(''divine'',10,10,12,3,0),(''starborn'',6,2,0,5,12)) v(id,a,b,h,c,d)');
 if n=d then raise exception 'tribe balance: values table not found'; end if;
 execute n;
end $tribe$;
