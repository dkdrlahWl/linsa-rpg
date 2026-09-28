-- Trusted administrator reserves and atomic, retry-safe ranking transfers.
create or replace function rebirth_private.admin_reserves() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.state is not null and exists(select 1 from auth.users where id=new.id and raw_app_meta_data->>'ringu_admin'='true') then
  new.state:=jsonb_set(jsonb_set(new.state,'{gold}','999999999999'::jsonb),'{materials}',
   coalesce(new.state->'materials','{}'::jsonb)||'{"scroll":999999999999,"fragment":999999999999,"cube":999999999999,"highCube":999999999999,"primeCube":999999999999}'::jsonb);
 end if;
 return new;
end $$;
revoke all on function rebirth_private.admin_reserves() from public,anon,authenticated;
drop trigger if exists admin_reserves on rebirth_private.players;
create trigger admin_reserves before insert or update of state on rebirth_private.players for each row execute function rebirth_private.admin_reserves();

create or replace function rebirth_private.admin_transfer(p_args jsonb,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid; recipient uuid; resource text; amount bigint; balance bigint; path text[];
 sender rebirth_private.players%rowtype; receiver rebirth_private.players%rowtype;
 receipt rebirth_private.receipts%rowtype; result jsonb;
 fingerprint jsonb:=jsonb_build_object('command','adminTransfer','args',p_args);
begin
 -- Share the market lock so opposing market/transfer writes lock players consistently.
 perform pg_advisory_xact_lock(71823001);
 actor:=rebirth_private.session_user();
 if not exists(select 1 from auth.users where id=actor and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'BETA_DISABLED'; end if;
 if p_request is null or jsonb_typeof(p_args) is distinct from 'object' then raise exception 'INVALID_TRANSFER'; end if;
 select * into receipt from rebirth_private.receipts where user_id=actor and request_id=p_request;
 if found then
  if receipt.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;
  select * into sender from rebirth_private.players where id=actor;
  return jsonb_build_object('state',sender.state,'revision',sender.revision,'result',receipt.result);
 end if;
 resource:=p_args->>'resource';
 if resource is null or resource not in ('gold','scroll','fragment','cube','highCube','primeCube') then raise exception 'INVALID_TRANSFER_RESOURCE'; end if;
 if jsonb_typeof(p_args->'amount') is distinct from 'number' or length(p_args->>'amount')>12 or coalesce(p_args->>'amount','')!~'^[1-9][0-9]*$' then raise exception 'INVALID_TRANSFER_AMOUNT'; end if;
 amount:=(p_args->>'amount')::bigint;
 if amount>999999999999 then raise exception 'INVALID_TRANSFER_AMOUNT'; end if;
 if coalesce(p_args->>'recipient','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 recipient:=(p_args->>'recipient')::uuid;
 if recipient=actor then raise exception 'INVALID_TRANSFER_SELF'; end if;
 select * into sender from rebirth_private.players where id=actor for update;
 if sender.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if sender.state->'battle'<>'null'::jsonb or nullif(sender.state->>'partyRoom','') is not null or nullif(sender.state->>'coopRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS'; end if;
 select * into receiver from rebirth_private.players where id=recipient for update;
 if not found or receiver.state->>'version' is distinct from 'rebirth-1' then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 if exists(select 1 from auth.users where id=recipient and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 path:=case when resource='gold' then array['gold'] else array['materials',resource] end;
 balance:=coalesce((receiver.state#>>path)::bigint,0);
 if balance<0 or balance+amount>9000000000000 then raise exception 'INVALID_TRANSFER_LIMIT'; end if;
 if coalesce((sender.state#>>path)::bigint,0)<amount then raise exception 'INSUFFICIENT_MATERIAL'; end if;
 -- Increment both revisions: in-flight saves retry instead of overwriting delivery.
 update rebirth_private.players set state=jsonb_set(state,path,to_jsonb((state#>>path)::bigint-amount)),revision=revision+1,updated_at=now() where id=actor returning * into sender;
 update rebirth_private.players set state=jsonb_set(case when resource='gold' then state else jsonb_set(state,'{materials}',coalesce(state->'materials','{}'::jsonb)) end,path,to_jsonb(balance+amount)),revision=revision+1,updated_at=now() where id=recipient;
 result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','adminTransfer','recipient',recipient,'recipientName',receiver.state->>'name','resource',resource,'amount',amount)));
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(actor,p_request,fingerprint,result);
 return jsonb_build_object('state',sender.state,'revision',sender.revision,'result',result);
end $$;
revoke all on function rebirth_private.admin_transfer(jsonb,uuid) from public,anon;
grant execute on function rebirth_private.admin_transfer(jsonb,uuid) to authenticated;
create or replace function public.rebirth_admin_transfer(p_args jsonb,p_request uuid) returns jsonb
language sql security invoker set search_path='' as $$select rebirth_private.admin_transfer(p_args,p_request)$$;
revoke all on function public.rebirth_admin_transfer(jsonb,uuid) from public,anon;
grant execute on function public.rebirth_admin_transfer(jsonb,uuid) to authenticated;

-- Add stable target IDs while preserving current live ranking computation.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.rebirth_rankings()'::regprocedure) into definition;
 if position('select "levelRank" as rank,' in definition)>0 then
  definition:=replace(definition,'select "levelRank" as rank,','select id,"levelRank" as rank,');
  execute definition;
 elsif position('select id,"levelRank" as rank,' in definition)=0 then
  raise exception 'RANKING_DEFINITION_CHANGED';
 end if;
end $$;

update rebirth_private.players p set state=p.state,revision=p.revision+1,updated_at=now()
where p.state is not null and exists(select 1 from auth.users u where u.id=p.id and u.raw_app_meta_data->>'ringu_admin'='true');
