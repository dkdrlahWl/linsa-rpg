-- Read-only administrator view, checked against trusted account metadata on every request.
create or replace function rebirth_private.admin_positions() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid; result jsonb;
begin
 actor:=rebirth_private.session_user();
 if not exists(select 1 from auth.users where id=actor and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'BETA_DISABLED';end if;
 perform rebirth_private.coin_tick();
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.state->>'name','level',p.state->'level','positions',coalesce(q.items,'[]'::jsonb)) order by p.state->>'name',p.id),'[]'::jsonb) into result
 from rebirth_private.players p
 left join lateral (
  select jsonb_agg(jsonb_build_object('id',h.id,'coin',h.coin,'name',m.name,'side',h.side,'amount',h.amount,'entry',h.entry,'quantity',h.quantity,'price',m.price,'openedAt',h.opened_at) order by h.coin,h.side) items
  from rebirth_private.coin_positions h join rebirth_private.coin_market m on m.id=h.coin where h.user_id=p.id and h.status='open'
 ) q on true where p.state is not null;
 return jsonb_build_object('users',result,'serverNow',clock_timestamp());
end $$;
revoke all on function rebirth_private.admin_positions() from public,anon;
grant execute on function rebirth_private.admin_positions() to authenticated;
create or replace function public.rebirth_admin_positions() returns jsonb
language sql security invoker set search_path='' as $$select rebirth_private.admin_positions()$$;
revoke all on function public.rebirth_admin_positions() from public,anon;
grant execute on function public.rebirth_admin_positions() to authenticated;
