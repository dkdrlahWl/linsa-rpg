-- Weekly, number-based lottery. Private ledger; money and tickets commit together.
create table if not exists rebirth_private.lotto_rounds (
 draw_at timestamptz primary key, sales bigint not null default 0 check(sales>=0),
 carry_in bigint not null default 0 check(carry_in>=0), multiplier integer check(multiplier between 8 and 11),
 number_a integer check(number_a between 1 and 18), number_b integer check(number_b between 1 and 18),
 prize bigint not null default 0, carry_out bigint not null default 0, winner_count integer not null default 0,
 settled_at timestamptz, check(number_a is null or number_a<number_b)
);
create table if not exists rebirth_private.lotto_tickets (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 draw_at timestamptz not null references rebirth_private.lotto_rounds(draw_at),
 number_a integer not null check(number_a between 1 and 18), number_b integer not null check(number_b between 1 and 18),
 bought_at timestamptz not null default clock_timestamp(), amount bigint not null default 0,
 check(number_a<number_b), unique(user_id,draw_at,number_a,number_b)
);
create index if not exists lotto_user_day on rebirth_private.lotto_tickets(user_id,bought_at);
alter table rebirth_private.lotto_rounds enable row level security;
alter table rebirth_private.lotto_tickets enable row level security;
revoke all on rebirth_private.lotto_rounds,rebirth_private.lotto_tickets from public,anon,authenticated;

create or replace function rebirth_private.lotto_next_draw(p_now timestamptz) returns timestamptz
language sql immutable set search_path='' as $$
 select (date_trunc('week',p_now at time zone 'Asia/Seoul')+interval '5 days 21 hours'+
 case when p_now at time zone 'Asia/Seoul'>=date_trunc('week',p_now at time zone 'Asia/Seoul')+interval '5 days 21 hours' then interval '7 days' else interval '0 days' end) at time zone 'Asia/Seoul'
$$;
revoke all on function rebirth_private.lotto_next_draw(timestamptz) from public,anon,authenticated;

-- Called by cron and by the authenticated UI to recover any missed scheduled draw.
create or replace function rebirth_private.lotto_settle() returns integer
language plpgsql security definer set search_path='' as $$
declare r rebirth_private.lotto_rounds%rowtype; w record; a integer; b integer; m integer;
 total bigint; winners integer; share bigint; remainder bigint; payout bigint; mail jsonb; processed integer:=0;
begin
 perform pg_advisory_xact_lock(71823080);
 loop
  select * into r from rebirth_private.lotto_rounds where settled_at is null and draw_at<=clock_timestamp() order by draw_at limit 1 for update;
  exit when not found;
  a:=1+floor(random()*18)::integer; b:=1+floor(random()*17)::integer; if b>=a then b:=b+1; end if;
  if a>b then m:=a; a:=b; b:=m; end if;
  m:=8+floor(random()*4)::integer;
  total:=r.sales*m+r.carry_in;
  select count(*) into winners from rebirth_private.lotto_tickets where draw_at=r.draw_at and number_a=a and number_b=b;
  if winners>0 then
   share:=total/winners; remainder:=total%winners;
   -- Same player lock order as other personal-state updates. One mail per winning ticket.
   for w in select t.id,t.user_id from rebirth_private.lotto_tickets t where t.draw_at=r.draw_at and t.number_a=a and t.number_b=b order by t.user_id,t.id loop
    payout:=share+case when remainder>0 then 1 else 0 end; remainder:=greatest(0,remainder-1);
    mail:=jsonb_build_object('id','lotto-'||w.id,'kind','lottoGold','title','주간 로또 1등 당첨','sender','링구 로또',
     'message',to_char(r.draw_at at time zone 'Asia/Seoul','YYYY.MM.DD')||' 추첨 · 당첨 번호 '||a||' · '||b||' · 판매금 ×'||m||'배 · 1등 '||winners||'장 균등 분배',
     'rewards',jsonb_build_object('gold',payout),'sentAt',r.draw_at);
    update rebirth_private.lotto_tickets set amount=payout where id=w.id;
    update rebirth_private.players set state=jsonb_set(jsonb_set(state,'{rewardMailbox}',coalesce(state->'rewardMailbox','[]'::jsonb)||jsonb_build_array(mail)),
     '{systemMailbox}',coalesce(state->'systemMailbox','[]'::jsonb)||jsonb_build_array(mail)),revision=revision+1,updated_at=now() where id=w.user_id and state is not null;
   end loop;
  end if;
  update rebirth_private.lotto_rounds set multiplier=m,number_a=a,number_b=b,prize=total,
   winner_count=winners,carry_out=case when winners=0 then total else 0 end,settled_at=clock_timestamp() where draw_at=r.draw_at;
  insert into rebirth_private.lotto_rounds(draw_at,carry_in) values(r.draw_at+interval '7 days',case when winners=0 then total else 0 end)
   on conflict(draw_at) do update set carry_in=rebirth_private.lotto_rounds.carry_in+excluded.carry_in;
  processed:=processed+1;
 end loop;
 return processed;
end $$;
revoke all on function rebirth_private.lotto_settle() from public,anon,authenticated;

create or replace function rebirth_private.lotto(p_action text,p_args jsonb,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare u uuid; p rebirth_private.players%rowtype; receipt rebirth_private.receipts%rowtype;
 fp jsonb:=jsonb_build_object('lotto',p_action,'args',p_args); v_now timestamptz; draw timestamptz; today date; day_start timestamptz;
 a integer; b integer; n integer; v_ticket uuid; payload jsonb; result jsonb:='{"events":[]}'::jsonb;
begin
 if p_action not in ('list','buy') or p_request is null then raise exception 'INVALID_LOTTO_ACTION'; end if;
 perform pg_advisory_xact_lock(71823080);
 u:=rebirth_private.session_user();
 -- session_user can take the caller's row lock; global lottery lock is always acquired first.
 perform rebirth_private.lotto_settle();
 v_now:=clock_timestamp();draw:=rebirth_private.lotto_next_draw(v_now);today:=(v_now at time zone 'Asia/Seoul')::date;
 day_start:=today::timestamp at time zone 'Asia/Seoul';
 insert into rebirth_private.lotto_rounds(draw_at) values(draw) on conflict do nothing;
 select * into p from rebirth_private.players where id=u for update;
 if p.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if p_action='buy' then
  select * into receipt from rebirth_private.receipts where user_id=u and request_id=p_request;
  if found then
   if receipt.fingerprint<>fp then raise exception 'REQUEST_ID_REUSED'; end if;
   result:=receipt.result;
  else
   if jsonb_typeof(p_args->'numbers') is distinct from 'array' or jsonb_array_length(p_args->'numbers')<>2 then raise exception 'INVALID_LOTTO_NUMBERS'; end if;
   if (p_args->'numbers'->>0)!~'^[0-9]+$' or (p_args->'numbers'->>1)!~'^[0-9]+$' then raise exception 'INVALID_LOTTO_NUMBERS'; end if;
   a:=least((p_args->'numbers'->>0)::integer,(p_args->'numbers'->>1)::integer);
   b:=greatest((p_args->'numbers'->>0)::integer,(p_args->'numbers'->>1)::integer);
   if a<1 or b>18 or a=b then raise exception 'INVALID_LOTTO_NUMBERS'; end if;
   -- Bind purchases to the shown round so a request crossing 21:00 cannot silently buy next week's ticket.
   if p_args->>'drawAt' is null or (p_args->>'drawAt')::timestamptz<>draw then raise exception 'LOTTO_ROUND_CHANGED'; end if;
   if exists(select 1 from rebirth_private.lotto_tickets where user_id=u and draw_at=draw and number_a=a and number_b=b) then raise exception 'LOTTO_DUPLICATE'; end if;
   select count(*) into n from rebirth_private.lotto_tickets where user_id=u and bought_at>=day_start and bought_at<day_start+interval '1 day';
   if n>=3 then raise exception 'LOTTO_DAILY_LIMIT'; end if;
   if coalesce((p.state->>'gold')::bigint,0)<1000 then raise exception 'INSUFFICIENT_GOLD'; end if;
   insert into rebirth_private.lotto_tickets(user_id,draw_at,number_a,number_b,bought_at) values(u,draw,a,b,v_now) returning id into v_ticket;
   update rebirth_private.lotto_rounds set sales=sales+1000 where draw_at=draw;
   update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb((state->>'gold')::bigint-1000)),revision=revision+1,updated_at=now() where id=u returning * into p;
   result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','lottoBuy','ticket',v_ticket,'numbers',jsonb_build_array(a,b),'cost',1000)));
   insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(u,p_request,fp,result);
  end if;
 end if;
 select jsonb_build_object('drawAt',r.draw_at,'sales',r.sales,'carryIn',r.carry_in,'minPrize',r.sales*8+r.carry_in,'maxPrize',r.sales*11+r.carry_in,
  'todayCount',(select count(*) from rebirth_private.lotto_tickets where user_id=u and bought_at>=day_start and bought_at<day_start+interval '1 day'),
  'tickets',coalesce((select jsonb_agg(jsonb_build_object('id',id,'numbers',jsonb_build_array(number_a,number_b),'boughtAt',bought_at) order by bought_at desc) from rebirth_private.lotto_tickets where user_id=u and draw_at=draw),'[]'::jsonb),
  'history',coalesce((select jsonb_agg(q order by q."drawAt" desc) from (select h.draw_at as "drawAt",h.multiplier,h.prize,h.carry_out as "carryOut",h.winner_count as "winnerCount",jsonb_build_array(h.number_a,h.number_b) as numbers,
    coalesce((select jsonb_agg(jsonb_build_object('name',pl.state->>'name','amount',t.amount)) from rebirth_private.lotto_tickets t join rebirth_private.players pl on pl.id=t.user_id where t.draw_at=h.draw_at and t.number_a=h.number_a and t.number_b=h.number_b),'[]'::jsonb) as winners,
    coalesce((select jsonb_agg(jsonb_build_object('numbers',jsonb_build_array(t.number_a,t.number_b),'amount',t.amount)) from rebirth_private.lotto_tickets t where t.draw_at=h.draw_at and t.user_id=u),'[]'::jsonb) as "myTickets"
   from rebirth_private.lotto_rounds h where h.settled_at is not null order by h.draw_at desc limit 12) q),'[]'::jsonb),
  'serverNow',v_now) into payload from rebirth_private.lotto_rounds r where r.draw_at=draw;
 return jsonb_build_object('state',p.state,'revision',p.revision,'lotto',payload,'result',result);
end $$;
revoke all on function rebirth_private.lotto(text,jsonb,uuid) from public,anon;
grant execute on function rebirth_private.lotto(text,jsonb,uuid) to authenticated;
create or replace function public.rebirth_lotto(p_action text,p_args jsonb,p_request uuid) returns jsonb
language sql security invoker set search_path='' as $$select rebirth_private.lotto(p_action,p_args,p_request)$$;
revoke all on function public.rebirth_lotto(text,jsonb,uuid) from public,anon;
grant execute on function public.rebirth_lotto(text,jsonb,uuid) to authenticated;
