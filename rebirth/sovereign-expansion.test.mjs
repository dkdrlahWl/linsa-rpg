
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {TOWER_FLOORS,newTowerBattle,towerStep} from './tower-model.mjs';
import {SOVEREIGN_TOWER_FLOORS} from './sovereign-tower.mjs';
import {STAGES,REGIONS,MONSTERS,CLASSES,fieldMonster,BOSSES} from './data.mjs';
import {initialState,execute,settle,huntingRate,makeItem} from './engine.mjs';
import {COSTUMES,costumeCommand,costumeAttackBonus,equippedCostume} from './costumes.mjs';
const ctx={now:0,random:()=>.5,uuid:randomUUID},power={hp:1e14,attack:1,defense:0,boss:1,crit:0,critDamage:1.5,cadence:1};
assert.equal(TOWER_FLOORS.length,50);assert.equal(new Set(TOWER_FLOORS.map(f=>f.art)).size,50);
const openings=new Set();let simulations=0,peakHazards=0,peakProjectiles=0;
function occupied(h,x,y){if(h.type==='circle'){const d=Math.hypot(x-h.x,y-h.y);return d<h.r+35&&d>=Math.max(0,(h.inner||0)-35);}const dx=h.tx-h.x,dy=h.ty-h.y,t=Math.max(0,Math.min(1,((x-h.x)*dx+(y-h.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(x-h.x-t*dx,y-h.y-t*dy)<h.width/2+35;}
for(const f of SOVEREIGN_TOWER_FLOORS){
 assert.ok(f.hp>TOWER_FLOORS[f.floor-2].hp&&f.attack>TOWER_FLOORS[f.floor-2].attack);
 const original=initialState('warrior','확장검수',ctx),entry=execute(original,'towerStart',{floor:f.floor},ctx).state;
 assert.equal(entry.battle.floor,f.floor);
 for(const enraged of [false,true]){
  const a=newTowerBattle(f.floor,'warrior',power,0,'qa',27),b=structuredClone(a);if(enraged)a.enemyHp=b.enemyHp=f.hp*.3;
  for(let tick=0;tick<900;tick++){
   const input=[Math.sin(tick*.07),Math.cos(tick*.07),tick%35===0?4:0];towerStep(a,input);towerStep(b,input);
   if(a.tick===25){if(!enraged)openings.add(JSON.stringify(a.hazards));assert.ok(a.hazards.length>0);assert.ok(a.hazards.every(h=>h.at-a.tick>=18));}
   for(const h of a.hazards)assert.ok(Number.isFinite(h.at)&&h.end>h.at&&h.multiplier>0);
   const active=a.hazards.filter(h=>h.at<=a.tick&&h.end>a.tick);
   if(active.length){let safe=false;for(let x=350;x<=2850&&!safe;x+=250)for(let y=350;y<=2850&&!safe;y+=250)if(active.every(h=>!occupied(h,x,y)))safe=true;assert.ok(safe,'full-arena hazard '+f.floor+'/'+a.tick);}
   peakHazards=Math.max(peakHazards,a.hazards.length);peakProjectiles=Math.max(peakProjectiles,a.projectiles.length);
  }
  assert.deepEqual(a,b);assert.equal(a.tick,900);assert.ok(a.ended&&!a.won);simulations++;
 }
 entry.battle.ended=true;entry.battle.won=true;entry.battle.tick=50;
 const first=execute(entry,'sync',{}, {...ctx,now:5000}).state;
 assert.equal(first.gold-entry.gold,f.reward.gold);assert.ok(first.tower.cleared.includes(f.floor));
 for(const key of ['cube','highCube','primeCube'])assert.equal(first.materials[key]-entry.materials[key],f.reward[key]);
 const repeated=execute(first,'towerStart',{floor:f.floor},{...ctx,now:5000}).state;repeated.battle.ended=true;repeated.battle.won=true;repeated.battle.tick=40;
 const second=execute(repeated,'sync',{}, {...ctx,now:6000}).state;assert.equal(second.gold,repeated.gold);assert.deepEqual(second.materials,repeated.materials);
 const failed=execute(original,'towerStart',{floor:f.floor},ctx).state;assert.equal(execute(failed,'towerLeave',{}, {...ctx,now:1000}).state.gold,failed.gold);
}
assert.equal(openings.size,20);assert.ok(peakHazards<35&&peakProjectiles<100);
assert.throws(()=>execute(initialState('warrior','검수',ctx),'towerStart',{floor:51},ctx),/INVALID_TOWER_FLOOR/);
assert.equal(REGIONS.length,17);assert.equal(STAGES.length,51);assert.equal(MONSTERS.length,81);
const fields=STAGES.slice(39);assert.equal(fields.length,12);assert.equal(fields.at(-1).level,300);assert.equal(new Set(fields.map(s=>s.background)).size,12);
for(const r of REGIONS.slice(13))assert.equal(fields.filter(s=>s.region===r.id).length,3);
for(const s of fields){
 assert.ok(s.hp>STAGES[s.id-1].hp&&s.attack>STAGES[s.id-1].attack&&s.gold>STAGES[s.id-1].gold&&s.xp>STAGES[s.id-1].xp);assert.equal(s.dropLevel,200);assert.equal(fieldMonster(s.id).stage,s.id);
 const p=initialState('warrior','사냥검수',ctx);assert.equal(execute(p,'stage',{id:s.id},ctx).state.stage,s.id);
 Object.assign(p,{level:300,stage:s.id,advancement:4,firstAdvancement:true,balanceVersion:'journey-20260925'});const w=makeItem(200,'warrior',0,false,ctx);w.baseStats={attack:1e12,stat:1e8,hp:1e12,defense:1e8};p.items=[w];p.equipped={0:w.id};
 assert.ok(huntingRate(p).survives);const reward=settle(p,{...ctx,now:60000});assert.ok(reward.kills>0&&reward.gold>0&&reward.xp>0);
}
assert.equal(COSTUMES.length,30);
for(const c of COSTUMES.slice(18)){
 const s=initialState(c.classId,'의상검수',ctx);s.gold=c.price;costumeCommand(s,'costumeBuy',c.id);assert.equal(s.gold,0);assert.equal(costumeAttackBonus(s),1);costumeCommand(s,'costumeEquip',c.id);assert.equal(equippedCostume(s).id,c.id);assert.throws(()=>costumeCommand(s,'costumeBuy',c.id),/COSTUME_OWNED/);s.classId=CLASSES.find(x=>x.id!==c.classId).id;assert.throws(()=>costumeCommand(s,'costumeEquip',c.id),/COSTUME_CLASS_MISMATCH/);
}
if(process.argv.includes('--assets')){
 for(const f of SOVEREIGN_TOWER_FLOORS)assert.ok(existsSync(new URL('tower/boss-'+f.art+'.webp',import.meta.url)));
 for(const s of fields){assert.ok(existsSync(new URL(s.background,import.meta.url)));assert.ok(existsSync(new URL(fieldMonster(s.id).art,import.meta.url)));}
 const layouts=JSON.parse(readFileSync(new URL('./costume-motion-layout.mjs',import.meta.url),'utf8').split('export default ')[1].trim().replace(/;$/,''));
 for(const c of COSTUMES.slice(18)){assert.ok(existsSync(new URL(c.atlas,import.meta.url)));assert.ok(existsSync(new URL(c.portrait,import.meta.url)));assert.equal(layouts[c.id].frames.length,c.classId==='priest'&&c.price===10000000?72:80);for(const f of layouts[c.id].frames)assert.ok(f.body>0&&f.foot<=f.h&&f.anchor>=0&&f.anchor<=f.w);}
}
console.log('PASS 40 normal/enraged 90s replays, 20 unique openers, warning times, safety samples, bounded attacks, first rewards/retries, 12 fields through Lv300 and 6 costume transactions.',{simulations,peakHazards,peakProjectiles});

assert.equal(BOSSES.length,33);assert.deepEqual(BOSSES.filter(b=>b.chapter).map(b=>[b.id,b.name,b.hp,b.gearLevel,b.dropChance,b.weekly]),[[32,'유리등 해마',160000000,200,.015,false]]);
console.log('PASS chapter daily bosses: only 유리등 해마 remains (HP 160M, Lv.200 boss gear)');

assert.ok(COSTUMES.slice(0,18).every(c=>c.price===5000000));assert.ok(COSTUMES.slice(18,24).every(c=>c.price===10000000));assert.ok(COSTUMES.slice(24).every(c=>c.price===20000000));
console.log('PASS price isolation: original 18 costumes 5M; pose-revised 6 costumes 10M; approved new 6 costumes 20M');
