// 2026-11-05 낚시 v3: 토큰 경제 · 낚싯대 Lv.50 · 강화 · 인챈트 · 크기 · 돌연변이 · 합성 · 각성 · 초기화 환불.
import assert from 'node:assert/strict';
import {ROD_MAX,ROD_TIERS,SPOTS,FISH,BAITS,FISH_SIZES,MUTATIONS,ROD_TOKEN_BONUS,ENCHANT_SLOT_TIERS,rodGoldCost,rodDiamondCost,fishPrice,fishYield,aquariumExpandCost,legacyRodGoldCost,legacyRodDiamondCost} from './fishing-data.mjs';
import {fishingCommand,normalizeFishing,FISHING_PROTOCOL,fishingV3Refund,fishingMeter,fishingStep,fishingTarget,fishingMeterWon,fishingDifficulty} from './fishing-model.mjs';
let n=0;const uuid=()=>'id-'+(++n);
const seq=seed=>{let x=seed>>>0;return ()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/4294967296);};
const now0=Date.UTC(2026,10,5,6);
// 데이터
assert.equal(ROD_MAX,16);assert.equal(ROD_TIERS.length,16);assert.deepEqual(SPOTS.map(s=>s.level),[1,3,5,7,9,11,13,15]);assert.deepEqual(SPOTS.map(s=>s.depth),[1,8,15,22,29,36,43,50]);assert.ok(SPOTS.every(s=>!Object.keys(s.special||{}).length),'no spot buffs');
const rodTokens=ROD_TIERS.reduce((a,r)=>a+r.tokens,0);assert.ok(rodTokens>2e7&&rodTokens<4e7,String(rodTokens));const rodDia=ROD_TIERS.reduce((a,r)=>a+r.diamonds,0);assert.ok(rodDia>1800&&rodDia<2600,String(rodDia));assert.ok(ROD_TIERS.every((r,i)=>!i||r.power>ROD_TIERS[i-1].power&&r.tokens>ROD_TIERS[i-1].tokens));
assert.ok(Math.abs(FISH_SIZES.reduce((a,x)=>a+x.p,0)-1)<1e-9);assert.deepEqual(MUTATIONS.map(m=>m.id),['silver','gold','rainbow']);
assert.ok(BAITS.filter(b=>b.id!=='worm').every(b=>b.tokens>0&&!b.diamonds));
assert.deepEqual(ENCHANT_SLOT_TIERS,[1,6,12]);
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
const fresh=()=>({gold:1e9,materials:{},fishing:{version:3,rodScheme:16,rod:16,xp:0,diamonds:0,bait:{worm:10000},fish:[],aquarium:[],slots:3,bank:0,bankAt:now0,collection:{},daily:{},cast:null,lastCatch:null,tokens:0,enchants:[],autoUntil:now0+864e5}});
{
 const s=fresh(),random=seq(7);s.fishing.bait.star=1000;let now=now0,sizes={},muts=0,extra=0;
 assert.throws(()=>fishingCommand(s,'fishCast',{protocol:4,spot:'brook',bait:'worm'},{now,random,uuid}),/FISHING_REFRESH_REQUIRED/);
 for(let i=0;i<400;i++){
  const {castId}=fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:i%2?'moon':'volcano',bait:i%2?'star':'worm'},{now,random,uuid});now=s.fishing.cast.biteAt;
  const r=fishingCommand(s,'fishHook',{id:castId,auto:true},{now,random,uuid});
  if(r.fish){sizes[r.fish.size]=(sizes[r.fish.size]||0)+1;if(r.fish.mut)muts++;if(r.extra)extra++;}
  if(s.fishing.fish.length>=140){fishingCommand(s,'fishSell',{ids:s.fishing.fish.map(x=>x.id)},{now,random,uuid});}
  now+=1000;s.fishing.daily.casts=0;
 }
 assert.ok(sizes.small>sizes.large&&sizes.large>(sizes.big||0));assert.equal(extra,0);
 const before=s.fishing.tokens,ids=s.fishing.fish.map(x=>x.id),want=Math.round(s.fishing.fish.reduce((a,x)=>a+fishPrice(x),0)*(1+ROD_TOKEN_BONUS*15));
 const sold=fishingCommand(s,'fishSell',{ids},{now,random,uuid});assert.equal(sold.tokens,want);assert.equal(s.fishing.tokens,before+want);
 s.fishing.tokens=1e7;s.fishing.diamonds=1000;
 assert.throws(()=>fishingCommand(s,'fishEnhance',{},{now,random,uuid}),/FISHING_ENHANCE_REMOVED/);
 s.fishing.rod=5;s.fishing.enchants=[];
 fishingCommand(s,'fishEnchant',{},{now,random,uuid});assert.equal(s.fishing.enchants.length,1);
 assert.throws(()=>fishingCommand(s,'fishEnchant',{locks:[0]},{now,random,uuid}),/INVALID_FISHING_ENCHANT/,'cannot lock every open slot');
 s.fishing.rod=16;const t0=s.fishing.tokens,d0=s.fishing.diamonds;fishingCommand(s,'fishEnchant',{locks:[0]},{now,random,uuid});assert.equal(s.fishing.enchants.length,3);assert.equal(d0-s.fishing.diamonds,140);assert.equal(s.fishing.tokens,t0,'enchant costs diamonds, not tokens');
 s.fishing.diamonds=139;assert.throws(()=>fishingCommand(s,'fishEnchant',{locks:[0]},{now,random,uuid}),/FISHING_DIAMONDS_REQUIRED/);s.fishing.diamonds=1000;
 {const t={fishing:structuredClone(s.fishing)};t.fishing.rod=3;t.fishing.enchants=[{id:t.fishing.enchants[0]?.id||'bite',tier:3}];t.fishing.tokens=1e9;t.fishing.diamonds=1e6;const r=fishingCommand(t,'fishRodBuy',{tier:4},{now,random,uuid});assert.equal(t.fishing.rod,4);assert.deepEqual(t.fishing.enchants,[]);assert.equal(r.enchantReset,true);}
 {const b0=s.fishing.bait.star||0;fishingCommand(s,'fishBaitBuy',{bait:'star',count:10,currency:'tokens'},{now,random,uuid});assert.equal(s.fishing.bait.star,b0+10);}
 assert.throws(()=>fishingCommand(s,'fishBaitBuy',{bait:'star',count:10,currency:'diamonds'},{now,random,uuid}),/FISHING_REFRESH_REQUIRED/);
 const t1=s.fishing.tokens;fishingCommand(s,'fishAquariumExpand',{},{now,random,uuid});assert.equal(t1-s.fishing.tokens,aquariumExpandCost(3));assert.equal(s.fishing.slots,4);
}
// 합성 · 황금 합성 · 각성
{
 const s=fresh(),f=s.fishing,now=now0,mk=(o)=>({id:uuid(),species:'fish-41',weight:2000,size:'small',caughtAt:now,...o});
 for(const c of ['fishFuse','fishGoldFuse'])assert.throws(()=>fishingCommand(s,c,{ids:[]},{now,random:()=>0,uuid}),/FISHING_FUSE_REMOVED/);
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
 s.fishing.tokens=ROD_TIERS[1].tokens;s.fishing.diamonds=ROD_TIERS[1].diamonds-1;assert.throws(()=>fishingCommand(s,'fishRodBuy',{tier:2},{now:now0,random:Math.random,uuid}),/FISHING_DIAMONDS_REQUIRED/);s.fishing.diamonds++;assert.throws(()=>fishingCommand(s,'fishRodBuy',{tier:3},{now:now0,random:Math.random,uuid}),/FISHING_REFRESH_REQUIRED/);fishingCommand(s,'fishRodBuy',{tier:2},{now:now0,random:Math.random,uuid});assert.equal(s.fishing.rod,2);assert.equal(s.fishing.tokens,0);assert.equal(s.fishing.diamonds,0);
 assert.throws(()=>fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'moon',bait:'worm'},{now:now0,random:Math.random,uuid}),/FISHING_ROD_REQUIRED/);s.fishing.rod=3;
 fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'moon',bait:'worm'},{now:now0,random:Math.random,uuid});}
console.log('PASS fishing v3: data, refund+reset, tokens, 16 rods, enchant locks, baits, aquarium, fuse, gold fuse, awaken, spot gates');
// 미끼 등급 ↑ → 희귀 물고기 확률 ↑
{
 const {BAITS,baitGradeWeight}=await import('./fishing-data.mjs');
 const legend={rarity:4},common={rarity:0};
 let prev=0;for(const b of Object.values(BAITS)){const w=baitGradeWeight(legend,b)/baitGradeWeight(common,b);assert.ok(w>=prev);prev=w;}
 assert.ok(prev>5);
}
// 시험 계정 8종 → 16종 변환 · 강화 다이아 환불
{
 const s={gold:0,materials:{},fishing:{version:3,rod:4,enhance:3,diamonds:5,bait:{worm:1},fish:[],aquarium:[],slots:3,bank:0,bankAt:now0,collection:{},daily:{},tokens:0,enchants:[]}};
 fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'coral',bait:'worm'},{now:now0,random:Math.random,uuid});
 assert.equal(s.fishing.rod,7);assert.equal(s.fishing.diamonds,5+15+20+30);assert.equal(s.fishing.enhance,undefined);assert.equal(s.fishing.rodScheme,16);
}
// 등급별 무게 상한 · 대어 기록
{
 const {RARITY_SIZE_CAP,fishMaxWeight,fishSizeWeight,FISH_SIZES:Z}=await import('./fishing-data.mjs');
 const rec=Z.find(x=>x.id==='record');
 for(const d of FISH){const top=fishSizeWeight(d,rec,1);assert.ok(Math.abs(top-fishMaxWeight(d))<=1,d.id);assert.ok(fishSizeWeight(d,Z.find(x=>x.id==='big'),0)>=d.max);}
 assert.ok(RARITY_SIZE_CAP.every((x,i)=>!i||x>RARITY_SIZE_CAP[i-1]));
 const s={gold:0,materials:{},fishing:{version:3,rodScheme:16,rod:16,bait:{worm:1},fish:[],aquarium:[],slots:3,bank:0,bankAt:now0,collection:{},daily:{},tokens:0,enchants:[],autoUntil:now0+864e5}};
 let now=now0,records=0;
 for(let i=0;i<60;i++){const {castId}=fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'origin',bait:'worm'},{now,random:Math.random,uuid});now=s.fishing.cast.biteAt;const r=fishingCommand(s,'fishHook',{id:castId,auto:true},{now,random:Math.random,uuid});if(r.records)records++;s.fishing.fish=[];now+=1000;s.fishing.daily.casts=0;}
 assert.ok(records>0);for(const [k,b] of Object.entries(s.fishing.best)){assert.equal(FISH.find(x=>x.id===b.species).rarity,Number(k));assert.ok(b.weight<=fishMaxWeight(FISH.find(x=>x.id===b.species)));}
}
// Staff can fish, but cannot update public or personal record entries.
for(const role of ['isAdmin','isTester']){
 const s=fresh();s[role]=true;s.fishing.best={0:{species:'fish-01',weight:1}};const before=structuredClone(s.fishing.best);let now=now0,caught=0;const random=seq(19);
 for(let i=0;i<40;i++){
  const {castId}=fishingCommand(s,'fishCast',{protocol:FISHING_PROTOCOL,spot:'brook',bait:'worm'},{now,random,uuid});now=s.fishing.cast.biteAt;
  const result=fishingCommand(s,'fishHook',{id:castId,auto:true},{now,random,uuid});if(result.fish)caught++;now+=10000;
 }
 assert.ok(caught>0);assert.deepEqual(s.fishing.best,before);assert.equal(s.fishing.contest,undefined);
}
console.log('PASS administrator/tester catches preserve old data without updating records');
