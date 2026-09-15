const g=window.RinguCore, session=window.RinguSession;
if(g&&session&&!document.getElementById('goldTransferButton')){
 const fmt=n=>Number(n).toLocaleString('ko-KR');
 const style=document.createElement('style');style.textContent=`
 #goldTransferButton .gt-icon{font-size:20px;line-height:22px;color:#efcf78}
 #goldTransferModal{box-sizing:border-box;width:min(420px,calc(100vw - 16px));max-height:calc(100dvh - 20px);padding:14px;border:1px solid #a58c57;border-radius:12px;background:#101d28;color:#e8e1cf;overflow:auto;font:13px/1.5 system-ui}
 #goldTransferModal::backdrop{background:#020810dc}#goldTransferModal *{box-sizing:border-box}
 #goldTransferModal header{display:flex;align-items:center;justify-content:space-between;gap:10px}#goldTransferModal h2{margin:0;font-size:20px}
 #goldTransferModal button,#goldTransferModal input{font:inherit;min-height:38px;border:1px solid #536576;border-radius:6px;background:#1c3040;color:#eee;padding:6px 9px;min-width:0}
 #goldTransferModal button{cursor:pointer}#goldTransferModal button:disabled{opacity:.45;cursor:default}#goldTransferModal button:focus-visible{outline:2px solid #f4d88c}
 #goldTransferModal select{width:100%;padding:8px;background:#1c3040;color:#eee;border:1px solid #536576;border-radius:6px;font:inherit}#goldTransferModal input{width:100%;margin-top:4px}#goldTransferModal label{display:block;margin-top:10px}
 #gtPeople{display:grid;gap:4px;max-height:210px;overflow:auto;margin-top:7px}
 #gtPeople button{display:flex;justify-content:space-between;align-items:center;text-align:left;gap:10px}#gtPeople button strong{overflow-wrap:anywhere}#gtPeople button small{color:#b6c6ce;white-space:nowrap}
 #gtPeople button[aria-pressed=true]{border-color:#e9c875;background:#51452c}#gtChosen{color:#f3d78c;overflow-wrap:anywhere}
 #gtStatus{min-height:20px;color:#efd19c}#gtConfirm{width:100%;margin-top:12px;background:#735b2b!important;color:#fff5d4!important}#gtReview{border:1px solid #8c7847;padding:10px;border-radius:7px;margin-top:12px}
 #goldTransferModal [hidden]{display:none!important}
 @media(max-width:600px){body[data-remodel] .header-actions{gap:3px!important}body[data-remodel] .brand{font-size:19px!important;letter-spacing:1px!important}body[data-remodel] .header-actions #goldTransferButton{font-size:10px!important}}
 `;document.head.append(style);
 const button=document.createElement('button');button.id='goldTransferButton';button.type='button';button.innerHTML='<span class="gt-icon" aria-hidden="true">⇄</span><span>송금</span>';button.setAttribute('aria-label','유저에게 골드·초월석·정수 송금');document.querySelector('.header-actions')?.prepend(button);
 const modal=document.createElement('dialog');modal.id='goldTransferModal';modal.setAttribute('aria-labelledby','gtTitle');modal.innerHTML='<header><h2 id="gtTitle">재화 송금</h2><button id="gtClose" type="button">닫기</button></header><label>보낼 재화<select id="gtResource"><option value="gold">골드</option><option value="transcendStone">초월석</option><option value="essence">정수</option></select></label><p>보유 <span id="gtResourceName">골드</span> <b id="gtBalance">—</b> · 송금량에서 5% 공제 · 우편 수령</p><section id="gtForm"><button id="gtPickRank" type="button">랭킹에서 받는 사람 선택</button><p id="gtChosen">받는 사람을 선택해 주세요.</p><label>보낼 수량<input id="gtAmount" type="text" inputmode="numeric" placeholder="2 이상의 정수" autocomplete="off"></label></section><div id="gtReview" hidden></div><p id="gtStatus" role="status" aria-live="polite"></p><button id="gtConfirm" type="button" disabled>송금 내용 확인</button><button id="gtBack" type="button" hidden>수정</button>';document.body.append(modal);
 const $=id=>document.getElementById(id);let people=[],chosen=null,balance=0,busy=false,review=null,generation=0,picking=false;
 const names={gold:'골드',transcendStone:'초월석',essence:'정수'};let resource='gold',balances={};
 const errors={INSUFFICIENT_RESOURCE:'선택한 재화가 부족합니다.',TRANSFER_TOO_SMALL:'수령량이 1 이상이 되도록 2 이상 입력해 주세요.',INSUFFICIENT_GOLD:'골드가 부족합니다.',TRANSFER_SELF:'자신에게 송금할 수 없습니다.',TRANSFER_RECIPIENT_UNAVAILABLE:'현재 랭킹에서 받을 유저를 찾을 수 없습니다.',TRANSFER_RECIPIENT_LIMIT:'받는 사람의 재화 보유 한도를 초과합니다.',INVALID_ARGUMENTS:'송금 금액을 확인해 주세요.',ECONOMY_NOT_READY:'서버 준비 후 다시 시도해 주세요.'};
 function amount(){const raw=$('gtAmount').value.trim();return /^\d+$/.test(raw)?Number(raw):NaN;}
 function validate(){const n=amount();$('gtConfirm').disabled=busy||!chosen||!Number.isSafeInteger(n)||n<2||n>balance||n>9000000000000;}
 const identity=p=>p.name+' · '+p.rank+'위 · 공격력 '+fmt(p.power)+' · ID '+p.id.slice(-8);
 function pickRank(){if(busy)return;modal.close();picking=true;g.fn.openProfile();let note=document.getElementById('gtRankHint');if(!note){note=document.createElement('p');note.id='gtRankHint';note.style.cssText='color:#ffdf8c;font-size:12px;margin:6px 12px;line-height:1.5';document.getElementById('rankList').before(note);}note.textContent='송금 받을 유저를 선택하세요. 같은 닉네임도 선택한 계정으로 송금됩니다.';}
 const closeRank=g.fn.closeProfile;g.fn.closeProfile=(...args)=>{picking=false;document.getElementById('gtRankHint')?.remove();return closeRank(...args);};
 document.getElementById('rankList').addEventListener('click',event=>{
  if(!picking)return;const row=event.target.closest('.rk-row');if(!row)return;
  event.preventDefault();event.stopImmediatePropagation();
  const profile=(g.rankingProfiles||[]).find(p=>p.id===row.dataset.rkProfile);
  if(!profile||profile.id===session.account?.id){document.getElementById('gtRankHint').textContent='자신에게는 송금할 수 없습니다. 다른 유저를 선택하세요.';return;}
  if(!people.some(p=>p.id===profile.id)){document.getElementById('gtRankHint').textContent='현재 송금 가능한 유저가 아닙니다. 다시 선택해 주세요.';return;}
  const rank=[...document.querySelectorAll('#rankList .rk-row')].indexOf(row)+1;
  chosen={id:profile.id,name:profile.name,power:profile.power,rank};g.fn.closeProfile();form();$('gtChosen').textContent='받는 사람: '+identity(chosen);$('gtStatus').textContent='선택한 계정의 ID로 송금됩니다.';modal.showModal();$('gtAmount').focus();validate();
 },true);
 function form(){review=null;$('gtResource').disabled=false;$('gtReview').hidden=true;$('gtForm').hidden=false;$('gtBack').hidden=true;$('gtConfirm').textContent='송금 내용 확인';validate();}
 async function open(){if(!session.active)return;generation++;const ticket=generation;chosen=null;people=[];busy=false;balance=0;$('gtAmount').value='';$('gtChosen').textContent='받는 사람을 선택해 주세요.';$('gtStatus').textContent='랭킹 유저를 불러오는 중…';$('gtBalance').textContent='—';form();modal.showModal();try{const response=await fetch('/api/gold-transfer',{method:'POST',body:JSON.stringify({action:'status'}),headers:{'Content-Type':'application/json'}}),data=await response.json();if(!response.ok)throw Error(data.error);if(ticket!==generation||!modal.open)return;people=data.rows;balances=data.balances||{gold:data.gold};resource=$('gtResource').value;balance=balances[resource]||0;$('gtBalance').textContent=fmt(balance);$('gtResourceName').textContent=names[resource];$('gtStatus').textContent='골드·초월석·정수를 보낼 수 있습니다.';validate();pickRank();}catch(e){if(ticket===generation)$('gtStatus').textContent=errors[e.message]||'목록을 불러오지 못했습니다. 닫고 다시 시도해 주세요.';}}
 button.onclick=open;$('gtClose').onclick=()=>{if(!busy){generation++;modal.close();button.focus();}};modal.addEventListener('cancel',e=>{if(busy)e.preventDefault();else generation++;});
 $('gtResource').onchange=()=>{if(busy)return;resource=$('gtResource').value;balance=balances[resource]||0;$('gtBalance').textContent=fmt(balance);$('gtResourceName').textContent=names[resource];form();};
 $('gtPickRank').onclick=pickRank;$('gtAmount').oninput=validate;$('gtBack').onclick=form;
 $('gtConfirm').onclick=async()=>{
  if(busy)return;validate();if($('gtConfirm').disabled)return;
  if(!review){review={recipient:chosen.id,name:chosen.name,identity:identity(chosen),amount:amount(),resource};$('gtForm').hidden=true;$('gtReview').hidden=false;$('gtReview').textContent=review.identity+' 계정에 '+names[review.resource]+' '+fmt(review.amount)+'개를 보냅니다. 수수료 '+fmt(Math.ceil(review.amount/20))+'개 · 총 차감 '+fmt(review.amount)+'개 · 우편 수령량 '+fmt(review.amount-Math.ceil(review.amount/20))+'개 (수수료 소수점 올림)';$('gtResource').disabled=true;$('gtBack').hidden=false;$('gtConfirm').textContent='확인 · 보내기';$('gtStatus').textContent='받는 사람과 재화·수량을 확인해 주세요.';return;}
  busy=true;validate();$('gtClose').disabled=true;$('gtBack').disabled=true;$('gtStatus').textContent='송금 중…';
  try{const sent=review,result=await session.goldTransferTransaction(sent.recipient,sent.amount,sent.resource);if(!result.ok)throw Error('UNCONFIRMED');chosen=null;$('gtAmount').value='';balances={gold:g.state.gold,essence:g.state.essence,transcendStone:g.state.transcendStone};balance=balances[resource]||0;$('gtBalance').textContent=fmt(balance);form();$('gtChosen').textContent='받는 사람을 선택해 주세요.';$('gtStatus').textContent=sent.identity+' 계정에 '+names[sent.resource]+' '+fmt(sent.amount)+'개 송금 완료 · 상대 우편 수령량 '+fmt(result.received??(sent.amount-Math.ceil(sent.amount/20)))+'개';}
  catch(e){$('gtStatus').textContent=errors[e.message]||e.message||'송금 결과를 확인해 주세요.';}
  finally{busy=false;$('gtClose').disabled=false;$('gtBack').disabled=false;validate();}
 };
}

