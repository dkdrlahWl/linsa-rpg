-- Extend the existing receipt-backed mail transfer to essence and stones.
create table ringu_private.resource_transfers (
 sender_id uuid not null references ringu_private.accounts(id),request_id uuid not null,
 recipient_id uuid not null references ringu_private.accounts(id),
 resource text not null check(resource in ('essence','transcendStone')),
 amount bigint not null check(amount between 2 and 9000000000000),fee bigint not null,
 created_at timestamptz not null default now(),primary key(sender_id,request_id),check(sender_id<>recipient_id)
);
alter table ringu_private.resource_transfers enable row level security;
revoke all on ringu_private.resource_transfers from public,anon,authenticated;
create function public.ringu_resource_transfer(p_action text default 'status',p_recipient uuid default null,p_amount numeric default null,p_request_id uuid default null,p_resource text default 'gold')
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid;sender ringu_private.accounts%rowtype;recipient ringu_private.accounts%rowtype;receipt ringu_private.resource_transfers%rowtype;
 result jsonb;ranks jsonb;total bigint;fee bigint;net bigint;owned bigint;incoming numeric;label text;mid text;
begin
 if p_resource is null or p_resource not in ('gold','essence','transcendStone') or p_action is null or p_action not in ('status','send') then raise exception 'INVALID_ARGUMENTS';end if;
 perform pg_advisory_xact_lock(70909,10);u:=ringu_private.require_session(false);
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready) then raise exception 'ECONOMY_NOT_READY';end if;
 select * into strict sender from ringu_private.accounts where id=u for update;
 if p_action='status' then
  result:=public.ringu_gold_transfer('status');
  return result||jsonb_build_object('balances',jsonb_build_object('gold',coalesce((sender.state->>'gold')::bigint,0),'essence',coalesce((sender.state->>'essence')::bigint,0),'transcendStone',coalesce((sender.state->>'transcendStone')::bigint,0)));
 end if;
 if p_request_id is null or p_recipient is null or p_amount is null or p_amount<2 or p_amount>9000000000000 or p_amount<>trunc(p_amount) then raise exception 'INVALID_ARGUMENTS';end if;
 if p_recipient=u then raise exception 'TRANSFER_SELF';end if;
 select * into receipt from ringu_private.resource_transfers where sender_id=u and request_id=p_request_id;
 if found then
  if receipt.resource<>p_resource or receipt.recipient_id<>p_recipient or receipt.amount<>p_amount then raise exception 'REQUEST_ID_REUSED';end if;
  return jsonb_build_object('ok',true,'replayed',true,'resource',receipt.resource,'amount',receipt.amount,'fee',receipt.fee,'received',receipt.amount-receipt.fee,'total',receipt.amount,'delivery','mail','recipient',receipt.recipient_id);
 end if;
 if p_resource='gold' then return public.ringu_gold_transfer(p_action,p_recipient,p_amount,p_request_id);end if;
 if exists(select 1 from ringu_private.gold_transfers where sender_id=u and request_id=p_request_id) then raise exception 'REQUEST_ID_REUSED';end if;
 ranks:=public.ringu_ranking()->'rows';
 if not exists(select 1 from jsonb_array_elements(ranks) v where v->>'id'=p_recipient::text) then raise exception 'TRANSFER_RECIPIENT_UNAVAILABLE';end if;
 select * into strict recipient from ringu_private.accounts where id=p_recipient for update;
 if recipient.state is null then raise exception 'TRANSFER_RECIPIENT_UNAVAILABLE';end if;
 total:=p_amount::bigint;fee:=ceil(p_amount/20)::bigint;net:=total-fee;
 owned:=coalesce((sender.state->>p_resource)::bigint,0);
 if owned<total then raise exception 'INSUFFICIENT_RESOURCE';end if;
 select coalesce(sum((m->'reward'->>p_resource)::numeric),0) into incoming from jsonb_array_elements(coalesce(recipient.state->'mailbox','[]'::jsonb)) m;
 if coalesce((recipient.state->>p_resource)::numeric,0)+incoming+net>9000000000000 then raise exception 'TRANSFER_RECIPIENT_LIMIT';end if;
 update ringu_private.accounts set state=jsonb_set(state,array[p_resource],to_jsonb(owned-total)),revision=revision+1,updated_at=now() where id=u;
 label:=case when p_resource='essence' then '정수' else '초월석' end;mid:='resource-transfer-'||u::text||'-'||p_request_id::text;
 update ringu_private.accounts set state=jsonb_set(state,'{mailbox}',jsonb_build_array(jsonb_build_object('id',mid,'title',label||' 송금 도착','message',coalesce(sender.state->>'playerName','모험가')||'님이 보낸 '||label||'입니다. 송금량 '||total||' · 수수료 '||fee||' · 수령량 '||net,'reward',jsonb_build_object(p_resource,net),'createdAt',floor(extract(epoch from now())*1000)))||coalesce(state->'mailbox','[]'::jsonb)),revision=revision+1,updated_at=now() where id=p_recipient;
 insert into ringu_private.resource_transfers values(u,p_request_id,p_recipient,p_resource,total,fee,now());
 return jsonb_build_object('ok',true,'resource',p_resource,'amount',total,'fee',fee,'total',total,'received',net,'delivery','mail','recipient',p_recipient);
end $$;
revoke all on function public.ringu_resource_transfer(text,uuid,numeric,uuid,text) from public,anon;
grant execute on function public.ringu_resource_transfer(text,uuid,numeric,uuid,text) to authenticated;
