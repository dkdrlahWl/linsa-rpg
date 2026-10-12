// 칭호 (titles): cosmetic only. Earned automatically from state + server stats (arena/lotto/market/investment).
// Add new tiers by appending rows; ids are permanent (saved in state.titles).
import {BOSSES,STAGES} from './data.mjs';
import {FISH} from './fishing-data.mjs';
import {COSTUMES} from './costumes.mjs';

export const TITLE_GRADES=[
 {id:'common',name:'일반'},{id:'rare',name:'희귀'},{id:'epic',name:'영웅'},{id:'legend',name:'전설'},{id:'myth',name:'신화'}
];
const G={common:0,rare:1,epic:2,legend:3,myth:4};
const tower=(s,f)=>(s.tower?.cleared||[]).includes(f);
const expl=(s,t)=>(s.exploration?.cleared||[]).includes(t);
const citadelBosses=s=>new Set([...(s.citadelEver||[]),...(s.citadelClaims?.bosses||[])]);
const fishOf=(s,rarity)=>Object.keys(s.fishing?.collection||{}).some(id=>FISH.find(f=>f.id===id)?.rarity===rarity);
const equippedItems=s=>Object.values(s.equipped||{}).map(id=>(s.items||[]).find(i=>i.id===id)).filter(Boolean);
const weekly=BOSSES.filter(b=>b.weekly).map(b=>b.id),daily=BOSSES.filter(b=>!b.weekly).map(b=>b.id);
const st=s=>s.titleStats||{};

// [id, name, category, grade, condition text, check(state, cp)]
const ROWS=[
 ['lv30','새싹 모험가','레벨','common','레벨 30 달성',s=>s.level>=30],
 ['lv100','숙련된 모험가','레벨','rare','레벨 100 달성',s=>s.level>=100],
 ['lv200','이름 없는 영웅','레벨','epic','레벨 200 달성',s=>s.level>=200],
 ['lv250','한계를 넘은 자','레벨','legend','레벨 250 달성',s=>s.level>=250],
 ['job5','다섯 번째 각성','전직','epic','5차 전직 완료',s=>(s.advancement||0)>=4],
 ['cp10','강철의 의지','전투력','rare','전투력 10만',(s,cp)=>cp()>=100000],
 ['cp50','군림하는 자','전투력','legend','전투력 50만',(s,cp)=>cp()>=500000],
 ['kill1','천 마리 사냥꾼','사냥','common','누적 처치 1만',s=>(s.huntKills||0)>=10000],
 ['kill50','학살자','사냥','legend','누적 처치 50만',s=>(s.huntKills||0)>=500000],
 ['field','개척자','사냥','epic','마지막 사냥터에서 사냥 성공',s=>(s.bestStage??-1)>=STAGES.length-1],
 ['tower10','탑의 도전자','탑','rare','시련의 탑 10층 클리어',s=>tower(s,10)],
 ['tower20','탑의 정복자','탑','legend','시련의 탑 20층 클리어',s=>tower(s,20)],
 ['boss30','보스 사냥꾼','보스','epic','보스 30종 전부 처치',s=>BOSSES.every(b=>(s.cleared||[]).includes(b.id))],
 ['expl0','유적의 탐험가','탐험','rare','달빛 수림의 유적 클리어',s=>expl(s,0)],
 ['expl1','불꽃 광산의 생존자','탐험','epic','용암 수정 광산 클리어',s=>expl(s,1)],
 ['expl2','별의 심연을 걸은 자','탐험','legend','별의 심연 성전 클리어',s=>expl(s,2)],
 ['citadel6','성채 파괴자','성채','legend','암흑성채 보스 6마리 전부 처치',s=>citadelBosses(s).size>=6],
 ['raid0','심해의 정복자','레이드','rare','탈라손(Lv.60) 레이드 클리어',s=>(s.raidCleared||[]).includes(0)],
 ['raid1','용철을 꺾은 자','레이드','epic','이그니바르(Lv.100) 레이드 클리어',s=>(s.raidCleared||[]).includes(1)],
 ['raid2','떨어진 별을 잠재운 자','레이드','legend','아스테리아(Lv.150) 레이드 클리어',s=>(s.raidCleared||[]).includes(2)],
 ['raid3','시간을 멈춘 자','레이드','myth','녹스 에온(Lv.200) 레이드 클리어',s=>(s.raidCleared||[]).includes(3)],
 ['arena10','투기장의 신인','아레나','common','아레나 누적 10승',s=>(st(s).arenaWins||0)>=10],
 ['arena1st','투기장의 군주','아레나','myth','아레나 시즌 최종 1위',s=>st(s).arenaChampion===true],
 ['fishL','전설을 낚은 자','낚시','epic','전설 물고기 처음 낚기',s=>fishOf(s,4)],
 ['fishM','신화의 어부','낚시','legend','신화 물고기 처음 낚기',s=>fishOf(s,5)],
 ['fishAll','바다의 백과사전','낚시','myth','물고기 도감 50종 완성',s=>FISH.every(f=>(s.fishing?.collection||{})[f.id]!==undefined)],
 ['star25','별을 품은 자','강화','legend','25성 장비 보유',s=>(s.items||[]).some(i=>(i.stars||0)>=25)],
 ['pot3','잠재의 지배자','강화','epic','레전더리 3줄 잠재 장비 보유',s=>(s.items||[]).some(i=>(i.lines||[]).length===3&&i.lines.every(l=>l.grade>=5))],
 ['jackpot','행운의 여신','운','legend','돌림판 잭팟 당첨',s=>(s.wheelJackpots||0)>=1],
 ['costume','옷장의 주인','수집','epic','코스튬 '+COSTUMES.length+'종 전부 보유',s=>COSTUMES.every(c=>(s.costumes||[]).includes(c.id))],
 ['boss1','첫 걸음','보스','common','일일 보스 처음 처치',s=>(s.cleared||[]).some(id=>daily.includes(id))],
 ['weekly','주간의 지배자','보스','epic','주간 보스 '+weekly.length+'종 전부 처치',s=>weekly.every(id=>(s.cleared||[]).includes(id))],
 ['tower5','탑의 등반가','탑','common','시련의 탑 5층 클리어',s=>tower(s,5)],
 ['tower15','탑의 수호자','탑','epic','시련의 탑 15층 클리어',s=>tower(s,15)],
 ['citadel1','성채의 첫 발','성채','rare','암흑성채 첫 보스 처치',s=>citadelBosses(s).has(1)],
 ['citadel11','칠흑을 걷는 자','성채','epic','암흑성채 11층 도달',s=>(s.citadelMaxFloor||0)>=11||[...citadelBosses(s)].some(b=>b>=3)],
 ['arena100','투기장의 강자','아레나','epic','아레나 누적 100승',s=>(st(s).arenaWins||0)>=100],
 ['streak10','무패의 투사','아레나','legend','아레나 100연승',s=>(st(s).arenaStreak||0)>=100],
 ['fish1','낚시 입문','낚시','common','첫 물고기 낚기',s=>Object.keys(s.fishing?.collection||{}).length>0],
 ['fish1000','강태공','낚시','rare','물고기 누적 1,000마리',s=>(s.fishing?.totalCatch||0)>=1000],
 ['rod40','심해의 낚시꾼','낚시','rare','낚싯대 Lv.40 (천상의 심해 해금)',s=>(s.fishing?.rod||0)>=40],
 ['rod50','별을 낚는 손','낚시','epic','낚싯대 Lv.50',s=>(s.fishing?.rod||0)>=50],
 ['tank10','수족관 주인','낚시','epic','수족관 10칸까지 확장',s=>(s.fishing?.slots||0)>=10],
 ['lotto','대박의 주인공','운','legend','주간 로또 1등 당첨',s=>st(s).lottoWin===true],
 ['invest','큰손 투자자','투자','legend','투자 누적 수익 1억 G',s=>(st(s).investProfit||0)>=1e8],
 ['market','거래의 달인','거래소','rare','거래소 판매 100건',s=>(st(s).marketSales||0)>=100],
 ['cube1000','큐브 중독자','강화','epic','큐브 누적 1,000회 사용',s=>(s.cubeUses||0)>=1000],
 ['star20set','빛나는 별의 갑주','강화','legend','20성 이상 장비로 9부위 전부 착용',s=>{const e=equippedItems(s);return e.length>=9&&e.every(i=>(i.stars||0)>=20);}],
 ['boss200set','보스의 유산','장비','legend','Lv.200 보스 장비로 9부위 전부 착용',s=>{const e=equippedItems(s);return e.length>=9&&e.every(i=>i.boss&&i.level>=200);}],
 ['gold10','황금 산맥','재산','epic','골드 10억 보유',s=>(s.gold||0)>=1e9],
];
export const TITLES=ROWS.map(([id,name,category,grade,condition,check],i)=>({id,name,category,grade,rank:G[grade],condition,check,order:i}));
export const TITLE_BY_ID=Object.fromEntries(TITLES.map(t=>[t.id,t]));
// Animated badges (귀한 칭호): all 전설·신화.
export const titleAnimated=t=>t&&t.rank>=3;

// Returns ids newly earned. `cp` is a lazy combat-power getter.
export function newlyEarnedTitles(s,cp){
 const owned=s.titles||{};let cached;const power=()=>cached??=cp();
 return TITLES.filter(t=>!owned[t.id]).filter(t=>{try{return !!t.check(s,power);}catch{return false;}}).map(t=>t.id);
}
