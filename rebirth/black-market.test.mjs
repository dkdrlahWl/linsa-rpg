import assert from 'node:assert/strict';
import {execute,initialState} from './engine.mjs';
import * as B from './black-market.mjs';
// 갱신 시각: 한국시간 00·12·18시
const at=(iso)=>B.blackMarketRotation(Date.parse(iso)).id;
assert.equal(at('2026-10-18T02:59:59Z'),'2026-10-18-00');
assert.equal(at('2026-10-18T03:00:00Z'),'2026-10-18-12');
assert.equal(at('2026-10-18T09:00:00Z'),'2026-10-18-18');
assert.equal(at('2026-10-18T15:00:00Z'),'2026-10-19-00');
// 진열 3개, 중복 없음, 같은 주기는 항상 같은 진열
let boss=0;const N=60000;
for(let i=0;i<N;i++){const o=B.blackMarketOffers('r'+i);assert.equal(o.length,3);assert.equal(new Set(o.map(x=>x.id)).size,3);assert.ok(o.filter(x=>x.kind==='boss').length<=1);if(o.some(x=>x.kind==='boss'))boss++;}
assert.ok(Math.abs(boss/N-.05)<.006,'boss chance '+boss/N);
assert.deepEqual(B.blackMarketOffers('2026-10-18-12'),B.blackMarketOffers('2026-10-18-12'));
// 가격: 100~190은 셀리아 판매가 2배, 200은 무기 6억·나머지 3억
assert.equal(B.blackMarketBossPrice(100,1),6000000);assert.equal(B.blackMarketBossPrice(190,0),180000000);assert.equal(B.blackMarketBossPrice(170,0),136800000);assert.equal(B.blackMarketBossPrice(160,0),76800000);assert.equal(B.blackMarketBossPrice(100,0),14400000);assert.equal(B.blackMarketBossPrice(180,1),44000000);
assert.equal(B.blackMarketBossPrice(200,0),720000000);assert.equal(B.blackMarketBossPrice(200,3),300000000);
// 구매: 재고 제한, 지난 주기 거부, 골드 차감
let n=0;const now=Date.parse('2026-10-18T05:00:00Z'),ctx=()=>({now,random:Math.random,uuid:()=>'id'+n++});
let s=initialState('warrior','테스터',ctx());s.gold=1e10;
const rot=B.blackMarketRotation(now).id,offer=B.blackMarketOffers(rot)[0];
const r=execute(s,'blackMarketBuy',{rotation:rot,index:0,quantity:offer.stock},ctx());
assert.equal(r.state.gold,1e10-offer.price*offer.stock);
assert.throws(()=>execute(r.state,'blackMarketBuy',{rotation:rot,index:0,quantity:1},ctx()),/BLACK_MARKET_SOLD_OUT/);
assert.throws(()=>execute(r.state,'blackMarketBuy',{rotation:'2026-10-18-00',index:1,quantity:1},ctx()),/BLACK_MARKET_EXPIRED/);
s.gold=0;assert.throws(()=>execute(s,'blackMarketBuy',{rotation:rot,index:1,quantity:1},ctx()),/INSUFFICIENT_GOLD/);
// 보스장비 구매 시 내 직업 장비 지급
let id;for(let i=0;!id;i++){const t=Date.parse('2026-01-01T00:00:00Z')+i*86400000;for(const h of [0,12,18]){const rr=B.blackMarketRotation(t+(h-9+24)%24*3600000+60000).id;if(B.blackMarketOffers(rr).some(o=>o.kind==='boss')){id={rr,t:t+(h-9+24)%24*3600000+60000};break;}}}
const idx=B.blackMarketOffers(id.rr).findIndex(o=>o.kind==='boss');
let s2=initialState('mage','테스터',{...ctx(),now:id.t});s2.gold=1e10;
const r2=execute(s2,'blackMarketBuy',{rotation:id.rr,index:idx},{...ctx(),now:id.t});
const item=r2.events[0].item;assert.equal(item.classId,'mage');assert.equal(item.boss,true);assert.ok(item.baseStats);
// 운영자 특별 진열: 해당 계정·주기 1칸만 교체, 지정 직업 장비 지급
{let s3=initialState('rogue','테스터',ctx());s3.gold=1e10;s3.blackMarketSpecial={rotation:rot,index:0,level:190,slot:0,classId:'archer'};
const o=B.blackMarketOffersFor(s3,rot);assert.equal(o[0].price,180000000);assert.deepEqual(o.slice(1),B.blackMarketOffers(rot).slice(1));
const r3=execute(s3,'blackMarketBuy',{rotation:rot,index:0},ctx());const it=r3.events[0].item;assert.equal(it.classId,'archer');assert.equal(it.level,190);assert.equal(it.slot,0);
assert.throws(()=>execute(r3.state,'blackMarketBuy',{rotation:rot,index:0},ctx()),/BLACK_MARKET_SOLD_OUT/);
s3.blackMarketSpecial.rotation='2026-10-18-00';assert.deepEqual(B.blackMarketOffersFor(s3,rot),B.blackMarketOffers(rot));}
console.log('PASS black market: KST 00/12/18 rotation, 3 unique offers, boss 5%, prices, stock limits, expiry, class gear');
