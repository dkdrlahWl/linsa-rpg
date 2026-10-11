// Daily lucky wheel: 3 spins per Korean day. Server rolls (engine `luckyWheelSpin`); UI only animates.
export const LUCKY_WHEEL_SPINS=3;
export const LUCKY_WHEEL=[
 {id:'gold',name:'골드',label:'20만 G',chance:.30,gold:200000,color:'#f2c14e'},
 {id:'fragment',name:'장비 파편',label:'파편 50',chance:.22,materials:{fragment:50},color:'#8fb7d9'},
 {id:'cube',name:'레드 큐브',label:'레드 큐브 2',chance:.18,materials:{cube:2},color:'#e0605b'},
 {id:'diamond',name:'다이아',label:'다이아 3',chance:.12,diamonds:3,color:'#6fd6ef'},
 {id:'highCube',name:'블랙 큐브',label:'블랙 큐브',chance:.09,materials:{highCube:1},color:'#5b5568'},
 {id:'scroll',name:'잠재 해금 주문서',label:'해금 주문서',chance:.04,materials:{scroll:1},color:'#b48cf2'},
 {id:'dungeonKey',name:'던전 열쇠',label:'던전 열쇠',chance:.03,materials:{dungeonKey:1},color:'#7fd18b'},
 {id:'potentialLock',name:'잠재 잠금석',label:'잠금석',chance:.015,materials:{potentialLock:1},color:'#f29bc2'},
 {id:'jackpot',name:'보스 장비 상자',label:'잭팟 상자',chance:.005,chest:true,color:'#ff7a2f'},
];
// Jackpot chest (delivered by mail): boss gear Lv.150~190 (10-level tiers), any class, any slot, weapon at half weight.
export const WHEEL_CHEST={kind:'wheelBossChest',minLevel:150,maxLevel:190};
export const wheelKoreanDay=now=>new Date(now+9*3600000).toISOString().slice(0,10);
export const luckyWheelLeft=(s,now=Date.now())=>s?.luckyWheel?.day===wheelKoreanDay(now)?Math.max(0,LUCKY_WHEEL_SPINS-(s.luckyWheel.spins||0)):LUCKY_WHEEL_SPINS;
export function rollLuckyWheel(random){let r=random();for(let i=0;i<LUCKY_WHEEL.length;i++){r-=LUCKY_WHEEL[i].chance;if(r<0)return i;}return 0;}
