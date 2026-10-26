import assert from 'node:assert/strict';
import fs from 'node:fs';
import {TITLE_BY_ID,newlyEarnedTitles} from './titles-data.mjs';
import {TITLE_BY_ID as SERVER} from './edge-dist/titles-data.mjs';

const cases=[
 ['invest1','investWins',1],['investLiq','investLiquidations',1],['invest100','investTrades',100],
 ['invest10m','investProfit',1e7],['invest','investProfit',1e8],['invest1b','investProfit',1e9],
 ['investShort','investShortWins',30],['investX2','investBestRate',1],
];
const earned=st=>newlyEarnedTitles({titleStats:st},()=>0);
for(const [id,key,min] of cases){
 const t=TITLE_BY_ID[id];assert(t&&t.available&&t.category==='투자',id);
 assert.equal(SERVER[id]?.condition,t.condition,id+' server parity');
 assert(fs.readFileSync(new URL(`./titles/${id}.svg`,import.meta.url),'utf8').includes('data:image/webp;base64,'),id+' art');
 assert(earned({[key]:min}).includes(id),id+' at threshold');
 assert(!earned({[key]:min-(min>=1?Math.min(1,min/2):min/2)}).includes(id),id+' below threshold');
}
assert.equal(TITLE_BY_ID.invest.condition,'투자 누적 순수익 1억 G');
// 총 수익이 커도 순수익(PnL)이 1억 미만이면 큰손 투자자 아님
assert(!earned({investProfit:35326302}).includes('invest'));
assert(!newlyEarnedTitles({titleStats:{investProfit:2e9},titles:{invest:1,invest10m:1,invest1b:1}},()=>0).length);
console.log('PASS: 8 investment titles — net-profit thresholds, counts, best rate, server parity, art, no duplicates');
