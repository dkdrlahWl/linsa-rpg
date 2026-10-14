// End-to-end: the deployed edge entry (edge-dist/edge.ts) serving four players through a fake
// PostgREST that stores the room as JSON with jsonb-style key order. Every compact reply must
// decode to exactly the uncompressed view, old clients (no wire flag) must get the old format,
// and the stored row must use packed history.
// Run: node --experimental-strip-types rebirth/coop-wire-edge.test.mjs
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {startCoop,coopClientView} from './coop-model.mjs';
const sortKeys=v=>v===null||typeof v!=='object'?v:Array.isArray(v)?v.map(sortKeys):Object.fromEntries(Object.keys(v).sort((a,b)=>a.length-b.length||(a<b?-1:a>b?1:0)).map(k=>[k,sortKeys(v[k])]));
const jsonb=v=>sortKeys(JSON.parse(JSON.stringify(v)));
let handler;globalThis.Deno={env:{get:k=>({SUPABASE_URL:'https://db.test',SUPABASE_ANON_KEY:'anon',SUPABASE_SERVICE_ROLE_KEY:'service'})[k]},serve:h=>{handler=h;}};
const power={attack:3e5,hp:4e6,defense:5e4,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200};
const ids=[0,1,2,3].map(()=>randomUUID());
let now=1e12,revision=1,queue=[],rpcBytes=0;
let world=startCoop({id:'room',owner:ids[0],mode:'citadel',tier:0,status:'waiting',members:['warrior','mage','archer','priest'].map((classId,i)=>({id:ids[i],name:'P'+i,classId,advanced:true,power:{...power}}))},now);
world.entryWaiting=false;for(const m of world.members)m.entryMoved=true;world=JSON.stringify(jsonb(world));
const current=me=>({revision:1,coop:{...JSON.parse(world),_queuedInputs:queue.filter(f=>f.user!==me),id:'room',revision,me},now,stateUnchanged:true,result:{events:[]}});
globalThis.fetch=async(url,init)=>{
 const name=String(url).split('/').pop(),body=JSON.parse(init.body);rpcBytes+=init.body.length;
 const user=init.headers.Authorization.slice(7);
 const ok=data=>{const text=JSON.stringify(data);rpcBytes+=text.length;return new Response(text,{status:200});};
 if(name==='rebirth_coop_frame_snapshot'){for(const f of body.p_args.frames||[])queue.push({...f,user});return ok({snapshot:{user,session:'s',revision:1,hasCharacter:true,now,epoch:'e',receipt:null},current:current(user)});}
 if(name==='rebirth_coop_action'){
  const p=body.p;if(p.action==='read')return ok(current(p.user));
  if(p.roomRevision!==revision)return new Response(JSON.stringify({message:'SAVE_CONFLICT'}),{status:400});
  const w=jsonb(p.world);delete w.id;delete w.revision;delete w.me;queue=queue.filter(f=>f.tick>=w.tick-35&&!(w._net?.frames||[]).some(x=>x.user===f.user&&x.tick===f.tick));
  world=JSON.stringify(w);revision++;return ok(current(p.user));
 }
 throw Error('unexpected rpc '+name);
};
await import('./edge-dist/edge.ts');
const clients=await Promise.all(ids.map((_,i)=>import('./coop-wire.mjs?client='+i)));
const call=async(i,args)=>{const res=await handler(new Request('https://edge.test',{method:'POST',headers:{authorization:'Bearer '+ids[i]},body:JSON.stringify({command:'coopInput',requestId:randomUUID(),args})}));const data=await res.json();if(data.error)throw Error(data.error);return data;};
const sent=[0,0,0,0];let compact=0,full=0,cached=0,legacy=0;
for(let step=0;step<240;step++){
 now+=80;const i=step%4,tick=Math.floor((now-1e12)/100)-2;
 const frames=[];for(let t=Math.max(sent[i],tick-20);t<tick;t++)frames.push({tick:t,input:[Math.sin(t/7+i),Math.cos(t/5+i)*.7,t%4?1:122]});sent[i]=Math.max(sent[i],tick);
 const oldClient=step%11===5;
 const args={frames:frames.slice(-35),compact:true,protocol:2,...(oldClient?{}:clients[i].coopWireArgs())};
 const data=await call(i,args);
 const expected=jsonb(coopClientView({...JSON.parse(world),id:'room',revision,me:ids[i]},2));
 if(oldClient){assert.equal(data.coop.wire,undefined);assert.deepEqual(jsonb(data.coop),expected);legacy++;continue;}
 assert.equal(data.coop.wire,2);compact++;if(data.coop.$cached)cached++;else full++;
 assert.deepEqual(jsonb(clients[i].decodeCoopReply(data.coop)),expected,'step '+step);
}
const stored=JSON.parse(world);
assert.ok(stored._net.packed&&!stored._net.points,'history is stored packed');
assert.ok(stored.tick>40,'room advanced '+stored.tick);
assert.ok(cached>compact*0.8,'static cache reused '+cached+'/'+compact);
console.log('PASS edge wire end-to-end',{steps:240,compact,cached,full,legacy,tick:stored.tick,storedBytes:world.length,rpcKBPerRequest:Math.round(rpcBytes/240/1024)});
