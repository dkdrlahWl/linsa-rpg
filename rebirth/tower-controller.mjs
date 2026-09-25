import {TOWER_FLOORS,TOWER_CLASSES,towerStep,TOWER_STEP,upgradeTowerBattle} from './tower-model.mjs?v=open-world-1';
import {CLASS_SKILLS,SECOND_SKILLS} from './data.mjs?v=open-world-1';
import {TowerInput,stickVector,projectPlayer} from './tower-input.mjs?v=open-world-1';
import {TowerRenderer,image,asset,motionAsset} from './tower-renderer.mjs?v=open-world-1';
const codes={KeyW:'up',ArrowUp:'up',KeyS:'down',ArrowDown:'down',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',KeyJ:1,KeyK:8,Space:4,KeyL:2};
const format=n=>Math.floor(n).toLocaleString('ko-KR');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const snapshot=b=>({enemy:{...b.enemy},projectiles:b.projectiles.map(q=>({...q}))});

export class TowerController {
  constructor(host,b,send,sound,options={}){
    Object.assign(this,{host,send,sound,options,b:structuredClone(b),serverTick:b.tick,frames:[],keys:new Set(),buttonPointers:new Map(),stick:{x:0,y:0},stickPointer:null,abort:new AbortController(),last:performance.now(),lastSend:0,lastHud:0,lastSound:b.serial||0,pending:false,disposed:false,loaded:false,error:'',retryAfter:0,failures:0,autoAttack:false});
    upgradeTowerBattle(this.b);this.sampler=new TowerInput(TOWER_STEP);this.previous=snapshot(this.b);this.hint={attack:0,skill:0,dash:0};this.correction={x:0,y:0};
    this.canvas=host.querySelector('canvas');this.renderer=new TowerRenderer(this.canvas);
    this.required=['effects','boss-'+TOWER_FLOORS[b.floor-1].art+'-directions','hero-'+b.classId+'-directions'].map(asset);
    this.required.push(...['arena-overhead-v3','hero-'+b.classId+'-walk-v3','hero-'+b.classId+'-motion-v2','attack-slash-v2','attack-burst-v2','attack-beam-v2','attack-bolt-v2'].map(motionAsset));
    this.required.forEach(image);
    this.nodes=Object.fromEntries(['clock','enemy-hp','enemy-bar','player-hp','player-bar','status','stick-knob','auto','range','connection'].map(id=>[id,host.querySelector('#tower-'+id)]));
    this.buttons=[...host.querySelectorAll('[data-tower-button]')];
    const signal={signal:this.abort.signal};
    window.addEventListener('keydown',e=>{
      if(e.target?.closest('input,textarea,select,dialog,[contenteditable="true"]'))return;
      if(e.target?.closest('[data-tower-button]')&&['Space','Enter'].includes(e.code))return;
      const action=codes[e.code];if(action===undefined||this.paused()||(action===2&&!this.b.advanced))return;
      e.preventDefault();this.advance(performance.now());
      if(!this.keys.has(e.code)&&typeof action==='number')this.press(action);
      this.keys.add(e.code);
    },signal);
    window.addEventListener('keyup',e=>{if(codes[e.code]!==undefined){this.advance(performance.now());this.keys.delete(e.code);}},signal);
    window.addEventListener('blur',()=>this.resetInput(),signal);
    document.addEventListener('visibilitychange',()=>{this.resetInput();this.last=performance.now();if(!document.hidden)this.flush(true);},signal);
    for(const el of this.buttons){
      el.addEventListener('pointerdown',e=>{if(e.button!==0||el.disabled||this.paused())return;e.preventDefault();this.advance(performance.now());el.setPointerCapture(e.pointerId);const bit=Number(el.dataset.towerButton);this.buttonPointers.set(e.pointerId,bit);this.press(bit);},signal);
      for(const type of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(type,e=>{this.advance(performance.now());this.buttonPointers.delete(e.pointerId);},signal);
      el.addEventListener('keydown',e=>{if(!el.disabled&&['Enter','Space'].includes(e.code)&&!e.repeat){e.preventDefault();this.advance(performance.now());this.press(Number(el.dataset.towerButton));}},signal);
    }
    const stick=host.querySelector('#tower-stick');
    const move=e=>{const r=stick.getBoundingClientRect(),radius=Number.parseFloat(getComputedStyle(stick).getPropertyValue('--stick-travel'))||r.width*.38,x=(e.clientX-r.left-r.width/2)/radius,y=(e.clientY-r.top-r.height/2)/radius;this.stick=stickVector(x,y);this.nodes['stick-knob'].style.transform=`translate(${this.stick.x*radius}px,${this.stick.y*radius}px)`;};
    stick.addEventListener('pointerdown',e=>{if(this.stickPointer!==null||e.button!==0||this.paused())return;e.preventDefault();this.advance(performance.now());this.stickPointer=e.pointerId;stick.setPointerCapture(e.pointerId);move(e);},signal);
    stick.addEventListener('pointermove',e=>{if(e.pointerId!==this.stickPointer)return;this.advance(performance.now());move(e);},signal);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])stick.addEventListener(type,e=>{if(e.pointerId!==this.stickPointer)return;this.advance(performance.now());this.stickPointer=null;this.stick={x:0,y:0};this.nodes['stick-knob'].style.transform='';},signal);
    this.nodes.auto.addEventListener('click',()=>{this.autoAttack=!this.autoAttack;this.nodes.auto.setAttribute('aria-pressed',String(this.autoAttack));this.nodes.auto.textContent='연속 공격 '+(this.autoAttack?'켜짐':'꺼짐');},signal);
    this.frame=requestAnimationFrame(t=>this.loop(t));this.canvas.focus({preventScroll:true});
  }
  paused(){return document.hidden||!!document.querySelector('dialog[open]');}
  resetInput(){this.keys.clear();this.buttonPointers.clear();this.stickPointer=null;this.stick={x:0,y:0};this.sampler.buttons=0;this.nodes['stick-knob'].style.transform='';for(const el of this.buttons)el.classList.remove('pressed');}
  press(bit){
    if(!this.loaded||this.b.ended||this.frames.length>=25||(bit===2&&!this.b.advanced))return;
    this.sampler.press(bit);const now=performance.now(),b=this.b,c=TOWER_CLASSES[b.classId],d=Math.hypot(b.player.x-b.enemy.x,b.player.y-b.enemy.y);
    if(bit===1&&b.tick+1>=b.attackReady&&d<=c.range){this.hint.attack=now+110;this.sound?.('tower-swing');}
    if(bit===8&&b.tick+1>=b.ultimateReady){this.hint.skill=now+110;this.sound?.('tower-skill');}
    if(bit===2&&b.tick+1>=b.skillReady&&(SECOND_SKILLS[b.classId].type!=='attack'||d<760)){this.hint.skill=now+110;this.sound?.('tower-skill');}
    if(bit===4&&b.tick+1>=b.dashReady){this.hint.dash=now+110;this.sound?.('tower-dash');}
  }
  input(){
    let x=this.stick.x,y=this.stick.y,bits=this.autoAttack?1:0;
    const directions=new Set();for(const code of this.keys){const action=codes[code];if(typeof action==='number'){if(action!==2||this.b.advanced)bits|=action;}else directions.add(action);}
    x+=Number(directions.has('right'))-Number(directions.has('left'));y+=Number(directions.has('down'))-Number(directions.has('up'));
    const n=Math.hypot(x,y);if(n>1){x/=n;y/=n;}for(const bit of this.buttonPointers.values())bits|=bit;
    return [x,y,bits];
  }
  advance(now){
    const dt=Math.max(0,Math.min(200,now-this.last));this.last=now;
    if(!this.loaded||this.paused()){this.resetInput();return;}
    this.sampler.advance(dt,this.input(),input=>{this.previous=snapshot(this.b);this.frames.push(input);towerStep(this.b,input);},()=>this.frames.length<25&&!this.b.ended);
    const decay=Math.exp(-dt/65);this.correction.x*=decay;this.correction.y*=decay;
  }
  accept(b){
    if(b.runId!==this.b.runId||b.tick<=this.serverTick)return;
    const before=projectPlayer(this.b,this.sampler),drop=b.tick-this.serverTick;
    if(drop>this.frames.length){this.frames=[];this.sampler.clear();}else this.frames.splice(0,drop);
    this.serverTick=b.tick;this.b=upgradeTowerBattle(structuredClone(b));
    this.previous=snapshot(this.b);
    for(const input of this.frames){this.previous=snapshot(this.b);towerStep(this.b,input);}
    const after=projectPlayer(this.b,this.sampler);
    this.correction.x=clamp(this.correction.x+before.x-after.x,-100,100);this.correction.y=clamp(this.correction.y+before.y-after.y,-100,100);
  }
  async flush(force=false){
    if(this.pending||this.disposed||(!this.frames.length&&!force)||performance.now()<this.retryAfter)return;
    this.pending=true;this.lastSend=performance.now();
    try{
      const result=await this.send('towerInput',{runId:this.b.runId,from:this.serverTick,frames:this.frames.slice(0,30)},true);
      // Main app accepts during render; preview accepts here. Same tick is safe.
      if(result?.state?.battle?.kind==='tower')this.accept(result.state.battle);
      if(result){this.error='';this.failures=0;}
    }catch{this.error='연결 복구 중';this.failures++;this.retryAfter=performance.now()+Math.min(4000,500*2**Math.min(3,this.failures-1));}
    finally{this.pending=false;}
  }
  loop(now){
    if(this.disposed)return;
    const ready=this.required.every(src=>image(src).complete&&image(src).naturalWidth);
    if(ready&&!this.loaded)this.last=now;this.loaded=ready;
    this.advance(now);
    if(now-this.lastSend>350&&(this.frames.length||now-this.lastSend>2000))this.flush(true);
    this.draw(now);this.frame=requestAnimationFrame(t=>this.loop(t));
  }
  draw(now){
    const point=projectPlayer(this.b,this.sampler);point.x+=this.correction.x;point.y+=this.correction.y;
    this.renderer.draw(this.b,this.previous,point,this.sampler.elapsed/TOWER_STEP,now,this.input(),this.hint);
    for(const n of this.b.numbers)if(n.id>this.lastSound){this.lastSound=n.id;if(n.kind!=='heal')this.sound?.(n.kind==='critical'?'tower-crit':n.kind==='incoming'?'tower-hurt':'tower-hit');}
    if(now-this.lastHud>=50){this.updateHud();this.lastHud=now;}
  }
  updateHud(){
    const b=this.b,f=TOWER_FLOORS[b.floor-1],c=TOWER_CLASSES[b.classId],input=this.input(),distance=Math.hypot(b.player.x-b.enemy.x,b.player.y-b.enemy.y);
    const text=(id,value)=>{if(this.nodes[id].textContent!==value)this.nodes[id].textContent=value;};
    text('enemy-hp',`${format(b.enemyHp)} / ${format(f.hp)}`);text('player-hp',`${format(b.hp)} / ${format(b.power.hp)}`);
    this.nodes['enemy-bar'].style.transform=`scaleX(${b.enemyHp/f.hp})`;this.nodes['player-bar'].style.transform=`scaleX(${b.hp/b.power.hp})`;
    this.host.classList.toggle('low-health',b.hp/b.power.hp<.3);
    const left=Math.max(0,f.seconds-Math.floor(b.tick/10));text('clock',`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`);
    const inRange=distance<=c.range;text('range',inRange?'공격 가능':'보스에게 접근');this.nodes.range.classList.toggle('in-range',inRange);
    const failed=this.required.some(src=>image(src).complete&&!image(src).naturalWidth),waiting=this.frames.length>=25;
    const casting=b.tick<b.enemyCastUntil;
    text('status',failed?'이미지 연결 실패 · 나갔다 다시 도전해 주세요':!this.loaded?'전투 준비 중…':this.paused()?'조작 일시 중지 · 제한 시간은 계속됩니다':waiting?'연결을 기다리는 중…':b.ended?(this.options.preview?(b.won?'토벌 성공! 다시 도전할 수 있어요':'도전 종료 · 다시 도전해 보세요'):'결과를 저장하는 중…'):casting?f.pattern+' · 피하세요!':b.hazards.length?'붉은 영역 밖으로 이동하세요':(input[2]&1)&&!inRange?'공격이 닿지 않아요 · 더 가까이 이동하세요':'');
    this.nodes.status.hidden=!this.nodes.status.textContent;this.nodes.status.classList.toggle('danger',casting||b.hazards.length>0);
    text('connection',this.error||waiting?'연결 지연':'');this.nodes.connection.hidden=!this.nodes.connection.textContent;
    for(const el of this.buttons){
      const bit=Number(el.dataset.towerButton),key={1:'attackReady',2:'skillReady',4:'dashReady',8:'ultimateReady'}[bit];
      const duration={1:c.cooldown,2:SECOND_SKILLS[b.classId].cooldown*10,4:35,8:CLASS_SKILLS[b.classId].cooldown*10}[bit],remaining=Math.max(0,b[key]-b.tick-this.sampler.elapsed/100);
      const label=el.querySelector('b'),value=bit!==1&&remaining>0?(remaining/10).toFixed(1):'';
      if(label.textContent!==value)label.textContent=value;
      el.style.setProperty('--cooldown',Math.min(100,remaining/duration*100)+'%');el.classList.toggle('cooldown',remaining>0&&bit!==1);
      el.classList.toggle('pressed',!!(input[2]&bit));
    }
  }
  dispose(){this.disposed=true;cancelAnimationFrame(this.frame);this.abort.abort();this.renderer.dispose();this.resetInput();}
}

