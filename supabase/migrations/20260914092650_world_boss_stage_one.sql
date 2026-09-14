-- WB1: isolated, server-owned encounter state. No client inventory/currency writes.
begin;
create table ringu_private.wb_unlock (
 singleton boolean primary key default true check(singleton), unlocked_at timestamptz
);
insert into ringu_private.wb_unlock values(true,null);
create table ringu_private.wb_rooms (
 id uuid primary key default gen_random_uuid(), host uuid not null references auth.users(id),
 status text not null default 'waiting' check(status in ('waiting','running','won','lost','closed')),
 hp numeric not null default 4200000 check(hp between 0 and 4200000),
 created_at timestamptz not null default clock_timestamp(), started_at timestamptz, ended_at timestamptz,
 reason text, version bigint not null default 0, pattern integer not null default 0,
 round integer not null default 0, next_at timestamptz, waves jsonb not null default '[]',
 broadcast_at timestamptz not null default '-infinity'
);
create table ringu_private.wb_members (
 room_id uuid references ringu_private.wb_rooms(id) on delete cascade,
 account_id uuid references auth.users(id), joined_at timestamptz not null default clock_timestamp(),
 active boolean not null default true, present boolean not null default true, ready boolean not null default false,
 name text not null, gender text not null, costume text, attack numeric not null check(attack>=1),
 hp numeric not null check(hp>=0), damage numeric not null default 0,
 x integer not null default 3 check(x between 0 and 7), y integer not null default 6 check(y between 0 and 7),
 seq bigint not null default 0, packet bigint not null default 0, revived boolean not null default false,
 dead_at timestamptz, still_at timestamptz not null default clock_timestamp(),
 seen_at timestamptz not null default clock_timestamp(), accrued_at timestamptz not null default clock_timestamp(),
 background boolean not null default false, reward text not null default 'none', acknowledged_at timestamptz, left_at timestamptz,
 primary key(room_id,account_id)
);
create unique index wb_one_active on ringu_private.wb_members(account_id) where active;
create index wb_rooms_open on ringu_private.wb_rooms(status) where status in ('waiting','running');
create table ringu_private.wb_moves (
 room_id uuid, account_id uuid, seq bigint, x integer not null, y integer not null, arrived_at timestamptz not null,
 primary key(room_id,account_id,seq),
 foreign key(room_id,account_id) references ringu_private.wb_members(room_id,account_id) on delete cascade
);
create index wb_moves_time on ringu_private.wb_moves(room_id,account_id,arrived_at desc);
create table ringu_private.wb_hits (
 room_id uuid,account_id uuid,event text,damage integer not null,primary key(room_id,account_id,event),
 foreign key(room_id,account_id) references ringu_private.wb_members(room_id,account_id) on delete cascade
);
create table ringu_private.wb_rewards (
 room_id uuid references ringu_private.wb_rooms(id),account_id uuid references auth.users(id),
 week date not null, created_at timestamptz not null default clock_timestamp(),
 status text not null default 'pending' check(status in ('pending','paid')),
 primary key(room_id,account_id)
);
create index wb_reward_week on ringu_private.wb_rewards(account_id,week);
alter table ringu_private.wb_unlock enable row level security;
alter table ringu_private.wb_rooms enable row level security;
alter table ringu_private.wb_members enable row level security;
alter table ringu_private.wb_moves enable row level security;
alter table ringu_private.wb_hits enable row level security;
alter table ringu_private.wb_rewards enable row level security;
revoke all on ringu_private.wb_unlock,ringu_private.wb_rooms,ringu_private.wb_members,ringu_private.wb_moves,ringu_private.wb_hits,ringu_private.wb_rewards from public,anon,authenticated;

create function ringu_private.wb_week() returns date language sql stable set search_path='' as $$
 select date_trunc('week',clock_timestamp() at time zone 'Asia/Seoul')::date
$$;
create function ringu_private.wb_check_unlock() returns void language plpgsql security definer set search_path='' as $$
declare total numeric; exclusions uuid[]:='{}';
begin
 if exists(select 1 from ringu_private.wb_unlock where unlocked_at is not null) then return; end if;
 if to_regclass('ringu_private.admin_accounts') is not null then
  execute 'select coalesce(array_agg(account_id),''{}''::uuid[]) from ringu_private.admin_accounts' into exclusions;
 end if;
 select coalesce(sum(power),0) into total from (
  select ringu_private.n(state#>'{remodelProfile,power}',100000000) power from ringu_private.accounts
  where coalesce(state->>'rankingHidden','false')<>'true' and not(id=any(exclusions))
  order by power desc limit 200
 ) ranked;
 if total>=8000 then update ringu_private.wb_unlock set unlocked_at=clock_timestamp() where unlocked_at is null; end if;
end $$;
create function ringu_private.wb_unlock_trigger() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (new.state#>'{remodelProfile,power}') is distinct from (old.state#>'{remodelProfile,power}')
 or new.state->>'rankingHidden' is distinct from old.state->>'rankingHidden' then perform ringu_private.wb_check_unlock(); end if;
 return new;
end $$;
create trigger wb_ranking_unlock after update of state on ringu_private.accounts for each row execute function ringu_private.wb_unlock_trigger();
select ringu_private.wb_check_unlock();

-- Each wave reserves a one-step reachable safe cell for every living player.
-- A target tile is fixed when its red warning appears, never follows mid-warning.
create function ringu_private.wb_pattern(p_room uuid,p_pattern integer,p_round integer,p_start timestamptz)
returns jsonb language plpgsql security definer set search_path='' as $$
#variable_conflict use_variable
declare result jsonb:='[]'; tiles integer[]; safe integer[]; wave integer; waves integer;
 x integer;y integer;t integer;damage integer;delay_ms integer;offset_ms integer:=0;
 m record; candidate integer; axis integer:=floor(random()*8); horizontal boolean:=random()<.5;
begin
 waves:=case p_pattern when 6 then 2 when 7 then 8 when 8 then 3 when 9 then 4 when 10 then 3 when 11 then 3 else 1 end;
 for wave in 0..waves-1 loop
  tiles:='{}';safe:='{}';
  for m in select * from ringu_private.wb_members where room_id=p_room and present and hp>0 loop
   select n into candidate from generate_series(0,63) n
    where abs(n%8-m.x)+abs(n/8-m.y)=1 order by random() limit 1;
   safe:=array_append(safe,candidate);
  end loop;
  if p_pattern in (9,11) then
   while cardinality(array(select distinct unnest(safe))) < (case when p_pattern=9 then 12 else 8 end) loop
    safe:=array_append(safe,floor(random()*64)::integer);
   end loop;
  end if;
  for t in 0..63 loop
   x:=t%8;y:=t/8;
   if (case p_pattern
    when 1 then false
    when 2 then (x<2 or x>5) and (y<2 or y>5) and (x+y+axis)%2=0
    when 3 then case when horizontal then y=axis else x=axis end
    when 4 then exists(select 1 from ringu_private.wb_members where room_id=p_room and present and hp>0 and wb_members.x=x and wb_members.y=y)
    when 5 then x in (3,4) or y in (3,4)
    when 6 then (x+y)%2=wave
    when 7 then x=(axis+wave)%8
    when 8 then least(x,y,7-x,7-y)=wave
    when 9 then random()<.48
    when 10 then exists(select 1 from (select * from ringu_private.wb_members where room_id=p_room and present and hp>0 order by joined_at limit 5) p where abs(p.x-x)+abs(p.y-y)<=1)
    when 11 then true else false end) then tiles:=array_append(tiles,t); end if;
  end loop;
  if p_pattern=1 then select array_agg(n) into tiles from (select n from generate_series(0,63) n where not(n=any(safe)) order by random() limit 3) q; end if;
  select coalesce(array_agg(distinct n),'{}'::integer[]) into tiles from unnest(tiles) n where not(n=any(safe));
  -- Also reserve an escape within two steps from EVERY tile, including players
  -- who changed location during an earlier wave. 2 * 180ms < shortest 500ms warning.
  for t in 0..63 loop
   if not exists(select 1 from generate_series(0,63) n where not(n=any(tiles)) and abs(n%8-t%8)+abs(n/8-t/8)<=2) then
    tiles:=array_remove(tiles,t);
   end if;
  end loop;
  damage:=case p_pattern when 1 then 360 when 2 then 400 when 3 then 400 when 4 then 560 when 5 then 600 when 6 then 500 when 7 then 600 when 8 then 640 when 9 then 840 when 10 then 960 else 1300 end;
  delay_ms:=case p_pattern when 1 then 1000 when 2 then 1200 when 3 then 1200 when 4 then 800 when 5 then 900 when 6 then 1000 when 7 then 1000 when 8 then 1000 when 9 then 500 when 10 then 600 else (array[1300,800,500])[wave+1] end;
  result:=result||jsonb_build_array(jsonb_build_object('id',p_round||':'||wave,'pattern',p_pattern,'damage',damage,'tiles',to_jsonb(tiles),
   'showAt',floor(extract(epoch from p_start)*1000)+offset_ms,'hitAt',floor(extract(epoch from p_start)*1000)+offset_ms+delay_ms));
  offset_ms:=offset_ms+case p_pattern when 6 then 1300 when 7 then 550 when 8 then 750 when 9 then 550 when 10 then 700 else delay_ms+300 end;
 end loop;
 return result;
end $$;

create function ringu_private.wb_view(p_room uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'host',r.host,'name','ooo','stage',1,'hp',r.hp,'maxHp',4200000,'status',r.status,
  'startedAt',extract(epoch from r.started_at)*1000,'endedAt',extract(epoch from r.ended_at)*1000,'reason',r.reason,
  'version',r.version,'pattern',r.pattern,'waves',r.waves,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.account_id,'name',m.name,'gender',m.gender,'costume',m.costume,
   'hp',m.hp,'maxHp',m.attack,'damage',m.damage,'x',m.x,'y',m.y,'seq',m.seq,'packet',m.packet,'ready',m.ready,
   'present',m.present,'revived',m.revived,'reward',m.reward,'seenAt',extract(epoch from m.seen_at)*1000,
   'stillAt',extract(epoch from m.still_at)*1000,'deadAt',extract(epoch from m.dead_at)*1000,'background',m.background)
   order by m.joined_at,m.account_id) from ringu_private.wb_members m where m.room_id=r.id),'[]'::jsonb))
 from ringu_private.wb_rooms r where r.id=p_room
$$;

-- Called under the room row lock, never delegated to the host browser.
create function ringu_private.wb_advance(p_room uuid) returns void language plpgsql security definer set search_path='' as $$
declare r ringu_private.wb_rooms%rowtype;now_at timestamptz:=clock_timestamp();m record;kind integer;roll float;last_hit numeric;
begin
 select * into r from ringu_private.wb_rooms where id=p_room for update;
 if r.status not in ('waiting','running') then return; end if;
 update ringu_private.wb_members set present=false,active=false,ready=false,left_at=seen_at+interval '15 seconds' where room_id=p_room and present and seen_at<now_at-interval '15 seconds';
 if not exists(select 1 from ringu_private.wb_members where room_id=p_room and account_id=r.host and present) then
  select account_id into r.host from ringu_private.wb_members where room_id=p_room and present order by joined_at,account_id limit 1;
  if r.host is not null then update ringu_private.wb_rooms set host=r.host where id=p_room; end if;
 end if;
 if not exists(select 1 from ringu_private.wb_members where room_id=p_room and present) then
  update ringu_private.wb_rooms set status=case when status='waiting' then 'closed' else 'lost' end,reason='전원 퇴장',ended_at=now_at,version=version+1 where id=p_room;
  return;
 end if;
 if r.status='waiting' then return; end if;
 -- No extra revival speed for stacked helpers. Hits do not reset standing time.
 for m in select d.account_id,d.attack from ringu_private.wb_members d where d.room_id=p_room and d.present and d.hp=0 and not d.revived
  and exists(select 1 from ringu_private.wb_members h where h.room_id=p_room and h.account_id<>d.account_id and h.present and h.hp>0
   and not h.background and h.seen_at>now_at-interval '2 seconds' and h.x=d.x and h.y=d.y
   and greatest(h.still_at,d.dead_at)<=now_at-interval '3 seconds') loop
  update ringu_private.wb_members set hp=greatest(1,floor(attack*.3)),revived=true,dead_at=null,still_at=now_at,accrued_at=now_at where room_id=p_room and account_id=m.account_id;
 end loop;
 if now_at>=r.started_at+interval '7 minutes' then r.status:='lost';r.reason:='제한시간 7분 초과';
 elsif r.hp<=0 then r.status:='won';r.reason:='클리어';
 elsif not exists(select 1 from ringu_private.wb_members where room_id=p_room and present and hp>0) then r.status:='lost';r.reason:='전원 사망';end if;
 if r.status in ('won','lost') then
  update ringu_private.wb_rooms set status=r.status,reason=r.reason,ended_at=now_at,version=version+1 where id=p_room;
  if r.status='won' then
   for m in select * from ringu_private.wb_members where room_id=p_room and present order by account_id loop
    if (select count(*) from ringu_private.wb_rewards where account_id=m.account_id and week=ringu_private.wb_week())<3 then
     insert into ringu_private.wb_rewards(room_id,account_id,week) values(p_room,m.account_id,ringu_private.wb_week()) on conflict do nothing;
     update ringu_private.wb_members set reward='pending' where room_id=p_room and account_id=m.account_id;
    end if;
   end loop;
  end if;
  update ringu_private.wb_members set active=false where room_id=p_room;
  return;
 end if;
 if r.next_at is null or now_at>=r.next_at then
  if r.round=0 or now_at<r.started_at+interval '15 seconds' or r.pattern>=9 then kind:=1+floor(random()*3);
  else
   roll:=random();
   kind:=case when roll<case when r.hp<=1260000 then .25 else .35 end then 1+floor(random()*3)
    when roll<case when r.hp<=1260000 then .7 else .8 end then 4+floor(random()*5) else 9+floor(random()*3) end;
  end if;
  if kind=r.pattern then kind:=case when kind=3 then 1 when kind=8 then 4 when kind=11 then 9 else kind+1 end;end if;
  r.waves:=ringu_private.wb_pattern(p_room,kind,r.round+1,now_at+interval '1.2 seconds');
  select max((value->>'hitAt')::numeric) into last_hit from jsonb_array_elements(r.waves);
  update ringu_private.wb_rooms set pattern=kind,round=round+1,waves=r.waves,next_at=to_timestamp(last_hit/1000)+interval '3 seconds',version=version+1 where id=p_room;
 end if;
end $$;

create function ringu_private.wb_rpc(p_action text,p_room uuid,p_args jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; r ringu_private.wb_rooms%rowtype;m ringu_private.wb_members%rowtype;a ringu_private.accounts%rowtype;
 now_at timestamptz:=clock_timestamp();v jsonb;w jsonb;report jsonb;ms timestamptz;arrival timestamptz;last_arrival timestamptz;charge_start timestamptz;
 move_count integer:=0;nx integer;ny integer;ns bigint;counted integer;attack_value numeric;dt numeric;hit integer;tile integer;
 remaining integer;roomlist jsonb;result jsonb;v_packet bigint;was_background boolean;
begin
 if p_action not in ('list','create','join','ready','start','sync','leave','ack') or octet_length(p_args::text)>16384 then raise exception 'INVALID_ACTION';end if;
 u:=ringu_private.require_session(false);
 select * into a from ringu_private.accounts where id=u;
 if p_action='list' then
  perform ringu_private.wb_check_unlock();
  -- Clean only stale rooms on lobby reads; no unbounded historical scan.
  for r in select * from ringu_private.wb_rooms where status in ('waiting','running') order by created_at limit 100 loop perform ringu_private.wb_advance(r.id);end loop;
  select room_id into p_room from ringu_private.wb_members where account_id=u and active limit 1;
  if p_room is null then
   select b.room_id into p_room from ringu_private.wb_members b join ringu_private.wb_rooms r2 on r2.id=b.room_id
    where b.account_id=u and b.present and b.acknowledged_at is null and r2.status in ('won','lost') order by r2.ended_at desc limit 1;
  end if;
 elsif p_action in ('create','join') then
  if not exists(select 1 from ringu_private.wb_unlock where unlocked_at is not null) then raise exception 'WORLD_BOSS_LOCKED';end if;
  if exists(select 1 from ringu_private.wb_members where account_id=u and active) then
   select room_id into p_room from ringu_private.wb_members where account_id=u and active;
  else
   if a.state->'serverBattle' is not null and a.state->'serverBattle'<>'null'::jsonb then raise exception 'BATTLE_IN_PROGRESS';end if;
   if exists(select 1 from ringu_private.members m2 join ringu_private.rooms r2 on r2.id=m2.room_id where m2.account_id=u and m2.active and r2.status in ('waiting','running')) then raise exception 'BATTLE_IN_PROGRESS';end if;
   if p_action='create' then insert into ringu_private.wb_rooms(host) values(u) returning id into p_room;end if;
   select * into r from ringu_private.wb_rooms where id=p_room for update;
   if not found or r.status<>'waiting' then raise exception 'ROOM_NOT_WAITING';end if;
   if p_action='join' then perform ringu_private.wb_advance(p_room);end if;
   if not exists(select 1 from ringu_private.wb_rooms where id=p_room and status='waiting') then raise exception 'ROOM_NOT_WAITING';end if;
   select count(*) into counted from ringu_private.wb_members where room_id=p_room and present;
   if counted>=10 then raise exception 'ROOM_FULL';end if;
   attack_value:=greatest(1,floor(ringu_private.n(a.state#>'{remodelProfile,power}',100000000)));
   insert into ringu_private.wb_members(room_id,account_id,name,gender,costume,attack,hp,x,y,ready)
   values(p_room,u,left(coalesce(a.state->>'playerName','모험가'),24),case when a.state->>'playerGender'='female' then 'female' else 'male' end,
    (select costume_id from ringu_private.costume_selection where account_id=u),attack_value,attack_value,counted%8,6+counted/8,p_action='create')
   on conflict(room_id,account_id) do update set present=true,active=true,seen_at=now_at,ready=false,left_at=null;
  end if;
 elsif p_room is not null then
  select * into r from ringu_private.wb_rooms where id=p_room for update;
  perform ringu_private.wb_advance(p_room);
  select * into r from ringu_private.wb_rooms where id=p_room;
  select * into m from ringu_private.wb_members where room_id=p_room and account_id=u;
  if not found then raise exception 'ROOM_FORBIDDEN';end if;
  if p_action='ack' then
   if r.status in ('waiting','running') then raise exception 'BATTLE_IN_PROGRESS';end if;
   update ringu_private.wb_members set acknowledged_at=now_at where room_id=p_room and account_id=u;
   p_room:=null;
  elsif p_action='leave' then
   update ringu_private.wb_members set present=false,active=false,ready=false,left_at=now_at where room_id=p_room and account_id=u;
   perform ringu_private.wb_advance(p_room);
   p_room:=null;
  elsif not m.present then raise exception 'ROOM_LEFT';
  elsif p_action='ready' then
   if r.status<>'waiting' then raise exception 'ROOM_NOT_WAITING';end if;
   update ringu_private.wb_members set ready=coalesce((p_args->>'ready')::boolean,true),seen_at=now_at where room_id=p_room and account_id=u;
  elsif p_action='start' then
   if r.host<>u then raise exception 'HOST_ONLY';end if;
   if r.status='waiting' then
    perform ringu_private.wb_advance(p_room);
    if exists(select 1 from ringu_private.wb_members where room_id=p_room and present and account_id<>u and not ready) then raise exception 'MEMBERS_NOT_READY';end if;
    -- Server-maintained final attack is also maximum HP. Freeze it at start.
    update ringu_private.wb_members b set attack=greatest(1,floor(ringu_private.n(ac.state#>'{remodelProfile,power}',100000000))),
     costume=(select costume_id from ringu_private.costume_selection where account_id=b.account_id)
     from ringu_private.accounts ac where b.room_id=p_room and b.present and ac.id=b.account_id;
    update ringu_private.wb_members set hp=attack,still_at=now_at+interval '2 seconds',accrued_at=now_at+interval '2 seconds',seen_at=now_at where room_id=p_room and present;
    insert into ringu_private.wb_moves(room_id,account_id,seq,x,y,arrived_at) select room_id,account_id,0,x,y,now_at from ringu_private.wb_members where room_id=p_room and present on conflict do nothing;
    update ringu_private.wb_rooms set status='running',started_at=now_at+interval '2 seconds',next_at=now_at+interval '2 seconds' where id=p_room;
   end if;
  elsif p_action='sync' then
   v_packet:=coalesce((p_args->>'packet')::bigint,0);
   if v_packet>m.packet then
    was_background:=m.background;
    m.background:=coalesce((p_args->>'background')::boolean,false);
    if r.status='running' and now_at>=r.started_at and m.hp>0 then
     if jsonb_array_length(coalesce(p_args->'moves','[]'))>12 then raise exception 'TOO_MANY_MOVES';end if;
     last_arrival:=m.still_at;
     for v in select value from jsonb_array_elements(coalesce(p_args->'moves','[]')) loop
      ns:=(v->>'seq')::bigint;if ns<=m.seq then continue;end if;
      nx:=(v->>'x')::integer;ny:=(v->>'y')::integer;ms:=to_timestamp((v->>'at')::numeric/1000);
      if ns<>m.seq+1 or nx not between 0 and 7 or ny not between 0 and 7 or abs(nx-m.x)+abs(ny-m.y)<>1
       or ms<last_arrival-interval '20 milliseconds' or ms<now_at-interval '3 seconds' or ms>now_at+interval '250 milliseconds' then raise exception 'INVALID_MOVE';end if;
      arrival:=ms+interval '180 milliseconds';last_arrival:=arrival;
      m.x:=nx;m.y:=ny;m.seq:=ns;m.still_at:=arrival;move_count:=move_count+1;
      insert into ringu_private.wb_moves values(p_room,u,ns,nx,ny,arrival);
     end loop;
     if jsonb_array_length(coalesce(p_args->'events','[]'))>24 then raise exception 'TOO_MANY_EVENTS';end if;
     for report in select value from jsonb_array_elements(coalesce(p_args->'events','[]')) loop
      select value into w from jsonb_array_elements(r.waves) where value->>'id'=report->>'id';
      if w is null or exists(select 1 from ringu_private.wb_hits where room_id=p_room and account_id=u and event=report->>'id') then continue;end if;
      ms:=to_timestamp((w->>'hitAt')::numeric/1000);
      if ms>now_at+interval '100 milliseconds' then continue;end if;
      hit:=0;
      -- Late/hidden warnings are not retrospective damage. Such periods never earn offline DPS.
      if (report->>'seenAt')::numeric <= (w->>'hitAt')::numeric-100 and (report->>'seenAt')::numeric >= (w->>'showAt')::numeric-100
       and now_at-ms<interval '3 seconds' and not was_background then
       select x+8*y into tile from ringu_private.wb_moves where room_id=p_room and account_id=u and arrived_at<=ms order by seq desc limit 1;
       if (w->'tiles')@>jsonb_build_array(tile) then hit:=(w->>'damage')::integer;end if;
      end if;
      insert into ringu_private.wb_hits values(p_room,u,w->>'id',hit) on conflict do nothing;
      m.hp:=greatest(0,m.hp-hit);
      if m.hp=0 then m.dead_at:=ms;exit;end if;
     end loop;
     charge_start:=greatest(m.accrued_at,r.started_at,now_at-interval '1.5 seconds');
     select greatest(0,extract(epoch from now_at-charge_start)-coalesce(sum(greatest(0,extract(epoch from
       least(arrived_at,now_at)-greatest(arrived_at-interval '180 milliseconds',charge_start)))),0)) into dt
      from ringu_private.wb_moves where room_id=p_room and account_id=u and seq>0
       and arrived_at>charge_start and arrived_at-interval '180 milliseconds'<now_at;
     if m.hp>0 and not m.background and not was_background and m.seen_at>now_at-interval '2 seconds' and now_at<r.started_at+interval '7 minutes' then
      attack_value:=least(r.hp,floor(m.attack*dt));
      m.damage:=m.damage+attack_value;
      update ringu_private.wb_rooms set hp=greatest(0,hp-attack_value) where id=p_room;
     end if;
    end if;
    update ringu_private.wb_members set x=m.x,y=m.y,seq=m.seq,hp=m.hp,damage=m.damage,dead_at=m.dead_at,still_at=m.still_at,
     seen_at=now_at,accrued_at=greatest(now_at,coalesce(r.started_at,now_at)),background=m.background,packet=v_packet where room_id=p_room and account_id=u;
   end if;
  end if;
 end if;
 if p_room is not null then
  if not exists(select 1 from ringu_private.wb_members where room_id=p_room and account_id=u) then raise exception 'ROOM_FORBIDDEN';end if;
  perform ringu_private.wb_advance(p_room);
  update ringu_private.wb_rooms set version=version+1 where id=p_room;
  select ringu_private.wb_view(p_room) into result;
  -- Coalesced private broadcast. No client can publish authoritative snapshots.
  if exists(select 1 from ringu_private.wb_rooms where id=p_room and broadcast_at<now_at-interval '200 milliseconds') then
   perform realtime.send(jsonb_build_object('room',result,'serverNow',extract(epoch from now_at)*1000),'snapshot','world-boss:'||p_room,true);
   update ringu_private.wb_rooms set broadcast_at=now_at where id=p_room;
  end if;
 end if;
 select greatest(0,3-count(*))::integer into remaining from ringu_private.wb_rewards where account_id=u and week=ringu_private.wb_week();
 if p_room is null then
  select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'host',q.name,'count',q.n) order by q.created_at),'[]') into roomlist from (
   select r2.id,r2.created_at,coalesce(h.name,'모험가') name,(select count(*) from ringu_private.wb_members where room_id=r2.id and present) n
   from ringu_private.wb_rooms r2 left join ringu_private.wb_members h on h.room_id=r2.id and h.account_id=r2.host where r2.status='waiting' limit 100
  ) q;
 end if;
 return jsonb_build_object('room',result,'rooms',coalesce(roomlist,'[]'),'remaining',remaining,'week',ringu_private.wb_week(),
  'unlockedAt',(select unlocked_at from ringu_private.wb_unlock),'userId',u,'serverNow',extract(epoch from clock_timestamp())*1000);
end $$;

create function public.ringu_world_boss(p_action text default 'list',p_room uuid default null,p_args jsonb default '{}')
returns jsonb language sql security invoker set search_path='' as $$ select ringu_private.wb_rpc(p_action,p_room,p_args) $$;
revoke all on function ringu_private.wb_week(),ringu_private.wb_check_unlock(),ringu_private.wb_unlock_trigger(),ringu_private.wb_pattern(uuid,integer,integer,timestamptz),ringu_private.wb_view(uuid),ringu_private.wb_advance(uuid),ringu_private.wb_rpc(text,uuid,jsonb),public.ringu_world_boss(text,uuid,jsonb) from public,anon,authenticated;
grant usage on schema ringu_private to authenticated;
grant execute on function ringu_private.wb_rpc(text,uuid,jsonb),public.ringu_world_boss(text,uuid,jsonb) to authenticated;

create function ringu_private.wb_can_read(p_topic text) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from ringu_private.wb_members m join ringu_private.accounts a on a.id=m.account_id
 where m.account_id=auth.uid() and m.present and p_topic='world-boss:'||m.room_id::text and a.active_session=(auth.jwt()->>'session_id')::uuid)
$$;
revoke all on function ringu_private.wb_can_read(text) from public,anon,authenticated;
grant execute on function ringu_private.wb_can_read(text) to authenticated;
create policy wb_private_receive on realtime.messages for select to authenticated using (extension='broadcast' and ringu_private.wb_can_read(realtime.topic()));

-- Preserve the existing economy gateway, adding only the world-boss busy flag.
alter function public.ringu_economy_snapshot(uuid) rename to ringu_economy_snapshot_before_world_boss;
revoke all on function public.ringu_economy_snapshot_before_world_boss(uuid) from public,anon,authenticated;
create function public.ringu_economy_snapshot(p_request_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; blocked_until timestamptz; previous_clock numeric;
begin
 result:=public.ringu_economy_snapshot_before_world_boss(p_request_id);
 -- Freeze field combat while raiding; on the next economy command, advance its
 -- clock past the raid without granting retrospective field kills. Time AFTER
 -- the raid still receives normal offline handling. No direct account mutation.
 previous_clock:=coalesce((result#>>'{state,serverClock}')::numeric,(result#>>'{state,lastSeen}')::numeric,extract(epoch from clock_timestamp())*1000);
 select max(coalesce(m.left_at,r.ended_at)) into blocked_until from ringu_private.wb_members m
  join ringu_private.wb_rooms r on r.id=m.room_id where m.account_id=auth.uid()
   and coalesce(m.left_at,r.ended_at)>to_timestamp(previous_clock/1000);
 if blocked_until is not null then
  result:=jsonb_set(result,'{state,serverClock}',to_jsonb(floor(extract(epoch from blocked_until)*1000)));
  result:=jsonb_set(result,'{state,serverCombat}','null'::jsonb);
 end if;
 return result||jsonb_build_object('partyBusy',coalesce((result->>'partyBusy')::boolean,false) or exists(
  select 1 from ringu_private.wb_members where account_id=auth.uid() and active));
end $$;
revoke all on function public.ringu_economy_snapshot(uuid) from public,anon;
grant execute on function public.ringu_economy_snapshot(uuid) to authenticated;

create function ringu_private.wb_exclusive_party() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.active and exists(select 1 from ringu_private.wb_members where account_id=new.account_id and active) then raise exception 'BATTLE_IN_PROGRESS';end if;
 return new;
end $$;
revoke all on function ringu_private.wb_exclusive_party() from public,anon,authenticated;
create trigger wb_exclusive_party before insert or update of active on ringu_private.members for each row execute function ringu_private.wb_exclusive_party();

-- Ensure an abandoned battle never leaves field combat permanently paused.
create function ringu_private.wb_sweep() returns void language plpgsql security definer set search_path='' as $$
declare r record;
begin
 for r in select id from ringu_private.wb_rooms where status in ('waiting','running') order by created_at limit 100 loop
  perform ringu_private.wb_advance(r.id);
 end loop;
end $$;
revoke all on function ringu_private.wb_sweep() from public,anon,authenticated;
select cron.schedule('ringu-world-boss-sweep','5 seconds','select ringu_private.wb_sweep()');
commit;
