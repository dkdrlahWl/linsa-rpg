import assert from 'node:assert/strict';
import {gearAttributes,gearStatMultiplier,gearHPMultiplier} from './data.mjs';
import {UNIVERSAL_POOLS} from './universal-cube-pools.mjs';
import {CUBES,cubeTable} from './maple-cubes.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
for(const classId of ['priest','warrior','mage','archer','rogue','pirate'])for(const level of [150,159,160,180,200])for(const boss of [false,true])for(const stars of [0,25]){
 const item={classId,level,boss,stars,slot:1,baseStats:{attack:100,stat:200,hp:1000,defense:50},lines:[{key:'hp',grade:5,value:12}]};
 const before=structuredClone(item),growth=1+stars*.055+Math.max(0,stars-15)**1.4*.025;
 const multiplier=(boss&&level===200?1.5:1)*(classId!=='priest'&&level>=160?1.2:1)*(!boss&&level===200?1.5:1);
 const hpMultiplier=classId==='priest'&&level>=160?.7:1;
 near(gearStatMultiplier(item),multiplier);near(gearHPMultiplier(item),hpMultiplier);
 const actual=gearAttributes(item);
 near(actual.attack,(100*growth+stars)*multiplier);
 near(actual.stat,(Math.floor(200*growth)+stars)*multiplier);
 near(actual.hp,(1000+stars*Math.ceil(level*.35))*multiplier*hpMultiplier);
 near(actual.defense,50*multiplier);assert.deepEqual(item,before);
 const legacy={...item};delete legacy.baseStats;
 assert.ok(Object.values(gearAttributes(legacy)).every(Number.isFinite));
}
const chance=(grade,key)=>UNIVERSAL_POOLS[grade].filter(x=>x.key===key).reduce((n,x)=>n+x.weight,0);
near(chance(3,'hp'),.1431547619047619);
near(chance(4,'hp'),.09870370370370368/2);
near(chance(5,'hp'),.12357142857142857/2);
near(chance(4,'attack'),.05);near(chance(4,'boss'),1/60);
near(chance(5,'attack'),.06);near(chance(5,'boss'),.02);
for(const grade of [1,2,3,4,5])near(UNIVERSAL_POOLS[grade].reduce((n,x)=>n+x.weight,0),1);
for(const grade of [4,5]){
 assert.deepEqual(UNIVERSAL_POOLS[grade].filter(x=>x.key==='hp').map(x=>x.value),[grade===4?9:12]);
 for(const kind of Object.keys(CUBES).filter(k=>CUBES[k].maxGrade>=grade))for(const classId of ['priest','warrior']){
  const item={classId,level:200,slot:0,grade,lines:[{key:'hp',value:12,grade:5}]},before=structuredClone(item);
  const table=cubeTable(kind,item);
  for(const row of table.rows)near(row.current.filter(x=>x.key==='hp').reduce((n,x)=>n+x.weight,0),chance(grade,'hp'));
  assert.deepEqual(item,before);
 }
}
console.log('PASS equipment scope, stacked 200 bonuses, enhanced HP, stored rolls/potentials, exact Unique+ HP chances and all cube lines.');
