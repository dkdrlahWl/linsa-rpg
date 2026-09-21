import {chromium} from 'playwright';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,makeItem,execute} from './engine.mjs';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const seed=()=>{const s=initialState('rogue','모험가',{now:Date.now(),uuid:randomUUID});s.level=80;s.points=50;s.gold=1250000;s.stats.LUK=345;s.materials={fragment:140,scroll:4,cube:30,highCube:5,expand:6};s.cleared=[0,1,2,3,4,5,6,7,8];s.stage=9;s.items=Array.from({length:9},(_,slot)=>({...makeItem(60,'rogue',slot,true,{uuid:randomUUID}),stars:8,lines:[{key:'LUK',value:3}],grade:1}));s.equipped=Object.fromEntries(s.items.map(i=>[i.slot,i.id]));return s;};
try{for(const width of [360,412,1280]){
let state=seed();const page=await browser.newPage({viewport:{width,height:width===1280?900:850}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'qa-local-only',user:{id:'local-qa'},expires_at:Date.now()/1000+3600})));
await page.route('https://*.supabase.co/**',async route=>{const req=route.request();if(req.url().includes('ringu-rebirth')){const body=req.postDataJSON();const result=execute(state,body.command,body.args,{now:Date.now(),random:()=>.5,uuid:randomUUID});state=result.state;return route.fulfill({json:{state,revision:1,result:{events:result.events}}});}if(req.url().includes('rebirth_market'))return route.fulfill({json:[]});return route.fulfill({status:401,json:{error:'NO_REAL_NETWORK_IN_QA'}});});
await page.goto('http://127.0.0.1:8765/rebirth/');await page.getByRole('heading',{name:'붉은 절벽'}).waitFor();
for(const [tab,title] of [['character','캐릭터'],['gear','장비'],['boss','보스'],['market','거래소'],['hunt','붉은 절벽']]){await page.locator(`.bottom [data-arg="${tab}"]`).click();await page.waitForTimeout(100);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width} ${tab}`);}
await page.screenshot({path:`rebirth/qa-mobile-${width}.png`,fullPage:true});
await page.locator('[data-action="regions"]').click();await page.getByRole('heading',{name:'사냥터 선택'}).waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
await page.locator('.bottom [data-arg="gear"]').click();await page.locator('[data-action="item"]').first().click();await page.locator('dialog').waitFor({state:'visible'});await page.locator('dialog [data-action="star"]').click();await page.getByRole('heading',{name:'스타포스',exact:true}).waitFor();assert.equal(errors.length,0,errors.join('\n'));
await page.close();console.log(`PASS browser ${width}: tabs, regions, gear modal, upgrade, no overflow, no JS errors (mock backend).`);
}}finally{await browser.close();}
