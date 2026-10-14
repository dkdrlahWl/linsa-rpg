// coop-wire: diff/patch round trips through JSON for random documents (incl. undefined keys,
// keyed arrays, marker-looking keys) and the client cache path round-trips a citadel view.
import assert from 'node:assert/strict';
import {diff,patch,encodeCoopView,decodeCoopReply,coopWireArgs,resetCoopWireCache} from './coop-wire.mjs';
import {startCoop,advanceCoop,coopClientView} from './coop-model.mjs';
let seed=7;const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const gen=d=>{const r=rnd();if(d>3||r<.3)return r<.05?null:r<.08?undefined:r<.18?'s'+Math.floor(rnd()*3):r<.2?Infinity:Math.floor(rnd()*4)/2;if(r<.6){const n=Math.floor(rnd()*4),o={};for(let i=0;i<n;i++)o[['k0','k1','$o','$n','$=','id'][Math.floor(rnd()*6)]]=gen(d+1);return o;}if(r<.8)return Array.from({length:Math.floor(rnd()*4)},()=>gen(d+1));return [...new Set(Array.from({length:1+Math.floor(rnd()*4)},()=>Math.floor(rnd()*6)))].map(id=>({id,v:gen(d+1)}));};
const mut=(v,d=0)=>{if(rnd()<.3)return gen(d);if(Array.isArray(v))return v.filter(()=>rnd()<.85).map(e=>mut(e,d+1)).concat(rnd()<.2?[gen(d+1)]:[]);if(v&&typeof v==='object'){const o={};for(const k of Object.keys(v))if(rnd()<.9)o[k]=rnd()<.5?v[k]:mut(v[k],d+1);if(rnd()<.2)o['n'+Math.floor(rnd()*3)]=gen(d+1);return o;}return v;};
const j=v=>JSON.parse(JSON.stringify(v));
for(let i=0;i<30000;i++){const a=j({r:gen(0)}),b={r:mut(a.r)};const d=j(diff(a,b));for(const clone of [undefined,false])assert.deepEqual(patch(j(a),d,clone),j(b),JSON.stringify({a,b,d}));}
// Citadel view: full reply fills the cache, cached reply rebuilds the identical room.
const power={attack:3e5,hp:4e6,defense:5e4,boss:1,crit:.3,critDamage:1.6,cadence:1,firstJob:true,advancement:4,level:200};
let w=startCoop({id:'r',owner:'p0',mode:'citadel',tier:0,status:'waiting',members:['warrior','mage','archer','priest'].map((classId,i)=>({id:'p'+i,name:'P'+i,classId,advanced:true,power:{...power}}))},0);
w.entryWaiting=false;for(const m of w.members)m.entryMoved=true;
resetCoopWireCache();let hits=0;
for(let t=1;t<=120;t++){
 const frames=[0,1,2,3].map(p=>({user:'p'+p,tick:Math.max(0,t-4),input:[Math.sin(t/9+p),.4,t%5?1:122]}));
 w=j(advanceCoop({...w,_queuedInputs:frames},'p0',{frames:[]},t*100));
 const view=j(coopClientView({...w,me:'p0'},2)),sent=j(encodeCoopView(coopClientView({...w,me:'p0'},2),coopWireArgs()));
 if(sent.$cached)hits++;
 assert.deepEqual(decodeCoopReply(sent),view);
}
assert.ok(hits>=100,'cache reused '+hits);
assert.equal(encodeCoopView({a:1},{}).wire,undefined,'opt-in only');
assert.deepEqual(decodeCoopReply({a:1}),{a:1},'old edge replies pass through');
resetCoopWireCache();assert.throws(()=>decodeCoopReply({wire:2,$cached:1,staticSig:'x'}),/COOP_WIRE_CACHE_MISS/);
console.log('PASS coop-wire round trips',{cacheHits:hits});
