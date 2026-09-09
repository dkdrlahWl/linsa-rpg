-- Preparatory migration only. Shop remains CLOSED until the essence ledger migration.
-- Does not replace existing account saves, wipe state, or migrate balances.
begin;
create table if not exists ringu_private.costume_catalog (
 id text primary key, name text not null, price bigint not null check(price>=0),
 attack_percent integer not null check(attack_percent between 0 and 100), enabled boolean not null default true
);
insert into ringu_private.costume_catalog(id,name,price,attack_percent) values
 ('kael','월영의 방랑자 · 카엘',300,5),('serin','월영의 방랑자 · 세린',300,5)
on conflict(id) do nothing;
create table if not exists ringu_private.costume_release (
 singleton boolean primary key default true check(singleton),
 essence_authoritative boolean not null default false
);
insert into ringu_private.costume_release values(true,false) on conflict do nothing;
create table if not exists ringu_private.costume_ownership (
 account_id uuid not null references auth.users(id), costume_id text not null references ringu_private.costume_catalog(id),
 acquired_at timestamptz not null default now(), primary key(account_id,costume_id)
);
create table if not exists ringu_private.costume_selection (
 account_id uuid primary key references auth.users(id), costume_id text,
 foreign key(account_id,costume_id) references ringu_private.costume_ownership(account_id,costume_id)
);
create table if not exists ringu_private.costume_receipts (
 account_id uuid not null references auth.users(id), request_id uuid not null,
 action text not null, costume_id text, paid bigint not null, created_at timestamptz not null default now(),
 primary key(account_id,request_id)
);
alter table ringu_private.costume_catalog enable row level security;
alter table ringu_private.costume_release enable row level security;
alter table ringu_private.costume_ownership enable row level security;
alter table ringu_private.costume_selection enable row level security;
alter table ringu_private.costume_receipts enable row level security;
revoke all on ringu_private.costume_catalog,ringu_private.costume_release,ringu_private.costume_ownership,ringu_private.costume_selection,ringu_private.costume_receipts from public,anon,authenticated;

create or replace function public.ringu_costume(p_action text default 'status',p_id text default null,p_request_id uuid default null,p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 u uuid; a ringu_private.accounts%rowtype; product ringu_private.costume_catalog%rowtype;
 receipt ringu_private.costume_receipts%rowtype; balance bigint; charge bigint:=0;
 owned jsonb; selected text; bonus integer; ready boolean;
begin
 if p_action is null or p_action not in ('status','buy','equip') then raise exception 'INVALID_ACTION'; end if;
 -- Acquires the same account row lock as ordinary saves, enforcing newest login.
 u:=ringu_private.require_session(false);
 select * into a from ringu_private.accounts where id=u for update;
 select essence_authoritative into ready from ringu_private.costume_release where singleton;
 if p_action<>'status' then
  -- Never open purchasing against the legacy client-writable essence balance.
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
    charge:=product.price;
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
 'owned',owned,'equipped',selected,'attackPercent',bonus,'products',(select jsonb_agg(jsonb_build_object('id',id,'name',name,'price',price,'attackPercent',attack_percent) order by id) from ringu_private.costume_catalog where enabled));
end $$;
revoke all on function public.ringu_costume(text,text,uuid,bigint) from public,anon;
grant execute on function public.ringu_costume(text,text,uuid,bigint) to authenticated;
commit;
select 'Costume foundation ready; purchasing remains closed pending authoritative essence migration' as result;
