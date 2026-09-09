-- Run AFTER 01-account-storage.sql. No old tables or player data are deleted.
-- Shared rooms run on database time when polled, not on a player's supplied clock.
begin;

create table if not exists ringu_private.rooms (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references auth.users(id),
  stage integer not null check(stage between 1 and 6),
  hp bigint not null, max_hp bigint not null,
  status text not null default 'waiting' check(status in ('waiting','running','won','lost','canceled')),
  created_at timestamptz not null default now(),
  started_at timestamptz, tick integer not null default 0
);
create table if not exists ringu_private.members (
  room_id uuid not null references ringu_private.rooms(id),
  account_id uuid not null references auth.users(id),
  name text not null, stats jsonb not null,
  damage bigint not null default 0,
  active boolean not null default true,
  seen_at timestamptz not null default now(),
  primary key(room_id,account_id)
);
create unique index if not exists ringu_one_active_room on ringu_private.members(account_id) where active;
create table if not exists ringu_private.rewards (
  room_id uuid not null references ringu_private.rooms(id),
  account_id uuid not null references auth.users(id),
  reward_day date not null,
  amount integer not null,
  claimed boolean not null default false,
  primary key(room_id,account_id)
);
create index if not exists ringu_reward_quota on ringu_private.rewards(account_id,reward_day);
alter table ringu_private.rooms enable row level security;
alter table ringu_private.members enable row level security;
alter table ringu_private.rewards enable row level security;
revoke all on ringu_private.rooms,ringu_private.members,ringu_private.rewards from public,anon,authenticated;

create or replace function ringu_private.n(v jsonb, cap numeric default 1000000000)
returns numeric language sql immutable set search_path='' as $$
  select case when jsonb_typeof(v)='number' then greatest(0,least(cap,v::numeric)) else 0 end
$$;

-- The existing save model trusts equipment ownership. These snapshots do not
-- make the entire game's economy authoritative; room timing/rewards ARE authoritative.
create or replace function ringu_private.stats(s jsonb)
returns jsonb language plpgsql stable set search_path='' as $$
declare p jsonb:=s->'remodelProfile'; e jsonb; o jsonb; c numeric:=0; d numeric:=100;
begin
  for e in select value from jsonb_array_elements(case when jsonb_typeof(p->'equipment')='array' then p->'equipment' else '[]'::jsonb end) limit 7 loop
    for o in select value from jsonb_array_elements(case when jsonb_typeof(e->'o')='array' then e->'o' else '[]'::jsonb end) limit 16 loop
      if o->>0='critChance' then c:=c+ringu_private.n(o->1,100); end if;
      if o->>0='critDamage' then d:=d+ringu_private.n(o->1,1000); end if;
    end loop;
  end loop;
  c:=least(95,least(75,c)+100*ringu_private.n(p#>'{pet,s,critRate}',1));
  d:=d+100*ringu_private.n(p#>'{pet,s,critDamage}',10);
  return jsonb_build_object('attack',greatest(50,floor(ringu_private.n(p->'power',100000000))), 'crit',c,'damage',d);
end $$;

create or replace function ringu_private.room_view(p_id uuid)
returns jsonb language sql stable set search_path='' as $$
  select jsonb_build_object('id',r.id,'host',r.host,'stage',r.stage,'hp',r.hp,'maxHp',r.max_hp,
    'reward',r.stage+1,'status',r.status,'tick',r.tick,
    'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.account_id,'name',m.name,
      'stats',m.stats,'damage',m.damage,'left',not m.active) order by (m.account_id=r.host) desc,m.account_id)
      from ringu_private.members m where m.room_id=r.id and (m.active or r.status<>'waiting')),'[]'::jsonb))
  from ringu_private.rooms r where r.id=p_id
$$;

create or replace function ringu_private.advance_rooms()
returns void language plpgsql set search_path='' as $$
declare r record; m record; t integer; due integer; hit bigint; health bigint; v_day date;
begin
  -- Caller holds the shared room advisory lock; no account rows are updated here.
  update ringu_private.rooms set status='canceled' where status='waiting' and created_at<now()-interval '10 minutes';
  update ringu_private.members mem set active=false from ringu_private.rooms room_row
    where mem.room_id=room_row.id and mem.active and room_row.status not in ('waiting','running');
  for r in select * from ringu_private.rooms where status='running' order by id loop
    health:=r.hp; due:=least(15,greatest(0,floor(extract(epoch from now()-r.started_at))::integer));
    t:=r.tick;
    while t<due and health>0 loop
      t:=t+1;
      for m in select * from ringu_private.members where room_id=r.id and active order by account_id loop
        if r.started_at + make_interval(secs=>t) > m.seen_at + interval '5 seconds' then continue; end if;
        if not exists(select 1 from ringu_private.accounts a join auth.sessions s on s.id=a.active_session and s.user_id=a.id where a.id=m.account_id) then continue; end if;
        hit:=floor(ringu_private.n(m.stats->'attack',100000000)*
          case when random()*100<ringu_private.n(m.stats->'crit',95) then 1+ringu_private.n(m.stats->'damage',10000)/100 else 1 end)::bigint;
        hit:=least(health,hit); health:=health-hit;
        update ringu_private.members set damage=damage+hit where room_id=r.id and account_id=m.account_id;
      end loop;
    end loop;
    update ringu_private.rooms set hp=health,tick=t,
      status=case when health=0 then 'won' when t=15 then 'lost' else 'running' end where id=r.id;
    if health=0 then
      v_day:=((r.started_at+make_interval(secs=>t)) at time zone 'Asia/Seoul')::date;
      for m in select * from ringu_private.members where room_id=r.id and active and damage>0 loop
        if (select count(*) from ringu_private.rewards where account_id=m.account_id and reward_day=v_day)<2 then
          insert into ringu_private.rewards(room_id,account_id,reward_day,amount)
            values(r.id,m.account_id,v_day,r.stage+1) on conflict do nothing;
        end if;
      end loop;
    end if;
    if health=0 or t=15 then update ringu_private.members set active=false where room_id=r.id; end if;
  end loop;
end $$;

create or replace function public.ringu_party(p_action text, p_id uuid default null, p_stage integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; r ringu_private.rooms%rowtype; s jsonb; v_id uuid; v_rooms jsonb; left_count integer;
begin
  if p_action is null or p_action not in ('list','poll','create','join','start','leave') then raise exception 'INVALID_ACTION'; end if;
  u:=ringu_private.require_session(false);
  perform pg_advisory_xact_lock(736492021);
  perform ringu_private.advance_rooms();
  select state into s from ringu_private.accounts where id=u;
  if p_action='create' then
    if p_stage is null or p_stage not between 1 and 6 then raise exception 'INVALID_STAGE'; end if;
    if exists(select 1 from ringu_private.members where account_id=u and active) then raise exception 'ALREADY_IN_ROOM'; end if;
    if (select count(*) from ringu_private.rooms where status in ('waiting','running'))>=50 then raise exception 'ROOM_LIMIT'; end if;
    insert into ringu_private.rooms(host,stage,hp,max_hp)
      values(u,p_stage,floor(300000*power(1.5,p_stage-1)),floor(300000*power(1.5,p_stage-1))) returning * into r;
    insert into ringu_private.members(room_id,account_id,name,stats) values(r.id,u,left(coalesce(s->>'playerName','모험가'),32),ringu_private.stats(s));
    v_id:=r.id;
  elsif p_action='list' then
    select room_id into v_id from ringu_private.members where account_id=u and active;
  else
    select * into r from ringu_private.rooms where id=p_id for update;
    if not found then raise exception 'ROOM_NOT_FOUND'; end if;
    v_id:=r.id;
    if p_action='join' then
      if r.status<>'waiting' or (select count(*) from ringu_private.members where room_id=r.id and active)>=2 then raise exception 'ROOM_FULL_OR_STARTED'; end if;
      if exists(select 1 from ringu_private.members where account_id=u and active) then raise exception 'ALREADY_IN_ROOM'; end if;
      insert into ringu_private.members(room_id,account_id,name,stats) values(r.id,u,left(coalesce(s->>'playerName','모험가'),32),ringu_private.stats(s))
        on conflict(room_id,account_id) do update set active=true,seen_at=now(),damage=0,name=excluded.name,stats=excluded.stats;
    else
      if not exists(select 1 from ringu_private.members where room_id=r.id and account_id=u) then raise exception 'NOT_A_MEMBER'; end if;
      if p_action='start' then
        if r.host<>u or r.status<>'waiting' then raise exception 'HOST_ONLY'; end if;
        if exists(select 1 from ringu_private.members where room_id=r.id and active and seen_at<now()-interval '10 seconds') then raise exception 'MEMBER_DISCONNECTED'; end if;
        update ringu_private.members m set stats=ringu_private.stats(a.state),seen_at=now()
          from ringu_private.accounts a where m.room_id=r.id and m.active and a.id=m.account_id;
        update ringu_private.rooms set status='running',started_at=now() where id=r.id;
      elsif p_action='leave' then
        update ringu_private.members set active=false where room_id=r.id and account_id=u;
        if (r.status='waiting' and r.host=u) or not exists(select 1 from ringu_private.members where room_id=r.id and active) then
          update ringu_private.rooms set status='canceled' where id=r.id and status in ('waiting','running');
          update ringu_private.members set active=false where room_id=r.id;
        end if;
      end if;
    end if;
  end if;
  update ringu_private.members set seen_at=now() where room_id=v_id and account_id=u and active;
  select coalesce(jsonb_agg(ringu_private.room_view(x.id)),'[]'::jsonb) into v_rooms
    from (select id from ringu_private.rooms where status='waiting' order by created_at desc limit 50) x;
  select greatest(0,2-count(*))::integer into left_count from ringu_private.rewards
    where account_id=u and reward_day=(now() at time zone 'Asia/Seoul')::date;
  return jsonb_build_object('room',ringu_private.room_view(v_id),'rooms',v_rooms,'remaining',left_count,
    'pending',(select coalesce(sum(amount),0) from ringu_private.rewards where account_id=u and not claimed));
end $$;

create or replace function public.ringu_claim_party(p_revision bigint)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; a ringu_private.accounts%rowtype; award bigint;
begin
  u:=ringu_private.require_session(false);
  select * into a from ringu_private.accounts where id=u;
  if p_revision is null or a.revision<>p_revision then raise exception using errcode='40001',message='SAVE_CONFLICT'; end if;
  perform pg_advisory_xact_lock(736492021);
  select coalesce(sum(amount),0) into award from ringu_private.rewards where account_id=u and not claimed;
  if award>0 then
    update ringu_private.accounts set state=jsonb_set(coalesce(state,'{}'::jsonb),'{transcendStone}',to_jsonb(ringu_private.n(state->'transcendStone',9000000000000)+award)),revision=revision+1,updated_at=now()
      where id=u returning * into a;
    update ringu_private.rewards set claimed=true where account_id=u and not claimed;
  end if;
  return jsonb_build_object('revision',a.revision,'state',a.state,'stoneAward',award);
end $$;

create or replace function public.ringu_ranking()
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; result jsonb;
begin
  u:=ringu_private.require_session(false);
  select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'name',left(coalesce(a.state->>'playerName','모험가'),32),
    'power',ringu_private.n(a.state#>'{remodelProfile,power}',100000000),
    'tower',ringu_private.n(a.state->'towerCleared',30),
    'gender',case when a.state->>'playerGender'='female' then 'female' else 'male' end,
    'equippedAura',coalesce(a.state->'equippedAura','-1'::jsonb),
    'hideHelmet',true,'equipment',coalesce((select jsonb_agg(jsonb_build_object(
      's',left(e->>'s',24),'n',left(e->>'n',80),'r',ringu_private.n(e->'r',6),
      'e',ringu_private.n(e->'e',15),'t',ringu_private.n(e->'t',3),'a',ringu_private.n(e->'a',100000000)))
      from (select value e from jsonb_array_elements(case when jsonb_typeof(a.state#>'{remodelProfile,equipment}')='array' then a.state#>'{remodelProfile,equipment}' else '[]'::jsonb end) limit 7) gear),'[]'::jsonb)
    ) order by ringu_private.n(a.state#>'{remodelProfile,power}',100000000) desc),'[]'::jsonb) into result
    from (select * from ringu_private.accounts where coalesce(state->>'rankingHidden','false')<>'true'
      order by ringu_private.n(state#>'{remodelProfile,power}',100000000) desc limit 200) a;
  return jsonb_build_object('rows',result);
end $$;

revoke all on function ringu_private.n(jsonb,numeric),ringu_private.stats(jsonb),ringu_private.room_view(uuid),ringu_private.advance_rooms() from public,anon,authenticated;
revoke all on function public.ringu_party(text,uuid,integer),public.ringu_claim_party(bigint),public.ringu_ranking() from public,anon;
grant execute on function public.ringu_party(text,uuid,integer),public.ringu_claim_party(bigint),public.ringu_ranking() to authenticated;
commit;
select 'Ringu ranking and party ready (stage 2)' as result;
