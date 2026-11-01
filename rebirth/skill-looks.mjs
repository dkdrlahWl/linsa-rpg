export const SKILL_LOOK_PRICE=20_000_000;
export const SKILL_LOOK_CLASSES=Object.freeze({warrior:'전사',mage:'마법사',archer:'궁수',rogue:'도적',pirate:'해적',priest:'사제'});
const concepts=[
 ['warrior','rose-oath','장미 서약의 검무','rose','#ff89b5','#ffe5bc','장미꽃과 금빛 꽃잎을 두른 우아한 검기'],
 ['warrior','moon-swan','월광 백조의 검무','swan','#a9cfff','#fff4df','백조의 날개와 초승달이 흐르는 은빛 검기'],
 ['warrior','aurora-crown','오로라 왕관의 검무','crown','#8fffe5','#d8b2ff','오로라 보석과 왕관이 빛나는 찬란한 검기'],
 ['mage','galaxy-waltz','은하수의 왈츠','star','#b89aff','#a7f3ff','별자리와 은하의 궤도가 피어나는 마법'],
 ['mage','lotus-dream','연꽃의 몽환곡','lotus','#ffb8e0','#b0ffe5','수련과 진주빛 물결이 겹쳐지는 마법'],
 ['mage','crystal-palace','빙정 궁전의 아리아','crystal','#91deff','#f1dcff','눈꽃 결정과 사파이어가 반짝이는 마법'],
 ['archer','peacock-plume','비취 공작의 깃','feather','#65e5b4','#ffe5a3','공작의 눈무늬와 비취 깃털이 흐르는 화살'],
 ['archer','sakura-breeze','벚꽃 바람의 노래','blossom','#ffa9cf','#fff0cb','분홍 벚꽃이 바람을 타고 흩날리는 화살'],
 ['archer','starlit-deer','별사슴의 숲','antler','#b6c7ff','#c3ffe4','별사슴의 뿔과 숲의 별빛을 잇는 화살'],
 ['rogue','butterfly-silk','홍접 비단의 춤','butterfly','#ff92bc','#ffe4b8','붉은 나비와 황금 비단이 교차하는 칼날'],
 ['rogue','violet-moon','자월 가면의 춤','crescent','#bd9aff','#f6c3ff','보랏빛 초승달과 은색 잔상이 도는 칼날'],
 ['rogue','opal-mirage','오팔 신기루의 춤','diamond','#a8fff3','#ffc8ed','오팔 보석과 무지갯빛 리본이 흐르는 칼날'],
 ['pirate','pearl-tide','진주 바다의 축제','shell','#9debf3','#ffe6bc','조개 진주와 산호빛 파도가 터지는 포격'],
 ['pirate','sugar-fireworks','설탕별 불꽃놀이','ribbon','#ffb7d8','#b6efff','사탕 리본과 파스텔 별꽃이 터지는 포격'],
 ['pirate','celestial-voyage','천공 항해의 찬가','compass','#9dc8ff','#ffdfa0','금빛 나침반과 푸른 별의 항로를 잇는 포격'],
 ['priest','wisteria-hymn','등꽃 성소의 찬송','wisteria','#c8a6ff','#e4f7ff','보랏빛 등꽃 송이와 은빛 성환의 축복'],
 ['priest','dawn-seraph','여명 세라핌의 기도','wing','#ffe1a0','#fff3e7','천사의 날개와 여명의 금빛 깃털의 축복'],
 ['priest','lily-sanctuary','백합 정원의 서약','lily','#d5ffe8','#f9d4f1','백합 꽃잎과 진주빛 정원이 피어나는 축복'],
 ['warrior','warrior-dark','흑룡 단죄의 검무','dragon','#9765e8','#d8c5ff','흑룡의 뿔 대검과 용두 투사체, 날개 모양 검격이 폭발하는 검무'],
 ['warrior','warrior-fallen','사슬 처형자의 심판','chain','#ec604c','#ffe0bd','사슬에 묶인 처형 대검과 철제 단두대가 내려치는 검무'],
 ['mage','mage-dark','심연 마안의 개방','eye','#53b6bf','#c4ffff','심연의 눈이 열리며 마안 투사체와 검은 균열을 펼치는 마법'],
 ['mage','mage-fallen','금서 폭주의 진언','grimoire','#e64068','#ffbfa0','이빨 달린 금서와 찢긴 저주 문서가 폭주하는 마법'],
 ['archer','archer-dark','흑익 까마귀의 추격','raven','#9776e8','#e1d6ff','까마귀 날개 활과 은빛 깃 화살, 검은 새떼가 휘몰아치는 사격'],
 ['archer','archer-fallen','악마 석궁의 낙인','crossbow','#e64550','#ffd0ab','악마의 뿔 석궁과 가시 볼트가 타락의 낙인을 새기는 사격'],
 ['rogue','rogue-dark','망령 쌍단검의 춤','wraith','#5bcedb','#d0ffff','해골 손잡이 쌍단검과 망령의 잔상이 교차하는 암살'],
 ['rogue','rogue-fallen','혈독 거미의 처형','spider','#df3659','#ffb7c2','거미 다리 갈고리 칼날과 혈독 거미줄이 터지는 암살'],
 ['pirate','pirate-dark','유령함대의 장송','ghostship','#50d1c7','#c8fff9','찢긴 돛의 유령 함대와 해골 함포, 영혼 포탄의 포격'],
 ['pirate','pirate-fallen','크라켄 심해의 포효','kraken','#e46a41','#ffcf8f','크라켄 촉수 함포와 심해 탄환이 붉은 소용돌이를 터뜨리는 포격'],
 ['priest','priest-dark','검은 성당의 기도','cathedral','#aa8cdb','#e8dbff','검은 성당의 첨탑과 깨진 스테인드글라스, 망령 성녀의 기도'],
 ['priest','priest-fallen','해골 성물의 계시','reliquary','#d94a4a','#f1d5aa','해골 성물과 붉은 촛불 제단, 뼈 날개가 펼쳐지는 계시'],
];
export const SKILL_LOOKS=Object.freeze(concepts.map(([classId,id,name,motif,color,light,description])=>Object.freeze({classId,id,name,motif,color,light,description,price:SKILL_LOOK_PRICE})));
export const skillLookById=id=>typeof id==='string'?SKILL_LOOKS.find(c=>c.id===id)||null:null;
// 2026-10-25 보유 효과: 스킬 외형 1종당 치명타 피해 +1%p (모든 직업에 적용).
export const SKILL_LOOK_CRIT_DAMAGE=.01;
export const ownedSkillLookCount=s=>new Set((Array.isArray(s?.skillLooks)?s.skillLooks:[]).filter(id=>skillLookById(id))).size;
export function equippedSkillLook(s){
 const c=skillLookById(s.equippedSkillLooks?.[s.classId]);
 return c&&c.classId===s.classId&&Array.isArray(s.skillLooks)&&s.skillLooks.includes(c.id)?c:null;
}
export function normalizeSkillLooks(s){
 s.skillLooks=[...new Set((Array.isArray(s.skillLooks)?s.skillLooks:[]).filter(id=>skillLookById(id)))];
 const old=s.equippedSkillLooks;
 s.equippedSkillLooks={};
 for(const classId of Object.keys(SKILL_LOOK_CLASSES)){
  const c=skillLookById(old?.[classId]);
  if(c?.classId===classId&&s.skillLooks.includes(c.id))s.equippedSkillLooks[classId]=c.id;
 }
 return s;
}
export function skillLookCommand(s,command,id){
 const fail=code=>{throw Error(code);};
 if(s.battle||s.coopRoom||s.partyRoom)fail('BATTLE_IN_PROGRESS');
 normalizeSkillLooks(s);
 if(command==='skillLookUnequip'){delete s.equippedSkillLooks[s.classId];return {type:command};}
 const c=skillLookById(id);if(!c)fail('INVALID_SKILL_LOOK');
 if(command==='skillLookBuy'){
  if(s.skillLooks.includes(id))fail('SKILL_LOOK_OWNED');
  if(!Number.isFinite(s.gold)||s.gold<c.price)fail('INSUFFICIENT_GOLD');
  if(!s.isAdmin)s.gold-=c.price;
  s.skillLooks.push(id);return {type:command,id,gold:c.price};
 }
 if(command!=='skillLookEquip')fail('INVALID_COMMAND');
 if(!s.skillLooks.includes(id))fail('SKILL_LOOK_NOT_OWNED');
 if(c.classId!==s.classId)fail('SKILL_LOOK_CLASS_MISMATCH');
 s.equippedSkillLooks[s.classId]=id;return {type:command,id};
}
