import {isDungeon} from './citadel-zero.mjs?v=citadel-independent-214';
import {EXPLORATION_MOVE_SPEED} from './exploration-data.mjs?v=citadel-independent-214';
import {dungeonMove,revealDungeon} from './exploration-dungeon.mjs?v=citadel-independent-214';
import {TOWER_CLASSES,towerFacing} from './tower-model.mjs?v=citadel-independent-214';

const bound=n=>Math.max(120,Math.min(3080,n));
export function beginCoopEntry(w,now){
  w.entryWaiting=true;w.entryMotionAt=now;
  for(const m of w.members){m.entryMoved=false;m.input=[0,0,0];m.inputAt=now;m.inputAck=-1;}
  delete w._net;delete w._queuedInputs;delete w.predictionBase;
  return w;
}

// Only movement runs before everyone is ready. Combat ticks, cooldowns, enemies,
// hazards and wave spawns stay at their initial state for any loading duration.
export function advanceCoopEntry(w,user,input,now,allowStart=true){
  if(!w.entryWaiting||w.status!=='fighting')return w;
  const actor=w.members.find(m=>m.id===user&&!m.left&&m.hp>0);
  if(actor&&input){
    const [x,y]=input;
    actor.input=[x,y,0];actor.inputAt=now;
    if(Math.hypot(x,y)>.01)actor.entryMoved=true;
  }
  const dt=Math.min(.25,Math.max(0,now-(w.entryMotionAt??now))/1000);
  w.entryMotionAt=now;w.started=now;w.tick=0;
  for(const m of w.members){
    if(m.left||m.hp<=0)continue;
    let [x,y]=now-m.inputAt<1500?m.input:[0,0];const length=Math.max(1,Math.hypot(x,y));x/=length;y/=length;
    m.moving=Math.hypot(x,y)>.01;m.dir=towerFacing(x,y,m.dir??6);
    if(isDungeon(w))dungeonMove(w.dungeon,m,x*TOWER_CLASSES[m.classId].speed*10*dt*EXPLORATION_MOVE_SPEED,y*TOWER_CLASSES[m.classId].speed*10*dt*EXPLORATION_MOVE_SPEED);else{m.x=bound(m.x+x*TOWER_CLASSES[m.classId].speed*10*dt);m.y=bound(m.y+y*TOWER_CLASSES[m.classId].speed*10*dt);}
    if(m.moving)m.walk=(m.walk||0)+dt*10;
    if(x)m.face=x<0?-1:1;
  }
  if(isDungeon(w))revealDungeon(w);
  const members=w.members.filter(m=>!m.left&&m.hp>0);
  if(allowStart&&members.length&&members.every(m=>m.entryMoved)){
    w.entryWaiting=false;w.combatStartedAt=now;w.started=now;w.tick=0;
    for(const m of w.members){m.input=[0,0,0];m.inputAt=now;m.inputAck=-1;m.moving=false;}
    delete w._net;delete w._queuedInputs;delete w.predictionBase;
  }
  return w;
}
