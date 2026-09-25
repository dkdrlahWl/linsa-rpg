-- Retire five cube types; preserve value and pending choices.
do $$
declare l record; p record; st jsonb; m jsonb; k text; target text; ratio integer; amount bigint;
begin
 perform pg_advisory_xact_lock(71823001);
 for l in select * from rebirth_private.listings where status='open' and item->>'kind'='consumable' and item->>'key' in ('strangeCube','masterCube','artisanCube','silverCube','goldCube') for update loop
  k:=l.item->>'key';amount:=(l.item->>'quantity')::bigint;
  update rebirth_private.players set state=jsonb_set(state,array['materials',k],to_jsonb(coalesce((state->'materials'->>k)::bigint,0)+amount)),revision=revision+1,updated_at=now() where id=l.seller;
  update rebirth_private.listings set status='cancelled',item=jsonb_set(item,'{quantity}','0'::jsonb) where id=l.id;
 end loop;
 for p in select id,state from rebirth_private.players where state is not null and ((state->'materials') ?| array['strangeCube','masterCube','artisanCube','silverCube','goldCube'] or state->'pendingCube'->>'kind' in ('silverCube','goldCube')) for update loop
  st:=p.state;m:=coalesce(st->'materials','{}');
  foreach k in array array['strangeCube','masterCube','artisanCube','silverCube','goldCube'] loop
   target:=case when k in ('strangeCube','masterCube') then 'cube' else 'highCube' end;
   ratio:=case when k in ('masterCube','goldCube') then 2 else 1 end;
   m:=jsonb_set(m,array[target],to_jsonb(coalesce((m->>target)::bigint,0)+coalesce((m->>k)::bigint,0)*ratio))-k;
  end loop;
  st:=jsonb_set(st,'{materials}',m);
  if st->'pendingCube'->>'kind' in ('silverCube','goldCube') then st:=jsonb_set(st,'{pendingCube,kind}','"highCube"'::jsonb);end if;
  update rebirth_private.players set state=st,revision=revision+1,updated_at=now() where id=p.id;
 end loop;
end $$;
