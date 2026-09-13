/* Installed before load: compress legacy pets before any stats or card rendering. */
window.installRinguPetStacks=function(g){
 'use strict';if(g.petStacks)return;g.petStacks=true;
 const f=g.fn,m=window.RinguPetStackModel,data=g.PET_DATA,$=id=>document.getElementById(id),esc=v=>f.escapeHtml(String(v)),active=()=>!!g.state&&RinguSession.active!==false;
 let busy=false;
 const normalize=()=>m.normalize(g.state,data),candidates=()=>{normalize();return m.pool(g.state,data);};
 f.migratePetState=normalize;
 f.getSamePetMaterials=()=>[];
 f.levelUpPet=()=>{if(active())f.toast('중복 펫을 얻으면 자동으로 합쳐져 성장합니다.');return false;};
 f.addPet=id=>{if(!active())return null;return m.add(g.state,data,id)?.pet||null;};
 const can=count=>active()&&[1,10].includes(Number(count))&&!busy&&candidates().length>0&&g.state.petStone>=Number(count)*10;
 f.canSummonPet=can;
 function save(){f.refreshPetUI();f.save(false);window.RinguRemodel?.paintPetIcons();}
 f.summonPet=count=>{
  count=Number(count);if(!active()||busy||![1,10].includes(count))return false;normalize();
  if(!candidates().length){f.toast('보유한 모든 펫이 만렙입니다. 소환 비용은 차감되지 않습니다.');return false;}
  if(g.state.petStone<count*10){f.toast('펫 스톤이 부족합니다.');return false;}
  busy=true;const results=[];
  try{
   for(let i=0;i<count;i++){
    const rolled=m.pick(m.pool(g.state,data));if(!rolled)break;
    const isNew=!g.state.discoveredPets.includes(rolled.petId),added=m.add(g.state,data,rolled.petId);
    g.state.petStone-=10;g.state.petSummonExp=(Number(g.state.petSummonExp)||0)+1;
    results.push({type:'pet',petId:rolled.petId,uid:added.pet.uid,isNew,level:added.pet.level,previousLevel:added.previousLevel,copies:added.pet.copies,autoSold:!!added.autoSold,autoSoldStone:added.autoSoldStone||0});
   }
   f.renderPetSummonResult(results);save();
   if(results.length<count)f.toast(results.length+'회만 소환했습니다. 남은 '+(count-results.length)+'회 비용은 차감하지 않았습니다.');
   return true;
  }finally{setTimeout(()=>{busy=false;if(active())f.refreshPetUI();},500);}
 };
 f.sellPet=uid=>{
  if(!active())return false;normalize();const pet=g.state.ownedPets.find(p=>p.uid===String(uid));if(!pet)return false;
  if(pet.uid===g.state.equippedPet||pet.locked){f.toast('장착 중이거나 잠긴 펫은 판매할 수 없습니다.');return false;}
  const gain=m.sale(pet,data);if(!Number.isSafeInteger(g.state.petStone+gain)){f.toast('펫 스톤 보유 한도를 확인해 주세요.');return false;}
  if(!confirm(data[pet.petId].name+' Lv.'+pet.level+' (누적 '+pet.copies+'마리)를 펫 스톤 '+gain+'개에 판매할까요?\n보유한 해당 펫 전체가 판매되며 성장 단계가 초기화됩니다.'))return false;
  if(!active())return false;g.state.ownedPets=g.state.ownedPets.filter(p=>p!==pet);g.state.petStone+=gain;save();f.toast('판매 완료 · 펫 스톤 +'+gain);return true;
 };
 function icon(d){const ix=Object.keys(data).sort().indexOf(d.id),frame=RinguArt.frame('pets',ix,5,5);if(!frame)return '<span class="pet-icon">'+d.icon+'</span>';const src=frame.im.previewURL??=(frame.im.toDataURL());return '<img class="pet-icon rm-pet-art" src="'+src+'" alt="" style="object-fit:contain">';}
 f.renderPetCard=p=>{
  const d=data[p.petId];if(!d)return '';const eq=g.state.equippedPet===p.uid,price=m.sale(p,data),need=m.thresholds[p.level+1],progress=p.level===5?'만렙 · 중복 획득 시 자동판매':(p.copies-m.thresholds[p.level])+' / '+(need-m.thresholds[p.level])+'마리 추가 시 자동 레벨업';
  const button=(action,label,disabled=false)=>'<button data-pet-action="'+action+'" data-pet-uid="'+esc(p.uid)+'" '+(disabled?'disabled':'')+'>'+label+'</button>';
  return '<div class="pet-card g'+d.grade+(eq?' is-equipped':'')+'"><div class="pet-head">'+icon(d)+'<span><strong>'+esc(d.name)+'</strong><small>'+d.grade+'급 · Lv.'+p.level+'/5'+(eq?' · 장착 중':'')+(p.locked?' · 잠금':'')+'</small></span></div><div class="pet-stat-list">'+statList(p)+'</div>'+meter(p.level===5?100:(p.copies-m.thresholds[p.level])/(need-m.thresholds[p.level])*100,'펫 성장')+'<p class="pet-note">'+progress+'<br>누적 '+p.copies+'마리 · 판매가: 펫 스톤 '+price+'개</p><div class="pet-actions">'+button(eq?'unequipPet':'equipPet',eq?'해제':'장착')+button(p.locked?'unlockPet':'lockPet',p.locked?'잠금해제':'잠금')+button('sellPet','판매 +'+price,eq||p.locked)+'</div></div>';
 };
 document.addEventListener('click',e=>{const b=e.target.closest?.('[data-pet-action]');if(!b||b.disabled||!active())return;const action=b.dataset.petAction;if(['equipPet','unequipPet','lockPet','unlockPet','sellPet'].includes(action))f[action](b.dataset.petUid);});
 function meter(value,label){return '<div class="pet-xp-track" role="progressbar" aria-label="'+label+'" aria-valuemin="0" aria-valuemax="100" aria-valuenow="'+Math.round(value)+'"><i style="width:'+value+'%"></i></div>';}
 function summonProgress(){const p=m.progress(g.state.petSummonExp);return '<section class="pet-summon-progress"><div><strong>소환 레벨 <b>Lv.'+p.level+'</b></strong><span>'+(p.needed?p.progress+' / '+p.needed+' EXP':'MAX')+'</span></div>'+meter(p.needed?p.progress/p.needed*100:100,'펫 소환 경험치')+'<small>'+(p.needed?'소환 1회당 경험치 +1 · 다음 레벨까지 '+(p.needed-p.progress)+'회':'소환 최고 레벨 달성')+'</small></section>';}
 function statList(p){return esc(f.petStatText(f.getPetLevelStats(p))).split(' · ').map(t=>'<span>'+t+'</span>').join('');}
 function currencies(){return '<div class="pet-currency"><div><span>펫 스톤</span><b>'+g.state.petStone.toLocaleString()+'</b></div><div><span>펫 티켓</span><b>'+g.state.petTicket.toLocaleString()+'</b></div></div>';}
 function renderManage(){normalize();const s=g.state,eq=s.ownedPets.find(p=>p.uid===s.equippedPet),sorted=[...s.ownedPets].sort((a,b)=>(b.uid===s.equippedPet)-(a.uid===s.equippedPet)||data[b.petId].grade-data[a.petId].grade||b.level-a.level);
  $('petBody').innerHTML=currencies()+'<section class="pet-equipped-summary">'+(eq?icon(data[eq.petId])+'<div><small>함께하는 펫</small><strong>'+esc(data[eq.petId].name)+' <em>Lv.'+eq.level+'</em></strong><div class="pet-stat-list">'+statList(eq)+'</div></div>':'<div><strong>함께할 펫을 장착하세요</strong><small>아래 펫의 장착 버튼을 눌러 능력치를 적용하세요.</small></div>')+'</section>'+summonProgress()+'<div class="pet-list-heading"><strong>보유 펫 <b>'+s.ownedPets.length+'종</b></strong><small>장착 중 · 높은 등급 순</small></div><div class="pet-grid pet-management">'+(sorted.length?sorted.map(f.renderPetCard).join(''):'<div class="empty-list">아직 보유한 펫이 없어요.<br><button onclick="renderPetTab(\'summon\')">첫 펫 소환하기</button></div>')+'</div>';window.RinguRemodel?.paintPetIcons();
 }
 f.renderPetSummonTab=()=>{
  normalize();const s=g.state,pool=m.pool(s,data),rates=[1,2,3,4,5].map(grade=>({grade,rate:pool.filter(x=>x.grade===grade).reduce((n,x)=>n+x.probability,0)}));
  g.PET_SUMMON_RATES.splice(0,g.PET_SUMMON_RATES.length,...rates);
  $('petBody').innerHTML=currencies()+summonProgress()+'<div class="pet-summon-actions"><button '+(can(1)?'':'disabled')+' onclick="summonPet(1)"><strong>1회 소환</strong><small>펫 스톤 10개</small></button><button '+(can(10)?'':'disabled')+' onclick="summonPet(10)"><strong>10회 소환</strong><small>펫 스톤 100개</small></button></div><div class="pet-rule-box"><strong>중복 펫은 자동으로 처리돼요</strong><p>Lv.1~4: 자동 합성으로 성장<br>Lv.5: 새로 나온 중복 펫만 자동판매</p><small>자동판매 보상 · 펫 스톤<br>1급 1개 / 2급 3개 / 3급 8개 / 4급 25개 / 5급 100개</small></div><details class="pet-help"><summary>성장 및 소환 안내</summary><p>Lv.2/3/4/5까지 같은 펫 추가 1/2/3/5마리가 필요합니다. 만렙 펫도 동일 확률로 소환되며, 기존에 장착하거나 잠근 펫은 그대로 유지됩니다. 자동판매되어도 소환 경험치는 획득합니다.</p></details><table class="pet-rate-table"><thead><tr><th>등급</th><th>소환 확률</th></tr></thead><tbody>'+rates.map(r=>'<tr><td>'+r.grade+'급</td><td>'+(r.rate*100).toFixed(3)+'%</td></tr>').join('')+'</tbody></table><details class="pet-help"><summary>개별 펫 확률 · '+pool.length+'종</summary>'+pool.map(r=>'<p>'+esc(data[r.petId].name)+' '+(r.probability*100).toFixed(4)+'%</p>').join('')+'</details>';
 };
 const result=f.renderPetSummonResult;f.renderPetSummonResult=results=>{result(results);$('petResultGrid')?.querySelectorAll('.pet-result-card').forEach((card,i)=>{const r=results[i],small=card.querySelector('small');if(r?.type==='pet'&&small)small.textContent=r.autoSold?'자동판매 · 펫 스톤 +'+r.autoSoldStone:(r.previousLevel?'자동 합성':'첫 보유')+' · Lv.'+r.level+' · 누적 '+r.copies+'마리';});};
 window.RinguPetStacks={normalize,candidates,renderManage,sale:uid=>{normalize();const p=g.state.ownedPets.find(p=>p.uid===uid);return p?m.sale(p,data):0;}};
};
