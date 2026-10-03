-- Atomic, retry-safe player-to-player gold transfer delivered by mailbox.
create table if not exists rebirth_private.gold_transfer_mail(
 id uuid primary key default gen_random_uuid(),
 sender uuid not null references auth.users(id) on delete cascade,
 recipient uuid not null references auth.users(id) on delete cascade,
 amount bigint not null check(amount between 1 and 999999999999),
 created_at timestamptz not null default now(),
 claimed_at timestamptz
);
create index if not exists gold_transfer_mail_pending on rebirth_private.gold_transfer_mail(recipient,created_at) where claimed_at is null;
alter table rebirth_private.gold_transfer_mail enable row level security;
revoke all on rebirth_private.gold_transfer_mail from public,anon,authenticated;
create or replace function rebirth_private.gold_transfer(p_args jsonb,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid; target_id uuid; amount bigint; sender_gold bigint; mail_id uuid:=gen_random_uuid(); mail jsonb; receiver_state jsonb;
 sender rebirth_private.players%rowtype; receiver rebirth_private.players%rowtype;
 receipt rebirth_private.receipts%rowtype; result jsonb;
 fingerprint jsonb:=jsonb_build_object('command','goldTransfer','args',p_args);
begin
 -- Follow the same lock order as market and administrator transfers.
 perform pg_advisory_xact_lock(71823001);
 actor:=rebirth_private.session_user();
 if p_request is null or jsonb_typeof(p_args) is distinct from 'object' then raise exception 'INVALID_TRANSFER'; end if;
 select * into receipt from rebirth_private.receipts where user_id=actor and request_id=p_request;
 if found then
  if receipt.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;
  select * into sender from rebirth_private.players where id=actor;
  return jsonb_build_object('state',sender.state,'revision',sender.revision,'result',receipt.result);
 end if;
 if jsonb_typeof(p_args->'amount') is distinct from 'number' or length(p_args->>'amount')>12 or coalesce(p_args->>'amount','')!~'^[1-9][0-9]*$' then raise exception 'INVALID_TRANSFER_AMOUNT'; end if;
 amount:=(p_args->>'amount')::bigint;
 if amount>999999999999 then raise exception 'INVALID_TRANSFER_AMOUNT'; end if;
 if coalesce(p_args->>'recipient','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 target_id:=(p_args->>'recipient')::uuid;
 if target_id=actor then raise exception 'INVALID_TRANSFER_SELF'; end if;
 if exists(select 1 from auth.users where id=actor and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'INVALID_TRANSFER_SENDER'; end if;
 select * into sender from rebirth_private.players where id=actor for update;
 if sender.state is null or sender.state->>'version' is distinct from 'rebirth-1' then raise exception 'CHARACTER_REQUIRED'; end if;
 if sender.state->'battle'<>'null'::jsonb or nullif(sender.state->>'partyRoom','') is not null or nullif(sender.state->>'coopRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS'; end if;
 select * into receiver from rebirth_private.players where id=target_id for update;
 if not found or receiver.state->>'version' is distinct from 'rebirth-1' then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 if exists(select 1 from auth.users where id=target_id and raw_app_meta_data->>'ringu_admin'='true') then raise exception 'INVALID_TRANSFER_RECIPIENT'; end if;
 sender_gold:=coalesce((sender.state->>'gold')::bigint,0);
 if sender_gold<amount then raise exception 'INSUFFICIENT_GOLD'; end if;
 if (select count(*) from rebirth_private.gold_transfer_mail g where g.recipient=target_id and g.claimed_at is null)>=100 then raise exception 'MAILBOX_FULL'; end if;
 mail:=jsonb_build_object('id','gold-transfer-'||mail_id,'kind','playerGold','sender',sender.state->>'name','title','골드 송금','message',(sender.state->>'name')||'님이 골드를 보냈습니다.','rewards',jsonb_build_object('gold',amount),'sentAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'));
 receiver_state:=jsonb_set(jsonb_set(receiver.state,'{rewardMailbox}',coalesce(receiver.state->'rewardMailbox','[]'::jsonb)||jsonb_build_array(mail)),'{systemMailbox}',coalesce(receiver.state->'systemMailbox','[]'::jsonb)||jsonb_build_array(mail));
 if octet_length(receiver_state::text)>524288 then raise exception 'MAILBOX_FULL'; end if;
 update rebirth_private.players set state=jsonb_set(state,'{gold}',to_jsonb(sender_gold-amount)),revision=revision+1,updated_at=now() where id=actor returning * into sender;
 insert into rebirth_private.gold_transfer_mail(id,sender,recipient,amount) values(mail_id,actor,target_id,amount);
 update rebirth_private.players set state=receiver_state,revision=revision+1,updated_at=now() where id=target_id;
 result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','goldTransfer','recipient',target_id,'recipientName',receiver.state->>'name','amount',amount)));
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(actor,p_request,fingerprint,result);
 return jsonb_build_object('state',sender.state,'revision',sender.revision,'result',result);
end $$;
revoke all on function rebirth_private.gold_transfer(jsonb,uuid) from public,anon;
grant execute on function rebirth_private.gold_transfer(jsonb,uuid) to authenticated;
create or replace function public.rebirth_gold_transfer(p_args jsonb,p_request uuid) returns jsonb
language sql security invoker set search_path='' as $$select rebirth_private.gold_transfer(p_args,p_request)$$;
revoke all on function public.rebirth_gold_transfer(jsonb,uuid) from public,anon;
grant execute on function public.rebirth_gold_transfer(jsonb,uuid) to authenticated;

create or replace function rebirth_private.claim_gold_transfer_mail(p_mail uuid,p_request uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 actor uuid; receiver rebirth_private.players%rowtype; mail rebirth_private.gold_transfer_mail%rowtype;
 receipt rebirth_private.receipts%rowtype; balance bigint; result jsonb;
 fingerprint jsonb:=jsonb_build_object('command','goldTransferClaim','args',jsonb_build_object('id','gold-transfer-'||p_mail));
begin
 perform pg_advisory_xact_lock(71823001);
 actor:=rebirth_private.session_user();
 if p_request is null or p_mail is null then raise exception 'MAIL_NOT_FOUND'; end if;
 select * into receipt from rebirth_private.receipts where user_id=actor and request_id=p_request;
 if found then
  if receipt.fingerprint<>fingerprint then raise exception 'REQUEST_ID_REUSED'; end if;
  select * into receiver from rebirth_private.players where id=actor;
  return jsonb_build_object('state',receiver.state,'revision',receiver.revision,'result',receipt.result);
 end if;
 select * into receiver from rebirth_private.players where id=actor for update;
 if receiver.state is null then raise exception 'CHARACTER_REQUIRED'; end if;
 if receiver.state->'battle'<>'null'::jsonb or nullif(receiver.state->>'partyRoom','') is not null or nullif(receiver.state->>'coopRoom','') is not null then raise exception 'BATTLE_IN_PROGRESS'; end if;
 select * into mail from rebirth_private.gold_transfer_mail where id=p_mail and recipient=actor for update;
 if not found then raise exception 'MAIL_NOT_FOUND'; end if;
 if mail.claimed_at is not null then raise exception 'MAIL_ALREADY_CLAIMED'; end if;
 if not exists(select 1 from jsonb_array_elements(coalesce(receiver.state->'rewardMailbox','[]'::jsonb)) entry where entry->>'id'='gold-transfer-'||p_mail) then raise exception 'MAIL_NOT_FOUND'; end if;
 balance:=coalesce((receiver.state->>'gold')::bigint,0);
 if balance<0 or balance+mail.amount>9000000000000 then raise exception 'INVALID_TRANSFER_LIMIT'; end if;
 update rebirth_private.players set state=jsonb_set(jsonb_set(jsonb_set(jsonb_set(state,'{gold}',to_jsonb(balance+mail.amount)),'{rewardMailbox}',coalesce((select jsonb_agg(entry) from jsonb_array_elements(coalesce(state->'rewardMailbox','[]'::jsonb)) entry where entry->>'id'<>'gold-transfer-'||p_mail),'[]'::jsonb)),'{systemMailbox}',coalesce((select jsonb_agg(entry) from jsonb_array_elements(coalesce(state->'systemMailbox','[]'::jsonb)) entry where entry->>'id'<>'gold-transfer-'||p_mail),'[]'::jsonb)),'{claimedSystemMail}',coalesce(state->'claimedSystemMail','[]'::jsonb)||to_jsonb('gold-transfer-'||p_mail)),revision=revision+1,updated_at=now() where id=actor returning * into receiver;
 update rebirth_private.gold_transfer_mail set claimed_at=now() where id=p_mail;
 result:=jsonb_build_object('events',jsonb_build_array(jsonb_build_object('type','goldTransferClaim','amount',mail.amount)));
 insert into rebirth_private.receipts(user_id,request_id,fingerprint,result) values(actor,p_request,fingerprint,result);
 return jsonb_build_object('state',receiver.state,'revision',receiver.revision,'result',result);
end $$;
revoke all on function rebirth_private.claim_gold_transfer_mail(uuid,uuid) from public,anon;
grant execute on function rebirth_private.claim_gold_transfer_mail(uuid,uuid) to authenticated;
create or replace function public.rebirth_gold_transfer_claim(p_mail uuid,p_request uuid) returns jsonb
language sql security invoker set search_path='' as $$select rebirth_private.claim_gold_transfer_mail(p_mail,p_request)$$;
revoke all on function public.rebirth_gold_transfer_claim(uuid,uuid) from public,anon;
grant execute on function public.rebirth_gold_transfer_claim(uuid,uuid) to authenticated;
