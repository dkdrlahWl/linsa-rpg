/* W2-1: presentation/data adapters. Currency, RNG, unlocks and XP remain server-only. */
(()=>{'use strict';
const W=window.RinguWorld2Data,base='/linsa-rpg/art/world2/',lookup=new Map(W.gear.map(x=>[x.slot+'|'+x.name,x]));
// W2_FINAL_HP_V1: same final-boss values as the authoritative server; rewards stay unchanged.
const world2FinalHp=[925000,2305000,2922000,5770000,8680000];
world2FinalHp.forEach((hp,i)=>{
 const boss=W.regions[i]?.bosses[5],id='w2-boss-'+String((i+1)*6).padStart(2,'0');
 if(boss?.id!==id)throw Error('INVALID_WORLD2_FINAL_BOSS');
 boss.hp=hp;
});
const template=it=>Number(it?.rarity)===6?lookup.get(it.slot+'|'+it.name):null;
window.installRinguWorld2=function(g){
 if(g.world2Installed)return;g.world2Installed=true;
 const f=g.fn,$=id=>document.getElementById(id),esc=x=>f.escapeHtml(String(x??'')),fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
 g.bossRegions[5].name='심연';
 // ABYSS_FINAL_HP_680K: matches the authoritative server; reward stays unchanged.
 g.bossRegions[5].bosses[5].hp=680000;
 g.bossRegions.splice(6,g.bossRegions.length-6,...structuredClone(W.regions));
 g.rates.splice(15,g.rates.length-15,...W.rates.map(x=>[...x]));
 g.rarityNames[1]='고급';g.rarityNames[2]='희귀';g.rarityColors[6]='#763653';
 const previous={};for(const key of ['itemIndex','itemName','fixedBaseAtk','gearVariantCount','collectionItems','itemAtk','itemAttackText','enhanceCost','transcendCost','summonUnitCost'])previous[key]=f[key];
 f.itemIndex=it=>template(it)?.index??previous.itemIndex(it);
 f.itemName=(slot,r,i)=>Number(r)===6?(W.gear.find(x=>x.slot===slot&&x.index===i)?.name??previous.itemName(slot,r,i)):previous.itemName(slot,r,i);
 f.fixedBaseAtk=(slot,r,i)=>Number(r)===6?(W.gear.find(x=>x.slot===slot&&x.index===i)?.baseAtk??previous.fixedBaseAtk(slot,r,i)):previous.fixedBaseAtk(slot,r,i);
 f.gearVariantCount=(r,slot)=>Number(r)===6?5:previous.gearVariantCount(r,slot);
 f.collectionItems=()=>[...previous.collectionItems().filter(x=>x.rarity!==6),...W.gear.map(x=>({...x,enhance:0,transcend:0,optionRolls:[1,1]}))];
 f.itemAtk=it=>{
  const t=template(it);if(!t)return previous.itemAtk(it);
  const lv=Math.max(0,Math.min(15,Number(it.enhance)||0)),raw=t.baseAtk*(lv<=10?1+lv*.05:1.5+(lv-10)*.2),enhanced=lv?Math.max(Math.ceil(raw),t.baseAtk+Math.min(lv,10)+Math.max(0,lv-10)*2):t.baseAtk;
  return Math.floor(enhanced*(1+Math.min(3,it.transcend||0)*(it.slot==='무기'?.8:.5)));
 };
 f.itemAttackText=it=>{if(!template(it))return previous.itemAttackText(it);const values=W.gear.filter(x=>x.slot===it.slot).map(x=>f.itemAtk({...it,...x}));return fmt(f.itemAtk(it))+' <span class="item-stat-range">('+fmt(Math.min(...values))+'~'+fmt(Math.max(...values))+')</span>';};
 f.enhanceCost=it=>Number(it?.rarity)===6?(W.enhanceCosts[it.enhance]||0):previous.enhanceCost(it);
 f.transcendCost=(it,n)=>Number(it?.rarity)===6?(W.transcendCosts[n-1]||0):previous.transcendCost(it,n);
 f.summonUnitCost=()=>f.activeSummon().level>=16?W.costs[Math.min(18,f.activeSummon().level)-16]:previous.summonUnitCost();
 const starBadge=it=>{const n=Math.max(0,Math.min(3,Number(it.transcend)||0));return n?'<span class="gear-transcend-badge" style="--star-color:'+(Number(it.rarity)===7?'#f5ffff':'#e681b3')+'" aria-label="'+n+'초월">'+'★'.repeat(n)+'</span>':'';};
 const oldIcon=window.RinguArt.icon;
 window.RinguArt.icon=(it,index)=>{const t=template(it);return t?'<span class="rm-item-art w2-item-art" data-rarity="6"><img src="'+base+t.art+'.webp" alt="'+esc(t.name)+'" loading="lazy" decoding="async">'+starBadge(it)+'</span>':oldIcon(it,index);};
 f.gearIcon=it=>window.RinguArt.icon(it,f.itemIndex(it));
 const oldSets=window.RinguGearSets;
 window.RinguGearSets=Object.freeze({...oldSets,rank:it=>{const t=template(it);return t?{rank:t.rank,roman:t.roman}:oldSets.rank(it);}});
 const oldTitle=f.itemTitleHtml;
 f.itemTitleHtml=(it,progress=true)=>{const t=template(it);if(!t)return oldTitle(it,progress);return '<span class="cube-item-name">'+esc((it.locked?'[잠금] ':'')+it.name)+'</span> <span class="w2-rank" title="타락 계열 '+t.rank+'위">'+t.roman+'</span>'+(progress?' <span class="ringu-plus">+'+(it.enhance||0)+'</span> '+(it.transcend?'<span class="transcend-stars" style="--star-color:#e681b3;color:#e681b3" aria-label="'+Math.min(3,it.transcend)+'초월">'+'★'.repeat(Math.max(0,Math.min(3,Number(it.transcend)||0)))+'</span>':'')+'':'');};
 const normal=f.normalizeCharacter;
 f.normalizeCharacter=(...args)=>{const kept=(g.state?.inventory||[]).filter(x=>Number(x.rarity)===6).map(x=>[x,{...x}]);const result=normal(...args);for(const [it,snapshot]of kept){Object.assign(it,snapshot);const t=template(it);if(t)it.baseAtk=t.baseAtk;}return result;};
 function progress(v){if(v.level<15){const lo=g.levelReq[v.level-1],hi=g.levelReq[v.level];return {have:v.exp-lo,need:hi-lo,percent:Math.min(100,(v.exp-lo)/(hi-lo)*100)};}if(v.level===15)return {have:0,need:0,percent:100,note:'심연 최종 보스 처치 시 Lv.16'};if(v.level===18)return {have:0,need:0,percent:100,note:'최대 레벨'};const need=v.level===16?10000:20000,have=Math.max(0,Math.min(need,v.exp-g.levelReq[14]-(v.level===17?10000:0))),gate=v.level===16?42:60;return {have,need,percent:have/need*100,note:(g.state.monsterUnlockStep||0)<gate?(v.level===16?'추락천사 라지엘':'공허포식왕 네비로스')+' 처치 필요'+(have===need?' · 경험치 상한 도달':''):''};}
 f.getSummonLevel=exp=>{if(exp<g.levelReq[14])return g.levelReq.reduce((lv,n,i)=>exp>=n?i+1:lv,1);if(!g.state.world2Unlocked)return 15;if(exp>=g.levelReq[14]+30000&&(g.state.monsterUnlockStep||0)>=60)return 18;if(exp>=g.levelReq[14]+10000&&(g.state.monsterUnlockStep||0)>=42)return 17;return 16;};
 const renderTop=f.renderTop;f.renderTop=(...args)=>{const result=renderTop(...args),p=progress(f.activeSummon());if($('summonMini'))$('summonMini').style.width=p.percent+'%';return result;};
 f.renderSummon=()=>{const v=f.activeSummon(),p=progress(v),cost=f.summonUnitCost();$('summonLevel').textContent=({weapon:'무기',armor:'방어구',accessory:'장신구'}[g.drawGroup])+' 소환 Lv.'+v.level+' · 1회 '+fmt(cost)+' G';$('summonExp').textContent=(p.need?fmt(p.have)+' / '+fmt(p.need)+' EXP':'MAX')+(p.note?' · '+p.note:'');$('expFill').style.width=p.percent+'%';for(const n of [1,5,10,50,100])if($('drawCost'+n))$('drawCost'+n).textContent=fmt(cost*n)+' G';};
 f.openRates=()=>{$('rateTable').innerHTML='<p>무기·방어구·장신구 경험치는 각각 독립적으로 증가합니다.</p><div class="w2-rate-scroll"><table class="rate-table"><thead><tr><th>레벨</th>'+g.rarityNames.slice(0,7).map(n=>'<th>'+esc(n)+'</th>').join('')+'</tr></thead><tbody>'+g.rates.map((r,i)=>'<tr class="'+(i+1===f.activeSummon().level?'current':'')+'"><th>'+ (i+1)+'</th>'+Array.from({length:7},(_,j)=>'<td>'+(r[j]||0)+'%</td>').join('')+'</tr>').join('')+'</tbody></table></div><p>타락 계열: I 1/15 · II 2/15 · III 3/15 · IV 4/15 · V 5/15. 무기는 확정, 방어구 4부위·장신구 2부위는 각각 균등 확률입니다.</p><p>Lv.16→17: 해당 종류 10,000회 + 라지엘 처치<br>Lv.17→18: 해당 종류 20,000회 + 네비로스 처치<br>지역 조건이 부족하면 경험치는 요구량에서 멈추며 초과분은 이월되지 않습니다.</p>';$('rateModal').classList.add('show');};
 const oldBossPreviews=new Map();const oldBossPreview=i=>{if(!oldBossPreviews.has(i)){const frame=window.RinguArt.monsterFrames[i];if(frame)oldBossPreviews.set(i,frame.toDataURL('image/png'));}return oldBossPreviews.get(i)||'';};
 const worldRegions=[0,6];
 window.selectHuntWorld=function(world){if(world===1&&!g.state.world2Unlocked)return;const target=worldRegions[world];if(target!==undefined)f.selectRegion(target);};
 f.renderBosses=()=>{const s=g.state,unlocked=s.monsterUnlockStep||0,world=s.regionIndex>=6?1:0;
 $('world2Entrance')?.remove();
 let worlds=$('huntWorldTabs');if(!worlds){worlds=document.createElement('div');worlds.id='huntWorldTabs';worlds.className='hunt-world-tabs';$('regionTabs').before(worlds);}
 worlds.innerHTML='<button class="hunt-world-tab '+(!world?'active':'')+'" aria-pressed="'+!world+'" onclick="selectHuntWorld(0)">1세계</button><button class="hunt-world-tab '+(world?'active':'')+'" aria-pressed="'+!!world+'" onclick="selectHuntWorld(1)" '+(!s.world2Unlocked?'disabled':'')+'>2세계'+(!s.world2Unlocked?'<small>심연 최종 보스 처치 시 해금</small>':'')+'</button>';
 const tabs=$('regionTabs'),scroll=tabs.scrollLeft,prior=tabs.dataset.world;tabs.dataset.world=world;
 tabs.innerHTML=g.bossRegions.map((r,i)=>{if((i>=6?1:0)!==world)return '';const locked=i*6>unlocked||(i>=6&&!s.world2Unlocked);return '<button data-region-index="'+i+'" class="region-tab '+(i===s.regionIndex?'active ':'')+(locked?'locked':'')+'" onclick="selectRegion('+i+')" '+(locked?'disabled':'')+'>'+(i>=6?'<img src="'+base+'region-'+(i-5)+'.webp" alt="" loading="lazy">':'')+'<span>'+esc(r.name)+'</span></button>';}).join('');
 tabs.scrollLeft=prior===String(world)?scroll:0;
 $('bossList').innerHTML=f.currentBosses().map((b,i)=>{const locked=s.regionIndex*6+i>unlocked;return '<button class="boss-btn '+(i===s.bossIndex?'active ':'')+(locked?'locked':'')+'" onclick="selectBoss('+i+')" '+(locked?'disabled':'')+'>'+(s.regionIndex>=6?'<img class="rm-monster-icon" src="'+base+b.art+'.webp" alt="" loading="lazy">':'<img class="rm-monster-icon" src="'+oldBossPreview(s.regionIndex*6+i)+'" alt="">')+'<strong>'+esc(b.name)+(locked?' · 잠금':'')+'</strong><span>HP '+fmt(b.hp)+' · '+fmt(b.reward)+' G</span></button>';}).join('');};
 window.RinguWorld2={template,progress,base};
};
})();
