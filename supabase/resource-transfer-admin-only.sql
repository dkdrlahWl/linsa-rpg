DO $patch$
DECLARE definition text; anchor text := 'u:=ringu_private.require_session(false);';
BEGIN
 definition := pg_get_functiondef('public.ringu_resource_transfer(text,uuid,numeric,uuid,text)'::regprocedure);
 IF position('RESOURCE_TRANSFER_ADMIN_ONLY' in definition)>0 THEN RETURN; END IF;
 IF position(anchor in definition)=0 THEN RAISE EXCEPTION 'Resource transfer function changed; patch stopped'; END IF;
 definition := replace(definition,anchor,anchor || E'\n if p_action=''send'' and p_resource in (''essence'',''transcendStone'') and not exists(select 1 from ringu_private.admin_accounts where account_id=u) then raise exception ''RESOURCE_TRANSFER_ADMIN_ONLY: 정수·초월석 송금은 관리자만 가능합니다.'';end if;');
 EXECUTE definition;
END $patch$;