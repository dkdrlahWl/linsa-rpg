// Isolated local UI smoke test for the 2026-10-11 update. No live credentials or player writes.
// Fishing instant catch, cube-free loot list, boss menu (citadel inside, rift removed), fragment exchange text.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {initialState,execute} from './engine.mjs';import {normalizeFishing} from './fishing-model.mjs';import {fishingStateReply} from './fishing-sync.mjs';
const root=path.resolve('.'),out=path.resolve('rebirth/test-artifacts/update-218');fs.mkdirSync(out,{recursive:true});
let rng=42,state,revision=0;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/2**32);
state=initialState('warrior','점검모험가',{now:Date.now(),random,uuid:randomUUID});state.level=200;state.hunting=false;state.gold=50_000_000;state.materials.fragment=5000;const f=normalizeFishing(state,Date.now());f.rod=20;f.diamonds=30;f.bait={worm:50,shrimp:50};
// Settle the seeded level/gold achievements before navigation, so their startup dialog does not cover menu buttons.
state=execute(state,'sync',{}, {now:Date.now(),random,uuid:randomUUID}).state;
const commands=[];
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://local'),p=url.pathname;
 const json=(data,status=200)=>{res.writeHead(status,{'Content-Type':'application/json'});res.end(JSON.stringify(data));};
 if(p==='/favicon.ico'){res.writeHead(204);return res.end();}
 if(p==='/cloud-config.js'){res.setHeader('Content-Type','text/javascript');return res.end('window.RinguCloudConfig='+JSON.stringify({url:'http://127.0.0.1:'+server.address().port,publishableKey:'local-qa',base:'/'}));}
 if(p.startsWith('/rest/v1/'))return json({news:[],unread:0});
 if(p==='/functions/v1/ringu-rebirth'){let data='';for await(const part of req)data+=part;const body=JSON.parse(data);commands.push(body.command);
  try{if(body.command.startsWith('coop'))return json({state,revision,coopRooms:[],result:{events:[]}});if(body.command==='lottoList')return json({lotto:{tickets:[],history:[],todayCount:0,minPrize:0,maxPrize:0,sales:0,carryIn:0,drawAt:new Date(Date.now()+86400000).toISOString()}});
   const before={state,revision};const result=execute(state,body.command,body.args,{now:Date.now(),random,uuid:randomUUID,admin:false});state=result.state;revision++;
   return json(body.command.startsWith('fish')?fishingStateReply(before,{state,revision},{events:result.events},body.args._stateRevision,body.args._compact):{state,revision,result:{events:result.events}});
  }catch(e){return json({error:e.message},400);}}
 if(p.startsWith('/auth/'))return json({id:'local-qa'});
 const file=path.resolve(root,'.'+decodeURIComponent(p)+(p.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep))throw Error('Invalid path');
 let data=fs.readFileSync(file);if(file===path.join(root,'rebirth','index.html'))data=Buffer.from(data.toString().replace('<head>',`<head><script>window.qaErrors=[];addEventListener('error',e=>{if(e.message)qaErrors.push(e.message)});localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'local-qa',refresh_token:'local-qa',user:{id:'local-qa'},expires_at:Date.now()/1000+3600}));</script>`));
 res.setHeader('Content-Type',/\.m?js$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.svg')?'image/svg+xml':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'application/octet-stream');res.end(data);
}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const {chromium}=await import(process.env.PW_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_BIN?{executablePath:process.env.QA_BROWSER_BIN}:{}),args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:900}});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn,timeout=15000){const start=Date.now();while(Date.now()-start<timeout){if(await fn())return;await delay(100);}throw Error('Wait timed out');}
const has=sel=>page.evaluate(s=>!!document.querySelector(s),sel);
try{
 await page.goto('http://127.0.0.1:'+server.address().port+'/rebirth/');
 await wait(()=>has('.fantasy-dock'));
 // Header and menu no longer list the citadel as a top-level entry.
 assert.equal(await page.locator('.fantasy-main-nav [data-arg="citadel"]').count(),0);
 // Boss menu: citadel inside, rift gone.
 await page.locator('.fantasy-dock [data-arg="boss"]').click();await wait(()=>has('.subnav'));
 const subnav=await page.locator('.subnav').innerText();assert.match(subnav,/암흑성채/);assert.doesNotMatch(subnav,/협동 균열/);
 await page.locator('[data-action="bossSub"][data-arg="citadel"]').click();await wait(()=>has('.citadel-lobby'));
 await page.screenshot({path:path.join(out,'boss-citadel.png'),fullPage:true});
 // Fragment exchange text announces the 1% boss roll.
 await page.locator('.fantasy-dock [data-arg="gear"]').click();await delay(400);
 const exch=await page.evaluate(()=>document.querySelector('.gear-exchange')?.innerText||'');if(exch)assert.match(exch,/1% 확률로 같은 레벨의 보스 장비/);
 // Fishing: instant catch with no meter.
 await page.locator('.fantasy-dock [data-arg="event"]').click();await wait(()=>has('.fishing-screen'));
 assert.equal(await page.locator('.fishing-meter').count(),0);
 const loot=await page.locator('.fishing-loot').innerText();assert.doesNotMatch(loot,/큐브|주문서|잠금석/);
 await page.locator('[data-action="fishCast"]').click();
 await wait(()=>state.fishing.lastCatch&&!state.fishing.cast,20000);
 assert.equal(state.fishing.lastCatch.won,true);
 await delay(800);if(await page.locator('#modal[open]').count())await page.keyboard.press('Escape');await page.screenshot({path:path.join(out,'fishing-caught.png')});
 await page.locator('[data-action="fishPanel"][data-arg="shop"]').click();await delay(300);
 assert.equal(await page.locator('.fishing-odds').count(),0,'reward odds table removed');
 const errors=await page.evaluate(()=>window.qaErrors);assert.deepEqual(errors,[]);
 console.log('PASS update-218 UI smoke',{commands:[...new Set(commands)]});
}finally{await browser.close();server.close();}
