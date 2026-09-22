import test from 'node:test';
import assert from 'node:assert/strict';
import {TowerInput,projectPlayer,stickVector} from './tower-input.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
import {TowerController} from './tower-controller.mjs';
const battle=()=>newTowerBattle(1,'warrior',{attack:240,hp:4000,defense:100,boss:1,crit:0,critDamage:1.6,cadence:1},0,'test',1);
test('movement distance is independent of 30 / 60 / 144 Hz rendering',()=>{
 for(const hz of [30,60,144]){const b=battle(),q=new TowerInput();for(let i=0;i<hz;i++)q.advance(1000/hz,[1,0,0],f=>towerStep(b,f));assert.equal(b.tick,10);assert.ok(Math.abs(b.player.x-750)<1e-6);}
});
test('every display frame moves, including before the first server tick',()=>{
 const b=battle(),q=new TowerInput();let last=b.player.x;
 for(let i=0;i<60;i++){q.advance(1000/60,[1,0,0],f=>towerStep(b,f));const p=projectPlayer(b,q);assert.ok(Math.abs(p.x-last-250/60)<1e-5);last=p.x;}
});
test('a 15 ms tap is preserved in its input packet',()=>{
 const q=new TowerInput(),frames=[];q.advance(20,[0,0,0],f=>frames.push(f));q.press(4);q.advance(15,[0,0,4],f=>frames.push(f));q.advance(65,[0,0,0],f=>frames.push(f));
 assert.equal(frames.length,1);assert.equal(frames[0][2],4);q.advance(100,[0,0,0],f=>frames.push(f));assert.equal(frames[1][2],0);
});
test('stop and direction changes preserve partial movement without drift',()=>{
 const b=battle(),q=new TowerInput();q.advance(30,[1,0,0],f=>towerStep(b,f));assert.equal(projectPlayer(b,q).x,507.5);
 q.advance(30,[0,0,0],f=>towerStep(b,f));assert.equal(projectPlayer(b,q).x,507.5);
 q.advance(40,[-1,0,0],f=>towerStep(b,f));assert.equal(b.player.x,497.5);
});
test('joystick neutral area suppresses drift and clamps diagonals',()=>{
 assert.deepEqual(stickVector(.06,.04),{x:0,y:0});const v=stickVector(1,1);assert.ok(Math.abs(Math.hypot(v.x,v.y)-1)<1e-9);
});
test('dash projection meets the deterministic result at a tick boundary',()=>{
 const b=battle(),q=new TowerInput();q.press(4);q.advance(99,[1,0,4],f=>towerStep(b,f));assert.ok(Math.abs(projectPlayer(b,q).x-574.25)<1e-6);
 q.advance(1,[1,0,4],f=>towerStep(b,f));assert.equal(b.player.x,575);assert.equal(projectPlayer(b,q).x,575);
});
test('network acknowledgement replays remaining frames without a position jump',()=>{
 const b=battle(),frames=Array.from({length:10},()=>[1,0,0]),server=structuredClone(b),predicted=structuredClone(b);
 frames.forEach(f=>towerStep(predicted,f));frames.slice(0,6).forEach(f=>towerStep(server,f));
 const controller={b:predicted,frames:[...frames],serverTick:0,sampler:new TowerInput(),correction:{x:0,y:0}};
 TowerController.prototype.accept.call(controller,server);assert.equal(controller.b.player.x,predicted.player.x);assert.equal(controller.frames.length,4);assert.equal(controller.correction.x,0);
 TowerController.prototype.accept.call(controller,b);assert.equal(controller.serverTick,6);
});
test('packet buffer remains bounded during an outage',()=>{
 const q=new TowerInput(),frames=[];for(let i=0;i<100;i++)q.advance(100,[1,0,1],f=>frames.push(f),()=>frames.length<25);
 assert.equal(frames.length,25);assert.equal(q.elapsed,0);
});
