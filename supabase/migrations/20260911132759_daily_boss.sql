begin;
create table ringu_private.daily_boss_days(day date primary key,closed_at timestamptz);
create table ringu_private.daily_boss_runs(
 id uuid primary key,account_id uuid not null references ringu_private.accounts(id),
 day date not null references ringu_private.daily_boss_days(day),attempt int not null check(attempt between 1 and 3),
 started_at timestamptz not null,ends_at timestamptz not null,
 hits jsonb not null,damage bigint not null check(damage between 0 and 9007199254740991),
 settled boolean not null default false,acknowledged boolean not null default false,
 unique(account_id,day,attempt),check(ends_at=started_at+interval '10 seconds')
);
create index daily_boss_pending on ringu_private.daily_boss_runs(ends_at) where not settled;
create index daily_boss_owner on ringu_private.daily_boss_runs(account_id,started_at desc);
create table ringu_private.daily_boss_scores(
 day date not null,account_id uuid not null references ringu_private.accounts(id),
 damage bigint not null, reached_at timestamptz not null,primary key(day,account_id)
);
create index daily_boss_order on ringu_private.daily_boss_scores(day,damage desc,reached_at,account_id);
create table ringu_private.daily_boss_rewards(
 day date not null,account_id uuid not null references ringu_private.accounts(id),
 rank int not null check(rank between 1 and 8),amount int not null check(amount between 10 and 15),
 mail_id text not null unique,created_at timestamptz not null default now(),primary key(day,account_id)
);
alter table ringu_private.daily_boss_days enable row level security;
alter table ringu_private.daily_boss_runs enable row level security;
alter table ringu_private.daily_boss_scores enable row level security;
alter table ringu_private.daily_boss_rewards enable row level security;
revoke all on ringu_private.daily_boss_days,ringu_private.daily_boss_runs,ringu_private.daily_boss_scores,ringu_private.daily_boss_rewards from public,anon,authenticated;

-- Server CSPRNG, rejection sampling: exactly 100 equally likely buckets.
create function ringu_private.daily_boss_roll() returns int language plpgsql volatile set search_path='' as $$
declare b int;
begin
 loop
  b:=get_byte(extensions.gen_random_bytes(1),0);
  if b<200 then return b%100; end if;
 end loop;
end $$;

create function ringu_private.daily_boss_settle() returns void language plpgsql set search_path='' as $$
declare t timestamptz:=clock_timestamp(); today date; r record; d record; score record; n int; total int; amount int; mid text;
 weights int[][]:=array[array[8,10,14,19,22,27],array[9,11,14,19,21,26],array[11,12,15,18,20,24],array[12,13,15,18,19,23],array[14,14,15,17,19,21],array[15,15,15,17,18,20],array[17,16,16,16,17,18],array[18,17,16,16,16,17]];
begin
 perform pg_advisory_xact_lock(70909,10);
 today:=(t at time zone 'Asia/Seoul')::date;
 -- At midnight a crossing battle's already sealed ten-hit plan belongs to its
 -- START day. Its animation still ends at ends_at; never truncate or restore it.
 for r in select * from ringu_private.daily_boss_runs where not settled and (ends_at<=t or day<today) order by ends_at,id for update loop
  insert into ringu_private.daily_boss_scores(day,account_id,damage,reached_at) values(r.day,r.account_id,r.damage,r.ends_at)
  on conflict(day,account_id) do update set damage=daily_boss_scores.damage+excluded.damage,reached_at=greatest(daily_boss_scores.reached_at,excluded.reached_at);
  update ringu_private.daily_boss_runs set settled=true where id=r.id;
 end loop;
 for d in select day from ringu_private.daily_boss_days where day<today and closed_at is null order by day for update loop
  for score in select s.*,row_number() over(order by s.damage desc,s.reached_at,s.account_id)::int place from ringu_private.daily_boss_scores s where s.day=d.day and exists(select 1 from ringu_private.accounts ac where ac.id=s.account_id and coalesce(ac.state->>'rankingHidden','false')<>'true') order by s.damage desc,s.reached_at,s.account_id limit 8 loop
   if exists(select 1 from ringu_private.daily_boss_rewards where day=d.day and account_id=score.account_id) then continue; end if;
   n:=ringu_private.daily_boss_roll();total:=0;amount:=15;
   for i in 1..6 loop total:=total+weights[score.place][i];if n<total then amount:=i+9;exit;end if;end loop;
   mid:='daily-boss:'||d.day::text||':'||score.account_id::text;
   insert into ringu_private.daily_boss_rewards(day,account_id,rank,amount,mail_id) values(d.day,score.account_id,score.place,amount,mid);
   update ringu_private.accounts set state=jsonb_set(state,'{mailbox}',coalesce(state->'mailbox','[]'::jsonb)||jsonb_build_array(jsonb_build_object(
    'id',mid,'title','일일보스 순위 보상','message',d.day::text||' 일일보스에서 '||score.place||'위를 기록했습니다.',
    'reward',jsonb_build_object('essence',amount),'createdAt',floor(extract(epoch from t)*1000)
   ))),revision=revision+1,updated_at=t where id=score.account_id;
  end loop;
  update ringu_private.daily_boss_days set closed_at=t where day=d.day;
 end loop;
end $$;

-- Service-role only. The Edge verifies Auth, derives the plan from a server
-- snapshot, then this transaction checks the revision before accepting it.
create function public.ringu_daily_boss(p_user uuid,p_session uuid,p_action text default 'status',p_request_id uuid default null,p_revision bigint default null,p_hits jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t timestamptz; today date; a ringu_private.accounts%rowtype; run ringu_private.daily_boss_runs%rowtype;
 count_used int; total bigint; rows jsonb; active jsonb; result jsonb; damage bigint;
begin
 perform pg_advisory_xact_lock(70909,10);
 perform ringu_private.economy_session(p_user,p_session);
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready) then raise exception 'ECONOMY_NOT_READY';end if;
 perform ringu_private.daily_boss_settle();
 t:=clock_timestamp();today:=(t at time zone 'Asia/Seoul')::date;
 select * into strict a from ringu_private.accounts where id=p_user for update;
 if p_action='start' then
  if p_request_id is null then raise exception 'REQUEST_ID_REQUIRED';end if;
  select * into run from ringu_private.daily_boss_runs where id=p_request_id;
  if found then
   if run.account_id<>p_user then raise exception 'REQUEST_ID_REUSED';end if;
  else
   if a.revision is distinct from p_revision then raise exception 'SAVE_CONFLICT';end if;
   if exists(select 1 from ringu_private.economy_receipts where account_id=p_user and request_id=p_request_id) then raise exception 'REQUEST_ID_REUSED';end if;
   if exists(select 1 from ringu_private.daily_boss_runs where account_id=p_user and ends_at>t) then raise exception 'BATTLE_IN_PROGRESS';end if;
   if a.state->'serverBattle' is not null and a.state->'serverBattle'<>'null'::jsonb then raise exception 'BATTLE_IN_PROGRESS';end if;
   if exists(select 1 from ringu_private.members m join ringu_private.rooms r on r.id=m.room_id where m.account_id=p_user and m.active and r.status in ('waiting','running')) then raise exception 'BATTLE_IN_PROGRESS';end if;
   select count(*) into count_used from ringu_private.daily_boss_runs where account_id=p_user and day=today;
   if count_used>=3 then raise exception 'DAILY_BOSS_LIMIT';end if;
   if p_hits is null or jsonb_typeof(p_hits)<>'array' or jsonb_array_length(p_hits)<>10 then raise exception 'INVALID_ARGUMENTS';end if;
   if exists(select 1 from jsonb_array_elements(p_hits) with ordinality h(v,i) where (v->>'at')::int<>i*1000 or (v->>'damage')::numeric<1 or (v->>'damage')::numeric<>trunc((v->>'damage')::numeric) or v->>'damage' is null or v->>'at' is null) then raise exception 'INVALID_ARGUMENTS';end if;
   select sum((v->>'damage')::bigint) into damage from jsonb_array_elements(p_hits) v;
   if damage>3002399751580330 then raise exception 'INVALID_STATE';end if;
   insert into ringu_private.daily_boss_days(day) values(today) on conflict do nothing;
   insert into ringu_private.daily_boss_runs(id,account_id,day,attempt,started_at,ends_at,hits,damage) values(p_request_id,p_user,today,count_used+1,t,t+interval '10 seconds',p_hits,damage);
   -- Revision invalidates concurrent economy snapshots. The spent attempt and
   -- sealed damage plan commit together, even if the response is lost.
   update ringu_private.accounts set revision=revision+1,updated_at=t where id=p_user;
  end if;
 elsif p_action='ack' then
  update ringu_private.daily_boss_runs set acknowledged=true where id=p_request_id and account_id=p_user and ends_at<=t;
 elsif p_action<>'status' then raise exception 'INVALID_ARGUMENTS';end if;
 select count(*) into count_used from ringu_private.daily_boss_runs where account_id=p_user and day=today;
 select coalesce(s.damage,0) into total from ringu_private.daily_boss_scores s where s.account_id=p_user and s.day=today;
 select coalesce(jsonb_agg(q order by q.rank),'[]'::jsonb) into rows from (
  select row_number() over(order by s.damage desc,s.reached_at,s.account_id) rank,s.account_id "accountId",coalesce(nullif(ac.state->>'playerName',''),'모험가') nickname,s.damage
  from ringu_private.daily_boss_scores s join ringu_private.accounts ac on ac.id=s.account_id where s.day=today and coalesce(ac.state->>'rankingHidden','false')<>'true'
 ) q;
 select jsonb_build_object('id',r.id,'day',r.day,'startedAt',floor(extract(epoch from r.started_at)*1000),'endsAt',floor(extract(epoch from r.ends_at)*1000),'hits',r.hits,'damage',r.damage)
 into active from ringu_private.daily_boss_runs r where r.account_id=p_user and r.ends_at>t order by r.started_at desc limit 1;
 select jsonb_build_object('id',r.id,'day',r.day,'damage',r.damage,'total',s.damage,'remaining',3-(select count(*) from ringu_private.daily_boss_runs where account_id=p_user and day=r.day),'rank',case when a.state->>'rankingHidden'='true' then null else
  (select count(*)+1 from ringu_private.daily_boss_scores x where x.day=r.day and exists(select 1 from ringu_private.accounts ac where ac.id=x.account_id and coalesce(ac.state->>'rankingHidden','false')<>'true') and (x.damage>s.damage or (x.damage=s.damage and (x.reached_at,x.account_id)<(s.reached_at,s.account_id)))) end)
 into result from ringu_private.daily_boss_runs r join ringu_private.daily_boss_scores s on s.day=r.day and s.account_id=r.account_id where r.account_id=p_user and not r.acknowledged and r.ends_at<=t order by r.started_at desc limit 1;
 return jsonb_build_object('rankExcluded',coalesce(a.state->>'rankingHidden','false')='true','day',today,'now',floor(extract(epoch from t)*1000),'remaining',3-count_used,'total',coalesce(total,0),'rank',(select v->'rank' from jsonb_array_elements(rows) v where v->>'accountId'=p_user::text),'ranking',(select coalesce(jsonb_agg(v),'[]') from jsonb_array_elements(rows) with ordinality e(v,i) where i<=8),'active',active,'result',result);
end $$;
revoke all on function ringu_private.daily_boss_roll(),ringu_private.daily_boss_settle() from public,anon,authenticated;
revoke all on function public.ringu_daily_boss(uuid,uuid,text,uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.ringu_daily_boss(uuid,uuid,text,uuid,bigint,jsonb) to service_role;
commit;
