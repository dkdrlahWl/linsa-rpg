import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {renderCubePanel} from './cube-ui.mjs';
let seed=202;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),ctx={now:0,random,uuid:()=>crypto.randomUUID()};
for(const level of [190,200,210,300])for(const roll of [.299999,.3,.999]){
 const s=initialState('mage','해금검사',ctx);s.hunting=false;s.items[0].level=level;s.items[0].lines=[];s.items[0].potentialUnlocked=false;s.materials.scroll=5;
 let first=true;const r=execute(s,'potential',{id:s.items[0].id},{...ctx,random:()=>first?(first=false,roll):random()});
 const success=level<200||roll<.3;assert.equal(r.state.items[0].lines.length,success?3:0);assert.equal(r.state.items[0].potentialUnlocked,success);assert.equal(r.state.materials.scroll,4);assert.equal(r.events.find(e=>e.type==='potential').success,success);
 assert.match(renderCubePanel(s.items[0],s,'cube',null),level>=200?/성공 30%/:/성공 100%/);
}
for(const kind of ['highCube','primeCube']){
 let s=initialState('mage','재선택검사',ctx);s.hunting=false;s.items[0].grade=2;s.items[0].potentialUnlocked=true;s.items[0].lines=[{key:'INT',value:3,grade:2},{key:'hp',value:3,grade:2},{key:'attack',value:3,grade:2}];s.materials[kind]=25;
 for(let i=0;i<20;i++){const r=execute(s,'cube',{id:s.items[0].id,kind},ctx);assert.ok(r.state.pendingCube.grade>=3);s=execute(r.state,'cubeChoose',{apply:false},ctx).state;assert.equal(s.items[0].grade,2);}
 assert.equal(s.materials[kind],5);
 assert.throws(()=>execute(s,'cube',{id:s.items[0].id,kind,lock:0},ctx),/POTENTIAL_LOCK_EPIC_REQUIRED/);
}
console.log('PASS 200+ 30% unlock boundary, scroll consumption on failure, lower-level 100%, repeated rare keep with black/prime minimum epic');
