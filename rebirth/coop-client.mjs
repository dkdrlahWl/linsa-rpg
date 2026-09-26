import {prepareWaveCreature} from './wave-motion.mjs?v=field-drop-double-9';
import {WAVE_MONSTERS} from './wave-monsters.mjs?v=field-drop-double-9';
import {waveLobby,waveHud} from './wave-ui.mjs?v=field-drop-double-9';
import {CoopMotion} from './coop-motion.mjs?v=field-drop-double-9';
import {TowerInput,projectPlayer} from './tower-input.mjs?v=field-drop-double-9';
import {predictCoopStep} from './coop-model.mjs?v=field-drop-double-9';
import {COOP_TIERS} from './coop-model.mjs?v=field-drop-double-9';
import {towerArena} from './tower-client.mjs?v=field-drop-double-9';
import {TowerRenderer,motionAsset,asset,image,prepareCombatArt} from './tower-renderer.mjs?v=field-drop-double-9';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n||0).toLocaleString('ko-KR');
const button=(text,action,arg='',disabled=false)=>'<button data-action="'+action+'" data-arg="'+esc(arg)+'" '+(disabled?'disabled data-unavailable':'')+'>'+text+'</button>';
export function coopLobby(state,room,rooms=[],mode="rift"){
 if(room?.mode==="wave"||(!room&&mode==="wave")){void prepareWaveCreature(image(WAVE_MONSTERS[0].art),0);void prepareWaveCreature(image(WAVE_MONSTERS[0].eliteArt),0);if(room)void prepareCombatArt(room.members.map(m=>m.classId),COOP_TIERS[0].art);return waveLobby(state,room,rooms);}
 rooms=rooms.filter(r=>r.mode!=="wave");
 if(room){const tier=COOP_TIERS[room.tier];void prepareCombatArt(room.members.map(m=>m.classId),tier.art);return '<section class="panel pad"><h2>'+tier.name+' · 준비실</h2><p>3인 기준 · 최대 4인 · 제한 90초</p>'+room.members.filter(m=>!m.left).map(m=>'<p>● '+esc(m.name)+' · '+(m.ready?'준비 완료':'접속 대기')+' · 전투력 '+fmt(m.power.combatPower)+'</p>').join('')+'<div class="actions">'+button(room.members.every(m=>m.ready)?'출발':'모두 준비 후 출발','coopStart','',room.owner!==room.me||!room.members.every(m=>m.ready))+button('새로고침','coopSync')+button('나가기','coopLeave')+'</div></section>';}
 const names={cube:'레드 큐브',highCube:'블랙 큐브',primeCube:'프라임 큐브',fragment:'파편',scroll:'잠재 해금 주문서'};
 return '<section class="panel pad coop-lobby"><h2>협동 균열</h2><p class="note">3인 기준 · 최대 4인 · 90초 · 도전·보상 무제한<br>보스에게 피해를 준 뒤 각자 개인 상자를 열고 나갑니다.</p><div class="coop-tiers">'+COOP_TIERS.map((t,i)=>'<article><div class="coop-boss-portrait" style="background-image:url(tower/boss-'+t.art+'.webp)" role="img" aria-label="'+t.name+'"></div><div class="coop-meta"><h3>'+t.name+'</h3><p>기본 '+fmt(t.gold)+' G · 개인 상자</p></div>'+button('입장 준비','coopCreate',i)+'<details><summary>보상 확률 보기</summary><p>장비 '+(t.gearChance*100)+'% · Lv.'+t.level+' / 무작위 직업</p>'+Object.entries(t.chances).filter(([,p])=>p>0).map(([k,p])=>'<p>'+names[k]+' '+(p*100)+'% · '+(k==='fragment'?t.fragmentCount:1)+'개</p>').join('')+'<small>각 항목 독립 추첨 · 새 장비 잠재 잠금</small></details></article>').join('')+'</div><h3>모집 중</h3>'+button('목록 새로고침','coopList')+(rooms.length?rooms.map(r=>'<div class="daily-row"><span>'+esc(r.name)+' · '+COOP_TIERS[r.tier].name+'<small>'+r.count+' / 4명</small></span>'+button('참가','coopJoin',r.id,r.count>=4)+'</div>').join(''):'<p class="note">모집 중인 방이 없습니다.</p>')+'</section>';
}
export function coopArena(room){const me=room.members.find(m=>m.id===room.me);return towerArena({floor:room.tier+1,encounter:{...COOP_TIERS[room.tier],seconds:90},classId:me.classId,runId:room.id,advanced:!!me.advanced,power:me.power,third:(me.power?.advancement||0)>=2}).replaceAll('시련의 탑',room.mode==='wave'?'협동 웨이브':'협동 균열').replace('>'+String(room.tier+1)+'F<','>'+String(COOP_TIERS[room.tier].level)+'<').replace('towerLeaveConfirm','coopLeaveConfirm');}
const keyBits={KeyJ:1,KeyK:8,Space:4,KeyL:2,KeyI:16,KeyO:32};
export class CoopController{
 constructor(host,room,send,sound){Object.assign(this,{host,room,send,sound,keys:new Set(),pointers:new Map(),stick:{x:0,y:0},abort:new AbortController(),busy:false,auto:false,disposed:false,motion:new CoopMotion(),lastDraw:0,pendingBits:0,frames:[],sampler:new TowerInput(100),predicted:structuredClone(room),hint:{attack:0,skill:0,dash:0}});this.renderer=new TowerRenderer(host.querySelector('canvas'));this.canvas=host.querySelector('canvas');const opt={signal:this.abort.signal};
  window.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,dialog'))return;if(keyBits[e.code]||/^(Key[WASD]|Arrow)/.test(e.code)){e.preventDefault();this.keys.add(e.code);this.press(keyBits[e.code]||0);}},opt);window.addEventListener('keyup',e=>this.keys.delete(e.code),opt);
  const clear=()=>{this.keys.clear();this.pointers.clear();this.stick={x:0,y:0};this.auto=false;this.pendingBits=0;this.sampler.clear();};window.addEventListener('blur',clear,opt);document.addEventListener('visibilitychange',clear,opt);
  for(const b of host.querySelectorAll('[data-tower-button]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,Number(b.dataset.towerButton));this.press(Number(b.dataset.towerButton));},opt);for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>this.pointers.delete(e.pointerId),opt);}
  const stick=host.querySelector('#tower-stick'),knob=host.querySelector('#tower-stick-knob');let pointer=null;
  const move=e=>{const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.4),y=(e.clientY-r.top-r.height/2)/(r.height*.4),n=Math.max(1,Math.hypot(x,y));this.stick={x:x/n,y:y/n};knob.style.transform='translate('+this.stick.x*r.width*.3+'px,'+this.stick.y*r.height*.3+'px)';};
  stick.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);move(e);},opt);stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e);},opt);for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===pointer){pointer=null;this.stick={x:0,y:0};knob.style.transform='';}},opt);
  const chestButton=host.querySelector('#tower-chest');delete chestButton.dataset.action;chestButton.addEventListener('click',()=>{this.pendingBits|=1;this.flush();},opt);
  host.querySelector('#tower-auto').addEventListener('click',e=>{this.auto=!this.auto;e.currentTarget.textContent='연속 공격 '+(this.auto?'켜짐':'꺼짐');},opt);
  for(const cls of new Set(room.members.map(m=>m.classId))){image(asset('hero-'+cls+'-directions'));image(asset('hero-'+cls+'-motion-v4'));if(cls==='warrior')image(asset('hero-warrior-east-v4'));}image(asset('boss-'+COOP_TIERS[room.tier].art));image(asset('effects'));image(asset('reward-chest'));
  this.artReady=false;Promise.all([prepareCombatArt(room.members.map(m=>m.classId),COOP_TIERS[room.tier].art),...(room.mode==='wave'?[image('wave/meadow-painted-v2.webp').decode().catch(()=>{}),image(WAVE_MONSTERS[Math.floor(((room.wave||1)-1)/10)%30].art).decode().catch(()=>{}),image(WAVE_MONSTERS[Math.floor(((room.wave||1)-1)/10)%30].eliteArt).decode().catch(()=>{})]:[])]).then(()=>{this.artReady=true;});
  this.accept(room);this.timer=setInterval(()=>this.flush(),100);this.frame=requestAnimationFrame(t=>this.draw(t));
 }
 input(){if(this.predicted?.mode==='wave'&&this.predicted.members.find(m=>m.id===this.room.me)?.hp<=0)return [0,0,0];if(document.hidden||document.querySelector('dialog[open]'))return [0,0,0];let x=this.stick.x,y=this.stick.y,bits=this.auto?1:0;for(const k of this.keys){bits|=keyBits[k]||0;if(['KeyA','ArrowLeft'].includes(k))x--;if(['KeyD','ArrowRight'].includes(k))x++;if(['KeyW','ArrowUp'].includes(k))y--;if(['KeyS','ArrowDown'].includes(k))y++;}for(const v of this.pointers.values())bits|=v;const n=Math.max(1,Math.hypot(x,y));return [x/n,y/n,bits];}
 press(bits){this.pendingBits|=bits;this.sampler.press(bits);const now=performance.now();if(bits&4)this.hint.dash=now+110;else if(bits&1)this.hint.attack=now+110;else this.hint.skill=now+110;}
 async flush(){
  if(this.busy||this.disposed)return;this.busy=true;
  try{
   const taps=this.pendingBits;this.pendingBits=0;
   const room=this.predicted,me=room.members.find(m=>m.id===room.me),chest=room.chest;
   const wantsOpen=room.status==='won'&&(taps&1)&&me.damage>0&&chest&&Math.hypot(me.x-chest.x,me.y-chest.y)<=180;
   const confirmed=this.room.members.find(m=>m.id===room.me),open=wantsOpen&&this.room.status==='won'&&Math.hypot(confirmed.x-chest.x,confirmed.y-chest.y)<=180;
   if(wantsOpen&&!open)this.pendingBits|=1;
   const frames=this.frames.slice(-35);
   const result=await this.send(open?'coopOpen':'coopInput',open?{}:room.status==='won'?{input:this.input()}:{frames},!open);
   if(!result)this.pendingBits|=taps;
   const n=this.host.querySelector('#tower-connection');n.hidden=!!result;
  }catch{this.host.querySelector('#tower-connection').hidden=false;this.host.querySelector('#tower-connection').textContent='연결 지연 · 입력 기록 재전송 중';}
  finally{this.busy=false;}
 }
 accept(room){if(!room||room.id!==this.room.id||room.tick<this.room.tick)return;this.previousRoom=this.room;this.room=room;this.received=performance.now();
 const target=Math.max(room.tick,Math.min(this.predicted?.tick||room.tick,room.tick+20));
 const base=room.predictionBase||room;
 this.frames=this.frames.filter(f=>f.tick>=base.tick);
 this.predicted=structuredClone(base);
 delete this.predicted.predictionBase;
 if(room.status==='fighting')while(this.predicted.tick<target&&this.predicted.status==='fighting'){
  const input=this.frames.find(f=>f.tick===this.predicted.tick)?.input||this.predicted.members.find(m=>m.id===room.me).input||[0,0,0];
  this.predicted=predictCoopStep(this.predicted,room.me,input);
 }
 this.motion.accept(room,this.received,room._rtt||0);if(room.mode==='wave'){const block=Math.floor(((room.wave||1)-1)/10)%30;for(const i of [block,(block+1)%30]){void prepareWaveCreature(image(WAVE_MONSTERS[i].art),i);void prepareWaveCreature(image(WAVE_MONSTERS[i].eliteArt),i);}waveHud(this.host,room);return;}const t=COOP_TIERS[room.tier],me=room.members.find(m=>m.id===room.me);this.host.querySelector('.tower-title-row h3').textContent=t.name;this.host.querySelector('#tower-enemy-hp').textContent=fmt(room.hp)+' / '+fmt(room.maxHp);this.host.querySelector('#tower-enemy-bar').style.width=room.hp/room.maxHp*100+'%';this.host.querySelector('#tower-player-hp').textContent=fmt(me.hp)+' / '+fmt(me.power.hp);this.host.querySelector('#tower-player-bar').style.width=me.hp/me.power.hp*100+'%';this.host.querySelector('#tower-clock').textContent=room.status==='won'?'개인 상자':Math.max(0,90-Math.floor(room.tick/10))+'초';this.host.querySelector('#tower-status').textContent=room.status==='won'?(me.damage>0?'개인 상자로 이동한 뒤 공격 버튼을 눌러 여세요.':'피해를 주지 않아 보상이 없습니다. 나가기를 눌러주세요.'):me.hp>0?'탑과 같은 조작 · 붉은 예고 회피':'쓰러졌습니다 · 동료 전투 관전 중';this.host.querySelector('#tower-range').textContent='참가 '+room.members.filter(m=>!m.left&&m.hp>0).length+'명';const chest=this.host.querySelector('#tower-chest');chest.hidden=room.status!=='won'||!(me.damage>0);chest.disabled=!room.chest||Math.hypot(me.x-room.chest.x,me.y-room.chest.y)>180;chest.textContent=chest.disabled?'개인 상자 가까이 이동하세요':'개인 상자 열고 나가기';for(const b of this.host.querySelectorAll('[data-tower-button]')){const key={1:'attackReady',2:'skillReady',4:'dashReady',8:'ultimateReady',16:'thirdReady',32:'fourthReady'}[b.dataset.towerButton],left=Math.max(0,(me[key]||0)-room.tick);b.querySelector('b').textContent=left?Math.ceil(left/10)+'s':'';}}
 draw(now){
  if(this.disposed)return;
  const dt=Math.min(100,this.lastDraw?now-this.lastDraw:16);this.lastDraw=now;
  // Inputs and the arena must keep running while large character atlases decode.
  const input=this.input();
  if(now-this.received<2500&&!document.hidden)this.sampler.advance(dt,input,frame=>{
   if(this.predicted.status==='fighting')this.frames.push({tick:this.predicted.tick,input:frame});
   this.frames=this.frames.slice(-35);
   this.predicted=predictCoopStep(this.predicted,this.room.me,frame);
  });
  const w=this.predicted,me=w.members.find(m=>m.id===w.me),tier=COOP_TIERS[w.tier];
  const projection={waveMode:w.mode==='wave',player:me,classId:me.classId,tick:w.tick,dashReady:me.dashReady,dashUntil:me.dashUntil,dashX:me.dx,dashY:me.dy};
  const point=projectPlayer(projection,this.sampler),player={...me,...point},enemy=w.enemy;
  this.sound?.({...me,runId:w.id,tick:w.tick,enemyCastStart:w.enemyCastStart,won:this.room.status==='won',ended:['won','lost'].includes(this.room.status)});
  if(w.status==='won')this.auto=false;
  const b={...w,...me,kind:'tower',worldVersion:3,floor:w.tier+1,encounter:{...tier,seconds:90},classId:me.classId,power:me.power,hp:me.hp,enemyHp:w.hp,player,enemy,guardUntil:me.guardUntil||0,invulnerableUntil:me.immune||0,effects:w.effects||[],numbers:w.numbers||[],projectiles:w.projectiles||[],hazards:w.hazards.map(h=>({...h,type:h.type||'circle'})),allies:w.members.filter(m=>m.id!==w.me&&!m.left)};
  b.tick=w.tick+this.sampler.elapsed/100;
  this.host.querySelector('#tower-enemy-hp').textContent=fmt(w.hp)+' / '+fmt(w.maxHp);
  this.host.querySelector('#tower-player-hp').textContent=fmt(me.hp)+' / '+fmt(me.power.hp);
  this.host.querySelector('#tower-enemy-bar').style.width=w.hp/w.maxHp*100+'%';
  this.host.querySelector('#tower-player-bar').style.width=me.hp/me.power.hp*100+'%';
  for(const button of this.host.querySelectorAll('[data-tower-button]')){const key={1:'attackReady',2:'skillReady',4:'dashReady',8:'ultimateReady',16:'thirdReady',32:'fourthReady'}[button.dataset.towerButton];const left=Math.max(0,(me[key]||0)-b.tick);button.querySelector('b').textContent=left?(left/10).toFixed(1):'';}
  if(w.mode==='wave'){b.enemy={x:player.x,y:player.y};b.monsters=w.monsters;b.graves=w.members.filter(m=>!m.left&&m.hp<=0);b.allies=b.allies.filter(m=>m.hp>0);b.waveMode=true;waveHud(this.host,w);}
  this.renderer.draw(b,{enemy:b.enemy,projectiles:b.projectiles},player,0,now,input,this.hint);
  this.frame=requestAnimationFrame(t=>this.draw(t));
 }
 dispose(){this.disposed=true;clearInterval(this.timer);cancelAnimationFrame(this.frame);this.abort.abort();this.renderer.dispose();}
}
