// Third-job skills share a deterministic pulse scheduler across solo and co-op combat.
export const THIRD_NAMES={warrior:'소드 엠페러',mage:'엘리멘탈 로드',archer:'윈드 마스터',rogue:'섀도 팬텀',pirate:'스톰 커맨더'};
const skill=(name,hits,damage,interval,range,radius,mode,art,description)=>({name,type:'attack',hits,damage,interval,range,radius,mode,art,cooldown:24,description});
export const THIRD_SKILLS={
 warrior:skill('천공 참렬',6,3,2,650,430,'area',0,'거대한 검기를 6회 연속 폭발 · 300% × 6 · 넓은 범위'),
 mage:skill('아스트라 폴',10,1.8,5,950,480,'area',1,'지정 위치에 4.5초 마력 폭풍 · 180% × 10 · 지속 범위'),
 archer:skill('실피드 레인',9,2,2,1000,180,'volley',2,'추적 마력 화살 9연사 · 200% × 9 · 긴 사거리'),
 rogue:skill('팬텀 블레이드',12,1.5,1,650,360,'area',3,'그림자 칼날 12연격 · 150% × 12 · 빠른 집중 공격'),
 pirate:skill('오비탈 캐논',6,3,4,900,520,'area',4,'목표 지역에 6연속 포격 · 300% × 6 · 대형 폭발'),
};
export const firstJobUnlocked=s=>s.firstAdvancement===true||(s.advancement||0)>=1;
export const jobStage=s=>firstJobUnlocked(s)?Math.min(4,(s.advancement||0)+1):0;
export const nextTrialStage=s=>jobStage(s);
export const ADVANCEMENT_BOSSES=[
 {stage:3,level:150,floor:10,name:"천공의 수문장 아우레온",art:"aureon",hp:2050000,attack:1000,seconds:120,pattern:"천공의 십자창 · 황금 고리",guide:"150제 보스 장비 9부위·17성·유니크 잠재 권장. 추적 예고를 분산하고 안전 고리로 진입하세요."},
 {stage:0,level:30,floor:3,name:'수정 문지기 루멘',art:'lumen',hp:88000,attack:75,seconds:120,pattern:'수정 십자파 · 발밑 파열',guide:'십자 예고의 빈틈으로 이동하세요. 30제 보스 장비 9부위·15성·에픽 주스탯 잠재 권장.'},
 {stage:1,level:60,floor:5,name:'계승의 심판관 아르켄',art:'arken',hp:210000,attack:264,seconds:120,pattern:'심판의 십자검 · 추적 참격',guide:'십자 예고를 비껴가고 후속 원형 폭발에서 빠져나오세요. 60제 보스 장비 9부위·15성·에픽 주스탯 잠재 권장.'},
 {stage:2,level:100,floor:10,name:'각성의 군주 에클립스',art:'eclipse',hp:540000,attack:308,seconds:120,pattern:'공허 연격 · 붕괴의 고리',guide:'추적 공격과 안전 고리가 이어집니다. 100제 보스 장비 9부위·15성·유니크 주스탯 잠재 권장.'},
].sort((a,b)=>a.stage-b.stage);
export const thirdUnlocked=a=>(a.advancement||a.power?.advancement||0)>=2||a.third===true;
export function beginThird(a,target,tick){const sk=THIRD_SKILLS[a.classId];if(!thirdUnlocked(a)||tick<(a.thirdReady||0)||Math.hypot(a.x-target.x,a.y-target.y)>sk.range)return false;a.thirdReady=tick+sk.cooldown*10;a.thirdCast={x:target.x,y:target.y,start:tick,next:tick+3,left:sk.hits};a.skillStart=tick;a.skillUntil=tick+8;return true;}
export function stepThird(a,target,tick,hit,emit=()=>{}){const cast=a.thirdCast;if(!cast)return;const sk=THIRD_SKILLS[a.classId];while(cast.left>0&&tick>=cast.next){const aim=sk.mode==='volley'?target:cast;if(sk.mode==='volley'?Math.hypot(a.x-target.x,a.y-target.y)<=sk.range+150:Math.hypot(cast.x-target.x,cast.y-target.y)<=sk.radius)hit(sk.damage);emit({kind:'third',classId:a.classId,x:aim.x,y:aim.y,size:sk.radius*2,angle:(sk.hits-cast.left)*.24,start:cast.next,end:cast.next+10,fromX:a.x,fromY:a.y,volley:sk.mode==='volley'});cast.left--;cast.next+=sk.interval;}if(!cast.left)delete a.thirdCast;}

