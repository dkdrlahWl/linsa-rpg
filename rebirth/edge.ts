import {startCoop,advanceCoop} from './coop-model.mjs';
import { BOSSES, CLASS_SKILLS, SECOND_SKILLS, raidBoss } from "./data.mjs";
import { initialState, execute, power, grantCoopChest } from "./engine.mjs";
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const origin = "https://dkdrlahwl.github.io";
Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Headers": "authorization,apikey,content-type",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
  };
  const reply = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  if (req.headers.get("origin") && req.headers.get("origin") !== origin)
    return reply({ error: "ORIGIN_NOT_ALLOWED" }, 403);
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return reply({ error: "METHOD_NOT_ALLOWED" }, 405);
  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer "))
    return reply({ error: "LOGIN_REQUIRED" }, 401);
  const rpc = async (name: string, body: unknown, admin = false) => {
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
    const data = await r.json();
    if (!r.ok) throw new Error(data.message || "SERVER_RETRY_REQUIRED");
    return data;
  };
  try {
    const auth = await fetch(url + "/auth/v1/user", {
      headers: { apikey: anon, Authorization: authorization },
      signal: AbortSignal.timeout(10000),
    });
    if (!auth.ok) return reply({ error: "LOGIN_REQUIRED" }, 401);
    const user = await auth.json();
    const raw = await req.text();
    if (raw.length > 16384) return reply({ error: "INVALID_BODY" }, 400);
    const body = JSON.parse(raw);
    if (
      !/^[0-9a-f-]{36}$/i.test(body.requestId || "") ||
      typeof body.command !== "string" ||
      !body.args ||
      typeof body.args !== "object" ||
      Array.isArray(body.args)
    )
      return reply({ error: "INVALID_REQUEST" }, 400);
    const fingerprint = { command: body.command, args: body.args };
    for (let retry = 0; retry < 3; retry++) {
      const snap = await rpc("rebirth_snapshot", { p_request: body.requestId });
      if (snap.user !== user.id) throw new Error("LOGIN_REQUIRED");
      if(body.command.startsWith('coop')||(body.command==='sync'&&snap.state?.coopRoom)){
        if(!snap.state)throw new Error('CHARACTER_REQUIRED');
        const action=body.command==='sync'?'sync':body.command.slice(4).toLowerCase();
        if(!['create','join','start','input','sync','leave','list','open'].includes(action))throw new Error('INVALID_COOP_ACTION');
        const ctx={now:Number(snap.now),random:()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,uuid:()=>crypto.randomUUID()};
        const computed=execute(snap.state,'sync',{},ctx);
        const base={user:user.id,session:snap.session,epoch:snap.epoch,revision:snap.revision,request:body.requestId,fingerprint,state:computed.state,power:power(computed.state),args:body.args};
        try{
          const current=await rpc('rebirth_coop_action',{p:{...base,action:'read'}},true);
          if(snap.receipt)return reply(current);
          const room=current.coop;
          if(!room&&["input","sync"].includes(action))return reply(current);
          if(action==="start"&&!room)throw new Error("PARTY_NOT_FOUND");
          const world=action==='start'?startCoop(room,Number(current.now)):room?advanceCoop(room,user.id,action==='input'?body.args.input:null,Number(current.now)):null;
          let claim=null;
          if(action==='open'){
            const member=room?.members.find(m=>m.id===user.id&&!m.left&&!m.claimed);
            if(room?.status!=='won'||!member||!room.chest)throw new Error('COOP_CHEST_NOT_READY');
            if(!(member.damage>0))throw new Error('COOP_DAMAGE_REQUIRED');
            if(Math.hypot(member.x-room.chest.x,member.y-room.chest.y)>180)throw new Error('COOP_CHEST_TOO_FAR');
            claim=grantCoopChest(computed.state,room.tier,ctx);
          }
          const result=await rpc('rebirth_coop_action',{p:{...base,action,world,roomRevision:room?.revision,reward:claim?.reward,rewardState:claim?.state}},true);
          return reply(result);
        }catch(e){if(e.message==='SAVE_CONFLICT'&&retry<2)continue;throw e;}
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
      /^(INVALID_|INSUFFICIENT_|ITEM_|LEVEL_|STARS_|PREVIOUS_|MAX_|ALREADY_|NO_|SKILL_|POTENTIAL_|BOSS_|DUNGEON_|BATTLE_|INVENTORY_|UNKNOWN_|REQUEST_|CHARACTER_|MAIL_|PARTY_|RAID_|ADVANCEMENT_|DAILY_|COOP_|BETA_|SHOP_|PRIME_)/.test(
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
