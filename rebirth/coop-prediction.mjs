// A versioned module graph keeps the worker independent of document import maps.
export class CoopPredictor{
 constructor({ready,state,fallback},factory){
  this.callbacks={ready,state,fallback};this.generation=0;this.sequence=0;this.pending=new Map();this.queued=[];this.closed=false;
  try{
   const create=factory||((url)=>new Worker(url,{type:'module',name:'coop-prediction'}));
   this.worker=create(new URL('./coop-prediction-worker.mjs?v=raid-200-166',import.meta.url));
   this.worker.onmessage=({data})=>{
    if(this.closed)return;
    if(data.type==='ready'){clearTimeout(this.loading);this.ready=true;ready();return;}
    if(data.type==='failed'){this.fail();return;}
    if(data.type!=='state')return;
    for(const key of this.pending.keys())if(key<=data.sequence)this.pending.delete(key);
    if(data.generation===this.generation&&data.sequence>(this.applied||0)){this.applied=data.sequence;state(data);}
    this.pump();
   };
   this.worker.onerror=event=>{event.preventDefault?.();this.fail();};
   this.worker.onmessageerror=()=>this.fail();
   this.loading=setTimeout(()=>this.fail(),6000);
   this.watch=setInterval(()=>{
    if(globalThis.document?.hidden){for(const key of this.pending.keys())this.pending.set(key,performance.now());return;}
    const first=this.pending.values().next().value;if(first!==undefined&&performance.now()-first>8000)this.fail();
   },500);
  }catch{queueMicrotask(()=>this.fail());}
 }
 send(message){
  if(this.closed||!this.ready)return;
  this.queued.push({...message,generation:this.generation});this.pump();
 }
 pump(){
  if(this.closed||this.pending.size||!this.queued.length)return;
  let message=this.queued.shift();
  // One in-flight message bounds structured-clone work and lets a newer
  // authoritative reset replace obsolete queued replays.
  if(message.type==='step'){
   const frames=[{tick:message.tick,input:message.input}];
   while(this.queued[0]?.type==='step'&&this.queued[0].generation===message.generation){const next=this.queued.shift();frames.push({tick:next.tick,input:next.input});}
   message={type:'steps',frames,generation:message.generation};
  }
  const sequence=++this.sequence;this.pending.set(sequence,performance.now());
  try{this.worker.postMessage({...message,sequence});}catch{this.fail();}
 }
 reset(payload){this.generation++;this.queued=[];this.send({type:'reset',...payload});}
 step(tick,input){if(this.queued.length>=40){this.fail();return;}this.send({type:'step',tick,input});}
 fail(){if(this.closed)return;this.dispose();this.callbacks.fallback();}
 dispose(){this.closed=true;clearTimeout(this.loading);clearInterval(this.watch);this.worker?.terminate();this.pending.clear();this.queued=[];}
}
