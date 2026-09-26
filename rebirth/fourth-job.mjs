export const FOURTH_NAMES={warrior:'천검의 지배자',mage:'천체의 대마도사',archer:'폭풍의 수호자',rogue:'월영의 군주',pirate:'해일의 제독'};
const make=(name,hits,interval,radius,mode,art,description)=>({name,type:'attack',hits,damage:18/hits,interval,range:1100,radius,mode,art,cooldown:30,description:description+' · 총 1800% · 재사용 30초'});
export const FOURTH_SKILLS={
 warrior:make('천검 만화진',24,3,620,'orbit',0,'여섯 자루의 검이 몸 주위를 크게 회전하며 24회 베기'),
 mage:make('성운의 종말',30,2,720,'area',1,'거대한 지역에 30회 메테오 폭격'),
 archer:make('천풍 화살비',36,2,700,'area',2,'하늘을 덮는 화살비가 넓은 지역을 36회 타격'),
 rogue:make('월영 윤무',40,2,620,'orbit',3,'초승달 칼날이 주위를 돌며 40회 연속 베기'),
 pirate:make('대해의 포화',20,4,720,'area',4,'넓은 목표 지역에 20회 함포와 파도 폭발'),
};
export const fourthUnlocked=a=>(a.advancement??a.power?.advancement??0)>=3;
export function beginFourth(a,target,tick){
 const sk=FOURTH_SKILLS[a.classId];
 if(!sk||!fourthUnlocked(a)||tick<(a.fourthReady||0)||Math.hypot(a.x-target.x,a.y-target.y)>sk.range)return false;
 a.fourthReady=tick+sk.cooldown*10;a.fourthCast={x:target.x,y:target.y,start:tick,next:tick+2,left:sk.hits};a.skillStart=tick;a.skillUntil=tick+9;return true;
}
export function stepFourth(a,target,tick,hit,emit=()=>{}){
 const cast=a.fourthCast;if(!cast)return;const sk=FOURTH_SKILLS[a.classId];
 while(cast.left>0&&tick>=cast.next){const aim=sk.mode==='orbit'?a:cast;
  if(Math.hypot(aim.x-target.x,aim.y-target.y)<=sk.radius)hit(sk.damage);
  emit({kind:'fourth',classId:a.classId,owner:a.id,x:aim.x,y:aim.y,size:sk.radius*2,pulse:sk.hits-cast.left,orbit:sk.mode==='orbit',start:cast.next,end:cast.next+sk.interval+3});
  cast.left--;cast.next+=sk.interval;
 }
 if(!cast.left)delete a.fourthCast;
}
