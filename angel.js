/* ANGEL1: presentation only; every item is committed by the economy server first. */
(()=>{'use strict';
 const A=window.RinguAngelData,base=new URL('art/celestial/',document.currentScript.src).href;
 const artFile=t=>'gear-'+A.gear.indexOf(t)+'-v3.png';
 const template=it=>it?.rarity===7?A.gear.find(x=>x.slot===it.slot&&x.name===it.name):null;
 const displayName=it=>{const t=template(it);return t?'순백의 세라핌 '+['여명검','광륜','갑옷','각반','장화','반지','귀걸이'][A.gear.indexOf(t)]:it?.name||'';};
 window.installRinguAngel=g=>{
  const f=g.fn;g.rarityNames[7]='천사';g.rarityColors[7]='#f5ffff';
  for(const [key,override] of Object.entries({
   itemIndex:(old,it)=>template(it)?0:old(it),
   itemName:(old,slot,r,i)=>r===7?A.gear.find(x=>x.slot===slot)?.name:old(slot,r,i),
   fixedBaseAtk:(old,slot,r,i)=>r===7?A.gear.find(x=>x.slot===slot)?.baseAtk:old(slot,r,i),
   gearVariantCount:(old,r,slot)=>r===7?1:old(r,slot),
   collectionItems:old=>[...old().filter(x=>x.rarity!==7),...A.gear.map(x=>({...x,enhance:0,transcend:0,optionRolls:[1,1]}))],
   itemAtk:(old,it)=>{const t=template(it);if(!t)return old(it);const lv=Math.max(0,Math.min(15,it.enhance||0));return Math.floor(Math.ceil(t.baseAtk*(lv<=10?1+lv*.05:1.5+(lv-10)*.2))*(1+Math.min(3,it.transcend||0)*(it.slot==='무기'?.8:.5)));},
   itemAttackText:(old,it)=>template(it)?f.itemAtk(it).toLocaleString('ko-KR'):old(it),
   enhanceCost:(old,it)=>template(it)?A.enhanceCosts[it.enhance]||0:old(it),
   transcendCost:(old,it,n)=>template(it)?A.transcendCosts[n-1]||0:old(it,n)
  })){const old=f[key];f[key]=(...args)=>override(old,...args);}
  const icon=window.RinguArt.icon;window.RinguArt.icon=(it,...args)=>{const t=template(it);return t?'<span class="rm-item-art angel-item-art" data-rarity="7"><img src="'+base+artFile(t)+'" alt="'+f.escapeHtml(displayName(t))+'" loading="lazy"></span>':icon(it,...args);};
  f.gearIcon=it=>window.RinguArt.icon(it,f.itemIndex(it));
  const rates=f.openRates;f.openRates=()=>{rates();document.getElementById('rateTable').insertAdjacentHTML('beforeend','<p>천사: 관리자 계정 전용 · 소환 레벨 10 이상에서 1% (다른 등급은 기존 확률의 99%). 일반 계정은 획득할 수 없습니다.</p>');};
  const filter=document.getElementById('rarityFilter');if(filter&&!filter.querySelector('[value="7"]'))filter.add(new Option('천사','7'));
 };
 let run=null;
 function stop(){if(!run)return;for(const timer of run.timers)clearTimeout(timer);run.modal.remove();run.previous?.focus();run=null;}
 function wing(side){return '<svg class="angel-wing '+side+'" viewBox="0 0 260 340" aria-hidden="true"><defs><linearGradient id="feather-'+side+'"><stop stop-color="#a5d5ea"/><stop offset=".6" stop-color="#f2fcff"/><stop offset="1" stop-color="#fff"/></linearGradient></defs>'+(side==='right'?'<g transform="translate(260 0) scale(-1 1)">':'<g>')+Array.from({length:12},(_,i)=>'<path d="M240 310 Q'+(130-i*6)+' '+(230-i*9)+' '+(20+i*11)+' '+(12+i*8)+' Q'+(2+i*9)+' '+(200+i*6)+' 240 310" fill="url(#feather-'+side+')" stroke="#fff" stroke-width="1.2"/>').join('')+'</g></svg>';}
 window.RinguAngelReveal=(item,done)=>{
  stop();const t=template(item);if(!t){done();return;}
  const g=window.RinguCore,f=g.fn,owner=window.RinguSession?.account?.id,modal=document.createElement('section');
  modal.id='angelReveal';modal.className='angel-reveal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','angelName');
  const particles=Array.from({length:32},(_,i)=>'<i style="--a:'+(i*137.5)+'deg;--d:'+(100+i%5*38)+'px;--delay:'+(i%6*45)+'ms"></i>').join('');
  const extra='<div class="angel-portal" aria-hidden="true"><i></i><i></i><i></i></div><div class="angel-rays" aria-hidden="true"></div><div class="angel-shockwave" aria-hidden="true"></div><div class="angel-starburst" aria-hidden="true">'+particles+'</div><div class="angel-vignette" aria-hidden="true"></div>';
  modal.innerHTML=extra+'<div class="angel-sky"></div><div class="angel-cinematic" aria-hidden="true"></div><div class="angel-lightbeam"></div><div class="angel-ring ring-one"></div><div class="angel-ring ring-two"></div>'+wing('left')+wing('right')+'<div class="angel-feathers" aria-hidden="true">'+Array.from({length:24},(_,i)=>'<i style="--i:'+i+';--x:'+((i*43)%100)+'%"></i>').join('')+'</div><div class="angel-content"><small>CELESTIAL AWAKENING</small><div class="angel-grade">천사</div><div class="angel-object"><span class="angel-item-halo" aria-hidden="true"></span><img src="'+base+artFile(t)+'" alt="'+f.escapeHtml(displayName(t))+'"></div><div class="angel-details"><p>순백의 축복이 깨어납니다</p><h2 id="angelName">'+f.escapeHtml(displayName(t))+'</h2><p>'+f.escapeHtml(item.slot)+' · 공격력 '+f.itemAtk(item).toLocaleString('ko-KR')+'</p><div>'+f.optionText(item)+'</div></div><button disabled>천사가 강림하는 중…</button></div>';
  const r={modal,owner,previous:document.activeElement,timers:[]};run=r;document.body.append(modal);
  const valid=()=>run===r&&window.RinguSession?.active!==false&&window.RinguSession?.account?.id===owner;
  const later=(fn,ms)=>r.timers.push(setTimeout(()=>{if(valid())fn();else if(run===r)stop();},ms));
  window.RinguAudio?.effect('angel-rise');
  later(()=>modal.classList.add('opening'),600);
  later(()=>{modal.classList.add('wings');window.RinguAudio?.effect('angel-wings');},2200);
  later(()=>modal.classList.add('gather'),3200);
  later(()=>{modal.classList.add('manifest');window.RinguAudio?.effect('angel-blessing');},4000);
  later(()=>modal.classList.add('details'),5000);
  later(()=>window.RinguAudio?.effect('angel-crown'),5400);
  later(()=>{modal.classList.add('ready');const b=modal.querySelector('button');b.disabled=false;b.textContent='축복받은 장비 확인';b.focus();},A.duration);
  modal.querySelector('button').onclick=()=>{if(!valid()||!modal.classList.contains('ready'))return;stop();done();};
  modal.addEventListener('keydown',e=>{if(e.key==='Escape'||e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();modal.querySelector('button:not(:disabled)')?.focus();}});
  window.RinguSession?.onEnded?.(stop);
 };
 window.RinguAngel={template,stop,displayName};
})();
