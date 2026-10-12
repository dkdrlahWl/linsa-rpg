import assert from 'node:assert/strict';
const {CoopPredictor}=await import(process.env.PREDICTOR_MODULE||'./coop-prediction.mjs');
// A slow phone finishes a replay every 500ms while snapshots arrive every 250ms.
// Exercise the real bridge, not just the combat model in a synchronous loop.
const sent=[],shown=[];
const worker={postMessage:m=>sent.push(m),terminate(){}};
const bridge=new CoopPredictor({ready(){},state:p=>shown.push(p),fallback(){assert.fail('bounded load must not disable prediction');}},()=>worker);
const room=tick=>({id:'soak',mode:'citadel',floor:1,status:'fighting',entryWaiting:false,tick});
worker.onmessage({data:{type:'ready'}});
bridge.reset({room:room(0),target:0});
try{
 for(let i=1;i<=1200;i++){
  bridge.step(i*5-4,[1,0,1]);bridge.reset({room:room(i*5-2),target:i*5-2});
  bridge.step(i*5-1,[1,0,64]);bridge.reset({room:room(i*5),target:i*5});
  const packet=sent.at(-1);
  worker.onmessage({data:{type:'state',sequence:packet.sequence,generation:packet.generation,world:packet.room,reconciled:true}});
  assert.ok(bridge.pending.size<=1);assert.ok(bridge.queued.length<=1);
 }
 assert.equal(shown.length,1200,'every completed compatible replay must be displayed, even when a newer reset is queued');
 const old=sent.at(-1),before=shown.length;
 bridge.reset({room:{...room(6001),floor:2},target:6001,forceCurrent:true});
 worker.onmessage({data:{type:'state',sequence:old.sequence,generation:old.generation,world:old.room}});
 assert.equal(shown.length,before,'old floor/resync cannot reappear');
 const current=sent.at(-1);
 worker.onmessage({data:{type:'state',sequence:current.sequence,generation:current.generation,world:current.room}});
 assert.equal(shown.length,before+1);
 console.log('PASS slow-worker storm: 2400 snapshots, 2400 inputs, 1200 completions; progress, bounded queue and hard-resync isolation');
}finally{bridge.dispose();}
