import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildCitadelLayer} from './citadel-renderer.mjs';
import {makeCitadelDungeon} from './citadel-zero.mjs';
// Record real generated pixels and all decoration commands. Canvas raster/GPU
// cost is deliberately excluded; this verifies that yielding loses no artwork.
const hash=data=>createHash('sha256').update(data).digest('hex');
globalThis.document={createElement:()=>{
 const canvas={commands:[]};let gradient=0;
 const record=(key,args)=>canvas.commands.push([key,...args.map(v=>v?.commands?hash(v.pixels):v)]);
 const ctx=new Proxy({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData:image=>{canvas.pixels=image.data;},
  createRadialGradient:(...args)=>{const id=++gradient;record('gradient',[id,...args]);return {id,addColorStop:(...stops)=>record('stop',[id,...stops])};},
 },{get:(o,key)=>o[key]??((...args)=>record(key,args)),set:(o,key,value)=>{record(key,[value?.id??value]);o[key]=value;return true;}});
 canvas.getContext=()=>ctx;return canvas;
}};
let slices=0,maxSlice=0;
for(const floor of [1,3,7,10,13,17,21]){
 const d=makeCitadelDungeon(floor,77),whole=buildCitadelLayer(d,floor);
 whole.step(Infinity);assert.ok(whole.done);
 const expectedPixels=hash(whole.canvas.pixels),expectedCommands=hash(JSON.stringify(whole.canvas.commands));
 const split=buildCitadelLayer(d,floor);let count=0;
 while(!split.done){const start=performance.now();split.step(2);maxSlice=Math.max(maxSlice,performance.now()-start);count++;assert.ok(count<10000);}
 assert.ok(count>1);slices+=count;
 assert.equal(hash(split.canvas.pixels),expectedPixels,'same terrain '+floor);
 assert.equal(hash(JSON.stringify(split.canvas.commands)),expectedCommands,'same trees, props, glows and drawing state '+floor);
}
console.log('PASS incremental terrain and decoration equality, seven regions',{slices,maxCpuSliceMs:maxSlice.toFixed(2)});
