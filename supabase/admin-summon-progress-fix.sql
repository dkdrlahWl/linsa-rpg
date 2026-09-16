CREATE OR REPLACE FUNCTION ringu_private.enforce_admin_resources()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_floor bigint; k text; v_summon jsonb; v_exp bigint; v_level integer; v_world2 boolean; v_step bigint;
begin
  select currency_floor into v_floor from ringu_private.admin_accounts where account_id=new.id;
  if found then
    new.state:=coalesce(new.state,'{}'::jsonb);
    foreach k in array array['gold','essence','transcendStone','downgradeProtect','dungeonTickets','petStone','petTicket'] loop
      new.state:=jsonb_set(new.state,array[k],to_jsonb(greatest(v_floor,ringu_private.n(new.state->k,9007199254740991))));
    end loop;
    if jsonb_typeof(new.state->'summons') is distinct from 'object' then
      new.state:=jsonb_set(new.state,'{summons}','{}'::jsonb);
    end if;
    v_world2:=coalesce(new.state->'world2Unlocked'='true'::jsonb,false);
    v_step:=ringu_private.n(new.state->'monsterUnlockStep',9007199254740991);
    foreach k in array array['weapon','armor','accessory'] loop
      v_summon:=new.state#>array['summons',k];
      if jsonb_typeof(v_summon) is distinct from 'object' then v_summon:='{}'::jsonb; end if;
      v_exp:=greatest(19050,ringu_private.n(v_summon->'exp',9007199254740991));
      v_level:=15;
      if v_world2 then
        v_level:=16;
        if v_exp>=29050 and v_step>=42 then
          v_level:=17;
          if v_exp>=49050 and v_step>=60 then v_level:=18; end if;
        end if;
      end if;
      new.state:=jsonb_set(new.state,array['summons',k],
        v_summon || jsonb_build_object('level',v_level,'exp',v_exp,'world2Version',1));
    end loop;
    new.state:=jsonb_set(new.state,'{rankingHidden}','true'::jsonb);
  end if;
  return new;
end $function$;