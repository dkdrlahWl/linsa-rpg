import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {equipmentIdentity,designItem,equipmentKey} from './equipment.mjs';
const classes=['warrior','mage','archer','rogue','pirate','priest'];
const sets=['afterglow','twilight','finality'],names=['잔광의','황혼의','종언의'];
const paths=new Set();
for(let tier=0;tier<3;tier++)for(let slot=1;slot<=8;slot++){
 const items=classes.map(classId=>({...designItem(200,classId,slot,true,2,tier),stars:25,grade:5,baseStats:{hp:3000,attack:400,stat:420,defense:160}}));
 const before=structuredClone(items);
 for(const item of items){
  const art=equipmentIdentity(item);assert.equal(art.standalone,true);assert.equal(art.columns,1);assert.equal(art.rows,1);
  assert.equal(art.art,`equipment/boss200/${sets[tier]}-${slot}.svg`);
  assert.ok(art.name.startsWith(names[tier]));assert.equal(art.tier,tier);
  assert.equal(art.key,equipmentKey(item));
 }
 assert.deepEqual(items,before,'artwork lookup cannot change stored equipment');
 const path=equipmentIdentity(items[0]).art;paths.add(path);
 if(process.argv.includes('--assets')){
  assert.ok(existsSync(new URL(path,import.meta.url)),path);
  const svg=readFileSync(new URL(path,import.meta.url),'utf8');
  assert.match(svg,/viewBox="0 0 256 256"/);assert.match(svg,/x="16" y="16" width="224" height="224"/);
  assert.match(svg,/data:image\/webp;base64,/);assert.match(svg,/preserveAspectRatio="xMidYMid meet"/);
 }
}
assert.equal(paths.size,24);
for(const c of classes)for(let tier=0;tier<5;tier++){
 assert.equal(equipmentIdentity(designItem(200,c,0,true,2,tier)).art,`equipment/reforged/200-t${tier}-${c}-0.svg`,'all five weapon tiers keep existing art');
}
for(const it of [designItem(200,'mage',1,false),designItem(190,'priest',1,true)])assert.ok(!equipmentIdentity(it).art.includes('/boss200/'));
assert.ok(equipmentIdentity({level:200,boss:true,classId:'warrior',slot:1,design:2}).art.includes('/afterglow-'),'legacy tier zero keeps its matching set');
console.log('PASS 24 unique padded images, existing 3 tiers and 6-job common sets, stored items and all five weapon tiers unchanged');
