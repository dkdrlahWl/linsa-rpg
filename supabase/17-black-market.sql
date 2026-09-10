-- LINSA BLACK MARKET BM1. Additive only; existing accounts/catalogue are not reset.
-- The release depends on the existing server-authoritative economy (migrations 10-16).
begin;
create table if not exists ringu_private.black_market_config (
 singleton boolean primary key default true check(singleton),
 rates jsonb not null,
 slots jsonb not null
);
create table if not exists ringu_private.black_market_catalogue (
 slot text not null,rarity integer not null check(rarity between 0 and 3),
 name text not null,base_atk integer not null check(base_atk>0),
 primary key(slot,rarity,name)
);
insert into ringu_private.black_market_config values(true,'[80,15,4.9,0.1]'::jsonb,'["무기","투구","갑옷","바지","신발","반지","귀걸이"]'::jsonb) on conflict(singleton) do update set rates=excluded.rates,slots=excluded.slots;
insert into ringu_private.black_market_catalogue(slot,rarity,name,base_atk) values
('무기',0,'낡은 장검',16),
('무기',0,'수련용 검',23),
('무기',0,'견습의 대검',21),
('무기',0,'무딘 환도',19),
('무기',0,'가벼운 마검',17),
('무기',0,'초보자의 성검',24),
('무기',0,'평범한 쌍검',22),
('무기',0,'손때 묻은 도',20),
('무기',0,'여행자의 검날',18),
('무기',0,'단단한 룬소드',16),
('무기',1,'숲바람의 장검',41),
('무기',1,'청동빛 검',48),
('무기',1,'사냥꾼의 대검',36),
('무기',1,'용병의 환도',43),
('무기',1,'새벽녘 마검',50),
('무기',1,'바람결의 성검',38),
('무기',1,'야성의 쌍검',45),
('무기',1,'수호병의 도',52),
('무기',1,'비취빛 검날',40),
('무기',1,'은은한 룬소드',47),
('무기',2,'빙결의 장검',110),
('무기',2,'뇌광의 검',117),
('무기',2,'심연의 대검',124),
('무기',2,'왕실의 환도',131),
('무기',2,'폭풍의 마검',138),
('무기',2,'적월의 성검',100),
('무기',2,'별빛의 쌍검',107),
('무기',2,'환영의 도',114),
('무기',2,'백은의 검날',121),
('무기',2,'용맹한 룬소드',128),
('무기',3,'천공의 장검',261),
('무기',3,'불멸의 검',268),
('무기',3,'마왕의 대검',275),
('무기',3,'성역의 환도',282),
('무기',3,'고대룡의 마검',289),
('무기',3,'운명의 성검',296),
('무기',3,'차원절단 쌍검',303),
('무기',3,'패왕의 도',310),
('무기',3,'신탁의 검날',317),
('무기',3,'황혼의 룬소드',324),
('투구',0,'낡은 철투구',4),
('투구',0,'수련용 면갑',5),
('투구',0,'견습의 전투모',6),
('투구',0,'무딘 왕관',4),
('투구',0,'가벼운 뿔투구',5),
('투구',0,'초보자의 기사투구',6),
('투구',0,'평범한 두건',4),
('투구',0,'손때 묻은 투구',5),
('투구',0,'여행자의 머리장식',6),
('투구',0,'단단한 가면',4),
('투구',1,'숲바람의 철투구',11),
('투구',1,'청동빛 면갑',12),
('투구',1,'사냥꾼의 전투모',13),
('투구',1,'용병의 왕관',14),
('투구',1,'새벽녘 뿔투구',9),
('투구',1,'바람결의 기사투구',10),
('투구',1,'야성의 두건',11),
('투구',1,'수호병의 투구',12),
('투구',1,'비취빛 머리장식',13),
('투구',1,'은은한 가면',14),
('투구',2,'빙결의 철투구',26),
('투구',2,'뇌광의 면갑',33),
('투구',2,'심연의 전투모',28),
('투구',2,'왕실의 왕관',35),
('투구',2,'폭풍의 뿔투구',30),
('투구',2,'적월의 기사투구',25),
('투구',2,'별빛의 두건',32),
('투구',2,'환영의 투구',27),
('투구',2,'백은의 머리장식',34),
('투구',2,'용맹한 가면',29),
('투구',3,'천공의 철투구',80),
('투구',3,'불멸의 면갑',87),
('투구',3,'마왕의 전투모',66),
('투구',3,'성역의 왕관',73),
('투구',3,'고대룡의 뿔투구',80),
('투구',3,'운명의 기사투구',87),
('투구',3,'차원절단 두건',66),
('투구',3,'패왕의 투구',73),
('투구',3,'신탁의 머리장식',80),
('투구',3,'황혼의 가면',87),
('갑옷',0,'낡은 흉갑',4),
('갑옷',0,'수련용 판금갑옷',5),
('갑옷',0,'견습의 전투복',6),
('갑옷',0,'무딘 사슬갑옷',4),
('갑옷',0,'가벼운 로브',5),
('갑옷',0,'초보자의 용갑',6),
('갑옷',0,'평범한 수호갑',4),
('갑옷',0,'손때 묻은 갑주',5),
('갑옷',0,'여행자의 성의',6),
('갑옷',0,'단단한 전신갑옷',4),
('갑옷',1,'숲바람의 흉갑',14),
('갑옷',1,'청동빛 판금갑옷',9),
('갑옷',1,'사냥꾼의 전투복',10),
('갑옷',1,'용병의 사슬갑옷',11),
('갑옷',1,'새벽녘 로브',12),
('갑옷',1,'바람결의 용갑',13),
('갑옷',1,'야성의 수호갑',14),
('갑옷',1,'수호병의 갑주',9),
('갑옷',1,'비취빛 성의',10),
('갑옷',1,'은은한 전신갑옷',11),
('갑옷',2,'빙결의 흉갑',29),
('갑옷',2,'뇌광의 판금갑옷',36),
('갑옷',2,'심연의 전투복',31),
('갑옷',2,'왕실의 사슬갑옷',26),
('갑옷',2,'폭풍의 로브',33),
('갑옷',2,'적월의 용갑',28),
('갑옷',2,'별빛의 수호갑',35),
('갑옷',2,'환영의 갑주',30),
('갑옷',2,'백은의 성의',25),
('갑옷',2,'용맹한 전신갑옷',32),
('갑옷',3,'천공의 흉갑',83),
('갑옷',3,'불멸의 판금갑옷',62),
('갑옷',3,'마왕의 전투복',69),
('갑옷',3,'성역의 사슬갑옷',76),
('갑옷',3,'고대룡의 로브',83),
('갑옷',3,'운명의 용갑',62),
('갑옷',3,'차원절단 수호갑',69),
('갑옷',3,'패왕의 갑주',76),
('갑옷',3,'신탁의 성의',83),
('갑옷',3,'황혼의 전신갑옷',62),
('바지',0,'낡은 각반',4),
('바지',0,'수련용 전투바지',5),
('바지',0,'견습의 하의',6),
('바지',0,'무딘 다리갑옷',4),
('바지',0,'가벼운 사슬바지',5),
('바지',0,'초보자의 용린각반',6),
('바지',0,'평범한 마법바지',4),
('바지',0,'손때 묻은 수호각반',5),
('바지',0,'여행자의 철갑바지',6),
('바지',0,'단단한 성전하의',4),
('바지',1,'숲바람의 각반',11),
('바지',1,'청동빛 전투바지',12),
('바지',1,'사냥꾼의 하의',13),
('바지',1,'용병의 다리갑옷',14),
('바지',1,'새벽녘 사슬바지',9),
('바지',1,'바람결의 용린각반',10),
('바지',1,'야성의 마법바지',11),
('바지',1,'수호병의 수호각반',12),
('바지',1,'비취빛 철갑바지',13),
('바지',1,'은은한 성전하의',14),
('바지',2,'빙결의 각반',32),
('바지',2,'뇌광의 전투바지',27),
('바지',2,'심연의 하의',34),
('바지',2,'왕실의 다리갑옷',29),
('바지',2,'폭풍의 사슬바지',36),
('바지',2,'적월의 용린각반',31),
('바지',2,'별빛의 마법바지',26),
('바지',2,'환영의 수호각반',33),
('바지',2,'백은의 철갑바지',28),
('바지',2,'용맹한 성전하의',35),
('바지',3,'천공의 각반',86),
('바지',3,'불멸의 전투바지',65),
('바지',3,'마왕의 하의',72),
('바지',3,'성역의 다리갑옷',79),
('바지',3,'고대룡의 사슬바지',86),
('바지',3,'운명의 용린각반',65),
('바지',3,'차원절단 마법바지',72),
('바지',3,'패왕의 수호각반',79),
('바지',3,'신탁의 철갑바지',86),
('바지',3,'황혼의 성전하의',65),
('신발',0,'낡은 장화',4),
('신발',0,'수련용 군화',5),
('신발',0,'견습의 철구두',6),
('신발',0,'무딘 전투화',4),
('신발',0,'가벼운 질풍화',5),
('신발',0,'초보자의 용린신',6),
('신발',0,'평범한 마법장화',4),
('신발',0,'손때 묻은 수호신',5),
('신발',0,'여행자의 각갑',6),
('신발',0,'단단한 성전장화',4),
('신발',1,'숲바람의 장화',14),
('신발',1,'청동빛 군화',9),
('신발',1,'사냥꾼의 철구두',10),
('신발',1,'용병의 전투화',11),
('신발',1,'새벽녘 질풍화',12),
('신발',1,'바람결의 용린신',13),
('신발',1,'야성의 마법장화',14),
('신발',1,'수호병의 수호신',9),
('신발',1,'비취빛 각갑',10),
('신발',1,'은은한 성전장화',11),
('신발',2,'빙결의 장화',35),
('신발',2,'뇌광의 군화',30),
('신발',2,'심연의 철구두',25),
('신발',2,'왕실의 전투화',32),
('신발',2,'폭풍의 질풍화',27),
('신발',2,'적월의 용린신',34),
('신발',2,'별빛의 마법장화',29),
('신발',2,'환영의 수호신',36),
('신발',2,'백은의 각갑',31),
('신발',2,'용맹한 성전장화',26),
('신발',3,'천공의 장화',89),
('신발',3,'불멸의 군화',68),
('신발',3,'마왕의 철구두',75),
('신발',3,'성역의 전투화',82),
('신발',3,'고대룡의 질풍화',89),
('신발',3,'운명의 용린신',68),
('신발',3,'차원절단 마법장화',75),
('신발',3,'패왕의 수호신',82),
('신발',3,'신탁의 각갑',89),
('신발',3,'황혼의 성전장화',68),
('반지',0,'낡은 철반지',8),
('반지',0,'수련용 인장',10),
('반지',0,'견습의 보석반지',12),
('반지',0,'무딘 룬링',9),
('반지',0,'가벼운 옥반지',11),
('반지',0,'초보자의 마력반지',8),
('반지',0,'평범한 서약반지',10),
('반지',0,'손때 묻은 왕의인장',12),
('반지',0,'여행자의 수호링',9),
('반지',0,'단단한 성전반지',11),
('반지',1,'숲바람의 철반지',18),
('반지',1,'청동빛 인장',25),
('반지',1,'사냥꾼의 보석반지',22),
('반지',1,'용병의 룬링',19),
('반지',1,'새벽녘 옥반지',26),
('반지',1,'바람결의 마력반지',23),
('반지',1,'야성의 서약반지',20),
('반지',1,'수호병의 왕의인장',27),
('반지',1,'비취빛 수호링',24),
('반지',1,'은은한 성전반지',21),
('반지',2,'빙결의 철반지',52),
('반지',2,'뇌광의 인장',59),
('반지',2,'심연의 보석반지',66),
('반지',2,'왕실의 룬링',50),
('반지',2,'폭풍의 옥반지',57),
('반지',2,'적월의 마력반지',64),
('반지',2,'별빛의 서약반지',71),
('반지',2,'환영의 왕의인장',55),
('반지',2,'백은의 수호링',62),
('반지',2,'용맹한 성전반지',69),
('반지',3,'천공의 철반지',153),
('반지',3,'불멸의 인장',160),
('반지',3,'마왕의 보석반지',167),
('반지',3,'성역의 룬링',174),
('반지',3,'고대룡의 옥반지',126),
('반지',3,'운명의 마력반지',133),
('반지',3,'차원절단 서약반지',140),
('반지',3,'패왕의 왕의인장',147),
('반지',3,'신탁의 수호링',154),
('반지',3,'황혼의 성전반지',161),
('귀걸이',0,'낡은 철귀걸이',11),
('귀걸이',0,'수련용 수정귀걸이',8),
('귀걸이',0,'견습의 별귀걸이',10),
('귀걸이',0,'무딘 룬이어링',12),
('귀걸이',0,'가벼운 옥귀걸이',9),
('귀걸이',0,'초보자의 마력귀걸이',11),
('귀걸이',0,'평범한 서약귀걸이',8),
('귀걸이',0,'손때 묻은 왕의귀걸이',10),
('귀걸이',0,'여행자의 수호이어링',12),
('귀걸이',0,'단단한 성전귀걸이',9),
('귀걸이',1,'숲바람의 철귀걸이',21),
('귀걸이',1,'청동빛 수정귀걸이',18),
('귀걸이',1,'사냥꾼의 별귀걸이',25),
('귀걸이',1,'용병의 룬이어링',22),
('귀걸이',1,'새벽녘 옥귀걸이',19),
('귀걸이',1,'바람결의 마력귀걸이',26),
('귀걸이',1,'야성의 서약귀걸이',23),
('귀걸이',1,'수호병의 왕의귀걸이',20),
('귀걸이',1,'비취빛 수호이어링',27),
('귀걸이',1,'은은한 성전귀걸이',24),
('귀걸이',2,'빙결의 철귀걸이',55),
('귀걸이',2,'뇌광의 수정귀걸이',62),
('귀걸이',2,'심연의 별귀걸이',69),
('귀걸이',2,'왕실의 룬이어링',53),
('귀걸이',2,'폭풍의 옥귀걸이',60),
('귀걸이',2,'적월의 마력귀걸이',67),
('귀걸이',2,'별빛의 서약귀걸이',51),
('귀걸이',2,'환영의 왕의귀걸이',58),
('귀걸이',2,'백은의 수호이어링',65),
('귀걸이',2,'용맹한 성전귀걸이',72),
('귀걸이',3,'천공의 철귀걸이',156),
('귀걸이',3,'불멸의 수정귀걸이',163),
('귀걸이',3,'마왕의 별귀걸이',170),
('귀걸이',3,'성역의 룬이어링',177),
('귀걸이',3,'고대룡의 옥귀걸이',129),
('귀걸이',3,'운명의 마력귀걸이',136),
('귀걸이',3,'차원절단 서약귀걸이',143),
('귀걸이',3,'패왕의 왕의귀걸이',150),
('귀걸이',3,'신탁의 수호이어링',157),
('귀걸이',3,'황혼의 성전귀걸이',164)
on conflict(slot,rarity,name) do update set base_atk=excluded.base_atk;
create table if not exists ringu_private.black_market_cycles (
 id text primary key, starts_at timestamptz not null, ends_at timestamptz not null,
 offers jsonb not null check(jsonb_array_length(offers)=5),rates jsonb not null,
 created_at timestamptz not null default clock_timestamp(),check(ends_at>starts_at)
);
create table if not exists ringu_private.black_market_purchases (
 account_id uuid not null references ringu_private.accounts(id),
 rotation_id text not null references ringu_private.black_market_cycles(id),
 slot integer not null check(slot between 0 and 4),
 request_id uuid not null,item_id bigint not null references ringu_private.auction_items(id),
 price integer not null check(price in (5,15,30,50)),result jsonb not null,
 purchased_at timestamptz not null default clock_timestamp(),
 primary key(account_id,rotation_id,slot),unique(account_id,request_id)
);
alter table ringu_private.black_market_config enable row level security;
alter table ringu_private.black_market_catalogue enable row level security;
alter table ringu_private.black_market_cycles enable row level security;
alter table ringu_private.black_market_purchases enable row level security;
revoke all on ringu_private.black_market_config,ringu_private.black_market_catalogue,
 ringu_private.black_market_cycles,ringu_private.black_market_purchases from public,anon,authenticated;

-- No caller-supplied time is accepted by the public RPC. Separate pure helper for QA.
create or replace function ringu_private.black_market_period(p_at timestamptz)
returns table(id text,starts_at timestamptz,ends_at timestamptz)
language sql immutable set search_path='' as $$
 select to_char(k,'YYYY-MM-DD')||case when extract(hour from k)>=18 then '/18' else '/00' end,
 (date_trunc('day',k)+case when extract(hour from k)>=18 then interval '18 hours' else interval '0 hours' end) at time zone 'Asia/Seoul',
 (date_trunc('day',k)+case when extract(hour from k)>=18 then interval '24 hours' else interval '18 hours' end) at time zone 'Asia/Seoul'
 from (select p_at at time zone 'Asia/Seoul' k) t
$$;
revoke all on function ringu_private.black_market_period(timestamptz) from public,anon,authenticated;

create or replace function ringu_private.black_market_current()
returns ringu_private.black_market_cycles language plpgsql security definer set search_path='' as $$
declare period record; cycle ringu_private.black_market_cycles%rowtype;
 cfg ringu_private.black_market_config%rowtype; gear ringu_private.black_market_catalogue%rowtype;
 offers jsonb:='[]'; seen text[]:='{}'; i integer; r integer; j integer; roll numeric;
 chosen_slot text; price integer; template jsonb; key text;
begin
 -- Same lock ordering as auction/economy commits; one immutable shared roll per window.
 perform pg_advisory_xact_lock(70909,10);
 select * into period from ringu_private.black_market_period(clock_timestamp());
 select * into cycle from ringu_private.black_market_cycles where id=period.id;
 if found then return cycle;end if;
 select * into strict cfg from ringu_private.black_market_config where singleton;
 for i in 0..4 loop
  roll:=random()*100;r:=3;
  for j in 0..3 loop
   roll:=roll-(cfg.rates->>j)::numeric;
   if roll<0 then r:=j;exit;end if;
  end loop;
  chosen_slot:=cfg.slots->>floor(random()*jsonb_array_length(cfg.slots))::integer;
  -- Select distinct base equipment, without rerolling the rarity. Each slot/rarity
  -- has at least five candidates, checked by the build script.
  select * into gear from ringu_private.black_market_catalogue c
   where c.rarity=r and c.slot=chosen_slot and not ((c.slot||'|'||c.rarity||'|'||c.name)=any(seen))
   order by random() limit 1;
  if not found then raise exception 'BLACK_MARKET_CATALOGUE_INVALID';end if;
  key:=gear.slot||'|'||gear.rarity||'|'||gear.name;seen:=array_append(seen,key);
  price:=(array[5,15,30,50])[r+1];
  template:=jsonb_build_object('slot',gear.slot,'rarity',gear.rarity,'name',gear.name,
   'baseAtk',gear.base_atk,'enhance',0,'transcend',0,
   'optionRolls',jsonb_build_array(0.8+floor(random()*401)/1000,0.8+floor(random()*401)/1000));
  offers:=offers||jsonb_build_array(jsonb_build_object('slot',i,'price',price,'item',template));
 end loop;
 insert into ringu_private.black_market_cycles(id,starts_at,ends_at,offers,rates)
 values(period.id,period.starts_at,period.ends_at,offers,cfg.rates) returning * into cycle;
 return cycle;
end $$;
revoke all on function ringu_private.black_market_current() from public,anon,authenticated;

create or replace function public.ringu_black_market(
 p_action text default 'status',p_rotation text default null,p_slot integer default null,p_request_id uuid default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;a ringu_private.accounts%rowtype;cycle ringu_private.black_market_cycles%rowtype;
 receipt ringu_private.black_market_purchases%rowtype;offer jsonb;it jsonb;inv jsonb;
 discovered jsonb;key text;balance bigint;iid bigint;item_uid uuid;result jsonb;rows jsonb;
begin
 if p_action is null or p_action not in ('status','buy') then raise exception 'INVALID_ARGUMENTS';end if;
 perform pg_advisory_xact_lock(70909,10);
 u:=ringu_private.require_session(false);
 select * into strict a from ringu_private.accounts where id=u for update;
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready)
  or not exists(select 1 from ringu_private.auction_accounts where account_id=u) then
  if p_action='status' then return jsonb_build_object('ready',false,'reason','ECONOMY_NOT_READY');end if;
  raise exception 'BLACK_MARKET_NOT_READY';
 end if;
 if p_action='buy' then
  if p_request_id is null or p_rotation is null or length(p_rotation)>40 or p_slot is null or p_slot not between 0 and 4 then raise exception 'INVALID_ARGUMENTS';end if;
  -- A lost successful response remains replayable after a refresh, sale or reconnect.
  select * into receipt from ringu_private.black_market_purchases where account_id=u and request_id=p_request_id;
  if found then
   if receipt.rotation_id<>p_rotation or receipt.slot<>p_slot then raise exception 'REQUEST_ID_REUSED';end if;
   return receipt.result;
  end if;
 end if;
 -- Read clock only after lock acquisition; queued pre-refresh requests cannot buy
 -- a previous window once admitted after 18:00 or 00:00 KST.
 cycle:=ringu_private.black_market_current();
 if p_action='status' then
  select jsonb_agg(o.value||jsonb_build_object('purchased',exists(
   select 1 from ringu_private.black_market_purchases p where p.account_id=u and p.rotation_id=cycle.id and p.slot=(o.value->>'slot')::integer
  )) order by (o.value->>'slot')::integer) into rows from jsonb_array_elements(cycle.offers) o;
  return jsonb_build_object('ready',true,'version','BM1','rotation',cycle.id,
   'serverNow',floor(extract(epoch from clock_timestamp())*1000),
   'startsAt',floor(extract(epoch from cycle.starts_at)*1000),'expiresAt',floor(extract(epoch from cycle.ends_at)*1000),
   'rates',cycle.rates,'items',rows,'essence',a.state->'essence','revision',a.revision);
 end if;
 if p_rotation<>cycle.id then raise exception 'BLACK_MARKET_REFRESHED';end if;
 if exists(select 1 from ringu_private.black_market_purchases where account_id=u and rotation_id=cycle.id and slot=p_slot) then raise exception 'BLACK_MARKET_PURCHASED';end if;
 offer:=cycle.offers->p_slot;
 balance:=ringu_private.auction_integer(a.state->'essence');
 if balance<(offer->>'price')::integer then raise exception 'INSUFFICIENT_ESSENCE';end if;
 if jsonb_typeof(a.state->'inventory') is distinct from 'array' then raise exception 'INVALID_INVENTORY';end if;
 iid:=nextval('ringu_private.auction_item_ids');item_uid:=gen_random_uuid();
 -- Keep all concrete attributes from the common offer. Only identity and the
 -- account-specific new-discovery badge differ between buyers.
 it:=offer->'item';key:=it->>'slot'||'|'||(it->>'rarity')||'|'||(it->>'name');
 discovered:=coalesce(a.state->'discovered','{}'::jsonb);
 it:=it||jsonb_build_object('id',iid,'auctionUid',item_uid,'isNew',not coalesce((discovered->>key)::boolean,false));
 discovered:=discovered||jsonb_build_object(key,true);
 inv:=jsonb_build_array(it)||(a.state->'inventory');
 insert into ringu_private.auction_items(id,uid,owner_id,item) values(iid,item_uid,u,it);
 update ringu_private.accounts set state=state||jsonb_build_object('inventory',inv,
  'essence',balance-(offer->>'price')::integer,'discovered',discovered,
  'uid',least(9007199254740991,greatest(coalesce((state->>'uid')::bigint,1),iid+1))),
  revision=revision+1,updated_at=clock_timestamp() where id=u;
 result:=jsonb_build_object('ok',true,'rotation',cycle.id,'slot',p_slot,'requestId',p_request_id,'item',it,'price',offer->'price');
 insert into ringu_private.black_market_purchases(account_id,rotation_id,slot,request_id,item_id,price,result)
 values(u,cycle.id,p_slot,p_request_id,iid,(offer->>'price')::integer,result);
 return result;
end $$;
revoke all on function public.ringu_black_market(text,text,integer,uuid) from public,anon;
grant execute on function public.ringu_black_market(text,text,integer,uuid) to authenticated;
commit;
select 'BM1 installed: shared five offers, 00:00/18:00 KST, one per offer/account/window' as result;
