import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
const server=spawn('python',['-m','http.server','8772'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const [width,height] of [[360,800],[412,915],[1280,900]]){
 const ctx={now:Date.now(),random:()=>.5,uuid:randomUUID};let state=initialState('warrior','물약테스트',ctx);state.hunting=false;state.gold=15000000;
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'qa-only',refresh_token:'qa-only',user:{id:'local-qa'},expires_at:Date.now()/1000+3600})));
 await page.route('https://*.supabase.co/**',async route=>{const req=route.request();if(req.url().includes('ringu-rebirth')){const b=req.postDataJSON();try{const r=execute(state,b.command,b.args,{...ctx,now:Date.now()});state=r.state;return route.fulfill({json:{state,revision:1,result:{events:r.events}}});}catch(e){return route.fulfill({status:400,json:{error:e.message}});}}return route.fulfill({status:401,json:{error:'QA_NO_REAL_NETWORK'}});});
 await page.goto('http://127.0.0.1:8772/rebirth/');await page.locator('.fantasy-dock').waitFor();
 await page.locator('.fantasy-dock [data-arg="shop"]').click();await page.locator('[data-action="shopCategory"][data-arg="consumable"]').click();
 assert.ok((await page.locator('.consumable-card').innerText()).includes('일일보스, 주간보스, 레이드 보상 적용됨'));
 await page.locator('.consumable-art').evaluate(img=>img.decode());
 for(let n=0;n<2;n++){await page.locator('main [data-action="consumableBuyPick"]').click();await page.locator('[data-action="consumableBuyConfirm"]').click();await page.waitForFunction(n=>document.querySelector('main .consumable-panel>header>span')?.textContent.includes(n+'개 보유'),n+1);}
 assert.equal(state.gold,5000000);assert.equal(state.consumables.luckPotion,2);
 await page.locator('.fantasy-dock [data-arg="gear"]').click();
 assert.deepEqual((await page.locator('main .subnav button').allTextContents()).slice(0,2),['가방','소모품']);
 assert.equal(await page.locator('[data-action="gearSub"][data-arg="collection"]').count(),0);
 await page.locator('[data-action="gearSub"][data-arg="consumables"]').click();await page.locator('[data-action="consumableUse"]').click();
 await page.locator('.luck-buff-status:not([hidden])').waitFor();assert.equal(state.consumables.luckPotion,1);
 assert.ok(await page.locator('[data-action="consumableUse"]').isDisabled());
 assert.ok((await page.locator('.luck-buff-status').innerText()).includes('행운 +50%'));
 const first=await page.locator('.consumable-card [data-luck-duration]').innerText();
 await page.waitForFunction(v=>document.querySelector('.consumable-card [data-luck-duration]')?.textContent!==v,first);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:`/workspace/scratch/117d204d7b38/luck-potion-${width}.png`,fullPage:true});
 await page.reload();await page.locator('.luck-buff-status:not([hidden])').waitFor();assert.equal(state.consumables.luckPotion,1);
 assert.deepEqual(errors,[]);await page.close();console.log(`PASS potion UI ${width}: generated image, shop buy, bag tab order, use, cooldown, ticking HUD, reconnect, no overflow`);
}}finally{await browser.close();server.kill();}
