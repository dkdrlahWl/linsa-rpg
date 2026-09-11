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
seedInventory();
let listings=[];const recorded=new Map();let loseSaleResponse=true;
const costume=()=>({schemaVersion:1,owned:[],equipped:null,costumeRevision:0,revision,essence:state.essence,purchasesEnabled:false});
const snapshot=()=>({account:user,state:structuredClone(state),revision,economyReady:true,costume:costume()});
const requests=[],errors=[],unexpected=[];
async function remote(request){
 const name=new URL(request.url()).pathname.split('/').at(-1),body=request.postDataJSON()||{};requests.push({name,body});
 switch(name){
  case 'ringu_admin_status':return {currencyFloor:0};
  case 'ringu_account':return body.p_action==='ping'?{ok:true}:snapshot();
  case 'ringu-economy':{
   const parsed=await readEconomyRequest(new Request('http://fixture',{method:'POST',body:request.postData()}));
   if(parsed.error)throw Error(parsed.error);
   const old=recorded.get(body.requestId);let result;
   if(old){assert.deepEqual(old.args,body.args);result=old.result;}
   else{
    result=execute(state,body.command,body.args||{},{now:Date.now(),itemIds:[],random:()=>.5,uuid:randomUUID,adminFloor:0,costumePercent:0,partyBusy:false});
    state=result.state;revision++;recorded.set(body.requestId,{args:body.args,result});
   }
   return {state,revision,result:{events:result.events},requestId:body.requestId};
  }
  case 'ringu_save_preferences':state={...state,...body.p_preferences};revision++;return {revision,state};
  case 'ringu_claim_party':return {revision,state,stoneAward:0};
  case 'ringu_costume':return costume();
  case 'ringu_ranking':return {rows:[]};
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
const out=new URL('../test-output/SG1/',import.meta.url);await mkdir(out,{recursive:true});
let queue=Promise.resolve(),activePage;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await context.addInitScript(({user})=>localStorage.setItem('ringu.supabase.v1.ekgihnyojihpearcudtd.supabase.co',JSON.stringify({access_token:'synthetic-sg1',refresh_token:'synthetic-sg1',expires_at:Date.now()/1000+3600,user:{id:user.id,email:'fixture@test.invalid',user_metadata:{username:user.username}}})),{user});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();
  if(u.hostname!=='ekgihnyojihpearcudtd.supabase.co'){unexpected.push(u.origin);return route.abort();}
  queue=queue.then(async()=>{try{
   const value=await remote(route.request());
   if(loseSaleResponse&&route.request().postDataJSON()?.command==='sell'){loseSaleResponse=false;return route.abort('failed');}
   return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(value)});
  }catch(e){return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:e.message,message:e.message})});}});return queue;
 });
 const page=await context.newPage();activePage=page;page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);
 await page.locator('.rm-bottom-nav [data-target="inventory"]').click();
 const dimensions=[];
 for(const width of [320,360,390,412,768,1440]){
  await page.setViewportSize({width,height:844});
  for(const [gold,label]of [[9999999,'9,999,999'],[10000000,'1000만'],[10009999,'1000만'],[10010000,'1001만'],[32750845,'3275만'],[99999999,'9999만'],[100000000,'1억']]){
   const d=await page.evaluate(({gold})=>{const s=RinguCore.state,original=s.gold;s.gold=gold;RinguCore.fn.renderTop();const el=document.getElementById('gold'),r=el.getBoundingClientRect();const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect();const out={text:el.textContent,title:el.title,width:r.width,textWidth:text.width,x:r.x,right:r.right};s.gold=original;return out;},{gold});
   assert.equal(d.text,label);assert.equal(d.title,gold.toLocaleString('ko-KR')+' 골드');assert.ok(d.textWidth<=d.width+1,JSON.stringify({width,gold,d}));dimensions.push({viewport:width,gold,...d});
  }
 }
 await page.setViewportSize({width:390,height:844});
 for(const rarity of [0,1,2,3,4]){
  if(rarity){seedInventory(rarity);await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.RinguEconomy&&RinguSession.active);await page.locator('.rm-bottom-nav [data-target="inventory"]').click();}
  const before=structuredClone(state);const sale=before.inventory.filter(it=>it.rarity<=rarity&&!it.locked&&!Object.values(before.equipped).includes(it.id));assert.equal(sale.length,1134);
  const gain=sale.reduce((n,it)=>n+balance.sellPrices[it.rarity][it.enhance],0);
  const trigger=page.locator('#inventoryPanel button[onclick="bulkSell('+rarity+')"]');
  await trigger.click();await page.waitForFunction(()=>document.getElementById('rmSellConfirm')?.classList.contains('show'));
  await page.locator('#rmSellCancel').click();assert.deepEqual(state.inventory,before.inventory);assert.equal(state.gold,before.gold);
  await trigger.click();await page.locator('#rmSellAccept').click();
  await page.waitForFunction(()=>RinguSession.active&&RinguCore.state.inventory.length===3);
  assert.equal(state.gold,before.gold+gain);assert.deepEqual(state.inventory,before.inventory.filter(it=>!sale.some(x=>x.id===it.id)));
  assert.ok(await page.locator('#rmSellConfirm').isHidden());
  const recent=requests.filter(r=>r.name==='ringu-economy'&&r.body.command==='sell').at(-1).body;
  assert.equal(recent.args.ids.length,1134);assert.ok(JSON.stringify(recent).length>16000);
 }
 const sales=requests.filter(r=>r.name==='ringu-economy'&&r.body.command==='sell');
 assert.equal(new Set(sales.map(x=>x.body.requestId)).size,5);assert.equal(sales.length,6,'one lost-response retry used original request ID');
 await page.screenshot({path:new URL('inventory-390.png',out).pathname});
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 await writeFile(new URL('report.json',out),JSON.stringify({checks:['five real bulk-sale buttons with 1,137 items','locked and equipped protected','cancel leaves items/gold intact','exact payout once despite lost response','long ID request above previous 16k cap','gold formatting boundaries and text containment at six widths'],dimensions,productionAccountsUsed:false},null,2));
 console.log('PASS SG1 browser: all five bulk-sale buttons with 1,137 items, exact reward and retained protected items, same-receipt retry, and 42 mobile/desktop gold display checks. Synthetic transport only.');
}catch(e){if(activePage)await activePage.screenshot({path:new URL('failure.png',out).pathname}).catch(()=>{});console.log('SG1 ERRORS',errors,unexpected);throw e;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
