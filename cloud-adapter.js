/* Static GitHub Pages transport. Load BEFORE safety.js / auth-client.mjs.
 * Only the publishable key is shipped. No service-role key or DB password.
 */
(() => {'use strict';
 const config=window.RinguCloudConfig;if(!config)return;
 const nativeFetch=window.fetch.bind(window),key='ringu.supabase.v1.'+new URL(config.url).hostname;
 const nativeSet=Storage.prototype.setItem,nativeRemove=Storage.prototype.removeItem;
 let session=null,refreshing=null;
 try{session=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 const persist=s=>{session=s;if(s)nativeSet.call(localStorage,key,JSON.stringify(s));else nativeRemove.call(localStorage,key);};
 const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
 const error=(message,status=400)=>Object.assign(new Error(message),{status});
 async function remote(path,body,{auth=true,signal,method='POST'}={}){
   if(auth)await token(signal);
   const r=await nativeFetch(config.url+path,{method,signal,cache:'no-store',headers:{apikey:config.publishableKey,...(auth?{Authorization:'Bearer '+session.access_token}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});
   const data=await r.json().catch(()=>({}));
   if(!r.ok){const message=data.message||data.msg||data.error_description||data.error||'서버 요청 실패';
     const status=/SESSION_|LOGIN_REQUIRED/.test(message)?401:/SAVE_CONFLICT/.test(message)?409:r.status;
     throw error(message,status);
   }return data;
 }
 async function token(signal){
   if(!session?.access_token)throw error('로그인이 필요합니다.',401);
   if((session.expires_at||0)*1000>Date.now()+60000)return;
   if(!refreshing)refreshing=remote('/auth/v1/token?grant_type=refresh_token',{refresh_token:session.refresh_token},{auth:false,signal}).then(s=>persist({...s,expires_at:s.expires_at||Date.now()/1000+s.expires_in})).catch(e=>{if(e.status===400||e.status===401)persist(null);throw e;}).finally(()=>refreshing=null);
   await refreshing;
 }
 const rpc=(name,args,signal)=>remote('/rest/v1/rpc/'+name,args,{signal});
 function cacheCostume(value){
   const owner=session?.user?.id,cloud=window.RinguCloud;
   if(cloud.costumeOwner!==owner){cloud.costumeOwner=owner;cloud.costume=null;}
   if(value&&(!cloud.costume||value.costumeRevision>=cloud.costume.costumeRevision))cloud.costume=value;
 }
 async function account(data,initialize=true){
   window.RinguCloud.economy=!!data.economyReady;
   if(data.economyReady&&initialize&&!window.RinguCore?.state){
     const synced=await remote('/functions/v1/ringu-economy',{command:'sync',args:{},requestId:crypto.randomUUID()});
     data={...data,state:synced.state,revision:synced.revision};
     window.RinguCloud.initialEconomyEvents=synced.result?.events||[];
     if(data.costume)data.costume={...data.costume,essence:synced.state.essence,revision:synced.revision};
   }
   cacheCostume(data.costume);
   // Optional migration: ordinary accounts remain usable before it is installed.
   let floor=0;
   try{floor=Number((await rpc('ringu_admin_status',{})).currencyFloor)||0;}catch(e){if(e.status!==404)throw e;}
   window.RinguCloud.currencyFloor=Math.max(0,floor);
   return {...data,account:{id:session.user.id,username:session.user.user_metadata?.username||session.user.email?.split('@')[0]||'모험가'}};
 }
 async function login(body,register,signal){
   const username=String(body.username||'').trim().toLowerCase();
   if(!/^[a-z0-9_]{3,32}$/.test(username)||typeof body.password!=='string'||body.password.length<8||body.password.length>256)throw error('계정 이름과 비밀번호 조건을 확인해 주세요.');
   if(register){const settings=await remote('/auth/v1/settings',undefined,{auth:false,method:'GET',signal});
     if(!settings.mailer_autoconfirm)throw error('서버 준비 중입니다. 관리자가 Confirm email 설정을 꺼야 가입할 수 있습니다.',503);
   }
   const data=await remote(register?'/auth/v1/signup':'/auth/v1/token?grant_type=password',
     {email:username+'@players.ringu.example',password:body.password,...(register?{data:{username}}:{})},{auth:false,signal});
   if(!data.access_token)throw error('가입 설정을 확인해 주세요. 아직 로그인되지 않았습니다.',503);
   persist({...data,expires_at:data.expires_at||Date.now()/1000+data.expires_in});
   const activated=await rpc('ringu_account',{p_action:'activate'},signal);
   return account(activated,false);
 }
 window.RinguCloud={enabled:true,base:config.base,transport:'supabase'};
 window.fetch=async function(input,init={}){
   const url=new URL(typeof input==='string'||input instanceof URL?input:input.url,location.href);
   if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return nativeFetch(input,init);
   try{
     const path=url.pathname,body=init.body?JSON.parse(init.body):{},signal=init.signal;
     if(path==='/api/register'||path==='/api/login')return response(await login(body,path==='/api/register',signal),path==='/api/register'?201:200);
     if(path==='/api/session')return response(await account(await rpc('ringu_account',{p_action:'load'},signal)));
     if(path==='/api/watch'){await rpc('ringu_account',{p_action:'ping'},signal);await new Promise(r=>setTimeout(r,1500));return response({ok:true});}
     if(path==='/api/logout'){
       try{await remote('/auth/v1/logout?scope=local',undefined,{signal});}finally{persist(null);window.RinguCloud.currencyFloor=0;}return response({ok:true});
     }
     if(path==='/api/state'){
       if(window.RinguCloud.economy){
         const preferences=Object.fromEntries(['playerName','playerGender','sfxOn','bgmOn','useProtect','sfxVolume','bgmVolume'].filter(k=>body.state?.[k]!==undefined).map(k=>[k,body.state[k]]));
         const saved=await rpc('ringu_save_preferences',{p_preferences:preferences},signal);
         const claimed=await rpc('ringu_claim_party',{p_revision:saved.revision},signal);
         return response({state:claimed.state,revision:claimed.revision});
       }
       const saved=window.RinguCloud.costume
         ?await rpc('ringu_save_costume',{p_state:body.state,p_revision:body.revision,p_costume_revision:window.RinguCloud.costume.costumeRevision},signal)
         :await rpc('ringu_account',{p_action:'save',p_state:body.state,p_revision:body.revision},signal);
       // The existing save queue can merge a server-awarded stone delta without
       // replacing a newer local snapshot. A lost response causes CAS recovery.
       const claimed=await rpc('ringu_claim_party',{p_revision:saved.revision},signal);
       return response({revision:claimed.revision,stoneAward:claimed.stoneAward});
     }
     if(path==='/api/economy')return response(await remote('/functions/v1/ringu-economy',body,{signal}));
     if(path==='/api/auction')return response(await rpc('ringu_auction',{p_action:body.action||'status',p_args:body.args||{},p_request_id:body.requestId||null},signal));
     if(path==='/api/costume'){
       const result=await rpc('ringu_costume',{p_action:body.action||'status',p_id:body.id??null,p_request_id:body.requestId??null,p_revision:body.revision??null},signal);
       cacheCostume(result);return response(result);
     }
     if(path==='/api/ranking'||path.startsWith('/api/characters/')){
       const list=await rpc('ringu_ranking',{},signal);
       if(path==='/api/ranking')return response(list);
       const p=list.rows.find(p=>p.id===decodeURIComponent(path.slice('/api/characters/'.length)));
       return p?response(p):response({error:'플레이어를 찾을 수 없습니다.'},404);
     }
     if(path.startsWith('/api/stone/')){
       const action=path.slice('/api/stone/'.length);
       return response(await rpc('ringu_party',{p_action:action==='rooms'?'list':action,p_id:body.id||null,p_stage:body.stage??null},signal));
     }
     return response({error:'지원하지 않는 요청입니다.'},404);
   }catch(e){if(e.name==='AbortError'||e instanceof TypeError)throw e;return response({error:e.message},e.status||400);}
 };
})();
