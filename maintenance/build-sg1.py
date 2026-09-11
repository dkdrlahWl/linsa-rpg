from pathlib import Path
import hashlib
p=Path('.')
expected={'index.html':'15a999a7f8697d926ff31d807232fe97e53f5c00','economy-client.js':'7e9a96be05032a6426cc4ca82f1fdc4009d261f4','remodel.css':'8b34a3bece77e2eee8ff4e2d3a330102b399b9c2','supabase/functions/_shared/economy.mjs':'9f46904d810c51232b655b9af5d05f0c2cc1a4a5','supabase/functions/ringu-economy/index.ts':'04dc237b4f1c391107693ba2107a083000aaf56d'}
for n,h in expected.items():
 b=(p/n).read_bytes();assert hashlib.sha1(b'blob '+str(len(b)).encode()+b'\0'+b).hexdigest()==h,n
def patch(n,old,new):
 f=p/n;s=f.read_text();assert s.count(old)==1,(n,old);f.write_text(s.replace(old,new,1))
patch('supabase/functions/ringu-economy/index.ts',"import {execute,initialState} from '../_shared/tower-hp-restored.mjs';","import {execute,initialState} from '../_shared/tower-hp-restored.mjs';\nimport {readEconomyRequest} from '../_shared/request-body.mjs';")
patch('supabase/functions/ringu-economy/index.ts',"  const text=await request.text();if(text.length>16000)return respond({error:'REQUEST_TOO_LARGE'},413);let body;try{body=JSON.parse(text);}catch{return respond({error:'INVALID_ARGUMENTS'},400);}\n  if(!body||typeof body!=='object'||Array.isArray(body))return respond({error:'INVALID_ARGUMENTS'},400);","  const parsed=await readEconomyRequest(request);if(parsed.error)return respond({error:parsed.error},parsed.status);\n  const body=parsed.body;")
patch('supabase/functions/_shared/economy.mjs',"  const items=args.ids.map(gear);for(const it of items)if(it.locked||equipped(s,it))fail('ITEM_LOCKED_OR_EQUIPPED');","  // SG1: one linear inventory scan instead of a scan for every sale ID.\n  const owned=new Map(s.inventory.map(it=>[it.id,it]));\n  const items=args.ids.map(id=>{int(id,1);const it=owned.get(id);if(!it)fail('ITEM_NOT_OWNED');return it;});\n  for(const it of items)if(it.locked||equipped(s,it))fail('ITEM_LOCKED_OR_EQUIPPED');")
patch('economy-client.js',"  const messages={", "  const messages={REQUEST_TOO_LARGE:'판매 요청이 너무 큽니다. 게임을 새로고침한 뒤 다시 시도해 주세요.',")
patch('index.html',"if(n<100000000)return n.toLocaleString('ko-KR');", "if(n<10000000)return n.toLocaleString('ko-KR');if(n<100000000)return Math.floor(n/10000)+'만';")
patch('index.html',"$('gold').textContent=fmtGold(state.gold);", "$('gold').textContent=fmtGold(state.gold);$('gold').title=fmt(state.gold)+' 골드';$('gold').setAttribute('aria-label',fmt(state.gold)+' 골드');")
patch('index.html','economy-client.js?v=tower-restored-S3','economy-client.js?v=bulk-sale-SG1')
patch('index.html','remodel.css?v=menu-boss-2','remodel.css?v=gold-SG1')
(p/'remodel.css').write_text((p/'remodel.css').read_text()+'''\n/* SG1: reserve enough mobile header width for Korean gold amounts. */
@media(max-width:1099px){body[data-remodel] #rmCurrencyStats{grid-template-columns:minmax(0,1.4fr) repeat(5,minmax(0,1fr))}}
body[data-remodel] #gold{display:block;max-width:100%;font-variant-numeric:tabular-nums}
''')
# Extend actual SQL transaction regressions without connecting to production.
anchor=" await db.exec('update ringu_private.auction_release set economy_ready=false');"
extra=''' // SG1: exact large-sale debit and item tombstones with receipt replay.
 const saleSeed=structuredClone((await snapshot()).state);saleSeed.autoBattle=false;
 saleSeed.inventory=Array.from({length:1137},(_,i)=>({...balance.gear[0],id:Number.MAX_SAFE_INTEGER-i,auctionUid:randomUUID(),enhance:i%16,transcend:0,optionRolls:[1,1],locked:i===0}));
 saleSeed.equipped={'무기':saleSeed.inventory[1].id};await apply(saleSeed);
 const saleSnap=await snapshot(),ids=saleSnap.state.inventory.slice(2).map(it=>it.id),saleNonce=randomUUID();
 const gain=saleSnap.state.inventory.slice(2).reduce((n,it)=>n+balance.sellPrices[it.rarity][it.enhance],0);
 const saleResult=execute(saleSnap.state,'sell',{ids},{...saleSnap,random:()=>.5,uuid:randomUUID});
 const sellCommit=()=>db.query('select public.ringu_economy_commit($1,$2,$3,$4,$5,$6,$7)',[u,sid,saleSnap.revision,saleNonce,JSON.stringify({command:'sell',args:{ids}}),JSON.stringify(saleResult.state),JSON.stringify({events:saleResult.events})]);
 await sellCommit();await sellCommit();const paid=(await snapshot()).state;
 assert.equal(paid.gold,saleSnap.state.gold+gain);assert.deepEqual(paid.inventory,saleSnap.state.inventory.slice(0,2));
 assert.equal((await db.query('select count(*)::int n from ringu_private.auction_items where id=any($1::bigint[]) and owner_id is null',[ids])).rows[0].n,1135);
 console.log('PASS SG1 actual SQL: 1,137-item inventory, 1,135-item atomic sale, protected equipment retained, exact credit once and every sold item tombstoned.');
'''
f=p/'test/economy-db.test.mjs';s=f.read_text();assert s.count(anchor)==1;f.write_text(s.replace(anchor,extra+anchor,1))
# Reuse the fully intercepted real-page fixture for five bulk buttons and mobile gold.
s=(p/'test/auction-mobile-ui.test.mjs').read_text();s=s[:s.index("try{\n const context=await browser.newContext")]
start=s.index('state.inventory=Array.from');end=s.index('const costume=',start)
s=s[:start]+'''function seedInventory(rarity=0){
 state.inventory=Array.from({length:1137},(_,i)=>({...gear(rarity),id:Number.MAX_SAFE_INTEGER-i,enhance:i%16,transcend:0,optionRolls:[1,1],locked:i===0}));
 state.equipped={'무기':state.inventory[1].id};
 state.inventory[1136]={...gear(5),id:12345,enhance:0,transcend:0,optionRolls:[1,1]};
 state.gold=32750845;state.serverClock=Date.now();revision++;
}
seedInventory();
let listings=[];const recorded=new Map();let loseSaleResponse=true;
''' + s[end:]
s=s.replace("import {execute,initialState,balance}","import {readEconomyRequest} from '../supabase/functions/_shared/request-body.mjs';\nimport {execute,initialState,balance}",1)
start=s.index("  case 'ringu-economy':{");end=s.index("  case 'ringu_save_preferences'",start)
s=s[:start]+'''  case 'ringu-economy':{
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
''' + s[end:]
s=s.replace("../test-output/auction-AU2/", "../test-output/SG1/")
s+='''try{
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
'''
(p/'test/bulk-sale-gold-browser.test.mjs').write_text(s)
