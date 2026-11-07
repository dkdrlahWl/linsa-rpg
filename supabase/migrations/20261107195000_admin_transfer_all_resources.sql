-- 2026-11-07 도현: 관리자 송금으로 보낼 수 없던 재화·소모품을 전부 보낼 수 있게.
-- 추가: 에디셔널 큐브·추가옵션 불꽃·기본수치 재련석·초월석·링구의 머리카락·전문 직업 재료(마력 정수·고대 지도 조각·심해 진주·원석),
--       낚시 토큰, 동료 소환권, 픽업 소환권, 보물찾기 티켓, 행운 물약, 종족 주사위, 토큰(토큰 콘텐츠), 셀리아 마일리지.
-- 기존 품목(골드·주문서·파편·레드/블랙/프라임 큐브·잠금석·던전 열쇠)은 예전처럼 관리자 보유량에서 빠지고(관리자 재화는 자동으로 다시 채워짐),
-- 다이아와 새로 추가한 품목은 관리자 보유량을 쓰지 않고 그대로 지급한다.
CREATE OR REPLACE FUNCTION rebirth_private.admin_transfer(p_args jsonb, p_request uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 actor uuid; recipient uuid; resource text; amount bigint; balance bigint; path text[]; parent jsonb; deduct boolean;
 sender rebirth_private.players%rowtype; receiver rebirth_private.players%rowtype;
 receipt rebirth_private.receipts%rowtype; result jsonb;
 fingerprint jsonb:=jsonb_build_object('command','adminTransfer','args',p_args);
begin
 -- Share the market lock so opposing market/transfer writes lock players consistently.
 perform pg_advisory_xact_lock(71823001);
 actor:=rebirth_private.session_user();
 if not exists(select 1 from auth.users where id=actor and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'BETA_DISABLED'; end if;
 if p_request is null or jsonb_typeof(p_args) is distinct from 'object' then raise exception 'INVALID_TRANSFER'; end if;
 select * into receipt from rebirth_private.receipts where user_id=actor and request_id=p_request;
 if found then
  if receipt.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;
  select * into sender from rebirth_private.players where id=actor;
  return jsonb_build_object('state',sender.state,'revision',sender.revision,'result',receipt.result);
 end if;
 resource:=p_args->>'resource';
 if resource is null or resource not in ('gold','scroll','fragment','cube','highCube','primeCube','diamond','potentialLock','dungeonKey',
   'addCube','bonusFlame','rerollStone','transcendStone','ringuHair','essence','mapPiece','pearl','ore',
   'fishToken','companionTicket','pickupTicket','treasureTicket','luckPotion','tribeTicket','token','mileage') then raise exception 'INVALID_TRANSFER_RESOURCE'; end if;
 if jsonb_typeof(p_args->'amount') is distinct from 'number' or length(p_args->>'amount')>12 or coalesce(p_args->>'amount','')!~'^[1-9][0-9]*$' then raise exception 'INVALID_TRANSFER_AMOUNT'; end if;
 amount:=(p_args->>'amount')::bigint;
 if amount>999999999999 then raise exception 'INVALID_TRANSFER_AMOUNT'; end if;
 if coalesce(p_args->>'recipient','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 recipient:=(p_args->>'recipient')::uuid;
 if recipient=actor then raise exception 'INVALID_TRANSFER_SELF'; end if;
 select * into sender from rebirth_private.players where id=actor for update;
 if sender.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if sender.state->'battle'<>'null'::jsonb or nullif(sender.state->>'partyRoom','') is not null or nullif(sender.state->>'coopRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS'; end if;
 select * into receiver from rebirth_private.players where id=recipient for update;
 if not found or receiver.state->>'version' is distinct from 'rebirth-1' then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 if exists(select 1 from auth.users where id=recipient and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 if rebirth_private.is_tester(recipient) then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 path:=case resource
  when 'gold' then array['gold']
  when 'token' then array['tokens']
  when 'mileage' then array['mileage']
  when 'diamond' then array['fishing','diamonds']
  when 'fishToken' then array['fishing','tokens']
  when 'companionTicket' then array['companions','tickets']
  when 'pickupTicket' then array['companions','pickupTickets']
  when 'treasureTicket' then array['treasure','tickets']
  when 'luckPotion' then array['consumables','luckPotion']
  when 'tribeTicket' then array['tribeGacha','tickets']
  else array['materials',resource] end;
 deduct:=resource in ('gold','scroll','fragment','cube','highCube','primeCube','potentialLock','dungeonKey');
 balance:=coalesce((receiver.state#>>path)::bigint,0);
 if balance<0 or balance+amount>9000000000000 then raise exception 'INVALID_TRANSFER_LIMIT'; end if;
 if deduct and coalesce((sender.state#>>path)::bigint,0)<amount then raise exception 'INSUFFICIENT_MATERIAL'; end if;
 -- Increment both revisions: in-flight saves retry instead of overwriting delivery.
 update rebirth_private.players set state=case when deduct then jsonb_set(state,path,to_jsonb((state#>>path)::bigint-amount)) else state end,revision=revision+1,updated_at=now() where id=actor returning * into sender;
 -- 받는 쪽에 상위 묶음(낚시·동료·보물찾기 등)이 없으면 먼저 만든다. 낚시는 화면이 깨지지 않게 기본 기록 전체를 넣는다.
 if array_length(path,1)=2 then
  parent:=receiver.state->path[1];
  if parent is null or jsonb_typeof(parent)<>'object' then
   receiver.state:=receiver.state||jsonb_build_object(path[1],case when path[1]='fishing' then jsonb_build_object('version',1,'rod',1,'xp',0,'diamonds',0,'bait',jsonb_build_object('worm',20),'fish','[]'::jsonb,'aquarium','[]'::jsonb,'slots',3,'bank',0,'bankAt',floor(extract(epoch from now())*1000)::bigint,'collection','{}'::jsonb,'daily','{}'::jsonb,'cast',null,'lastCatch',null) else '{}'::jsonb end);
  end if;
 end if;
 update rebirth_private.players set state=jsonb_set(receiver.state,path,to_jsonb(balance+amount)),revision=revision+1,updated_at=now() where id=recipient;
 result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','adminTransfer','recipient',recipient,'recipientName',receiver.state->>'name','resource',resource,'amount',amount)));
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(actor,p_request,fingerprint,result);
 return jsonb_build_object('state',sender.state,'revision',sender.revision,'result',result);
end $function$;
