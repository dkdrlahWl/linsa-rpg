from pathlib import Path
import hashlib

def patch(name,old,new):
    p=Path(name);s=p.read_text();assert s.count(old)==1,(name,old);p.write_text(s.replace(old,new,1))

patch('black-market.js',"const errors={", "const errors={RESOURCE_BALANCE_LIMIT:'재료 보유 한도에 도달했습니다.',BLACK_MARKET_OFFER_INVALID:'상품 정보를 다시 불러와 주세요.',")
patch('black-market.js'," function render(){",''' // Consumables never pass through equipment attack/option/icon calculations.
 const materials={transcendStone:{name:'초월석',icon:'◆',description:'장비 초월 시 사용하는 재료'},downgradeProtect:{name:'하락방지권',icon:'▣',description:'장비 강화 실패 시 강화 단계 하락 방지'}};
 function productView(it){
  if(it?.kind==='consumable'){
   const m=materials[it.resource];if(!m||it.quantity!==1)throw Error('INVALID_RESPONSE');
   return {name:m.name+' 1개',icon:m.icon,art:'<span class="bm-consumable-icon" aria-hidden="true">'+m.icon+'</span>',info:'소모품 · 1개',options:esc(m.description),description:'소모품 · 1개 · '+m.description};
  }
  const info=g.rarityNames[it.rarity]+' · '+it.slot+' · 공격력 '+fmt(g.fn.itemAtk(it));
  return {name:it.name,icon:'⚔',art:g.fn.gearIcon(it),info,options:g.fn.optionText(it),description:info+' · '+text(g.fn.optionText(it))};
 }
 function render(){''')
old='''    const it=row.item;
    return '<article class="bm-offer bm-r'+it.rarity+'" data-offer="'+row.slot+'">'+g.fn.gearIcon(it)+
     '<div class="bm-item-info"><strong>'+esc(it.name)+'</strong><small>'+esc(g.rarityNames[it.rarity])+' · '+esc(it.slot)+' · 공격력 '+fmt(g.fn.itemAtk(it))+'</small><span class="bm-option">'+g.fn.optionText(it)+'</span></div>'+'''
new='''    const it=row.item,v=productView(it);
    return '<article class="bm-offer '+(it.kind==='consumable'?'bm-consumable':'bm-r'+it.rarity)+'" data-offer="'+row.slot+'">'+v.art+
     '<div class="bm-item-info"><strong>'+esc(v.name)+'</strong><small>'+esc(v.info)+'</small><span class="bm-option">'+v.options+'</span></div>'+'''
patch('black-market.js',old,new)
patch('black-market.js',"aria-label=\"'+esc(it.name)+' 정수", "aria-label=\"'+esc(v.name)+' 정수")
patch('black-market.js',"  $('blackMarketRatesBody').innerHTML=(snapshot?.rates||[80,15,4.9,0.1]).map((n,i)=>'<div><span>'+esc(g.rarityNames[i])+'</span><b>'+n+'%</b><small>정수 '+[3,5,10,15][i]+'개</small></div>').join('');",'''  const rates=snapshot?.nextRates||snapshot?.rates||[49.1,15,4.9,1,15,15],names=[...g.rarityNames.slice(0,4),'초월석','하락방지권'],prices=['3','5','10','15','13~18','4~8'];
  $('blackMarketRatesBody').innerHTML=rates.map((n,i)=>'<div><span>'+esc(names[i])+'</span><b>'+n+'%</b><small>정수 '+prices[i]+'개</small></div>').join('');
  $('blackMarketRatesNotice').textContent=snapshot?.ratesApplyNextRotation?'새 확률과 소모품은 다음 진열부터 적용됩니다. 현재 상품과 구매 기록은 유지됩니다.':'각 진열칸에서 독립 추첨 · 소모품은 1개씩 · 가격은 진열 갱신 시 결정되어 모든 유저에게 동일합니다.';''')
patch('black-market.js',"const product=()=>({name:item.name,price:offer.price,icon:'⚔',description:g.rarityNames[item.rarity]+' · '+item.slot+' · 공격력 '+fmt(g.fn.itemAtk(item))+' · '+text(g.fn.optionText(item)),", "const v=productView(item);\n  const product=()=>({name:v.name,price:offer.price,icon:v.icon,description:v.description,")
patch('black-market.js','<h3>등급별 진열 확률</h3>', '<h3>상품별 진열 확률</h3><p id="blackMarketRatesNotice"></p>')
patch('black-market.js','각 상품의 등급을 위 확률로 추첨합니다. 부위는 7종 중 동일 확률이며, 같은 부위·등급 안에서는 장비를 균등 추첨합니다. 이미 진열한 동일 장비는 제외합니다. 정수는 확정된 장비를 구매할 때만 사용됩니다.', '각 진열칸에서 상품 종류를 위 확률로 추첨합니다. 장비 부위는 7종 중 동일 확률이며 같은 부위·등급 안에서 이미 진열한 동일 장비는 제외합니다. 소모품은 서로 다른 칸에 중복 등장할 수 있습니다. 초월석 가격은 13~18, 하락방지권 가격은 4~8 정수의 정수값을 균등 추첨하며, 진열 동안 변하지 않습니다. 정수는 확정된 상품 구매 시에만 사용됩니다.')
patch('black-market.js','공통 진열 장비 5개','공통 진열 상품 5개')
patch('black-market.js','암시장 BP2','암시장 BM3')
patch('black-market.js',"version:'BP2'","version:'BM3'")
patch('index.html','black-market.js?v=prices-BP2','black-market.js?v=consumables-BM3')
patch('index.html','black-market.css?v=BM1','black-market.css?v=consumables-BM3')
patch('index.html','auction.js?v=listing-limit-AL8','auction.js?v=mobile-details-AU2')
patch('index.html','auction.css?v=1','auction.css?v=mobile-details-AU2')
p=Path('black-market.css');p.write_text(p.read_text()+'''\n/* BM3 consumables use material glyphs, never equipment stats. */
#blackMarketModal .bm-consumable{border-left-color:#e1c386}
#blackMarketModal .bm-consumable-icon{width:44px;height:44px;display:grid;place-items:center;font-size:30px;color:#e1c386;background:#263442;border-radius:8px}
#blackMarketRatesNotice{color:#edc987!important}
@media(max-width:380px){#blackMarketModal .bm-consumable-icon{width:38px;height:38px}}
''')
paths=list(Path('supabase/migrations').glob('*_black_market_consumables_bm3.sql'));assert len(paths)==1
paths[0].write_bytes(Path('black-market-consumables.sql.in').read_bytes())
p=Path('BLACK-MARKET-ROLLOUT.md');p.write_text(p.read_text()+'''\n\n## BM3 equipment + consumables
Prices in essence: common 3 / uncommon 5 / rare 10 / epic 15.
Per-slot odds: common 49.1% / uncommon 15% / rare 4.9% / epic 1% / transcendence stone 15% / downgrade protection 15% (total 100%).
Stone: one unit, uniformly priced at integers 13–18. Protection: one unit, uniformly priced at integers 4–8. Prices roll once per shared rotation, not per user or purchase.
Apply the CLI-generated `supabase/migrations/*_black_market_consumables_bm3.sql` after BP2. Existing five offers and purchased slots remain untouched. New odds and materials begin with the next scheduled rotation (KST 00:00/18:00), with this timing shown in the UI. No retroactive refund or reroll.
A consumable purchase atomically debits essence and increments only its resource counter; it never creates an equipment record. Receipt replay, per-slot purchase limits, authentication and row locks are retained. Historical equipment receipts remain valid.
This release also includes the previously validated AU2 auction mobile scrolling, full item details and enhancement-first/attack-second sorting.
''')
print('Generated migration',paths[0])
# Reuse the existing fully intercepted Auth/SQL browser fixture, not live accounts.
s=Path('test/stone-s3-browser.test.mjs').read_text()
s=s.replace("import {readFile} from 'node:fs/promises';", "import {readFile,readdir} from 'node:fs/promises';",1)
s=s.replace("'11-economy-command-gateway.sql']", "'11-economy-command-gateway.sql','16-economy-differential-commit.sql','17-black-market.sql']",1)
anchor="await db.exec('update ringu_private.auction_release set economy_ready=true,enabled=true');"
assert s.count(anchor)==1
s=s.replace(anchor,"for(const n of (await readdir(new URL('../supabase/migrations/',import.meta.url))).sort())if(/_black_market_(prices_bp[12]|consumables_bm3)\\.sql$/.test(n))await db.exec('begin;'+await readFile(new URL('../supabase/migrations/'+n,import.meta.url),'utf8')+'commit;');\n"+anchor,1)
s=s.replace("'ringu_ranking','ringu_auction']", "'ringu_ranking','ringu_auction','ringu_black_market']",1)
s=s.replace("chromium.launch({headless:true})", "chromium.launch({headless:true,executablePath:process.env.QA_CHROMIUM_EXECUTABLE})",1)
start=s.index("try{\n const a=await player('releaseqaA');")
end=s.index("}finally{await browser.close();server.close();await db.close();}",start)
s=s[:start]+'''try{
 const a=await player('bm3fixture');await run(a,'auto',{enabled:false});
 const product=(resource,name)=>({kind:'consumable',resource,quantity:1,name});
 const items=[product('transcendStone','초월석'),product('downgradeProtect','하락방지권'),...([0,2,3].map(r=>({...balance.gear.find(g=>g.rarity===r),enhance:0,transcend:0,optionRolls:[.876,1.12]})))];
 const offers=items.map((item,slot)=>({slot,kind:slot<2?'consumable':'equipment',price:[18,8,3,10,15][slot],item}));
 const cycle=await rpc('ringu_black_market',{p_action:'status'});
 await db.query('update ringu_private.black_market_cycles set offers=$1,rates=$2 where id=$3',[JSON.stringify(offers),JSON.stringify([49.1,15,4.9,1,15,15]),cycle.rotation]);
 await a.setViewportSize({width:390,height:844});
 await a.locator('.rm-bottom-nav [data-target="menu"]').click();await a.locator('#blackMarketMenuButton').click();
 await a.waitForFunction(()=>document.querySelectorAll('#blackMarketItems [data-offer]').length===5);
 const get=()=>a.evaluate(()=>({essence:RinguCore.state.essence,stone:RinguCore.state.transcendStone,protect:RinguCore.state.downgradeProtect,inventory:JSON.stringify(RinguCore.state.inventory)}));
 const before=await get();
 assert.match(await a.locator('[data-offer="0"]').innerText(),/초월석 1개/);assert.match(await a.locator('[data-offer="1"]').innerText(),/하락방지권 1개/);
 assert.ok(!(await a.locator('[data-offer="0"]').innerText()).includes('공격력'));
 await a.locator('#blackMarketRates').click();
 const rates=await a.locator('#blackMarketRatesBody').innerText();for(const label of ['49.1%','15%','4.9%','1%','13~18','4~8'])assert.ok(rates.includes(label),label);
 await a.locator('#blackMarketRates').click();
 await a.locator('[data-bm-slot="0"]').click();
 await a.waitForFunction(()=>document.querySelector('#shopPurchaseConfirm')?.open);
 assert.equal(await a.locator('#shopPurchaseName').textContent(),'초월석 1개');assert.equal(await a.locator('#shopPurchasePrice').textContent(),'정수 18개');
 await a.locator('#shopPurchaseAccept').click();await a.waitForFunction(()=>!document.querySelector('#shopPurchaseConfirm')?.open);
 let after=await get();assert.equal(after.essence,before.essence-18);assert.equal(after.stone,before.stone+1);assert.equal(after.inventory,before.inventory);
 await a.locator('[data-bm-slot="1"]').click();await a.waitForFunction(()=>document.querySelector('#shopPurchaseConfirm')?.open);
 assert.equal(await a.locator('#shopPurchaseName').textContent(),'하락방지권 1개');await a.locator('#shopPurchaseAccept').click();await a.waitForFunction(()=>!document.querySelector('#shopPurchaseConfirm')?.open);
 after=await get();assert.equal(after.essence,before.essence-26);assert.equal(after.protect,before.protect+1);assert.equal(after.inventory,before.inventory);
 await a.waitForFunction(()=>document.querySelector('[data-bm-slot="0"]')?.disabled&&document.querySelector('[data-bm-slot="1"]')?.disabled);
 await a.locator('#blackMarketRetry').click();await a.waitForTimeout(350);assert.ok(await a.locator('[data-bm-slot="0"]').isDisabled());assert.equal((await get()).stone,after.stone);
 await a.locator('[data-bm-slot="4"]').click();await a.waitForFunction(()=>document.querySelector('#shopPurchaseConfirm')?.open);assert.equal(await a.locator('#shopPurchasePrice').textContent(),'정수 15개');await a.locator('#shopPurchaseAccept').click();await a.waitForFunction(()=>!document.querySelector('#shopPurchaseConfirm')?.open);
 assert.equal((await get()).essence,before.essence-41);assert.equal(JSON.parse((await get()).inventory).length,JSON.parse(before.inventory).length+1);
 const fs=await import('node:fs/promises');await fs.mkdir('test-output/BM3',{recursive:true});
 for(const width of [320,390,1440]){
  await a.setViewportSize({width,height:844});
  assert.ok(await a.locator('#blackMarketModal').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await a.screenshot({path:'test-output/BM3/black-market-'+width+'.png'});
 }
 await a.locator('#blackMarketClose').click();await a.reload({waitUntil:'domcontentloaded'});await a.waitForFunction(()=>RinguSession.active&&window.RinguBlackMarket);
 after=await get();assert.equal(after.stone,before.stone+1);assert.equal(after.protect,before.protect+1);assert.equal(after.essence,before.essence-41);
 assert.deepEqual(errors,[]);
 console.log('PASS BM3 browser: mobile consumable and equipment offers, six-category odds, real SQL debits/counter updates, confirmation, sold state, refresh/relogin persistence, three viewports, zero page errors. All Auth/SQL requests synthetic.');
''' + s[end:]
Path('test/black-market-bm3-browser.test.mjs').write_text(s)
