-- BM6: new material offers have at most 40% off. Existing offers retain prices and receipts.
set local lock_timeout='5s';
select pg_advisory_xact_lock(70909,10);
create or replace function ringu_private.black_market_personal(p_user uuid)
returns ringu_private.black_market_cycles language plpgsql security definer set search_path='' as $$
declare cycle ringu_private.black_market_cycles%rowtype;cfg ringu_private.black_market_config%rowtype;
 gear ringu_private.black_market_catalogue%rowtype;offers jsonb:='[]';saved jsonb;seen text[]:='{}';
 i integer;r integer;j integer;roll numeric;weights numeric[];weight_total numeric;existing jsonb;chosen_slot text;price integer;template jsonb;key text;resource text;
begin
 perform pg_advisory_xact_lock(70909,10);
 if p_user is distinct from auth.uid() then raise exception 'LOGIN_REQUIRED';end if;
 cycle:=ringu_private.black_market_current();
 cycle.rates:='[29.1,15,4.9,1,15,15,10,10]'::jsonb;
 select p.offers into saved from ringu_private.black_market_personal_cycles p where p.account_id=p_user and p.rotation_id=cycle.id;

 select * into strict cfg from ringu_private.black_market_config where singleton;cfg.rates:=cycle.rates;
 for i in 0..4 loop
  existing:=saved->i;
  if existing is not null then
   key:=coalesce(existing->'item'->>'resource',existing->'item'->>'slot'||'|'|| (existing->'item'->>'rarity')||'|'||(existing->'item'->>'name'));
   if not (key=any(seen)) or exists(select 1 from ringu_private.black_market_purchases where account_id=p_user and rotation_id=cycle.id and slot=i) then
    offers:=offers||jsonb_build_array(existing);seen:=array_append(seen,key);continue;
   end if;
  end if;
  weights:=array[29.1,15,4.9,1,15,15,10,10]::numeric[];
  for j in 4..7 loop
   resource:=(array['transcendStone','downgradeProtect','jadeCube','sunCube'])[j-3];
   if resource=any(seen) then weights[j+1]:=0;end if;
  end loop;
  select sum(w) into weight_total from unnest(weights) w;
  roll:=random()*weight_total;r:=0;
  for j in 0..7 loop
   roll:=roll-weights[j+1];
   if roll<0 then r:=j;exit;end if;
  end loop;
  if r>=6 then
   resource:=case when r=6 then 'jadeCube' else 'sunCube' end;
   seen:=array_append(seen,resource);
   price:=case when r=6 then 12+floor(random()*9)::integer else 30+floor(random()*21)::integer end;
   template:=jsonb_build_object('kind','consumable','resource',resource,'quantity',1,'name',case when r=6 then '비취 큐브' else '태양 큐브' end);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','consumable','price',price,'item',template,'limit',5,'originalPrice',case when r=6 then 20 else 50 end));
  elsif r>=4 then
   resource:=case when r=4 then 'transcendStone' else 'downgradeProtect' end;
   seen:=array_append(seen,resource);
   -- Roll once when the shared offer is created, never on display or purchase.
   price:=case when r=4 then 15+floor(random()*11)::integer else 6+floor(random()*5)::integer end;
   template:=jsonb_build_object('kind','consumable','resource',resource,'quantity',1,
    'name',case when r=4 then '초월석' else '하락방지권' end);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','consumable','price',price,'item',template,'limit',case when r=4 then 10 else 5 end,'originalPrice',case when r=4 then 25 else 10 end));
  else
   chosen_slot:=cfg.slots->>floor(random()*jsonb_array_length(cfg.slots))::integer;
   select * into gear from ringu_private.black_market_catalogue c
    where c.rarity=r and c.slot=chosen_slot and not ((c.slot||'|'||c.rarity||'|'||c.name)=any(seen))
    order by random() limit 1;
   if not found then raise exception 'BLACK_MARKET_CATALOGUE_INVALID';end if;
   key:=gear.slot||'|'||gear.rarity||'|'||gear.name;seen:=array_append(seen,key);
   price:=(array[3,5,10,15])[r+1];
   template:=jsonb_build_object('slot',gear.slot,'rarity',gear.rarity,'name',gear.name,
    'baseAtk',gear.base_atk,'enhance',0,'transcend',0,
    'optionRolls',jsonb_build_array(0.8,0.8),'cubeVersion',1,'cubeTier',0);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','equipment','price',price,'item',template,'limit',1));
  end if;
 end loop;

 insert into ringu_private.black_market_personal_cycles(account_id,rotation_id,offers) values(p_user,cycle.id,offers) on conflict(account_id,rotation_id) do update set offers=excluded.offers;
 cycle.offers:=offers;return cycle;
end $$;
revoke all on function ringu_private.black_market_personal(uuid) from public,anon,authenticated;
