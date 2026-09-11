/* Presentation bridge only. All economic decisions live in ringu-economy. */
(() => {
 'use strict';
 function install(){
  const g=window.RinguCore,session=window.RinguSession;
  if(!g?.state||!window.RinguCloud?.economy||window.RinguEconomy)return;
  const f=g.fn,$=id=>document.getElementById(id),item=id=>g.state.inventory.find(x=>String(x.id)===String(id));
  const messages={REQUEST_TOO_LARGE:'판매 요청이 너무 큽니다. 게임을 새로고침한 뒤 다시 시도해 주세요.',INSUFFICIENT_GOLD:'골드가 부족합니다.',INSUFFICIENT_ESSENCE:'정수가 부족합니다.',INSUFFICIENT_TRANSCENDSTONE:'초월석이 부족합니다.',INSUFFICIENT_PETSTONE:'펫 스톤이 부족합니다.',INSUFFICIENT_TICKET:'뽑기권이 없습니다.',ALREADY_CLAIMED:'이미 받은 보상입니다.',ALREADY_OWNED:'이미 보유하고 있습니다.',ALL_OWNED:'대상 오라를 모두 보유했습니다. 뽑기권은 유지됩니다.',ALL_PETS_MAX:'보유한 모든 펫이 만렙입니다.',ITEM_NOT_OWNED:'현재 보유한 장비가 아닙니다.',ITEM_LOCKED_OR_EQUIPPED:'장착 또는 잠금 해제 후 이용하세요.',ITEM_IN_ESCROW:'경매장에 등록 중인 장비입니다.',PET_NOT_OWNED:'현재 보유한 펫이 아닙니다.',DUNGEON_LOCKED:'입장 횟수 또는 이전 단계 클리어를 확인하세요.',MONSTER_LOCKED:'이전 몬스터를 먼저 처치하세요.',BATTLE_IN_PROGRESS:'현재 전투를 먼저 종료하세요.',COLLECTION_INCOMPLETE:'도감 달성 수가 부족합니다.',SAVE_CONFLICT:'다른 처리가 진행 중입니다. 잠시 후 다시 시도하세요.',INVALID_ARGUMENTS:'입력값을 확인하세요.',INVALID_ENHANCEMENT:'강화·초월 조건을 확인하세요.',ECONOMY_NOT_READY:'서버 업데이트 중입니다. 잠시 후 접속하세요.'};
  let pending=null,pendingName=null,forgeBusy=false,lastSync=0,backgroundRequested=false,lastLayout=null,lastInventory=null;
  const closed=()=>!session.active;
  function busy(value){document.body.classList.toggle('economy-pending',value);document.body.setAttribute('aria-busy',String(value));let status=$('economyRequestStatus');if(!status){status=document.createElement('div');status.id='economyRequestStatus';status.setAttribute('role','status');status.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:2147483646;background:#101a24ee;color:#edd2a1;border:1px solid #b79657;padding:10px 20px;border-radius:8px;pointer-events:none';document.body.append(status);}status.hidden=!value;status.textContent=value?'처리 중… 잠시만 기다려 주세요.':'';}
  async function command(name,args={}){
   if(pending&&pendingName==='sync'&&name!=='sync')await pending.catch(()=>{});
   if(pending||closed())return false;
   const interactive=name!=='sync';pendingName=name;
   if(interactive)busy(true);
   pending=session.economyTransaction(name,args);
   try {const result=await pending;return result;}
   catch(e){f.toast(messages[e.message]||'처리 결과를 확인하지 못했습니다. '+e.message);return false;}
   finally{pending=null;pendingName=null;if(interactive)busy(false);if(backgroundRequested&&document.hidden&&session.active){backgroundRequested=false;void command('background');}}
  }
  function sync(){if(document.hidden||pending||closed()||Date.now()-lastSync<800)return;lastSync=Date.now();return command('sync');}
  function paint(events=[]){
   const s=g.state,c=s.serverCombat,b=s.serverBattle;
   Object.assign(g.combat,{hp:c?.hp??f.currentBoss().hp,elapsed:c?.elapsed??0});
   g.activeTower=b?.type==='tower'?{data:g.towerFloors[b.stage-1],hp:b.hp,elapsed:b.elapsed,serverEconomy:true}:null;
   if(!g.activeDungeon?.serverRoom){
    const data=b?.type==='gold'?g.goldDungeonStages[b.stage-1]:{hp:2000,reward:10};
    g.activeDungeon=b&&b.type!=='tower'?{...b,maxHp:data.hp,reward:data.reward,serverEconomy:true}:null;
   }
   // Combat ticks change HP/currency, not thousands of equipment DOM nodes.
   const layout=JSON.stringify([s.inventory,s.equipped,s.ownedPets,s.equippedPet,s.ownedAuras,s.equippedAura,s.summons,s.regionIndex,s.bossIndex,s.monsterUnlockStep,s.playerGender,s.playerName,s.collectionClaims,s.discovered,s.mailbox,s.dailyRewardClaims,s.petSummonExp,s.discoveredPets,s.claimedPetCollectionRewards]);
   const layoutChanged=layout!==lastLayout;lastLayout=layout;
   // Equipped IDs also change card badges, toggle labels and attack comparisons.
   const inventory=JSON.stringify([s.inventory,s.equipped]),inventoryChanged=inventory!==lastInventory;lastInventory=inventory;
   if(layoutChanged)f.renderAll({inventory:inventoryChanged});else{f.renderTop();f.renderBattle();}
   if($('towerModal')?.classList.contains('show'))f.renderTower();
   if($('dungeonModal')?.classList.contains('show')){if(g.activeDungeon&&!g.activeDungeon.serverRoom){$('dungeonStageList').innerHTML='';$('dungeonBattle').classList.add('show');f.renderDungeonBattle();}else f.renderDungeon();}
   if(layoutChanged&&$('enhanceModal')?.classList.contains('show')){f.renderEnhance();if(forgeBusy){$('enhanceBtn').disabled=true;$('transcendBtn').disabled=true;}}
   if(layoutChanged)for(const name of ['refreshPetUI','renderCollectionRewards','renderAuraShop','renderMailbox']){try{(f[name]||window[name])?.();}catch(e){console.warn('Economy presentation:',name,e.message);}}
   for(const e of events){
    if(e.type==='hit'){
     if(e.target==='field'){window.RinguRemodel?.serverHit();setTimeout(()=>{if(session.active){g.presentation.showDamage(e.damage,e.crit);window.RinguAudio?.effect(e.crit?'critical':'hit');}},460);}
     else if(e.target==='tower')g.presentation.showTowerDamage(e.damage,e.crit);
     else g.presentation.showDungeonDamage(e.damage);
    }else if(e.type==='summon')window.RinguRemodel?.showServerDraw(e.items);
    else if(e.type==='petSummon')f.renderPetSummonResult(e.results);
    else if(e.type==='daily')f.toast('일일 보상 · 정수 +'+e.amount);
    else if(e.type==='sell')f.toast(e.count+'개 판매 · 골드 +'+e.amount.toLocaleString());
    else if(e.type==='battleWon'||e.type==='battleLost'){f.toast(e.type==='battleWon'?'던전 클리어 · 서버에 보상을 저장했습니다.':'시간 초과 · 입장 횟수는 유지됩니다.');window.RinguAudio?.effect(e.type==='battleWon'?'success':'failure');}
    else if(e.type==='offline'&&(e.amount||e.seconds>=60)){
     $('offlineGold').textContent=e.amount?'+'+e.amount.toLocaleString()+' 골드':'처치 0회 · 보상 없음';
     const description=$('offlineModal').querySelector('p:not(.offline-gold)');
     if(description)description.textContent=e.version==='OFF2'?(e.monster||'선택한 몬스터')+' · '+(e.kills||0).toLocaleString()+'회 처치 · '+(e.failures||0).toLocaleString()+'회 시간 초과. 종료 시 장비와 치명타를 반영해 최대 12시간 동안 사냥한 결과입니다.':'보상은 최대 12시간까지 누적됩니다.';
     $('offlineModal').querySelector('button').textContent='확인';$('offlineModal').classList.add('show');
    }
    else if(e.type==='kill')g.presentation.addLog('몬스터 처치 · 골드 +'+e.amount+(e.essence?' · 정수 +1':''));
   }
  }
  window.addEventListener('ringu:economy-state',e=>paint(e.detail?.events||[]));
  // Replace lexical core bindings, not just buttons: old timers cannot grant rewards.
  f.attack=sync;f.towerAttackTick=sync;f.dungeonAttackTick=sync;
  f.finishTowerClearV15=()=>false;f.finishDungeonClearV15=()=>false;
  f.applyMailboxReward=()=>false;f.makeItem=()=>null;f.addPet=()=>null;f.spendGold=()=>false;
  f.drawItems=count=>command('summon',{group:g.drawGroup,count:Number(count)});
  f.equipBest=async()=>{const result=await command('equipBest');if(result)f.toast('최고 공격력 장비를 장착했습니다.');return result;};
  f.toggleEquipItem=async id=>{const it=item(id);if(!it)return false;const removing=g.state.equipped[it.slot]===it.id;const result=await command(removing?'unequip':'equip',removing?{slot:it.slot}:{id:it.id});if(result)f.toast(it.name+(removing?' 장착 해제':' 장착 완료'));return result;};
  f.toggleLock=id=>{const it=item(id);if(it)return command('lock',{id:it.id,locked:!it.locked});};
  f.claimDailyReward=()=>command('daily');
  f.claimCollectionReward=count=>command('collection',{count:Number(count)});
  f.claimMail=id=>command('mail',{id:String(id)});
  f.buyAura=id=>{
   id=Number(id);const product=g.auraShopItems[id];if(!Number.isInteger(id)||!product)return false;
   if(!window.RinguShop)return f.toast('상점을 불러오는 중입니다. 새로고침 후 다시 확인해 주세요.');
   return RinguShop.request(()=>({name:product[0],price:f.auraPrice(id),owned:g.state.ownedAuras.includes(id),description:f.auraEffectText(id),icon:'◉'}),()=>command('auraBuy',{id}));
  };
  f.equipAura=id=>command('auraEquip',{id:Number(id)});
  f.unequipAura=()=>command('auraEquip',{id:-1});
  window.useAuraDrawTicket=()=>command('auraTicket');
  f.buyConsumable=type=>{
   if(!['stone','protect'].includes(type))return false;
   if(!window.RinguShop)return f.toast('상점을 불러오는 중입니다. 새로고침 후 다시 확인해 주세요.');
   return RinguShop.request(()=>({name:type==='protect'?'하락방지권':'초월석',price:type==='protect'?10:25,description:'구매 수량 1개',icon:type==='protect'?'◇':'◆'}),()=>command('consumable',{type}));
  };
  f.summonPet=count=>command('petSummon',{count:Number(count)});
  f.equipPet=uid=>command('petEquip',{uid:String(uid)});
  f.unequipPet=()=>command('petEquip',{uid:null});
  f.lockPet=uid=>command('petLock',{uid:String(uid),locked:true});
  f.unlockPet=uid=>command('petLock',{uid:String(uid),locked:false});
  f.sellPet=uid=>{if(confirm('선택한 펫을 판매할까요? 자동 합성된 수량만큼 판매가가 반영됩니다.'))return command('petSell',{uid:String(uid)});};
  f.claimPetCollectionReward=count=>command('petCollection',{count:Number(count)});
  f.selectRegion=region=>command('select',{region:Number(region),boss:0});
  f.selectBoss=boss=>command('select',{region:g.state.regionIndex,boss:Number(boss)});
  f.toggleAutoBattle=()=>command('auto',{enabled:!g.state.autoBattle});
  f.startTower=stage=>command('startDungeon',{type:'tower',stage:Number(stage)});
  f.startGoldDungeon=stage=>command('startDungeon',{type:'gold',stage:Number(stage)});
  f.startPetDungeon=()=>command('startDungeon',{type:'pet',stage:1});
  f.startDungeonBattle=(type,data)=>type==='stone'?f.toast('파티 대기실에서 시작하세요.'):command('startDungeon',{type,stage:Number(data?.stage)});
  const oldCloseDungeon=f.closeDungeon;
  f.closeDungeon=async()=>{if(g.activeDungeon?.serverRoom||g.dungeonType==='stone')return oldCloseDungeon();if(g.state.serverBattle&&!await command('cancelBattle'))return;$('dungeonModal').classList.remove('show');};
  f.closeTower=async()=>{if(g.state.serverBattle?.type==='tower'&&!await command('cancelBattle'))return;$('towerModal').classList.remove('show');};
  async function forge(trans){
   if(pending&&pendingName==='sync')await pending.catch(()=>{});
   if(forgeBusy||pending||closed())return false;const it=item(g.enhanceId);if(!it)return false;
   forgeBusy=true;g.enhanceBusy=true;$('enhanceStage').className='enhance-stage forging';$('enhanceResult').textContent='서버에서 결과 확인 중…';
   $('enhanceBtn').disabled=true;$('transcendBtn').disabled=true;f.playForgeSound?.();
   const start=performance.now(),result=await command(trans?'transcend':'enhance',trans?{id:it.id}:{id:it.id,protect:!!g.state.useProtect});
   await new Promise(resolve=>setTimeout(resolve,Math.max(0,600-(performance.now()-start))));
   forgeBusy=false;g.enhanceBusy=false;f.renderEnhance();
   const event=result?.result?.events?.find(e=>e.type===(trans?'transcend':'enhance'));
   $('enhanceStage').className='enhance-stage'+(event?(event.success?' success':' fail'):'');
   $('enhanceResult').textContent=event?(event.success?'성공':event.protectedFailure?'실패 · 하락 방지':'실패'):'결과를 확인하지 못했습니다.';
   if(event)window.RinguAudio?.effect(event.success?'forge-success':'forge-failure');return !!result;
  }
  f.tryEnhance=()=>forge(false);f.tryTranscend=()=>forge(true);
  const closeEnhance=f.closeEnhance;f.closeEnhance=()=>forgeBusy?f.toast('강화 결과를 확인한 뒤 닫으세요.'):closeEnhance();
  function sell(items){
   if(!items.length)return f.toast('판매 가능한 장비가 없습니다.');
   const ids=items.map(it=>it.id),total=items.reduce((n,it)=>n+f.sellPrice(it),0);
   let modal=$('rmSellConfirm');if(!modal){modal=document.createElement('div');modal.id='rmSellConfirm';modal.className='modal-bg';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');document.body.append(modal);}
   modal.innerHTML='<section class="modal"><h3>🪙 판매 확인</h3><p>'+ids.length+'개 장비 · '+total.toLocaleString()+' 골드</p><p>판매한 장비는 되돌릴 수 없습니다.</p><button id="rmSellCancel">취소</button><button id="rmSellAccept">확인 · 판매하기</button></section>';
   $('rmSellCancel').onclick=()=>modal.classList.remove('show');$('rmSellAccept').onclick=async()=>{if(pending)return;$('rmSellAccept').disabled=true;const result=await command('sell',{ids});if(result)modal.classList.remove('show');else $('rmSellAccept').disabled=false;};modal.classList.add('show');$('rmSellCancel').focus();
  }
  f.sellItem=id=>{const it=item(id);if(it)return sell([it]);};
  f.bulkSell=rarity=>sell(g.state.inventory.filter(it=>it.rarity<=rarity&&!it.locked&&!Object.values(g.state.equipped).includes(it.id)));
  $('enhanceBtn').onclick=f.tryEnhance;$('transcendBtn').onclick=f.tryTranscend;
  window.RinguEconomy={command,sync,paint};paint(window.RinguCloud.initialEconomyEvents||[]);window.RinguCloud.initialEconomyEvents=[];
  document.addEventListener('visibilitychange',()=>{if(document.hidden){backgroundRequested=true;if(!pending&&session.active){backgroundRequested=false;void command('background');}}else{backgroundRequested=false;void sync();}});
 }
 window.addEventListener('ringu-ready',install);install();
})();
