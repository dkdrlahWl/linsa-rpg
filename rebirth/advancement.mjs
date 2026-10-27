import {PRIEST_SKILLS,beginPriest,stepPriest} from './priest.mjs?v=fifth-114';
// Third-job skills share a deterministic pulse scheduler across solo and co-op combat.
export const THIRD_NAMES={priest:'빛의 대사제',warrior:'소드 엠페러',mage:'엘리멘탈 로드',archer:'윈드 마스터',rogue:'섀도 팬텀',pirate:'스톰 커맨더'};
const skill=(name,hits,damage,interval,range,radius,mode,art,description)=>({name,type:'attack',hits,damage,interval,range,radius,mode,art,cooldown:18,description});
export const THIRD_SKILLS={
 priest:PRIEST_SKILLS[3],
 warrior:skill('천공 참렬',6,1.5,2,650,430,'area',0,'거대한 검기를 6회 연속 폭발 · 150% × 6 · 넓은 범위'),
 mage:skill('아스트라 폴',10,.9,5,950,480,'area',1,'지정 위치에 4.5초 마력 폭풍 · 90% × 10 · 지속 범위'),
 archer:skill('실피드 레인',9,1.1,2,1000,480,'volley',2,'추적 마력 화살 9연사 · 110% × 9 · 폭발 반경 480 · 긴 사거리'),
 rogue:skill('팬텀 블레이드',12,.64,1,650,360,'area',3,'그림자 칼날 12연격 · 64% × 12 · 빠른 집중 공격'),
 pirate:skill('오비탈 캐논',6,10/6,4,900,520,'area',4,'목표 지역에 6연속 포격 · 총 1000% · 대형 폭발'),
};
export const firstJobUnlocked=s=>s.firstAdvancement===true||(s.advancement||0)>=1;
export const jobStage=s=>firstJobUnlocked(s)?Math.min(7,(s.advancement||0)+1):0;
// 6차(250)·7차(300) 전직은 스킬 대신 잠재처럼 더해지는 능력치를 준다(누적). 공격력·HP ×1.1 전직 배율은 5차까지만.
export const JOB_MULTIPLIER_STAGES=5;
export const ADVANCEMENT_STAT_BONUS={5:{attack:12,boss:20,hp:12},6:{attack:15,boss:30,crit:10,hp:15}};
export function advancementStatBonus(s){const out={};for(const [stage,b] of Object.entries(ADVANCEMENT_STAT_BONUS))if((s.advancement||0)>=Number(stage))for(const [k,v] of Object.entries(b))out[k]=(out[k]||0)+v;return out;}
// 6·7차 보스는 2인 도전 시 체력 2배(혼자면 1배).
export const trialHp=(trial,members=1)=>trial.stage>=5?trial.hp*Math.max(1,members):trial.hp;
export const nextTrialStage=s=>jobStage(s);
export const ADVANCEMENT_BOSSES=[
 {stage:5,level:250,floor:10,name:'시간을 삼킨 자 크로노바스',art:'chronovas',artFrames:1,artSize:330,hp:360000000,attack:12000,seconds:120,pattern:'시계침 회전 · 시간 정지 장판 · 잔상 메아리 · 모래시계 붕괴',guide:'체력 3.6억(2인 도전 시 7.2억). 시계침은 차례로 돌아가니 바늘이 지나간 자리로 따라 이동하고, 정지 장판은 비어 있는 한 칸으로 피하세요. 잔상은 같은 자리에 한 번 더 터집니다. HP 35% 이하에서 공격이 빨라지고 바늘이 늘어납니다.'},
 {stage:6,level:300,floor:10,name:'공허룡 아포칼리스',art:'apocalis',artFrames:1,artSize:360,hp:500000000,attack:15000,seconds:120,pattern:'공허 브레스 · 운석 낙하 · 블랙홀 · 날개 돌진',guide:'체력 5억(2인 도전 시 10억) · 200제 보스장비·25성·유효 잠재 27줄·코스튬 전부 기준으로 맞춘 보스입니다. 브레스는 부채꼴 바깥으로, 블랙홀은 보스 가까이 붙었다가 바로 빠져나오세요. 운석은 순서대로 떨어지니 먼저 떨어진 자리로 이동하세요. HP 35% 이하에서 공허 탄환이 추가됩니다.'},
 {stage:4,level:200,floor:10,name:'성멸의 심판자 아스트라엘',art:'astrael',artFrames:1,hp:60000000,attack:7200,seconds:120,pattern:'성멸의 교차검 · 붕괴 고리 · 추적 낙하',guide:'솔로 기준 전투력 약 25만 이상 권장 · 공격·체력·방어를 함께 강화하세요. 교차 광선을 피하고 두 폭발 사이 안전 고리로 진입하세요. HP 35% 이하 광폭화. 최대 2인 협동 가능.'},
 {stage:3,level:150,floor:10,name:"천공의 수문장 아우레온",art:"aureon",artFrames:1,hp:2050000,attack:1000,seconds:120,pattern:"천공의 십자창 · 황금 고리",guide:"150제 보스 장비 9부위·17성·유니크 잠재 권장. 추적 예고를 분산하고 안전 고리로 진입하세요."},
 {stage:0,level:30,floor:3,name:'수정 문지기 루멘',art:'lumen',hp:88000,attack:75,seconds:120,pattern:'수정 십자파 · 발밑 파열',guide:'십자 예고의 빈틈으로 이동하세요. 30제 보스 장비 9부위·15성·에픽 주스탯 잠재 권장.'},
 {stage:1,level:60,floor:5,name:'계승의 심판관 아르켄',art:'arken',hp:210000,attack:264,seconds:120,pattern:'심판의 십자검 · 추적 참격',guide:'십자 예고를 비껴가고 후속 원형 폭발에서 빠져나오세요. 60제 보스 장비 9부위·15성·에픽 주스탯 잠재 권장.'},
 {stage:2,level:100,floor:10,name:'각성의 군주 에클립스',art:'eclipse',hp:540000,attack:308,seconds:120,pattern:'공허 연격 · 붕괴의 고리',guide:'추적 공격과 안전 고리가 이어집니다. 100제 보스 장비 9부위·15성·유니크 주스탯 잠재 권장.'},
].sort((a,b)=>a.stage-b.stage);
export const thirdUnlocked=a=>(a.advancement||a.power?.advancement||0)>=2||a.third===true;
export function beginThird(a,target,tick){if(a.classId==='priest')return beginPriest(a,target,tick,3);const sk=THIRD_SKILLS[a.classId];if(!thirdUnlocked(a)||tick<(a.thirdReady||0)||Math.hypot(a.x-target.x,a.y-target.y)>sk.range)return false;a.thirdReady=tick+sk.cooldown*10;a.thirdCast={x:target.x,y:target.y,start:tick,next:tick+3,left:sk.hits};a.skillStart=tick;a.skillUntil=tick+8;return true;}
export function stepThird(a,target,tick,hit,emit=()=>{}){if(a.classId==='priest'){stepPriest(a,[target],tick,3,hit,emit);return;}const cast=a.thirdCast;if(!cast)return;const sk=THIRD_SKILLS[a.classId];while(cast.left>0&&tick>=cast.next){const aim=sk.mode==='volley'?target:cast;if(sk.mode==='volley'?Math.hypot(a.x-target.x,a.y-target.y)<=sk.range+150:Math.hypot(cast.x-target.x,cast.y-target.y)<=sk.radius)hit(sk.damage);emit({kind:'third',classId:a.classId,owner:a.id??a.actorId,x:aim.x,y:aim.y,size:sk.radius*2,angle:(sk.hits-cast.left)*.24,start:cast.next,end:cast.next+10,fromX:a.x,fromY:a.y,volley:sk.mode==='volley'});cast.left--;cast.next+=sk.interval;}if(!cast.left)delete a.thirdCast;}
