-- 2026-11-05 도현: 오늘(한국 날짜 11-05) 링구코인·지원코인 양봉 확률 60% (09:35 이후). 변동 크기는 그대로, 다음 날 자동 해제.
create or replace function rebirth_private.coin_up_chance(p_coin integer, p_at timestamp with time zone)
 returns numeric language sql stable security definer set search_path to '' as $function$
 with latest as(select c.kind from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog where n.coin=p_coin and n.published_at<=p_at order by n.published_at desc,n.id desc limit 1), cutoff as(select max(n.published_at) at from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog where n.coin=p_coin and n.published_at<=p_at and c.kind<>(select kind from latest))
 -- Wonjae's regular random ticks use a fixed 50% up / 50% down split.
 -- 2026-11-05 운영자: 이날(한국 날짜) 링구코인·지원코인 09:35 이후 양봉 60%. 다음 날 자동 해제.
 select case when p_coin in (1,4) and (p_at at time zone 'Asia/Seoul')::date=date '2026-11-05' and (p_at at time zone 'Asia/Seoul')::time>=time '09:35' then .60
  when p_coin=2 then .50 else greatest(.05,least(.95,.5*(1+coalesce(sum(case when c.kind='good' then n.boost*.5 else -n.boost end),0)))) end
 from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog
 where n.coin=p_coin and n.published_at<=p_at and n.expires_at>p_at and c.kind=(select kind from latest) and ((select at from cutoff) is null or n.published_at>(select at from cutoff))
$function$;
