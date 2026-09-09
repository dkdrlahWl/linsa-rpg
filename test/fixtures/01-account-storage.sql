-- Ringu Reforged: stage 1, account storage and newest-session enforcement.
-- Run in the Supabase SQL Editor as postgres. Existing game tables are untouched.
-- This migration does not deploy the frontend or the co-op room engine.
begin;

create schema if not exists ringu_private;
revoke all on schema ringu_private from public, anon, authenticated;

create table if not exists ringu_private.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  state jsonb,
  revision bigint not null default 0 check (revision >= 0),
  active_session uuid,
  session_started timestamptz,
  updated_at timestamptz not null default now(),
  check (state is null or jsonb_typeof(state) = 'object')
);
alter table ringu_private.accounts enable row level security;
revoke all on ringu_private.accounts from public, anon, authenticated;

-- Every RPC checks the real Auth session, not a client-supplied account ID.
create or replace function ringu_private.require_session(p_activate boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_session uuid := nullif(auth.jwt()->>'session_id','')::uuid;
  v_started timestamptz;
  v_account ringu_private.accounts%rowtype;
begin
  if v_user is null or v_session is null then
    raise exception using errcode='28000', message='LOGIN_REQUIRED';
  end if;
  select created_at into v_started from auth.sessions
    where id=v_session and user_id=v_user;
  if not found then
    raise exception using errcode='28000', message='SESSION_ENDED';
  end if;
  -- Even before the new browser calls activate, an older login cannot mutate.
  if exists(select 1 from auth.sessions s where s.user_id=v_user
      and (s.created_at,s.id) > (v_started,v_session)) then
    raise exception using errcode='28000', message='SESSION_REPLACED';
  end if;
  insert into ringu_private.accounts(id) values(v_user) on conflict do nothing;
  select * into v_account from ringu_private.accounts where id=v_user for update;
  if p_activate then
    -- Logging out of a newer login must not revive an older token.
    if v_account.session_started is not null and
       (v_started,v_session) < (v_account.session_started,v_account.active_session) then
      raise exception using errcode='28000', message='SESSION_REPLACED';
    end if;
    update ringu_private.accounts set active_session=v_session,session_started=v_started
      where id=v_user;
  elsif v_account.active_session is distinct from v_session then
    raise exception using errcode='28000', message='SESSION_REPLACED';
  end if;
  return v_user;
end $$;
revoke all on function ringu_private.require_session(boolean) from public,anon,authenticated;

create or replace function public.ringu_account(p_action text, p_state jsonb default null, p_revision bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid;
  v_account ringu_private.accounts%rowtype;
begin
  if p_action not in ('activate','load','save','ping') then
    raise exception using errcode='22023', message='INVALID_ACTION';
  end if;
  v_user := ringu_private.require_session(p_action='activate');
  select * into v_account from ringu_private.accounts where id=v_user;
  if p_action='save' then
    if p_state is null or jsonb_typeof(p_state)<>'object'
      or octet_length(p_state::text)>8388608 then
      raise exception using errcode='22023', message='INVALID_STATE';
    end if;
    if p_revision is null or p_revision<>v_account.revision then
      raise exception using errcode='40001', message='SAVE_CONFLICT';
    end if;
    update ringu_private.accounts set state=p_state,revision=revision+1,updated_at=now()
      where id=v_user returning * into v_account;
  end if;
  if p_action='ping' then return jsonb_build_object('ok',true); end if;
  return jsonb_build_object('account',jsonb_build_object('id',v_user),
    'revision',v_account.revision,'state',v_account.state);
end $$;
revoke all on function public.ringu_account(text,jsonb,bigint) from public,anon;
grant execute on function public.ringu_account(text,jsonb,bigint) to authenticated;

-- This first stage stores existing game state with account isolation and CAS.
-- It is NOT server-side validation of gold, equipment or combat calculations.
comment on function public.ringu_account(text,jsonb,bigint) is
  'Ringu account-isolated state API. Requires newest Supabase Auth session. Legacy economy remains client-trusted.';

commit;
select 'Ringu account storage ready (stage 1)' as result;
