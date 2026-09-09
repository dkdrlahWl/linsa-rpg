/* Fixed-price equipment marketplace. No local listings or client-side transfers. */
(()=>{'use strict';
 const errors={AUCTION_NOT_READY:'경매장 서버 연동을 준비 중입니다.',ECONOMY_MIGRATION_REQUIRED:'정수·장비의 서버 검증 전환이 필요합니다. 아직 거래할 수 없습니다.',ACCOUNT_MIGRATION_REQUIRED:'계정 장비 이전이 완료되지 않았습니다.',ALREADY_SOLD:'이미 판매된 상품입니다.',LISTING_CLOSED:'판매가 취소된 상품입니다.',LISTING_NOT_FOUND:'상품을 찾을 수 없습니다.',INSUFFICIENT_ESSENCE:'정수가 부족합니다.',ITEM_NOT_OWNED:'실제로 보유한 장비만 등록할 수 있습니다.',ITEM_EQUIPPED:'장착을 먼저 해제해 주세요.',ITEM_LOCKED:'장비 잠금을 먼저 해제해 주세요.',ITEM_UNTRADABLE:'거래할 수 없는 장비입니다.',SELF_PURCHASE:'자신의 상품은 구매할 수 없습니다.',NOT_SELLER:'판매자만 취소할 수 있습니다.',INVALID_NUMBER:'가격은 1 이상의 안전한 정수로 입력해 주세요.',SELLER_BALANCE_LIMIT:'판매자의 정수 보유 한도로 거래할 수 없습니다.',ITEM_STATE_CONFLICT:'장비 상태가 변경되었습니다. 새로 조회해 주세요.',ECONOMY_COMMAND_REQUIRED:'게임 서버 검증 전환이 필요합니다. 거래를 중단했습니다.'};
 window.RinguAuctionMessages=errors;
 let g,modal,body,message,tab='search',page=0,rows=[],ready=false,busy=false,requestSequence=0,timer;
 const esc=s=>g.fn.escapeHtml(String(s??'')),fmt=n=>Number(n).toLocaleString('ko-KR');
 const translate=e=>errors[e.message]||(/ringu_auction|PGRST202/.test(e.message)?errors.AUCTION_NOT_READY:'처리하지 못했습니다. 연결 상태를 확인해 주세요.');
 async function rpc(action,args={},requestId=null){const r=await fetch('/api/auction',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,args,requestId})});const d=await r.json();if(!r.ok)throw Error(d.error||'SERVER_ERROR');return d;}
 const detail=it=>g.fn.gearIcon(it)+'<strong>'+esc(it.name)+'</strong><p>'+esc(g.rarityNames[it.rarity])+' · '+esc(it.slot)+'</p><p>⚔ 공격력 '+fmt(g.fn.itemAtk(it))+'<br>강화 +'+esc(it.enhance||0)+' · 초월 '+esc(it.transcend||0)+'</p><p>'+g.fn.optionText(it)+'</p>';
 function note(text){message.textContent=text;}
 function canList(it){return !it.locked&&!g.fn.isItemEquipped(it)&&it.tradable!==false&&it.tradeable!==false&&!it.bound&&!it.soulbound&&!it.boundTo;}
 function controls(){modal.querySelectorAll('[data-tab]').forEach(b=>{b.disabled=busy;b.classList.toggle('primary',b.dataset.tab===tab);});}
 function filters(){return {page,query:modal.querySelector('[name=query]')?.value||'',slot:modal.querySelector('[name=slot]')?.value||'',rarity:modal.querySelector('[name=rarity]')?.value===''?null:Number(modal.querySelector('[name=rarity]')?.value),sort:modal.querySelector('[name=sort]')?.value||'newest',side:modal.querySelector('[name=side]')?.value||'buy'};}
 function form(){return '<form id="auctionFilters"><input name="query" placeholder="장비 이름 검색" maxlength="80" aria-label="장비 이름"><select name="slot" aria-label="장비 부위"><option value="">모든 부위</option>'+g.slots.map(s=>'<option>'+esc(s)+'</option>').join('')+'</select><select name="rarity" aria-label="등급"><option value="">모든 등급</option>'+g.rarityNames.map((s,i)=>'<option value="'+i+'">'+esc(s)+'</option>').join('')+'</select><select name="sort" aria-label="정렬"><option value="newest">최신 등록순</option><option value="priceAsc">낮은 가격순</option><option value="priceDesc">높은 가격순</option></select><button>검색</button></form>';}
 async function refresh(){
  if(!modal.classList.contains('show')||busy)return;const seq=++requestSequence;
  try{
   const status=await rpc('status');if(seq!==requestSequence)return;ready=status.ready;modal.querySelector('#auctionBalance').textContent='💎 정수 '+fmt(status.essence||0);
   if(!ready){body.innerHTML='';note(errors[status.reason]||errors.AUCTION_NOT_READY);return;}
   if(tab==='list'){
    const available=g.state.inventory.filter(canList),total=available.length;page=Math.max(0,Math.min(page,Math.ceil(total/20)-1));rows=available.slice(page*20,(page+1)*20).map(item=>({item}));body.innerHTML='<p>장착·잠금·거래 불가 장비는 제외됩니다. 수수료 0%.</p><div class="auction-grid">'+rows.map((r,i)=>'<button data-row="'+i+'">'+g.fn.gearIcon(r.item)+'<strong>'+esc(r.item.name)+'</strong><small>'+esc(g.rarityNames[r.item.rarity])+' · '+esc(r.item.slot)+' · 강화 +'+esc(r.item.enhance||0)+'</small></button>').join('')+'</div><div class="auction-pages"><button data-page="-1" '+(page===0?'disabled':'')+'>이전</button><span>'+(page+1)+' / '+Math.max(1,Math.ceil(total/20))+'</span><button data-page="1" '+((page+1)*20>=total?'disabled':'')+'>다음</button></div>';note(total?'판매할 장비를 선택하세요. (총 '+fmt(total)+'개)':'등록할 수 있는 장비가 없습니다.');return;
   }
   const args=filters();if(args.rarity===null||!Number.isFinite(args.rarity))delete args.rarity;
   const result=await rpc(tab,args);if(seq!==requestSequence)return;rows=result.rows;
   const list=body.querySelector('#auctionRows');list.innerHTML=rows.map((r,i)=>'<button data-row="'+i+'">'+g.fn.gearIcon(r.item)+'<strong>'+esc(r.item.name)+'</strong><small>'+esc(g.rarityNames[r.item.rarity])+' · '+esc(r.item.slot)+'</small><b>💎 '+fmt(r.price)+' 정수</b><small>'+esc(r.seller_name||'')+'</small><time>'+esc(new Date(r.traded_at||r.created_at).toLocaleString('ko-KR'))+'</time></button>').join('')||'<p>등록된 물품이나 거래 내역이 없습니다.</p>';
   body.querySelector('#auctionPage').textContent=(page+1)+' / '+Math.max(1,Math.ceil(result.total/20));body.querySelector('[data-page="-1"]').disabled=page===0;body.querySelector('[data-page="1"]').disabled=(page+1)*20>=result.total;note('수수료 0% · 정수로만 거래합니다.');
  }catch(e){if(seq===requestSequence)note(translate(e));}
 }
 function selectTab(value){tab=value;page=0;requestSequence++;controls();body.innerHTML=(tab==='search'?form():tab==='history'?'<label>내역 구분 <select name="side"><option value="buy">구매 내역</option><option value="sell">판매 내역</option></select></label>':'')+(tab==='list'?'':'<div id="auctionRows" class="auction-grid"></div><div class="auction-pages"><button data-page="-1">이전</button><span id="auctionPage"></span><button data-page="1">다음</button></div>');void refresh();}
 async function selected(index){
  const row=rows[index];if(!row||busy||!ready)return;const it=row.item;
  const panel=modal.querySelector('#auctionDetail');panel.innerHTML=detail(it)+(tab==='list'?'<label>판매 가격 (정수)<input id="auctionPrice" inputmode="numeric" autocomplete="off" placeholder="1 이상 정수"></label>':'<h3>💎 '+fmt(row.price)+' 정수</h3>')+'<p id="auctionConfirmBalance"></p>'+(tab==='history'?'':'<button id="auctionConfirm" '+(tab==='search'&&row.mine?'disabled':'')+'>'+(tab==='list'?'등록 확인':tab==='mine'?'판매 취소 확인':row.mine?'내가 등록한 상품':'구매 확인')+'</button>')+'<button id="auctionBack">돌아가기</button>';panel.hidden=false;body.hidden=true;
  panel.querySelector('#auctionBack').onclick=()=>{panel.hidden=true;body.hidden=false;};
  const balanceRequest=tab==='search'?rpc('status'):null;
  const confirmButton=panel.querySelector('#auctionConfirm');if(!confirmButton)return;
  confirmButton.onclick=async()=>{
   if(busy)return;let price=row.price;
   if(tab==='list'){const raw=panel.querySelector('#auctionPrice').value.trim();price=Number(raw);if(!/^\d+$/.test(raw)||!Number.isSafeInteger(price)||price<1)return note(errors.INVALID_NUMBER);}
   const action=tab==='list'?'list':tab==='mine'?'cancel':'buy';
   if(!confirm(it.name+' · 강화 +'+(it.enhance||0)+' · 초월 '+(it.transcend||0)+'\n'+(action==='cancel'?'판매를 취소하고 이 장비를 돌려받을까요?':fmt(price)+' 정수에 '+(action==='list'?'등록':'구매')+'할까요?')))return;
   busy=true;controls();note('서버에서 '+(action==='list'?'등록':action==='buy'?'구매':'취소')+' 처리 중입니다…');panel.querySelectorAll('button,input').forEach(b=>b.disabled=true);
   try{
    if(typeof RinguSession.auctionTransaction!=='function')throw Error('AUCTION_NOT_READY');
    await RinguSession.auctionTransaction(action,action==='list'?{itemId:it.id,price}:{listingId:row.id});
    panel.hidden=true;body.hidden=false;note('처리 완료. 서버 기록을 반영했습니다.');
   }catch(e){note(translate(e));}
   finally{busy=false;controls();panel.querySelectorAll('button,input').forEach(b=>b.disabled=false);void refresh();}
  };
  if(balanceRequest){const label=confirmButton.textContent;confirmButton.disabled=true;confirmButton.textContent='보유 정수 확인 중…';balanceRequest.then(s=>{if(panel.querySelector('#auctionConfirm')!==confirmButton)return;panel.querySelector('#auctionConfirmBalance').textContent='현재 '+fmt(s.essence)+' 정수 → 구매 후 '+fmt(s.essence-row.price)+' 정수';confirmButton.textContent=label;confirmButton.disabled=!!row.mine;}).catch(e=>note(translate(e)));}
 }
 window.addEventListener('ringu-ready',()=>{
  g=RinguCore;modal=document.createElement('div');modal.id='ringuAuction';modal.className='modal-bg';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','경매장');
  modal.innerHTML='<section class="modal"><h2>⚖️ 경매장</h2><p id="auctionBalance"></p><nav class="auction-tabs">'+[['search','물품 검색'],['list','판매 등록'],['mine','내 판매'],['history','거래 내역']].map(([id,name])=>'<button data-tab="'+id+'">'+name+'</button>').join('')+'</nav><p id="auctionMessage" role="status"></p><div id="auctionBody"></div><div id="auctionDetail" hidden></div><button id="auctionClose">닫기</button></section>';document.body.append(modal);body=modal.querySelector('#auctionBody');message=modal.querySelector('#auctionMessage');
  const button=document.createElement('button');button.textContent='⚖️ 경매장';button.onclick=()=>{modal.classList.add('show');body.hidden=false;modal.querySelector('#auctionDetail').hidden=true;selectTab('search');clearInterval(timer);timer=setInterval(refresh,10000);modal.querySelector('#auctionClose').focus();};document.querySelector('#rmFeatureNav nav')?.append(button);
  modal.querySelector('#auctionClose').onclick=()=>{if(busy)return;modal.classList.remove('show');clearInterval(timer);requestSequence++;button.focus();};
  modal.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||busy)return;if(b.dataset.tab)selectTab(b.dataset.tab);if(b.dataset.page){page+=Number(b.dataset.page);void refresh();}if(b.dataset.row)void selected(Number(b.dataset.row));});
  modal.addEventListener('submit',e=>{e.preventDefault();page=0;void refresh();});modal.addEventListener('change',e=>{if(e.target.name==='side'){page=0;void refresh();}});
  for(const type of ['keydown','keyup','pointerdown','pointerup'])modal.addEventListener(type,e=>e.stopPropagation());
  RinguSession.onEnded(()=>{clearInterval(timer);ready=false;});
 },{once:true});
})();
