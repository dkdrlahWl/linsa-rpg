import {chromium} from 'playwright';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {room} from './raid-stability.test.mjs';
import {advanceRaidRaw} from '../rebirth/raid-model.mjs';
const root=new URL('../',import.meta.url),base='https://dkdrlahwl.github.io/linsa-rpg/rebirth/';
const patches=['index.html','raid-presentation.mjs','raid-model.mjs','coop-model.mjs','tower-renderer.mjs','coop-client.mjs','coop-prediction.mjs','coop-prediction-core.mjs','coop-prediction-worker.mjs','priest-raid.css'];
const {readdir}=await import('node:fs/promises');
patches.push(...(await readdir(new URL('../rebirth/worker-sim/',import.meta.url))).map(n=>'worker-sim/'+n));
const bodies=new Map(await Promise.all(patches.map(async p=>[p,await readFile(new URL('rebirth/'+p,root),'utf8')])));
const browser=await chromium.launch({headless:true,executablePath:process.env.ARENA_BROWSER||'/workspace/scratch/c0f90d53e1ad/arena-browser-runtime/chrome-headless-shell-linux64/chrome-headless-shell',...(process.env.HTTPS_PROXY?{proxy:{server:process.env.HTTPS_PROXY}}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,ignoreHTTPSErrors:true});
 if(!process.env.RAID_LIVE)await context.route(base+'**',async route=>{
  const p=decodeURIComponent(new URL(route.request().url()).pathname.slice('/linsa-rpg/rebirth/'.length))||'index.html';
  if(bodies.has(p))await route.fulfill({status:200,contentType:p.endsWith('.css')?'text/css':p.endsWith('.html')?'text/html':'text/javascript',body:bodies.get(p)});else await route.continue();
 });
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'?raid-test=160',{waitUntil:'networkidle',timeout:60000});
 const fixture=room();advanceRaidRaw(fixture,null,null,17500);fixture.me='player-0';fixture.revision=1;
 await page.evaluate(async fixture=>{
  const {CoopController,coopArena}=await import('./coop-client.mjs');
  const {advanceCoop}=await import('./coop-model.mjs');
  const {prepareCombatArt,image,asset}=await import('./tower-renderer.mjs');
  await prepareCombatArt(fixture.members.map(m=>m.classId),'raid-2');
  await image(asset('raid-map-2')).decode();
  fixture.started=performance.now()-fixture.tick*100;
  document.body.classList.add('tower-mode');document.body.innerHTML='<div class="shell">'+coopArena(fixture)+'</div>';
  let server=structuredClone(fixture),calls=0;window.raidStats={draws:0,maxDrawMs:0,drawMs:[],slowDraws:[],calls:0,errors:[],bossReady:false};
  const send=async(command,args)=>{
   await new Promise(resolve=>setTimeout(resolve,[220,450,800,1100][calls++%4]));
   const now=performance.now(),upto=Math.floor((now-server.started)/100);
   for(let i=1;i<8;i++){
    const frames=Array.from({length:Math.min(30,upto)},(_,n)=>({tick:Math.max(0,upto-30)+n,input:[0,0,59]}));
    server=advanceCoop(server,'player-'+i,{frames},now);
   }
   server=advanceCoop(server,'player-0',args.frames?{frames:args.frames}:args.input,now);
   server.me='player-0';server.revision=(server.revision||0)+1;
   const {coopClientView}=await import('./coop-model.mjs');
   const view=coopClientView(server,2);window.raidController.accept(view);window.raidStats.calls++;
   return {coop:view};
  };
  const controller=new CoopController(document.querySelector('.tower-play'),fixture,send);window.raidController=controller;controller.auto=true;controller.autoSkills=true;
  const draw=controller.renderer.draw.bind(controller.renderer);
  controller.renderer.draw=(...args)=>{const begin=performance.now();try{draw(...args);}catch(e){window.raidStats.errors.push(e.message);throw e;}const ms=performance.now()-begin;window.raidStats.draws++;window.raidStats.drawMs.push(ms);window.raidStats.maxDrawMs=Math.max(ms,window.raidStats.maxDrawMs);if(ms>100)window.raidStats.slowDraws.push({draw:window.raidStats.draws,tick:args[0].tick,ms});};
  window.raidStats.bossReady=image('tower/raid-boss-2-portrait.webp').naturalWidth>0;
 },fixture);
 await page.waitForTimeout(17000);
 await page.screenshot({path:'/workspace/scratch/c0f90d53e1ad/raid-analysis/raid-150-eight-players.png',fullPage:true});
 const result=await page.evaluate(()=>{
  const c=window.raidController,s=window.raidStats,t=s.drawMs.slice(60).sort((a,b)=>a-b);
  return {draws:s.draws,calls:s.calls,bossReady:s.bossReady,worker:c.workerActive,tick:c.room.tick,predictedTick:c.predicted.tick,drawP95:t[Math.floor(t.length*.95)],maxDraw:s.maxDrawMs,slowDraws:s.slowDraws,errors:s.errors,members:c.room.members.length,canvas:[c.canvas.width,c.canvas.height],warning:document.querySelector('#tower-status').textContent};
 });
 assert.deepEqual(errors,[]);assert.deepEqual(result.errors,[]);assert(result.bossReady);assert(result.worker);assert.equal(result.members,8);assert(result.tick>300);assert(result.draws>100);assert(result.calls>5);
 console.log('PASS mobile eight-player raid: variable 220–1100ms responses, worker prediction, full battle rendering, warnings and visible 150 boss.');console.log(JSON.stringify(result));
 await page.evaluate(()=>window.raidController.dispose());
}finally{await browser.close();}
