// Additional (에디셔널) potential: a second set of three lines per item.
// Same option kinds and odds as the main potential pool of the same grade,
// at one tenth of the value. Flat options are rounded to whole numbers.
// Rolled only with the additional cube (no red/black/prime cube, no pity).
import {UNIVERSAL_POOLS} from './universal-cube-pools.mjs?v=adv300-20261027';

export const ADDITIONAL_SCALE = 10;
export const ADDITIONAL_UNLOCK_CHANCE = 0.1;
export const ADD_CUBE = Object.freeze({
  id: 'addCube',
  name: '에디셔널 큐브',
  minGrade: 2,
  maxGrade: 5,
  // grade -> chance to move up one grade on use (rare→epic 3%, epic→unique 1%, unique→legendary 0.5%)
  up: Object.freeze({2: 0.03, 3: 0.01, 4: 0.005}),
});

const scaled = (key, value) => key.startsWith('flat')
  ? Math.max(1, Math.round(value / ADDITIONAL_SCALE))
  : Math.round(value / ADDITIONAL_SCALE * 100) / 100;

const POOL_CACHE = new Map();
export function additionalPool(grade) {
  if (!Number.isInteger(grade) || grade < ADD_CUBE.minGrade || grade > ADD_CUBE.maxGrade) throw Error('INVALID_CUBE_GRADE');
  if (!POOL_CACHE.has(grade)) {
    POOL_CACHE.set(grade, Object.freeze(UNIVERSAL_POOLS[grade].map(row => Object.freeze({key: row.key, value: scaled(row.key, row.value), weight: row.weight}))));
  }
  return POOL_CACHE.get(grade);
}

function weighted(pool, random) {
  let r = random() * pool.reduce((n, x) => n + x.weight, 0);
  for (const option of pool) { r -= option.weight; if (r < 0) return option; }
  return pool.at(-1);
}

export function rollAdditionalLines(grade, random) {
  const pool = additionalPool(grade);
  return Array.from({length: 3}, () => {
    const row = weighted(pool, random);
    return {key: row.key, value: row.value, grade, additional: true, ...(row.key === 'crit' ? {critBalanceVersion: 2} : {})};
  });
}

export function additionalUpgrade(grade, random) {
  const chance = ADD_CUBE.up[grade] || 0;
  return chance > 0 && random() < chance ? grade + 1 : grade;
}

const signature = lines => JSON.stringify((lines || []).map(l => [l.key, l.value, l.grade]));

// Returns {grade, lines}; never identical to the current lines so a cube is never wasted.
export function rerollAdditional(item, random) {
  const previous = item.addGrade || ADD_CUBE.minGrade;
  const grade = additionalUpgrade(previous, random);
  for (let attempt = 0; attempt < 256; attempt++) {
    const lines = rollAdditionalLines(grade, random);
    if (grade !== previous || signature(lines) !== signature(item.addLines)) return {grade, previousGrade: previous, lines};
  }
  throw Error('CUBE_RANDOM_RETRY');
}

export const hasAdditional = item => Array.isArray(item?.addLines) && item.addLines.length > 0;
export const allPotentialLines = item => hasAdditional(item) ? [...(item.lines || []), ...item.addLines] : (item?.lines || []);
