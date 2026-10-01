import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
const server=spawn('python',['-m','http.server','8765'],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,500));
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
const executablePath=process.env.CHROMIUM_PATH;
const browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const [width,height] of [[360,800],[412,736],[412,850],[412,915],[1280,900]]){
 let state=initialState('rogue','모험가',{now:Date.now(),uuid:randomUUID});state.gold=125000;
 const lotto={drawAt:'2026-10-03T12:00:00Z',sales:168000,carryIn:0,minPrize:1344000,maxPrize:1848000,todayCount:0,tickets:[],history:[]};
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('PAGEERROR',e.message);});page.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text());});
 await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'qa-only',refresh_token:'qa-refresh-only',user:{id:'local-qa'},expires_at:Date.now()/1000+3600})));
 await page.route('https://*.supabase.co/**',async route=>{const req=route.request();if(req.url().includes('ringu-rebirth')){const b=req.postDataJSON();if(b.command.startsWith('lotto')){const events=[];if(b.command==='lottoBuy'){state.gold-=1000;lotto.todayCount++;lotto.sales+=1000;lotto.tickets.push({id:randomUUID(),numbers:b.args.numbers,boughtAt:new Date().toISOString()});events.push({type:'lottoBuy',numbers:b.args.numbers,cost:1000});}return route.fulfill({json:{state,revision:1,lotto,result:{events}}});}const r=execute(state,b.command,b.args,{now:Date.now(),random:()=>.5,uuid:randomUUID});state=r.state;return route.fulfill({json:{state,revision:1,result:{events:r.events}}});}return route.fulfill({status:401,json:{error:'QA_NO_REAL_NETWORK'}});});
 await page.goto('http://127.0.0.1:8765/rebirth/');await page.locator('.fantasy-dock').waitFor();await page.locator('.fantasy-dock [data-arg="event"]').click();await page.locator('.lotto-prize strong').filter({hasText:'1,344,000'}).waitFor();assert.equal(await page.locator('.fantasy-dock [data-arg="shop"]').count(),1);
 assert.equal(await page.locator('.lotto-numbers button').count(),18);
 await page.locator('[data-action="lottoNumber"][data-arg="5"]').click();await page.locator('[data-action="lottoNumber"][data-arg="12"]').click();
 assert.equal(await page.locator('.lotto-numbers .selected').count(),2);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:`/tmp/lotto-${width}-${height}.png`});
 await page.locator('.lotto-buy').scrollIntoViewIfNeeded();const bounds=await page.evaluate(()=>{const r=document.querySelector('.lotto-buy').getBoundingClientRect(),dock=document.querySelector('.fantasy-dock').getBoundingClientRect();return {bottom:r.bottom,dockTop:dock.top,overflow:document.querySelector('.lotto-scroll').scrollHeight-document.querySelector('.lotto-scroll').clientHeight};});assert.ok(bounds.bottom<=bounds.dockTop+1,`purchase obscured ${width}x${height}`);console.log(width,height,bounds);
 await page.locator('.lotto-buy').click();assert.equal(state.gold,124000);await page.getByRole('button',{name:'내 복권',exact:true}).click();await page.locator('.lotto-ticket').waitFor();assert.equal(await page.locator('.lotto-ticket').count(),1);
 await page.locator('[data-action="eventPage"][data-arg="pet"]').click();await page.locator('.pet-scene').waitFor();assert.equal(await page.locator('.fantasy-dock [data-arg="shop"]').count(),1);await page.locator('[data-action="eventPage"][data-arg="lotto"]').click();await page.locator('.lotto-scene').waitFor();
 assert.equal(errors.length,0,errors.join('\n'));await page.close();console.log(`PASS lottery browser ${width}x${height}: selection, buy, ticket history, event switch, no overflow or JS errors.`);
}}finally{await browser.close();server.kill();}
