import {TOWER_BOUNDS,TOWER_CLASSES,facingVector} from './tower-model.mjs?v=combat-catalog-1';
// Integrate input at display/event frequency; send the existing 100 ms protocol.
export class TowerInput {
  constructor(step=100){this.step=step;this.clear();}
  clear(){this.elapsed=0;this.x=0;this.y=0;this.buttons=0;}
  press(bits){this.buttons|=bits;}
  advance(ms,input,consume,canStep=()=>true){
    let remaining=Math.max(0,Math.min(ms,200));
    while(remaining>0.00001){
      if(!canStep()){this.clear();return;}
      const span=Math.min(remaining,this.step-this.elapsed);
      this.x+=input[0]*span;this.y+=input[1]*span;this.buttons|=input[2];
      this.elapsed+=span;remaining-=span;
      if(this.elapsed>=this.step-0.00001){
        const frame=[this.x/this.step,this.y/this.step,this.buttons];
        this.clear();consume(frame);
      }
    }
  }
}
export function stickVector(x,y,deadzone=.12){
  const length=Math.hypot(x,y);
  if(length<=deadzone)return {x:0,y:0};
  const magnitude=Math.min(1,(length-deadzone)/(1-deadzone));
  return {x:x/length*magnitude,y:y/length*magnitude};
}
export function projectPlayer(b,input){
  const fraction=input.elapsed/input.step;
  let dx=input.x/input.step,dy=input.y/input.step;
  const next=b.tick+1;
  if((input.buttons&4)&&next>=b.dashReady){
    // The server uses the average direction of this same input interval.
    dx*=3;dy*=3;if(!input.x&&!input.y){const v=facingVector(b.player.dir??6);dx=v.x*3*fraction;dy=v.y*3*fraction;}
  }else if(next<(b.dashUntil||0)){dx=b.dashX*3*fraction;dy=b.dashY*3*fraction;}
  const speed=(input.buttons&1)&&TOWER_CLASSES[b.classId].range>300&&!(next<(b.dashUntil||0))&&!((input.buttons&4)&&next>=b.dashReady)?17:25;
  return {x:Math.max(TOWER_BOUNDS.left,Math.min(TOWER_BOUNDS.right,b.player.x+dx*speed)),y:Math.max(TOWER_BOUNDS.top,Math.min(TOWER_BOUNDS.bottom,b.player.y+dy*speed))};
}
