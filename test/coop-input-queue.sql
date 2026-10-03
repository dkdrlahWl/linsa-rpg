-- Run in a transaction; fixture accounts and rooms are always rolled back.
begin;
create temp table coop_queue_check(result jsonb);
do $test$
declare u1 uuid:=gen_random_uuid();u2 uuid:=gen_random_uuid();s1 uuid:=gen_random_uuid();s2 uuid:=gen_random_uuid();rid uuid:=gen_random_uuid();ep uuid;ms bigint:=floor(extract(epoch from clock_timestamp())*1000);w jsonb;p1 jsonb;p2 jsonb;r1 jsonb;r2 jsonb;original_world jsonb;beg timestamptz;elapsed numeric;i int;
begin
 select epoch into ep from rebirth_private.release limit 1;
 insert into auth.users(id,email) values(u1,u1::text||'@perf-test.invalid'),(u2,u2::text||'@perf-test.invalid');
 insert into auth.sessions(id,user_id,created_at) values(s1,u1,now()),(s2,u2,now());
 insert into rebirth_private.players(id,state,active_session,session_started,preview_access) values(u1,jsonb_build_object('coopRoom',rid),s1,now(),true),(u2,jsonb_build_object('coopRoom',rid),s2,now(),true)
 on conflict(id) do update set state=excluded.state,active_session=excluded.active_session,session_started=excluded.session_started,preview_access=true;
 w:=jsonb_build_object('mode','wave','status','fighting','tick',10,'started',ms-3000,'members',jsonb_build_array(jsonb_build_object('id',u1,'left',false),jsonb_build_object('id',u2,'left',false)),'_net',jsonb_build_object('frames','[]'::jsonb,'points',jsonb_build_array(repeat('history',20000))));
 insert into rebirth_private.coop_rooms(id,world) values(rid,w);original_world:=w;
 p1:=jsonb_build_object('user',u1,'session',s1,'epoch',ep,'revision',0,'request',gen_random_uuid(),'fingerprint','{}'::jsonb,'queueInput',true,'compact',true,'action','read','args',jsonb_build_object('frames',jsonb_build_array(jsonb_build_object('tick',10,'input',jsonb_build_array(1,0,1)))));
 p2:=p1||jsonb_build_object('user',u2,'session',s2,'request',gen_random_uuid());
 r1:=public.rebirth_coop_action(p1);r2:=public.rebirth_coop_action(p2);
 assert jsonb_array_length(r2->'coop'->'_queuedInputs')=2,'two players queued';
 assert (r2->'coop'->>'revision')::int=0,'queue cannot change revision';
 assert (select world=original_world from rebirth_private.coop_rooms where id=rid),'enqueuing must not rewrite history';
 w:=jsonb_set(w,'{_net,frames}',r1->'coop'->'_queuedInputs');
 r1:=public.rebirth_coop_action(p1||jsonb_build_object('action','input','roomRevision',0,'world',w));
 assert jsonb_array_length(r1->'coop'->'_queuedInputs')=1,'concurrent second input retained';
 assert r1->'coop'->'_queuedInputs'->0->>'user'=u2::text,'retained correct player';
 r2:=public.rebirth_coop_action(p2||jsonb_build_object('action','input','roomRevision',0,'world',w));
 assert (r2->'coop'->>'revision')::int=1,'stale writer returns winner';
 r2:=public.rebirth_coop_action(p2);
 assert jsonb_array_length(r2->'coop'->'_queuedInputs')=1,'retry deduplication';
 w:=jsonb_set(w,'{_net,frames}',(w->'_net'->'frames')||(r2->'coop'->'_queuedInputs'));
 r2:=public.rebirth_coop_action(p2||jsonb_build_object('action','input','roomRevision',1,'world',w));
 assert jsonb_array_length(r2->'coop'->'_queuedInputs')=0,'processed input cleared';
 r1:=public.rebirth_coop_action(p1);
 assert jsonb_array_length(r1->'coop'->'_queuedInputs')=0,'acknowledged duplicates stay cleared';
 beg:=clock_timestamp();
 for i in 1..80 loop
  p1:=p1||jsonb_build_object('args',jsonb_build_object('frames',jsonb_build_array(jsonb_build_object('tick',11+i%20,'input',jsonb_build_array(1,0,1)))));
  perform public.rebirth_coop_action(p1);
 end loop;
 elapsed:=extract(epoch from clock_timestamp()-beg)*1000;
 insert into coop_queue_check values(jsonb_build_object('passed',true,'packets',80,'total_ms',elapsed,'mean_ms',elapsed/80,'world_bytes',length(w::text)));
end $test$;
select * from coop_queue_check;
rollback;
