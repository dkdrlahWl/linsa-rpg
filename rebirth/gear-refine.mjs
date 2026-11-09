// Shop refinement items for equipment (2026-10-25).
// - 추가옵션 불꽃 (5,000,000 G): rolls a bonus of 1~10% applied to every equipment stat
//   (attack, main stat, HP, defense). Higher bonuses are rarer. Using it again re-rolls.
// - 기본수치 재련석 (100,000,000 G): re-rolls the equipment base stats inside the item's own
//   range, fully uniform (every value equally likely; 2026-10-25). Tiered boss gear also re-rolls its
//   tier uniformly (2026-10-25 A안), so every stat is uniform over the whole tier-0..max range.
// Both results go to a keep/apply choice, like the black cube.
import {gearStatRanges,isTieredBossGear,bossTierCount} from './data.mjs';

export const BONUS_FLAME = Object.freeze({id: 'bonusFlame', name: '추가옵션 불꽃', price: 5000000, art: 'currencies/bonus-flame-v1.webp', description: '장비 모든 스탯 +1~10% 추가치 · 이전 / 이후 선택'});
export const REROLL_STONE = Object.freeze({id: 'rerollStone', name: '기본수치 재련석', price: 100000000, art: 'currencies/reroll-stone-v1.webp', description: '장비 기본 수치 재굴림 · 이전 / 이후 선택'});

export const BONUS_MIN = 1, BONUS_MAX = 10, BONUS_DECAY = 0.6;
// P(p) ∝ 0.6^(p-1): 1% ≈ 40.2%, 3% ≈ 14.5%, 5% ≈ 5.2%, 8% ≈ 1.1%, 10% ≈ 0.41%.
export const BONUS_TABLE = Object.freeze((() => {
  const raw = Array.from({length: BONUS_MAX - BONUS_MIN + 1}, (_, i) => BONUS_DECAY ** i);
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((w, i) => Object.freeze({pct: BONUS_MIN + i, chance: w / total}));
})());

export function rollBonusPct(random) {
  let r = random();
  for (const row of BONUS_TABLE) { r -= row.chance; if (r < 0) return row.pct; }
  return BONUS_MAX;
}

export const bonusPct = item => Number.isInteger(item?.bonusPct) && item.bonusPct >= BONUS_MIN && item.bonusPct <= BONUS_MAX ? item.bonusPct : 0;
export const bonusMultiplier = item => 1 + bonusPct(item) / 100;

// 2026-11-09 도현: 220제 이상은 등급 유지 — 지금 등급 수치 범위 안에서만 기본수치 재굴림.
export const rerollKeepsTier = item => isTieredBossGear(item) && Number(item.level) >= 220;
export function rerollGear(item, random) {
  const tiered = isTieredBossGear(item) && !rerollKeepsTier(item), bossTier = tiered ? Math.floor(random() * bossTierCount(item)) : undefined;
  const target = tiered ? {...item, bossTier} : item;
  const baseStats = Object.fromEntries(Object.entries(gearStatRanges(target)).map(([key, r]) =>
    [key, r.min + Math.min(r.max - r.min, Math.floor(random() * (r.max - r.min + 1)))]));
  return {baseStats, bossTier};
}
// 2026-11-02 도현: 기본수치 재련석은 등급 보스장비 전용. 220제부터는 등급은 초월로만 오르고 재련석은 그 등급 범위 안에서만 재굴림.
export const rerollStoneAllowed = item => isTieredBossGear(item);
export const rerollBaseStats = (item, random) => rerollGear(item, random).baseStats;
