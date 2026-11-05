import {RARITY_SIZE_CAP,fishMaxWeight,fishBagSize,fishingDailyCasts,FISHING_DAILY_CASTS,ROD_MAX,fishingQuestsReady,FISH,SPOTS,RARITIES,BAITS,FISHING_QUESTS,REWARD_RATES,fishPrice,fishYield,fishWeight,rodGoldCost,rodDiamondCost,resourceName,aquariumExpandCost,DIAMOND_EXCHANGE,DIAMOND_EXCHANGE_DAILY,CONTEST_REWARDS,CONTEST_START,CONTEST_CLOSED,CONTEST_LAST,contestWeek,contestWeekEnd,contestTarget,FISH_SIZES,MUTATIONS,fishSizeOf,fishMutationOf,ROD_TOKEN_BONUS,ROD_RARE_BONUS,ENCHANT_SLOT_TIERS,enchantSlotCount,ENCHANT_TIERS,ENCHANTS,enchantCost,enchantText,FUSE_COUNT,FUSE_CHANCE,GOLD_FUSE_COUNT,GOLD_FUSE_CHANCE,AWAKEN_MAX,AWAKEN_BONUS,fishingEnchant,FISHING_AUTO_PLANS,ROD_TIERS,rodTier} from './fishing-data.mjs';
import {mountFishingScene} from './fishing-motion.mjs?v=fishing-line-180';
import {startFishingFx,stopFishingFx,fishingFxBusyUntil} from './fishing-fx.mjs?v=fx2-20261105';
import {FISHING_PROTOCOL,normalizeFishing,aquariumBank,aquariumHourly,fishingMeter,fishingStep,fishingMeterWon,FISHING_TICK_MS,rodPower} from './fishing-model.mjs';
import {fantasyHeader,fantasyFooter} from './fantasy-ui.mjs';
import {currencyIconURL} from './currency-icons.mjs';
import {replacePreservingDetails} from './disclosure-state.mjs';
const fmt=n=>Math.floor(n||0).toLocaleString('ko-KR');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const fishingUI={spot:'brook',bait:'worm',panel:'fish',collectionSpot:'brook',auto:false,notify:null,locks:[]};
const tokenIcon=`<img class="fishing-token-icon" src="${new URL('./fishing/fishing-token-v2.webp',import.meta.url).href}" alt="낚시 토큰" width="24" height="24" decoding="async">`;
// v3: 크기·돌연변이·각성 표시
const sizeBadge=fish=>{const z=fishSizeOf(fish);return z.id==='normal'?'':`<em class="fish-size fish-size-${z.id}" style="--size:${z.color}">${z.name}</em>`;};
const mutBadge=fish=>{const m=fishMutationOf(fish);return m?`<em class="fish-mut fish-mut-${m.id}" style="--mut:${m.color}">${m.name}</em>`:'';};
const starBadge=fish=>fish.star?`<em class="fish-star">${'★'.repeat(fish.star)}</em>`:'';
export const catchLabel=fish=>{const z=fishSizeOf(fish),m=fishMutationOf(fish);return [z.id!=='normal'?z.name:'',m?m.name:''].filter(Boolean).join(' ');};
const NEW_FISHING_ART=/^(?:fish-(?:5[1-9]|[67]\d|80)|scene-(?:palace|volcano|origin)(?:-thumb)?|rod-(?:50|60|70))$/;
const url=id=>new URL('./fishing/'+id+'.webp'+(NEW_FISHING_ART.test(id)?'?v=fishing-expansion-art-20261025':''),import.meta.url).href;
export const fishingRodArt=tier=>ROD_TIERS[Math.max(1,Math.min(ROD_TIERS.length,tier||1))-1].art;
export const fishingArt=id=>['cube','scroll','highCube','primeCube','addCube'].includes(id)?currencyIconURL(id):url(id);
const image=(id,cls='',alt='')=>`<img class="${cls}" src="${fishingArt(id)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
const MENU_ART={records:'collection',fish:'fish',tank:'tank',rod:'rod',shop:'shop',quests:'quests',collection:'collection',contest:'collection',exchange:'shop'};
const ACTION_ART={fishAquariumAuto:'tank',fishAuto:'cast',fishCast:'cast',fishHook:'cast',fishCancel:'cancel',fishBaitBuy:'shop',fishTrain:'upgrade',fishUpgrade:'upgrade',fishSell:'sell',fishSellAll:'sell',fishSellAllConfirm:'sell',fishAquariumAdd:'tank',fishAquariumRemove:'tank',fishAquariumClaim:'sell',fishAquariumExpand:'upgrade',fishQuestClaim:'quests',fishExchange:'shop',fishContestClaim:'quests',fishCollectionSpot:'map',fishEnhance:'upgrade',fishEnchant:'upgrade',fishEnchantLock:'rod',fishFuse:'tank',fishGoldFuse:'tank',fishAwaken:'upgrade',fishAutoBuy:'shop',fishRodBuy:'shop'};
const menuIcon=id=>`<img class="fishing-button-art" src="${url(id==='rod'?'rod-tier-16':'menu-'+id)}" alt="" width="28" height="28" decoding="async">`;
const button=(text,action,arg='',disabled=false,cls='')=>{const icon=action==='fishPanel'?MENU_ART[arg]:action==='eventPage'?(arg==='lotto'?'lotto':arg==='treasure'?'treasure':'cast'):ACTION_ART[action]||'map',write=action.startsWith('fish')&&!['fishPanel','fishCollectionSpot','fishSpot','fishSellAll','fishAuto','fishEnchantLock'].includes(action);return `<button class="${cls}" data-illustrated="1" data-action="${action}" data-arg="${arg}" ${write?'data-fish-write data-write="1"':''} ${disabled?'disabled data-unavailable':''}>${menuIcon(icon)}<span>${text}</span></button>`;};
function fishCard(fish,place='bag',f=null){
 const d=FISH.find(x=>x.id===fish.species),r=RARITIES[d.rarity],m=fishMutationOf(fish),z=fishSizeOf(fish);
 const feed=place==='tank'&&f?f.fish.filter(x=>x.species===fish.species).length:0,need=(fish.star||0)+1;
 return `<article class="fish-card${m?' mut-'+m.id:''} size-${z.id}" style="--rarity:${r.color}"><div class="fish-portrait">${image(d.id,'',d.name)}<span>${r.name}</span>${sizeBadge(fish)}${mutBadge(fish)}</div><strong>${d.name}${starBadge(fish)}</strong><small>${fishWeight(fish.weight)}</small><b>${place==='tank'?fmt(fishYield(fish,f?fishingEnchant(f,'tank'):0))+' G / 시간':tokenIcon+' '+fmt(fishPrice(fish))+' 토큰'}</b><div>${place==='tank'?button('꺼내기','fishAquariumRemove',fish.id)+((fish.star||0)<AWAKEN_MAX?button(`각성 ${feed}/${need}`,'fishAwaken',fish.id,feed<need):''):button('판매','fishSell',fish.id)+button('수족관','fishAquariumAdd',fish.id)}</div></article>`;
}
// v3 합성 후보: 같은 종·같은 크기 3마리 이상(기록급 제외), 황금 5마리 이상.
function fusePanel(f){
 const groups=new Map();for(const x of f.fish){const z=fishSizeOf(x);if(z.id==='record')continue;const k=x.species+':'+z.id;groups.set(k,[...(groups.get(k)||[]),x]);}
 const rows=[...groups.entries()].filter(([,l])=>l.length>=FUSE_COUNT).map(([k,l])=>{const [sp,size]=k.split(':'),d=FISH.find(x=>x.id===sp),i=FISH_SIZES.findIndex(x=>x.id===size),next=FISH_SIZES[i+1];return {d,size:FISH_SIZES[i],next,count:l.length,chance:FUSE_CHANCE[i],rarity:d.rarity};}).sort((a,b)=>b.rarity-a.rarity||FISH_SIZES.indexOf(b.size)-FISH_SIZES.indexOf(a.size)).slice(0,12);
 const golds=f.fish.filter(x=>x.mut==='gold').length;
 if(!rows.length&&golds<GOLD_FUSE_COUNT)return '';
 return `<section class="fish-fuse"><h3>🧬 합성 (도박) <small>같은 종·같은 크기 ${FUSE_COUNT}마리 → 같은 종 1마리 · 성공하면 더 크게(가끔 두 단계!) · 실패하면 1마리만 남음 · 돌연변이가 새로 붙을 수도</small></h3><div class="fish-fuse-list">${rows.map(x=>`<div class="fish-fuse-row" style="--rarity:${RARITIES[x.rarity].color}">${image(x.d.id,'',x.d.name)}<span><b>${x.d.name}</b><small>${x.size.name} ${x.count}마리 → ${x.next.name} ${Math.round(x.chance*100)}%</small></span>${button('합성','fishFuse',x.d.id+':'+x.size.id)}</div>`).join('')}${golds>=GOLD_FUSE_COUNT?`<div class="fish-fuse-row gold"><span class="fish-fuse-icon">✨</span><span><b>황금 합성</b><small>황금 개체 ${GOLD_FUSE_COUNT}마리 → ${Math.round(GOLD_FUSE_CHANCE*100)}% 무지개 (가장 높은 등급) · 보유 ${golds}마리</small></span>${button('황금 합성','fishGoldFuse','')}</div>`:''}</div></section>`;
}
// 대어 대회 보상 중 아직 안 받은 주(서버 순위 기준).
export const contestRewardsReady=f=>(fishingUI.contest?.rewards||[]).filter(r=>!(f?.contestClaims||[]).includes(r.week)).length;
const leftText=ms=>{const h=Math.max(0,Math.floor(ms/3600000));return h>=24?Math.floor(h/24)+'일 '+(h%24)+'시간':h+'시간 '+Math.max(0,Math.floor(ms%3600000/60000))+'분';};
function contestPanel(f){
 const now=Date.now(),current=CONTEST_CLOSED?CONTEST_LAST:contestWeek(now),week=current<CONTEST_START?CONTEST_START:current,target=contestTarget(week),d=FISH.find(x=>x.id===target.species),spot=SPOTS.find(x=>x.id===target.spot),r=RARITIES[d.rarity],board=fishingUI.contest,started=current>=CONTEST_START;
 const mine=f.contest?.[week],pending=(board?.rewards||[]).filter(x=>!(f.contestClaims||[]).includes(x.week));
 const name=id=>FISH.find(x=>x.id===id)?.name||'';
 const rows=(list,me=true)=>list.length?list.map(x=>`<li class="${x.isMe?'me':''}"><b>${x.rank}위</b><span>${esc(x.name)}</span><em>${fishWeight(x.weight)}</em></li>`).join(''):'<li class="empty">아직 기록이 없어요.</li>';
 return `<div class="fishing-panel-title"><div><h2>주간 대어 대회</h2><small>${CONTEST_CLOSED?'대회가 마감됐어요 · 11/02 주 최종 순위 · 1~3위 보상은 우편으로 보냈어요':started?'종료까지 '+leftText(contestWeekEnd(week)-now)+' · 월요일 0시 초기화':'10월 26일(월) 0시 시작'} · 참가 ${fmt(board?.total)}명</small></div></div>
 <article class="fishing-contest-target" style="--rarity:${r.color}">${image(d.id,'',d.name)}<div><small>이번 주 대상 · ${spot.name} (${Math.max(spot.level,d.level)}단계 낚싯대)</small><strong>${d.name} <em>${r.name}</em></strong><span>가장 무거운 한 마리로 순위 · 최대 ${fishWeight(d.max)}</span><span>내 기록 <b>${mine?fishWeight(mine.weight):'없음'}</b></span></div></article>
 ${pending.map(x=>`<article class="fishing-quest">${image('diamond')}<div><strong>${x.week.slice(5).replace('-','/')} 주 대어 대회 ${x.rank}위!</strong><small>${(c=>'다이아 '+c.diamonds+'개 · 에디셔널 큐브 '+c.addCube+'개')(CONTEST_REWARDS.find(c=>c.rank===x.rank))}</small></div>${button('보상 받기','fishContestClaim',x.week)}</article>`).join('')}
 <div class="fishing-contest-rewards">${CONTEST_REWARDS.filter((c,i)=>i<2).map(c=>`<span><b>${c.rank===1?'1위':'2~3위'}</b> 다이아 ${c.diamonds} · 에디셔널 큐브 ${c.addCube}</span>`).join('')}<span><b>4위~</b> 보상 없음</span></div>
 <div class="fishing-contest-board"><h3>${CONTEST_CLOSED?'최종 순위':'이번 주 순위'}</h3><ol>${board?rows(board.top):'<li class="empty">순위를 불러오는 중…</li>'}</ol>${board?.last?.length?`<h3>지난주 1~3위 · ${name(board.last[0].species)}</h3><ol>${rows(board.last)}</ol>`:''}</div>
 <p class="fishing-note">보상은 대회가 끝난 뒤 4주 안에 여기서 받을 수 있어요.</p>`;
}
// 2026-11-05 도현: 풀스크린 낚시터 — 최근 잡은 3마리, 대박(대어 이상·돌연변이·기록 갱신) 카드.
function recentStrip(f){const list=(f.fish||[]).slice(-3).reverse();if(!list.length)return '';return `<div class="fishing-recent" aria-label="최근 잡은 물고기">${list.map(x=>{const d=FISH.find(y=>y.id===x.species),z=fishSizeOf(x),m=fishMutationOf(x);if(!d)return '';return `<button type="button" data-action="fishPanel" data-arg="fish" class="fishing-recent-item${m?' mut':''}" style="--rarity:${m?.color||RARITIES[d.rarity].color}">${image(d.id,'',d.name)}<small>${m?m.name:z.id==='normal'?RARITIES[d.rarity].name:z.name}</small></button>`;}).join('')}</div>`;}
export const isBigCatch=c=>!!(c?.won&&c.reward==='fish'&&c.fish&&(['big','monster','record'].includes(c.fish.size)||c.fish.mut||c.records?.length));
function bigCatchCard(f,caught,d){
 if(!d||fishingUI.auto||!isBigCatch(caught)||fishingUI.seenCatch===caught.at)return '';
 const x=caught.fish,z=fishSizeOf(x),m=fishMutationOf(x),r=RARITIES[d.rarity],rec=caught.records?.at(-1),inBag=(f.fish||[]).some(y=>y.id===x.id),col=z.id==='record'?z.color:m?.color||r.color;
 return `<div class="fishing-bigcatch" style="--c:${col}" role="dialog" aria-label="대박 물고기"><div class="fishing-bigcatch-card"><div class="fishing-bigcatch-badges">${z.id!=='normal'?`<span style="--b:${z.color}">${z.name}</span>`:''}${m?`<span style="--b:${m.color}">${m.name}</span>`:''}<span style="--b:${r.color}">${r.name}</span></div>${image(d.id,'fishing-bigcatch-art',d.name)}<b>${d.name}</b><strong>${fishWeight(x.weight)}</strong><em>${tokenIcon} ${fmt(fishPrice(x))} 토큰</em>${rec?`<p class="fishing-bigcatch-record">🏆 ${r.name} 최고 기록 갱신!${rec.previous?' (이전 '+fishWeight(rec.previous)+')':''}</p>`:''}<div class="fishing-bigcatch-actions"><button type="button" data-action="fishCatchClose">가방에 넣기</button>${inBag&&f.aquarium.length<f.slots?`<button type="button" class="fishing-gold" data-action="fishCatchTank" data-arg="${x.id}">🐠 수족관에 넣기</button>`:''}</div></div></div>`;
}
// 2026-11-05 도현: 대어 랭킹 — 등급별·전체 역대 가장 무거운 한 마리. 잡을 때마다 기록이 갱신되고 20초마다 순위를 새로 불러온다.
function recordsPanel(f){
 const board=fishingUI.records,tab=fishingUI.recordTab??'all',best=(fishingUI.staff?{}:f.best)||{};
 const kg=w=>fishWeight(w),fname=id=>FISH.find(x=>x.id===id)?.name||'';
 const tabs=[['all','전체'],...RARITIES.map((r,i)=>[String(i),r.name])];
 const list=tab==='all'?board?.top:board?.grades?.[tab];
 const row=x=>{const r=RARITIES[x.rarity??Number(tab)]||RARITIES[0];return `<li class="${x.isMe?'me':''}" style="--rarity:${r.color}"><b>${x.rank}위</b>${image(x.species,'fish-record-art','')}<span><strong>${esc(x.name)}</strong><small>${esc(fname(x.species))} ${x.size&&x.size!=='normal'?sizeBadge(x):''}${x.mut?mutBadge(x):''}</small></span><em>${kg(x.weight)}</em></li>`;};
 const mine=RARITIES.map((r,i)=>{const b=best[i],rk=board?.grades?.[i]?.find(x=>x.isMe)?.rank;return `<button data-action="fishRecordTab" data-arg="${i}" class="fish-record-mine${tab===String(i)?' active':''}" style="--rarity:${r.color}"><small>${r.name}</small><b>${b?kg(b.weight):'—'}</b><i>${rk?rk+'위':''}</i></button>`;}).join('');
 return `<div class="fishing-panel-title"><div><h2>🏆 대어 랭킹</h2><small>등급별 역대 가장 무거운 한 마리 · 잡을 때마다 갱신 · 참가 ${fmt(board?.total||0)}명</small></div>${button('↻','fishPanel','records',false,'fish-record-refresh')}</div>
 <div class="fish-record-mines">${mine}</div>
 <div class="fish-record-tabs">${tabs.map(([id,name])=>`<button data-action="fishRecordTab" data-arg="${id}" class="${tab===id?'active':''}">${name}</button>`).join('')}</div>
 <ol class="fish-record-list">${board?(list?.length?list.map(row).join(''):'<li class="empty">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</li>'):'<li class="empty">순위를 불러오는 중…</li>'}</ol>
 <p class="fishing-note">등급이 높을수록 더 크게 자라요 · 기록급 최대 무게(종 최대 대비) ${RARITIES.map((r,i)=>r.name+' ×'+RARITY_SIZE_CAP[i]).join(' · ')}</p>`;
}
function exchangePanel(f){
 const used=f.daily?.exchanged||0,left=Math.max(0,DIAMOND_EXCHANGE_DAILY-used);
 return `<div class="fishing-panel-title"><div><h2>다이아 교환소</h2><small>보유 다이아 ${fmt(f.diamonds)}개 · 오늘 ${used}/${DIAMOND_EXCHANGE_DAILY}개 교환 · 자정 초기화</small></div></div><div class="fishing-exchange" data-no-currency-art>${DIAMOND_EXCHANGE.map(x=>{const most=Math.min(left,Math.floor((f.diamonds||0)/x.diamonds));const b=(label,n)=>`<button data-illustrated="none" data-action="fishExchange" data-arg="${x.id}:${n}" data-fish-write data-write="1" ${most<n||n<1?'disabled data-unavailable':''}>${label}</button>`;return `<article>${image(x.id,'',x.name)}<div><h3>${x.name}</h3><small>다이아 ${x.diamonds}개 → 1개 · 최대 ${most}개</small></div><div class="fishing-exchange-buttons">${b('1개',1)}${b('5개',5)}${b(`최대 ${most}`,most)}</div></article>`;}).join('')}</div>`;
}
function panelBody(s,f){
 if(fishingUI.panel==='contest')return contestPanel(f);
 if(fishingUI.panel==='records'){fishingUI.staff=!!(s.isAdmin||s.isTester);return recordsPanel(f);}
 // 2026-11-04 도현: 다이아 교환소 삭제
 if(fishingUI.panel==='fish')return `<div class="fishing-panel-title"><div><h2>오늘의 물고기</h2><small>판매하면 낚시 토큰 · 크기·돌연변이가 붙을수록 비싸요 · ${f.fish.length}/${fishBagSize(s)}마리 · 보유 ${tokenIcon} ${fmt(f.tokens)}</small></div><div class="fishing-title-actions">${button('수족관 최적 배치','fishAquariumAuto','',!f.fish.length)}${button('가방 전부 판매','fishSellAll','',!f.fish.length)}</div></div><div class="fish-grid">${f.fish.length?f.fish.slice().reverse().map(x=>fishCard(x)).join(''):'<div class="fishing-empty"><strong>첫 물고기를 만나볼까요?</strong><p>미끼를 고르고 낚싯대를 던져 주세요.<br>기본 미끼 20개가 준비되어 있어요.</p></div>'}</div>`;
 if(fishingUI.panel==='tank')return `<div class="fishing-panel-title"><div><h2>나의 작은 수족관</h2><small>${f.aquarium.length}/${f.slots}마리 · 시간당 ${fmt(aquariumHourly(f))} G · 같은 종을 먹이면 각성 ★ (★당 +${Math.round(AWAKEN_BONUS*100)}%)</small></div>${button('최적 배치','fishAquariumAuto','',!f.fish.length)}</div><div class="fishing-bank">${image('diamondChest')}<div><small>쌓인 골드 · 최대 12시간</small><strong>${fmt(aquariumBank(f,Date.now()))} G</strong><span>수족관에 넣은 물고기는 꺼낸 뒤 판매할 수 있어요.</span></div>${button('골드 받기','fishAquariumClaim','',aquariumBank(f,Date.now())<1,'fishing-gold')}</div><div class="fish-grid">${f.aquarium.length?f.aquarium.map(x=>fishCard(x,'tank',f)).join(''):'<div class="fishing-empty"><strong>물고기를 넣어 나만의 수족관을 꾸며요</strong><p>물고기 가방에서 ‘수족관’을 눌러주세요.</p></div>'}</div>${f.slots<10?button('수족관 확장 · '+tokenIcon+' '+fmt(aquariumExpandCost(f.slots))+' 토큰','fishAquariumExpand','',f.tokens<aquariumExpandCost(f.slots)):'<p class="fishing-note">최대 10칸 수족관이에요.</p>'}`;
 if(fishingUI.panel==='rod'){
  const slots=enchantSlotCount(f.rod),locks=(fishingUI.locks||[]).filter(i=>i<slots&&f.enchants[i]),ecost=enchantCost(locks.length,f.rod),cur=rodTier(f);
  const level=`<section class="rod-list"><h3>🎣 낚싯대 <small>토큰 + 다이아로 순서대로 구매 · 홀수 단계에서 새 낚시터 · 단계마다 판매 토큰 +${Math.round(ROD_TOKEN_BONUS*100)}% · 희귀 +${Math.round(ROD_RARE_BONUS*100)}%</small></h3>${ROD_TIERS.map(r=>{const own=f.rod>=r.tier,next=r.tier===f.rod+1,spot=SPOTS.find(x=>x.level===r.tier);return `<div class="rod-row${own?' owned':''}${r.tier===f.rod?' current':''}">${image(r.art,'','')}<span><b>${r.tier}. ${r.name}</b><small>힘 ${r.power}${spot?' · '+spot.name+' 해금':''}${ENCHANT_SLOT_TIERS.includes(r.tier)&&r.tier>1?' · 인챈트 칸 +1':''}</small></span>${r.tier===f.rod?'<em>사용 중</em>':own?'<em>보유</em>':next?button(tokenIcon+' '+fmt(r.tokens)+' · 💎 '+fmt(r.diamonds),'fishRodBuy',String(r.tier),f.tokens<r.tokens||(f.diamonds||0)<r.diamonds,'rod-buy'):`<i>${tokenIcon} ${fmt(r.tokens)} · 💎 ${fmt(r.diamonds)}</i>`}</div>`;}).join('')}</section>`;
  const enchant=`<section class="rod-enchant"><h3>✨ 인챈트 <small>${slots}/3칸 · 잠그지 않은 칸을 전부 다시 뽑아요 · 잠금 1칸마다 비용 2배</small></h3><div class="rod-enchant-slots">${[0,1,2].map(i=>{const e=f.enchants[i],open=i<slots,t=e?ENCHANT_TIERS[e.tier]:null;return `<div class="rod-enchant-slot${open?'':' closed'}${locks.includes(i)?' locked':''}" style="--tier:${t?.color||'#555'}">${open?(e?`<b>${t.name}</b><span>${enchantText(e)}</span>${button(locks.includes(i)?'🔒 잠금':'🔓','fishEnchantLock',String(i),false,'rod-enchant-lock')}`:'<span>비어 있음</span>'):`<span>🔒 ${ENCHANT_SLOT_TIERS[i]}단계 낚싯대에서 열림</span>`}</div>`;}).join('')}</div>${button(`인챈트 ${f.enchants.some(Boolean)?'변경':'부여'} · ${tokenIcon} ${fmt(ecost)}`,'fishEnchant','',f.tokens<ecost||locks.length>=slots,'fishing-gold')}<p class="fishing-note">등급 확률 ${ENCHANT_TIERS.map(t=>t.name+' '+Math.round(t.p*100)+'%').join(' · ')} · 옵션 ${ENCHANTS.map(x=>x.name).join(', ')}</p></section>`;
  return `<div class="rod-showcase">${image(fishingRodArt(f.rod),'', '낚싯대')}<div><small>별을 낚는 여행 · 보유 ${tokenIcon} ${fmt(f.tokens)} · 다이아 ${fmt(f.diamonds)}</small><h2>${esc(cur.name)} <b class="rod-star">${cur.tier}/${ROD_MAX}</b></h2><p>힘 <b>${cur.power}</b> · 판매 토큰 +${Math.round(ROD_TOKEN_BONUS*100*(cur.tier-1))}% · 희귀 +${Math.round(ROD_RARE_BONUS*100*(cur.tier-1))}% · 힘이 물고기보다 약하면 손맛이 어렵고, 많이 약하면 줄이 끊어져요.</p></div></div>${level}${enchant}`;
 }
 if(fishingUI.panel==='shop')return `<div class="fishing-panel-title"><div><h2>물가의 낚시 상점</h2><small>지렁이는 골드, 특수 미끼는 낚시 토큰 · 보유 ${tokenIcon} ${fmt(f.tokens)}</small></div></div><section class="fishing-auto-shop"><h3>🤖 자동 낚시권 <small>여러 번 구매하면 남은 시간에 계속 누적 · ${(f.autoUntil||0)>Date.now()?leftText(f.autoUntil-Date.now())+' 남음 · 사면 시간이 더해져요':'있을 때만 오토 낚시 가능 · 손맛 없이 낚싯대 힘으로 판정 (힘이 충분하면 90%)'}</small></h3><div class="fishing-auto-plans">${FISHING_AUTO_PLANS.map(x=>`<article><b>${x.name}</b><small>${fmt(x.gold)} G</small>${button('시간 추가','fishAutoBuy',x.id,s.gold<x.gold)}</article>`).join('')}</div></section><div class="bait-shop">${BAITS.filter(x=>!x.infinite).map(x=>`<article>${image(x.art||(x.id==='golden'?'star':x.id),x.hue?'bait-'+x.hue:x.id==='golden'?'bait-golden':'',x.name)}<div><h3>${x.name}</h3><small>${x.text} · 보유 ${fmt(f.bait[x.id])}개</small><b>${x.pack}개 · ${x.gold?fmt(x.gold)+' G':tokenIcon+' '+fmt(x.tokens)+' 토큰'}</b></div><div class="bait-buy">${f.rod<x.level?`<span class="bait-lock">🔒 ${x.level}단계 낚싯대</span>`:button(x.pack+'개','fishBaitBuy',x.id,x.gold?s.gold<x.gold:f.tokens<x.tokens,'bait-btn')+(x.gold?'':button(x.pack*10+'개','fishBaitBuy',x.id+':10',f.tokens<x.tokens*10,'bait-btn'))}</div></article>`).join('')}</div><p class="fishing-note">던전 열쇠는 링구의 탐험을 시작할 때 방장이 사용해요.</p>`;
 if(fishingUI.panel==='quests')return `<div class="fishing-panel-title"><div><h2>매일의 낚시 여행</h2><small>한국 시간 자정 초기화 · 하루 다이아 ${FISHING_QUESTS.reduce((n,q)=>n+q.diamonds,0)}개</small></div></div>${FISHING_QUESTS.map(q=>`<article class="fishing-quest">${image('diamond')}<div><strong>${q.name}</strong><small>${Math.min(q.goal,f.daily[q.id]||0)} / ${q.goal} · 다이아 ${q.diamonds}개</small><progress value="${f.daily[q.id]||0}" max="${q.goal}"></progress></div>${button(f.daily.claimed.includes(q.id)?'완료':'받기','fishQuestClaim',q.id,(f.daily[q.id]||0)<q.goal||f.daily.claimed.includes(q.id))}</article>`).join('')}`;
 const spot=SPOTS.find(x=>x.id===fishingUI.collectionSpot);
 return `<div class="fishing-panel-title"><div><h2>물고기 도감</h2><small>${FISH.length}종 · 전설 ${FISH.filter(x=>x.rarity===4).length}종 · 신화 ${FISH.filter(x=>x.rarity===5).length}종 · 태고 ${FISH.filter(x=>x.rarity===6).length}종 · 발견 ${Object.keys(f.collection).filter(id=>FISH.some(x=>x.id===id)).length}/${FISH.length}</small></div></div><div class="fishing-site-filter">${SPOTS.map(x=>button(x.name,'fishCollectionSpot',x.id,false,x.id===spot.id?'active':'')).join('')}</div><div class="fish-grid collection">${FISH.filter(x=>x.spot===spot.id).map(d=>{const weight=f.collection[d.id],r=RARITIES[d.rarity];return `<article class="fish-card ${weight?'discovered':'undiscovered'}" style="--rarity:${r.color}"><div class="fish-portrait">${image(d.id,'',d.name)}<span>${r.name}</span></div><strong>${d.name}</strong><small>${d.level}단계 낚싯대</small><b>${weight?'내 최고 '+fishWeight(weight):'아직 만나지 못했어요'}</b><small>${fishWeight(d.min)} ~ 기록급 ${fishWeight(fishMaxWeight(d))}</small></article>`;}).join('')}</div>`;
}
// 2026-11-05 도현: 낚시 v3 정식 반영 — 오픈 전까지 관리자·테스터만 낚시 가능 (서버도 막음).
export const FISHING_LOCKED=true;
function lockedFishingView(s){
 return `<section class="fishing-screen fishing-stage-layout" data-sheet="" data-currency-label style="--site-accent:#a6edac" aria-label="판타지 낚시">${fantasyHeader(s,'event')}<div class="fishing-scroll"><nav class="fishing-event-switch">${button('낚시 여행','eventPage','fishing',false,'active')}${button('주간 로또','eventPage','lotto')}${button('보물 찾기','eventPage','treasure')}</nav><section class="fishing-play fishing-locked" aria-label="낚시 준비 중"><div class="fishing-scene" data-site="brook" data-phase="idle"><img class="fishing-scene-art" src="${url('scene-brook')}" alt="숲속 여울" decoding="async"><div class="fishing-scene-shade"></div><div class="fishing-angler" data-pose="0"></div><div class="fishing-locked-card"><b>🎣 새 낚시 준비 중</b><p>낚시가 완전히 새로워져요. 손맛 낚시 · 낚싯대 16종 · 크기·돌연변이 · 대어 랭킹.</p><p>지금까지 낚시에 쓴 골드·다이아와 물고기 값은 <b>우편함</b>으로 돌려드렸어요. 열리면 모두 처음부터 시작해요.</p><small>오픈 전까지 잠시 낚시를 할 수 없어요.</small></div></div><section class="fishing-console"></section></section></div>${fantasyFooter('event')}</section>`;
}
export function fishingView(s){
 if(FISHING_LOCKED&&!s?.isAdmin&&!s?.isTester)return lockedFishingView(s);
 const f=normalizeFishing({fishing:s.fishing?structuredClone(s.fishing):undefined},Date.now());
 // 낚시 화면에 들어올 때마다 갈 수 있는 가장 높은 낚시터로 바로 이동.
 if(!fishingUI.entered){fishingUI.entered=true;const best=SPOTS.filter(x=>x.level<=f.rod).sort((a,b)=>b.level-a.level)[0];if(best)fishingUI.spot=best.id;}
 const spot=SPOTS.find(x=>x.id===(f.cast?.spot||fishingUI.spot))||SPOTS[0],cast=f.cast;
 if(!BAITS.some(x=>x.id===fishingUI.bait&&x.level<=f.rod))fishingUI.bait='worm';
 const caught=!cast?f.lastCatch:null,d=caught?.won&&caught.reward==='fish'?FISH.find(x=>x.id===caught.species):null;
// 2026-11-05 낚시 연출: 잡은 물고기 등급(색·단계·이름)을 장면에 실어 두면 fishing-fx가 등급별로 다르게 연출한다.
 const cz=d?fishSizeOf(caught):null,cm=d?fishMutationOf(caught):null,bump=cz?.id==='record'?2:cz?.id==='monster'?1:0;
 const rar=d?{name:[catchLabel(caught),RARITIES[d.rarity].name].filter(Boolean).join(' · '),color:cm?.color||cz?.mult>2?(cm?.color||cz.color):RARITIES[d.rarity].color}:caught?.won&&caught.reward==='dungeonKey'?{name:'던전 열쇠',color:'#ffd477'}:caught?.won&&caught.reward==='diamondChest'?{name:'다이아 상자',color:'#8fe8ff'}:null,tierOf=d?Math.min(6,d.rarity+bump+(cm?.id==='rainbow'?2:cm?.id==='gold'?1:0)):caught?.reward==='dungeonKey'?4:3;
 const catchFx=rar?` data-rarity="${rar.color}" data-rarity-tier="${tierOf}" data-rarity-name="${esc(rar.name)}"`:'';
 const phase=cast?(cast.hookAt?'reeling':Date.now()<cast.started+900?'casting':Date.now()<cast.biteAt?'waiting':'bite'):caught?'caught':'idle';
 const phaseText=cast?'찌를 바라보며 입질을 기다려요':caught?caught.won?(d?[catchLabel(caught),d.name].filter(Boolean).join(' ')+' · '+fishWeight(caught.weight)+(caught.extra?' · 🐟 두 마리!':''):resourceName(caught.reward)+(caught.diamonds?' · 다이아 '+caught.diamonds+'개':' 획득'))+(caught.treasureTicket?' · 🎫 보물 찾기 티켓 +'+caught.treasureTicket:''):caught.reason==='snap'?'줄이 끊어졌어요… 낚싯대를 강하게 만들어 보세요.':'놓쳤어요… 다시 던져 보세요.':(f.daily?.casts||0)>=fishingDailyCasts(s)?'오늘 낚시 횟수를 모두 썼어요 · 자정에 초기화':'미끼를 고르고 물가에 찌를 던져요 · 오늘 '+(f.daily?.casts||0)+'/'+fishingDailyCasts(s)+'회';
 return `<section class="fishing-screen fishing-stage-layout" data-sheet="${fishingUI.sheet||''}" data-currency-label style="--site-accent:${spot.accent}" aria-label="판타지 낚시">${fantasyHeader(s,'event')}<div class="fishing-scroll"><nav class="fishing-event-switch">${button('낚시 여행','eventPage','fishing',false,'active').replace(/<\/button>$/,fishingQuestsReady(s)?`<b class="fantasy-mail-count">${fishingQuestsReady(s)}</b></button>`:'</button>')}${button('주간 로또','eventPage','lotto')}${button('보물 찾기','eventPage','treasure')}</nav><section class="fishing-play" aria-label="낚시 장면과 조작"><div class="fishing-scene" data-site="${spot.id}" data-phase="${phase}"${catchFx}><img class="fishing-scene-art" src="${url('scene-'+spot.id)}" alt="${spot.name}의 아름다운 풍경" fetchpriority="high" decoding="async"><div class="fishing-water" style="background-image:url('${url('scene-'+spot.id)}')"></div><div class="fishing-water-light"></div><div class="fishing-scene-shade"></div><button type="button" class="fishing-hud-spot" data-action="fishPanel" data-arg="map" ${cast?'disabled':''}><small>${spot.level}단계 낚시터 · 지도 ▾</small><b>${spot.name}</b></button><div class="fishing-hud-wallet"><span>${tokenIcon}<b>${fmt(f.tokens)}</b></span><span>💎<b>${fmt(f.diamonds)}</b></span><span class="${(f.daily?.casts||0)>=fishingDailyCasts(s)?'is-full':''}">오늘 <b>${(f.daily?.casts||0)}</b>/${fishingDailyCasts(s)}</span></div><span class="fishing-rod-chip">${image(fishingRodArt(f.rod),'fishing-rod-mini','낚싯대')}${esc(rodTier(f).name)} · 힘 ${rodPower(f)}</span>${bigCatchCard(f,caught,d)}<div class="fishing-angler" aria-label="낚시 중인 모험가" data-pose="${phase==='reeling'?4:phase==='caught'&&caught?.won?5:0}"></div><svg class="fishing-line" aria-hidden="true"><path fill="none" stroke="#fff3cf" stroke-opacity=".8" stroke-width=".7" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg><div class="fishing-ripple"></div><div class="fishing-bobber"></div><div class="fishing-splash"></div><div class="fishing-bite-alert" role="status">입질!<small>바로 낚아올려요</small></div>${d?`<img class="fishing-result-fish" src="${url(d.id)}" alt="잡은 ${d.name}">`:caught?.won&&['diamondChest','dungeonKey'].includes(caught.reward)?`<img class="fishing-result-fish fishing-result-item" src="${fishingArt(caught.reward)}" alt="잡은 ${resourceName(caught.reward)}">`:''}<div class="fishing-catch-notice" data-fish-notice aria-live="polite">${phaseText}</div></div><section class="fishing-console"><div class="fishing-console-top"><strong data-fish-status>${phaseText}</strong><span>미끼 ${BAITS.find(x=>x.id===fishingUI.bait)?.infinite?'∞':fmt(f.bait[fishingUI.bait])+'개'}</span></div><p class="fishing-instant-note">${(f.autoUntil||0)>Date.now()?'🤖 자동 낚시권 '+leftText(f.autoUntil-Date.now())+' 남음':'입질이 오면 연타해서 손맛 낚시'} · 낚싯대 힘 ${rodPower(f)} · <b class="fishing-daily-count${(f.daily?.casts||0)>=fishingDailyCasts(s)?' is-full':''}">오늘 ${(f.daily?.casts||0)}/${fishingDailyCasts(s)}회</b> (하루 ${fishingDailyCasts(s)}번${s.profession?.id==='fisher'?' · 어부':''} · 자정 초기화)</p><div class="fishing-controls"><div class="fishing-hud-tools"><label class="fishing-bait-select"><select id="fishing-bait" aria-label="미끼" ${cast?'disabled':''}>${BAITS.filter(x=>x.level<=f.rod).map(x=>`<option value="${x.id}" ${x.id===fishingUI.bait?'selected':''}>${x.name.replace(/^숲 /,'').replace(/ 미끼$/,'')} ${x.infinite?'∞':fmt(f.bait[x.id])}</option>`).join('')}</select></label><button type="button" data-illustrated="none" data-action="fishAuto" class="fishing-auto${fishingUI.auto?' active':''}"><span>${(f.autoUntil||0)>Date.now()?(fishingUI.auto?'🤖 오토 ON':'🤖 오토 OFF'):'🤖 오토 🔒'}</span></button></div>${cast?`<button class="fishing-pull fishing-gold" data-fish-pull data-illustrated="1" type="button">${menuIcon('cast')}<span data-fish-pull-label>입질 기다리기</span></button>${button('그만두기','fishCancel',cast.id,false,'fishing-cancel')}`:button(f.rod<spot.level?spot.level+'단계 낚싯대 필요':'낚싯대 던지기','fishCast','',f.rod<spot.level||!(BAITS.find(x=>x.id===fishingUI.bait)?.infinite||f.bait[fishingUI.bait]>0)||f.fish.length>=fishBagSize(s),'fishing-gold')}</div><div class="fishing-transaction" data-fish-transaction role="status" aria-live="polite"></div></section><nav class="fishing-panels" aria-label="낚시 메뉴">${[['fish','가방'],['tank','수족관'],['rod','낚싯대'],['shop','상점'],['quests','퀘스트'],['collection','도감'],['records','랭킹']].map(([id,name])=>{const badge=id==='quests'?fishingQuestsReady(s):id==='fish'?f.fish.length:0;return button(name,'fishPanel',id,false,fishingUI.sheet===id?'active':'').replace(/<\/button>$/,badge?`<b class="fantasy-mail-count">${badge}</b></button>`:'</button>');}).join('')}</nav><div class="fishing-sheet-backdrop" data-action="fishSheetClose" aria-hidden="true"></div><div class="fishing-sheet" role="dialog" aria-label="낚시 메뉴"><div class="fishing-sheet-bar"><i></i><button type="button" class="fishing-sheet-close" data-action="fishSheetClose" aria-label="닫기">✕</button></div><div class="fishing-sheet-body"><h2 class="fishing-sheet-title fishing-map-title">🗺️ 낚시터 지도 <small>홀수 단계 낚싯대마다 새 낚시터가 열려요</small></h2><nav class="fishing-sites" aria-label="낚시터 선택">${SPOTS.map(x=>`<button data-action="fishSpot" data-arg="${x.id}" data-illustrated="1" class="${x.id===spot.id?'active':''}${f.rod<x.level?' locked':''}" ${cast?'disabled':''}><img src="${url('scene-'+x.id+'-thumb')}" alt="" loading="lazy" decoding="async"><span>${x.name}<small>${f.rod<x.level?'🔒 '+x.level+'단계 낚싯대 필요':x.level+'단계'+(x.id===spot.id?' · 지금 여기':'')}</small></span></button>`).join('')}</nav><section class="fishing-panel">${panelBody(s,f)}</section><section class="fishing-loot"><h2>물결 속 작은 보물</h2><div><article><span class="fishing-token-big">${tokenIcon}</span><span>낚시 토큰</span><small>보유 ${fmt(f.tokens)}개</small></article>${['diamondChest','dungeonKey'].map(id=>`<article>${image(id,'',resourceName(id))}<span>${resourceName(id)}</span><small>${id==='diamondChest'?'다이아 '+fmt(f.diamonds)+'개':'보유 '+fmt(s.materials?.[id])+'개'}</small></article>`).join('')}<article>${image('treasureTicket','','보물 찾기 티켓')}<span>보물 찾기 티켓</span><small>보유 ${fmt(s.treasure?.tickets||0)}장</small></article></div></section></div></div></section></div>${fantasyFooter('event')}</section>`;
}
// Keep the scene and pointer target alive while menus or server acknowledgements update.
const viewCache=new WeakMap();
export function updateFishingView(app,html,castId){
 const template=document.createElement('template');template.innerHTML=html;
 const fresh=template.content.querySelector('.fishing-screen'),old=app.querySelector('.fishing-screen');
 const selectors=['.fantasy-header','.fantasy-dock','.fishing-event-switch','.fishing-sites','.fishing-panels','.fishing-panel','.fishing-loot'];
 const next={root:old,castId,scene:fresh.querySelector('.fishing-scene').outerHTML,console:fresh.querySelector('.fishing-console').outerHTML,parts:Object.fromEntries(selectors.map(key=>[key,fresh.querySelector(key)?.innerHTML]))};
 const previous=viewCache.get(app);
 if(!old||previous?.root!==old){app.innerHTML=html;next.root=app.querySelector('.fishing-screen');}
 else{
  old.style.cssText=fresh.style.cssText;old.dataset.sheet=fresh.dataset.sheet||'';
  for(const key of selectors){
   if(previous.parts[key]===next.parts[key])continue;
   const target=old.querySelector(key),source=fresh.querySelector(key);if(!target||!source)continue;
   if(key==='.fishing-panel')replacePreservingDetails(target,'fishing-'+fishingUI.panel,source.innerHTML);
   else target.innerHTML=source.innerHTML;
  }
  if(!castId||previous.castId!==castId){
   const oldScene=old.querySelector('.fishing-scene'),newScene=fresh.querySelector('.fishing-scene');
   // A pending cast already has its own animation, even before the server returns its ID.
   if((!castId&&fishingUI.pending!=='fishCast'&&previous.scene!==next.scene)||oldScene.dataset.site!==newScene.dataset.site)oldScene.replaceWith(newScene);
   if(previous.console!==next.console)old.querySelector('.fishing-console').replaceWith(fresh.querySelector('.fishing-console'));
  }
 }
 viewCache.set(app,next);
}
export function showFishingPending(root,action,{animate=true}={}){
 if(!root)return;root.setAttribute('aria-busy','true');
 root.querySelectorAll('[data-fish-write]').forEach(b=>{b.disabled=true;});
 const labels={fishRodBuy:'낚싯대 구매 중…',fishEnhance:'낚싯대 강화 중…',fishCast:'낚싯대를 던지는 중…',fishHook:'낚아올리는 중…',fishFinish:'잡은 보상을 받는 중…'};
 const status=root.querySelector('[data-fish-transaction]');if(status)status.textContent=labels[action]||'처리 중…';
 root.querySelectorAll(`[data-action="${action}"]`).forEach(b=>b.classList.add('fishing-pending'));
 if(action==='fishCast')root.querySelectorAll('.fishing-sites button').forEach(b=>{b.disabled=true;});
 if(action==='fishCast'&&animate){
  const scene=root.querySelector('.fishing-scene');if(!scene)return;scene.dataset.phase='casting';
  scene.querySelector('.fishing-result-fish')?.remove();
  scene.querySelector('[data-fish-notice]').textContent='낚싯대를 던지는 중…';
  const angler=scene.querySelector('.fishing-angler');angler.dataset.pose='1';
  pendingCastStarted=Date.now();sceneController?.dispose();sceneController=mountFishingScene(scene,pendingCastStarted);
  setTimeout(()=>{if(scene.isConnected&&scene.dataset.phase==='casting')angler.dataset.pose='2';},220);
  setTimeout(()=>{if(scene.isConnected&&scene.dataset.phase==='casting'){angler.dataset.pose='0';scene.dataset.phase='waiting';}},900);
 }
}
let controller=null,localCast=null,sceneController=null,pendingCastStarted=null;
// Auto fishing: after each catch, cast again with the selected spot/bait while the toggle stays on.
let autoTimer=0,autoState=null,autoSend=null;
export function stopAutoFishing(reason){fishingUI.auto=false;clearTimeout(autoTimer);autoTimer=0;const b=document.querySelector('.fishing-screen [data-action="fishAuto"]');if(b){b.classList.remove('active');const t=b.querySelector('span');if(t)t.textContent='오토 OFF';}if(reason)fishingUI.notify?.(reason);}
function autoBlocker(s){
 const f=s?.fishing;if(!f)return '낚시 정보를 불러오지 못했어요.';
 const spot=SPOTS.find(x=>x.id===fishingUI.spot),bait=document.querySelector('#fishing-bait')?.value||fishingUI.bait;
 if(!spot||(f.rod||1)<spot.level)return '이 낚시터는 더 좋은 낚싯대가 필요해요.';
 if(bait!=='worm'&&!((f.bait?.[bait]||0)>0))return '미끼가 떨어져서 오토 낚시를 멈췄어요.';
 if((f.fish?.length||0)>=fishBagSize(s))return '가방이 가득 차서 오토 낚시를 멈췄어요.';
 if((f.daily?.casts||0)>=fishingDailyCasts(s))return '오늘 낚시 횟수를 다 써서 오토 낚시를 멈췄어요.';
 if(!((f.autoUntil||0)>Date.now()))return '자동 낚시권이 끝나서 오토 낚시를 멈췄어요.';
 return '';
}
export function scheduleAutoFishing(delay=1200){
 if(!fishingUI.auto||autoTimer)return;
 autoTimer=setTimeout(async()=>{
  autoTimer=0;if(!fishingUI.auto)return;
  if(!document.querySelector('.fishing-screen'))return stopAutoFishing();
  // Wait for the previous request, a hidden tab or an active cast instead of spending bait.
  if(fishingUI.pending||document.hidden||autoState?.fishing?.cast)return scheduleAutoFishing(700);
  const busy=fishingFxBusyUntil()-performance.now();if(busy>0)return scheduleAutoFishing(Math.ceil(busy)+30);
  const blocked=autoBlocker(autoState);if(blocked)return stopAutoFishing(blocked);
  fishingUI.bait=document.querySelector('#fishing-bait')?.value||fishingUI.bait;
  try{const result=await autoSend?.('fishCast',{spot:fishingUI.spot,bait:fishingUI.bait,protocol:FISHING_PROTOCOL});if(!result&&fishingUI.auto)scheduleAutoFishing(1500);}
  catch{stopAutoFishing('낚시 요청이 실패해서 오토 낚시를 멈췄어요.');}
 },delay);
}
export function stopFishing(){stopFishingFx();controller?.dispose();controller=null;sceneController?.dispose();sceneController=null;}
// Instant catch: the bite automatically lands the fish once. Manual tap only retries.
export function mountFishing(root,state,send){
 let cast=state.fishing?.cast;autoState=state;autoSend=send;if(!cast)scheduleAutoFishing();if(root)startFishingFx();
 if(controller?.root===root&&controller?.castId===cast?.id&&controller?.pull.isConnected){controller.accept(cast);return;}
 if(!cast&&fishingUI.pending==='fishCast')return;
 controller?.dispose();controller=null;sceneController?.dispose();sceneController=null;if(root)startFishingFx({isAuto:()=>fishingUI.auto});if(!root||!cast){if(!cast){localCast=null;pendingCastStarted=null;}return;}
 // Server clock offset from the cast receipt; the bite time is in server time.
 if(!localCast||localCast.id!==cast.id)localCast={id:cast.id,visualStarted:Math.min(cast.started,pendingCastStarted||cast.started),offset:Date.now()-cast.started<2500&&Date.now()-cast.started>-60000?cast.started-Date.now():0,hooking:false,error:false,retryAt:0,failures:0};
 const c=localCast;pendingCastStarted=null;
 const els={scene:root.querySelector('.fishing-scene'),angler:root.querySelector('.fishing-angler'),notice:root.querySelector('[data-fish-notice]'),status:root.querySelector('[data-fish-status]'),pull:root.querySelector('[data-fish-pull]'),label:root.querySelector('[data-fish-pull-label]')};
 let raf=0,disposed=false;
 const setText=(el,text)=>{if(el&&el.textContent!==text)el.textContent=text;};
 const phase=(name,pose,text,label)=>{if(els.scene.dataset.phase!==name)els.scene.dataset.phase=name;if(els.angler.dataset.pose!==String(pose))els.angler.dataset.pose=String(pose);setText(els.status,text);if(label)setText(els.label,label);};
 // v3: 자동 낚시권이 있고 오토가 켜져 있으면 낚싯대 힘으로 자동 판정, 아니면 손맛 낚시.
 const autoOn=()=>fishingUI.auto&&((autoState?.fishing?.autoUntil)||0)>Date.now()+c.offset;
 const hook=async()=>{
  const serverNow=Date.now()+c.offset;if(c.hooking||cast.hookAt||serverNow<cast.biteAt+150||serverNow>cast.expires)return;
  c.hooking=true;c.error=false;phase('landing',5,autoOn()?'자동으로 낚아올리는 중…':'챔질!','챔질!');els.pull.disabled=true;
  try{const result=await send('fishHook',{id:cast.id,...(autoOn()?{auto:true}:{})});if(!result){c.hooking=false;c.retryAt=Date.now()+750;}else if(result?.result?.events?.some(e=>e.type==='fishBite'))c.hooking=false;}
  catch{c.hooking=false;c.failures++;if(c.failures<6){c.offset-=400;c.retryAt=Date.now()+600;return;}c.error=true;setText(els.status,'연결을 확인한 뒤 다시 받기를 눌러주세요.');setText(els.label,'결과 다시 받기');els.pull.disabled=false;}
 };
 // ── 손맛 낚시(클릭): 누를 때마다 막대가 오른쪽으로, 가만히 두면 왼쪽으로 밀린다. 물고기를 막대 안에 두면 게이지가 찬다 ──
 let taps=0;
 const tap=e=>{if(e){if(e.__fishTap)return;e.__fishTap=true;}if(c.reel&&!c.reel.done){taps=Math.min(3,taps+1);c.reel.el?.classList.remove('tap');void c.reel.el?.offsetWidth;c.reel.el?.classList.add('tap');e?.preventDefault?.();}};
 const key=e=>{if(e.code==='Space'&&!e.repeat&&c.reel&&!c.reel.done){tap(e);}};
 const RARITY_HINT=['평범한 입질','희귀한 손맛','레어 물고기!','에픽 물고기!!','전설의 손맛!!!','신화급 괴력!!!','태고의 존재!!!'];
 function reelFrame(){
  if(!c.reel){
   const dif=cast.challenge,col=RARITIES[dif.rarity]?.color||'#fff',size=FISH_SIZES.find(x=>x.id===dif.size);c.reel={meter:fishingMeter(),inputs:'',start:performance.now(),done:false};
   const el=document.createElement('div');el.className='fishing-reel';el.style.setProperty('--rarity',col);
   el.innerHTML=`<div class="reel-head"><b>${RARITY_HINT[dif.rarity]||'입질'}</b>${size&&!['small','normal'].includes(size.id)?`<em style="--size:${size.color}">${size.name}</em>`:''}<small class="${dif.deficit>0?'weak':''}">낚싯대 힘 ${dif.power} / ${dif.need}${dif.deficit>0?' ⚠':''}</small></div><div class="reel-track"><i class="reel-zone"></i><img class="reel-fish" src="${url(dif.species)}" alt=""><span class="reel-strain"></span></div><div class="reel-progress"><i></i><u style="left:${Math.round(dif.required*100)}%"></u></div><p class="reel-tip">연타해서 막대를 물고기에 맞춰요 · 손을 떼면 왼쪽으로 밀려요</p>`;
   els.scene.append(el);Object.assign(c.reel,{el,zone:el.querySelector('.reel-zone'),fish:el.querySelector('.reel-fish'),prog:el.querySelector('.reel-progress i'),strain:el.querySelector('.reel-strain')});
   c.reel.zone.style.width=(dif.band*200)+'%';els.pull.disabled=false;setText(els.label,'연타! (탭 · Space)');els.pull.classList.add('fishing-reel-hold');
  }
  const r=c.reel,m=r.meter,dif=cast.challenge;if(r.done)return;
  const want=Math.min(dif.ticks,Math.floor((performance.now()-r.start)/FISHING_TICK_MS));
  while(m.tick<want&&!m.finished){const n=taps;taps=0;fishingStep(cast,n,m);r.inputs+=String(n);}
  const prev=r.lastTarget??m.target;r.lastTarget=m.target;
  r.zone.style.left=((m.cursor-dif.band)*100)+'%';r.fish.style.left=(m.target*100)+'%';r.fish.classList.toggle('flip',m.target<prev);r.el.classList.toggle('inside',!!m.inside);
  r.prog.style.width=Math.min(100,m.hits/dif.ticks*100)+'%';r.strain.style.opacity=String(Math.min(1,m.strain/dif.strainLimit));r.el.style.setProperty('--strain',String(Math.min(1,m.strain/dif.strainLimit)));
  phase('reeling',4,m.inside?'좋아요! 계속 맞춰요':'놓치겠어요! 연타해서 따라가요','연타! (탭 · Space)');
  if(m.finished){
   r.done=true;els.pull.classList.remove('fishing-reel-hold');const won=fishingMeterWon(cast,m);
   r.el.classList.add(won?'won':'lost');phase('landing',won?5:0,won?'낚아올렸어요!':m.failed?'줄이 끊어졌어요…':'놓쳤어요…',won?'낚아올리는 중…':'결과 확인 중…');els.pull.disabled=true;
   send('fishFinish',{id:cast.id,inputs:r.inputs}).catch(()=>{setText(els.status,'연결을 확인한 뒤 다시 시도해 주세요.');});
   setTimeout(()=>r.el.remove(),1200);
  }
 }
 const click=()=>{if(!c.hooking&&!cast.hookAt&&Date.now()+c.offset>=cast.biteAt)hook();};
 function frame(){
  if(disposed||document.hidden)return;
  const now=Date.now()+c.offset;
  if(cast.hookAt&&cast.challenge){reelFrame();raf=requestAnimationFrame(frame);return;}
  if(now>=cast.expires&&!c.hooking){phase('missed',0,'시간이 지나 미끼가 풀렸어요. 다시 던져주세요.','다시 던지기');els.pull.disabled=true;raf=requestAnimationFrame(frame);return;}
  if(c.hooking){phase('landing',5,'낚아올리는 중…','낚아올리는 중…');els.pull.disabled=true;}
  else if(now<c.visualStarted+900){phase('casting',now-c.visualStarted<220?1:2,'낚싯대를 던지는 중…','던지는 중…');els.pull.disabled=true;}
  else if(now<cast.biteAt){phase('waiting',0,'찌를 바라보며 입질을 기다려요','입질 기다리기');setText(els.notice,'찌를 바라보며 입질을 기다려요');els.pull.disabled=true;}
  else if(!c.error&&Date.now()>=c.retryAt){phase('bite',3,'입질! 바로 낚아올려요','낚아올리는 중…');setText(els.notice,'찌가 잠겼어요! 바로 낚아올려요');hook();}
  raf=requestAnimationFrame(frame);
 }
 const visibility=()=>{if(!document.hidden)raf=requestAnimationFrame(frame);else cancelAnimationFrame(raf);};
 els.pull.addEventListener('click',click);document.addEventListener('visibilitychange',visibility);
 els.pull.addEventListener('pointerdown',tap);els.scene.addEventListener('pointerdown',tap);addEventListener('keydown',key);
 controller={root,castId:cast.id,pull:els.pull,accept(latest){cast=latest;},dispose(){disposed=true;cancelAnimationFrame(raf);c.reel?.el?.remove();els.pull.removeEventListener('click',click);els.pull.removeEventListener('pointerdown',tap);els.scene.removeEventListener('pointerdown',tap);removeEventListener('keydown',key);document.removeEventListener('visibilitychange',visibility);}};
 raf=requestAnimationFrame(frame);
 sceneController=mountFishingScene(els.scene,c.visualStarted);
}
export {FISHING_PROTOCOL};
