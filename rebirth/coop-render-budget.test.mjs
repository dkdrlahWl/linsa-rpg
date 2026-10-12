import assert from 'node:assert/strict';
import {TowerRenderer} from './tower-renderer.mjs';
globalThis.matchMedia=()=>({matches:true});globalThis.devicePixelRatio=3;
globalThis.ResizeObserver=class{observe(){}disconnect(){}};
for(const pixelRatio of [1.25,2]){
 const canvas={width:0,height:0,getContext:()=>({})},r=new TowerRenderer(canvas,{pixelRatio});
 r.fit({width:400,height:600});
 assert.equal(canvas.width,400*pixelRatio,'mobile must respect the multiplayer pixel budget');
 const before=canvas.width;r.setLowDetail();assert.ok(canvas.width<=before,'adaptive mode must never raise resolution');
 r.dispose();
}
console.log('PASS mobile multiplayer resolution caps and monotonic adaptive budget');
