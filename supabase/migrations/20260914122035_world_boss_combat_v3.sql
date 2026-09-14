-- WB3: frozen existing character critical stats and authoritative hit receipts.
alter table ringu_private.wb_members add column crit_chance numeric not null default 0 check(crit_chance between 0 and 95),add column crit_damage numeric not null default 100 check(crit_damage>=0),add column last_hit jsonb;
CREATE OR REPLACE FUNCTION ringu_private.wb_rpc(p_action text, p_room uuid, p_args jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid; r ringu_private.wb_rooms%rowtype;m ringu_private.wb_members%rowtype;a ringu_private.accounts%rowtype;
 now_at timestamptz:=clock_timestamp();v jsonb;w jsonb;report jsonb;ms timestamptz;arrival timestamptz;last_arrival timestamptz;charge_start timestamptz;
 move_count integer:=0;nx integer;ny integer;ns bigint;counted integer;attack_value numeric;dt numeric;hit integer;tile integer;
 remaining integer;roomlist jsonb;result jsonb;v_packet bigint;was_background boolean;combat_stats jsonb;critical boolean;
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
    update ringu_private.wb_members set crit_chance=least(95,coalesce((ringu_private.stats((select state from ringu_private.accounts ac where ac.id=account_id))->>'crit')::numeric,0)),crit_damage=coalesce((ringu_private.stats((select state from ringu_private.accounts ac where ac.id=account_id))->>'damage')::numeric,100),last_hit=null,hp=attack,still_at=now_at+interval '2 seconds',accrued_at=now_at+interval '2 seconds',seen_at=now_at where room_id=p_room and present;
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
      critical:=random()*100<m.crit_chance;
      attack_value:=least(r.hp,floor(m.attack*dt*(case when critical then 1+m.crit_damage/100 else 1 end)));
      if attack_value>0 then m.last_hit:=jsonb_build_object('id',v_packet,'damage',attack_value,'crit',critical,'at',extract(epoch from now_at)*1000);end if;
      m.damage:=m.damage+attack_value;
      update ringu_private.wb_rooms set hp=greatest(0,hp-attack_value) where id=p_room;
     end if;
    end if;
    update ringu_private.wb_members set last_hit=m.last_hit,x=m.x,y=m.y,seq=m.seq,hp=m.hp,damage=m.damage,dead_at=m.dead_at,still_at=m.still_at,
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
end $function$;

CREATE OR REPLACE FUNCTION ringu_private.wb_view(p_room uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id',r.id,'host',r.host,'name','ooo','stage',1,'hp',r.hp,'maxHp',4200000,'status',r.status,
  'startedAt',extract(epoch from r.started_at)*1000,'endedAt',extract(epoch from r.ended_at)*1000,'reason',r.reason,
  'version',r.version,'pattern',r.pattern,'waves',r.waves,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.account_id,'name',m.name,'gender',m.gender,'costume',m.costume,
   'lastHit',m.last_hit,'hp',m.hp,'maxHp',m.attack,'damage',m.damage,'x',m.x,'y',m.y,'seq',m.seq,'packet',m.packet,'ready',m.ready,
   'present',m.present,'revived',m.revived,'reward',m.reward,'seenAt',extract(epoch from m.seen_at)*1000,
   'stillAt',extract(epoch from m.still_at)*1000,'deadAt',extract(epoch from m.dead_at)*1000,'background',m.background)
   order by m.joined_at,m.account_id) from ringu_private.wb_members m where m.room_id=r.id),'[]'::jsonb))
 from ringu_private.wb_rooms r where r.id=p_room
$function$;
