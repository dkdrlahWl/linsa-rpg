import {tier} from './arena-model.mjs?v=arena-daily-155';

// One final-tier bundle per weekly season; amounts are shared with the SQL fixture.
export const ARENA_REWARD_MIN_MATCHES=5;
const steps=['IV','III','II','I'];
const bands=[
 ['브론즈','bronze',0,[120000,140000,160000,180000],[3,4,5,6],[0,0,0,0]],
 ['실버','silver',400,[240000,280000,320000,360000],[8,9,10,12],[0,0,0,0]],
 ['골드','gold',800,[420000,480000,540000,600000],[16,18,21,24],[0,0,0,0]],
 ['플래티넘','platinum',1200,[630000,720000,810000,900000],[24,28,32,36],[3,4,5,6]],
 ['다이아','diamond',1600,[1050000,1200000,1350000,1500000],[42,48,54,60],[7,8,9,10]],
 ['마스터','master',2200,[1680000,1920000,2160000,2400000],[63,72,81,90],[11,12,13,14]],
];
export const ARENA_REWARDS=Object.freeze([
 ...bands.flatMap(([name,key,min,gold,black,prime])=>steps.map((step,i)=>Object.freeze({name,key,step,label:`${name} ${step}`,minScore:min+i*100,gold:gold[i],highCube:black[i],primeCube:prime[i]}))),
 ...Array.from({length:9},(_,i)=>{const maxRank=100-i*10,minRank=maxRank-9;return Object.freeze({name:'마스터',key:'master',step:`${maxRank}~${minRank}위`,label:`${maxRank}~${minRank}위`,minRank,maxRank,minScore:0,gold:3000000+i*500000,highCube:120+i*10,primeCube:18+i*2});}),
 ...[['그랜드 마스터','grandmaster',10000000,300,50],['챌린저','challenger',15000000,450,75],['챔피언','champion',20000000,600,100]].map(([name,key,gold,highCube,primeCube])=>Object.freeze({name,key,step:'',label:name,minScore:2600,gold,highCube,primeCube})),
]);
export function arenaSeasonReward(score,rank){
 const label=tier(score,rank).label;
 const base=ARENA_REWARDS.find(r=>r.label===label)||null;
 if(!base)return null;
 const ranked=ARENA_REWARDS.find(r=>r.minRank&&rank>=r.minRank&&rank<=r.maxRank);
 return ranked?{...ranked,gold:Math.max(base.gold,ranked.gold),highCube:Math.max(base.highCube,ranked.highCube),primeCube:Math.max(base.primeCube,ranked.primeCube)}:base;
}
