// 2026-11-05 낚시 v3: 토큰 경제 · 낚싯대 Lv.50 · 강화 · 인챈트 · 크기 · 돌연변이 · 합성 · 각성 · 초기화 환불.
import assert from 'node:assert/strict';
import {ROD_MAX,ROD_TIERS,SPOTS,FISH,BAITS,FISH_SIZES,MUTATIONS,ROD_ENHANCE,rodGoldCost,rodDiamondCost,fishPrice,fishYield,aquariumExpandCost,legacyRodGoldCost,legacyRodDiamondCost} from './fishing-data.mjs';
import {fishingCommand,normalizeFishing,FISHING_PROTOCOL,fishingV3Refund,fishingMeter,fishingStep,fishingTarget,fishingMeterWon,fishingDifficulty} from './fishing-model.mjs';
let n=0;const uuid=()=>'id-'+(++n);
const seq=seed=>{let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);};
const now0=Date.UTC(2026,10,5,6);
// 데이터
assert.equal(ROD_MAX,8);assert.deepEqual(SPOTS.map(s=>s.level),[1,2,3,4,5,6,7,8]);assert.deepEqual(SPOTS.map(s=>s.depth),[1,8,15,22,29,36,43,50]);assert.ok(SPOTS.every(s=>!Object.keys(s.special||{}).length),'no spot buffs');
const rodTokens=ROD_TIERS.reduce((a,r)=>a+r.tokens,0);assert.ok(rodTokens>6e6&&rodTokens<8e6,String(rodTokens));assert.ok(ROD_TIERS.every((r,i)=>!i||r.power>ROD_TIERS[i-1].power&&r.tokens>ROD_TIERS[i-1].tokens));
const enhanceDia=ROD_ENHANCE.reduce((a,x)=>a+x.cost/x.chance,0);assert.ok(enhanceDia>2000&&enhanceDia<2800,String(enhanceDia));
assert.ok(Math.abs(FISH_SIZES.reduce((a,x)=>a+x.p,0)-1)<1e-9);assert.deepEqual(MUTATIONS.map(m=>m.id),['silver','gold','rainbow']);
assert.ok(BAITS.filter(b=>b.id!=='worm').every(b=>b.tokens>0&&!b.diamonds));
assert.equal(ROD_ENHANCE.length,10);
// 크기·돌연변이는 가치를 곱한다, 수족관은 제곱근만.
const base={species:'fish-49',size:'normal',weight:1};
assert.ok(Math.abs(fishPrice({...base,size:'record',mut:'rainbow'})/fishPrice(base)-42)<.05);
assert.ok(Math.abs(fishYield({...base,size:'monster'})/fishYield(base)-Math.sqrt(5))<.01);
// 초기화 환불: v2 상태 → 우편으로 골드·다이아, 낚시는 0부터, 도감·대회 기록 유지
{
 const s={gold:0,materials:{},fishing:{version:1,rod:60,xp:1000,diamonds:7,bait:{worm:500,shrimp:15},fish:[{id:'a',species:'fish-01',weight:100}],aquarium:[{id:'b',species:'fish-49',weight:200000}],slots:5,bank:5000,bankAt:now0,collection:{'fish-01':100},contest:{x:1},daily:{},cast:null,lastCatch:null}};
 const expect=fishingV3Refund(structuredClone(s.fishing),now0);let rg=1000,rd=0;for(let L=1;L<60;L++){rg+=legacyRodGoldCost(L);rd+=legacyRodDiamondCost(L);}
 assert.ok(expect.gold>rg);assert.equal(expect.diamonds,rd+2);
 normalizeFishing(s,now0);const f=s.fishing;
 assert.equal(f.version,3);assert.equal(f.rod,1);assert.equal(f.slots,3);assert.deepEqual(f.fish,[]);assert.deepEqual(f.aquarium,[]);assert.deepEqual(f.bait,{worm:20});assert.equal(f.tokens,0);
 assert.equal(f.diamonds,7);assert.deepEqual(f.collection,{'fish-01':100});assert.deepEqual(f.contest,{x:1});
 const mail=s.rewardMailbox.find(m=>m.id==='fishing-v3-refund');assert.equal(mail.rewards.gold,expect.gold);assert.equal(mail.rewards.diamond,expect.diamonds);
 normalizeFishing(s,now0+1000);assert.equal(s.rewardMailbox.filter(m=>m.id==='fishing-v3-refund').length,1,'refund once');
}
// 낚시 → 판매 토큰 → 강화 · 인챈트 · 미끼 · 수족관
const fresh=()=>({gold:1e9,materials:{},fishing:{version:3,rod:50,xp:0,diamonds:0,bait:{worm:10000},fish:[],aquarium:[],slots:3,bank:0,bankAt:now0,collection:{},daily:{},cast:null,lastCatch:null,tokens:0,enhance:0,enchants:[],autoUntil:now0+864e5}});
{
 const s=fresh(),random=seq(7);s.fishing.bait.twin=1000;let now=now0,sizes={},muts=0,extra=0;
 assert.throws(()=>fishingCommand(s,'fishCast',{protocol:4,spot:'brook',bait:'worm'},{now,random,uuid}),/FISHING_REFRESH_REQUIRED/);
 for(let i=0;i<400;i++){
  const {castId}=fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:i%2?'moon':'volcano',bait:i%2?'twin':'worm'},{now,random,uuid});now=s.fishing.cast.biteAt;
  const r=fishingCommand(s,'fishHook',{id:castId,auto:true},{now,random,uuid});
  if(r.fish){sizes[r.fish.size]=(sizes[r.fish.size]||0)+1;if(r.fish.mut)muts++;if(r.extra)extra++;}
  if(s.fishing.fish.length>=140){fishingCommand(s,'fishSell',{ids:s.fishing.fish.map(x=>x.id)},{now,random,uuid});}
  now+=1000;s.fishing.daily.casts=0;
 }
 assert.ok(sizes.small>sizes.large&&sizes.large>(sizes.big||0));assert.ok(extra>0,'twin bait double catch');
 const before=s.fishing.tokens,ids=s.fishing.fish.map(x=>x.id),want=Math.round(s.fishing.fish.reduce((a,x)=>a+fishPrice(x),0));
 const sold=fishingCommand(s,'fishSell',{ids},{now,random,uuid});assert.equal(sold.tokens,want);assert.equal(s.fishing.tokens,before+want);
 s.fishing.tokens=1e7;s.fishing.diamonds=1000;
 const e1=fishingCommand(s,'fishEnhance',{},{now,random:()=>0,uuid});assert.equal(s.fishing.diamonds,1000-ROD_ENHANCE[0].cost);assert.equal(e1.success,true);assert.equal(s.fishing.enhance,1);
 const fail=fishingCommand(s,'fishEnhance',{},{now,random:()=>.99,uuid});assert.equal(fail.success,false);assert.equal(s.fishing.enhance,1,'fail keeps level');
 fishingCommand(s,'fishEnchant',{},{now,random,uuid});assert.equal(s.fishing.enchants.length,1);
 assert.throws(()=>fishingCommand(s,'fishEnchant',{locks:[0]},{now,random,uuid}),/INVALID_FISHING_ENCHANT/,'cannot lock every open slot');
 s.fishing.enhance=8;const t0=s.fishing.tokens;fishingCommand(s,'fishEnchant',{locks:[0]},{now,random,uuid});assert.equal(s.fishing.enchants.length,3);assert.equal(t0-s.fishing.tokens,60000);
 fishingCommand(s,'fishBaitBuy',{bait:'star',count:10,currency:'tokens'},{now,random,uuid});assert.equal(s.fishing.bait.star,10);
 assert.throws(()=>fishingCommand(s,'fishBaitBuy',{bait:'star',count:10,currency:'diamonds'},{now,random,uuid}),/FISHING_REFRESH_REQUIRED/);
 const t1=s.fishing.tokens;fishingCommand(s,'fishAquariumExpand',{},{now,random,uuid});assert.equal(t1-s.fishing.tokens,aquariumExpandCost(3));assert.equal(s.fishing.slots,4);
}
// 합성 · 황금 합성 · 각성
{
 const s=fresh(),f=s.fishing,now=now0,mk=(o)=>({id:uuid(),species:'fish-41',weight:2000,size:'small',caughtAt:now,...o});
 f.fish=[mk(),mk(),mk()];const r=fishingCommand(s,'fishFuse',{ids:f.fish.map(x=>x.id)},{now,random:()=>0,uuid});assert.equal(r.success,true);assert.equal(f.fish.length,1);assert.equal(f.fish[0].species,'fish-41');assert.equal(f.fish[0].size,'large','jackpot: two sizes');assert.equal(f.fish[0].mut,'rainbow');
 {const seqR=[.5,.99,.99,.99];let k=0;f.fish=[mk(),mk(),mk()];const r1=fishingCommand(s,'fishFuse',{ids:f.fish.map(x=>x.id)},{now,random:()=>seqR[k++]??.99,uuid});assert.equal(r1.success,true);assert.equal(r1.jump,1);assert.equal(f.fish[0].size,'normal');}
 f.fish=[mk({size:'big'}),mk({size:'big'}),mk({size:'big'})];const r2=fishingCommand(s,'fishFuse',{ids:f.fish.map(x=>x.id)},{now,random:()=>.99,uuid});assert.equal(r2.success,false);assert.equal(f.fish.length,1);assert.equal(f.fish[0].size,'big');
 f.fish=[mk(),mk({size:'normal'}),mk()];assert.throws(()=>fishingCommand(s,'fishFuse',{ids:f.fish.map(x=>x.id)},{now,random:()=>0,uuid}),/FISHING_FUSE_MISMATCH/);
 f.fish=Array.from({length:5},(_,i)=>mk({mut:'gold',species:i?'fish-41':'fish-49'}));const g1=fishingCommand(s,'fishGoldFuse',{ids:f.fish.map(x=>x.id)},{now,random:()=>0,uuid});assert.equal(g1.success,true);assert.equal(f.fish.length,1);assert.equal(f.fish[0].mut,'rainbow');assert.equal(f.fish[0].species,'fish-49');
 f.aquarium=[mk({id:'t'})];f.fish=[mk(),mk(),mk()];
 fishingCommand(s,'fishAwaken',{id:'t'},{now,random:()=>0,uuid});assert.equal(f.aquarium[0].star,1);assert.equal(f.fish.length,2);
 fishingCommand(s,'fishAwaken',{id:'t'},{now,random:()=>0,uuid});assert.equal(f.aquarium[0].star,2);assert.equal(f.fish.length,0);
 assert.throws(()=>fishingCommand(s,'fishAwaken',{id:'t'},{now,random:()=>0,uuid}),/FISHING_AWAKEN_REQUIRED/);
 assert.ok(fishYield(f.aquarium[0])>fishYield({...f.aquarium[0],star:0}));
}
// 손맛 낚시: 챔질 → 서버가 입력을 다시 계산해서 판정 · 자동 낚시권 · 줄 끊김
{
 const s=fresh(),f=s.fishing;f.autoUntil=0;let now=now0,won=0,lost=0,bites=0;const random=seq(3);
 assert.throws(()=>fishingCommand(s,'fishAutoBuy',{plan:'nope'},{now,random,uuid}),/INVALID_FISHING_AUTO/);
 for(let i=0;i<60;i++){
  const {castId}=fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'abyss',bait:'worm'},{now,random,uuid});now=f.cast.biteAt;
  if(i===0)assert.throws(()=>fishingCommand(s,'fishHook',{id:castId,auto:true},{now,random,uuid}),/FISHING_AUTO_REQUIRED/);
  const r=fishingCommand(s,'fishHook',{id:castId},{now,random,uuid});
  if(r.type!=='fishBite'){now+=1000;f.daily.casts=0;continue;}
  bites++;const c=f.cast,m=fishingMeter();let inputs='';
  const good=i%2===0;while(!m.finished){const t=fishingTarget(c,m.tick+1),inp=good?m.cursor<t:false;fishingStep(c,inp,m);inputs+=inp?'1':'0';}
  const done=fishingCommand(s,'fishFinish',{id:castId,inputs},{now:now+5000,random,uuid});assert.equal(done.won,good?fishingMeterWon(c,m):false);
  if(done.won)won++;else lost++;now+=6000;f.daily.casts=0;f.fish=[];
 }
 assert.ok(bites>40&&won>10&&lost>10,JSON.stringify({bites,won,lost}));
 assert.throws(()=>fishingCommand(s,'fishFinish',{id:'x',inputs:''},{now,random,uuid}),/FISHING_CAST_MISSING/);
 fishingCommand(s,'fishAutoBuy',{plan:'h24'},{now,random,uuid});assert.equal(f.autoUntil,now+864e5);fishingCommand(s,'fishAutoBuy',{plan:'d3'},{now,random,uuid});assert.equal(f.autoUntil,now+864e5*4,'stacks');
 const weak=fishingDifficulty({species:'fish-70',size:'record'},10);assert.equal(weak.snap,true);
}
// 낚시터 잠금: 낚싯대 레벨
{const s=fresh();s.fishing.rod=1;assert.throws(()=>fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'moon',bait:'worm'},{now:now0,random:Math.random,uuid}),/FISHING_ROD_REQUIRED/);
 s.fishing.tokens=ROD_TIERS[1].tokens;assert.throws(()=>fishingCommand(s,'fishRodBuy',{tier:3},{now:now0,random:Math.random,uuid}),/FISHING_REFRESH_REQUIRED/);fishingCommand(s,'fishRodBuy',{tier:2},{now:now0,random:Math.random,uuid});assert.equal(s.fishing.rod,2);assert.equal(s.fishing.tokens,0);
 fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'moon',bait:'worm'},{now:now0,random:Math.random,uuid});}
console.log('PASS fishing v3: data, refund+reset, tokens, enhance, enchant locks, baits, aquarium, fuse, gold fuse, awaken, spot gates');
