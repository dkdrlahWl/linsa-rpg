export const RAID_ENCOUNTERS=[
 {id:0,level:60,name:'심해 성전의 탈라손',arena:'침수된 성전',hp:6000000,attack:900,art:'raid-0',map:'raid-map-0',seconds:300,guide:'성전 난간 뒤에서 조류 탄막을 막고, 침식은 사제의 치유로 정화하세요.',gold:24000,cubes:12,highCube:2,gearChance:.25},
 {id:1,level:100,name:'용철 폭군 이그니바르',arena:'흑요석 주조소',hp:20000000,attack:2200,art:'raid-1',map:'raid-map-1',seconds:300,guide:'철벽 뒤에서 용철 탄막을 피하세요. 과열 폭발 직전 사제의 보호막이 필요합니다.',gold:42000,cubes:18,highCube:3,gearChance:.25},
 {id:2,level:150,name:'추락한 성좌 아스테리아',arena:'천공의 정원',hp:60000000,attack:4500,art:'raid-2',map:'raid-map-2',seconds:300,guide:'별빛 장판을 흩어 놓고 성역에 다시 모이세요. 회전 광선은 정원 석벽으로 막습니다.',gold:65000,cubes:24,highCube:4,gearChance:.25},
 {id:3,level:200,name:'일식의 시간군주 녹스 에온',arena:'공허 관측소',hp:180000000,attack:9500,art:'raid-3',map:'raid-map-3',seconds:300,guide:'교차하는 시간 탄막·이중 안전 고리·연속 일식 폭발. 치유와 보호막 타이밍을 나누세요.',gold:100000,cubes:30,highCube:6,gearChance:.25}
];
export const raidWalls=tier=>[
 [{x:730,y:1050,w:440,h:150},{x:2030,y:1050,w:440,h:150},{x:730,y:2110,w:440,h:150},{x:2030,y:2110,w:440,h:150}],
 [{x:640,y:1250,w:520,h:140},{x:2040,y:1810,w:520,h:140},{x:1360,y:720,w:480,h:140},{x:1360,y:2340,w:480,h:140}],
 [{x:600,y:1500,w:400,h:150},{x:2200,y:1500,w:400,h:150},{x:1400,y:800,w:400,h:150},{x:1400,y:2250,w:400,h:150}],
 [{x:620,y:900,w:460,h:150},{x:2120,y:900,w:460,h:150},{x:1020,y:2160,w:460,h:150},{x:1800,y:1800,w:460,h:150}]
][tier].map((w,i)=>({...w,id:i}));
export function wallCross(a,b,w,pad=0){let lo=0,hi=1;for(const [v,d,min,max] of [[a.x,b.x-a.x,w.x-pad,w.x+w.w+pad],[a.y,b.y-a.y,w.y-pad,w.y+w.h+pad]]){if(Math.abs(d)<1e-8){if(v<min||v>max)return false;continue;}const l=(min-v)/d,h=(max-v)/d;lo=Math.max(lo,Math.min(l,h));hi=Math.min(hi,Math.max(l,h));if(lo>hi)return false;}return hi>=0&&lo<=1;}
export const covered=(a,b,walls)=>walls.some(w=>wallCross(a,b,w));
export function raidMove(a,x,y,walls){const bound=n=>Math.max(150,Math.min(3050,n));const dx={x:bound(x),y:a.y};if(!walls.some(w=>wallCross(a,dx,w,30)))a.x=dx.x;const dy={x:a.x,y:bound(y)};if(!walls.some(w=>wallCross(a,dy,w,30)))a.y=dy.y;}
