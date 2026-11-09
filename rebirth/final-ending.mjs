import {finalRaidArt} from './raid-presentation.mjs?v=final-art-20261109';

const SCENES=[
 [6,'창세의 끝','절대룡이 쓰러지고, 별을 삼키던 불길이 잦아들었습니다.','마침내 아스트라곤을 쓰러뜨렸습니다.'],
 [4,'처음 마을을 나서던 날','2026.09.21 · 링구 RPG Rebirth 모험 확장','낡은 장비 하나로 시작해, 한 걸음씩 여기까지 왔습니다.'],
 [5,'함께 넘은 시련','시련의 탑, 링구의 탐험, 그리고 암흑성채','서로를 지켜 주고 다시 일으켜 준 동료들이 있었습니다.'],
 [6,'우리의 모험은 기록으로','2026.09.21 ~ 2026.11.09 · 모험 확장부터 최종 보스까지 49일','함께 웃고, 실패하고, 다시 도전했던 모든 순간을 기억하겠습니다.'],
 [6,'함께해 줘서 고마워요','링구 RPG · THE END','이 여정의 마지막까지 함께해 준 모든 모험가에게.'],
];
const SCENE_MS=6000;

export function playFinalEnding(container,onFinish){
 const started=performance.now();
 function update(){
  if(!container.isConnected||!container.closest('dialog')?.open)return;
  const elapsed=performance.now()-started,index=Math.floor(elapsed/SCENE_MS),scene=SCENES[index];
  if(!scene){onFinish();return;}
  const [tier,title,kicker,text]=scene;
  container.style.backgroundImage=`linear-gradient(180deg,#090b19a8,#090b19f2),url('${finalRaidArt(tier,'map')}')`;
  container.innerHTML=`<section class="final-ending-scene"><small>${kicker}</small><h3>${title}</h3><p>${text}</p><span aria-label="장면 ${index+1}/${SCENES.length}">${String(index+1).padStart(2,'0')} / 05</span></section>`;
  setTimeout(update,Math.max(0,(index+1)*SCENE_MS-elapsed));
 }
 update();
}
