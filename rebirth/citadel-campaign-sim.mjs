// Full NG0 campaign bot for balance: approaches/attacks, uses skills, dodges telegraphed
// hazards (a reasonably skilled player), runs for the exit on normal regions.
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {hazardInside,CITADEL_STAGES} from './citadel-zero.mjs';
import {dungeonRoute,dungeonWalkable} from './exploration-dungeon.mjs';
import {explorationFloor} from './exploration-data.mjs';
export const DOHYUN={attack:49108,hp:67525,defense:1373,crit:.41,critDamage:1.6,boss:3.2,cadence:1,advancement:4,firstJob:true,level:200,combatPower:206123};
const CLASSES=['warrior','mage','archer','priest'];
const fields=new Map();
// Bot pathing: BFS flow field over tiles (no straight-line shortcut past corners).
function route(d,from,goal){
 const n=d.size,gx=Math.floor(goal.x/100),gy=Math.floor(goal.y/100),key=d.id+':'+gx+':'+gy;let f=fields.get(key);
 if(!f){f=new Int32Array(n*n).fill(-1);const q=[gy*n+gx];f[gy*n+gx]=0;for(let h=0;h<q.length;h++){const a=q[h],x=a%n,y=(a-x)/n;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,i=ny*n+nx;if(nx>=0&&ny>=0&&nx<n&&ny<n&&f[i]<0&&d.tiles[ny][nx]!=='0'){f[i]=f[a]+1;q.push(i);}}}if(fields.size>64)fields.clear();fields.set(key,f);}
 const x=Math.floor(from.x/100),y=Math.floor(from.y/100);if(f[y*n+x]<=1)return goal;let best=null,bv=f[y*n+x];
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const i=(y+dy)*n+x+dx;if(f[i]>=0&&f[i]<bv){bv=f[i];best={x:(x+dx+.5)*100,y:(y+dy+.5)*100};}}
 if(!best)return goal;
 // Recentre on the current tile first if far off its axis, avoiding corner snags.
 const cx=(x+.5)*100,cy=(y+.5)*100;if(best.x!==cx&&Math.abs(from.y-cy)>25)return {x:from.x,y:cy};if(best.y!==cy&&Math.abs(from.x-cx)>25)return {x:cx,y:from.y};
 return best;
}
export function campaign(seed,{players=1,power=DOHYUN,from=1,to=21,reaction=3,maxTicks=60000}={}){
 let w=startCoop({mode:'citadel',tier:0,status:'waiting',owner:'p0',members:Array.from({length:players},(_,i)=>({id:'p'+i,classId:CLASSES[i%4],power:{...power},advanced:true,ready:true}))},seed);
 w.entryWaiting=false;
 if(from>1){w.floor=from;explorationFloor(w);}
 const log=[];let floorStart=0,lastFloor=w.floor;
 for(let t=0;t<maxTicks&&w.status==='fighting';t++){
  const frames=[];
  for(const m of w.members){
   if(m.left||m.hp<=0){frames.push({user:m.id,tick:t,input:[0,0,0]});continue;}
   let dx=0,dy=0,bits=123;
   const stNow=CITADEL_STAGES[w.floor-1],aliveNow=w.monsters.filter(e=>e.hp>0&&e.bossKind!=='shadow');
   const chestMine=w.rewardChest&&!(m.citadelChests||[]).includes(w.rewardChest.boss);
   const travel=chestMine?w.rewardChest:stNow.boss?(aliveNow.length?aliveNow.reduce((p,e)=>Math.hypot(e.x-m.x,e.y-m.y)<Math.hypot(p.x-m.x,p.y-m.y)?e:p):w.exit):w.exit;
   const tp=route(w.dungeon,m,travel),tn=Math.hypot(tp.x-m.x,tp.y-m.y)||1,gx=(tp.x-m.x)/tn,gy=(tp.y-m.y)/tn;
   // Dodge: hazards whose telegraph has been visible for `reaction` ticks.
   const danger=(w.hazards||[]).filter(h=>t>=0&&(h.at-w.tick)<=12&&(h.end>=w.tick)&&(w.tick-(h.start??(h.at-14)))>=reaction&&hazardInside(h,m));
   if(danger.length){
    // Pick the walkable direction that leaves every visible telegraph soonest.
    let best=null;
    for(let k=0;k<16;k++){const a=k*Math.PI/8,ux=Math.cos(a),uy=Math.sin(a);let ok=-1;
     for(let step=1;step<=8;step++){const p={x:m.x+ux*step*35,y:m.y+uy*step*35};if(!dungeonWalkable(w.dungeon,p.x,p.y))break;if(!danger.some(h=>hazardInside(h,p))){ok=step;break;}}
     const score=ok>0?ok-2*(ux*gx+uy*gy):1e9;if(ok>0&&(!best||score<best.score))best={ok,ux,uy,score};}
    if(best){dx=best.ux;dy=best.uy;}
    bits=1;
   }else{
    const st=CITADEL_STAGES[w.floor-1],alive=w.monsters.filter(e=>e.hp>0&&e.bossKind!=='shadow');
    const heart=(w.hearts||[]).find(h=>m.hp<m.power.hp*.7&&Math.hypot(h.x-m.x,h.y-m.y)<300);
    let goal=null;
    if(heart)goal=heart;
    else if(st.boss&&!alive.length)goal=w.exit;
    else if(st.boss){const near=alive.sort((a,b)=>Math.hypot(a.x-m.x,a.y-m.y)-Math.hypot(b.x-m.x,b.y-m.y))[0];if(near&&Math.hypot(near.x-m.x,near.y-m.y)>160)goal=near;}
    else goal=w.exit;
    if(!alive.some(e=>Math.hypot(e.x-m.x,e.y-m.y)<320))bits=0;
    if(goal){const p=route(w.dungeon,m,goal);dx=p.x-m.x;dy=p.y-m.y;}
   }
   const n=Math.hypot(dx,dy);if(n>0){dx/=n;dy/=n;}
   frames.push({user:m.id,tick:t,input:[dx,dy,bits]});
  }
  
  w=advanceCoopRaw(w,null,null,w.started+(t+1)*100,frames,true);
  if(w.floor!==lastFloor){log.push({floor:lastFloor,seconds:(w.tick-floorStart)/10,hp:Math.round(w.members.reduce((a,m)=>a+Math.max(0,m.hp),0))});lastFloor=w.floor;floorStart=w.tick;if(w.floor>to)break;}
 }
 if(w.floor===to&&w.status==='fighting'&&w.floor!==lastFloor){}
 const won=w.status==='won'||w.floor>to;
 return {won,reached:w.floor,status:w.status,minutes:+(w.tick/600).toFixed(1),log};
}
if(import.meta.url===`file://${process.argv[1]}`){
 const n=Number(process.argv[2]||10),players=Number(process.argv[3]||1);let wins=0;const reached={};
 for(let i=0;i<n;i++){const r=campaign(1000+i*7919,{players});if(r.won)wins++;reached[r.reached]=(reached[r.reached]||0)+1;console.log(i,r.won,r.reached,r.status,r.minutes,r.log.map(x=>x.floor+':'+Math.round(x.hp/1000)+'k').join(' '));}
 console.log('wins',wins,'/',n,'reached',reached);
}
