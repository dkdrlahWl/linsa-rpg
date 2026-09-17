set local lock_timeout='5s';
set local statement_timeout='15s';
DO $guard$ BEGIN
IF pg_get_functiondef('ringu_private.black_market_personal(uuid)'::regprocedure) IS DISTINCT FROM $prior$CREATE OR REPLACE FUNCTION ringu_private.black_market_personal(p_user uuid)
 RETURNS ringu_private.black_market_cycles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cycle ringu_private.black_market_cycles%rowtype;cfg ringu_private.black_market_config%rowtype;
 gear ringu_private.black_market_catalogue%rowtype;offers jsonb:='[]';saved jsonb;seen text[]:='{}';
 i integer;r integer;j integer;roll numeric;weights numeric[];weight_total numeric;existing jsonb;chosen_slot text;price integer;template jsonb;key text;resource text;
begin
 perform pg_advisory_xact_lock(70909,10);
 if p_user is distinct from auth.uid() then raise exception 'LOGIN_REQUIRED';end if;
 cycle:=ringu_private.black_market_current();
 cycle.rates:='[29,15,4.9,1,15,15,10,10,0.1]'::jsonb;
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
  weights:=array[29,15,4.9,1,15,15,10,10]::numeric[];
  for j in 4..7 loop
   resource:=(array['transcendStone','downgradeProtect','jadeCube','sunCube'])[j-3];
   if resource=any(seen) then weights[j+1]:=0;end if;
  end loop;
  select sum(w) into weight_total from unnest(weights) w;
  -- Mythic is exactly 0.1% per new offer, unaffected by consumable duplicate exclusions.
  if random()<0.001 then r:=8;
  else
  roll:=random()*weight_total;r:=0;
  for j in 0..7 loop
   roll:=roll-weights[j+1];
   if roll<0 then r:=j;exit;end if;
  end loop;
  end if;
  if r>=6 and r<>8 then
   resource:=case when r=6 then 'jadeCube' else 'sunCube' end;
   seen:=array_append(seen,resource);
   price:=case when r=6 then 12+floor(random()*9)::integer else 30+floor(random()*21)::integer end;
   template:=jsonb_build_object('kind','consumable','resource',resource,'quantity',1,'name',case when r=6 then '비취 큐브' else '태양 큐브' end);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','consumable','price',price,'item',template,'limit',5,'originalPrice',case when r=6 then 20 else 50 end));
  elsif r>=4 and r<>8 then
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
    where c.rarity=(case when r=8 then 5 else r end) and c.slot=chosen_slot and not ((c.slot||'|'||c.rarity||'|'||c.name)=any(seen))
    order by random() limit 1;
   if not found then raise exception 'BLACK_MARKET_CATALOGUE_INVALID';end if;
   key:=gear.slot||'|'||gear.rarity||'|'||gear.name;seen:=array_append(seen,key);
   price:=case when r=8 then 100 else (array[3,5,10,15])[r+1] end;
   template:=jsonb_build_object('slot',gear.slot,'rarity',gear.rarity,'name',gear.name,
    'baseAtk',gear.base_atk,'enhance',0,'transcend',0,
    'optionRolls',jsonb_build_array(0.8,0.8),'cubeVersion',1,'cubeTier',0);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','equipment','price',price,'item',template,'limit',1));
  end if;
 end loop;

 insert into ringu_private.black_market_personal_cycles(account_id,rotation_id,offers) values(p_user,cycle.id,offers) on conflict(account_id,rotation_id) do update set offers=excluded.offers;
 cycle.offers:=offers;return cycle;
end $function$
$prior$ THEN RAISE EXCEPTION 'BLACK_MARKET_SOURCE_CHANGED'; END IF;
END $guard$;
ALTER TABLE ringu_private.black_market_catalogue DROP CONSTRAINT black_market_catalogue_rarity_check;
ALTER TABLE ringu_private.black_market_catalogue ADD CONSTRAINT black_market_catalogue_rarity_check CHECK(rarity BETWEEN 0 AND 5);
INSERT INTO ringu_private.black_market_catalogue(slot,rarity,name,base_atk) VALUES
('무기',4,'태양의 장검',848),
('무기',4,'창세의 검',862),
('무기',4,'천벌의 대검',876),
('무기',4,'신왕의 환도',890),
('무기',4,'세계수의 마검',904),
('무기',4,'종말의 성검',912),
('무기',4,'라그나로크 쌍검',920),
('무기',4,'아포칼립스 도',934),
('무기',4,'발할라의 검날',948),
('무기',4,'오딘의 룬소드',962),
('투구',4,'태양의 철투구',214),
('투구',4,'창세의 면갑',216),
('투구',4,'천벌의 전투모',221),
('투구',4,'신왕의 왕관',223),
('투구',4,'세계수의 뿔투구',228),
('투구',4,'종말의 기사투구',230),
('투구',4,'라그나로크 두건',233),
('투구',4,'아포칼립스 투구',235),
('투구',4,'발할라의 머리장식',240),
('투구',4,'오딘의 가면',242),
('갑옷',4,'태양의 흉갑',210),
('갑옷',4,'창세의 판금갑옷',212),
('갑옷',4,'천벌의 전투복',217),
('갑옷',4,'신왕의 사슬갑옷',219),
('갑옷',4,'세계수의 로브',224),
('갑옷',4,'종말의 용갑',226),
('갑옷',4,'라그나로크 수호갑',231),
('갑옷',4,'아포칼립스 갑주',233),
('갑옷',4,'발할라의 성의',236),
('갑옷',4,'오딘의 전신갑옷',238),
('바지',4,'태양의 각반',213),
('바지',4,'창세의 전투바지',215),
('바지',4,'천벌의 하의',220),
('바지',4,'신왕의 다리갑옷',222),
('바지',4,'세계수의 사슬바지',227),
('바지',4,'종말의 용린각반',229),
('바지',4,'라그나로크 마법바지',234),
('바지',4,'아포칼립스 수호각반',236),
('바지',4,'발할라의 철갑바지',239),
('바지',4,'오딘의 성전하의',241),
('신발',4,'태양의 장화',211),
('신발',4,'창세의 군화',216),
('신발',4,'천벌의 철구두',218),
('신발',4,'신왕의 전투화',223),
('신발',4,'세계수의 질풍화',225),
('신발',4,'종말의 용린신',230),
('신발',4,'라그나로크 마법장화',232),
('신발',4,'아포칼립스 수호신',237),
('신발',4,'발할라의 각갑',239),
('신발',4,'오딘의 성전장화',242),
('반지',4,'태양의 철반지',426),
('반지',4,'창세의 인장',433),
('반지',4,'천벌의 보석반지',440),
('반지',4,'신왕의 룬링',447),
('반지',4,'세계수의 옥반지',454),
('반지',4,'종말의 마력반지',455),
('반지',4,'라그나로크 서약반지',462),
('반지',4,'아포칼립스 왕의인장',469),
('반지',4,'발할라의 수호링',476),
('반지',4,'오딘의 성전반지',483),
('귀걸이',4,'태양의 철귀걸이',422),
('귀걸이',4,'창세의 수정귀걸이',429),
('귀걸이',4,'천벌의 별귀걸이',436),
('귀걸이',4,'신왕의 룬이어링',443),
('귀걸이',4,'세계수의 옥귀걸이',450),
('귀걸이',4,'종말의 마력귀걸이',457),
('귀걸이',4,'라그나로크 서약귀걸이',458),
('귀걸이',4,'아포칼립스 왕의귀걸이',465),
('귀걸이',4,'발할라의 수호이어링',472),
('귀걸이',4,'오딘의 성전귀걸이',479)
ON CONFLICT(slot,rarity,name) DO UPDATE SET base_atk=excluded.base_atk;
CREATE OR REPLACE FUNCTION ringu_private.black_market_personal(p_user uuid)
 RETURNS ringu_private.black_market_cycles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare cycle ringu_private.black_market_cycles%rowtype;cfg ringu_private.black_market_config%rowtype;
 gear ringu_private.black_market_catalogue%rowtype;offers jsonb:='[]';saved jsonb;seen text[]:='{}';
 i integer;r integer;j integer;roll numeric;weights numeric[];weight_total numeric;existing jsonb;chosen_slot text;price integer;template jsonb;key text;resource text;
begin
 perform pg_advisory_xact_lock(70909,10);
 if p_user is distinct from auth.uid() then raise exception 'LOGIN_REQUIRED';end if;
 cycle:=ringu_private.black_market_current();
 cycle.rates:='[24,15,4.9,5,15,15,10,10,0.1,1]'::jsonb;
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
  weights:=array[24,15,4.9,0,15,15,10,10]::numeric[];
  for j in 4..7 loop
   resource:=(array['transcendStone','downgradeProtect','jadeCube','sunCube'])[j-3];
   if resource=any(seen) then weights[j+1]:=0;end if;
  end loop;
  select sum(w) into weight_total from unnest(weights) w;
  -- Fixed per-offer rates: mythic 0.1%, legendary 1%, epic 5%.
  roll:=random();
  if roll<0.001 then r:=8;
  elsif roll<0.011 then r:=9;
  elsif roll<0.061 then r:=3;
  else
  roll:=random()*weight_total;r:=0;
  for j in 0..7 loop
   roll:=roll-weights[j+1];
   if roll<0 then r:=j;exit;end if;
  end loop;
  end if;
  if r>=6 and r<8 then
   resource:=case when r=6 then 'jadeCube' else 'sunCube' end;
   seen:=array_append(seen,resource);
   price:=case when r=6 then 12+floor(random()*9)::integer else 30+floor(random()*21)::integer end;
   template:=jsonb_build_object('kind','consumable','resource',resource,'quantity',1,'name',case when r=6 then '비취 큐브' else '태양 큐브' end);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','consumable','price',price,'item',template,'limit',5,'originalPrice',case when r=6 then 20 else 50 end));
  elsif r>=4 and r<8 then
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
    where c.rarity=(case when r=8 then 5 when r=9 then 4 else r end) and c.slot=chosen_slot and not ((c.slot||'|'||c.rarity||'|'||c.name)=any(seen))
    order by random() limit 1;
   if not found then raise exception 'BLACK_MARKET_CATALOGUE_INVALID';end if;
   key:=gear.slot||'|'||gear.rarity||'|'||gear.name;seen:=array_append(seen,key);
   price:=case when r=8 then 100 when r=9 then 50 else (array[3,5,10,15])[r+1] end;
   template:=jsonb_build_object('slot',gear.slot,'rarity',gear.rarity,'name',gear.name,
    'baseAtk',gear.base_atk,'enhance',0,'transcend',0,
    'optionRolls',jsonb_build_array(0.8,0.8),'cubeVersion',1,'cubeTier',0);
   offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'kind','equipment','price',price,'item',template,'limit',1));
  end if;
 end loop;

 insert into ringu_private.black_market_personal_cycles(account_id,rotation_id,offers) values(p_user,cycle.id,offers) on conflict(account_id,rotation_id) do update set offers=excluded.offers;
 cycle.offers:=offers;return cycle;
end $function$
;
