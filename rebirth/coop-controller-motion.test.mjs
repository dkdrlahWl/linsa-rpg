import assert from 'node:assert/strict';
import {CoopController} from './coop-client.mjs';
import {CoopMotion} from './coop-motion.mjs';
import {TowerInput} from './tower-input.mjs';
import {startCoop} from './coop-model.mjs';
globalThis.document={hidden:false,querySelector:()=>null};
globalThis.requestAnimationFrame=()=>0;
globalThis.Image=class {complete=false;naturalWidth=0;decode(){return Promise.reject(new Error('headless'));}};
const power={attack:1,hp:10000,defense:20,boss:1,crit:0,critDamage:1,cadence:1,firstJob:false};
for(const mode of ['rift','wave']){
 const world=startCoop({id:mode,me:'me',tier:0,mode,status:'waiting',members:[{id:'me',classId:'warrior',power},{id:'other',classId:'warrior',power}]},0);
 const nodes=new Map(),host={querySelector:s=>{if(!nodes.has(s))nodes.set(s,{style:{},dataset:{},classList:{toggle(){}},textContent:'',innerHTML:''});return nodes.get(s);},querySelectorAll:()=>[]};
 const controller=Object.assign(Object.create(CoopController.prototype),{host,room:world,predicted:structuredClone(world),frames:[],keys:new Set(),pointers:new Map(),stick:{x:0,y:0},motion:new CoopMotion(),sampler:new TowerInput(100),hint:{},received:performance.now(),renderer:{draw(b){controller.rendered=b;}}});
 controller.accept(world);let now=performance.now();controller.lastDraw=now;controller.draw(now);
 const before=controller.rendered,corrected=structuredClone(world);corrected.tick=1;
 for(const m of corrected.members){m.x+=400;m.y-=200;}corrected.enemy.x+=500;
 for(const m of corrected.monsters||[])m.x=Math.min(3080,m.x+600);
 controller.accept(corrected);controller.lastDraw=now;controller.draw(now);
 const after=controller.rendered;
 assert.equal(after.player.x,before.player.x,mode+' local');
 assert.equal(after.allies[0].x,before.allies[0].x,mode+' remote');
 if(mode==='wave')for(let i=0;i<after.monsters.length;i++)assert.equal(after.monsters[i].x,before.monsters[i].x,'wave monster '+i);
 else assert.equal(after.enemy.x,before.enemy.x,'rift boss');
}
console.log('PASS real controller accept/draw preserves local, remote, boss and wave-monster positions across corrected responses');
