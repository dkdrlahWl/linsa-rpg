import {normalizeCompanions} from './companion-model.mjs';
import {normalizeTribe} from './tribe-model.mjs?v=balance-20261102';
// Stable campaign IDs and persisted claims keep gifts one-time per account.
const SYSTEM_MAIL = [{
  id:'big-update-20261102-gift',
  title:'대규모 업데이트 기념 선물', sender:'링구 RPG 운영팀',
  message:'토큰 던전·종족 강림·동료 SS급 등 대규모 업데이트를 기념해 선물을 보내드립니다! 200제 보스 장비 상자는 직업·부위 랜덤(무기는 다른 부위의 절반 확률)이에요.',
  sentAt:'2026-11-02T12:58:00Z', rewards:{companionTicket:30,pickupTicket:20,dungeonKey:20,tribeTicket:3,tokens:100,bossChest200:1},
}, {
  id:'tribe-descent-20261102-dice-3',
  title:'종족 강림 업데이트 선물', sender:'링구 RPG 운영팀',
  message:'종족 강림이 열렸습니다! 종족 주사위 3개를 보내드립니다. 상단 族 버튼에서 강림을 시작해 보세요.',
  sentAt:'2026-11-02T11:10:00Z', rewards:{tribeTicket:3},
}, {
  id:'companion-update-20261030-tickets-10-pickup-10',
  title:'동료 업데이트 기념 선물', sender:'링구 RPG 운영팀',
  message:'동료 업데이트를 기념해 동료 소환권 10장과 픽업 소환권 10장을 보내드립니다!',
  sentAt:'2026-10-30T07:24:00Z', rewards:{companionTicket:10,pickupTicket:10},
}, {
  id:'companion-gift-20261027-tickets-5',
  title:'동료 소환권 선물', sender:'링구 RPG 운영팀',
  message:'동료 카드를 즐겨주셔서 감사합니다! 동료 소환권 5장을 보내드립니다.',
  sentAt:'2026-10-27T08:14:00Z', rewards:{companionTicket:5},
}, {
  id:'companion-update-20261027-tickets-3',
  title:'동료 업데이트 선물', sender:'링구 RPG 운영팀',
  message:'동료 소환 연출, 최적 장착과 5회 소환을 업데이트했습니다. 소환권 3장을 선물로 보내드립니다!',
  sentAt:'2026-10-27T06:05:10.399Z', rewards:{companionTicket:3},
}, {
  id: 'weekend-20261017-fragment-5000',
  title: '주말 보상',
  sender: '링구 RPG 운영팀',
  message: '즐거운 주말 보내세요! 장비 파편 5,000개를 보내드립니다.',
  sentAt: '2026-10-17T04:03:29.254Z',
  rewards: { fragment: 5000 },
}, {
  id: 'play-thanks-2026-09-28',
  title: '플레이 감사 보상',
  sender: '링구 RPG 운영팀',
  message: '링구 RPG를 플레이해 주셔서 감사합니다. 모험에 도움이 되도록 감사 선물을 보내드립니다!',
  sentAt: '2026-09-27T15:12:46Z',
  rewards: { scroll: 3, fragment: 100 },
}, {
  id: 'birthday-20260929-92d246b9',
  recipientId: '92d246b9-89a1-4524-900d-9cbd0b47e8f9',
  title: '생일선물',
  sender: '링구 RPG 운영팀',
  message: '생일 축하합니다! 잠재 해금 주문서 2개와 장비 파편 100개를 보내드립니다.',
  sentAt: '2026-09-28T15:07:42Z',
  rewards: { scroll: 2, fragment: 100 },
}];

export function deliverSystemMail(state, ctx) {
  state.claimedSystemMail ||= [];
  const joinedAt = Date.parse(ctx.accountCreatedAt);
  state.systemMailbox = SYSTEM_MAIL.filter(mail =>
    (!mail.recipientId || mail.recipientId === ctx.accountId) &&
    Number.isFinite(joinedAt) && joinedAt <= Date.parse(mail.sentAt) &&
    ctx.now >= Date.parse(mail.sentAt) && !state.claimedSystemMail.includes(mail.id)
  ).map(mail => structuredClone(mail));
  state.systemMailbox.push(...(state.rewardMailbox||[]).filter(mail=>!state.claimedSystemMail.includes(mail.id)));
  return state;
}

export function claimSystemMail(state, id, grantBossGear) {
  state.claimedSystemMail ||= [];
  const chest=(state.rewardMailbox||[]).find(mail=>mail.id===id);
  if(chest?.kind==='lottoGold' && !state.claimedSystemMail.includes(id)){
    const amount=chest.rewards?.gold;
    if(!Number.isSafeInteger(amount)||amount<0||amount>9e12||state.gold+amount>9e12)throw new Error('INVALID_MAIL_REWARD');
    state.gold+=amount;state.claimedSystemMail.push(id);
    state.rewardMailbox=state.rewardMailbox.filter(mail=>mail.id!==id);
    state.systemMailbox=state.systemMailbox.filter(mail=>mail.id!==id);
    return {type:'lottoGold',id,amount};
  }
  if(chest && !state.claimedSystemMail.includes(id)){
    if(!["lumiBossChest","wheelBossChest"].includes(chest.kind)||!grantBossGear)throw new Error("INVALID_MAIL_REWARD");
    const reward=grantBossGear(chest);
    state.claimedSystemMail.push(id);
    state.rewardMailbox=state.rewardMailbox.filter(mail=>mail.id!==id);
    state.systemMailbox=state.systemMailbox.filter(mail=>mail.id!==id);
    return {type:"bossChest",id,...reward};
  }
  if (state.claimedSystemMail.includes(id)) throw new Error('MAIL_ALREADY_CLAIMED');
  const mail = SYSTEM_MAIL.find(mail => mail.id === id);
  if (!mail || !state.systemMailbox.some(entry => entry.id === id)) throw new Error('MAIL_NOT_FOUND');
  // Amounts come from the server campaign, never from the request or UI.
  const items=[];
  if(mail.rewards.bossChest200&&!grantBossGear)throw new Error('INVALID_MAIL_REWARD');
  for (const [key, amount] of Object.entries(mail.rewards)) {
    if(key==='bossChest200'){for(let k=0;k<amount;k++)items.push(grantBossGear({kind:'wheelBossChest',minLevel:200,maxLevel:200}));continue;}
    if(key==='tokens'){state.tokens=Math.min(9999999,(Number.isSafeInteger(state.tokens)?state.tokens:0)+amount);continue;}
    if(key==='pickupTicket')normalizeCompanions(state).pickupTickets+=amount;
    else if(key==='companionTicket')normalizeCompanions(state).tickets+=amount;
    else if(key==='tribeTicket')normalizeTribe(state).tickets+=amount;
    else state.materials[key] = (state.materials[key] || 0) + amount;
  }
  state.claimedSystemMail.push(id);
  state.systemMailbox = state.systemMailbox.filter(entry => entry.id !== id);
  return { type: 'systemMail', id, rewards: { ...mail.rewards }, items };
}
