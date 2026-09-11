from pathlib import Path
import re

def patch(path,old,new,count=1):
    p=Path(path);s=p.read_text();assert s.count(old)==count,(path,old,s.count(old));p.write_text(s.replace(old,new,count))

# Wire assets before all shop renderers; helper must exist before interaction-time templates run.
p=Path('index.html');s=p.read_text()
css='<link rel="stylesheet" href="/linsa-rpg/remodel.css?v=gold-SG1">';assert s.count(css)==1
s=s.replace(css,css+'\n<link rel="stylesheet" href="/linsa-rpg/hud-ui.css?v=hud-HU1">',1)
match=re.search(r'<script[^>]*src=["\']/linsa-rpg/costume-shop\.js[^"\']*["\'][^>]*></script>',s);assert match
s=s[:match.start()]+'<script defer src="/linsa-rpg/hud-ui.js?v=hud-HU1"></script>\n'+s[match.start():]
p.write_text(s)

# Remove legacy diamond/emoji from static stat placeholders. HU1 injects accessible SVGs.
for old,name in [('🪙','gold'),('💎','essence'),('♜','stone'),('🐾','pet'),('⚔','attack'),('✦','summon')]:
    p=Path('index.html');s=p.read_text();needle=f'<span class="rm-stat-icon">{old}</span>'
    assert s.count(needle)==1,(old,s.count(needle));p.write_text(s.replace(needle,f'<span class="rm-stat-icon" data-hu-icon="{name}"></span>',1))

# Aura and consumable prices: visual format becomes essence icon + number only.
patch('index.html',"${owned?'보유':'💎 '+a.price}","${owned?'보유':RinguHUD.essenceCostHTML(a.price)}")
patch('index.html','<span>💎 10</span>','<span>${RinguHUD.essenceCostHTML(10)}</span>')
patch('index.html','<span>💎 25</span>','<span>${RinguHUD.essenceCostHTML(25)}</span>')
patch('index.html',"$('shopPurchasePrice').textContent='정수 '+fmtMoney(data.price)+'개';","$('shopPurchasePrice').innerHTML=RinguHUD.essenceCostHTML(data.price);")
patch('index.html',"$('shopPurchaseBalance').textContent='보유 정수 '+fmtMoney(essenceNow)+'개 → 구매 후 '+fmtMoney(essenceNow-data.price)+'개';","$('shopPurchaseBalance').innerHTML='보유 '+RinguHUD.essenceCostHTML(essenceNow)+' <span class=\"hu-cost-arrow\">→</span> 구매 후 '+RinguHUD.essenceCostHTML(essenceNow-data.price);")

# Black market: same price language, shared offers/odds untouched.
p=Path('black-market.js');s=p.read_text()
old="$('blackMarketBalance').textContent='보유 정수 '+fmt(snapshot.essence)+'개';";assert s.count(old)==1;s=s.replace(old,"$('blackMarketBalance').innerHTML='보유 '+RinguHUD.essenceCostHTML(snapshot.essence);",1)
old="'<span>💎</span><strong>'+fmt(row.price)+'</strong><small>정수</small></button>'";assert s.count(old)==1;s=s.replace(old,"RinguHUD.essenceCostHTML(row.price)+'</button>'",1)
old="'<small>정수 '+prices[i]+'개</small>'";assert s.count(old)==1;s=s.replace(old,"'<small>'+RinguHUD.essenceCostHTML(prices[i])+'</small>'",1)
p.write_text(s)

# Costume shop: icon badge on balance and buy button; confirmation already has one shared price row.
p=Path('costume-shop.js');s=p.read_text()
old="function topText(costume){ const essence=Math.max(0, Number(g.state.essence)||0); return costume.name+' · '+essence+' 정수 · '+(costume.attackPercent||0)+'% 공격력 보너스'; }"
assert s.count(old)==1
new="function topText(costume){ const essence=Math.max(0, Number(g.state.essence)||0); return esc(costume.name)+' · '+RinguHUD.essenceCostHTML(essence)+' · '+(costume.attackPercent||0)+'% 공격력 보너스'; }"
s=s.replace(old,new,1)
old='balance.textContent=topText(costume);';assert s.count(old)==1;s=s.replace(old,'balance.innerHTML=topText(costume);',1)
old="btn.innerHTML='<span>구매</span><span>'+costume.price+' 정수</span>';";assert s.count(old)==1;s=s.replace(old,"btn.innerHTML='<span>구매</span>'+RinguHUD.essenceCostHTML(costume.price);",1)
old="description:'공격력 +'+costume.attackPercent+'% · '+costume.price+' 정수 · 보유하지 않은 외형을 구매합니다.',";assert s.count(old)==1;s=s.replace(old,"description:'공격력 +'+costume.attackPercent+'% · 보유하지 않은 외형을 구매합니다.',",1)
p.write_text(s)

# Browser fixture: reuse existing fully mocked ranking fixture and assert actual UI wiring.
s=Path('test/ranking-ui.test.mjs').read_text();prefix=s[:s.index("try{\n const context=await browser.newContext")]
body=r'''try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await context.addInitScript(({user})=>localStorage.setItem('ringu.supabase.v1.ekgihnyojihpearcudtd.supabase.co',JSON.stringify({access_token:'synthetic-hu1',refresh_token:'synthetic-hu1',expires_at:Date.now()/1000+3600,user:{id:user.id,email:'fixture@test.invalid',user_metadata:{username:user.username}}})),{user});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();
  if(u.hostname==='ekgihnyojihpearcudtd.supabase.co'){
   queue=queue.then(async()=>{try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(await remote(route.request()))});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:e.message,message:e.message})});}});return queue;
  }
  unexpected.push(u.origin);return route.abort();
 });
 const page=await context.newPage();activePage=page;page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.RinguHUD?.version==='HU1'&&RinguSession.active&&document.querySelector('#rmTopHeader.hu-hud'));
 const labels=await page.locator('#rmCurrencyStats .rm-stat>span:nth-child(2)').allTextContents();assert.deepEqual(labels,['골드','정수','초월석','펫스톤','공격력','소환']);
 for(const [cls,name] of [['gold','gold'],['essence','essence'],['stone','stone'],['petstone','pet'],['power','attack'],['summon','summon']])assert.equal(await page.locator('.rm-stat-'+cls+' .rm-stat-icon').getAttribute('data-hu-icon'),name);
 assert.equal(await page.locator('.rm-stat-essence').innerText().then(t=>t.includes('💎')),false);
 for(const [sel,label] of [['.profile-button','랭킹'],['.mail-button','우편'],['.settings-button','설정']]){assert.ok(await page.locator(sel+' .hu-icon').count());assert.ok((await page.locator(sel).innerText()).includes(label));}
 assert.match(await page.locator('.profile-button').getAttribute('onclick'),/openProfile/);assert.match(await page.locator('.mail-button').getAttribute('onclick'),/openMailbox/);assert.match(await page.locator('.settings-button').getAttribute('onclick'),/openSettings/);
 const dimensions=[];
 for(const [width,height] of [[320,640],[360,640],[390,844],[412,915],[540,720],[768,800],[1024,768],[1440,1000]]){
  await page.setViewportSize({width,height});
  const m=await page.locator('#rmTopHeader').evaluate(el=>{const r=el.getBoundingClientRect(),stats=el.querySelector('#rmCurrencyStats'),summon=el.querySelector('#summonWeaponLevel');return {left:r.left,right:r.right,width:r.width,viewport:innerWidth,overflow:el.scrollWidth>el.clientWidth+1,statsOverflow:stats.scrollWidth>stats.clientWidth+1,summonOverflow:summon.scrollWidth>summon.clientWidth+1};});
  assert.ok(m.left>=-1&&m.right<=width+1,JSON.stringify(m));assert.equal(m.overflow,false,JSON.stringify(m));assert.equal(m.statsOverflow,false,JSON.stringify(m));assert.equal(m.summonOverflow,false,JSON.stringify(m));dimensions.push({width,height,...m});
 }
 await page.setViewportSize({width:390,height:844});await page.locator('.profile-button').click();await page.waitForFunction(()=>document.querySelector('#profileModal')?.classList.contains('show'));await page.keyboard.press('Escape');
 await page.evaluate(()=>openShopConfirm({kind:'consumable',type:'protect',name:'강화 하락 방지권',price:10,icon:'🛡️',description:'테스트'}));
 await page.waitForFunction(()=>document.querySelector('#shopPurchaseConfirm')?.open);
 assert.equal(await page.locator('#shopPurchasePrice').innerText(),'10');assert.equal(await page.locator('#shopPurchasePrice .hu-icon-essence').count(),1);assert.equal((await page.locator('#shopPurchasePrice').innerText()).includes('정수'),false);await page.locator('#shopPurchaseCancel').click();
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 const fs=await import('node:fs/promises');await fs.mkdir('test-output/HU1',{recursive:true});await page.screenshot({path:'test-output/HU1/hud-390.png',fullPage:false});
 await fs.writeFile('test-output/HU1/report.json',JSON.stringify({checks:['custom existing-resource icons only','essence is not diamond','ranking/mail/settings controls retained','eight responsive widths no horizontal overflow','summon label not truncated','shared essence confirmation uses icon plus number'],dimensions,productionDataUsed:false},null,2));
 console.log('PASS HU1 premium HUD, custom existing-resource icons and shared essence icon pricing; mocked accounts only.');
}catch(e){if(activePage)await activePage.screenshot({path:'test-output/HU1/failure.png'}).catch(()=>{});console.log('HU1_DIAGNOSTIC',errors,unexpected);throw e;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
'''
Path('test/hud-ui.test.mjs').write_text(prefix+body)

p=Path('test/black-market-bm3-browser.test.mjs');s=p.read_text()
s=s.replace("assert.equal(await a.locator('#shopPurchasePrice').textContent(),'정수 18개');","assert.equal(await a.locator('#shopPurchasePrice').innerText(),'18');assert.equal(await a.locator('#shopPurchasePrice .hu-icon-essence').count(),1);")
s=s.replace("assert.equal(await a.locator('#shopPurchaseName').textContent(),'하락방지권 1개');", "assert.equal(await a.locator('#shopPurchaseName').textContent(),'하락방지권 1개');assert.equal(await a.locator('[data-bm-slot=\"1\"] .hu-icon-essence').count(),1);")
s=s.replace("assert.equal(await a.locator('#shopPurchasePrice').textContent(),'정수 15개');", "assert.equal(await a.locator('#shopPurchasePrice').innerText(),'15');assert.equal(await a.locator('#shopPurchasePrice .hu-icon-essence').count(),1);")
Path('test/black-market-bm3-browser.test.mjs').write_text(s)

Path('HUD-HU1.md').write_text('''# HU1 — 상단 HUD 및 정수 구매 표시\n\n기존 재화와 기능만 사용합니다. 새 아이템/재화/확률/가격을 추가하지 않습니다.\n상단의 골드·정수·초월석·펫스톤·공격력·소환, 랭킹·우편·설정을 금색/남색 판타지 스타일로 개편했습니다.\n정수는 다이아 대신 파란 보랏빛 영혼 불꽃 모양의 자체 SVG 아이콘을 사용합니다.\n상점·암시장·오라·코스튬 등 정수 구매 가격은 화면에서 `정수 10개` 대신 정수 아이콘 + `10`으로 표시합니다. 접근성 라벨에는 정수 수량을 유지합니다.\n게임 데이터, 구매 가격, 암시장 확률, 보유 재화, 장비, 서버 RPC는 변경하지 않습니다.\n''')
