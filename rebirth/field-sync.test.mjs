import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function harness(source){
 const commandSource=source.slice(source.indexOf('async function command('),source.indexOf('async function loadArena('));
 const start=source.lastIndexOf('setInterval(() => {',source.indexOf('function strike('));
 const interval=source.slice(start,source.indexOf('function strike(',start));
 let clock=1000,requests=[];const saved=new Map();
 class TestDate extends Date{static now(){return clock;}}
 const ctx=vm.createContext({Date:TestDate,JSON,Error,Promise,Set,Object,Math,queueMicrotask,
  crypto:{randomUUID:()=>String(requests.length+1)},performance:{now:()=>clock},
  document:{hidden:false,querySelectorAll:()=>[]},navigator:{onLine:true},
  localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)},
  D:{normalizePotentialState:s=>s},sounds:{play(){}},$:()=>null,
  ensureToken:async()=>{},pendingKey:()=> 'pending',render(){},showEvents(){},toast(){},message:e=>e.message,
  coopLobbyVisible:()=>false,updateInvestmentClock(){},loadRankings(){},
  request:async(path,body)=>{requests.push(body.command);if(body.command==='sync')return {state:{level:151,xp:123,hunting:true,lastAt:clock},result:{events:[]}};return {investment:{serverNow:new TestDate(clock).toISOString(),nextAt:new TestDate(clock+1800000).toISOString()},result:{events:[]}};},
  setInterval:fn=>{ctx.poll=fn;}
 });
 vm.runInContext(`let session={},state={level:151,xp:0,hunting:true,lastAt:1000},busy=false,view='game',tab='investment',sub='bag',
  connectionLost=false,retryFailures=0,retryAt=0,lastSync=1000,lastHuntSettlement=1000,
  coopController=null,coopRoom=null,coopRooms=[],partyRoom=null,partyRooms=[],
  pendingDungeonExit=null,dungeonExitActions=new Set(),commandIdleWaiters=[],autoHuntPending=false,
  rankingRevision=0,rankingUpdated=1,rankingLoading=false,rankingAttempt=0,coopListAttempt=0,
  regularAutoSkills=false,regularAutoBattle=null,lastBattleRequestAt=0,combatFrames=[],
  investmentData=null,investmentLoadedAt=0,lottoData=null,lottoLoadedAt=0,arenaData=null,arenaError='',arenaBattle=null,arenaPage='',arenaPlayback=null,eventPage='lotto';
  const modal={open:false};`+commandSource+interval,ctx);
 return {ctx,requests,run:code=>vm.runInContext(code,ctx),setTime:t=>clock=t};
}
async function marketTraffic(source){
 const h=harness(source);
 for(const time of [10000,20000,30000]){h.setTime(time);await h.run("command('investList',{},true)");}
 h.setTime(32000);h.requests.length=0;h.run('poll()');
 await new Promise(resolve=>setImmediate(resolve));
 return h;
}
const after=await marketTraffic(fs.readFileSync(new URL('./app.mjs',import.meta.url),'utf8'));
assert.deepEqual(after.requests,['sync']);assert.equal(after.run('state.xp'),123);
assert.equal(after.run('lastHuntSettlement'),32000);
after.setTime(35000);await after.run("command('investList',{},true)");
assert.equal(after.run('lastHuntSettlement'),32000,'market success must not reset settlement clock');
for(const state of [{hunting:false},{hunting:true,battle:{kind:'tower'}},{hunting:true,coopRoom:'active'},{hunting:true,partyRoom:'active'}]){
 const h=harness(fs.readFileSync(new URL('./app.mjs',import.meta.url),'utf8'));
 h.run('state='+JSON.stringify(state)+";tab='hunt';lastSync=100000;");h.setTime(50000);h.run('poll()');
 assert.deepEqual(h.requests,[],'do not restart intentional stops or interfere with active fights');
}
console.log('PASS: investment refreshes cannot starve field settlement; market responses preserve the settlement clock; intentional stops and active fights remain unchanged.');
