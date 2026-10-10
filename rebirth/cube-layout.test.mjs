import assert from 'node:assert/strict';
import {renderCubePanel,renderCubeChoice} from './cube-ui.mjs';
import {initialState,execute} from './engine.mjs';
let seed=201;const ctx={now:Date.now(),random:()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),uuid:()=>crypto.randomUUID()};
let state=initialState('warrior','화면검사',ctx);state.isAdmin=false;state.hunting=false;state.gold=10000000;
const item=state.items[0];item.potentialUnlocked=true;item.grade=3;item.lines=[{key:'STR',value:6,grade:3},{key:'attack',value:6,grade:3},{key:'hp',value:6,grade:3}];
state.materials={...state.materials,cube:20,highCube:20,primeCube:20,potentialLock:20};
for(const kind of ['cube','highCube','primeCube']){
 const html=renderCubePanel(item,state,kind,null,'',1);
 assert.ok(html.indexOf('id="cube-lock"')<html.indexOf('class="option-panel'));
 assert.ok(html.indexOf('data-action="cubeUse"')<html.indexOf('class="option-panel'));
 assert.match(html,/<option value="1"[^>]*selected/);
 assert.doesNotMatch(html,/undefined|NaN|전투력/);
}
for(const kind of ['highCube','primeCube'])for(const apply of [false,true]){
 const result=execute(state,'cube',{id:item.id,kind,lock:1},ctx).state;
 const choice=renderCubeChoice(result.items[0],result.pendingCube,result,kind);
 assert.equal((choice.match(/data-action="cubeChoose"/g)||[]).length,2);
 assert.equal((choice.match(/data-action="cubeChooseRepeat"/g)||[]).length,2);
 assert.equal((choice.match(/class="option-panel/g)||[]).length,2);
 assert.doesNotMatch(choice,/전투력|enhance-choice-actions|undefined|NaN/);
 const accepted=execute(result,'cubeChoose',{apply},ctx).state;
 assert.deepEqual(accepted.items[0].lines[1],item.lines[1]);
 const repeated=execute(accepted,'cube',{id:item.id,kind,lock:1},ctx).state;
 assert.ok(repeated.pendingCube);assert.equal(repeated.materials[kind],18);assert.equal(repeated.materials.potentialLock,18);
 const noStone=renderCubeChoice(result.items[0],result.pendingCube,{...result,materials:{...result.materials,potentialLock:0}},kind);
 assert.equal((noStone.match(/data-action="cubeChooseRepeat"[^>]*disabled/g)||[]).length,2);
}
console.log('PASS cube controls before options, preserved line lock, compact choices, keep/apply/repeat costs and disabled repeat without stones');
