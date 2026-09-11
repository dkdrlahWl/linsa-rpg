from pathlib import Path

def patch(name,old,new):
 p=Path(name);s=p.read_text();assert s.count(old)==1,(name,old);p.write_text(s.replace(old,new,1))

patch('index.html','<script defer src="/linsa-rpg/hud-ui.js?v=HUD1"></script>','<script defer src="/linsa-rpg/hud-ui.js?v=HUD1"></script>\n<script defer src="/linsa-rpg/premium-ui-v2.js?v=PV2"></script>')
patch('index.html','<link rel="stylesheet" href="/linsa-rpg/hud-ui.css?v=HUD1">','<link rel="stylesheet" href="/linsa-rpg/hud-ui.css?v=HUD1">\n<link rel="stylesheet" href="/linsa-rpg/premium-ui-v2.css?v=PV2">')
patch('auction.js',"modal.querySelector('#auctionBalance').textContent='💎 정수 '+fmt(status.essence||0);","modal.querySelector('#auctionBalance').innerHTML=window.RinguHUD?'보유 '+RinguHUD.priceHTML(status.essence||0):'정수 '+fmt(status.essence||0)+'개';")
patch('auction.js',"'<b class=\"auction-price\">💎 '+fmt(r.price)+' 정수</b>","'<b class=\"auction-price\">'+(window.RinguHUD?RinguHUD.priceHTML(r.price):'정수 '+fmt(r.price)+'개')+'</b>")
patch('auction.js',"'<h3>💎 '+fmt(row.price)+' 정수</h3>","'<h3>'+(window.RinguHUD?RinguHUD.priceHTML(row.price):'정수 '+fmt(row.price)+'개')+'</h3>")
patch('auction.js',"panel.querySelector('#auctionConfirmBalance').textContent='현재 '+fmt(s.essence)+' 정수 → 구매 후 '+fmt(s.essence-row.price)+' 정수';","panel.querySelector('#auctionConfirmBalance').innerHTML=window.RinguHUD?'현재 '+RinguHUD.priceHTML(s.essence)+' → 구매 후 '+RinguHUD.priceHTML(s.essence-row.price):'현재 '+fmt(s.essence)+' 정수 → 구매 후 '+fmt(s.essence-row.price)+' 정수';")
