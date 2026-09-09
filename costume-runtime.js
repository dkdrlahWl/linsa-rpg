/* Authoritative ownership; cosmetic sprites do not alter combat timing. */
(()=>{'use strict';
 let installed=false,current=null;
 const catalog=window.RinguCostumeCatalog;
 function accept(record){
  if(!record||record.schemaVersion!==1||!Array.isArray(record.owned))throw Error('INVALID_COSTUME_STATE');
  if(current&&record.costumeRevision<current.costumeRevision)return current;
  const normalized=catalog.normalizeRecord(record);current=Object.freeze({...record,owned:Object.freeze(normalized.owned),equipped:normalized.equipped});
  if(current.equipped)void RinguCostumeArt.setActive(current.equipped).catch(()=>{});else void RinguCostumeArt.setActive(null);
  window.dispatchEvent(new Event('ringu:costume-update'));return current;
 }
 function install(){
  const g=window.RinguCore,art=window.RinguArt;if(installed||!g?.state||!art?.hero)return;installed=true;
  if(window.RinguCloud?.costume)accept(window.RinguCloud.costume);
  const stats=g.fn.getPlayerStats;g.fn.getPlayerStats=function(...args){const s=stats.apply(this,args);return {...s,attack:catalog.attack(Math.floor(s.attack),current?.owned||[]),costumeBonus:catalog.bonusPercent(current?.owned||[])};};
  const profile=g.fn.ownProfile;g.fn.ownProfile=()=>({...profile(),costumeId:current?.equipped||null});
  for(const name of ['hero','battleHero']){
   const previous=art[name];art[name]=function(ctx,s,equipment,indexOf,time,x,y,height,options={}){
    const id=s===g.state?current?.equipped:s?.costumeId;
    if(id&&Object.hasOwn(catalog.products,id)){
     if(!RinguCostumeArt.isReady(id))void RinguCostumeArt.load(id).catch(()=>{});
     else{const r=RinguCostumeArt.draw(ctx,id,{x,y,height,time,state:s,equipment,indexOf,pose:name==='hero'?null:(options.pose??0)});if(r){
       ctx.canvas.dataset.costume=id;
       if(name==='hero'){
        const p=s.ownedPets?.find(p=>p.uid===s.equippedPet),ix=p?Object.keys(g.PET_DATA||{}).sort().indexOf(p.petId):-1;
        if(ix>=0){const size=Math.min(height*.25,ctx.canvas.width*.25),px=Math.max(20,Math.min(x+height*.27,ctx.canvas.width-size-20)),py=Math.max(20,Math.min(y-size,ctx.canvas.height-size-20));art.sprite(ctx,'pets',ix,5,5,px,py,size,size);ctx.canvas.dataset.petBounds=JSON.stringify({x:px,y:py,width:size,height:size});}else delete ctx.canvas.dataset.petBounds;
       }return {...r,grips:[]};
     }}
    }delete ctx.canvas.dataset.costume;return previous.apply(this,arguments);
   };
  }
  window.addEventListener('ringu:costume-transaction',e=>{
    g.state.essence=(Number(g.state.essence)||0)+e.detail.delta;accept(e.detail.result);g.fn.renderAll();g.fn.save(false);
  });
  g.fn.renderAll();
 }
 window.RinguCostumes={get snapshot(){return current;},accept,
  async refresh(){const r=await fetch('/api/costume',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'status'})});const data=await r.json();if(!r.ok)throw Error(data.error||'캐릭터 정보를 불러오지 못했습니다.');return accept(data);},
  async act(action,id){RinguCore.fn.save(false);return RinguSession.costumeTransaction(action,id);}
 };
 window.addEventListener('ringu-ready',install,{once:true});install();
})();
