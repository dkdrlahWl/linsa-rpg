begin;
create or replace function rebirth_private.normalize_player_gold() returns trigger language plpgsql security definer set search_path='' as $$
declare g numeric; r numeric;
begin
 if new.state is null or jsonb_typeof(new.state->'gold')<>'number' then return new;end if;
 g:=(new.state->>'gold')::numeric;
 if g>=0 and g<=9000000000000 and g<>floor(g) then
  r:=coalesce((new.state->>'goldRemainder')::numeric,0)+g-floor(g);
  new.state:=jsonb_set(jsonb_set(new.state,'{gold}',to_jsonb(floor(g)+floor(r))),'{goldRemainder}',to_jsonb(r-floor(r)));
 end if;
 return new;
end $$;
revoke all on function rebirth_private.normalize_player_gold() from public,anon,authenticated;
create trigger normalize_player_gold before insert or update of state on rebirth_private.players for each row execute function rebirth_private.normalize_player_gold();
update rebirth_private.players set state=state,revision=revision+1,updated_at=now() where (state->>'gold')::numeric<>floor((state->>'gold')::numeric);
commit;
