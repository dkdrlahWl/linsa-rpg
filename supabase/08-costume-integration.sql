-- Costume purchase/save compatibility. Legacy combat/reward validation is NOT upgraded here.
-- Keep essence_authoritative=false: ordinary legacy economy remains client-trusted.
begin;
alter table ringu_private.costume_release add column if not exists purchases_enabled boolean not null default false;
create or replace function public.ringu_costume(p_action text default 'status',p_id text default null,p_request_id uuid default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid; a ringu_private.accounts%rowtype; product ringu_private.costume_catalog%rowtype;
 receipt ringu_private.costume_receipts%rowtype; balance bigint; charge bigint:=0;
 owned jsonb; selected text; bonus integer; ready boolean; admin_floor bigint:=0;
begin
 if p_action is null or p_action not in ('status','buy','equip') then raise exception 'INVALID_ACTION'; end if;
 -- Acquires the same account row lock as ordinary saves, enforcing newest login.
 u:=ringu_private.require_session(false);
 select * into a from ringu_private.accounts where id=u for update;
 select purchases_enabled into ready from ringu_private.costume_release where singleton;
 if p_action<>'status' then
  -- Purchase availability is distinct from full legacy economy authority.
  if not coalesce(ready,false) then raise exception 'COSTUME_RELEASE_NOT_READY'; end if;
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED'; end if;
  select * into receipt from ringu_private.costume_receipts where account_id=u and request_id=p_request_id;
  if found then
   if receipt.action<>p_action or receipt.costume_id is distinct from p_id then raise exception 'REQUEST_ID_REUSED'; end if;
   -- Same request returns current authoritative status, never charges twice.
  else
   if p_revision is null or p_revision<>a.revision then raise exception using errcode='40001',message='SAVE_CONFLICT'; end if;
   if p_action='buy' then
    select * into product from ringu_private.costume_catalog where id=p_id and enabled;
    if not found then raise exception 'UNKNOWN_COSTUME'; end if;
    if exists(select 1 from ringu_private.costume_ownership where account_id=u and costume_id=p_id) then raise exception 'ALREADY_OWNED'; end if;
    balance:=greatest(0,coalesce((a.state->>'essence')::bigint,0));
    if balance<product.price then raise exception 'INSUFFICIENT_ESSENCE'; end if;
    if to_regclass('ringu_private.admin_accounts') is not null then
     execute 'select currency_floor from ringu_private.admin_accounts where account_id=$1' into admin_floor using u;
    end if;
    charge:=case when coalesce(admin_floor,0)>0 then 0 else product.price end;
    insert into ringu_private.costume_ownership(account_id,costume_id) values(u,p_id);
    update ringu_private.accounts set state=jsonb_set(state,'{essence}',to_jsonb(balance-charge)),revision=revision+1,updated_at=now() where id=u returning * into a;
   else
    if p_id is not null and not exists(select 1 from ringu_private.costume_ownership where account_id=u and costume_id=p_id) then raise exception 'COSTUME_NOT_OWNED'; end if;
    insert into ringu_private.costume_selection(account_id,costume_id) values(u,p_id) on conflict(account_id) do update set costume_id=excluded.costume_id;
    update ringu_private.accounts set revision=revision+1,updated_at=now() where id=u returning * into a;
   end if;
   insert into ringu_private.costume_receipts(account_id,request_id,action,costume_id,paid) values(u,p_request_id,p_action,p_id,charge);
  end if;
 end if;
 select coalesce(jsonb_agg(o.costume_id order by o.costume_id),'[]'::jsonb),coalesce(sum(c.attack_percent),0) into owned,bonus
 from ringu_private.costume_ownership o join ringu_private.costume_catalog c on c.id=o.costume_id where o.account_id=u;
 select costume_id into selected from ringu_private.costume_selection where account_id=u;
 return jsonb_build_object('schemaVersion',1,'ready',coalesce(ready,false),'revision',a.revision,'essence',a.state->'essence',
 'costumeRevision',(select count(*) from ringu_private.costume_receipts where account_id=u),'owned',owned,'equipped',selected,'attackPercent',bonus,'products',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price,'attackPercent',attack_percent) order by id) from ringu_private.costume_catalog where enabled));
end $$;
revoke all on function public.ringu_costume(text,text,uuid,bigint) from public,anon;
grant execute on function public.ringu_costume(text,text,uuid,bigint) to authenticated;

do $$begin
 if to_regprocedure('public.ringu_account_before_costumes(text,jsonb,bigint)') is null then
  alter function public.ringu_account(text,jsonb,bigint) rename to ringu_account_before_costumes;
 end if;
 if to_regprocedure('public.ringu_ranking_before_costumes()') is null then
  alter function public.ringu_ranking() rename to ringu_ranking_before_costumes;
 end if;
end $$;
revoke all on function public.ringu_account_before_costumes(text,jsonb,bigint) from public,anon,authenticated;
revoke all on function public.ringu_ranking_before_costumes() from public,anon,authenticated;

create or replace function public.ringu_account(p_action text,p_state jsonb default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; result jsonb;
begin
 if p_action='save' then
  u:=ringu_private.require_session(false);
  if exists(select 1 from ringu_private.costume_receipts where account_id=u) then raise exception 'CLIENT_UPDATE_REQUIRED'; end if;
 end if;
 result:=public.ringu_account_before_costumes(p_action,p_state,p_revision);
 if p_action='ping' then return result; end if;
 return result||jsonb_build_object('costume',public.ringu_costume('status'));
end $$;
revoke all on function public.ringu_account(text,jsonb,bigint) from public,anon;
grant execute on function public.ringu_account(text,jsonb,bigint) to authenticated;

create or replace function public.ringu_save_costume(p_state jsonb,p_revision bigint,p_costume_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; current_costume_revision bigint;
begin
 u:=ringu_private.require_session(false);
 select count(*) into current_costume_revision from ringu_private.costume_receipts where account_id=u;
 if p_costume_revision is null or p_costume_revision<>current_costume_revision then
  raise exception using errcode='40001',message='SAVE_CONFLICT';
 end if;
 return public.ringu_account_before_costumes('save',p_state,p_revision);
end $$;
revoke all on function public.ringu_save_costume(jsonb,bigint,bigint) from public,anon;
grant execute on function public.ringu_save_costume(jsonb,bigint,bigint) to authenticated;

create or replace function public.ringu_ranking()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; decorated jsonb;
begin
 result:=public.ringu_ranking_before_costumes();
 select coalesce(jsonb_agg(entry.value||jsonb_build_object('costumeId',s.costume_id) order by entry.ordinality),'[]'::jsonb)
 into decorated from jsonb_array_elements(result->'rows') with ordinality entry
 left join ringu_private.costume_selection s on s.account_id=(entry.value->>'id')::uuid;
 return result||jsonb_build_object('rows',decorated);
end $$;
revoke all on function public.ringu_ranking() from public,anon;
grant execute on function public.ringu_ranking() to authenticated;
comment on function public.ringu_save_costume(jsonb,bigint,bigint) is 'CAS and costume receipt compatibility; not full combat/reward authority.';
commit;
select 'Costume save integration installed; release gate still closed' as result;
