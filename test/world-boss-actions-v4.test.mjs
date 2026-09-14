import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const root=resolve('.'),errors=[];
const fixture=`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/world-boss.css"><div class="main-quick"></div><script>
window.qa={room:null,version:0,calls:[],active:0,maxActive:0,hold:null,release:null,failAck:false};
window.RinguSession={active:true,flush:async()=>{},onEnded:()=>{}};window.RinguCore={state:{},fn:{attack:()=>{},toast:()=>{}}};
window.RinguCloud={subscribeWorldBoss:(id,cb)=>{qa.notify=cb;return()=>{qa.notify=null}}};
window.fetch=async(url,init)=>{
 const {action,args}=JSON.parse(init.body);qa.calls.push(action);qa.active++;qa.maxActive=Math.max(qa.maxActive,qa.active);
 if(action===qa.hold){qa.hold=null;await new Promise(r=>qa.release=r);qa.release=null;}
 if(action==='ack'&&qa.failAck){qa.failAck=false;qa.active--;return new Response(JSON.stringify({error:'SERVER_ERROR'}),{status:503});}
 if(action==='create')qa.room={id:'qa-room',host:'qa-user',status:'waiting',hp:4200000,maxHp:4200000,startedAt:Date.now(),pattern:1,waves:[],members:[{id:'qa-user',name:'모험가',hp:2000,maxHp:2000,damage:0,x:0,y:6,seq:0,packet:0,ready:true,present:true,gender:'male'}]};
 if(action==='start'){qa.room.status='running';qa.room.startedAt=Date.now();}
 if(action==='ack'||action==='leave')qa.room=null;
 if(qa.room){qa.room.version=++qa.version;if(args.packet)qa.room.members[0].packet=args.packet;}
 const data={room:structuredClone(qa.room),rooms:[],remaining:3,userId:'qa-user',unlockedAt:'2026-09-14',serverNow:Date.now()};qa.active--;return new Response(JSON.stringify(data));
};
</script><script src="/world-boss-model.js"></script><script src="/world-boss.js"></script>`;
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(url.pathname==='/qa'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fixture);return;}const path=resolve(root,'.'+url.pathname);if(!path.startsWith(root+sep))throw Error('path');res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp'})[extname(path)]||'text/plain');res.end(await readFile(path));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});const p=await browser.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errors.push(e.message));
const hold=async action=>{await p.evaluate(action=>qa.hold=action,action);await p.waitForFunction(()=>!!qa.release);};
const release=()=>p.evaluate(()=>qa.release());
const calls=action=>p.evaluate(action=>qa.calls.filter(a=>a===action).length,action);
try{
 await p.goto('http://127.0.0.1:'+server.address().port+'/qa');await p.getByRole('button',{name:'월드보스',exact:true}).click();await p.getByRole('button',{name:'방 만들기',exact:true}).waitFor();
 // A slow automatic lobby refresh must not disable or swallow Create.
 await hold('list');await p.getByRole('button',{name:'방 만들기',exact:true}).click();assert.equal(await p.getByRole('button',{name:'방 만드는 중…',exact:true}).count(),1);assert.equal(await calls('create'),0);await release();await p.getByRole('button',{name:'혼자 시작',exact:true}).waitFor();assert.equal(await calls('create'),1);
 // Keep a pressed button alive if a new waiting-room snapshot arrives.
 const start=p.getByRole('button',{name:'혼자 시작',exact:true});await hold('sync');const box=await start.boundingBox();await p.mouse.move(box.x+box.width/2,box.y+box.height/2);await p.mouse.down();
 await p.evaluate(()=>{qa.room.members[0].name='갱신된 모험가';qa.room.version=++qa.version;qa.notify({room:structuredClone(qa.room)});});await p.mouse.up();assert.equal(await p.getByRole('button',{name:'전투 시작 중…',exact:true}).count(),1);assert.equal(await calls('start'),0);await release();await p.locator('#wb-arena').waitFor({state:'visible'});assert.equal(await calls('start'),1);
 // Result can arrive over realtime while a sync response is pending.
 await hold('sync');await p.evaluate(()=>{qa.room.status='won';qa.room.hp=0;qa.room.endedAt=Date.now();qa.room.version=++qa.version;qa.notify({room:structuredClone(qa.room)});});await p.getByRole('button',{name:'확인',exact:true}).click();assert.equal(await p.getByRole('button',{name:'확인 중…',exact:true}).count(),1);await release();await p.locator('#wb-screen').waitFor({state:'hidden'});assert.equal(await calls('ack'),1);assert.equal(await p.evaluate(()=>qa.maxActive),1,'sync and actions never overlap');
 // An actual failure must stay visible in the result dialog and allow retry.
 await p.getByRole('button',{name:'월드보스',exact:true}).click();await p.getByRole('button',{name:'방 만들기',exact:true}).click();await p.getByRole('button',{name:'혼자 시작',exact:true}).click();await p.locator('#wb-arena').waitFor({state:'visible'});
 await p.evaluate(()=>{qa.failAck=true;qa.room.status='won';qa.room.version=++qa.version;qa.notify({room:structuredClone(qa.room)});});await p.getByRole('button',{name:'확인',exact:true}).click();await p.locator('#wb-action-status').waitFor();assert.match(await p.locator('#wb-action-status').innerText(),/다시 시도/);await p.getByRole('button',{name:'확인',exact:true}).click();await p.locator('#wb-screen').waitFor({state:'hidden'});assert.equal(await calls('ack'),3);
 assert.deepEqual(errors,[]);console.log('PASS WB4: one-click Create/Start/Ack during slow background requests, button survives realtime refresh while pressed, immediate busy labels, serialized requests, visible errors and retry.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
