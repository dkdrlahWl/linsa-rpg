DO $patch$
DECLARE definition text; anchor text := 'u:=ringu_private.require_session(false);';
BEGIN
 definition := pg_get_functiondef('public.ringu_gold_transfer(text,uuid,numeric,uuid)'::regprocedure);
 IF position('GOLD_TRANSFER_BLOCKED_KIYA' in definition)>0 THEN RETURN; END IF;
 IF position(anchor in definition)=0 THEN RAISE EXCEPTION 'Gold transfer function changed; patch stopped'; END IF;
 definition := replace(definition,anchor,anchor || E'\n if p_action=''send'' and u=''bdfcb382-f71c-49cb-9228-637eb75f77aa''::uuid then raise exception ''GOLD_TRANSFER_BLOCKED_KIYA: 골드 송금이 제한된 계정입니다.'';end if;');
 EXECUTE definition;
END $patch$;