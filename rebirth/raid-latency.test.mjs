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
 assert.equal(coopInputInterval(room),640);
 assert.ok(room.members.length*1000/coopInputInterval(room)<17);
 assert.equal(coopInputInterval({...room,entryWaiting:true}),250);
 assert.equal(coopInputInterval({...room,members:room.members.slice(0,4)}),320);
 assert.equal(coopInputInterval({...room,mode:'wave',members:room.members.slice(0,4)}),320);
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

test('large combat responses compress without changing state or exposing history',async()=>{
 const room={tick:12,mode:'wave',members:[],monsters:Array.from({length:80},(_,id)=>({id,x:1234,y:1500,hp:50000,maxHp:50000})),_net:{private:'history'},_queuedInputs:[{private:'input'}]};
 globalThis.fetch=async url=>respond(url.endsWith('/rebirth_coop_frame_snapshot')?snapshot({coop:room,now:1000}):{coop:room,now:1000});
 // No current member means advance is unnecessary for this transport-only fixture.
 room.status='won';
 const req=request({frames:[],compact:true,protocol:2});req.headers.set('accept-encoding','gzip, deflate');
 const response=await handler(req);
 assert.equal(response.status,200);assert.equal(response.headers.get('content-encoding'),'gzip');
 const bytes=await response.arrayBuffer();
 const body=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).json();
 assert.equal(body.coop.monsters.length,80);assert.equal(body.coop._net,undefined);assert.equal(body.coop._queuedInputs,undefined);
 assert.ok(bytes.byteLength<JSON.stringify(body).length*.4);
});

test('a blocked world write returns the newest snapshot and preserves queued input',async()=>{
 for(const message of ['canceling statement due to lock timeout','deadlock detected']){
  const power={attack:1,hp:10000,defense:20,boss:1,crit:0,critDamage:1,cadence:1};
  const room=startCoop({id:'room',me:'a',owner:'a',revision:1,mode:'raid',tier:0,status:'waiting',members:[{id:'a',classId:'warrior',power}]},0);
  const latest={...room,revision:2};let calls=0;
  globalThis.fetch=async url=>{calls++;if(url.endsWith('/rebirth_coop_action'))return respond({message},400);return respond(snapshot({coop:calls===1?room:latest,now:1000}));};
  const response=await handler(request({input:[1,0,0],compact:true,protocol:2}));
  assert.equal(response.status,200);assert.equal((await response.json()).coop.revision,2);assert.equal(calls,3);
 }
});
