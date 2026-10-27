// Four new chapters, three independently illustrated hunting grounds each.
import {journeyXP,levelHours} from './journey-balance.mjs?v=adv300-20261027';
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
export function extendChapters300(regions,stages,monsters){
 if(regions.some(r=>r.id===13))return;
 let prior=stages.at(-1);
 for(const chapter of CHAPTERS_300){
  regions.push({id:chapter.id,chapter:chapter.chapter,name:'CH.'+chapter.chapter+' · '+chapter.name,level:chapter.stages[0][0],background:'chapters/'+chapter.stages[0][2]+'.webp',stages:chapter.stages.map(s=>s[1])});
  for(const [level,name,key,monster] of chapter.stages){
   const delta=level-prior.level,hp=Math.round(prior.hp*1.035**delta),attack=Math.round(prior.attack*1.018**delta);
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
