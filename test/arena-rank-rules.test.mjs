import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tier} from '../rebirth/arena-model.mjs';
import {arenaView,tierArt} from '../rebirth/arena-ui.mjs';
assert.equal(tier(null,null).name,'언랭크');
for(const rank of [1,2,3,4,10])assert.equal(tier(2599,rank).label,'마스터 I');
for(const score of [2600,3000,10000,1000000000]){
 assert.equal(tier(score,1).name,'챔피언');
 for(const rank of [2,3])assert.equal(tier(score,rank).name,'챌린저');
 for(const rank of [4,5,10])assert.equal(tier(score,rank).name,'그랜드 마스터');
 for(const rank of [11,101,null])assert.equal(tier(score,rank).label,'마스터 I');
}
assert.deepEqual([2200,2300,2400,2500].map(s=>tier(s,101).step),['IV','III','II','I']);
const data={score:10000,rank:1,seasonEndsAt:'2026-10-05T00:00:00Z',top100:[],offers:[],history:[],nextRefreshAt:'2026-10-04T04:00:00Z'};
const home=arenaView({data,page:'home'});assert(home.includes('챔피언'));assert(home.includes('10,000점'));assert(home.includes('점수 상한 없음'));assert(!home.includes('다음 구간까지 0점'));
assert(arenaView({data,page:'opponents'}).includes('30분마다 비슷한 점수의 상대 4명이'));
assert(arenaView({data,page:'ranking'}).includes('30분마다 갱신'));
assert.equal(tierArt(tier(3000,1)),'arena-art/tier-champion-v1.webp');
const sql=fs.readFileSync(new URL('../supabase/arena_halfhour_ranks.sql',import.meta.url),'utf8');assert(!sql.includes('7200'));assert(sql.includes("'*/30 * * * *'"));assert(sql.includes('to_timestamp((v_bucket+1)*1800)'));assert(sql.includes('greatest(0,coalesce(v_arena.score,0)+v_delta)'));
console.log('PASS elite common floor, champion/challenger/grandmaster ranks, master subdivisions, uncapped display and 30-minute buckets.');
