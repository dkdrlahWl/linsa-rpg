from pathlib import Path

def patch(path, old, new):
    p=Path(path); s=p.read_text(); assert s.count(old)==1,(path,old[:100],s.count(old)); p.write_text(s.replace(old,new,1))

old=""" function navSetup(){const nav=document.querySelector('.rm-bottom-nav');if(!nav||nav.dataset.pv2)return false;nav.dataset.pv2='1';const buttons=[...nav.querySelectorAll('button')];if(buttons.length<5)return false;const defs=[['home','메인','home'],['hunt','사냥','hunt'],['character','캐릭터','character'],['summon','소환','summon'],['menu','메뉴','settings']];buttons.slice(0,5).forEach((b,i)=>{const [target,label,key]=defs[i];b.dataset.target=target;b.innerHTML=icon(key)+'<strong>'+label+'</strong>';});baseShowPage=window.RinguPortrait?.showPage?.bind(window.RinguPortrait);if(window.RinguPortrait)window.RinguPortrait.showPage=show;nav.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.target==='home'){e.preventDefault();e.stopImmediatePropagation();show('home');}else home&&(home.hidden=true);},true);show('home');return true;}"""
new=""" function navSetup(){const nav=document.querySelector('.rm-bottom-nav');if(!nav)return false;if(nav.dataset.pv2==='1')return !!baseShowPage;const buttons=[...nav.querySelectorAll('button')];if(buttons.length<5||!window.RinguPortrait?.showPage)return false;baseShowPage=window.RinguPortrait.showPage.bind(window.RinguPortrait);const defs=[['home','메인','home'],['hunt','사냥','hunt'],['character','캐릭터','character'],['summon','소환','summon'],['menu','메뉴','settings']];buttons.slice(0,5).forEach((b,i)=>{const [target,label,key]=defs[i];b.dataset.target=target;b.innerHTML=icon(key)+'<strong>'+label+'</strong>';});nav.dataset.pv2='1';window.RinguPortrait.showPage=show;nav.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.target==='home'){e.preventDefault();e.stopImmediatePropagation();show('home');}else home&&(home.hidden=true);},true);show('home');return true;}
 function ensureNavSetup(){let attempts=0;const tick=()=>{if(navSetup()||attempts++>=80)return;setTimeout(tick,100)};tick();}"""
patch('premium-ui-v2.js',old,new)
patch('premium-ui-v2.js',"makeHome();if(!navSetup())setTimeout(navSetup,150);scan();","makeHome();ensureNavSetup();scan();")

old="root.querySelectorAll('.rm-bottom-nav button').forEach(el=>{const icon={hunt:'⚔️',character:'🧙',summon:'🔮',inventory:'🎒',menu:'🧭'}[el.dataset.target];if(icon&&el.querySelector('span').textContent!==icon)el.querySelector('span').textContent=icon;});"
new="root.querySelectorAll('.rm-bottom-nav button').forEach(el=>{if(el.closest('.rm-bottom-nav')?.dataset.pv2==='1'||el.querySelector('.pv-icon'))return;const icon={hunt:'⚔️',character:'🧙',summon:'🔮',inventory:'🎒',menu:'🧭'}[el.dataset.target];if(icon&&el.querySelector('span').textContent!==icon)el.querySelector('span').textContent=icon;});"
patch('remodel.js',old,new)

css=Path('premium-ui-v2.css')
css.write_text(css.read_text()+r'''

/* PV3 mobile correctness: fixed 3x2 resource grid and reliable content offset. */
@media(max-width:1099px){
 body[data-remodel] .topbar[data-hud1]{height:190px!important;min-height:190px!important;max-height:190px!important;padding:8px 10px!important;gap:8px!important;overflow:hidden!important;display:flex!important;flex-direction:column!important}
 body[data-remodel] .app{padding-top:204px!important}
 body[data-remodel] .topbar[data-hud1] .brand-row{display:flex!important;flex:0 0 50px!important;width:100%!important;height:50px!important;min-height:50px!important;align-items:center!important;justify-content:space-between!important;overflow:visible!important}
 body[data-remodel] .topbar[data-hud1] .brand{flex:1 1 auto!important;min-width:0!important;max-width:190px!important;overflow:hidden!important}
 body[data-remodel] .topbar[data-hud1] .brand strong{font-size:21px!important;line-height:1!important;letter-spacing:4px!important;white-space:nowrap!important}
 body[data-remodel] .topbar[data-hud1] .header-actions{display:flex!important;flex:0 0 auto!important;gap:6px!important}
 body[data-remodel] .topbar[data-hud1] .header-actions .profile-button,body[data-remodel] .topbar[data-hud1] .header-actions .mail-button,body[data-remodel] .topbar[data-hud1] .header-actions .settings-button{width:44px!important;height:44px!important;min-width:44px!important;max-width:44px!important;min-height:44px!important;padding:3px!important;overflow:hidden!important}
 body[data-remodel] .topbar[data-hud1] #rmCurrencyStats,body[data-remodel] .topbar[data-hud1] .stats{display:grid!important;flex:none!important;width:100%!important;min-width:0!important;max-width:none!important;height:116px!important;min-height:116px!important;max-height:116px!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:repeat(2,58px)!important;grid-auto-flow:row!important;grid-auto-columns:auto!important;gap:0!important;align-items:stretch!important;justify-items:stretch!important;overflow:hidden!important}
 body[data-remodel] .topbar[data-hud1] #rmCurrencyStats>.stat,body[data-remodel] .topbar[data-hud1] .stats>.stat{position:relative!important;display:flex!important;flex:none!important;flex-direction:column!important;align-items:flex-start!important;justify-content:center!important;grid-column:auto!important;grid-row:auto!important;width:auto!important;min-width:0!important;max-width:none!important;height:58px!important;min-height:58px!important;max-height:58px!important;margin:0!important;padding:5px 5px 4px 35px!important;border:0!important;border-left:1px solid #987b4a3b!important;border-top:1px solid #987b4a24!important;border-radius:0!important;overflow:hidden!important;text-align:left!important}
 body[data-remodel] .topbar[data-hud1] #rmCurrencyStats>.stat:nth-child(3n+1),body[data-remodel] .topbar[data-hud1] .stats>.stat:nth-child(3n+1){border-left:0!important}
 body[data-remodel] .topbar[data-hud1] #rmCurrencyStats>.stat:nth-child(-n+3),body[data-remodel] .topbar[data-hud1] .stats>.stat:nth-child(-n+3){border-top:0!important}
 body[data-remodel] .topbar[data-hud1] .stat>.pv-icon,body[data-remodel] .topbar[data-hud1] .stat>.hud-icon{position:absolute!important;left:8px!important;top:50%!important;transform:translateY(-50%)!important;width:22px!important;height:22px!important;margin:0!important}
 body[data-remodel] .topbar[data-hud1] .stat-label{display:block!important;width:100%!important;min-width:0!important;font-size:8px!important;line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 body[data-remodel] .topbar[data-hud1] .stat-value{display:block!important;width:100%!important;min-width:0!important;max-width:100%!important;margin-top:2px!important;font-size:13px!important;line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
 body[data-remodel] .topbar[data-hud1] #gold{font-size:12px!important}
 body[data-remodel] .topbar[data-hud1] #summonTop{font-size:10px!important;letter-spacing:-.2px!important}
 body[data-remodel] .topbar[data-hud1] .summon-mini{width:88%!important;max-width:none!important;height:3px!important;margin-top:3px!important}
 body[data-remodel] .rm-sidebar[data-page="menu"]{padding-top:18px!important;margin-top:8px!important}
 body[data-remodel] .rm-sidebar[data-page="menu"] .rm-nav-caption{margin-top:0!important;padding-top:4px!important}
 body[data-remodel] .rm-bottom-nav[data-pv2] button>.pv-icon{display:inline-grid!important;width:25px!important;height:25px!important}
 body[data-remodel] .rm-bottom-nav[data-pv2] button>span:not(.pv-icon){display:none!important}
}
@media(max-width:420px){
 body[data-remodel] .topbar[data-hud1]{height:188px!important;min-height:188px!important;max-height:188px!important;padding-left:8px!important;padding-right:8px!important}
 body[data-remodel] .app{padding-top:202px!important}
 body[data-remodel] .topbar[data-hud1] .brand{max-width:160px!important}
 body[data-remodel] .topbar[data-hud1] .brand strong{font-size:19px!important;letter-spacing:3px!important}
 body[data-remodel] .topbar[data-hud1] .brand small{font-size:6px!important;letter-spacing:2px!important}
 body[data-remodel] .topbar[data-hud1] #rmCurrencyStats,body[data-remodel] .topbar[data-hud1] .stats{height:114px!important;min-height:114px!important;max-height:114px!important;grid-template-rows:repeat(2,57px)!important}
 body[data-remodel] .topbar[data-hud1] #rmCurrencyStats>.stat,body[data-remodel] .topbar[data-hud1] .stats>.stat{height:57px!important;min-height:57px!important;max-height:57px!important;padding-left:32px!important}
 body[data-remodel] .topbar[data-hud1] .stat>.pv-icon,body[data-remodel] .topbar[data-hud1] .stat>.hud-icon{left:7px!important;width:20px!important;height:20px!important}
 body[data-remodel] .topbar[data-hud1] .stat-value{font-size:12px!important}
 body[data-remodel] .pv-home{padding:10px!important}
 body[data-remodel] .pv-home-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}
}
@media(max-width:600px) and (min-height:700px){
 #profileModal.rk-ready #rankList{min-height:255px!important;max-height:255px!important;overflow-y:auto!important}
 #profileModal.rk-ready button.rk-row{height:47px!important;min-height:47px!important}
 #profileModal.rk-ready .rk-badge{width:39px!important;height:39px!important}
 #profileModal.rk-ready .rk-rank{font-size:20px!important}
 #profileModal.rk-ready .rk-footer{padding-top:4px!important;padding-bottom:6px!important}
}
''')

p=Path('index.html');s=p.read_text()
for old,new in [('premium-ui-v2.js?v=PV2','premium-ui-v2.js?v=PV3'),('premium-ui-v2.css?v=PV2','premium-ui-v2.css?v=PV3')]:
    assert s.count(old)==1,(old,s.count(old));s=s.replace(old,new,1)
p.write_text(s)
