export const RAID_ENCOUNTERS=[
 {id:0,level:60,name:'심해 성전의 탈라손',arena:'침수된 성전',hp:6000000,attack:900,art:'raid-0',map:'raid-map-0',seconds:300,guide:'조류 탄막 사이를 이동하고, 침식은 사제의 치유로 정화하세요.',gold:3000,cubes:7,fragment:80,highCube:2,highCubeChance:.5,primeCube:1,primeCubeChance:.05,scroll:1,scrollChance:.4},
 {id:1,level:100,name:'용철 폭군 이그니바르',arena:'흑요석 주조소',hp:20000000,attack:2200,art:'raid-1',map:'raid-map-1',seconds:300,guide:'용철 탄막과 낙하 장판을 피하세요. 과열 폭발 직전 사제의 보호막이 필요합니다.',gold:5000,cubes:12,fragment:150,highCube:3,highCubeChance:.65,primeCube:1,primeCubeChance:.1,scroll:1,scrollChance:.6},
 {id:2,level:150,name:'추락한 성좌 아스테리아',arena:'천공의 정원',hp:60000000,attack:4500,art:'raid-2',map:'raid-map-2',seconds:300,guide:'별빛 장판을 흩어 놓고 성역에 다시 모이세요. 회전 광선은 빈 공간으로 피하세요.',gold:8000,cubes:20,fragment:250,highCube:5,highCubeChance:.8,primeCube:1,primeCubeChance:.2,scroll:2,scrollChance:.75},
 {id:3,level:200,name:'일식의 시간군주 녹스 에온',arena:'공허 관측소',hp:180000000,attack:9500,art:'raid-3',map:'raid-map-3',seconds:300,guide:'교차하는 시간 탄막·이중 안전 고리·연속 일식 폭발. 치유와 보호막 타이밍을 나누세요.',gold:12000,cubes:30,fragment:400,highCube:8,highCubeChance:1,primeCube:2,primeCubeChance:.3,scroll:3,scrollChance:1}
];
export const raidWalls=()=>[];
function crossBox(a,b,w,pad){let lo=0,hi=1;for(const [v,d,min,max] of [[a.x,b.x-a.x,w.x-pad,w.x+w.w+pad],[a.y,b.y-a.y,w.y-pad,w.y+w.h+pad]]){if(Math.abs(d)<1e-8){if(v<min||v>max)return false;continue;}const l=(min-v)/d,h=(max-v)/d;lo=Math.max(lo,Math.min(l,h));hi=Math.min(hi,Math.max(l,h));if(lo>hi)return false;}return hi>=0&&lo<=1;}
// The painted rail narrows below its top ledge; the transparent corners are walkable.
export function wallCross(a,b,w,pad=0){const upper={x:w.x+35,y:w.y-18,w:w.w-70,h:93},lower={x:w.x+65,y:w.y+75,w:w.w-130,h:53};return crossBox(a,b,upper,pad)||crossBox(a,b,lower,pad);}
export const covered=(a,b,walls)=>walls.some(w=>wallCross(a,b,w));
export function raidMove(a,x,y,walls){const bound=n=>Math.max(150,Math.min(3050,n));const dx={x:bound(x),y:a.y};if(!walls.some(w=>wallCross(a,dx,w,30)))a.x=dx.x;const dy={x:a.x,y:bound(y)};if(!walls.some(w=>wallCross(a,dy,w,30)))a.y=dy.y;}
