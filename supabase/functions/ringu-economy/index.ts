import {execute,initialState} from '../_shared/tower-hp-third.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const publishable=Deno.env.get('SUPABASE_ANON_KEY')||JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default;
const service=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default;
const origins=(Deno.env.get('RINGU_ALLOWED_ORIGINS')||'https://dkdrlahwl.github.io').split(',');
Deno.serve(async request=>{
 const origin=request.headers.get('origin')||'',cors={'Access-Control-Allow-Origin':origins.includes(origin)?origin:origins[0],'Vary':'Origin','Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
 const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
 if(origin&&!origins.includes(origin))return respond({error:'ORIGIN_NOT_ALLOWED'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return respond({error:'METHOD_NOT_ALLOWED'},405);
 if(!url||!publishable||!service)return respond({error:'SERVER_NOT_CONFIGURED'},503);
 const authorization=request.headers.get('authorization');if(!authorization?.startsWith('Bearer '))return respond({error:'LOGIN_REQUIRED'},401);
 async function rpc(name:string,args:unknown,admin=false){
  const r=await fetch(url+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:admin?service:publishable,...(admin?(service.startsWith('eyJ')?{Authorization:'Bearer '+service}:{}):{Authorization:authorization!}),'Content-Type':'application/json'},body:JSON.stringify(args)});
  const data=await r.json();if(!r.ok)throw new Error(data.message||'DATABASE_ERROR');return data;
 }
 try{
  // Verified by Auth and again by database newest-session checks. Never trust a
  // browser-supplied user ID or JWT payload without verification.
  const auth=await fetch(url+'/auth/v1/user',{headers:{apikey:publishable,Authorization:authorization}});if(!auth.ok)return respond({error:'LOGIN_REQUIRED'},401);const user=await auth.json();
  const text=await request.text();if(text.length>16000)return respond({error:'REQUEST_TOO_LARGE'},413);let body;try{body=JSON.parse(text);}catch{return respond({error:'INVALID_ARGUMENTS'},400);}
  if(!body||typeof body!=='object'||Array.isArray(body))return respond({error:'INVALID_ARGUMENTS'},400);
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.requestId||''))return respond({error:'REQUEST_ID_REQUIRED'},400);
  const fingerprint={command:body.command,args:body.args||{}};
  for(let attempt=0;attempt<3;attempt++){
   let snapshot=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});
   if(!snapshot.ready)return respond({error:'ECONOMY_NOT_READY'},503);
   if(snapshot.accountId!==user.id)return respond({error:'LOGIN_REQUIRED'},401);
   if(!snapshot.enrolled){const initial=initialState(snapshot.now);initial.playerUid=crypto.randomUUID().replaceAll('-','').slice(0,10).toUpperCase();await rpc('ringu_economy_enroll',{p_user:snapshot.accountId,p_session:snapshot.sessionId,p_initial:initial},true);snapshot=await rpc('ringu_economy_snapshot',{p_request_id:body.requestId});}
   // RNG is server-only. Transaction retry will only recompute on an actual CAS
   // conflict; recorded requests return their original outcome below.
   const computed=snapshot.receipt?{state:snapshot.state,events:snapshot.receipt.events}:execute(snapshot.state,body.command,body.args||{},{now:snapshot.now,itemIds:snapshot.itemIds,random:()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296,uuid:()=>crypto.randomUUID(),adminFloor:snapshot.adminFloor,costumePercent:snapshot.costumePercent,partyBusy:snapshot.partyBusy});
   try{
    const result=await rpc('ringu_economy_commit',{p_user:snapshot.accountId,p_session:snapshot.sessionId,p_revision:snapshot.revision,p_request_id:body.requestId,p_fingerprint:fingerprint,p_state:computed.state,p_result:{events:computed.events}},true);
    const fresh=await rpc('ringu_economy_snapshot',{});
    return respond({state:fresh.state,revision:fresh.revision,result:result.result,requestId:body.requestId});
   }catch(e){if(e.message==='SAVE_CONFLICT'&&attempt<2)continue;throw e;}
  }
  return respond({error:'SAVE_CONFLICT'},409);
 }catch(e){
  const message=e instanceof Error?e.message:'SERVER_ERROR';
  // A transport failure can occur after COMMIT. Do not label it a definitive
  // business rejection: the browser must retain and replay the same receipt ID.
  const business=/^(INVALID_[A-Z_]+|INSUFFICIENT_[A-Z_]+|ITEM_[A-Z_]+|PET_NOT_OWNED|ALREADY_[A-Z_]+|ALL_[A-Z_]+|NOT_OWNED|DUNGEON_LOCKED|MONSTER_LOCKED|BATTLE_IN_PROGRESS|COLLECTION_INCOMPLETE|MAIL_NOT_FOUND|UNKNOWN_EQUIPMENT|REQUEST_ID_REUSED|REQUEST_ID_REQUIRED)$/.test(message);
  return respond({error:business||/^(SESSION_|LOGIN_REQUIRED|SAVE_CONFLICT)/.test(message)?message:'SERVER_RETRY_REQUIRED'},/SESSION_|LOGIN_REQUIRED/.test(message)?401:message==='SAVE_CONFLICT'?409:business?400:503);
 }
});
