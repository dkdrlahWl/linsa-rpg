import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.ARENA_BROWSER,...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
try{
 const page=await browser.newPage({viewport:{width:390,height:844},ignoreHTTPSErrors:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('https://dkdrlahwl.github.io/linsa-rpg/rebirth/?arena-deploy=153',{waitUntil:'networkidle'});
 const result=await page.evaluate(async()=>{
  const {tier,gearSpec,arenaPointDelta}=await import('./arena-model.mjs?v=arena-balance-153');
  const {arenaView}=await import('./arena-ui.mjs?v=arena-balance-153');
  const {ARENA_BALANCE_VERSION}=await import('./arena-balance.mjs?v=arena-balance-153');
  const data={score:2400,rank:150,seasonEndsAt:new Date(Date.now()+86400000).toISOString(),nextRefreshAt:new Date(Date.now()+1800000).toISOString(),offers:[{id:'player:fixture',name:'마스터유저',classId:'priest',score:2400,rank:151,combatPower:50000,level:200,used:false}],top100:[],history:[]};
  const html=arenaView({data,page:'opponents'});return {version:ARENA_BALANCE_VERSION,masterWin:arenaPointDelta(2400,true),masterLoss:arenaPointDelta(2400,false),opponentTier:tier(data.offers[0].score,data.offers[0].rank).label,tierInView:html.includes('마스터'),wrongSilver:html.includes('실버'),level200:gearSpec(3600).level,newScript:document.querySelector('script[type=module]')?.src.includes('arena-balance-153')};
 });
 assert.deepEqual(errors,[]);assert(result.newScript);assert.equal(result.version,'arena-balance-153');assert.equal(result.masterWin,25);assert.equal(result.masterLoss,-25);assert.equal(result.opponentTier,'마스터 II');assert(result.tierInView&&!result.wrongSilver);assert.equal(result.level200,200);
 console.log('PASS live browser imports, deployed app version, real Master tier markup, scoring rules, 200 gear and no page errors.');
 console.log(JSON.stringify(result));
}finally{await browser.close();}
