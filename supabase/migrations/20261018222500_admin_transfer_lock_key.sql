-- 관리자 송금: 잠재 잠금석(potentialLock)·던전 열쇠(dungeonKey)도 보낼 수 있게 허용 목록에 추가.
-- 운영 DB에는 2026-10-18 22:25(KST)에 적용됨.
do $$
declare d text;
begin
 d:=pg_get_functiondef('rebirth_private.admin_transfer'::regproc);
 if position('''potentialLock''' in d)=0 then
  d:=replace(d,'resource not in (''gold'',''scroll'',''fragment'',''cube'',''highCube'',''primeCube'',''diamond'')','resource not in (''gold'',''scroll'',''fragment'',''cube'',''highCube'',''primeCube'',''diamond'',''potentialLock'',''dungeonKey'')');
  execute d;
 end if;
end $$;
