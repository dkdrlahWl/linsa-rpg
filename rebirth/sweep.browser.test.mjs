// node rebirth/sweep.browser.test.mjs — 보스 탭 최상단 전체 소탕 · 보스 카드/열쇠 단계 개별 소탕 · 결과 창
import {createRequire} from 'node:module';const {chromium}=createRequire(import.meta.url)('playwright');
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
const server=spawn('python3',['-m','http.server','8773'],{stdio:'ignore',cwd:'..'});
await new Promise(r=>setTimeout(r,800));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const [width,height] of [[360,800],[1280,900]]){
 const ctx={now:Date.now(),random:()=>.999,uuid:randomUUID};let state=initialState('warrior','소탕테스트',ctx);state.hunting=false;state.cleared=[0,1,30,31,33];state.keyBoss={best:3};state=execute(state,'sync',{},ctx).state;
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'qa-only',refresh_token:'qa-only',user:{id:'local-qa'},expires_at:Date.now()/1000+3600})));
 await page.route('https://*.supabase.co/**',async route=>{const req=route.request();if(req.url().includes('ringu-rebirth')){const b=req.postDataJSON();try{const r=execute(state,b.command,b.args,{...ctx,now:Date.now()});state=r.state;return route.fulfill({json:{state,revision:1,result:{events:r.events}}});}catch(e){return route.fulfill({status:400,json:{error:e.message}});}}return route.fulfill({status:401,json:{error:'QA_NO_REAL_NETWORK'}});});
 await page.goto('http://127.0.0.1:8773/rebirth/');await page.locator('.fantasy-dock').waitFor();
 await page.locator('.fantasy-dock [data-arg="boss"]').click();await page.locator('[data-action="bossSub"][data-arg="daily"]').click();
 const bar=page.locator('.sweep-bar');await bar.waitFor();assert.ok((await bar.innerText()).includes('전체 소탕 7건'),await bar.innerText());
 await page.screenshot({path:'/tmp/claude-0/-home-claude/b7264c13-99ba-5fbd-be84-de68875746f6/scratchpad/sweep-bar-'+width+'.png'});
 // 개별: 일보 33 카드 소탕
 await page.locator('[data-action="sweep"][data-arg="boss:33"]').click();await page.locator('.sweep-result').waitFor();
 assert.ok((await page.locator('.sweep-result').innerText()).includes('10,000,000'));
 await page.locator('.modal [data-action="ack"], dialog [data-action="ack"]').first().click();
 await page.waitForFunction(()=>document.querySelector('[data-action="sweep"][data-arg="boss:33"]')?.disabled);
 // 전체
 await page.locator('.sweep-bar [data-action="sweep"]').click();await page.locator('.sweep-result').waitFor();
 const txt=await page.locator('.sweep-result').innerText();assert.ok(txt.includes('던전 열쇠'),txt);
 await page.screenshot({path:'/tmp/claude-0/-home-claude/b7264c13-99ba-5fbd-be84-de68875746f6/scratchpad/sweep-result-'+width+'.png'});
 await page.locator('.modal [data-action="ack"], dialog [data-action="ack"]').first().click();
 assert.ok(await page.locator('.sweep-bar [data-action="sweep"]').isDisabled());
 await page.locator('[data-action="bossSub"][data-arg="key"]').click();assert.equal(await page.locator('[data-action="sweep"][data-arg^="key:"]').count(),3);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no overflow');
 assert.deepEqual(errors,[]);await page.close();console.log('PASS sweep UI '+width);
}}finally{await browser.close();server.kill();}
