-- 2026-10-29: 아레나 상대 갱신 주기 5분 → 1분 (arena_status / arena_commit 버킷 300초 → 60초)
do $m$
declare f text; def text; patched text;
begin
 foreach f in array array['rebirth_private.arena_status','rebirth_private.arena_commit'] loop
  select pg_get_functiondef(p.oid) into def from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname||'.'||p.proname=f;
  if position('floor(extract(epoch from now())/300)::bigint' in def)=0 then raise exception 'ARENA_PATCH_DRIFT %', f; end if;
  patched:=replace(replace(def,'floor(extract(epoch from now())/300)::bigint','floor(extract(epoch from now())/60)::bigint'),'to_timestamp((v_bucket+1)*300)','to_timestamp((v_bucket+1)*60)');
  execute patched;
 end loop;
end $m$;
