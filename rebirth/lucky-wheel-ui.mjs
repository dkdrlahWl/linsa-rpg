// 행운의 돌림판 screen. The server decides the slice; this only draws and animates the wheel.
import {LUCKY_WHEEL,LUCKY_WHEEL_SPINS,luckyWheelLeft,WHEEL_CHEST} from './lucky-wheel.mjs';
import {currencyIconURL} from './currency-icons.mjs';

const N=LUCKY_WHEEL.length,SEG=360/N;
let rotation=0,spinning=false;
const icon=slot=>slot.id==='jackpot'?'ui/lucky-wheel-chest.svg':slot.id==='gold'?currencyIconURL('gold'):currencyIconURL(slot.id);
const pct=c=>(c*100).toFixed(c<.01?1:0)+'%';
const polar=(r,deg)=>{const a=(deg-90)*Math.PI/180;return [Math.cos(a)*r,Math.sin(a)*r];};

function wheelSvg(){
  const slices=LUCKY_WHEEL.map((slot,i)=>{
    const a0=i*SEG,a1=a0+SEG,[x0,y0]=polar(150,a0),[x1,y1]=polar(150,a1),mid=a0+SEG/2,[ix,iy]=polar(122,mid),[tx,ty]=polar(80,mid),flip=mid>180,trot=flip?mid+90:mid-90;
    const jackpot=slot.id==='jackpot';
    return `<g class="wheel-slice${jackpot?' jackpot':''}">
      <path d="M0 0 L${x0.toFixed(2)} ${y0.toFixed(2)} A150 150 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}Z" fill="url(#wg${i})" stroke="#fff3cf" stroke-width="2"/>
      <g transform="translate(${ix.toFixed(2)} ${iy.toFixed(2)}) rotate(${mid})"><image href="${icon(slot)}" x="-20" y="-20" width="40" height="40"/></g>
      <text transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) rotate(${trot})" text-anchor="middle" dominant-baseline="middle">${slot.label}</text>
    </g>`;}).join('');
  const grads=LUCKY_WHEEL.map((slot,i)=>`<radialGradient id="wg${i}" cx="0" cy="0" r="150" gradientUnits="userSpaceOnUse"><stop offset=".25" stop-color="${slot.color}" stop-opacity=".55"/><stop offset="1" stop-color="${slot.color}"/></radialGradient>`).join('');
  const bulbs=Array.from({length:N*2},(_,i)=>{const [x,y]=polar(163,i*SEG/2);return `<circle class="wheel-bulb${i%2?' alt':''}" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="4.5"/>`;}).join('');
  return `<svg class="lucky-wheel-svg" viewBox="-180 -190 360 375" role="img" aria-label="행운의 돌림판">
    <defs>${grads}
      <linearGradient id="wheelRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".45" stop-color="#e2a536"/><stop offset="1" stop-color="#7a4610"/></linearGradient>
      <radialGradient id="wheelHub" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff8dc"/><stop offset="1" stop-color="#c57b1a"/></radialGradient>
      <linearGradient id="wheelPin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff9a9a"/><stop offset="1" stop-color="#b3172e"/></linearGradient>
      <filter id="wheelShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#000" flood-opacity=".55"/></filter>
    </defs>
    <circle r="172" fill="#2a1306" filter="url(#wheelShadow)"/>
    <circle r="170" fill="url(#wheelRim)"/>
    <circle r="155" fill="#3a1d07"/>
    ${bulbs}
    <g class="lucky-wheel-rotor" style="transform:rotate(${rotation}deg)">${slices}</g>
    <circle r="40" fill="url(#wheelHub)" stroke="#7a4610" stroke-width="4"/>
    <text class="wheel-hub-text" y="-6" text-anchor="middle">LUCKY</text>
    <text class="wheel-hub-text small" y="12" text-anchor="middle">돌림판</text>
    <path d="M0 -146 L-17 -186 Q0 -196 17 -186Z" fill="url(#wheelPin)" stroke="#5c0a14" stroke-width="3" stroke-linejoin="round"/>
    <circle cy="-180" r="5" fill="#ffe1e1"/>
  </svg>`;
}

export function luckyWheelView(s,message=''){
  const left=luckyWheelLeft(s);
  const table=LUCKY_WHEEL.map(slot=>`<li class="${slot.id==='jackpot'?'jackpot':''}"><img src="${icon(slot)}" alt=""><span>${slot.id==='jackpot'?'보스 장비 상자 (Lv.'+WHEEL_CHEST.minLevel+'~'+WHEEL_CHEST.maxLevel+')':slot.name+' · '+slot.label}</span><b>${pct(slot.chance)}</b></li>`).join('');
  return `<section class="lucky-wheel" data-lucky-wheel>
    <p class="lucky-wheel-lead">매일 ${LUCKY_WHEEL_SPINS}번 무료! 잭팟이 나오면 <strong>Lv.${WHEEL_CHEST.minLevel}~${WHEEL_CHEST.maxLevel} 보스 장비 상자</strong>가 우편으로 와요.</p>
    <div class="lucky-wheel-stage">${wheelSvg()}</div>
    <p class="lucky-wheel-result" aria-live="polite">${message}</p>
    <button class="lucky-wheel-spin" data-action="luckyWheelSpin" data-write="1" ${left<=0||spinning?'disabled':''}>${left>0?'돌리기 · 오늘 '+left+' / '+LUCKY_WHEEL_SPINS:'오늘은 모두 돌렸어요 · 내일 다시'}</button>
    <details class="lucky-wheel-odds"><summary>보상 확률 보기</summary><ul>${table}</ul><p class="note">보스 장비 상자: 전 직업·전 부위, 무기는 다른 부위의 절반 확률 · 우편함에서 받기를 누르면 열려요. 한국 시간 자정에 횟수가 초기화돼요.</p></details>
  </section>`;
}

// Spin the drawn wheel so slice `index` stops under the pointer, then resolve.
export function spinLuckyWheel(root,index){
  const rotor=root?.querySelector('.lucky-wheel-rotor');if(!rotor)return Promise.resolve();
  spinning=true;
  const target=360-(index*SEG+SEG/2)+(Math.random()-.5)*SEG*.6,base=Math.ceil(rotation/360)*360;
  rotation=base+360*6+target;
  rotor.style.transition='transform 4.6s cubic-bezier(.12,.72,.08,1)';
  requestAnimationFrame(()=>{rotor.style.transform=`rotate(${rotation}deg)`;});
  root.querySelector('.lucky-wheel-stage')?.classList.add('spinning');
  return new Promise(resolve=>setTimeout(()=>{spinning=false;root.querySelector('.lucky-wheel-stage')?.classList.remove('spinning');resolve();},4750));
}
export const luckyWheelSpinning=()=>spinning;
