-- 2026-11-04 연결 지연 최적화
-- 1) 협동 로비 목록(coopList) 응답에서 플레이어 전체 state(최대 140KB)를 빼고 방 목록만 보낸다.
do $m$
declare def text; before text; after text;
begin
 select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) into def;
 before:=$b$  ||case when coalesce((p->>'compact')::boolean,false) and r.id is not null and r.world->>'status' in ('fighting','won') and jsonb_array_length(events)=0 and not key_charged
     then '{"stateUnchanged":true}'::jsonb else jsonb_build_object('state',actor.state) end$b$;
 after:=$a$  ||case when (coalesce((p->>'compact')::boolean,false) and r.id is not null and r.world->>'status' in ('fighting','won') and jsonb_array_length(events)=0 and not key_charged)
     or (coalesce((p->>'listOnly')::boolean,false) and r.id is null and action in ('read','list') and jsonb_array_length(events)=0)
     then '{"stateUnchanged":true}'::jsonb else jsonb_build_object('state',actor.state) end$a$;
 if position(before in def)=0 then raise exception 'COOP_STATE_CLAUSE_NOT_FOUND';end if;
 execute replace(def,before,after);
end $m$;

-- 2) 저장(commit)마다 state 전체를 텍스트로 두 번 직렬화하던 크기 검사를 보통 경우 한 번으로.
do $m$
declare def text; before text; after text;
begin
 select pg_get_functiondef('rebirth_private.commit_state(uuid,uuid,uuid,bigint,uuid,jsonb,jsonb,jsonb)'::regprocedure) into def;
 before:=$b$ if octet_length((p_state-'battle')::text)>524288 or octet_length(p_state::text)>655360 then$b$;
 after:=$a$ if octet_length(p_state::text)>524288 and (octet_length((p_state-'battle')::text)>524288 or octet_length(p_state::text)>655360) then$a$;
 if position(before in def)=0 then raise exception 'COMMIT_SIZE_CLAUSE_NOT_FOUND';end if;
 execute replace(def,before,after);
end $m$;

-- 3) receipts(요청 재전송 영수증)는 7일만 보관. 55만 행·262MB까지 쌓여 autovacuum/ANALYZE가 2분씩 I/O를 먹고 있었다.
create or replace function rebirth_private.cleanup_old_receipts() returns integer
language sql security definer set search_path to '' as $f$
 with d as (select user_id,request_id from rebirth_private.receipts where created_at<now()-interval '7 days' limit 20000),
 del as (delete from rebirth_private.receipts r using d where r.user_id=d.user_id and r.request_id=d.request_id returning 1)
 select count(*)::int from del;
$f$;
create index if not exists receipts_created_at on rebirth_private.receipts(created_at);
select cron.schedule('rebirth-receipts-cleanup','23 * * * *','select rebirth_private.cleanup_old_receipts()');
