import {COOP_TIERS} from './coop-model.mjs?v=boss-identity-1';
import {towerArena} from './tower-client.mjs?v=boss-identity-1';
import {TowerRenderer,motionAsset,asset,image} from './tower-renderer.mjs?v=boss-identity-1';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=n=>Math.round(n||0).toLocaleString('ko-KR');
const button=(text,action,arg='',disabled=false)=>'<button data-action="'+action+'" data-arg="'+esc(arg)+'" '+(disabled?'disabled data-unavailable':'')+'>'+text+'</button>';
export function coopLobby(state,room,rooms=[]){
 if(room){const tier=COOP_TIERS[room.tier];return '<section class="panel pad"><h2>'+tier.name+' · 준비실</h2><p>1–4인 · 직접 이동하며 공격 · 제한 1분 30초</p>'+room.members.filter(m=>!m.left).map(m=>'<p>● '+esc(m.name)+' · 전투력 '+fmt(m.power.combatPower)+'</p>').join('')+'<div class="actions">'+button('출발','coopStart','',room.owner!==room.me)+button('새로고침','coopSync')+button('나가기','coopLeave')+'</div></section>';}
 return '<section class="panel pad"><h2>협동 균열</h2><p class="note">장비를 준비하고 함께 패턴을 피하세요. 1–4인 입장 · 인원에 따라 체력 조정 · 입장·승리 보상 무제한 · 실제 피해를 준 참가자에게 지급<br>탑과 같은 이동·회피·직업 스킬로 싸웁니다. 패배·연습은 무제한입니다.</p><div class="coop-tiers">'+COOP_TIERS.map((t,i)=>'<article><div class="coop-boss-portrait" style="background-image:url(tower/boss-'+t.art+'.webp)" role="img" aria-label="'+t.name+'"></div><h3>'+t.name+'</h3><p>권장 Lv.'+t.level+' · 레드 '+t.cube+' / 블랙 '+t.highCube+'</p>'+button('방 만들기','coopCreate',i,false)+'</article>').join('')+'</div><h3>모집 중</h3>'+button('목록 새로고침','coopList')+(rooms.length?rooms.map(r=>'<div class="daily-row"><span>'+esc(r.name)+' · '+COOP_TIERS[r.tier].name+'<small>'+r.count+' / 4명</small></span>'+button('참가','coopJoin',r.id,r.count>=4)+'</div>').join(''):'<p class="note">모집 중인 방이 없습니다. 새 방을 만들 수 있습니다.</p>')+'</section>';
}
export function coopArena(room){const me=room.members.find(m=>m.id===room.me);return towerArena({floor:[1,4,10][room.tier],classId:me.classId,runId:room.id,advanced:!!me.advanced,power:me.power,third:(me.power?.advancement||0)>=2}).replaceAll('시련의 탑','협동 균열').replace('towerLeaveConfirm','coopLeaveConfirm');}
const keyBits={KeyJ:1,KeyK:8,Space:4,KeyL:2,KeyI:16};
export class CoopController{
 constructor(host,room,send){Object.assign(this,{host,room,send,keys:new Set(),pointers:new Map(),stick:{x:0,y:0},abort:new AbortController(),busy:false,auto:false,disposed:false,positions:new Map(),lastDraw:0,correction:{x:0,y:0},pendingBits:0});this.renderer=new TowerRenderer(host.querySelector('canvas'));this.canvas=host.querySelector('canvas');const opt={signal:this.abort.signal};
  window.addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select,dialog'))return;if(keyBits[e.code]||/^(Key[WASD]|Arrow)/.test(e.code)){e.preventDefault();this.keys.add(e.code);this.pendingBits|=keyBits[e.code]||0;}},opt);window.addEventListener('keyup',e=>this.keys.delete(e.code),opt);
  const clear=()=>{this.keys.clear();this.pointers.clear();this.stick={x:0,y:0};this.auto=false;this.pendingBits=0;};window.addEventListener('blur',clear,opt);document.addEventListener('visibilitychange',clear,opt);
  for(const b of host.querySelectorAll('[data-tower-button]')){b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);this.pointers.set(e.pointerId,Number(b.dataset.towerButton));this.pendingBits|=Number(b.dataset.towerButton);},opt);for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,e=>this.pointers.delete(e.pointerId),opt);}
  const stick=host.querySelector('#tower-stick'),knob=host.querySelector('#tower-stick-knob');let pointer=null;
  const move=e=>{const r=stick.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)/(r.width*.4),y=(e.clientY-r.top-r.height/2)/(r.height*.4),n=Math.max(1,Math.hypot(x,y));this.stick={x:x/n,y:y/n};knob.style.transform='translate('+this.stick.x*r.width*.3+'px,'+this.stick.y*r.height*.3+'px)';};
  stick.addEventListener('pointerdown',e=>{if(pointer!==null)return;e.preventDefault();pointer=e.pointerId;stick.setPointerCapture(pointer);move(e);},opt);stick.addEventListener('pointermove',e=>{if(e.pointerId===pointer)move(e);},opt);for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId===pointer){pointer=null;this.stick={x:0,y:0};knob.style.transform='';}},opt);
  host.querySelector('#tower-auto').addEventListener('click',e=>{this.auto=!this.auto;e.currentTarget.textContent='연속 공격 '+(this.auto?'켜짐':'꺼짐');},opt);
  for(const cls of new Set(room.members.map(m=>m.classId))){image(asset('hero-'+cls+'-directions'));image(asset('hero-'+cls+'-motion-v4'));if(cls==='warrior')image(asset('hero-warrior-east-v4'));}image(asset('boss-'+COOP_TIERS[room.tier].art));image(asset('effects'));
  this.accept(room);this.timer=setInterval(()=>this.flush(),300);this.frame=requestAnimationFrame(t=>this.draw(t));
 }
 input(){if(document.hidden||document.querySelector('dialog[open]'))return [0,0,0];let x=this.stick.x,y=this.stick.y,bits=this.auto?1:0;for(const k of this.keys){bits|=keyBits[k]||0;if(['KeyA','ArrowLeft'].includes(k))x--;if(['KeyD','ArrowRight'].includes(k))x++;if(['KeyW','ArrowUp'].includes(k))y--;if(['KeyS','ArrowDown'].includes(k))y++;}for(const v of this.pointers.values())bits|=v;const n=Math.max(1,Math.hypot(x,y));return [x/n,y/n,bits];}
 async flush(){if(this.busy||this.disposed)return;this.busy=true;try{const input=this.input(),taps=this.pendingBits;input[2]|=taps;this.pendingBits=0;const result=await this.send('coopInput',{input},true);if(!result)this.pendingBits|=taps;const n=this.host.querySelector('#tower-connection');n.hidden=true;}catch(e){const n=this.host.querySelector('#tower-connection');n.hidden=false;n.textContent='연결 지연 · 입력을 다시 보내는 중';}finally{this.busy=false;}}
 accept(room){if(!room||room.id!==this.room.id||room.tick<this.room.tick)return;this.previousRoom=this.room;this.room=room;this.received=performance.now();const own=room.members.find(m=>m.id===room.me),pos=this.positions.get(room.me);if(pos&&own)this.correction={x:own.x-pos.x,y:own.y-pos.y};const t=COOP_TIERS[room.tier],me=room.members.find(m=>m.id===room.me);this.host.querySelector('.tower-title-row h3').textContent=t.name;this.host.querySelector('#tower-enemy-hp').textContent=fmt(room.hp)+' / '+fmt(room.maxHp);this.host.querySelector('#tower-enemy-bar').style.width=room.hp/room.maxHp*100+'%';this.host.querySelector('#tower-player-hp').textContent=fmt(me.hp)+' / '+fmt(me.power.hp);this.host.querySelector('#tower-player-bar').style.width=me.hp/me.power.hp*100+'%';this.host.querySelector('#tower-clock').textContent=Math.max(0,90-Math.floor(room.tick/10))+'초';this.host.querySelector('#tower-status').textContent=me.hp>0?'탑과 같은 조작 · 붉은 예고 회피':'쓰러졌습니다 · 동료 전투 관전 중';this.host.querySelector('#tower-range').textContent='참가 '+room.members.filter(m=>!m.left&&m.hp>0).length+'명';for(const b of this.host.querySelectorAll('[data-tower-button]')){const key={1:'attackReady',2:'skillReady',4:'dashReady',8:'ultimateReady',16:'thirdReady'}[b.dataset.towerButton],left=Math.max(0,(me[key]||0)-room.tick);b.querySelector('b').textContent=left?Math.ceil(left/10)+'s':'';}}
 draw(now){
  if(this.disposed)return;const w=this.room,me=w.members.find(m=>m.id===w.me),tier=COOP_TIERS[w.tier],input=this.input();
  const dt=Math.min(50,this.lastDraw?now-this.lastDraw:16);this.lastDraw=now;
  const age=Math.max(0,now-this.received),visualTicks=Math.min(250,age)/100;
  const smooth=(id,p)=>{
    const old=this.positions.get(id)||{x:p.x,y:p.y},follow=1-Math.exp(-dt/100);
    if(id===me.id&&me.hp>0){
      const speed=w.tick<(me.dashUntil||0)?750:((input[2]&1)&&['mage','archer','pirate'].includes(me.classId)?170:250);
      old.x+=(age<500?input[0]:0)*speed*dt/1000+this.correction.x*follow;
      old.y+=(age<500?input[1]:0)*speed*dt/1000+this.correction.y*follow;
      this.correction.x*=1-follow;this.correction.y*=1-follow;
      old.x=Math.max(120,Math.min(3080,old.x));old.y=Math.max(120,Math.min(3080,old.y));
    }else{
      const previous=id==='enemy'?this.previousRoom?.enemy:this.previousRoom?.members.find(m=>m.id===id),ticks=Math.max(1,w.tick-(this.previousRoom?.tick??w.tick));
      const vx=previous?Math.max(-75,Math.min(75,(p.x-previous.x)/ticks)):0,vy=previous?Math.max(-75,Math.min(75,(p.y-previous.y)/ticks)):0;
      old.x+=(p.x+vx*visualTicks-old.x)*follow;old.y+=(p.y+vy*visualTicks-old.y)*follow;
    }
    this.positions.set(id,old);return {...p,x:old.x,y:old.y};
  };
  const player=smooth(me.id,me),enemy=smooth('enemy',w.enemy),b={...w,...me,kind:'tower',worldVersion:3,floor:[1,4,10][w.tier],encounter:{...tier,seconds:90},classId:me.classId,power:me.power,hp:me.hp,enemyHp:w.hp,player,enemy,guardUntil:me.guardUntil||0,invulnerableUntil:me.immune||0,effects:w.effects||[],numbers:w.numbers||[],projectiles:w.projectiles||[],hazards:w.hazards.map(h=>({...h,type:h.type||'circle'})),allies:w.members.filter(m=>m.id!==w.me&&!m.left).map(m=>smooth(m.id,m))};
  b.tick=w.tick+visualTicks;b.player.walk=(me.walk||0)+visualTicks*(Math.hypot(input[0],input[1])>.01?1:0);b.projectiles=b.projectiles.map(q=>({...q,x:q.x+q.dx*visualTicks,y:q.y+q.dy*visualTicks}));
  const previous={enemy,projectiles:b.projectiles};this.renderer.draw(b,previous,player,0,now,input,{attack:0,skill:0,dash:0});this.frame=requestAnimationFrame(t=>this.draw(t));
 }
 dispose(){this.disposed=true;clearInterval(this.timer);cancelAnimationFrame(this.frame);this.abort.abort();this.renderer.dispose();}
}
