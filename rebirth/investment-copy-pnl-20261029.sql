-- 2026-10-29: 코인 거래내역 요약을 "직접 거래"와 "카피 거래"로 나눈다.
-- 리더가 팔아서 같이 팔린 포지션(closed_reason='copy')은 위 총 수익·손실·PnL에서 빼고 totals.copy에 따로 담는다.
-- 목록(items)·페이지 넘김·뉴스는 바꾸지 않는다.
create or replace function rebirth_private.coin_activity(p_kind text, p_before timestamptz default null, p_before_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $function$
declare u uuid; v_now timestamptz:=clock_timestamp(); items jsonb; totals jsonb;
begin
 u:=rebirth_private.session_user();
 if p_kind='news' then
  perform rebirth_private.coin_tick_if_due();
  select coalesce(jsonb_agg(q order by q."publishedAt" desc,q.id desc),'[]'::jsonb) into items from (
   select n.id,n.coin,c.kind,c.headline,n.published_at as "publishedAt",n.expires_at as "expiresAt"
   from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog
   where n.published_at<=v_now and (p_before is null or (n.published_at,n.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by n.published_at desc,n.id desc limit 15
  ) q;
 elsif p_kind='trades' then
  select jsonb_build_object(
    'profit',coalesce(sum(greatest(coalesce(h.payout,0)-h.amount,0)) filter (where not h.is_copy),0),
    'loss',coalesce(sum(greatest(h.amount-coalesce(h.payout,0),0)) filter (where not h.is_copy),0),
    'pnl',coalesce(sum(coalesce(h.payout,0)-h.amount) filter (where not h.is_copy),0),
    'copy',jsonb_build_object(
      'profit',coalesce(sum(greatest(coalesce(h.payout,0)-h.amount,0)) filter (where h.is_copy),0),
      'loss',coalesce(sum(greatest(h.amount-coalesce(h.payout,0),0)) filter (where h.is_copy),0),
      'pnl',coalesce(sum(coalesce(h.payout,0)-h.amount) filter (where h.is_copy),0)))
  into totals
  from (select x.payout,x.amount,coalesce(x.closed_reason,'')='copy' as is_copy
        from rebirth_private.coin_positions x where x.user_id=u and x.status<>'open') h;
  select coalesce(jsonb_agg(q order by q."closedAt" desc,q.id desc),'[]'::jsonb) into items from (
   select h.id,h.coin,h.side,h.leverage,h.amount,h.entry,h.payout,h.fee,h.status,h.closed_reason as reason,h.closed_at as "closedAt"
   from rebirth_private.coin_positions h where h.user_id=u and h.status<>'open' and (p_before is null or (h.closed_at,h.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by h.closed_at desc,h.id desc limit 15
  ) q;
 else raise exception 'INVALID_COIN_ACTIVITY';end if;
 return jsonb_build_object('items',items,'serverNow',v_now,'totals',totals);
end $function$;
