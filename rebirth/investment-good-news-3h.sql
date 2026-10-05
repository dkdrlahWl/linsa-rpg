begin;
select pg_advisory_xact_lock(71823081);
alter table rebirth_private.coin_news drop constraint coin_news_check;
create or replace function rebirth_private.coin_news_duration() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.expires_at:=new.published_at+case when (select kind from rebirth_private.coin_news_catalog where id=new.catalog)='good' then interval '3 hours' else interval '8 hours' end;
 return new;
end $$;
revoke all on function rebirth_private.coin_news_duration() from public,anon,authenticated;
create trigger coin_news_duration before insert or update of published_at,catalog,expires_at on rebirth_private.coin_news for each row execute function rebirth_private.coin_news_duration();
update rebirth_private.coin_news set expires_at=published_at+interval '3 hours' where catalog in(select id from rebirth_private.coin_news_catalog where kind='good');
alter table rebirth_private.coin_news add constraint coin_news_check check(expires_at in (published_at+interval '3 hours',published_at+interval '8 hours'));
create or replace function rebirth_private.coin_up_chance(p_coin integer,p_at timestamptz) returns numeric language sql stable security definer set search_path='' as $$
 with latest as(select c.kind from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog where n.coin=p_coin and n.published_at<=p_at order by n.published_at desc,n.id desc limit 1), cutoff as(select max(n.published_at) at from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog where n.coin=p_coin and n.published_at<=p_at and c.kind<>(select kind from latest))
 -- Wonjae's regular random ticks use a fixed 35% up / 65% down split.
 select case when p_coin=2 then .35 else greatest(.05,least(.95,.5*(1+coalesce(sum(case when c.kind='good' then n.boost*.5 else -n.boost end),0)))) end
 from rebirth_private.coin_news n join rebirth_private.coin_news_catalog c on c.id=n.catalog
 where n.coin=p_coin and n.published_at<=p_at and n.expires_at>p_at and c.kind=(select kind from latest) and ((select at from cutoff) is null or n.published_at>(select at from cutoff))
$$;
commit;
