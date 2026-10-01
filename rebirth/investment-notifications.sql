-- Account-owned read receipts; market headlines remain shared.
create table if not exists rebirth_private.coin_news_reads(user_id uuid not null references auth.users(id) on delete cascade,news_id uuid not null references rebirth_private.coin_news(id) on delete cascade,read_at timestamptz not null default now(),primary key(user_id,news_id));
alter table rebirth_private.coin_news_reads enable row level security;
revoke all on rebirth_private.coin_news_reads from public,anon,authenticated;
create or replace function rebirth_private.coin_news_notifications(p_seen uuid[] default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; v_now timestamptz:=clock_timestamp(); headlines jsonb; unread integer;
begin
 u:=rebirth_private.session_user();
 perform rebirth_private.coin_tick();
 if cardinality(p_seen)>100 then raise exception 'INVALID_NEWS_RECEIPT';end if;
 insert into rebirth_private.coin_news_reads(user_id,news_id)
 select u,n.id from rebirth_private.coin_news n where n.id=any(p_seen) and n.published_at<=v_now on conflict do nothing;
 select count(*) into unread from rebirth_private.coin_news n where n.published_at<=v_now and not exists(select 1 from rebirth_private.coin_news_reads r where r.user_id=u and r.news_id=n.id);
 select coalesce(jsonb_agg(q order by q.unread desc,q."publishedAt" desc),'[]'::jsonb) into headlines from (
  select n.id,n.coin,c.kind,c.headline,n.published_at as "publishedAt",n.expires_at as "expiresAt",not exists(select 1 from rebirth_private.coin_news_reads r where r.user_id=u and r.news_id=n.id) as unread
  from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog
  where n.published_at<=v_now order by unread desc,n.published_at desc limit 100
 ) q;
 return jsonb_build_object('news',headlines,'unread',unread,'serverNow',v_now);
end $$;
revoke all on function rebirth_private.coin_news_notifications(uuid[]) from public,anon;
grant execute on function rebirth_private.coin_news_notifications(uuid[]) to authenticated;
create or replace function public.rebirth_coin_news_notifications(p_seen uuid[] default '{}') returns jsonb language sql security invoker set search_path='' as $$select rebirth_private.coin_news_notifications(p_seen)$$;
revoke all on function public.rebirth_coin_news_notifications(uuid[]) from public,anon;
grant execute on function public.rebirth_coin_news_notifications(uuid[]) to authenticated;
