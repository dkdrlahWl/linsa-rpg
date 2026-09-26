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
export const ADVANCEMENT_BOSSES=[
 {stage:1,level:60,floor:5,name:'계승의 심판관 아르켄',art:'knight',hp:220000,attack:2200,seconds:90,pattern:'심판의 십자검 · 추적 참격',guide:'십자 예고를 비껴가고 후속 원형 폭발에서 빠져나오세요. 60레벨 보스 장비 10~15성·유효 잠재 권장.'},
 {stage:2,level:100,floor:10,name:'각성의 군주 에클립스',art:'king',hp:700000,attack:6500,seconds:90,pattern:'공허 연격 · 붕괴의 고리',guide:'추적 공격과 안전 고리가 이어집니다. 100레벨 보스 장비 15성 이상·유효 잠재 권장.'},
];
export const thirdUnlocked=a=>(a.advancement||a.power?.advancement||0)>=2||a.third===true;
export function beginThird(a,target,tick){const sk=THIRD_SKILLS[a.classId];if(!thirdUnlocked(a)||tick<(a.thirdReady||0)||Math.hypot(a.x-target.x,a.y-target.y)>sk.range)return false;a.thirdReady=tick+sk.cooldown*10;a.thirdCast={x:target.x,y:target.y,start:tick,next:tick+3,left:sk.hits};a.skillStart=tick;a.skillUntil=tick+8;return true;}
export function stepThird(a,target,tick,hit,emit=()=>{}){const cast=a.thirdCast;if(!cast)return;const sk=THIRD_SKILLS[a.classId];while(cast.left>0&&tick>=cast.next){const aim=sk.mode==='volley'?target:cast;if(sk.mode==='volley'?Math.hypot(a.x-target.x,a.y-target.y)<=sk.range+150:Math.hypot(cast.x-target.x,cast.y-target.y)<=sk.radius)hit(sk.damage);emit({kind:'third',classId:a.classId,x:aim.x,y:aim.y,size:sk.radius*2,angle:(sk.hits-cast.left)*.24,start:cast.next,end:cast.next+10,fromX:a.x,fromY:a.y,volley:sk.mode==='volley'});cast.left--;cast.next+=sk.interval;}if(!cast.left)delete a.thirdCast;}
