from pathlib import Path

def patch(name,old,new):
 p=Path(name);s=p.read_text();assert s.count(old)==1,(name,old);p.write_text(s.replace(old,new,1))
# wire assets
patch('index.html','<link rel="stylesheet" href="/linsa-rpg/ranking-ui.css?v=ranking-RK1">','<link rel="stylesheet" href="/linsa-rpg/ranking-ui.css?v=ranking-RK1">\n<link rel="stylesheet" href="/linsa-rpg/hud-ui.css?v=HUD1">')
patch('index.html','<script defer src="/linsa-rpg/ranking-ui.js?v=ranking-RK1"></script>','<script defer src="/linsa-rpg/ranking-ui.js?v=ranking-RK1"></script>\n<script defer src="/linsa-rpg/hud-ui.js?v=HUD1"></script>')
# shop cards: essence icon + number instead of text
old="'가격 정수 '+fmt(price)+'개'";new="'가격 '+(window.RinguHUD?RinguHUD.priceHTML(price):'정수 '+fmt(price)+'개')";patch('index.html',old,new)
old="'정수 '+fmt(price)+'개'";new="(window.RinguHUD?RinguHUD.priceHTML(price):'정수 '+fmt(price)+'개')";assert Path('index.html').read_text().count(old)>=1
# replace only purchase-button occurrences in renderAuraShop and consumables
s=Path('index.html').read_text();s=s.replace("(equipped?'장착중':owned?'장착':'정수 '+fmt(price)+'개')","(equipped?'장착중':owned?'장착':(window.RinguHUD?RinguHUD.priceHTML(price):'정수 '+fmt(price)+'개'))",1)
s=s.replace(">정수 25개</button>",">'+(window.RinguHUD?RinguHUD.priceHTML(25):'정수 25개')+'</button>",1)
s=s.replace(">정수 10개</button>",">'+(window.RinguHUD?RinguHUD.priceHTML(10):'정수 10개')+'</button>",1)
Path('index.html').write_text(s)
# black market visible balance/buttons/rates
p=Path('black-market.js');s=p.read_text();s=s.replace("function balance(){ $('blackMarketBalance').textContent='정수 '+fmt(g.state.essence||0)+'개'; }","function balance(){const n=g.state.essence||0;$('blackMarketBalance').innerHTML=window.RinguHUD?RinguHUD.priceHTML(n):'정수 '+fmt(n)+'개';}",1)
s=s.replace("'<button type=\"button\" data-bm-slot=\"'+row.slot+'\" aria-label=\"'+esc(v.name)+' 정수 '+row.price+'개 구매\" '+(row.purchased?'disabled':'')+'><b>정수 '+row.price+'개</b><span>'","'<button type=\"button\" data-bm-slot=\"'+row.slot+'\" aria-label=\"'+esc(v.name)+' 정수 '+row.price+'개 구매\" '+(row.purchased?'disabled':'')+'><b>'+(window.RinguHUD?RinguHUD.priceHTML(row.price):'정수 '+row.price+'개')+'</b><span>'",1)
s=s.replace("'<small>정수 '+prices[i]+'개</small>'","'<small>'+(window.RinguHUD?RinguHUD.priceHTML(prices[i].includes('~')?prices[i].split('~')[0]:prices[i]):'정수 '+prices[i]+'개')+(prices[i].includes('~')?'~'+prices[i].split('~')[1]:'')+'</small>'",1)
Path('black-market.js').write_text(s)
# shared purchase confirmation
p=Path('shop-controls.js');s=p.read_text();s=s.replace("$('shopPurchaseIcon').textContent=product.icon||'✦';$('shopPurchasePrice').textContent='정수 '+fmt(product.price)+'개';","$('shopPurchaseIcon').textContent=product.icon||'✦';$('shopPurchasePrice').innerHTML=window.RinguHUD?RinguHUD.priceHTML(product.price):'정수 '+fmt(product.price)+'개';",1)
s=s.replace("$('shopPurchaseBalance').textContent=Number.isFinite(balance)?'정수 '+fmt(balance)+'개':'확인 불가';","$('shopPurchaseBalance').innerHTML=Number.isFinite(balance)?(window.RinguHUD?RinguHUD.priceHTML(balance):'정수 '+fmt(balance)+'개'):'확인 불가';",1)
s=s.replace("$('shopPurchaseAfter').textContent=!bad&&balance>=p.price?'정수 '+fmt(balance-p.price)+'개':'정수 부족';","$('shopPurchaseAfter').innerHTML=!bad&&balance>=p.price?(window.RinguHUD?RinguHUD.priceHTML(balance-p.price):'정수 '+fmt(balance-p.price)+'개'):'정수 부족';",1)
Path('shop-controls.js').write_text(s)
