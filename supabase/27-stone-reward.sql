-- Claim earned rewards independently of preference saves; retries never grant twice.
create or replace function public.ringu_stone_reward(p_room uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; rev bigint; result jsonb; earned integer; received boolean;
begin
  perform pg_advisory_xact_lock(70909,10);
  u:=ringu_private.require_session(false);
  select revision into rev from ringu_private.accounts where id=u;
  result:=public.ringu_claim_party(rev);
  select amount,claimed into earned,received from ringu_private.rewards where account_id=u and room_id=p_room;
  return jsonb_build_object('ok',true,'stoneAward',result->'stoneAward',
    'balance',result->'state'->'transcendStone','roomReward',coalesce(earned,0),
    'claimed',coalesce(received,false));
end $$;
revoke all on function public.ringu_stone_reward(uuid) from public,anon;
grant execute on function public.ringu_stone_reward(uuid) to authenticated;
