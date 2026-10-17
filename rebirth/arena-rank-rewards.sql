create or replace function rebirth_private.arena_reward_for(p_score integer,p_rank integer) returns jsonb language sql immutable set search_path='' as $$
with rewards(ord,label,min_score,gold,black,prime,min_rank,max_rank) as (values
(0,'브론즈 IV',0,120000,3,0,null,null),
(1,'브론즈 III',100,140000,4,0,null,null),
(2,'브론즈 II',200,160000,5,0,null,null),
(3,'브론즈 I',300,180000,6,0,null,null),
(4,'실버 IV',400,240000,8,0,null,null),
(5,'실버 III',500,280000,9,0,null,null),
(6,'실버 II',600,320000,10,0,null,null),
(7,'실버 I',700,360000,12,0,null,null),
(8,'골드 IV',800,420000,16,0,null,null),
(9,'골드 III',900,480000,18,0,null,null),
(10,'골드 II',1000,540000,21,0,null,null),
(11,'골드 I',1100,600000,24,0,null,null),
(12,'플래티넘 IV',1200,630000,24,3,null,null),
(13,'플래티넘 III',1300,720000,28,4,null,null),
(14,'플래티넘 II',1400,810000,32,5,null,null),
(15,'플래티넘 I',1500,900000,36,6,null,null),
(16,'다이아 IV',1600,1050000,42,7,null,null),
(17,'다이아 III',1700,1200000,48,8,null,null),
(18,'다이아 II',1800,1350000,54,9,null,null),
(19,'다이아 I',1900,1500000,60,10,null,null),
(20,'마스터 IV',2200,1680000,63,11,null,null),
(21,'마스터 III',2300,1920000,72,12,null,null),
(22,'마스터 II',2400,2160000,81,13,null,null),
(23,'마스터 I',2500,2400000,90,14,null,null),
(24,'100~91위',0,3000000,120,18,91,100),
(25,'90~81위',0,3500000,130,20,81,90),
(26,'80~71위',0,4000000,140,22,71,80),
(27,'70~61위',0,4500000,150,24,61,70),
(28,'60~51위',0,5000000,160,26,51,60),
(29,'50~41위',0,5500000,170,28,41,50),
(30,'40~31위',0,6000000,180,30,31,40),
(31,'30~21위',0,6500000,190,32,21,30),
(32,'20~11위',0,7000000,200,34,11,20),
(33,'그랜드 마스터',2600,10000000,300,50,null,null),
(34,'챌린저',2600,15000000,450,75,null,null),
(35,'챔피언',2600,20000000,600,100,null,null)
), base as (
select * from rewards where ord=case
when p_score>=2600 and p_rank between 1 and 10 then case when p_rank=1 then 35 when p_rank<=3 then 34 else 33 end
when p_score>=2200 then 20+least(3,greatest(0,(p_score-2200)/100))
when p_score>=1600 then 16+least(3,(p_score-1600)/100)
when p_score>=1200 then 12+least(3,(p_score-1200)/100)
when p_score>=800 then 8+least(3,(p_score-800)/100)
when p_score>=400 then 4+least(3,(p_score-400)/100)
else least(3,greatest(0,p_score)/100) end
), ranked as (select * from rewards where p_rank between min_rank and max_rank)
select jsonb_build_object('label',coalesce(r.label,b.label),'gold',greatest(b.gold,r.gold),'highCube',greatest(b.black,r.black),'primeCube',greatest(b.prime,r.prime)) from base b left join ranked r on true where p_score is not null;
$$;
