-- Supabase SQL Editor에서 한 번 실행. 재실행해도 중복 지급되지 않습니다.
-- 요청 시각 이후 가입 계정 제외: 2026-09-09 02:04:54 KST.
-- 첫 실행 때 랭킹 공개 대상(최대 200명)을 고정합니다. 데이터 삭제 없음.
begin;
create table if not exists ringu_private.gift_campaigns (
 id text primary key, created_at timestamptz not null default now()
);
create table if not exists ringu_private.gift_receipts (
 campaign_id text references ringu_private.gift_campaigns(id),
 account_id uuid references auth.users(id), granted_at timestamptz not null default now(),
 primary key(campaign_id,account_id)
);
alter table ringu_private.gift_campaigns enable row level security;
alter table ringu_private.gift_receipts enable row level security;
revoke all on ringu_private.gift_campaigns,ringu_private.gift_receipts from public,anon,authenticated;
do $$
declare target record; campaign constant text := 'ranking-aura-20260909-020454';
begin
 lock table ringu_private.accounts in share row exclusive mode;
 insert into ringu_private.gift_campaigns(id) values(campaign) on conflict do nothing;
 if not found then return; end if;
 for target in
  select a.id from ringu_private.accounts a join auth.users u on u.id=a.id
  where coalesce(a.state->>'rankingHidden','false')<>'true'
    and u.created_at <= timestamptz '2026-09-08 17:04:54+00'
  order by ringu_private.n(a.state#>'{remodelProfile,power}',100000000) desc,a.id
  limit 200
 loop
  insert into ringu_private.gift_receipts(campaign_id,account_id) values(campaign,target.id);
  update ringu_private.accounts set
   state=jsonb_set(coalesce(state,'{}'::jsonb),'{auraDrawTickets}',
     to_jsonb(ringu_private.n(state->'auraDrawTickets',9000000000000)+1)),
   revision=revision+1,updated_at=now()
  where id=target.id;
 end loop;
end $$;
commit;
select count(*) as gifted_players from ringu_private.gift_receipts
where campaign_id='ranking-aura-20260909-020454';
