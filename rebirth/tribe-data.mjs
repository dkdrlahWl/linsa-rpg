// 2026-11-02 종족 뽑기: 외형은 그대로, 능력치만 바뀐다. 모두 인간(효과 없음)으로 시작.
// 뽑으면 지금 종족(이전)과 새 종족(이후) 중 하나를 고른다. 효과는 잠재처럼 % 능력치에 더한다(합연산).
// 2026-11-02 밸런스: HP 종족 딜 보강(드워프·오크·인어·골렘·거인·주작), 신족 상향, 신화 성좌 추가(신화 3종이 0.2%를 나눠 가짐).
// 확률(등급 안에서는 균등): 일반 85.9% · 희귀 10.5% · 영웅 2.4% · 전설 1% · 신화 0.2%. (2026-11-02 희귀·영웅 절반으로 하향)
// 천장 없음: 매회 기본 등급 확률로 독립 추첨. 뽑기권은 토큰 교환소(100토큰 · 하루 5장).
export const TRIBE_GRADES=Object.freeze([
 {id:'start',name:'시작',chance:0},
 {id:'common',name:'일반',chance:.859},
 {id:'rare',name:'희귀',chance:.105},
 {id:'epic',name:'영웅',chance:.024},
 {id:'legend',name:'전설',chance:.01},
 {id:'myth',name:'신화',chance:.002},
].map(Object.freeze));
// stats 단위: attack·boss·hp·critDamage = %, crit = %p. color = 이름 색.
export const TRIBES=Object.freeze([
 {id:'human',name:'인간',grade:'start',color:'#d9d4c7',stats:{}},
 {id:'dwarf',name:'드워프',grade:'common',color:'#d8b48a',stats:{hp:8,attack:2}},
 {id:'halfling',name:'하플링',grade:'common',color:'#c9d79a',stats:{crit:2,attack:1}},
 {id:'orc',name:'오크',grade:'common',color:'#9fc98b',stats:{attack:3,hp:3}},
 {id:'gnome',name:'노움',grade:'common',color:'#d6c08f',stats:{boss:3,critDamage:2}},
 {id:'goblin',name:'고블린',grade:'common',color:'#b8cf86',stats:{attack:1,crit:1,critDamage:2}},
 {id:'elf',name:'엘프',grade:'rare',color:'#7fe0b4',stats:{crit:3,attack:2}},
 {id:'beastkin',name:'수인',grade:'rare',color:'#f0b070',stats:{attack:3,critDamage:5}},
 {id:'merfolk',name:'인어',grade:'rare',color:'#6fc8ff',stats:{hp:10,boss:5}},
 {id:'lizardfolk',name:'리자드맨',grade:'rare',color:'#7fd6a0',stats:{critDamage:6,crit:1}},
 {id:'harpy',name:'하피',grade:'rare',color:'#8fb4ff',stats:{crit:2,boss:3}},
 {id:'demon',name:'마족',grade:'epic',color:'#ff6b8a',stats:{boss:10,attack:4,hp:-5}},
 {id:'darkelf',name:'다크엘프',grade:'epic',color:'#b48cff',stats:{crit:3,critDamage:6}},
 {id:'giant',name:'거인',grade:'epic',color:'#e0a46a',stats:{hp:15,attack:6,boss:4}},
 {id:'vampire',name:'뱀파이어',grade:'epic',color:'#e0506e',stats:{attack:6,boss:6,hp:-3}},
 {id:'golem',name:'골렘',grade:'epic',color:'#a8b4c8',stats:{hp:20,boss:12}},
 {id:'dragonkin',name:'용인',grade:'legend',color:'#ffb347',stats:{attack:6,boss:8,critDamage:5}},
 {id:'celestial',name:'천족',grade:'legend',color:'#fff1a8',stats:{attack:8,boss:8,hp:8}},
 {id:'spirit',name:'정령족',grade:'legend',color:'#7ff0ff',stats:{crit:5,critDamage:8,attack:4}},
 {id:'jujak',name:'주작',grade:'legend',color:'#ff7a45',stats:{attack:8,boss:8,hp:12}},
 {id:'ancientdragon',name:'고대룡',grade:'myth',color:'#ff4d6d',stats:{attack:8,boss:12,critDamage:8}},
 {id:'divine',name:'신족',grade:'myth',color:'#ffe066',stats:{attack:10,boss:10,crit:3,hp:12}},
 {id:'starborn',name:'성좌',grade:'myth',color:'#a8c8ff',stats:{attack:6,boss:2,crit:5,critDamage:12}},
].map(Object.freeze));
export const TRIBE_BY_ID=Object.freeze(Object.fromEntries(TRIBES.map(t=>[t.id,t])));
export const TRIBE_GRADE_BY_ID=Object.freeze(Object.fromEntries(TRIBE_GRADES.map(g=>[g.id,g])));
export const TRIBE_STAT_NAMES=Object.freeze({attack:'공격력',boss:'보스 피해',hp:'최대 HP',crit:'치명타 확률',critDamage:'치명타 피해'});
export const tribeOf=s=>TRIBE_BY_ID[s?.tribe]||TRIBE_BY_ID.human;
export const tribeChance=t=>{const g=TRIBE_GRADE_BY_ID[t.grade];const n=TRIBES.filter(x=>x.grade===t.grade).length;return g.chance/n;};
export function tribeEffectText(t){const e=Object.entries(t.stats);return e.length?e.map(([k,v])=>TRIBE_STAT_NAMES[k]+' '+(v>0?'+':'−')+Math.abs(v)+(k==='crit'?'%p':'%')).join(' · '):'효과 없음';}
// power()에 더할 % 능력치. critDamage는 배율(+0.05 = +5%)로 따로 돌려준다.
export function tribeStatBonus(s){const t=tribeOf(s),out={};for(const [k,v] of Object.entries(t.stats))if(k!=='critDamage')out[k]=v;return out;}
export const tribeCritDamage=s=>(tribeOf(s).stats.critDamage||0)/100;
// 천장·누적 횟수 없이 매회 기본 확률로 독립 추첨.
export function rollTribe(random){
 const pool=g=>TRIBES.filter(t=>t.grade===g);
 const pick=list=>list[Math.min(list.length-1,Math.floor(random()*list.length))];
 let r=random();
 for(const g of ['myth','legend','epic','rare','common']){r-=TRIBE_GRADE_BY_ID[g].chance;if(r<0)return {tribe:pick(pool(g)),pity:null};}
 return {tribe:pick(pool('common')),pity:null};
}
