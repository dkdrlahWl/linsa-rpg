-- 2026-10-31: 카피 리더 한 줄 소개(최대 60자). 다른 유저가 카피 목록에서 보고 참고한다.
alter table rebirth_private.coin_copy_settings add column if not exists intro text not null default '' check (char_length(intro)<=60);
alter table rebirth_private.coin_copy_settings alter column min_gold set default 10000000;

create or replace function rebirth_private.coin_copy_set_intro(p_intro text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare u uuid:=rebirth_private.session_user(); v text;
begin
 if not exists(select 1 from rebirth_private.players where id=u and state is not null) then raise exception 'CHARACTER_REQUIRED'; end if;
 v:=btrim(regexp_replace(coalesce(p_intro,''),'[[:cntrl:]]+',' ','g'));
 if char_length(v)>60 then raise exception 'COPY_INTRO_TOO_LONG'; end if;
 insert into rebirth_private.coin_copy_settings(leader,intro,updated_at) values(u,v,now())
 on conflict(leader) do update set intro=excluded.intro,updated_at=now();
 return rebirth_private.coin_copy_status(u)||jsonb_build_object('serverNow',clock_timestamp());
end $f$;
revoke all on function rebirth_private.coin_copy_set_intro(text) from public,anon;
grant execute on function rebirth_private.coin_copy_set_intro(text) to authenticated;

create or replace function public.rebirth_coin_copy_intro(p_intro text)
returns jsonb language sql set search_path to '' as $f$select rebirth_private.coin_copy_set_intro(p_intro)$f$;
revoke all on function public.rebirth_coin_copy_intro(text) from public,anon;
grant execute on function public.rebirth_coin_copy_intro(text) to authenticated;

do $m$
declare def text; b text:='''myMinGold'','; c text:='''self'',pl.id=u)';
begin
 def:=pg_get_functiondef('rebirth_private.coin_copy_status(uuid)'::regprocedure);
 if position(b in def)=0 or position(c in def)=0 or position('myIntro' in def)>0 then raise exception 'COPY_INTRO_STATUS_DRIFT'; end if;
 def:=replace(def,b,'''myIntro'',coalesce((select s.intro from rebirth_private.coin_copy_settings s where s.leader=u),''''),'||b);
 def:=replace(def,c,'''intro'',coalesce((select s.intro from rebirth_private.coin_copy_settings s where s.leader=pl.id),''''),'||c);
 execute def;
end $m$;
