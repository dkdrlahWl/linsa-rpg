/* Public character inspection and cosmetic-only settings. No private saves are fetched. */
window.installRinguSocial=function(g){
 const f=g.fn,$=id=>document.getElementById(id),esc=s=>f.escapeHtml(String(s??'')),art=window.RinguArt;
 const names=['홍련의 숨결','잿불의 폭풍','여명의 날개','숲의 정령무리','빙하의 서약','심연의 일식','공허의 균열','백야의 성익','별무리의 만화경'];
 const descriptions=['솟아오르는 붉은 불꽃','휘감는 불씨와 열풍','황금빛 깃털의 날개','초록 정령과 바람결','회전하는 서리 결정','빛을 삼키는 어두운 궤도','균열을 가르는 보랏빛 번개','은백색 천상의 날개','별빛이 흐르는 다색 궤적'];
 g.auraShopItems.forEach((a,i)=>a[0]=names[i]);
 const originalProfile=f.ownProfile;f.ownProfile=()=>({...originalProfile(),hideHelmet:true});
 let selected=null,requestId=0;
 const mapProfile=p=>Object.fromEntries((p.equipment||[]).map(v=>[v.s,{slot:v.s,name:v.n,rarity:v.r,enhance:v.e,transcend:v.t}]));
 function show(p){selected=p;$('playerEquipTitle').textContent=p.name+'의 캐릭터';$('playerEquipStats').textContent='⚔ '+Math.floor(p.power||0).toLocaleString()+' · 탑 '+(p.tower||0)+'층 · '+(names[p.equippedAura]||'오라 없음');
  $('playerEquipGrid').innerHTML='<canvas id="rmRankHero" width="520" height="720" aria-label="캐릭터 외형과 오라"></canvas><div class="rm-rank-equipment">'+(p.equipment||[]).map(v=>{const it={slot:v.s,rarity:v.r,name:v.n};return '<div class="rm-rank-item">'+f.gearIcon(it)+'<span>'+esc(v.s)+' · '+esc(v.n)+'<small>⚔ '+Math.floor(v.a||0).toLocaleString()+' · +'+Math.min(15,v.e||0)+' · '+'★'.repeat(Math.min(3,v.t||0))+'</small></span></div>'}).join('')+(!p.equipment?.length?'<p>아직 장착한 장비가 없습니다.</p>':'')+(p.pet?'<p>동료: '+esc(p.pet.n)+' · Lv.'+p.pet.l+'</p>':'')+'</div>';$('playerEquipModal').classList.add('show');
 }
 async function refresh(id,ticket){try{const r=await fetch('/api/characters/'+encodeURIComponent(id));if(!r.ok)throw Error('profile');const p=await r.json();if(ticket===requestId&&$('playerEquipModal').classList.contains('show'))show(p)}catch{if(ticket===requestId)$('playerEquipStats').textContent='최신 외형을 불러오지 못했습니다. 다시 열어 주세요.'}}
 f.openRankingCharacter=i=>{const p=g.rankingProfiles[i];if(!p)return;requestId++;show(p);if(p.id===window.RinguSession.account?.id)show({...f.ownProfile(),id:p.id});else void refresh(p.id,requestId)};
 const poll=setInterval(()=>{if(document.hidden||!window.RinguSession.active)return;if(selected&&$('playerEquipModal').classList.contains('show')){if(selected.id===window.RinguSession.account?.id)show({...f.ownProfile(),id:selected.id});else void refresh(selected.id,requestId)}else if($('profileModal').classList.contains('show'))f.syncRanking()},10000);
 window.RinguSession.onEnded?.(()=>clearInterval(poll));
 const utilityIcon=(el,index)=>{el.textContent='';el.className='rm-consumable-art';el.style.backgroundPosition=(index%2*100)+'% '+(Math.floor(index/2)*100)+'%'};
 function decorate(root){root?.querySelectorAll('.aura-sample').forEach(el=>{const card=el.parentElement,index=Number(card.dataset.auraIndex??names.indexOf(card.querySelector('strong')?.textContent));if(index<0)return;const c=document.createElement('canvas');c.className='rm-shop-aura';c.width=140;c.height=160;c.dataset.aura=String(index);c.setAttribute('aria-label',names[index]+' 움직이는 미리보기');el.replaceWith(c);const small=card.querySelector('small');small.textContent=small.textContent.replace(/원형 회전 오라|원형 오라/g,descriptions[index]);});root?.querySelectorAll('.utility-icon').forEach(el=>{const name=el.parentElement.querySelector('strong')?.textContent;utilityIcon(el,name?.includes('하락')?1:0)})}
 for(const [fn,id]of [['renderAuraShop','auraShopGrid'],['renderItemInventory','itemInventoryGrid']]){const before=f[fn];f[fn]=(...args)=>{const result=before(...args);decorate($(id));return result}}
 let last=0;function draw(t){requestAnimationFrame(draw);if(document.hidden||!window.RinguSession.active||t-last<32)return;last=t;
  document.querySelectorAll('.modal-bg.show .rm-shop-aura').forEach(canvas=>{const c=canvas.getContext('2d');c.clearRect(0,0,140,160);art.aura(c,Number(canvas.dataset.aura),t,70,80,105,145,.95)});
  const cv=$('rmRankHero');if(selected&&cv&&$('playerEquipModal').classList.contains('show')){const c=cv.getContext('2d');c.clearRect(0,0,520,720);const p=selected;art.hero(c,{playerGender:p.gender,equippedAura:p.equippedAura,hideHelmet:p.hideHelmet,remodelFx:g.state.remodelFx,ownedPets:p.pet?[{uid:'rank-pet',petId:p.pet.id}]:[],equippedPet:p.pet?'rank-pet':null},mapProfile(p),f.itemIndex,t,260,660,570)}
 }art.ready.then(()=>requestAnimationFrame(draw));
 for(const name of ['buyAura','buyConsumable']){const before=f[name];f[name]=(...args)=>{const balance=g.state.essence,result=before(...args);if(g.state.essence<balance)window.RinguAudio?.effect('purchase');return result}}
 for(const name of ['equipAura','toggleEquipItem']){const before=f[name];f[name]=(...args)=>{const result=before(...args);window.RinguAudio?.effect('equip');return result}}
 window.RinguSocial={names,descriptions};
};
