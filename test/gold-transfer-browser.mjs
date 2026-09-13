import {fileURLToPath} from 'node:url';
// AU2 presentation acceptance: actual page, assets, transport, and item calculations.
// All remote requests are intercepted; synthetic accounts only. No production writes.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {readEconomyRequest} from '../supabase/functions/_shared/request-body.mjs';
import {execute,initialState,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const phase=process.env.QA_PHASE||'after',beforeDir=process.env.QA_BEFORE_DIR;
const user={id:randomUUID(),username:'auction_ui_fixture'};
let state=initialState(Date.now()),revision=1,activeCount=3;
Object.assign(state,{autoBattle:false,gold:10000,essence:1000,playerName:'독립 UI 테스트',playerUid:'AU2QA'});
const gear=(rarity,slot='무기')=>balance.gear.find(x=>x.rarity===rarity&&x.slot===slot);
function seedInventory(rarity=0){
 state.inventory=Array.from({length:1137},(_,i)=>({...gear(rarity),id:Number.MAX_SAFE_INTEGER-i,enhance:i%16,transcend:0,optionRolls:[1,1],locked:i===0}));
 state.equipped={'무기':state.inventory[1].id};
 state.inventory[1136]={...gear(5),id:12345,enhance:0,transcend:0,optionRolls:[1,1]};
 state.gold=32750845;state.serverClock=Date.now();revision++;
}
seedInventory(5);state.sunCube=3;state.inventory[0].transcend=3;state.inventory[0].enhance=15;
let marketPurchases=0;const marketOffers=[['jadeCube',12,5],['sunCube',30,5],['transcendStone',15,10],['downgradeProtect',6,5]].map(([resource,price,limit],slot)=>({slot,kind:'consumable',price,limit,remaining:limit,purchased:false,originalPrice:slot===0?20:slot===1?50:undefined,item:{kind:'consumable',resource,quantity:1,name:resource}}));marketOffers.push({slot:4,kind:'equipment',price:3,limit:1,remaining:1,item:{...gear(0),optionRolls:[.8,.8]}});
let listings=[];const recorded=new Map();let loseSaleResponse=true;
const costume=()=>({schemaVersion:1,owned:[],equipped:null,costumeRevision:0,revision,essence:state.essence,purchasesEnabled:false});
const snapshot=()=>({account:user,state:structuredClone(state),revision,economyReady:true,costume:costume()});
let transferCount=0,transferReceipt=null,loseTransferResponse=true;
const requests=[],errors=[],unexpected=[];
async function remote(request){
 const name=new URL(request.url()).pathname.split('/').at(-1),body=request.postDataJSON()||{};requests.push({name,body});
 switch(name){
  case 'ringu_gold_transfer':{
   if(body.p_action==='status')return {gold:state.gold,rows:[{id:'22222222-2222-4222-8222-222222222222',name:'모험가',power:99999,tower:1,equipment:[]},{id:'11111111-1111-4111-8111-111111111111',name:'모험가',power:12345,tower:2,equipment:[]}]};
   if(transferReceipt){assert.equal(body.p_request_id,transferReceipt);return {ok:true,replayed:true};}
   assert.equal(body.p_amount,123);assert.equal(body.p_recipient,'11111111-1111-4111-8111-111111111111');state.gold-=body.p_amount;revision++;transferCount++;transferReceipt=body.p_request_id;return {ok:true,amount:123};
  }
  case 'ringu_admin_status':return {currencyFloor:0};
  case 'ringu_black_market':{
   if(body.p_action==='buy'){const offer=marketOffers[body.p_slot],q=body.p_quantity||1;assert.ok(q<=offer.remaining);offer.remaining-=q;offer.purchased=offer.remaining===0;state.essence-=offer.price*q;state[offer.item.resource]=(state[offer.item.resource]||0)+q;marketPurchases++;return {ok:true};}
   return {ready:true,version:'BM5',rotation:'fixture/00',serverNow:Date.now(),startsAt:Date.now()-10000,expiresAt:Date.now()+600000,rates:[29.1,15,4.9,1,15,15,10,10],items:marketOffers,essence:state.essence,revision};
  }

  case 'ringu_account':return body.p_action==='ping'?{ok:true}:snapshot();
  case 'ringu-economy':{
   const parsed=await readEconomyRequest(new Request('http://fixture',{method:'POST',body:request.postData()}));
   if(parsed.error)throw Error(parsed.error);
   const old=recorded.get(body.requestId);let result;
   if(old){assert.deepEqual(old.args,body.args);result=old.result;}
   else{
    result=execute(state,body.command,body.args||{},{now:Date.now(),itemIds:Array.from({length:50},(_,i)=>900000+i),random:()=>.999,uuid:randomUUID,adminFloor:0,costumePercent:0,partyBusy:false});
    state=result.state;revision++;recorded.set(body.requestId,{args:body.args,result});
   }
   return {state,revision,result:{events:result.events},requestId:body.requestId};
  }
  case 'ringu_save_preferences':state={...state,...body.p_preferences};revision++;return {revision,state};
  case 'ringu_claim_party':return {revision,state,stoneAward:0};
  case 'ringu_costume':return costume();
  case 'ringu_ranking':return {rows:[{id:'22222222-2222-4222-8222-222222222222',name:'모험가',power:99999,tower:1,equipment:[]},{id:'11111111-1111-4111-8111-111111111111',name:'모험가',power:12345,tower:2,equipment:[]}]};
  case 'ringu_party':return {room:null,rooms:[],remaining:2,pending:0};
  case 'ringu_auction':{
   const action=body.p_action,args=body.p_args||{};
   if(action==='status')return {ready:true,essence:state.essence,revision,listingLimit:8,activeListingCount:activeCount};
   if(['search','mine','history'].includes(action))return {rows:listings.slice((args.page||0)*20,((args.page||0)+1)*20),total:listings.length};
   throw Error('Unexpected auction write: '+action);
  }
  default:unexpected.push(name);throw Error('Unexpected mocked endpoint: '+name);
 }
}
const root=new URL('../',import.meta.url);
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(req.url.split('?')[0]);assert.ok(path.startsWith('/linsa-rpg/')&&!path.includes('..'));
  const file=path.slice('/linsa-rpg/'.length)||'index.html';
  const url=phase==='before'&&beforeDir&&['index.html','auction.js','auction.css'].includes(file)?new URL('file://'+beforeDir+'/'+file):new URL(file,root);
  const data=await readFile(url);
  const mime=file.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});res.end(data);
 }catch(e){res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port+'/linsa-rpg/';
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_EXECUTABLE?{executablePath:process.env.QA_CHROMIUM_EXECUTABLE}:{})});
const out=new URL('../test-output/BM5/',import.meta.url);await mkdir(out,{recursive:true});
let queue=Promise.resolve(),activePage;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await context.addInitScript(({user})=>localStorage.setItem('ringu.supabase.v1.ekgihnyojihpearcudtd.supabase.co',JSON.stringify({access_token:'synthetic-sg1',refresh_token:'synthetic-sg1',expires_at:Date.now()/1000+3600,user:{id:user.id,email:'fixture@test.invalid',user_metadata:{username:user.username}}})),{user});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();
  if(u.hostname!=='ekgihnyojihpearcudtd.supabase.co'){unexpected.push(u.origin);return route.abort();}
  queue=queue.then(async()=>{try{
   const value=await remote(route.request());
   if(loseTransferResponse&&route.request().url().endsWith('/ringu_gold_transfer')&&route.request().postDataJSON()?.p_action==='send'){loseTransferResponse=false;return route.abort('failed');}
   if(loseSaleResponse&&route.request().postDataJSON()?.command==='sell'){loseSaleResponse=false;return route.abort('failed');}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  }catch(e){return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:e.message,message:e.message})});}});return queue;
 });
 const page=await context.newPage();activePage=page;page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);
 await page.locator('.rm-bottom-nav [data-target="inventory"]').click();
 await page.waitForFunction(()=>window.RinguCubes);
 let fontCss='';
 if(process.env.QA_FONT_URL){
  const fontRoot=new URL(process.env.QA_FONT_URL);
  fontCss=await readFile(new URL('400.css',fontRoot),'utf8');
  for(const url of [...fontCss.matchAll(/url\(([^)]+)\)/g)]){const rel=url[1].replaceAll("'",'').replaceAll('"','');const bytes=await readFile(new URL(rel,fontRoot));fontCss=fontCss.replace(url[0],'url(data:font/woff2;base64,'+bytes.toString('base64')+')');}
  await page.addStyleTag({content:fontCss+'*{font-family:"Noto Sans KR",sans-serif!important}'});await page.evaluate(()=>document.fonts.ready);
 }
 assert.ok(await page.locator('#inventoryList .option-tier-badge').count()>0);
 assert.match(await page.locator('#cubeBagSummary').innerText(),/태양 큐브/);
 await page.evaluate(()=>openItemInventory());assert.equal(await page.locator('.cube-bag-card').count(),2);await page.evaluate(()=>closeItemInventory());
 const rewardCheck=await page.evaluate(()=>RinguCore.towerFloors.map(f=>({floor:f.floor,gold:f.gold,stone:f.stone})));for(const floor of rewardCheck){const original=balance.towerFloors[floor.floor-1];assert.equal(floor.gold,original.gold*(floor.floor>=6?2:1));assert.equal(floor.stone,original.stone*(floor.floor>=6?2:1));}
 const dimensions=[];
 for(const width of [320,360,390,412,768,1440]){
  await page.setViewportSize({width,height:844});
  const bad=await page.evaluate(()=>[...document.querySelectorAll('#inventoryList .transcend-stars,.inventory-tools .sell-bulk')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>e.outerHTML));assert.deepEqual(bad,[],String(width));
  await page.screenshot({path:fileURLToPath(new URL('inventory-'+width+'.png',out))});
  await page.evaluate(()=>RinguCore.fn.openEnhance(RinguCore.state.inventory[0].id));
  await page.locator('#cubeTab').click();
  const d=await page.locator('#enhanceModal .modal').evaluate(e=>({w:e.clientWidth,scroll:e.scrollWidth}));assert.ok(d.scroll<=d.w+2,JSON.stringify({width,d}));
  await page.screenshot({path:fileURLToPath(new URL('cube-'+width+'.png',out))});
  await page.evaluate(()=>RinguCore.fn.closeEnhance());
 }
 await page.setViewportSize({width:390,height:844});
 await page.evaluate(()=>RinguCore.fn.openEnhance(RinguCore.state.inventory[0].id));await page.locator('#cubeTab').click();
 const beforeCount=state.sunCube;
 await page.locator('#cubeRoll').click();
 await page.evaluate(()=>document.getElementById('cubeRoll').click());
 await page.waitForFunction(()=>document.querySelector('#cubeReveal.revealed'));
 assert.equal(state.sunCube,beforeCount-1);assert.match(await page.locator('#cubeReveal').innerText(),/→/);
 assert.equal(requests.filter(r=>r.body.command==='cubeRoll').length,1);
 const value=state.inventory[0].optionRolls[0];
 await page.screenshot({path:fileURLToPath(new URL('result.png',out))});
 await page.reload();await page.waitForFunction(()=>window.RinguCubes&&RinguSession.active);
 assert.equal(state.inventory[0].optionRolls[0],value);
 if(fontCss){await page.addStyleTag({content:fontCss+'*{font-family:"Noto Sans KR",sans-serif!important}'});await page.evaluate(()=>document.fonts.ready);}
 await page.evaluate(()=>{openAuraShop();switchShop('item')});
 await page.waitForSelector('[data-cube-shop="jade"]');
 await page.screenshot({path:fileURLToPath(new URL('shop.png',out))});
 assert.equal(await page.locator('[data-cube-shop]').count(),2);
 const prevEssence=state.essence,prevJade=state.jadeCube;
 await page.locator('[data-cube-shop="jade"] button').click();await page.locator('#shopPurchaseAccept').click();await page.waitForFunction(()=>!document.getElementById('shopPurchaseConfirm').open);assert.equal(state.essence,prevEssence-20);assert.equal(state.jadeCube,prevJade+1);


 await page.evaluate(()=>closeAuraShop());await page.evaluate(()=>RinguBlackMarket.open());await page.waitForSelector('[data-bm-slot="0"]');
 for(const width of [320,390,768]){await page.setViewportSize({width,height:844});const size=await page.locator('#blackMarketModal').evaluate(e=>({width:e.clientWidth,scroll:e.scrollWidth}));assert.ok(size.scroll<=size.width+1);assert.equal(await page.locator('.bm-offer').count(),5);await page.screenshot({path:fileURLToPath(new URL('personal-market-'+width+'.png',out))});}
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-bm-quantity="0"]').selectOption('5');await page.locator('[data-bm-slot="0"]').click();assert.match(await page.locator('#shopPurchaseName').innerText(),/5개/);assert.match(await page.locator('#shopPurchasePrice').innerText(),/60/);
 const jadeBefore=state.jadeCube;await page.locator('#shopPurchaseAccept').click();await page.waitForFunction(()=>document.querySelector('[data-bm-slot="0"]').disabled);assert.equal(state.jadeCube,jadeBefore+5);assert.equal(marketPurchases,1);
 await page.locator('#blackMarketClose').click();
 listings=[{id:'fixture-listing',item:state.inventory[0],price:100,status:'active'}];await page.evaluate(()=>document.getElementById('auctionMenuButton').click());await page.waitForSelector('.auction-options .option-tier-badge');
 await page.locator('#auctionClose').click();
 await page.locator('.rm-bottom-nav [data-target="summon"]').click();
 const summonBefore={gold:state.gold,count:state.inventory.length,exp:state.summons.weapon.exp};
 const summonCost=await page.evaluate(()=>RinguCore.fn.summonUnitCost()*50);
 await page.locator('#draw50').click();
 await page.waitForFunction(()=>document.querySelector('#rmFirstReveal.show')||document.querySelector('#drawResultModal.show'));
 if(await page.locator('#rmFirstReveal.show').count())await page.locator('.rm-reveal-skip').click();
 await page.waitForSelector('#drawResultModal.show #drawResultGrid[data-ringu-result-count="50"]');
 assert.equal(state.inventory.length,summonBefore.count+50);assert.equal(state.gold,summonBefore.gold-summonCost);assert.equal(state.summons.weapon.exp,summonBefore.exp+50);
 for(const width of [320,390,600,768]){
  await page.setViewportSize({width,height:740});
  const layout=await page.locator('#drawResultGrid').evaluate(e=>({count:e.children.length,width:e.clientWidth,scroll:e.scrollWidth,height:e.clientHeight,total:e.scrollHeight,columns:getComputedStyle(e).gridTemplateColumns.split(' ').length}));
  assert.equal(layout.count,50);assert.equal(layout.columns,3);assert.ok(layout.scroll<=layout.width+1);assert.ok(layout.total>layout.height);
  await page.locator('#drawResultGrid').evaluate(e=>e.scrollTop=0);
  await page.locator('#drawResultGrid').evaluate(async e=>{await Promise.all(e.getAnimations({subtree:true}).map(a=>a.finished.catch(()=>{})));});
  await page.screenshot({path:fileURLToPath(new URL('summon50-'+width+'.png',out))});
  await page.locator('#drawResultGrid').evaluate(e=>e.scrollTop=e.scrollHeight);
  assert.ok(await page.locator('#drawResultGrid>.rm-drop-card').last().isVisible());
 }
 console.log('PASS 50 summons: exact cost, 50 items/EXP, three readable columns, scrollable results at 320/390/600/768px');
 await page.evaluate(()=>closeDrawResult());
 await page.waitForSelector('#goldTransferButton');
 await page.locator('#goldTransferButton').click();await page.waitForSelector('#rankList .rk-row');assert.equal(await page.locator('#rankList .rk-name').filter({hasText:'모험가'}).count(),2);await page.locator('#rankList .rk-row').nth(1).click();await page.waitForSelector('#goldTransferModal[open]');
 for(const width of [320,390,600,1440]){await page.setViewportSize({width,height:740});const bad=await page.locator('#goldTransferModal').evaluate(e=>e.scrollWidth>e.clientWidth+1);assert.equal(bad,false);}
 await page.setViewportSize({width:320,height:740});

 for(const value of ['0','-1','1.5','99999999999999']){await page.locator('#gtAmount').fill(value);assert.ok(await page.locator('#gtConfirm').isDisabled());}
 await page.locator('#gtAmount').fill('123');await page.locator('#gtConfirm').click();assert.match(await page.locator('#gtReview').innerText(),/모험가 · 2위 · 공격력 12,345 · ID 11111111 계정에 123 G/);
 await page.screenshot({path:fileURLToPath(new URL('gold-transfer-confirm-320.png',out))});
 const transferGold=state.gold;await page.locator('#gtConfirm').click();await page.evaluate(()=>document.getElementById('gtConfirm').click());
 await page.waitForFunction(()=>document.getElementById('gtStatus').textContent.includes('송금 완료'));
 assert.equal(transferCount,1);assert.equal(state.gold,transferGold-123);
 const sends=requests.filter(r=>r.name==='ringu_gold_transfer'&&r.body.p_action==='send');assert.equal(sends.length,2);assert.equal(sends[0].body.p_request_id,sends[1].body.p_request_id);
 await page.locator('#gtClose').click();assert.ok(await page.locator('#goldTransferButton').evaluate(e=>e===document.activeElement));
 console.log('PASS transfer UI: top button, ranked recipient, validation, confirmation, mobile fit, duplicate click and lost-response retry');
 assert.deepEqual(errors,[]);console.log('PASS BM5/CQ3 browser: cube counters, colored option tiers, tower reward display, mobile personal market, 5-cube purchase total, stock exhausted, auction badge');
}catch(e){if(activePage)await activePage.screenshot({path:fileURLToPath(new URL('failure.png',out))}).catch(()=>{});console.log('CQ1 ERRORS',errors,unexpected);throw e;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}






