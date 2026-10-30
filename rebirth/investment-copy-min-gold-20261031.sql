-- 2026-10-31: 리더가 "나를 카피하려면 보유 골드 X 이상" 최소 자본을 직접 정한다.
-- 기본·하한은 기존 공통 조건 1,000만, 상한 1조. 이미 카피 중인 유저는 끊지 않고 새 신청에만 적용.
create table if not exists rebirth_private.coin_copy_settings(
 leader uuid primary key,
 min_gold numeric not null check (min_gold>=10000000 and min_gold<=1000000000000 and min_gold=floor(min_gold)),
 updated_at timestamptz not null default now());
revoke all on table rebirth_private.coin_copy_settings from public,anon,authenticated;

create or replace function rebirth_private.coin_copy_set_min(p_min numeric)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare u uuid:=rebirth_private.session_user();
begin
 if not exists(select 1 from rebirth_private.players where id=u and state is not null) then raise exception 'CHARACTER_REQUIRED'; end if;
 if p_min is null or p_min<>floor(p_min) or p_min<10000000 or p_min>1000000000000 then raise exception 'COPY_MIN_INVALID'; end if;
 insert into rebirth_private.coin_copy_settings(leader,min_gold,updated_at) values(u,p_min,now())
 on conflict(leader) do update set min_gold=excluded.min_gold,updated_at=now();
 return rebirth_private.coin_copy_status(u)||jsonb_build_object('serverNow',clock_timestamp());
end $f$;
revoke all on function rebirth_private.coin_copy_set_min(numeric) from public,anon;
grant execute on function rebirth_private.coin_copy_set_min(numeric) to authenticated; -- 기존 coin_copy와 같은 방식(공개 래퍼가 invoker라 필요)

create or replace function public.rebirth_coin_copy_min(p_min numeric)
returns jsonb language sql set search_path to '' as $f$select rebirth_private.coin_copy_set_min(p_min)$f$;
revoke all on function public.rebirth_coin_copy_min(numeric) from public,anon;
grant execute on function public.rebirth_coin_copy_min(numeric) to authenticated;

do $m$
declare def text;
 a text:='   if coalesce((p.state->>''gold'')::numeric,0)<10000000 then raise exception ''COPY_GOLD_REQUIRED''; end if;';
 b text:='''minGold'',10000000,';
 c text:='''self'',pl.id=u)';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy(text,uuid)'::regprocedure);
 if position(a in def)=0 or position('COPY_LEADER_MIN_GOLD' in def)>0 then raise exception 'COPY_MIN_DRIFT'; end if;
 execute replace(def,a,a||'
   if coalesce((p.state->>''gold'')::numeric,0)<coalesce((select s.min_gold from rebirth_private.coin_copy_settings s where s.leader=p_leader),0) then raise exception ''COPY_LEADER_MIN_GOLD''; end if;');
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position(b in def)=0 or position(c in def)=0 or position('myMinGold' in def)>0 then raise exception 'COPY_MIN_STATUS_DRIFT'; end if;
 def:=replace(def,b,b||'''myMinGold'',coalesce((select s.min_gold from rebirth_private.coin_copy_settings s where s.leader=u),10000000),');
 def:=replace(def,c,'''minGold'',coalesce((select s.min_gold from rebirth_private.coin_copy_settings s where s.leader=pl.id),10000000),'||c);
 execute def;
end $m$;
