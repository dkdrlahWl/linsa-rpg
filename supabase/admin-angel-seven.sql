begin;
set local lock_timeout='5s';
select pg_advisory_xact_lock(70909,10);
do $grant$
declare target record; s jsonb; template jsonb; item jsonb; inventory jsonb:='[]'; discovered jsonb; iid bigint; item_uid uuid;
 campaign constant text:='admin-angel-seven-20260920';
begin
 if (select count(*) from ringu_private.admin_accounts ad join ringu_private.accounts a on a.id=ad.account_id)<>1 then raise exception 'ADMIN_TARGET_CHANGED';end if;
 insert into ringu_private.gift_campaigns(id) values(campaign) on conflict do nothing;
 for target in select a.id from ringu_private.accounts a join ringu_private.admin_accounts ad on ad.account_id=a.id loop
  select state into s from ringu_private.accounts where id=target.id for update;
  insert into ringu_private.gift_receipts(campaign_id,account_id) values(campaign,target.id) on conflict do nothing;
  if not found then continue;end if;
  discovered:=coalesce(s->'discovered','{}');
  for template in select value from jsonb_array_elements('[{"slot":"무기","rarity":7,"index":0,"name":"천사의 여명검","baseAtk":7875,"templateId":"angel-1-0","art":"gear-0.svg"},{"slot":"투구","rarity":7,"index":0,"name":"천사의 순백광륜","baseAtk":1972,"templateId":"angel-1-1","art":"gear-1.svg"},{"slot":"갑옷","rarity":7,"index":0,"name":"천사의 성휘갑옷","baseAtk":1968,"templateId":"angel-1-2","art":"gear-2.svg"},{"slot":"바지","rarity":7,"index":0,"name":"천사의 백익각반","baseAtk":1971,"templateId":"angel-1-3","art":"gear-3.svg"},{"slot":"신발","rarity":7,"index":0,"name":"천사의 구름장화","baseAtk":1970,"templateId":"angel-1-4","art":"gear-4.svg"},{"slot":"반지","rarity":7,"index":0,"name":"천사의 영원반지","baseAtk":3938,"templateId":"angel-1-5","art":"gear-5.svg"},{"slot":"귀걸이","rarity":7,"index":0,"name":"천사의 별빛귀걸이","baseAtk":3933,"templateId":"angel-1-6","art":"gear-6.svg"}]'::jsonb) loop
   iid:=nextval('ringu_private.auction_item_ids');item_uid:=gen_random_uuid();
   item:=template||jsonb_build_object('id',iid,'auctionUid',item_uid,'enhance',0,'transcend',0,'locked',true,'optionRolls',jsonb_build_array(.8,.8),'cubeVersion',1,'cubeTier',0,'isNew',true,'grantCampaign',campaign);
   insert into ringu_private.auction_items(id,uid,owner_id,item) values(iid,item_uid,target.id,item);
   inventory:=inventory||jsonb_build_array(item);
   discovered:=discovered||jsonb_build_object((item->>'slot')||'|7|'||(item->>'name'),true);
  end loop;
  update ringu_private.accounts set state=s||jsonb_build_object('inventory',inventory||coalesce(s->'inventory','[]'),'discovered',discovered,'uid',greatest(coalesce((s->>'uid')::bigint,1),iid+1)),revision=revision+1,updated_at=clock_timestamp() where id=target.id;
 end loop;
end $grant$;
commit;
