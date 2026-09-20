-- Stage two rewards; existing paid mail and the shared weekly quota are preserved.
alter table ringu_private.wb_rewards
 drop constraint wb_rewards_essence_check,
 drop constraint wb_rewards_jade_cubes_check,
 add column sun_cubes integer not null default 0 check(sun_cubes in (0,2)),
 add constraint wb_rewards_essence_check check(essence between 15 and 60),
 add constraint wb_rewards_jade_cubes_check check(jade_cubes in (0,2)),
 add constraint wb_rewards_cube_pair_check check(jade_cubes is null or jade_cubes+sun_cubes=2);
CREATE OR REPLACE FUNCTION ringu_private.wb_pay_rewards(p_room uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare rec record; t timestamptz:=clock_timestamp();mid text;amount integer;boss_stage integer;
begin
 perform pg_advisory_xact_lock(70909,10);
 select stage into boss_stage from ringu_private.wb_rooms where id=p_room and status='won' for update;
 if not found then return;end if;
 for rec in
  select w.account_id,ranked.place from ringu_private.wb_rewards w
  join (
   select m.account_id,rank() over(order by m.damage desc)::integer place
   from ringu_private.wb_members m where m.room_id=p_room and
    (m.present or exists(select 1 from ringu_private.wb_rewards earned where earned.room_id=p_room and earned.account_id=m.account_id))
  ) ranked on ranked.account_id=w.account_id
  where w.room_id=p_room and w.status='pending' order by w.account_id
 loop
  amount:=case when boss_stage=2 then 60-5*(rec.place-1) else 50-3*(rec.place-1) end;
  mid:='weekly-boss:'||p_room::text||':'||rec.account_id::text;
  update ringu_private.accounts set
   state=jsonb_set(state,'{mailbox}',coalesce(state->'mailbox','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
    'id',mid,'title','주간보스 '||boss_stage||'단계 클리어 보상',
    'message',(case when boss_stage=2 then '성천의 심판자 아우리엘' else '멸겁룡 카르가론' end)||' 토벌 · 기여도 '||rec.place::text||'등 · 정수 '||amount::text||'개 · '||(case when boss_stage=2 then '태양 큐브' else '비취큐브' end)||' 2개',
    'reward',jsonb_build_object('essence',amount,case when boss_stage=2 then 'sunCube' else 'jadeCube' end,2),
    'createdAt',floor(extract(epoch from t)*1000)))),
   revision=revision+1,updated_at=t
  where id=rec.account_id;
  if not found then raise exception 'REWARD_ACCOUNT_MISSING';end if;
  update ringu_private.wb_rewards set status='paid',place=rec.place,essence=amount,jade_cubes=case when boss_stage=2 then 0 else 2 end,sun_cubes=case when boss_stage=2 then 2 else 0 end,mail_id=mid
   where room_id=p_room and account_id=rec.account_id and status='pending';
  update ringu_private.wb_members set reward='paid' where room_id=p_room and account_id=rec.account_id;
 end loop;
end $function$
;
CREATE OR REPLACE FUNCTION ringu_private.wb_view(p_room uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select jsonb_build_object('id',r.id,'host',r.host,'name',case when r.stage=2 then '성천의 심판자 아우리엘' else '멸겁룡 카르가론' end,'stage',r.stage,'hp',r.hp,'maxHp',4200000*r.stage,'status',r.status,
  'startedAt',extract(epoch from r.started_at)*1000,'endedAt',extract(epoch from r.ended_at)*1000,'reason',r.reason,
  'version',r.version,'pattern',r.pattern,'waves',r.waves,
  'members',coalesce((select jsonb_agg(jsonb_build_object('id',m.account_id,'name',m.name,'gender',m.gender,'costume',m.costume,
   'lastHit',m.last_hit,'hp',m.hp,'maxHp',m.attack,'damage',m.damage,'x',m.x,'y',m.y,'seq',m.seq,'packet',m.packet,'ready',m.ready,
   'rewardDetail',(select jsonb_build_object('rank',w.place,'essence',w.essence,'jadeCube',w.jade_cubes,'sunCube',w.sun_cubes,'delivery','mail','mailId',w.mail_id) from ringu_private.wb_rewards w where w.room_id=m.room_id and w.account_id=m.account_id and w.status='paid'),
   'present',m.present,'revived',m.revived,'reward',m.reward,'seenAt',extract(epoch from m.seen_at)*1000,
   'stillAt',extract(epoch from m.still_at)*1000,'deadAt',extract(epoch from m.dead_at)*1000,'background',m.background)
   order by m.joined_at,m.account_id) from ringu_private.wb_members m where m.room_id=r.id),'[]'::jsonb))
 from ringu_private.wb_rooms r where r.id=p_room
$function$
;
