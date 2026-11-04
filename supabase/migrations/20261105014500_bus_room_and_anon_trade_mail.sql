-- 2026-11-05 도현: ① 거래 우편 상대 이름 비공개 ② 링탐 버스 방 (방장만 열쇠 사용·보상, 파티원은 열쇠·보상 없음)
do $m$
declare def text; a text; b text;
begin
 -- ① 거래소·구매 요청 우편 문구 익명
 select pg_get_functiondef('rebirth_private.market(text,jsonb,uuid)'::regprocedure) into def;
 def:=replace(def,$x$coalesce(v_seller.state->>'name','?')||'님에게서 구매했어요.'$x$,$x$'거래소에서 구매했어요.'$x$);
 def:=replace(def,$x$coalesce(p.state->>'name','?')||'님이 '||quantity||'개를 구매했어요.'$x$,$x$quantity||'개가 팔렸어요.'$x$);
 def:=replace(def,$x$coalesce(v_seller.state->>'name','?')||'님에게서 구매한 장비예요.'$x$,$x$'거래소에서 구매한 장비예요.'$x$);
 def:=replace(def,$x$coalesce(p.state->>'name','?')||'님이 장비를 구매했어요.'$x$,$x$'장비가 팔렸어요.'$x$);
 if position('님에게서' in def)>0 or position('님이 장비' in def)>0 then raise exception 'ANON_MARKET_LEFT';end if;
 execute def;
 select pg_get_functiondef('rebirth_private.buy_order(text,jsonb,uuid)'::regprocedure) into def;
 a:=$x$coalesce((select ps.state->>'name' from rebirth_private.players ps where ps.id=u),'?')||'님이 '||qty||'개를 팔았어요.'$x$;
 if position(a in def)=0 then raise exception 'ANON_BO';end if;
 def:=replace(def,a,$x$'구매 요청에 '||qty||'개가 들어왔어요.'$x$);
 execute def;

 -- ② 버스 방
 select pg_get_functiondef('public.rebirth_coop_action(jsonb)'::regprocedure) into def;
 a:=$x$if room_mode='exploration' then w:=w||jsonb_build_object('keyOwner',u,'keyConsumed',false);end if;$x$;
 if position(a in def)=0 then raise exception 'BUS1';end if;
 def:=replace(def,a,a||$x$ if room_mode='exploration' and (w->>'tier')::int<>3 and coalesce((p->'args'->>'bus')::boolean,false) then w:=w||'{"bus":true}'::jsonb;end if;$x$);
 a:=$x$where not coalesce((mm->>'left')::boolean,false) and coalesce((pl.state->'materials'->>'dungeonKey')::bigint,0)<rebirth_private.exploration_key_cost((w->>'tier')::int))$x$;
 if position(a in def)=0 then raise exception 'BUS2';end if;
 def:=replace(def,a,$x$where not coalesce((mm->>'left')::boolean,false) and (not coalesce((w->>'bus')::boolean,false) or mm->>'id'=w->>'owner') and coalesce((pl.state->'materials'->>'dungeonKey')::bigint,0)<rebirth_private.exploration_key_cost((w->>'tier')::int))$x$);
 a:=$x$    if reward is null or st is null or reward->>'type'<>'coop' then raise exception 'COOP_INVALID_REWARD';end if;$x$;
 if position(a in def)=0 then raise exception 'BUS3';end if;
 def:=replace(def,a,a||E'\n'||$x$    if w->>'mode'='exploration' and coalesce((w->>'bus')::boolean,false) and w->>'owner'<>u::text then reward:=jsonb_build_object('type','coop','mode','exploration','bus',true,'won',true,'tier',(w->>'tier')::int,'name','버스 참여 (보상 없음)','gold',0,'cube',0,'highCube',0,'scroll',0,'potentialLock',0,'items','[]'::jsonb,'seconds',coalesce((w->>'tick')::numeric/10,0));st:=actor.state;end if;$x$);
 a:=$x$if w->>'mode'='exploration' then st:=jsonb_set(st,'{materials,dungeonKey}',to_jsonb(greatest(0,coalesce((actor.state->'materials'->>'dungeonKey')::bigint,0)-case when (w->>'tier')::int<>3 then$x$;
 if position(a in def)=0 then raise exception 'BUS4';end if;
 def:=replace(def,a,$x$if w->>'mode'='exploration' then st:=jsonb_set(st,'{materials,dungeonKey}',to_jsonb(greatest(0,coalesce((actor.state->'materials'->>'dungeonKey')::bigint,0)-case when (w->>'tier')::int<>3 and not (coalesce((w->>'bus')::boolean,false) and w->>'owner'<>u::text) then$x$);
 execute def;
end $m$;

-- 이미 쌓인 거래 우편의 이름도 지움
update rebirth_private.players p set state=jsonb_set(jsonb_set(state,'{rewardMailbox}',(select jsonb_agg(case when m->>'kind'='trade' then jsonb_set(m,'{message}',to_jsonb(case m->>'title' when '거래소 구매 완료' then case when jsonb_array_length(coalesce(m->'items','[]'::jsonb))>0 then '거래소에서 구매한 장비예요.' else '거래소에서 구매했어요.' end when '거래소 판매 대금' then '거래소 판매 대금이에요.' when '구매 요청 체결' then '구매 요청한 물건이 들어왔어요.' when '구매 요청 판매 대금' then '구매 요청에 판매한 대금이에요.' else m->>'message' end)) else m end) from jsonb_array_elements(state->'rewardMailbox') m)),'{systemMailbox}',(select coalesce(jsonb_agg(case when m->>'kind'='trade' then jsonb_set(m,'{message}',to_jsonb(case m->>'title' when '거래소 구매 완료' then case when jsonb_array_length(coalesce(m->'items','[]'::jsonb))>0 then '거래소에서 구매한 장비예요.' else '거래소에서 구매했어요.' end when '거래소 판매 대금' then '거래소 판매 대금이에요.' when '구매 요청 체결' then '구매 요청한 물건이 들어왔어요.' when '구매 요청 판매 대금' then '구매 요청에 판매한 대금이에요.' else m->>'message' end)) else m end),'[]'::jsonb) from jsonb_array_elements(coalesce(state->'systemMailbox','[]'::jsonb)) m)),revision=revision+1,updated_at=now()
where exists(select 1 from jsonb_array_elements(coalesce(state->'rewardMailbox','[]'::jsonb)) m where m->>'kind'='trade');
