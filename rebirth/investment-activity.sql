-- Cursor paging preserves older news and private realized trade history.
create or replace function rebirth_private.coin_activity(p_kind text,p_before timestamptz default null,p_before_id uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; v_now timestamptz:=clock_timestamp(); items jsonb;
begin
 u:=rebirth_private.session_user();
 if p_kind='news' then
  select coalesce(jsonb_agg(q order by q."publishedAt" desc,q.id desc),'[]'::jsonb) into items from (
   select n.id,n.coin,c.kind,c.headline,n.published_at as "publishedAt",n.expires_at as "expiresAt"
   from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog
   where n.published_at<=v_now and (p_before is null or (n.published_at,n.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by n.published_at desc,n.id desc limit 15
  ) q;
 elsif p_kind='trades' then
  select coalesce(jsonb_agg(q order by q."closedAt" desc,q.id desc),'[]'::jsonb) into items from (
   select h.id,h.coin,h.amount,h.entry,h.payout,h.fee,h.status,h.closed_reason as reason,h.closed_at as "closedAt"
   from rebirth_private.coin_positions h where h.user_id=u and h.status<>'open' and (p_before is null or (h.closed_at,h.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by h.closed_at desc,h.id desc limit 15
  ) q;
 else raise exception 'INVALID_COIN_ACTIVITY';end if;
 return jsonb_build_object('items',items,'serverNow',v_now);
end $$;
revoke all on function rebirth_private.coin_activity(text,timestamptz,uuid) from public,anon;
grant execute on function rebirth_private.coin_activity(text,timestamptz,uuid) to authenticated;
create or replace function public.rebirth_coin_activity(p_kind text,p_before timestamptz default null,p_before_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.coin_activity(p_kind,p_before,p_before_id)$$;
revoke all on function public.rebirth_coin_activity(text,timestamptz,uuid) from public,anon;
grant execute on function public.rebirth_coin_activity(text,timestamptz,uuid) to authenticated;
