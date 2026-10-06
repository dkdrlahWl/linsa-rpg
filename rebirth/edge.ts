import {startCoop,advanceCoop,setWaveSpeed,coopClientView,validateCoopFrames} from './coop-model.mjs';
import { BOSSES, CLASS_SKILLS, SECOND_SKILLS, raidBoss } from "./data.mjs";
import { initialState, execute, power, grantCoopChest, grantRaidChest } from "./engine.mjs";
import {buildBot,arenaProfile,arenaOfferProfiles,simulateArena} from './arena-model.mjs';
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const origin = "https://dkdrlahwl.github.io";
Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin, Accept-Encoding",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Max-Age": "3600",
  };
  let coopProtocol=1;
  const requestStarted=performance.now(),rpcTimes=[];
  let requestCommand='';
  const reply = (data: unknown, status = 200) => {
    const json=JSON.stringify(data&&typeof data==="object"&&"coop" in data?{...data,coop:coopClientView(data.coop,coopProtocol)}:data,(key,value)=>key==="_net"||key==="_queuedInputs"?undefined:value);
    const gzip=json.length>4096&&(req.headers.get('accept-encoding')||'').split(',').some(part=>part.trim().split(';')[0]==='gzip'&&!/;\s*q=0(?:\.0*)?\s*$/.test(part));
    if(performance.now()-requestStarted>1500)console.warn('ringu-slow-request',JSON.stringify({command:requestCommand,ms:Math.round(performance.now()-requestStarted),rpc:rpcTimes,bytes:json.length}));
    return new Response(gzip?new Blob([json]).stream().pipeThrough(new CompressionStream('gzip')):json, {
      status,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        ...(gzip?{"Content-Encoding":"gzip"}:{}),
      },
    });
  };
  if (req.headers.get("origin") && req.headers.get("origin") !== origin)
    return reply({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    return reply({ error: "LOGIN_REQUIRED" }, 401);
  const rpc = async (name: string, body: unknown, admin = false) => {
    const began=performance.now();
    const r = await fetch(url + "/rest/v1/rpc/" + name, {
      method: "POST",
      headers: {
        apikey: admin ? service : anon,
        Authorization: admin ? "Bearer " + service : authorization,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const data = await r.json().catch(()=>({message:'SERVER_RETRY_REQUIRED'}));
    rpcTimes.push({name,ms:Math.round(performance.now()-began),status:r.status});
    if (!r.ok) throw new Error(!admin&&r.status===401?"LOGIN_REQUIRED":data.message || "SERVER_RETRY_REQUIRED");
    return data;
  };
  try {
    const raw = await req.text();
    if (raw.length > 16384) return reply({ error: "INVALID_BODY" }, 400);
    const body = JSON.parse(raw);
    requestCommand=body.command;
    if (
      !/^[0-9a-f-]{36}$/i.test(body.requestId || "") ||
      typeof body.command !== "string" ||
      !body.args ||
      typeof body.args !== "object" ||
      Array.isArray(body.args)
    )
      return reply({ error: "INVALID_REQUEST" }, 400);
    const fingerprint = { command: body.command, args: body.args };
    const fastInput=body.command==='coopInput';
    coopProtocol=body.args.protocol===2?2:1;
    if(fastInput&&Object.hasOwn(body.args,'frames'))validateCoopFrames(body.args.frames);
    // PostgREST verifies the input bearer token, and frame_snapshot validates
    // the active auth.sessions row before queuing any frames. Repeating the
    // Auth HTTP lookup for every combat packet adds a second request per player.
    let initialFrameSnapshot=null;
    let user;
    if(fastInput){
      initialFrameSnapshot=await rpc('rebirth_coop_frame_snapshot',{p_request:body.requestId,p_fingerprint:fingerprint,p_args:body.args,p_compact:body.args.compact===true});
      if(!initialFrameSnapshot?.snapshot?.user||!initialFrameSnapshot.snapshot.session)throw new Error('LOGIN_REQUIRED');
      user={id:initialFrameSnapshot.snapshot.user};
    }else{
      const auth=await fetch(url + "/auth/v1/user", {
        headers: { apikey: anon, Authorization: authorization },
        signal: AbortSignal.timeout(10000),
      });
      if (!auth.ok) return reply({ error: "LOGIN_REQUIRED" }, 401);
      user=await auth.json();
    }
    if(['investList','investBuy','investSell'].includes(body.command)){
      return reply(await rpc('rebirth_investment',{p_action:body.command==='investBuy'?'buy':body.command==='investSell'?'sell':'list',p_args:body.args,p_request:body.requestId}));
    }
    if(['lottoList','lottoBuy'].includes(body.command)){
      return reply(await rpc('rebirth_lotto',{p_action:body.command==='lottoBuy'?'buy':'list',p_args:body.args,p_request:body.requestId}));
    }
    if(body.command==='adminTransfer'){
      if(user.app_metadata?.ringu_admin!==true)throw new Error('BETA_DISABLED');
      return reply(await rpc('rebirth_admin_transfer',{p_args:body.args,p_request:body.requestId}));
    }
    if(body.command==='goldTransfer'){
      return reply(await rpc('rebirth_gold_transfer',{p_args:body.args,p_request:body.requestId}));
    }
    if(body.command==='goldTransferClaim'){
      const id=body.args?.id;
      if(typeof id!=='string'||!/^gold-transfer-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))throw new Error('MAIL_NOT_FOUND');
      return reply(await rpc('rebirth_gold_transfer_claim',{p_mail:id.slice(14),p_request:body.requestId}));
    }
    if(body.command==='arenaRewardClaim'){
      const id=body.args?.id;
      if(typeof id!=='string'||!/^arena-season-\d{8}$/.test(id))throw new Error('MAIL_NOT_FOUND');
      const date=id.slice(13),season=date.slice(0,4)+'-'+date.slice(4,6)+'-'+date.slice(6,8)+'T00:00:00+09:00';
      return reply(await rpc('rebirth_arena_reward_claim',{p_season:season,p_request:body.requestId}));
    }
    if(body.command==='arenaList'||body.command==='arenaFight'){
      const arena=await rpc('rebirth_arena_status',{});
      const readPlayer=(id:string)=>rpc('rebirth_arena_opponent_snapshot',{p_user:id},true);
      const offers=await arenaOfferProfiles(arena,readPlayer);
      if(body.command==='arenaList')return reply({arena:{...arena,offers}});
      const target=body.args?.opponentId;
      if(typeof target!=='string'||!/^((bot:[1-9]\d{0,3})|(player:[0-9a-f-]{36}))$/.test(target))throw new Error('INVALID_ARENA_OPPONENT');
      const previous=await rpc('rebirth_arena_receipt',{p_request:body.requestId});
      if(previous){if(previous.opponentId!==target)throw new Error('REQUEST_ID_REUSED');return reply({arena:{...arena,offers},battle:previous});}
      const opponent=arena.offers.find((o:any)=>o.id===target&&!o.used);
      if(!opponent)throw new Error('ARENA_OPPONENT_UNAVAILABLE');
      const snap=await rpc('rebirth_snapshot',{p_request:body.requestId});
      if(snap.user!==user.id||!snap.state)throw new Error('CHARACTER_REQUIRED');
      if(snap.state.battle||snap.state.coopRoom)throw new Error('BATTLE_IN_PROGRESS');
      const enemy=opponent.kind==='bot'?buildBot({id:Number(target.slice(4)),name:opponent.name,classId:opponent.classId,score:opponent.score}):await rpc('rebirth_arena_opponent_snapshot',{p_user:target.slice(7)},true);
      const battle=simulateArena(snap.state,enemy,body.requestId);
      const saved=await rpc('rebirth_arena_commit',{p_user:user.id,p_session:snap.session,p_request:body.requestId,p_target:target,p_result:{battle,opponent:arenaProfile(enemy,opponent.score,opponent.rank??arena.top100.find((r:any)=>r.id===target)?.rank??null,target),self:arenaProfile(snap.state,arena.score,arena.rank,'self')}},true);
      const latest=await rpc('rebirth_arena_status',{});
      return reply({arena:{...latest,offers:await arenaOfferProfiles(latest,readPlayer)},battle:saved});
    }
    for (let retry = 0; retry < 3; retry++) {
      const frameSnapshot=fastInput?(retry===0?initialFrameSnapshot:await rpc('rebirth_coop_frame_snapshot',{p_request:body.requestId,p_fingerprint:fingerprint,p_args:body.args,p_compact:body.args.compact===true})):null;
      const snap = frameSnapshot?.snapshot||await rpc("rebirth_snapshot", { p_request: body.requestId });
      if (snap.user !== user.id) throw new Error("LOGIN_REQUIRED");
      if(body.command.startsWith('coop')||(body.command==='sync'&&snap.state?.coopRoom)){
        if(fastInput?!snap.hasCharacter:!snap.state)throw new Error('CHARACTER_REQUIRED');
        const action=body.command==='sync'?'sync':body.command.slice(4).toLowerCase();
        if(!['create','join','start','ready','input','sync','leave','list','open'].includes(action))throw new Error('INVALID_COOP_ACTION');
        const queueInput=action==='input'&&Array.isArray(body.args.frames);
        if(queueInput)validateCoopFrames(body.args.frames);
        const ctx={accountId:user.id,admin:user.app_metadata?.ringu_admin===true,accountCreatedAt:user.created_at,now:Number(snap.now),random:()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,uuid:()=>crypto.randomUUID()};
        const computed=fastInput?null:execute(snap.state,'sync',{},ctx);
        const base={queueInput,compact:fastInput&&body.args.compact===true,user:user.id,session:snap.session,epoch:snap.epoch,revision:snap.revision,request:body.requestId,fingerprint,state:computed?.state,power:computed?power(computed.state):undefined,args:body.args};
        try{
          const current=frameSnapshot?.current||await rpc('rebirth_coop_action',{p:{...base,action:'read'}},true);
          if(snap.receipt)return reply(current);
          const room=current.coop;
          if(!room&&["input","sync"].includes(action))return reply(current);
          if(action==="start"&&!room)throw new Error("PARTY_NOT_FOUND");
          const world=action==='sync'&&body.args.waveSpeed!==undefined?setWaveSpeed(room,user.id,body.args.waveSpeed,Number(current.now)):action==='start'?startCoop(room,Number(current.now)):room?advanceCoop(room,user.id,action==='input'?(body.args.frames?{frames:body.args.frames}:body.args.input):room?.status==='fighting'?{frames:[]}:null,Number(current.now)):null;
          if(action==='input'&&world===room)return reply(current);
          let claim=null;
          if(action==='open'){
            const member=room?.members.find(m=>m.id===user.id&&!m.left&&!m.claimed);
            if(room?.status!=='won'||!member||!room.chest)throw new Error('COOP_CHEST_NOT_READY');
            if(!(member.damage>0||(room.mode==='raid'&&((member.healing||0)+(member.shieldGiven||0)>0))))throw new Error('COOP_DAMAGE_REQUIRED');
            if(Math.hypot(member.x-room.chest.x,member.y-room.chest.y)>180)throw new Error('COOP_CHEST_TOO_FAR');
            claim=room.mode==='raid'?grantRaidChest(computed.state,room.tier,ctx):grantCoopChest(computed.state,room.tier,ctx);
          }
          const result=await rpc('rebirth_coop_action',{p:{...base,action,world,roomRevision:room?.revision,reward:claim?.reward,rewardState:claim?.state}},true);
          return reply(result);
        }catch(e){
          if(fastInput&&(e.message==='SAVE_CONFLICT'||/lock timeout|deadlock detected/i.test(e.message))){
            // Entry movement and chest walking use held input rather than the
            // frame queue. A concurrent participant may win the room revision;
            // return the newest authenticated state and resend on the next poll.
            const latest=await rpc('rebirth_coop_frame_snapshot',{p_request:body.requestId,p_fingerprint:fingerprint,p_args:body.args,p_compact:body.args.compact===true});
            return reply(latest.current);
          }
          if(e.message==='SAVE_CONFLICT'&&retry<2)continue;throw e;
        }
      }
      if(snap.state?.coopRoom)throw new Error('BATTLE_IN_PROGRESS');
      if (snap.state?.battle?.kind === "tower" && body.command.startsWith("party")) throw new Error("BATTLE_IN_PROGRESS");
      if(body.command.startsWith("party"))throw new Error("BOSS_CONTENT_REMOVED");
      if (snap.receipt) {
        if (
          JSON.stringify(snap.receipt.fingerprint) !==
          JSON.stringify(fingerprint)
        ) {
          // Compare JSON semantically: PostgreSQL jsonb ordering differs.
          if (
            snap.receipt.fingerprint.command !== body.command ||
            JSON.stringify(sort(snap.receipt.fingerprint.args)) !==
              JSON.stringify(sort(body.args))
          )
            throw new Error("REQUEST_ID_REUSED");
        }
        return reply({
          state: snap.state,
          revision: snap.revision,
          result: snap.receipt.result,
        });
      }
      const ctx = {
        accountId: user.id,
        admin: user.app_metadata?.ringu_admin === true,
        accountCreatedAt: user.created_at,
        now: Number(snap.now),
        random: () =>
          crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
        uuid: () => crypto.randomUUID(),
      };
      if (!snap.state && body.command !== "create")
        return reply({
          state: null,
          revision: snap.revision,
          result: { events: [] },
        });
      if (snap.state && body.command === "create")
        throw new Error("ALREADY_CREATED");
      const computed =
        body.command === "create"
          ? {
              state: initialState(body.args.classId, body.args.name, ctx),
              events: [],
            }
          : execute(snap.state, body.command, body.args, ctx);
      try {
        const result = await rpc(
          "rebirth_commit",
          {
            p_user: user.id,
            p_session: snap.session,
            p_epoch: snap.epoch,
            p_revision: snap.revision,
            p_request: body.requestId,
            p_fingerprint: fingerprint,
            p_state: computed.state,
            p_result: { events: computed.events },
          },
          true,
        );
        const latest = await rpc("rebirth_snapshot", {
          p_request: body.requestId,
        });
        return reply({
          state: latest.state,
          revision: latest.revision,
          result,
        });
      } catch (e) {
        if (e.message === "SAVE_CONFLICT" && retry < 2) continue;
        throw e;
      }
    }
    throw new Error("SAVE_CONFLICT");
  } catch (e) {
    const message = e instanceof Error ? e.message : "SERVER_RETRY_REQUIRED";
    const business =
      /^(INVALID_|INSUFFICIENT_|ITEM_|LEVEL_|STARS_|PREVIOUS_|MAX_|ALREADY_|NO_|SKILL_|POTENTIAL_|BOSS_|DUNGEON_|BATTLE_|INVENTORY_|UNKNOWN_|REQUEST_|CHARACTER_|MAIL_|PARTY_|RAID_|ADVANCEMENT_|DAILY_|COOP_|BETA_|SHOP_|PRIME_|LOTTO_|ARENA_)/.test(
        message,
      );
    if(!business)console.error("ringu-request-failed",message);
    return reply(
      {
        error:
          business ||
          /^(LOGIN_|SESSION_|REBIRTH_|SAVE_CONFLICT|VERSION_MISMATCH)/.test(
            message,
          )
            ? message
            : "SERVER_RETRY_REQUIRED",
      },
      /^(LOGIN_|SESSION_)/.test(message) ? 401 : business ? 400 : 503,
    );
  }
});
function sort(value: any): any {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(
        Object.keys(value)
          .sort()
          .map((k) => [k, sort(value[k])]),
      )
    : Array.isArray(value)
      ? value.map(sort)
      : value;
}
