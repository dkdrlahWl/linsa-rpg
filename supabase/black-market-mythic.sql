set local lock_timeout='5s';
set local statement_timeout='15s';
-- Preserve current offers and all purchase records; next generated offers use BM6.
do $guard$
begin
 if pg_get_functiondef('ringu_private.black_market_personal(uuid)'::regprocedure) <> $prior$CREATE OR REPLACE FUNCTION ringu_private.black_market_personal(p_user uuid)
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
end $function$
$prior$ then raise exception 'BLACK_MARKET_SOURCE_CHANGED'; end if;
end $guard$;
alter table ringu_private.black_market_catalogue drop constraint black_market_catalogue_rarity_check;
alter table ringu_private.black_market_catalogue add constraint black_market_catalogue_rarity_check check(rarity in (0,1,2,3,5));
insert into ringu_private.black_market_catalogue(slot,rarity,name,base_atk) values
('무기',5,'피의 맹약 도끼',2532),
('무기',5,'붉은 심연 검',2540),
('무기',5,'멸망의 별 대검',2554),
('무기',5,'마신의 건틀릿',2568),
('무기',5,'혼돈왕의 메이스',2454),
('무기',5,'적룡신의 지팡이',2468),
('무기',5,'파멸자의 완드',2482),
('무기',5,'무한 재앙 쌍검',2496),
('무기',5,'종언의 전투도끼',2510),
('무기',5,'신살자의 파멸대검',2524),
('투구',5,'피의 맹약 철투구',637),
('투구',5,'붉은 심연 면갑',640),
('투구',5,'멸망의 별 전투모',641),
('투구',5,'마신의 왕관',644),
('투구',5,'혼돈왕의 뿔투구',616),
('투구',5,'적룡신의 기사투구',619),
('투구',5,'파멸자의 두건',623),
('투구',5,'무한 재앙 투구',626),
('투구',5,'종언의 머리장식',630),
('투구',5,'신살자의 가면',633),
('갑옷',5,'피의 맹약 흉갑',636),
('갑옷',5,'붉은 심연 판금갑옷',640),
('갑옷',5,'멸망의 별 전투복',643),
('갑옷',5,'마신의 사슬갑옷',644),
('갑옷',5,'혼돈왕의 로브',615),
('갑옷',5,'적룡신의 용갑',619),
('갑옷',5,'파멸자의 수호갑',622),
('갑옷',5,'무한 재앙 갑주',626),
('갑옷',5,'종언의 성의',629),
('갑옷',5,'신살자의 전신갑옷',633),
('바지',5,'피의 맹약 각반',632),
('바지',5,'붉은 심연 전투바지',636),
('바지',5,'멸망의 별 하의',639),
('바지',5,'마신의 다리갑옷',643),
('바지',5,'혼돈왕의 사슬바지',614),
('바지',5,'적룡신의 용린각반',615),
('바지',5,'파멸자의 마법바지',618),
('바지',5,'무한 재앙 수호각반',622),
('바지',5,'종언의 철갑바지',625),
('바지',5,'신살자의 성전하의',629),
('신발',5,'피의 맹약 장화',632),
('신발',5,'붉은 심연 군화',635),
('신발',5,'멸망의 별 철구두',639),
('신발',5,'마신의 전투화',642),
('신발',5,'혼돈왕의 질풍화',614),
('신발',5,'적룡신의 용린신',617),
('신발',5,'파멸자의 마법장화',618),
('신발',5,'무한 재앙 수호신',621),
('신발',5,'종언의 각갑',625),
('신발',5,'신살자의 성전장화',628),
('반지',5,'피의 맹약 철반지',1265),
('반지',5,'붉은 심연 인장',1272),
('반지',5,'멸망의 별 보석반지',1279),
('반지',5,'마신의 룬링',1286),
('반지',5,'혼돈왕의 옥반지',1229),
('반지',5,'적룡신의 마력반지',1236),
('반지',5,'파멸자의 서약반지',1243),
('반지',5,'무한 재앙 왕의인장',1250),
('반지',5,'종언의 수호링',1257),
('반지',5,'신살자의 성전반지',1264),
('귀걸이',5,'피의 맹약 철귀걸이',1267),
('귀걸이',5,'붉은 심연 수정귀걸이',1268),
('귀걸이',5,'멸망의 별 별귀걸이',1275),
('귀걸이',5,'마신의 룬이어링',1282),
('귀걸이',5,'혼돈왕의 옥귀걸이',1225),
('귀걸이',5,'적룡신의 마력귀걸이',1232),
('귀걸이',5,'파멸자의 서약귀걸이',1239),
('귀걸이',5,'무한 재앙 왕의귀걸이',1246),
('귀걸이',5,'종언의 수호이어링',1253),
('귀걸이',5,'신살자의 성전귀걸이',1260)
on conflict(slot,rarity,name) do update set base_atk=excluded.base_atk;
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
;
