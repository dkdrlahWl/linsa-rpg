// Citadel chest rolls must match the lobby text: lock/scroll 10~35%, boss gear 4~5%, weapon at half weight.
import assert from 'node:assert/strict';
import {CITADEL_BOSS_REWARDS,grantCitadelChests} from './citadel-rewards.mjs';
let seed=12345;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const N=40000;
for(let b=1;b<=6;b++){
 const r=CITADEL_BOSS_REWARDS[b-1];let lock=0,scroll=0,gear=0,frag=0;
 for(let i=0;i<N;i++){
  const room={id:'r',mode:'citadel',floor:0,members:[{id:'u',citadelChests:[b]}]};
  const {reward}=grantCitadelChests({items:[],materials:{}},room,'u',{random,now:Date.now(),uuid:()=>String(seed)});
  lock+=reward.potentialLock;scroll+=reward.scroll;gear+=reward.items.length;frag+=reward.fragment;
 }
 assert.equal(frag,N*10);
 for(const [name,got,want] of [['lock',lock/N,r.lock],['scroll',scroll/N,r.scroll],['gear',gear/N,r.gear]])
  assert.ok(Math.abs(got-want)<Math.max(.006,want*.15),`boss ${b} ${name}: ${got} vs ${want}`);
 console.log(`boss ${b}: lock ${(lock/N*100).toFixed(1)}% scroll ${(scroll/N*100).toFixed(1)}% gear ${(gear/N*100).toFixed(2)}% (shown ${r.gear*100}%)`);
}
console.log('PASS: citadel chest rates match the displayed rates.');
