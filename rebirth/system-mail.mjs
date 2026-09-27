// Stable campaign IDs and persisted claims keep gifts one-time per account.
const SYSTEM_MAIL = [{
  id: 'play-thanks-2026-09-28',
  title: '플레이 감사 보상',
  sender: '링구 RPG 운영팀',
  message: '링구 RPG를 플레이해 주셔서 감사합니다. 모험에 도움이 되도록 감사 선물을 보내드립니다!',
  sentAt: '2026-09-27T15:12:46Z',
  rewards: { scroll: 3, fragment: 100 },
}];

export function deliverSystemMail(state, ctx) {
  state.claimedSystemMail ||= [];
  const joinedAt = Date.parse(ctx.accountCreatedAt);
  state.systemMailbox = SYSTEM_MAIL.filter(mail =>
    Number.isFinite(joinedAt) && joinedAt <= Date.parse(mail.sentAt) &&
    ctx.now >= Date.parse(mail.sentAt) && !state.claimedSystemMail.includes(mail.id)
  ).map(mail => structuredClone(mail));
  return state;
}

export function claimSystemMail(state, id) {
  if (state.claimedSystemMail.includes(id)) throw new Error('MAIL_ALREADY_CLAIMED');
  const mail = SYSTEM_MAIL.find(mail => mail.id === id);
  if (!mail || !state.systemMailbox.some(entry => entry.id === id)) throw new Error('MAIL_NOT_FOUND');
  // Amounts come from the server campaign, never from the request or UI.
  for (const [key, amount] of Object.entries(mail.rewards)) {
    state.materials[key] = (state.materials[key] || 0) + amount;
  }
  state.claimedSystemMail.push(id);
  state.systemMailbox = state.systemMailbox.filter(entry => entry.id !== id);
  return { type: 'systemMail', id, rewards: { ...mail.rewards } };
}
