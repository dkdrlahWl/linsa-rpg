create or replace function rebirth_private.coin_rankings() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; result jsonb;
begin
 actor:=rebirth_private.session_user();
 if actor is null then raise exception 'LOGIN_REQUIRED'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('name',q.name,'percent',q.percent) order by q.percent desc,q.name),'[]'::jsonb) into result from (
 select p.state->>'name' name,coalesce(round(100*sum(coalesce(h.payout,0)-h.amount)/nullif(sum(h.amount),0),2),0) percent
 from rebirth_private.players p join auth.users u on u.id=p.id
 left join rebirth_private.coin_positions h on h.user_id=p.id and h.status<>'open'
 where coalesce(u.raw_app_meta_data->>'ringu_admin','false')<>'true' and p.state is not null
 group by p.id,p.state->>'name'
 ) q;
 return jsonb_build_object('users',result,'serverNow',clock_timestamp());
end $$;
revoke all on function rebirth_private.coin_rankings() from public,anon;
grant execute on function rebirth_private.coin_rankings() to authenticated;
create or replace function public.rebirth_coin_rankings() returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.coin_rankings()$$;
revoke all on function public.rebirth_coin_rankings() from public,anon;
grant execute on function public.rebirth_coin_rankings() to authenticated;
