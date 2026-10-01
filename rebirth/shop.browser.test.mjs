import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,execute,makeItem} from './engine.mjs';
const server=spawn('python',['-m','http.server','8770'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{for(const [width,height] of [[360,800],[412,915],[1280,900]]){
 const ctx={now:Date.now(),random:()=>.5,uuid:randomUUID};let state=initialState('warrior','상점테스트',ctx);state.hunting=false;state.gold=12345;state.equipped={};
 const weapon=makeItem(90,'warrior',0,true,ctx),armor=makeItem(90,'mage',1,true,ctx),locked={...makeItem(100,'archer',2,true,ctx),locked:true},normal=makeItem(90,'warrior',0,false,ctx);state.items=[weapon,armor,locked,normal];
 const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'qa-only',refresh_token:'qa-refresh-only',user:{id:'local-qa'},expires_at:Date.now()/1000+3600})));
 await page.route('https://*.supabase.co/**',async route=>{const req=route.request();if(req.url().includes('ringu-rebirth')){const b=req.postDataJSON(),r=execute(state,b.command,b.args,{...ctx,now:Date.now()});state=r.state;return route.fulfill({json:{state,revision:1,result:{events:r.events}}});}return route.fulfill({status:401,json:{error:'QA_NO_REAL_NETWORK'}});});
 await page.goto('http://127.0.0.1:8770/rebirth/');await page.locator('.fantasy-dock').waitFor();const buttons=page.locator('.fantasy-dock>button');assert.equal(await buttons.count(),6);assert.equal(await buttons.last().getAttribute('data-arg'),'shop');await buttons.last().click();
 await page.locator('.shop-merchant').waitFor();assert.equal(await page.locator('.shop-gear-card').count(),3);assert.equal(await page.locator('.shop-gear-card button:disabled').count(),1);assert.ok(await page.locator('.shop-merchant').innerText().then(t=>t.includes('좋은 보스장비 있어?')));await page.locator('.shop-npc').evaluate(img=>img.decode());assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:`/tmp/shop-${width}.png`,fullPage:true});
 await page.locator(`[data-action="shopSellPick"][data-arg="${weapon.id}"]`).click();await page.locator('[data-action="shopSellConfirm"]').waitFor();assert.ok(await page.locator('.shop-confirm-price').innerText().then(t=>t.includes('900,000')));await page.locator('[data-action="shopSellConfirm"]').click();await page.waitForFunction(id=>!document.querySelector(`[data-action="shopSellPick"][data-arg="${id}"]`),weapon.id);assert.equal(state.gold,912345);assert.equal(state.items.length,3);
 await page.locator(`[data-action="shopSellPick"][data-arg="${armor.id}"]`).click();assert.ok(await page.locator('.shop-confirm-price').innerText().then(t=>t.includes('450,000')));await page.locator('[data-action="shopSellConfirm"]').click();await page.waitForFunction(id=>!document.querySelector(`[data-action="shopSellPick"][data-arg="${id}"]`),armor.id);assert.equal(state.gold,1362345);assert.equal(state.items.length,2);assert.deepEqual(errors,[]);await page.close();console.log(`PASS shop ${width}: sixth nav, image, boss-only, protection, confirmation, sale payout, no overflow`);
}}finally{await browser.close();server.kill();}
