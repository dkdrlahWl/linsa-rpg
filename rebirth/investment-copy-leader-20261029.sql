-- 2026-10-29: 거래내역에서 카피로 팔린 거래 옆에 "카피 · 리더이름"을 보여준다.
-- 1) coin_positions.copy_leader: 리더 판매로 같이 팔린 포지션의 리더.
-- 2) 카피 판매(coin_copy_sell)가 copy_leader를 같이 기록한다.
-- 3) 기존 카피 기록은 같은 코인·방향·배율의 coin_copy_trades(판매 시각 ±수 초)로 채운다.
-- 4) coin_activity 목록에 copyLeader(리더 이름)를 넣는다. 합계 계산은 그대로.
alter table rebirth_private.coin_positions add column if not exists copy_leader uuid;

do $m$
declare sig regprocedure; def text; patched text;
begin
 foreach sig in array array['rebirth_private.coin_copy_sell(uuid,integer,text,smallint,boolean)'::regprocedure] loop
  def:=pg_get_functiondef(sig);
  if position('copy_leader' in def)>0 then continue; end if;
  patched:=replace(def,'closed_reason=''copy'' where id=f.id','closed_reason=''copy'',copy_leader=p_leader where id=f.id');
  patched:=replace(patched,'leverage,status,opened_at,closed_at,payout,fee,closed_reason)','leverage,status,opened_at,closed_at,payout,fee,closed_reason,copy_leader)');
  patched:=replace(patched,'clock_timestamp(),v_payout,v_fee,''copy'')','clock_timestamp(),v_payout,v_fee,''copy'',p_leader)');
  if (length(patched)-length(def))<>(length(',copy_leader=p_leader')+length(',copy_leader')+length(',p_leader')) then raise exception 'COPY_LEADER_PATCH_DRIFT'; end if;
  execute patched;
 end loop;
end $m$;

update rebirth_private.coin_positions h set copy_leader=m.leader
from (select h2.id,(select t.leader from rebirth_private.coin_copy_trades t
        where t.coin=h2.coin and t.side=h2.side and t.leverage=h2.leverage
          and t.closed_at between h2.closed_at-interval '2 seconds' and h2.closed_at+interval '10 seconds'
        order by abs(extract(epoch from t.closed_at-h2.closed_at)) limit 1) leader
      from rebirth_private.coin_positions h2 where h2.closed_reason='copy' and h2.copy_leader is null) m
where h.id=m.id and m.leader is not null;

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
   select h.id,h.coin,h.side,h.leverage,h.amount,h.entry,h.payout,h.fee,h.status,h.closed_reason as reason,h.closed_at as "closedAt",(select pl.state->>'name' from rebirth_private.players pl where pl.id=h.copy_leader) as "copyLeader"
   from rebirth_private.coin_positions h where h.user_id=u and h.status<>'open' and (p_before is null or (h.closed_at,h.id)<(p_before,coalesce(p_before_id,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
   order by h.closed_at desc,h.id desc limit 15
  ) q;
 else raise exception 'INVALID_COIN_ACTIVITY';end if;
 return jsonb_build_object('items',items,'serverNow',v_now,'totals',totals);
end $function$;
