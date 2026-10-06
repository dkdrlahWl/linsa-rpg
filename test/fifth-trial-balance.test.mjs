import assert from 'node:assert/strict';
import {newTowerBattle,towerStep,TOWER_CLASSES} from '../rebirth/tower-model.mjs';
import {ADVANCEMENT_BOSSES} from '../rebirth/advancement.mjs';
// Frozen pre-fifth warrior reference: current gear advanced to the entry level.
export const baseline={attack:35797,hp:48792,defense:1090,boss:2.5,crit:.53,critDamage:1.6,cadence:1,advancement:3,firstJob:true,level:200};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lineDist=(p,h)=>{const dx=h.tx-h.x,dy=h.ty-h.y,t=clamp(((p.x-h.x)*dx+(p.y-h.y)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(p.x-h.x-t*dx,p.y-h.y-t*dy);};
export function pilot(b){
 const p=b.player,e=b.enemy,c=TOWER_CLASSES[b.classId],tick=b.tick+1;
 const costs=(mx,my,dash,goalDistance=Infinity)=>{
  let cost=0;const point=n=>({x:clamp(p.x+mx*c.speed*(Math.min(goalDistance/c.speed,n+(dash?Math.min(n,2)*2:0))),150,3050),y:clamp(p.y+my*c.speed*(Math.min(goalDistance/c.speed,n+(dash?Math.min(n,2)*2:0))),150,3050)});
  for(const h of b.hazards){const dt=h.at-tick;if(h.end<=tick||dt>24)continue;const q=point(Math.max(1,dt)),d=h.type==='line'?lineDist(q,h):Math.hypot(q.x-h.x,q.y-h.y);
   const collision=h.type==='line'?Math.max(0,h.width/2+60-d):d<h.inner-60?Math.max(0,d-h.inner+100):Math.max(0,h.r+60-d);
   if(collision>0&&!(dash&&dt>=0&&dt<5))cost+=2000+collision*20+h.multiplier*2000;
  }
  const q=point(5),d=Math.hypot(q.x-e.x,q.y-e.y);
  cost+=Math.max(0,d-250)*2+Math.max(0,170-d)*12;
  for(const shot of b.projectiles){if(shot.side!=='enemy'||shot.end<=tick)continue;const dt=Math.max(1,shot.at-tick);if(dt>7)continue;const z=point(dt);const d=Math.hypot(z.x-shot.x-shot.dx*dt,z.y-shot.y-shot.dy*dt);cost+=Math.max(0,80-d)*40;}
  return cost+(dash?15:0)+Math.hypot(mx,my)*.1;
 };
 let best=[0,0,59],value=costs(0,0,false);
 for(const dash of [false,true]){if(dash&&tick<b.dashReady)continue;for(const radius of [190,250,550,650,800])for(let i=0;i<32;i++){const a=i*Math.PI/16,tx=e.x+Math.cos(a)*radius,ty=e.y+Math.sin(a)*radius,d=Math.hypot(tx-p.x,ty-p.y),mx=(tx-p.x)/(d||1),my=(ty-p.y)/(d||1),v=costs(mx,my,dash,d);if(v<value){value=v;best=[mx,my,59|(dash?4:0)];}}}
 return best;
}
export function run(mult,seed,config={}){
 const t={...ADVANCEMENT_BOSSES[4],...config},p={...baseline,attack:Math.round(baseline.attack*mult),hp:Math.round(baseline.hp*mult),defense:Math.round(baseline.defense*mult)};
 const b=newTowerBattle(10,'warrior',p,0,'calibration',seed,true);Object.assign(b,{encounter:t,advancementStage:4,enemyHp:t.hp});
 while(!b.ended&&b.tick<1200)towerStep(b,pilot(b));
 return {mult,seed,won:b.won,seconds:b.tick/10,damage:t.hp-b.enemyHp,hp:b.hp};
}
const trial=ADVANCEMENT_BOSSES[4];
assert.equal(trial.artFrames,1);
assert.equal(trial.hp,60000000);
assert.equal(trial.seconds,120);
// Even a motionless boss, perfect skill uptime and 95% critical chance cannot
// let the reference gear finish within the time limit; level gating is bypassed.
const ceiling=newTowerBattle(10,'warrior',{...baseline,crit:.95,hp:1e9},0,'ceiling',1,true);
Object.assign(ceiling,{encounter:trial,advancementStage:4,enemyHp:trial.hp,nextPattern:Infinity,enemyAttackUntil:Infinity});ceiling.player.y=1700;
while(!ceiling.ended)towerStep(ceiling,[0,0,59]);
assert.equal(ceiling.won,false);assert.equal(ceiling.tick,1200);assert.ok(ceiling.enemyHp>10000000);
const rows=[];
for(const mult of [1,1.8,2.1])for(const seed of [1,7,42]){
 const result=run(mult,seed);rows.push(result);
 assert.equal(result.won,mult===2.1,JSON.stringify(result));
 if(result.won)assert.ok(result.seconds<120);
}
console.log('PASS fifth trial: reference and 1.8x fail, ~2x balanced offense/survival clears with evasion; 120s ceiling excludes same-gear level-only clears.');
