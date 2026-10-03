CREATE OR REPLACE FUNCTION rebirth_private.commit_state(p_user uuid, p_session uuid, p_epoch uuid, p_revision bigint, p_request uuid, p_fingerprint jsonb, p_state jsonb, p_result jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p rebirth_private.players%rowtype; r rebirth_private.receipts%rowtype;
begin
 if not exists(select 1 from rebirth_private.release where epoch=p_epoch and (enabled or exists(select 1 from rebirth_private.players where id=p_user and preview_access))) then raise exception 'REBIRTH_MAINTENANCE'; end if;
 select * into p from rebirth_private.players where id=p_user for update;
 if not found or p.active_session is distinct from p_session or not exists(select 1 from auth.sessions where id=p_session and user_id=p_user) then raise exception 'SESSION_ENDED'; end if;
 if exists(select 1 from auth.sessions where user_id=p_user and (created_at,id)>(p.session_started,p_session)) then raise exception 'SESSION_REPLACED'; end if;
 select * into r from rebirth_private.receipts where user_id=p_user and request_id=p_request;
 if found then if r.fingerprint<>p_fingerprint then raise exception 'REQUEST_ID_REUSED'; end if; return r.result; end if;
 if p.revision<>p_revision then raise exception 'SAVE_CONFLICT'; end if;
 if p_state->>'version'<>'rebirth-1' or jsonb_typeof(p_state)<>'object' or octet_length((p_state-'battle')::text)>524288 or octet_length(p_state::text)>655360 then raise exception 'INVALID_STATE'; end if;
 update rebirth_private.players set state=p_state,revision=revision+1,updated_at=now() where id=p_user;
 if p_fingerprint->>'command'<>'sync' then
  insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(p_user,p_request,p_fingerprint,p_result);
 end if;
 return p_result;
end $function$
