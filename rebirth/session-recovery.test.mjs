import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('./app.mjs',import.meta.url),'utf8');
const auth=source.slice(source.indexOf('async function request('),source.indexOf('const icon ='));
function setup(response){
 const saved=new Map([['pending','keep-me']]);let requests=0,logins=0;
 const ctx=vm.createContext({Date,JSON,Error,AbortSignal,config:{url:'https://test.invalid',publishableKey:'test'},
 fetch:async()=>{requests++;if(response instanceof Error)throw response;return {ok:response.status===200,status:response.status,headers:{get:()=>null},json:async()=>response.body};},
 localStorage:{getItem:k=>saved.get(k)||null,removeItem:k=>saved.delete(k)},document:{querySelectorAll:()=>[]},
 modal:{open:false},sounds:{pause(){}},$:()=>({textContent:''}),toast(){},message:e=>e.message,
 login:()=>{logins++;},pendingKey:()=> 'pending',persist(){},
 clearAccountView:()=>vm.runInContext('state=null',ctx)});
 vm.runInContext('let session={access_token:"old",refresh_token:"old-refresh",expires_at:1},state={},busy=false,connectionLost=false,retryFailures=0,retryAt=0;'+auth,ctx);
 return {ctx,saved,requests:()=>requests,logins:()=>logins,run:code=>vm.runInContext(code,ctx)};
}
for(const body of [{error_code:'refresh_token_not_found',msg:'Invalid Refresh Token: Refresh Token Not Found'}, {error:'invalid_grant',error_description:'Invalid Refresh Token: Refresh Token Not Found'}, {code:'refresh_token_already_used',message:'Already used'}]){
 const t=setup({status:400,body});await assert.rejects(t.run('command("sync")'),e=>e.status===401&&e.message==='SESSION_ENDED');
 assert.equal(t.run('session'),null);assert.equal(t.run('state'),null);assert.equal(t.logins(),1);assert.equal(t.saved.get('pending'),'keep-me');
}
const ok=setup({status:200,body:{access_token:'new',refresh_token:'new-refresh',expires_in:3600}});
await Promise.all([ok.run('ensureToken()'),ok.run('ensureToken()')]);assert.equal(ok.requests(),1);assert.equal(ok.run('session.refresh_token'),'new-refresh');
for(const response of [new Error('network down'),{status:503,body:{message:'unavailable'}}]){
 const t=setup(response);await assert.rejects(t.run('ensureToken()'));assert.equal(t.run('session.refresh_token'),'old-refresh');assert.equal(t.logins(),0);
}
assert.ok(source.includes('/auth/v1/logout?scope=local'));
console.log('PASS: expired refresh tokens return to login, pending requests preserved, concurrent refresh coalesced, network failures retain session, device-local logout configured.');
