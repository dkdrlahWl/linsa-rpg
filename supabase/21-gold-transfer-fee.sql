alter table ringu_private.gold_transfers add column fee bigint not null default 0 check(fee>=0);
create or replace function public.ringu_gold_transfer(p_action text default 'status',p_recipient uuid default null,p_amount numeric default null,p_request_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid; sender ringu_private.accounts%rowtype; recipient ringu_private.accounts%rowtype;
 receipt ringu_private.gold_transfers%rowtype; ranks jsonb; people jsonb; sender_gold bigint; recipient_gold bigint; fee bigint; total bigint;
begin
 if p_action is null or p_action not in ('status','send') then raise exception 'INVALID_ARGUMENTS';end if;
 -- Match the economy/auction lock order before require_session locks the sender.
 perform pg_advisory_xact_lock(70909,10);
 u:=ringu_private.require_session(false);
 if not exists(select 1 from ringu_private.auction_release where singleton and economy_ready) then raise exception 'ECONOMY_NOT_READY';end if;
 select * into strict sender from ringu_private.accounts where id=u for update;
 sender_gold:=coalesce((sender.state->>'gold')::bigint,0);
 if p_action='send' then
  if p_request_id is null or p_recipient is null or p_amount is null or p_amount<1 or p_amount>9000000000000 or p_amount<>trunc(p_amount) then raise exception 'INVALID_ARGUMENTS';end if;
  if p_recipient=u then raise exception 'TRANSFER_SELF';end if;
  select * into receipt from ringu_private.gold_transfers where sender_id=u and request_id=p_request_id;
  if found then
   if receipt.recipient_id<>p_recipient or receipt.amount<>p_amount then raise exception 'REQUEST_ID_REUSED';end if;
   return jsonb_build_object('ok',true,'amount',receipt.amount,'recipient',receipt.recipient_id,'replayed',true,'fee',receipt.fee,'total',receipt.amount+receipt.fee);
  end if;
 end if;
 ranks:=public.ringu_ranking()->'rows';
 if p_action='status' then
  select coalesce(jsonb_agg(jsonb_build_object('id',v->>'id','name',v->>'name','power',v->'power') order by ord),'[]'::jsonb) into people from jsonb_array_elements(ranks) with ordinality e(v,ord) where v->>'id'<>u::text;
  return jsonb_build_object('gold',sender_gold,'rows',people,'feePercent',5);
 end if;
 if not exists(select 1 from jsonb_array_elements(ranks) v where v->>'id'=p_recipient::text) then raise exception 'TRANSFER_RECIPIENT_UNAVAILABLE';end if;
 select * into strict recipient from ringu_private.accounts where id=p_recipient for update;
 if recipient.state is null then raise exception 'TRANSFER_RECIPIENT_UNAVAILABLE';end if;
 recipient_gold:=coalesce((recipient.state->>'gold')::bigint,0);
 fee:=ceil(p_amount/20)::bigint;total:=p_amount::bigint+fee;
 if sender_gold<total then raise exception 'INSUFFICIENT_GOLD';end if;
 if recipient_gold>9000000000000-p_amount then raise exception 'TRANSFER_RECIPIENT_LIMIT';end if;
 update ringu_private.accounts set state=jsonb_set(state,'{gold}',to_jsonb(sender_gold-total)),revision=revision+1,updated_at=now() where id=u;
 update ringu_private.accounts set state=jsonb_set(state,'{gold}',to_jsonb(recipient_gold+p_amount::bigint)),revision=revision+1,updated_at=now() where id=p_recipient;
 insert into ringu_private.gold_transfers(sender_id,request_id,recipient_id,amount,fee) values(u,p_request_id,p_recipient,p_amount::bigint,fee);
 return jsonb_build_object('ok',true,'amount',p_amount::bigint,'fee',fee,'total',total,'recipient',p_recipient,'recipientName',recipient.state->>'playerName');
end $$;
revoke all on function public.ringu_gold_transfer(text,uuid,numeric,uuid) from public,anon;
grant execute on function public.ringu_gold_transfer(text,uuid,numeric,uuid) to authenticated;
