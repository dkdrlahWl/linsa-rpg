import {TREASURE_CELLS,TREASURE_MINES,TREASURE_DAILY,TREASURE_GEAR_LEVELS,rollTreasureReward,treasureReward} from './treasure-data.mjs';
// 보물 지뢰찾기 (서버 판정).
// 지뢰 위치는 미리 정하지 않고, 칸을 열 때마다 "남은 지뢰 / 남은 칸" 확률로 판정한다.
// 무작위로 미리 깔아둔 판과 확률이 완전히 같고, 상태에 지뢰 위치가 없으니 화면에서 미리 볼 수 없다.
// 판이 끝나면(폭발·수령) 남은 지뢰를 열지 않은 칸에 무작위로 배치해 보여준다.
const fail=m=>{throw new Error(m);};
export function normalizeTreasure(s,day){
 const t=s.treasure&&typeof s.treasure==='object'?s.treasure:{};
 if(t.day!==day){t.day=day;t.plays=0;}
 t.plays=Number.isInteger(t.plays)&&t.plays>=0?t.plays:0;
 t.run=t.run&&typeof t.run==='object'?t.run:null;
 s.treasure=t;return t;
}
export const treasurePlaysLeft=(s,day)=>Math.max(0,TREASURE_DAILY-(s.treasure?.day===day?s.treasure.plays||0:0));
function revealMines(run,boom,random){
 const closed=[];for(let i=0;i<TREASURE_CELLS;i++)if(i!==boom&&!run.opened.some(o=>o.cell===i))closed.push(i);
 const mines=boom===null?[]:[boom];
 while(mines.length<TREASURE_MINES&&closed.length){mines.push(closed.splice(Math.floor(random()*closed.length),1)[0]);}
 return mines.sort((a,b)=>a-b);
}
function grant(s,run,makeGear,random){
 const got={};
 for(const o of run.opened){
  const r=treasureReward(o.reward);if(!r)continue;
  if(r.id==='gold'){s.gold=(Number(s.gold)||0)+r.amount;}
  else if(r.id==='bossGear'){const item=makeGear(TREASURE_GEAR_LEVELS[Math.floor(random()*TREASURE_GEAR_LEVELS.length)]);o.item=item.id;o.level=item.level;(run.items||=[]).push(item.id);}
  else s.materials={...s.materials,[r.id]:(Number(s.materials?.[r.id])||0)+r.amount};
  got[r.id]=(got[r.id]||0)+r.amount;
 }
 return got;
}
export function treasureCommand(s,command,args,ctx,day,makeGear){
 const t=normalizeTreasure(s,day);
 if(command==='treasureStart'){
  if(t.run?.status==='digging')fail('TREASURE_RUN_ACTIVE');
  if(t.plays>=TREASURE_DAILY)fail('TREASURE_DAILY_LIMIT');
  t.plays++;t.run={id:ctx.uuid(),status:'digging',opened:[],mines:[],startedAt:ctx.now};
  return {type:'treasureStart',plays:t.plays};
 }
 const run=t.run;if(!run||run.status!=='digging')fail('TREASURE_NO_RUN');
 if(command==='treasureDig'){
  const cell=args?.cell;
  if(!Number.isInteger(cell)||cell<0||cell>=TREASURE_CELLS)fail('INVALID_TREASURE_CELL');
  if(run.opened.some(o=>o.cell===cell))fail('TREASURE_CELL_OPEN');
  const left=TREASURE_CELLS-run.opened.length;
  if(ctx.random()<TREASURE_MINES/left){
   run.status='boom';run.boom=cell;run.mines=revealMines(run,cell,ctx.random);run.endedAt=ctx.now;
   return {type:'treasureBoom',cell,lost:run.opened.length};
  }
  const reward=rollTreasureReward(ctx.random);run.opened.push({cell,reward:reward.id});
  if(run.opened.length===TREASURE_CELLS-TREASURE_MINES){
   // 안전한 칸을 전부 열면 남은 칸이 지뢰.
   run.status='cleared';run.got=grant(s,run,makeGear,ctx.random);run.mines=revealMines(run,null,ctx.random);
   run.endedAt=ctx.now;return {type:'treasureCash',cell,reward:reward.id,got:run.got,cleared:true};
  }
  return {type:'treasureDig',cell,reward:reward.id};
 }
 if(command==='treasureCash'){
  if(!run.opened.length)fail('TREASURE_EMPTY_BAG');
  run.status='cashed';run.got=grant(s,run,makeGear,ctx.random);run.mines=revealMines(run,null,ctx.random);
  run.endedAt=ctx.now;return {type:'treasureCash',got:run.got,cleared:false};
 }
 fail('INVALID_TREASURE_COMMAND');
}
