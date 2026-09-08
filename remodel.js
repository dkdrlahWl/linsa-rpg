(()=>{'use strict';
window.installRinguRemodel=function(g){
 const $=id=>document.getElementById(id),f=g.fn,old=Object.fromEntries(Object.getOwnPropertyNames(f).map(k=>[k,f[k]])),esc=s=>f.escapeHtml(String(s??'')),fmt=n=>Math.floor(Number(n)||0).toLocaleString('ko-KR'),art=window.RinguArt;
 const state=()=>g.state,active=()=>window.RinguSession.active!==false;
 const equipMap=()=>Object.fromEntries(g.slots.map(slot=>[slot,state().inventory.find(it=>String(it.id)===String(state().equipped[slot]))]));
 const changed=()=>{f.renderAll();f.save(false)};
 // Reward tables are shared by battle payouts, offline farming and their UI.
 if(!g.rewardBalanceV3){g.rewardBalanceV3=true;g.bossRegions.forEach(r=>r.bosses.forEach(b=>b.reward*=2));g.collectionRewards.forEach(r=>r.gold*=10);g.towerFloors.forEach(r=>r.gold*=10);g.goldDungeonStages.forEach(r=>r.reward*=10);}
 function grantAuraMilestone(){const s=state();if(s.collectionClaims?.[50]&&!s.aura50TicketGranted){s.aura50TicketGranted=true;s.auraDrawTickets=Math.max(0,Math.floor(Number(s.auraDrawTickets)||0))+1;return true}return false;}
 const claimCollection=f.claimCollectionReward;f.claimCollectionReward=(count)=>{if(!active())return false;const result=claimCollection(count);if(grantAuraMilestone())changed();return result;};
 window.useAuraDrawTicket=()=>{const s=state();if(!active()||!(s.auraDrawTickets>0))return false;const pool=g.auraShopItems.map((_,i)=>i).filter(i=>i!==8&&!s.ownedAuras?.includes(i));if(!pool.length){f.toast('만화경 제외 모든 오라를 보유하고 있습니다. 뽑기권은 보관됩니다.');return false}const index=pool[Math.floor(Math.random()*pool.length)];s.auraDrawTickets--;s.ownedAuras??=[];s.ownedAuras.push(index);changed();window.RinguAudio?.effect('success');f.toast('✨ '+g.auraShopItems[index][0]+' 오라 획득');return index;};
 const renderCollectionRewards=f.renderCollectionRewards;f.renderCollectionRewards=(...args)=>{renderCollectionRewards(...args);const host=$('collectionRewards');if(host){const first=host.querySelector('.collection-reward small');if(first)first.textContent+=' · 오라 뽑기권 1장 (만화경 제외)';const button=document.createElement('button');button.textContent='✨ 랜덤 오라 뽑기권 사용 · '+(state().auraDrawTickets||0)+'장';button.disabled=!(state().auraDrawTickets>0);button.onclick=window.useAuraDrawTicket;host.append(button);}};
 const noop=()=>Promise.resolve(false);
 let attackTimer=null,attackMotion=null;
 const cancelAttack=()=>{clearTimeout(attackTimer);attackTimer=null;attackMotion=null};
 const originalAttack=f.attack;
 f.attack=()=>{if(!active())return;if(g.activeTower||g.activeDungeon)return originalAttack();if(!state().autoBattle||attackTimer!==null||g.combat.hp<=0)return;const owner=state(),region=owner.regionIndex,boss=owner.bossIndex;window.RinguAudio?.effect('swing');attackMotion={started:performance.now(),hit:false};attackTimer=setTimeout(()=>{attackTimer=null;if(!active()||state()!==owner||!owner.autoBattle||owner.regionIndex!==region||owner.bossIndex!==boss||g.activeTower||g.activeDungeon)return cancelAttack();attackMotion.hit=true;originalAttack();},460);};
 for(const name of ['selectRegion','selectBoss','toggleAutoBattle']){const before=f[name];f[name]=(...args)=>{cancelAttack();return before(...args)}}
 window.RinguSession.onEnded?.(cancelAttack);
 const originalResetCombat=f.resetCombat;f.resetCombat=(...args)=>{const result=originalResetCombat(...args);if(state())f.renderBattle();return result};
 for(const name of ['initCloudSync','pullCloudState','uploadCloudState','syncMailboxReceipts'])f[name]=noop;
 f.getCloudSession=()=>null;f.checkTargetMail=()=>false;f.scheduleCloudSave=()=>{};
 f.ensureCloudFreshForAction=async()=>active();f.saveChanceAction=()=>f.save(false);
 f.save=()=>{if(!state()||!active())return;state().lastSeen=Date.now();state().savedAt=Date.now();state().remodelProfile=f.ownProfile();try{localStorage.setItem('swordEnhanceRPG_balance_20260617_v5',JSON.stringify(state()))}catch(e){f.toast('브라우저 임시 저장 공간이 부족합니다. 서버 저장 상태를 확인하세요.')}window.RinguSession.save(state());};
 let saveTimer;f.queueSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>f.save(false),150)};
 f.spendGold=cost=>{cost=Number(cost);if(!active()||!Number.isFinite(cost)||cost<0||state().gold<cost)return false;state().gold-=cost;return true};
 f.load=()=>{old.load();const s=state();s.uid=Math.max(Number(s.uid)||1,...s.inventory.map(i=>(Number(i.id)||0)+1));s.regionIndex=Math.max(0,Math.min(g.bossRegions.length-1,s.regionIndex||0));
  grantAuraMilestone();s.remodelStarted=true;setupLayout();f.renderAll();f.save(false);
 };
 f.gearIcon=it=>art.icon(it,f.itemIndex(it));f.ringuResultIcon=f.gearIcon;
 window.openItemDetail=id=>{const it=state().inventory.find(item=>String(item.id)===String(id));if(!it)return;let modal=$('rmItemDetail');if(!modal){modal=document.createElement('div');modal.id='rmItemDetail';modal.className='modal-bg';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','장비 상세');document.body.append(modal);}modal.innerHTML='<section class="modal"><h3>'+esc(it.name)+'</h3><div class="rm-detail-art">'+f.gearIcon(it)+'</div><p>'+g.rarityNames[it.rarity]+' · '+esc(it.slot)+' · '+(f.isItemEquipped(it)?'✓ 장착 중':'미장착')+'</p><h3>⚔ '+fmt(f.itemAtk(it))+'</h3><p>'+f.optionText(it)+'</p><p>강화 +'+it.enhance+'　초월 '+(it.transcend||0)+'　'+(it.locked?'🔒 잠금':'')+'</p><button id="rmDetailEnhance">강화 / 초월</button><button id="rmDetailClose">닫기</button></section>';$('rmDetailEnhance').onclick=()=>{modal.classList.remove('show');f.openEnhance(it.id)};$('rmDetailClose').onclick=()=>modal.classList.remove('show');modal.classList.add('show');$('rmDetailClose').focus();};
 f.sortInventoryItems=list=>list.sort((a,b)=>Number(f.isItemEquipped(b))-Number(f.isItemEquipped(a))||($('sortSelect')?.value==='rarity'?b.rarity-a.rarity:0)||f.itemAtk(b)-f.itemAtk(a));
 f.renderEquipment=()=>{const s=state(),map=equipMap(),signature=JSON.stringify([s.equipped,s.inventory.filter(it=>map[it.slot]===it).map(it=>[it.id,it.enhance,it.transcend]),s.playerGender,s.playerName,s.equippedAura,s.equippedPet]);if($('equipGrid').dataset.signature===signature)return;$('equipGrid').dataset.signature=signature;
  $('equipGrid').innerHTML='<div class="rm-character-stage"><canvas id="heroCanvas" width="640" height="780" aria-label="장착 무기가 반영된 캐릭터"></canvas><div class="rm-character-caption"><small>ADVENTURER</small><strong>'+esc(s.playerName)+'</strong><span>무기만 외형에 반영 · 방어구 능력치 적용</span></div></div><div class="rm-equipped-list">'+g.slots.map(slot=>{const it=map[slot];return '<button class="rm-equipped-slot" '+(it?'onclick="openEnhance('+it.id+')"':'onclick="scrollToId(\'inventoryPanel\')"')+' style="--rarity:'+(it?g.rarityColors[it.rarity]:'#697178')+'">'+(it?f.gearIcon(it):'<span class="rm-empty-slot">＋</span>')+'<span><small>'+slot+'</small><strong>'+esc(it?it.name:'미장착')+'</strong><em>'+(it?'⚔ '+fmt(f.itemAtk(it))+'　+'+it.enhance+' '+('★'.repeat(it.transcend||0)):'가방에서 장비 선택')+'</em></span></button>'}).join('')+'</div>';$('equipAtk').textContent='⚔ '+fmt(f.getPower());
 };
 f.renderBosses=()=>{const s=state();$('regionTabs').innerHTML=g.bossRegions.map((r,i)=>'<button class="region-tab '+(i===s.regionIndex?'active':'')+'" onclick="selectRegion('+i+')">'+['초원','사막','설원','화산','천공','심연'][i]+'</button>').join('');$('bossList').innerHTML=f.currentBosses().map((b,i)=>'<button class="boss-btn '+(i===s.bossIndex?'active':'')+'" onclick="selectBoss('+i+')"><span class="rm-monster-icon" style="background-position:'+((i)/5*100)+'% '+(s.regionIndex/5*100)+'%"></span><strong>'+esc(b.name)+'</strong><span>♥ '+fmt(b.hp)+'　◈ '+fmt(b.reward)+'</span></button>').join('');};
 f.renderBattle=()=>{const b=f.currentBoss(),s=state(),c=g.combat;$('bossName').textContent=b.name;$('hpText').textContent=fmt(c.hp)+' / '+fmt(b.hp);$('hpFill').style.width=Math.max(0,c.hp/b.hp*100)+'%';$('timerFill').style.width=Math.max(0,(15-c.elapsed)/15*100)+'%';$('battleToggle').textContent=s.autoBattle?'사냥 중지':'자동사냥 시작';$('battleToggle').classList.toggle('on',s.autoBattle);$('battleState').textContent=s.autoBattle?'AUTO HUNT · '+c.elapsed+' / 15초':'PAUSED · 전투 대기';};
 f.renderPlayerStats=()=>{const s=f.getPlayerStats();$('playerStats').innerHTML=[['⚔','공격력',fmt(s.attack)],['↑','공격력 보너스',s.atkPercent.toFixed(1)+'%'],['✦','치명타 확률',s.critChance.toFixed(1)+'%'],['ϟ','치명타 피해',s.critDamage.toFixed(1)+'%'],['◈','골드 보너스',s.goldBonus.toFixed(1)+'%'],['➶','공격속도','×'+(s.attackSpeed||1).toFixed(2)]].map(([icon,name,value])=>'<div class="player-stat"><span>'+icon+' '+name+'</span><b>'+value+'</b></div>').join('');};
 f.renderAll=()=>{if(!state())return;f.renderTop();f.renderBosses();f.renderBattle();f.renderEquipment();f.renderPlayerStats();f.renderSummon();f.renderInventory();window.renderMailboxBadge?.();f.renderDailyRewardBoxV1();paintPetIcons();};
 f.renderPetLayer=()=>'';
 function paintPetIcons(){document.querySelectorAll('.pet-card,.pet-result-card').forEach(card=>{const label=card.querySelector('strong')?.textContent||'',data=Object.values(g.PET_DATA).find(p=>label.includes(p.name));if(!data)return;const icon=card.querySelector('.pet-icon');if(icon){const i=Object.keys(g.PET_DATA).sort().indexOf(data.id),fr=art.frame('pets',i,5,5);icon.textContent='';icon.classList.add('rm-pet-art');if(fr){const url=fr.im.previewURL??=(fr.im.toDataURL());icon.style.backgroundImage='url('+url+')';icon.style.backgroundSize='contain';icon.style.backgroundPosition='center';}}});}
 for(const name of ['renderPetCard','renderPetCollectionCard','renderPetSummonResult']){const prev=f[name];f[name]=function(...args){const r=prev(...args);queueMicrotask(paintPetIcons);return r};}
 f.claimMail=async id=>{
  if(!active())return false;const s=state(),mail=s.mailbox.find(m=>String(m.id)===String(id));if(!mail)return false;
  s.claimedMailReceipts??={};if(s.claimedMailReceipts[mail.id])return false;
  const before=structuredClone(s);
  try{s.claimedMailReceipts[mail.id]=Date.now();f.applyMailboxReward(mail.reward);s.mailbox=s.mailbox.filter(m=>String(m.id)!==String(mail.id));changed();window.renderMailbox();}
  catch(e){g.state=before;f.toast('우편 보상 형식을 확인해 주세요. 보상은 수령되지 않았습니다.');return false;}
  try{await window.RinguSession.flush();f.toast('우편 보상 수령 · 서버 저장 완료');return true;}
  catch(e){f.toast('서버 저장 확인 대기 중입니다. 다시 지급하지 않고 연결 복구 시 재시도합니다.');return false;}
 };
 const rawDaily=f.claimDailyReward;f.claimDailyReward=()=>{if(!active())return false;const r=rawDaily();f.save(false);return r};
 let operation=null;
 f.openEnhance=id=>{if(operation)return f.toast('강화가 끝난 뒤 다른 장비를 선택하세요.');g.enhanceId=state().inventory.find(it=>String(it.id)===String(id))?.id??null;if(g.enhanceId===null)return;f.renderEnhance();$('enhanceModal').classList.add('show')};
 f.closeEnhance=()=>{if(operation)return f.toast('강화 결과를 확인한 뒤 닫을 수 있습니다.');$('enhanceModal').classList.remove('show');g.enhanceId=null;g.enhanceBusy=false};
 f.renderEnhance=()=>{const it=state().inventory.find(i=>String(i.id)===String(g.enhanceId));if(!it)return;const next=(it.transcend||0)+1;$('enhanceTitle').textContent=it.name;$('enhanceGear').innerHTML=f.gearIcon(it);$('enhanceDesc').innerHTML='⚔ '+fmt(f.itemAtk(it))+'　'+f.optionText(it);$('enhNow').textContent='+'+it.enhance+'　'+'★'.repeat(it.transcend||0);$('enhRate').textContent=it.enhance>=15?'MAX':f.successRate(it.enhance+1)+'%';$('enhCost').textContent=it.enhance>=15?'—':fmt(f.enhanceCost(it))+' G';$('enhanceBtn').disabled=!!operation||it.enhance>=15;$('enhanceBtn').textContent=operation?'진행 중…':'강화 시도';$('transcendBtn').disabled=!!operation||!f.canTranscend(it);$('transcendBtn').textContent=(it.transcend||0)>=3?'최대 초월 달성':next+'초월 시도';$('transcendInfo').textContent=f.canTranscend(it)?'초월석 '+f.transcendCost(it,next)+'개 · 성공률 '+f.transcendRate(next)+'%':'전설 이상, +15 강화 장비만 초월할 수 있습니다.';$('protectToggle').textContent='하락 방지 '+(state().useProtect?'ON':'OFF')+' · 보유 '+state().downgradeProtect+'장';};
 function forge(transcend){if(operation||!active())return false;const it=state().inventory.find(i=>String(i.id)===String(g.enhanceId));if(!it||(!transcend&&it.enhance>=15)||(transcend&&!f.canTranscend(it)))return false;const next=transcend?(it.transcend||0)+1:it.enhance+1,cost=transcend?f.transcendCost(it,next):f.enhanceCost(it);if(transcend?state().transcendStone<cost:state().gold<cost)return f.toast('재료가 부족합니다.'),false;
  // Resolve and persist the outcome synchronously; animation never owns currency or item state.
  if(transcend)state().transcendStone-=cost;else if(!f.spendGold(cost))return false;const success=Math.random()*100<(transcend?f.transcendRate(next):f.successRate(next));if(success){if(transcend)it.transcend=next;else it.enhance=next;}else if(!transcend&&next>=2){if(state().useProtect&&state().downgradeProtect>0)state().downgradeProtect--;else it.enhance=Math.max(0,it.enhance-1);}
  operation={id:it.id};g.enhanceBusy=true;f.save(false);f.renderEnhance();$('enhanceStage').className='enhance-stage forging';try{f.playForgeSound()}catch(e){}setTimeout(()=>{operation=null;g.enhanceBusy=false;if(!active())return;changed();f.renderEnhance();$('enhanceStage').className='enhance-stage '+(success?'success':'fail');$('enhanceResult').textContent=success?'성공':'실패';window.RinguAudio?.effect(success?'success':'failure');},600);return true;
 }
 f.tryEnhance=()=>forge(false);f.tryTranscend=()=>forge(true);
 for(const name of ['sellItem','bulkSell','toggleEquipItem']){const prev=f[name];f[name]=(...args)=>{if(operation||!active())return f.toast('진행 중인 작업이 끝난 뒤 이용하세요.');return prev(...args)}}
 let revealRun=null;
 function stopReveal(){if(!revealRun)return;revealRun.timers.forEach(clearTimeout);revealRun=null;$('rmFirstReveal')?.classList.remove('show');}
 window.RinguSession.onEnded?.(stopReveal);
 function drawResults(items){$('drawResultGrid').innerHTML=items.map(it=>'<article class="rm-drop-card" style="--drop-color:'+g.rarityColors[it.rarity]+'">'+f.gearIcon(it)+'<small>'+(it.isNew?'✨ 최초 획득 · ':'')+esc(g.rarityNames[it.rarity])+'</small><strong>'+esc(it.name)+'</strong><span>⚔ '+fmt(f.itemAtk(it))+'</span></article>').join('');$('drawResultModal').style.removeProperty('display');$('drawResultModal').classList.add('show');}
 function firstReveals(items){
  const fresh=items.filter(it=>it.isNew&&it.rarity>=3).sort((a,b)=>a.rarity-b.rarity);
  if(!fresh.length){window.RinguAudio?.effect('draw',Math.max(...items.map(it=>it.rarity)));drawResults(items);return;}
  let modal=$('rmFirstReveal');if(!modal){modal=document.createElement('div');modal.id='rmFirstReveal';modal.className='modal-bg';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','최초 장비 획득');document.body.append(modal);}
  const run={owner:state(),timers:[],index:0};revealRun=run;
  const later=(fn,ms)=>run.timers.push(setTimeout(()=>{if(revealRun===run&&active()&&state()===run.owner)fn();},ms));
  const finish=()=>{stopReveal();if(active()&&state()===run.owner)drawResults(items);};
  function next(){
   run.timers.forEach(clearTimeout);run.timers=[];
   const it=fresh[run.index++];if(!it)return finish();
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,duration=reduced?450:it.rarity>=5?3000:it.rarity===4?2100:1200;
   modal.className='modal-bg show';modal.dataset.grade=String(it.rarity);modal.style.setProperty('--drop-color',g.rarityColors[it.rarity]);modal.style.setProperty('--reveal-time',duration+'ms');modal.dataset.duration=String(duration);
   modal.innerHTML='<section class="rm-reveal-stage"><div class="rm-reveal-rays"></div><div class="rm-reveal-orbit"></div><div class="rm-reveal-sparks">'+Array.from({length:it.rarity>=5?30:it.rarity===4?20:12},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</div><small class="rm-reveal-eyebrow">FIRST DISCOVERY · '+run.index+' / '+fresh.length+'</small><h2>'+esc(g.rarityNames[it.rarity])+'</h2><div class="rm-reveal-item">'+f.gearIcon(it)+'</div><strong class="rm-reveal-name">'+esc(it.name)+'</strong><p class="rm-reveal-status" aria-live="polite">새로운 힘이 깨어납니다…</p><button class="rm-reveal-skip">연출 건너뛰기</button><button class="rm-reveal-next" disabled>계속</button></section>';
   modal.querySelector('.rm-reveal-skip').onclick=finish;
   modal.querySelector('.rm-reveal-next').onclick=next;modal.querySelector('.rm-reveal-skip').focus();
   window.RinguAudio?.effect('reveal-charge',it.rarity);
   later(()=>modal.classList.add('charged'),duration*.55);
   later(()=>{modal.classList.add('revealed');modal.querySelector('.rm-reveal-status').textContent='도감에 새로운 장비가 기록되었습니다';modal.querySelector('.rm-reveal-next').disabled=false;window.RinguAudio?.effect('reveal-impact',it.rarity);},duration);
   later(next,duration+1600);
  }
  next();
 }
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&revealRun){e.preventDefault();e.stopImmediatePropagation();modalSkip();}},true);
 function modalSkip(){$('rmFirstReveal')?.querySelector('.rm-reveal-skip')?.click();}
 f.drawItems=count=>{
  count=Number(count);if(!active()||revealRun||![1,5,10].includes(count))return false;
  const s=state(),cost=count*f.summonUnitCost();if(s.gold<cost)return f.toast('골드가 부족합니다.'),false;
  const before=structuredClone(s);
  try{if(!f.spendGold(cost))return false;s.discovered??={};const items=[];
   for(let i=0;i<count;i++){const it=f.makeItem(g.drawGroup);if(!it?.id)throw Error('invalid item');const key=f.itemKey(it);it.isNew=!s.discovered[key];s.discovered[key]=true;items.push(it);}
   s.inventory.unshift(...items);const summon=f.activeSummon();summon.exp+=count;summon.level=f.getSummonLevel(summon.exp);changed();firstReveals(items);return true;
  }catch(e){g.state=before;changed();f.toast('소환을 완료하지 못했습니다. 재화와 장비를 복구했습니다.');return false;}
 };
 // A confirmation owns only the displayed snapshot, never items looted afterwards.
 f.bulkSell=maxRarity=>{
  if(operation||!active())return false;
  const owner=state(),items=owner.inventory.filter(it=>it.rarity<=maxRarity&&!it.locked&&!f.isItemEquipped(it));
  if(!items.length)return f.toast('판매 가능한 장비가 없습니다.'),false;
  const quote=items.map(it=>({id:String(it.id),price:f.sellPrice(it)})),total=quote.reduce((n,it)=>n+it.price,0);
  let modal=$('rmSellConfirm');if(!modal){modal=document.createElement('div');modal.id='rmSellConfirm';modal.className='modal-bg';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','일괄 판매 확인');document.body.append(modal);}
  modal.innerHTML='<section class="modal"><h3>🪙 일괄 판매 확인</h3><p><b>'+quote.length+'개</b>의 장비를 판매하고 <b>'+fmt(total)+' 골드</b>를 받습니다.</p><p>장착 중이거나 잠긴 장비는 제외됩니다.<br>판매한 장비는 되돌릴 수 없습니다.</p><button id="rmSellCancel">취소</button> <button class="primary" id="rmSellAccept">확인 · 판매하기</button></section>';
  $('rmSellCancel').onclick=()=>modal.classList.remove('show');
  $('rmSellAccept').onclick=()=>{
   if(!modal.classList.contains('show'))return;
   modal.classList.remove('show');
   if(!active()||operation||state()!==owner)return;
   const valid=quote.every(q=>{const it=owner.inventory.find(it=>String(it.id)===q.id);return it&&!it.locked&&!f.isItemEquipped(it)&&f.sellPrice(it)===q.price;});
   if(!valid)return f.toast('장비 상태가 변경되었습니다. 판매 목록을 다시 확인하세요.');
   const ids=new Set(quote.map(q=>q.id));owner.inventory=owner.inventory.filter(it=>!ids.has(String(it.id)));owner.gold+=total;changed();f.toast(quote.length+'개 판매 · +'+fmt(total)+' 골드');
  };
  modal.classList.add('show');$('rmSellCancel').focus();return false;
 };
 window.openTips=()=>{
  const labels={atkPercent:'공격력',critChance:'치명타 확률',critDamage:'치명타 피해',goldBonus:'골드 획득량'};
  const rows=g.slots.map(slot=>'<tr><th>'+esc(slot)+'</th>'+g.rarityNames.map((name,rarity)=>{const sample={slot,rarity,transcend:0,optionRolls:[.8,.8]},lo=f.subOptions(sample),hi=f.subOptions({...sample,optionRolls:[1.201,1.201]});return '<td>'+lo.map(([key,value],i)=>esc(labels[key])+'<br>'+value+'~'+hi[i][1]+'%').join('<br>')+'</td>';}).join('')+'</tr>').join('');
  const mythic=g.rates.findIndex(r=>r[5]>0)+1;
  const bonus=g.slots.map(slot=>'<tr><th>'+esc(slot)+'</th>'+[4,5,6].map(rarity=>{const base={slot,rarity,transcend:0,optionRolls:[1,1]},first=f.subOptions({...base,transcend:1}),normal=f.subOptions(base),extra=first.reduce((n,[k,v])=>n+(k==='atkPercent'?v:0),0)-normal.reduce((n,[k,v])=>n+(k==='atkPercent'?v:0),0);const attack=f.itemAtk({...base,baseAtk:10000,enhance:15,transcend:1})/f.itemAtk({...base,baseAtk:10000,enhance:15})-1;return '<td>장비 공격력 +'+Math.round(attack*100)+'%<br>공격력 부옵션 +'+extra+'%</td>';}).join('')+'</tr>').join('');
  $('tipGrid').innerHTML='<div class="tip-card"><h4>📖 현재 적용 중인 성장 규칙</h4><p>소환 최대 Lv.'+g.rates.length+' · 신화는 Lv.'+mythic+'부터 등장합니다. 타락 장비는 현재 일반 소환에서 나오지 않습니다.</p><p>현재 선택한 소환의 1회 가격: 🪙 '+fmt(f.summonUnitCost())+' G. 레벨별 등급 확률은 소환 화면의 확률표에서 확인할 수 있습니다.</p><p>강화 최대 +15 · 전설 이상 +15 장비는 최대 3초월.<br>강화 실패 시 +2 도전부터 1단계 하락하며, 하락방지권 사용 시 수치를 유지합니다.</p><p>오프라인 보상은 100%, 최대 12시간입니다. 일일 보상은 정수 10~15개입니다. 첫 50종 장비 도감 보상에는 만화경 제외 미보유 오라 뽑기권 1장이 포함됩니다. 오라 보유 효과는 장착 여부와 무관하게 누적됩니다.</p><p>초월석 던전은 최대 2명. 방장이 시작하며 혼자 시작할 수도 있습니다. 성공 시 하루 이용 횟수를 사용합니다.<br>펫 던전 1단계 HP는 2,000이며 권장 공격력 제한은 없습니다. 펫 소환은 Lv.1~5, 승급마다 20·30·40·50회가 필요하고 실패 없이 펫을 획득합니다.</p></div><div class="tip-card"><h4>💎 장비 부옵션 범위</h4><div class="rm-tip-scroll"><table class="tip-table"><thead><tr><th>부위</th>'+g.rarityNames.map(n=>'<th>'+esc(n)+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div><p>실제 옵션 계산 함수로 표시한 범위입니다. 타락은 기존 보유 장비 참고용입니다.</p></div><div class="tip-card"><h4>🌟 1초월마다 추가되는 효과</h4><div class="rm-tip-scroll"><table class="tip-table"><thead><tr><th>부위</th><th>전설</th><th>신화</th><th>타락</th></tr></thead><tbody>'+bonus+'</tbody></table></div></div>';
  $('tipModal').querySelector('h3').textContent='📖 게임 가이드';$('tipModal').querySelector('p').textContent='현재 게임의 계산값과 적용 규칙 안내';$('tipModal').classList.add('show');
 };
 const rawTowerStart=f.startTower;f.startTower=n=>{if(g.activeTower)return f.toast('이미 탑 전투 중입니다.');return rawTowerStart(n)};
 const rawDungeonStart=f.startDungeonBattle;f.startDungeonBattle=(...args)=>{if(g.activeDungeon||g.activeTower)return f.toast('진행 중인 전투를 먼저 종료하세요.');return rawDungeonStart(...args)};
 const rawDungeonRender=f.renderDungeon;f.renderDungeon=()=>{rawDungeonRender();if(g.dungeonType==='stone'&&!g.activeDungeon){$('dungeonStageList').innerHTML='<p class="rm-note">초월석 던전 · 개인 도전 · 클리어 시 이용 횟수 차감</p>'+Array.from({length:6},(_,i)=>'<button class="rm-dungeon-entry" onclick="quickPartyEntry('+(i+1)+')">'+(i+1)+'단계 도전　→</button>').join('');}};
 f.syncRanking=async()=>{try{const res=await fetch('/api/ranking');if(!res.ok)return;const data=await res.json();const own={id:window.RinguSession.account?.id,name:state().playerName,power:f.getPower(),tower:state().towerCleared,gender:state().playerGender,equipment:f.ownProfile().equipment};const rows=(data.rows||[]).filter(r=>r.id!==own.id);if(!state().rankingHidden)rows.push(own);rows.sort((a,b)=>b.power-a.power);g.rankingProfiles=rows;$('rankStatus').textContent='동일 서버의 저장된 캐릭터 기록';$('rankList').innerHTML=rows.map((p,i)=>'<button class="rm-rank-row" onclick="openRankingCharacter('+i+')"><span>'+String(i+1).padStart(2,'0')+'</span><strong>'+esc(p.name)+'</strong><b>⚔ '+fmt(p.power)+'</b></button>').join('')}catch(e){$('rankStatus').textContent='랭킹 연결을 확인하세요.'}};
 f.openProfile=()=>{$('profileModal').classList.add('show');$('profileUid').textContent=state().playerUid;$('nicknameInput').value=state().playerName;f.syncRanking()};
 f.openRankingCharacter=i=>{const p=g.rankingProfiles[i];if(!p)return;$('playerEquipTitle').textContent=p.name+'의 장비';$('playerEquipStats').textContent='⚔ '+fmt(p.power)+'　시련의 탑 '+p.tower+'층';$('playerEquipGrid').innerHTML=(p.equipment||[]).map(v=>{const it={slot:v.s||v.slot,rarity:v.r??v.rarity,name:v.n||v.name};return '<div class="rm-rank-item">'+f.gearIcon(it)+'<span>'+esc(it.name)+'<small>+'+(v.e??v.enhance??0)+'　'+'★'.repeat(v.t??v.transcend??0)+'</small></span></div>'}).join('');$('playerEquipModal').classList.add('show')};
 function setupLayout(){
  const s=state();document.title='링구 RPG · REFORGED';document.querySelector('.brand').innerHTML='<b>RINGU</b><small>REFORGED</small>';document.querySelector('.pose-open-btn')?.remove();document.querySelector('.cloud-account')?.remove();document.querySelector('.settings-form')?.remove();$('hiddenStatus')?.remove();
  document.querySelector('#settingsModal .rank-note')?.remove();document.querySelector('#settingsModal .modal').insertAdjacentHTML('beforeend','<div class="rm-account-tools"><p>현재 로그인: <b id="rmAccountName"></b></p><button id="rmFxToggle">오라 애니메이션 '+(s.remodelFx===false?'OFF':'ON')+'</button><button id="rmExport">저장 파일 내보내기</button><button id="rmLogout">로그아웃</button></div>');$('rmAccountName').textContent=window.RinguSession.account?.username||'계정';$('rmLogout').onclick=()=>window.RinguSession.logout();$('rmExport').onclick=()=>window.RinguSession.exportSave?.();$('rmFxToggle').onclick=()=>{s.remodelFx=s.remodelFx===false;changed();$('rmFxToggle').textContent='오라 애니메이션 '+(s.remodelFx?'ON':'OFF')};
  document.querySelector('main.app').insertAdjacentHTML('afterbegin','<aside class="rm-sidebar"><div class="rm-seal">R</div><span class="rm-nav-caption">YOUR ADVENTURE</span><button onclick="scrollToId(\'arena\')">✧　모험 / 사냥</button><button onclick="scrollToId(\'equipGrid\')">♙　캐릭터 / 장비</button><button onclick="scrollToId(\'summonPanel\')">✦　장비 소환</button><button onclick="scrollToId(\'inventoryPanel\')">▣　인벤토리</button><hr><nav id="rmFeatureNav"></nav><div class="rm-session"><i></i><span id="rmSaveStatus">서버 연결됨</span><small>한 계정 · 한 접속</small></div></aside>');const quick=document.querySelector('nav.quick');$('rmFeatureNav').appendChild(quick);quick.className='rm-feature-nav';
  $('arena').insertAdjacentHTML('afterbegin','<canvas id="combatCanvas" width="1400" height="900" aria-label="캐릭터와 몬스터 전투"></canvas><span class="rm-location">THE WORLD OF RINGU</span>');$('bossArt').style.display='none';
  for(const n of ['enhanceBtn','transcendBtn'])$(n).onclick=n==='enhanceBtn'?f.tryEnhance:f.tryTranscend;
  document.querySelectorAll('[onclick^="drawItems("]').forEach(btn=>{const n=Number(btn.getAttribute('onclick').match(/\d+/)[0]);btn.onclick=()=>f.drawItems(n)});
  document.querySelectorAll('.modal-bg').forEach(el=>{el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');});
  let lastFocus=null;document.addEventListener('keydown',e=>{const modal=[...document.querySelectorAll('.modal-bg.show')].at(-1);if(e.key==='Escape'&&modal){if(modal.id==='enhanceModal')f.closeEnhance();else if(modal.id==='dungeonModal')f.closeDungeon();else if(modal.id==='towerModal')f.closeTower();else{modal.classList.remove('show');modal.style.removeProperty('display')}lastFocus?.focus();e.preventDefault();}else if(e.key==='Tab'&&modal){const list=[...modal.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(el=>el.offsetParent!==null);if(list.length){const i=list.indexOf(document.activeElement),next=e.shiftKey?(i<=0?list.length-1:i-1):(i+1)%list.length;list[next].focus();e.preventDefault();}}});document.addEventListener('click',e=>{if(!e.target.closest('.modal-bg'))lastFocus=e.target});
  const oldSettings=f.openSettings;f.openSettings=()=>{try{oldSettings()}catch(e){$('settingsModal').classList.add('show');f.renderAudioSettings()}};
  if(window.RinguSession.subscribe)window.RinguSession.subscribe(status=>{if($('rmSaveStatus'))$('rmSaveStatus').textContent=typeof status==='string'?status:status.message});
  window.RinguSession.onEnded?.(()=>{clearTimeout(saveTimer);try{f.stopBgm()}catch(e){}g.coreFixes?.cancelBattles()});
  setupPortrait();
  setupMenuIcons();
  art.ready.then(()=>requestAnimationFrame(draw));
 }
 function setupMenuIcons(){
  const rules=[[/^(무기)/,'⚔️'],[/^(방어구|갑옷|장착 장비)/,'🛡️'],[/^(장신구|반지|귀걸이)/,'💍'],[/^(소환|장비 소환|\d+회 소환)/,'🔮'],[/^(인벤토리|가방|장비$)/,'🎒'],[/^(일일 보상)/,'🎁'],[/^(특수 던전)/,'🌀'],[/^(시련의 탑)/,'🏰'],[/^(상점)/,'🛒'],[/^(장비 도감|도감)/,'📚'],[/^(팁|게임 가이드)/,'💡'],[/^(펫)/,'🐾'],[/^(랭킹)/,'🏆'],[/^(설정)/,'⚙️'],[/^(일괄|.*이하 판매)/,'🪙'],[/^(최적 장착)/,'✨'],[/^(자동사냥|사냥)/,'⚔️'],[/^(우편)/,'📬']];
  const decorate=()=>{document.querySelectorAll('button,.panel-title').forEach(el=>{if(el.querySelector('canvas,.rm-item-art,.rm-monster-icon')||el.closest('.rm-bottom-nav'))return;const text=el.textContent.trim();const rule=rules.find(([re])=>re.test(text));if(rule&&el.dataset.uiIcon!==rule[1])el.dataset.uiIcon=rule[1];});document.querySelectorAll('.rm-bottom-nav button').forEach(el=>{const icon={hunt:'⚔️',character:'🧙',summon:'🔮',inventory:'🎒',menu:'🧭'}[el.dataset.target];if(icon&&el.querySelector('span').textContent!==icon)el.querySelector('span').textContent=icon;});};
  let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;decorate();});});observer.observe(document.body,{childList:true,subtree:true,characterData:true});decorate();window.RinguSession.onEnded?.(()=>observer.disconnect());
 }
 function setupPortrait(){
  document.querySelector('.topbar .stats').id='rmCurrencyStats';
  const pages={hunt:['.boss-panel','.battle-panel'],character:['.equip-panel','.stats-panel'],summon:['.summon-panel'],inventory:['.inventory']};
  for(const [page,selectors]of Object.entries(pages))for(const selector of selectors)document.querySelector(selector).dataset.page=page;
  const sidebar=document.querySelector('.rm-sidebar');sidebar.dataset.page='menu';sidebar.setAttribute('aria-label','전체 메뉴');
  sidebar.querySelectorAll(':scope > button').forEach(button=>button.remove());sidebar.querySelector('.rm-nav-caption').textContent='모험 메뉴';
  const features=$('rmFeatureNav');if(typeof window.openPetPanel==='function'){const button=document.createElement('button');button.textContent='펫 / 동료';button.onclick=()=>window.openPetPanel();features.querySelector('nav').append(button);}
  const nav=document.createElement('nav');nav.className='rm-bottom-nav';nav.setAttribute('aria-label','게임 주요 메뉴');
  nav.innerHTML=[['hunt','✧','사냥'],['character','♙','캐릭터'],['summon','✦','소환'],['inventory','▣','장비'],['menu','☰','메뉴']].map(([page,icon,label])=>'<button type="button" data-target="'+page+'"><span aria-hidden="true">'+icon+'</span><strong>'+label+'</strong></button>').join('');document.body.append(nav);
  const desktop=window.matchMedia('(min-width:1100px)');
  function showPage(page){if(!pages[page]&&page!=='menu')return;document.body.dataset.page=page;document.querySelectorAll('[data-page]').forEach(el=>{if(el!==document.body)el.hidden=!desktop.matches&&el.dataset.page!==page});nav.querySelectorAll('button').forEach(button=>{const selected=button.dataset.target===page;button.classList.toggle('active',selected);if(selected)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current')});if(desktop.matches){const target=page==='menu'?sidebar:document.querySelector(pages[page][0]);target?.scrollIntoView({block:'start',behavior:'smooth'});}else window.scrollTo({top:0,behavior:'instant'});}
  desktop.addEventListener('change',()=>showPage(document.body.dataset.page||'hunt'));
  nav.addEventListener('click',event=>{const button=event.target.closest('button');if(button)showPage(button.dataset.target)});
  window.scrollToId=id=>showPage(id==='equipGrid'?'character':id==='summonPanel'?'summon':id==='inventoryPanel'?'inventory':'hunt');
  window.RinguPortrait={showPage};showPage('hunt');
  const previewButton=document.createElement('button');previewButton.textContent='오라 미리보기';previewButton.onclick=openAuraPreview;features.querySelector('nav').append(previewButton);
 }
 function openAuraPreview(){
  let modal=$('rmAuraPreview');if(!modal){modal=document.createElement('div');modal.id='rmAuraPreview';modal.className='modal-bg';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','rmAuraTitle');modal.innerHTML='<section class="modal"><h3 id="rmAuraTitle">캐릭터 오라</h3><p>캐릭터 뒤에서 실시간으로 움직이는 효과입니다. 미리보기는 장비·재화·보유 오라를 변경하지 않습니다.</p><canvas id="rmAuraCanvas" width="640" height="820" aria-label="캐릭터 뒤 오라 애니메이션 미리보기"></canvas><label for="rmAuraSelect">오라 선택</label><select id="rmAuraSelect">'+g.auraShopItems.map(([name],i)=>'<option value="'+i+'">'+esc(name)+'</option>').join('')+'</select><button id="rmAuraClose">닫기</button></section>';document.body.append(modal);$('rmAuraClose').onclick=()=>modal.classList.remove('show');}
  $('rmAuraSelect').value=String(Math.max(0,state().equippedAura));modal.classList.add('show');$('rmAuraSelect').focus();
 }
 let lastPaint=0;
 function draw(time){requestAnimationFrame(draw);if(time-lastPaint<16||document.hidden||!active()||!state())return;lastPaint=time;const s=state(),map=equipMap(),ix=it=>f.itemIndex(it),hc=$('heroCanvas');if(hc?.clientWidth){const c=hc.getContext('2d');c.clearRect(0,0,hc.width,hc.height);art.hero(c,s,map,ix,time,320,710,640);}
  const preview=$('rmAuraCanvas');if(preview&&$('rmAuraPreview').classList.contains('show')){const c=preview.getContext('2d');c.clearRect(0,0,640,820);art.hero(c,{...s,equippedAura:Number($('rmAuraSelect').value),remodelFx:true},map,ix,time,320,735,620);}
  const canvas=$('combatCanvas');if(canvas&&canvas.clientWidth){const scale=Math.min(window.devicePixelRatio||1,2),cw=Math.round(canvas.clientWidth*scale),ch=Math.round(canvas.clientHeight*scale);if(canvas.width!==cw||canvas.height!==ch){canvas.width=cw;canvas.height=ch}const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.save();c.filter='saturate(.78) contrast(.9) brightness(.88)';const bg=art.frame('worlds',s.regionIndex,3,2);if(bg){const fit=Math.max(w/bg.w,h/bg.h),sw=w/fit,sh=h/fit;c.drawImage(bg.im,bg.x+(bg.w-sw)/2,bg.y+bg.h-sh,sw,sh,0,0,w,h);}c.restore();const shade=c.createLinearGradient(0,0,0,h);shade.addColorStop(0,'#080c12a8');shade.addColorStop(.45,'#080c1210');shade.addColorStop(1,'#080c12ee');c.fillStyle=shade;c.fillRect(0,0,w,h);
   const age=attackMotion&&s.autoBattle?time-attackMotion.started:2000,reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
   const pose=age<150?1:age<280?2:age<430?3:age<560?4:age<700?5:age<840?2:age<960?1:0;
   const step=age<280?Math.sin(age/280*Math.PI/2):age<700?1:age<960?Math.cos((age-700)/260*Math.PI/2):0;
   const impact=attackMotion?.hit&&age>=460&&age<650?Math.sin((age-460)/190*Math.PI):0;
   const narrow=canvas.clientWidth<520;
   const heroX=w*((narrow?.20:.25)+(reduced?0:step*(narrow?.035:.13))),monsterX=w*((narrow?.74:.735)+impact*.006);
   function contact(x,rx){c.save();c.translate(x,h*.794);c.scale(rx,h*.025);const shadow=c.createRadialGradient(0,0,0,0,0,1);shadow.addColorStop(0,'#05090bd0');shadow.addColorStop(1,'#05090b00');c.fillStyle=shadow;c.fillRect(-1,-1,2,2);c.restore();}
   contact(heroX,w*.09);contact(monsterX,w*.18);c.save();c.filter='saturate(.86) contrast(.96) brightness(.94)';
   const bounds=art.monster(c,s.regionIndex*6+s.bossIndex,monsterX,h*.80,w*(narrow?.48:.44),h*(s.bossIndex>=4?.60:.53));
   if(bounds)canvas.dataset.monsterBounds=JSON.stringify(bounds);
   const grip=art.battleHero(c,s,map,ix,time,heroX,h*.79,Math.min(h*.52,w*(narrow?.43:.65)),{pose:reduced?0:pose});canvas.dataset.pose=String(reduced?0:pose);canvas.dataset.facing='right';canvas.dataset.monsterFacing='left';canvas.dataset.attacking=String(age<960);canvas.dataset.heroCenter=String(heroX);if(grip){canvas.dataset.handX=String(grip.handX);canvas.dataset.handY=String(grip.handY)}c.restore();
  }
  for(const [id,name,index,cols,rows]of [['towerArt','tower',Math.max(0,(g.activeTower?.data.floor||1)-1),6,5],['dungeonBossArt','monsters',g.activeDungeon?.type==='gold'?7:g.activeDungeon?.type==='pet'?5:31,6,6]]){const el=$(id);if(el){el.classList.add('rm-enemy-art');el.style.backgroundImage='url(/linsa-rpg/art/'+name+'.png)';el.style.backgroundSize=(cols*100)+'% '+(rows*100)+'%';el.style.backgroundPosition=(index%cols/(cols-1)*100)+'% '+(Math.floor(index/cols)/(rows-1)*100)+'%';}}
 }
 window.RinguRemodel={changed,equipMap,paintPetIcons};
};
})();
