// AU2 presentation acceptance: actual page, assets, transport, and item calculations.
// All remote requests are intercepted; synthetic accounts only. No production writes.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {execute,initialState,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const phase=process.env.QA_PHASE||'after',beforeDir=process.env.QA_BEFORE_DIR;
const user={id:randomUUID(),username:'auction_ui_fixture'};
let state=initialState(Date.now()),revision=1,activeCount=3;
Object.assign(state,{autoBattle:false,gold:10000,essence:1000,playerName:'독립 UI 테스트',playerUid:'AU2QA'});
const gear=(rarity,slot='무기')=>balance.gear.find(x=>x.rarity===rarity&&x.slot===slot);
state.inventory=Array.from({length:47},(_,i)=>({...gear(i%7,balance.slots[i%balance.slots.length]),id:i+1,enhance:i%16,transcend:i%16===15&&i%7>=4?i%3:0,optionRolls:[.8+(i%4)*.1,1.12],locked:false}));
// Explicit enhancement-priority and transcend-inclusive attack ties.
state.inventory.push({...gear(0),id:101,enhance:15,transcend:0,optionRolls:[1,1]}, {...gear(5),id:102,enhance:14,transcend:0,optionRolls:[1,1]}, {...gear(4),id:103,enhance:15,transcend:3,optionRolls:[.876,1.12]}, {...gear(4),id:104,enhance:15,transcend:0,optionRolls:[1,1]});
state.inventory[0].locked=true;state.inventory[1].bound=true;state.inventory[2].tradable=false;state.inventory[3].tradeable=false;state.inventory[4].soulbound=true;state.inventory[5].boundTo='fixture';state.equipped={[state.inventory[6].slot]:state.inventory[6].id};
let listings=state.inventory.slice(7,32).map((item,i)=>({id:randomUUID(),item:structuredClone(item),price:i+1,seller_name:i===0?'판매자 <img src=x onerror="window.__auctionInjected=1">':'테스트 판매자 '+i,created_at:'2026-09-11T00:00:00Z',mine:false}));
listings[1].item.name+='<script>window.__auctionInjected=1</script>';
const costume=()=>({schemaVersion:1,owned:[],equipped:null,costumeRevision:0,revision,essence:state.essence,purchasesEnabled:false});
const snapshot=()=>({account:user,state:structuredClone(state),revision,economyReady:true,costume:costume()});
const requests=[],errors=[],unexpected=[];
async function remote(request){
 const name=new URL(request.url()).pathname.split('/').at(-1),body=request.postDataJSON()||{};requests.push({name,body});
 switch(name){
  case 'ringu_admin_status':return {currencyFloor:0};
  case 'ringu_account':return body.p_action==='ping'?{ok:true}:snapshot();
  case 'ringu-economy':{
   const result=execute(state,body.command,body.args||{},{now:Date.now(),itemIds:Array.from({length:10},(_,i)=>1000+i),random:()=>.5,uuid:randomUUID,adminFloor:0,costumePercent:0,partyBusy:false});
   state=result.state;revision++;return {state,revision,result:{events:result.events},requestId:body.requestId};
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
const out=new URL('../test-output/auction-AU2/',import.meta.url);await mkdir(out,{recursive:true});
let queue=Promise.resolve(),activePage;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await context.addInitScript(({user})=>localStorage.setItem('ringu.supabase.v1.ekgihnyojihpearcudtd.supabase.co',JSON.stringify({access_token:'synthetic-au2-token',refresh_token:'synthetic-au2-token',expires_at:Date.now()/1000+3600,user:{id:user.id,email:user.username+'@test.invalid',user_metadata:{username:user.username}}})),{user});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='127.0.0.1')return route.continue();
  if(u.hostname==='ekgihnyojihpearcudtd.supabase.co'){
   queue=queue.then(async()=>{try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(await remote(route.request()))});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:e.message,message:e.message})});}});return queue;
  }
  unexpected.push(u.origin);return route.abort();
 });
 const page=await context.newPage();activePage=page;page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.RinguEconomy&&window.RinguSession?.active&&document.querySelector('#ringuAuction'));
 await page.evaluate(()=>RinguArt.ready);
 await page.locator('.rm-bottom-nav [data-target="menu"]').click();
 await page.getByRole('button',{name:'⚖️ 경매장',exact:true}).click();
 await page.waitForFunction(()=>document.querySelectorAll('#auctionRows [data-row]').length===20);
 if(phase==='before'){
  await page.locator('#ringuAuction .modal').evaluate(el=>el.scrollTop=300);
  await page.screenshot({path:new URL('before-390.png',out).pathname});
  console.log('BEFORE frame',await page.locator('#ringuAuction .modal').evaluate(el=>({frame:getComputedStyle(el,'::after').content,scrollHeight:el.scrollHeight,clientHeight:el.clientHeight})));
 }else{
  assert.equal(await page.evaluate(()=>window.__auctionInjected),undefined);
  assert.equal(await page.locator('#auctionRows script,#auctionRows img[src="x"]').count(),0);
  const cards=await page.locator('#auctionRows .auction-card').evaluateAll(els=>els.map(el=>({name:el.querySelector('.auction-item-name').textContent,color:getComputedStyle(el.querySelector('.auction-item-name')).color,enhance:el.querySelector('.auction-enhance').textContent,attack:el.querySelector('.auction-attack').textContent,transcend:el.querySelector('.auction-transcend').textContent,options:el.querySelector('.auction-options').innerHTML})));
  const expected=await page.evaluate(items=>items.map(it=>({name:it.name,color:RinguCore.rarityColors[it.rarity],enhance:it.enhance,attack:RinguCore.fn.itemAtk(it),transcend:it.transcend,options:RinguCore.fn.optionText(it)})),listings.slice(0,20).map(x=>x.item));
  for(let i=0;i<cards.length;i++){
   const c=cards[i],e=expected[i];assert.equal(c.name,e.name);assert.equal(c.enhance,'강화 +'+e.enhance);assert.equal(c.attack,'공격력 '+e.attack.toLocaleString('ko-KR'));assert.equal(c.transcend,'초월 '+e.transcend+'단계');assert.equal(c.options,e.options);
   const rgb=e.color.replace('#','').match(/../g).map(x=>parseInt(x,16));assert.equal(c.color,'rgb('+rgb.join(', ')+')');
  }
  const dimensions=[];
  for(const [width,height] of [[390,844],[320,640],[360,640],[412,915],[540,720],[768,800],[1440,1000],[844,390],[390,390]]){
   await page.setViewportSize({width,height});
   await page.locator('.auction-scroll').evaluate(el=>el.scrollTop=0);
   const measure=()=>page.locator('#ringuAuction').evaluate(el=>{
    const shell=el.querySelector('.auction-modal'),sc=el.querySelector('.auction-scroll'),close=el.querySelector('#auctionClose'),head=el.querySelector('.auction-header');
    const box=x=>{const b=x.getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom,right:b.right};};
    return {shell:box(shell),scroll:box(sc),header:box(head),headerClient:head.clientHeight,headerScroll:head.scrollHeight,close:box(close),frame:getComputedStyle(shell,'::after').content,overflows:[...el.querySelectorAll('.auction-card')].filter(c=>c.scrollWidth>c.clientWidth+1||c.scrollHeight>c.clientHeight+1).length,scrollWidth:sc.scrollWidth,clientWidth:sc.clientWidth};
   });
   const initial=await measure();assert.ok(initial.shell.x>=0&&initial.shell.right<=width+1&&initial.shell.y>=0&&initial.shell.bottom<=height+1,JSON.stringify({width,height,initial}));assert.equal(initial.frame,'none');if(height>=640)assert.ok(initial.headerScroll<=initial.headerClient+1,'all header tabs must remain visible');assert.equal(initial.overflows,0);assert.ok(initial.scrollWidth<=initial.clientWidth+1);assert.ok(initial.scroll.height>60);
   await page.locator('.auction-scroll').evaluate(el=>el.scrollTop=el.scrollHeight);
   const end=await measure();assert.equal(end.header.y,initial.header.y);assert.equal(end.close.y,initial.close.y);
   await page.locator('#auctionBody [data-auction-page="1"]').isVisible().then(assert.ok);
   dimensions.push({width,height,...end});
   if(width===390&&height===844||width===1440){await page.locator('.auction-scroll').evaluate(el=>el.scrollTop=125);await page.screenshot({path:new URL('after-'+width+'.png',out).pathname});}
  }
  await page.setViewportSize({width:390,height:844});
  await page.locator('#ringuAuction [data-tab="list"]').click();await page.waitForFunction(()=>document.querySelector('.auction-sort-note'));
  const order=await page.evaluate(()=>{
   const g=RinguCore;const available=g.state.inventory.filter(it=>!it.locked&&!g.fn.isItemEquipped(it)&&it.tradable!==false&&it.tradeable!==false&&!it.bound&&!it.soulbound&&!it.boundTo).sort((a,b)=>(b.enhance||0)-(a.enhance||0)||g.fn.itemAtk(b)-g.fn.itemAtk(a));
   return {saved:JSON.stringify(g.state.inventory),names:available.map(it=>it.name),ids:available.map(it=>it.id),stats:available.map(it=>'강화 +'+it.enhance+'공격력 '+g.fn.itemAtk(it).toLocaleString('ko-KR')+'초월 '+it.transcend+'단계')};
  });
  assert.ok(order.ids.indexOf(101)<order.ids.indexOf(102),'enhancement beats rarity/base attack');assert.ok(order.ids.indexOf(103)<order.ids.indexOf(104),'transcend-inclusive actual attack breaks tie');
  assert.deepEqual(await page.locator('#auctionBody .auction-item-name').allTextContents(),order.names.slice(0,20));
  assert.deepEqual(await page.locator('#auctionBody .auction-item-stats').allTextContents(),order.stats.slice(0,20));
  await page.locator('#auctionBody [data-auction-page="1"]').click();await page.waitForFunction(()=>document.querySelector('.auction-pages span')?.textContent.startsWith('2 /'));
  assert.deepEqual(await page.locator('#auctionBody .auction-item-name').allTextContents(),order.names.slice(20,40));
  assert.deepEqual(await page.locator('#auctionBody .auction-item-stats').allTextContents(),order.stats.slice(20,40));
  assert.equal(await page.evaluate(()=>JSON.stringify(RinguCore.state.inventory)),order.saved,'selling sort does not reorder saved inventory');
  const chosen=await page.locator('#auctionBody [data-row="0"] .auction-item-name').textContent();await page.locator('#auctionBody [data-row="0"]').click();
  assert.equal(await page.locator('#auctionDetail .auction-item-name').textContent(),chosen);assert.ok(await page.locator('#auctionPrice').isVisible());
  await page.locator('#ringuAuction [data-tab="mine"]').click();await page.waitForFunction(()=>document.querySelectorAll('#auctionRows .auction-card').length===20);
  assert.ok(await page.locator('#auctionDetail').isHidden(),'tabs restore list when detail was open');
  await page.locator('#ringuAuction [data-tab="history"]').click();await page.waitForFunction(()=>document.querySelectorAll('#auctionRows .auction-card').length===20);assert.equal(await page.locator('#auctionRows .auction-attack').count(),20);
  activeCount=8;await page.locator('#ringuAuction [data-tab="list"]').click();await page.waitForFunction(()=>document.querySelector('#auctionListingCount')?.textContent.includes('8 / 8'));
  assert.equal(await page.locator('#auctionBody [data-row]').count(),0,'capacity still blocks registration UI');
  await page.locator('#auctionClose').click();assert.ok(await page.locator('#ringuAuction').isHidden());
  listings[0].seller_name='테스트 판매자';listings[1].item.name=state.inventory[8].name;activeCount=3;await page.getByRole('button',{name:'⚖️ 경매장',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('#auctionRows .auction-card').length===20);
  await page.locator('.auction-scroll').evaluate(el=>el.scrollTop=130);
  await page.screenshot({path:new URL('after-390.png',out).pathname});
  assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
  await writeFile(new URL('report.json',out),JSON.stringify({phase,checks:['all listing stats match core','all rarity colors','escaped listing text','mobile/tablet/desktop/short viewport containment','no overlay frame','fixed header and close during scroll','enhancement then final attack sort before pagination','saved inventory unchanged','selection/detail/tab transitions','eight-listing cap preserved'],dimensions,errors,productionDataUsed:false},null,2));
  console.log('PASS AU2: listing metadata and rarity colors, 9 viewports, scrolling without frame overlay, global enhancement/attack order, pagination, immutable inventory, detail navigation and preserved eight-item cap. All remote requests mocked.');
 }
}catch(e){if(activePage){console.log('AU2_DIAGNOSTIC',errors,unexpected,await activePage.locator('body').innerText().then(s=>s.slice(-1800)).catch(()=>''));await activePage.screenshot({path:new URL('failure-'+phase+'.png',out).pathname}).catch(()=>{});}throw e;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
