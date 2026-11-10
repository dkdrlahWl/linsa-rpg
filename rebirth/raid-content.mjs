export const RAID_ENCOUNTERS=[
 {id:0,level:60,name:'심해 성전의 탈라손',arena:'침수된 성전',hp:6000000,attack:900,art:'raid-0',map:'raid-map-0',seconds:300,guide:'조류 탄막 사이를 이동하고, 침식은 사제의 치유로 정화하세요.',gold:3000,cubes:7,fragment:80,highCube:2,highCubeChance:.5,primeCube:1,primeCubeChance:.05,scroll:1,scrollChance:.4},
 {id:1,level:100,name:'용철 폭군 이그니바르',arena:'흑요석 주조소',hp:20000000,attack:2200,art:'raid-1',map:'raid-map-1',seconds:300,guide:'용철 탄막과 낙하 장판을 피하세요. 과열 폭발 직전 사제의 보호막이 필요합니다.',gold:5000,cubes:12,fragment:150,highCube:3,highCubeChance:.65,primeCube:1,primeCubeChance:.1,scroll:1,scrollChance:.6},
 {id:2,level:150,name:'추락한 성좌 아스테리아',arena:'천공의 정원',hp:60000000,attack:4500,art:'raid-2',map:'raid-map-2',seconds:300,guide:'별빛 장판을 흩어 놓고 성역에 다시 모이세요. 회전 광선은 빈 공간으로 피하세요.',gold:8000,cubes:20,fragment:250,highCube:5,highCubeChance:.8,primeCube:1,primeCubeChance:.2,scroll:2,scrollChance:.75},
 {id:3,level:200,name:'일식의 시간군주 녹스 에온',arena:'공허 관측소',hp:360000000,attack:13000,art:'raid-3',map:'raid-map-3',seconds:300,guide:'이중 시간 탄막·이동하는 붕괴 고리·전원 일식 추적. 30초부터 시간 가속으로 보스 공격력이 10초마다 15%씩 오릅니다. 보호막은 미리 겹쳐 두세요.',gold:12000,cubes:30,fragment:400,highCube:8,highCubeChance:1,primeCube:2,primeCubeChance:.3,scroll:3,scrollChance:1,bossGearChance:.1},
 // 2026-11-09 도현: 최종 보스 — 레이드와 별도 카테고리 · 입장 레벨 제한 · 최대 7명 · 보상 미정(지급 없음).
 // 2026-11-10 도현: 1인 기준으로 변경 — hp는 1명분, 참가 인원 수만큼 곱해진다(raidStartHp).
 // 1인 체력·공격 = final-boss-calibrate.mjs 1인 풀세팅(코스튬·칭호·스킬외형 전부, 잠재·에디 27줄, 불꽃 5%, 25성, 최상급, 6차 전직) 300초 풀딜의 80% (7인 기준 값 ÷ 7).
 // Lv.300 = 220제 · Lv.350 = 250제 · Lv.400 = 300제 기준. 공격 = 최저 체력 직업 기준 평타 1배 피해가 최대 체력 12%.
 {id:4,final:true,level:300,minLevel:300,gearLevel:220,name:'월식의 나비 여제 루나리스',arena:'월식의 황정',hp:16600000000,perPlayer:true,attack:316000,art:'raid-4',map:'raid-map-4',seconds:300,guide:'나비 탄막과 회전하는 날개 십자 광선을 피하세요. 월식 고리는 안쪽·바깥쪽이 번갈아 안전합니다. 대붕괴 전에 사제 보호막을 겹쳐 두세요.',gold:0,cubes:0,fragment:0,highCube:0,highCubeChance:0,primeCube:0,primeCubeChance:0,scroll:0,scrollChance:0,bossGearChance:0},
 {id:5,final:true,level:350,minLevel:350,gearLevel:250,name:'심판의 대천사 세라피엘',arena:'천공 심판정',hp:49300000000,perPlayer:true,attack:2310000,art:'raid-5',map:'raid-map-5',seconds:300,guide:'성검 낙하는 흩어지고, 분담 표식에는 반드시 모이세요. 표식 안에 사람이 적을수록 피해가 커집니다. 팔방 심판 광선은 두 번 연속으로 내려옵니다.',gold:0,cubes:0,fragment:0,highCube:0,highCubeChance:0,primeCube:0,primeCubeChance:0,scroll:0,scrollChance:0,bossGearChance:0},
 {id:6,final:true,level:400,minLevel:400,gearLevel:300,name:'절대룡 아스트라곤',arena:'창세의 끝',hp:147000000000,perPlayer:true,attack:19200000,art:'raid-6',map:'raid-map-6',seconds:300,guide:'90초부터 절대룡의 힘이 계속 강해집니다. 체력 50%에서 패턴이 빨라지고, 20%에서 최후의 포효(전체 대붕괴)가 즉시 옵니다. 용의 숨결·분담 운석·산개 표식을 동시에 처리하세요.',gold:0,cubes:0,fragment:0,highCube:0,highCubeChance:0,primeCube:0,primeCubeChance:0,scroll:0,scrollChance:0,bossGearChance:0}
];
export const raidStartHp=(b,members)=>b.perPlayer?b.hp*Math.max(1,members):b.hp;
export const isFinalRaid=tier=>RAID_ENCOUNTERS[tier]?.final===true;
export const FINAL_RAID_MAX=7;
export const raidWalls=()=>[];
function crossBox(a,b,w,pad){let lo=0,hi=1;for(const [v,d,min,max] of [[a.x,b.x-a.x,w.x-pad,w.x+w.w+pad],[a.y,b.y-a.y,w.y-pad,w.y+w.h+pad]]){if(Math.abs(d)<1e-8){if(v<min||v>max)return false;continue;}const l=(min-v)/d,h=(max-v)/d;lo=Math.max(lo,Math.min(l,h));hi=Math.min(hi,Math.max(l,h));if(lo>hi)return false;}return hi>=0&&lo<=1;}
// The painted rail narrows below its top ledge; the transparent corners are walkable.
export function wallCross(a,b,w,pad=0){const upper={x:w.x+35,y:w.y-18,w:w.w-70,h:93},lower={x:w.x+65,y:w.y+75,w:w.w-130,h:53};return crossBox(a,b,upper,pad)||crossBox(a,b,lower,pad);}
export const covered=(a,b,walls)=>walls.some(w=>wallCross(a,b,w));
export function raidMove(a,x,y,walls){const bound=n=>Math.max(150,Math.min(3050,n));const dx={x:bound(x),y:a.y};if(!walls.some(w=>wallCross(a,dx,w,30)))a.x=dx.x;const dy={x:a.x,y:bound(y)};if(!walls.some(w=>wallCross(a,dy,w,30)))a.y=dy.y;}
