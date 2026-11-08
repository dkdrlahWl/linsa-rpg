// Four new chapters, three independently illustrated hunting grounds each.
import {journeyXP,levelHours} from './journey-balance.mjs?v=priest90-20261108';
export const CHAPTERS_300=[
 {id:13,chapter:1,name:'유리바다의 노래',stages:[
  [225,'유리파도의 해안','glass-tide','유리등 해마'],[230,'진주 산호궁','pearl-reef','진주갑 소라왕'],[235,'밀물의 왕좌','tide-throne','해류의 삼지창 수호자']]},
 {id:14,chapter:2,name:'멈춰버린 태엽정원',stages:[
  [240,'황동 열매의 과수원','clockwork-orchard','태엽 사과 정령'],[245,'추의 정원','pendulum-garden','청동 추 파수꾼'],[250,'영시의 궁전','zero-hour-palace','영시의 황금 여왕']]},
 {id:15,chapter:3,name:'먹빛 선경',stages:[
  [255,'먹안개 대숲','ink-bamboo','먹빛 대나무 호랑이'],[260,'천지학 성소','crane-sanctum','두루마리 학선'],[265,'만검의 누각','sword-pavilion','흑련 검귀']]},
 {id:16,chapter:4,name:'월식 황궁',stages:[
  [275,'극광의 계단','aurora-stair','극광 수정 사슴'],[285,'성운의 화원','nebula-garden','은하 백합 여제'],[300,'월식의 황정','eclipse-court','월식의 나비 군주']]}
];
// 2026-11-03 도현: Lv.300 이후 사냥터 4개 테마 추가(챕터 보스·일일 보스는 만들지 않음). 이미지는 도현이 직접 제작.
// 배경 chapters/<key>.webp · 몬스터 monsters/chapter-<key>.webp (CH.1~4와 같은 규칙).
// 300 이후는 레벨당 HP ×1.02 · 공격력 ×1.008로 완만하게(Lv.360 필드 HP 약 3.3배·공격 약 1.6배, 300 필드 대비).
const GENTLE=Object.freeze({hp:1.02,attack:1.008});
export const CHAPTERS_310=[
 {id:17,chapter:5,name:'불꽃 대장간 협곡',growth:GENTLE,stages:[
  [305,'용암 풀무의 길','forge-bellows','풀무불 도롱뇽'],[310,'흑철 모루 광산','anvil-mine','흑철 모루 골렘'],[315,'화룡의 용광로','dragon-furnace','용광로의 화룡 이그나르']]},
 {id:18,chapter:6,name:'서리왕의 빙하',growth:GENTLE,stages:[
  [320,'얼어붙은 오로라 숲','frost-aurora','서리뿔 순록'],[325,'빙결 거울 호수','mirror-lake','빙경의 인어 기사'],[330,'서리왕의 성채','frost-citadel','서리왕 니블하임']]},
 {id:19,chapter:7,name:'모래시계 사막',growth:GENTLE,stages:[
  [335,'황금 모래 언덕','golden-dune','사구 전갈 기병'],[340,'잊힌 태양 신전','sun-temple','태양 가면 신관'],[345,'시간의 피라미드','time-pyramid','모래시계 파라오 세티']]},
 {id:20,chapter:8,name:'천공의 부유섬',growth:GENTLE,stages:[
  [350,'구름 다리 정원','cloud-bridge','구름갈기 그리핀'],[355,'태풍의 등대','storm-lighthouse','폭풍 등불 정령'],[360,'하늘왕의 옥좌','sky-throne','천공왕 아스테르']]},
];
export function extendChapters300(regions,stages,monsters){
 if(regions.some(r=>r.id===13))return;
 let prior=stages.at(-1);
 for(const chapter of [...CHAPTERS_300,...CHAPTERS_310]){
  regions.push({id:chapter.id,chapter:chapter.chapter,name:'CH.'+chapter.chapter+' · '+chapter.name,level:chapter.stages[0][0],background:'chapters/'+chapter.stages[0][2]+'.webp',stages:chapter.stages.map(s=>s[1])});
  for(const [level,name,key,monster] of chapter.stages){
   const g=chapter.growth||{hp:1.035,attack:1.018},delta=level-prior.level,hp=Math.round(prior.hp*g.hp**delta),attack=Math.round(prior.attack*g.attack**delta);
   const xp=Math.round(Math.max(1,(journeyXP(level)*8/(levelHours(level)*3600)+hp*.002)*2.4));
   const gold=Math.round((4+level*.3+hp*.001)*3),id=stages.length;
   stages.push({id,level,name,region:chapter.id,chapter:chapter.chapter,background:'chapters/'+key+'.webp',star:0,hp,attack,xp,gold,dropLevel:200,drops:{equipment:.001,bossEquipment:0,cube:.0004,fragment:.006,scroll:0}});
   monsters.push({id:monsters.length,stage:id,name:monster,art:'monsters/chapter-'+key+'.webp'});
   prior=stages.at(-1);
  }
 }
}

export function extendChapterBosses(bosses){
 if(bosses.some(b=>b.chapter))return;
 let index=0;
 for(const chapter of CHAPTERS_300)for(const [level,arenaName,key,name] of chapter.stages){
  const i=index++,id=bosses.length;
  bosses.push({id,name,chapter:chapter.chapter,region:chapter.id,level,hp:Math.round(110000000*1.2**(i+1)),attack:Math.round(4500*1.12**(i+1)),seconds:90,weekly:false,art:'monsters/chapter-'+key+'.webp',background:'chapters/'+key+'.webp',arenaName,fullArt:true,gearLevel:200,dropChance:.015,gearRateScale:1,exactHalfWeapon:true,gold:Math.round(120000*(1+(i+1)*.15)),cubes:9+Math.floor(i/3)*2,material:4,patternEvery:Math.max(7,12-Math.floor(i/3)),patternMultiplier:3+i*.08,pattern:['진주 해류','태엽 역류','먹빛 검무','월식 심판'][chapter.chapter-1],recommended:{slots:9,stars:25,gear:200,boss:true,pot:true}});
 }
}
