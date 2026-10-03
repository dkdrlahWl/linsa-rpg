import assert from 'node:assert/strict';
import {test} from 'node:test';
import {coopInputInterval} from './coop-client.mjs';
import {startCoop} from './coop-model.mjs';

let handler;
globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://test.invalid',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'private-test'})[key]},serve:fn=>{handler=fn;}};
await import('./edge.ts');
const request=args=>new Request('https://test.invalid/functions/v1/ringu-rebirth',{method:'POST',headers:{authorization:'Bearer player-token','content-type':'application/json'},body:JSON.stringify({command:'coopInput',requestId:crypto.randomUUID(),args})});
const snapshot=current=>({snapshot:{user:'a',session:'session',hasCharacter:true,revision:1,epoch:'epoch',now:1000},current});
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status});

test('raid polling bounds combined room traffic without slowing small parties',()=>{
 const room={mode:'raid',status:'fighting',members:Array.from({length:8},()=>({}))};
 assert.equal(coopInputInterval(room),480);
 assert.ok(room.members.length*1000/coopInputInterval(room)<17);
 assert.equal(coopInputInterval({...room,entryWaiting:true}),250);
 assert.equal(coopInputInterval({...room,members:room.members.slice(0,4)}),250);
 assert.equal(coopInputInterval({...room,mode:'rift'}),250);
});

test('combat input uses the session-validated RPC without a duplicate Auth request',async()=>{
 const calls=[];globalThis.fetch=async(url,options)=>{calls.push({url,options});return respond(snapshot({coop:null}));};
 const response=await handler(request({frames:[],compact:true,protocol:2}));
 assert.equal(response.status,200);assert.equal(calls.length,1);
 assert.ok(calls[0].url.endsWith('/rebirth_coop_frame_snapshot'));
 assert.equal(calls[0].options.headers.Authorization,'Bearer player-token');
 assert.equal(calls[0].options.headers.apikey,'public-test');
});

test('expired tokens and revoked sessions cannot reach a privileged combat write',async()=>{
 for(const [status,message] of [[401,'JWT expired'],[400,'SESSION_ENDED']]){
  let calls=0;globalThis.fetch=async()=>{calls++;return respond({message},status);};
  const response=await handler(request({frames:[]}));
  assert.equal(response.status,401);assert.equal(calls,1);
 }
});

test('concurrent entry input returns the newest room instead of three conflicting replays',async()=>{
 const power={attack:1,hp:10000,defense:20,boss:1,crit:0,critDamage:1,cadence:1};
 const room=startCoop({id:'room',me:'a',owner:'a',revision:1,mode:'raid',tier:0,status:'waiting',members:[{id:'a',classId:'warrior',power}]},0);
 const latest={...room,revision:2};let calls=0;
 globalThis.fetch=async url=>{calls++;if(url.endsWith('/rebirth_coop_action'))return respond({message:'SAVE_CONFLICT'},400);return respond(snapshot({coop:calls===1?room:latest,now:1000}));};
 const response=await handler(request({input:[1,0,0],compact:true,protocol:2}));
 assert.equal(response.status,200);assert.equal((await response.json()).coop.revision,2);assert.equal(calls,3);
});
