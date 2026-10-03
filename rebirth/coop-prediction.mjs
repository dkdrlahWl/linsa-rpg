// A versioned module graph keeps the worker independent of document import maps.
export class CoopPredictor{
 constructor({ready,state,fallback},factory){
  this.callbacks={ready,state,fallback};this.generation=0;this.sequence=0;this.pending=new Map();this.closed=false;
  try{
   const create=factory||((url)=>new Worker(url,{type:'module',name:'coop-prediction'}));
   this.worker=create(new URL('./coop-prediction-worker.mjs?v=worker-138',import.meta.url));
   this.worker.onmessage=({data})=>{
    if(this.closed)return;
    if(data.type==='ready'){clearTimeout(this.loading);this.ready=true;ready();return;}
    if(data.type==='failed'){this.fail();return;}
    if(data.type!=='state'||data.generation!==this.generation||data.sequence<=(this.applied||0))return;
    this.applied=data.sequence;for(const key of this.pending.keys())if(key<=data.sequence)this.pending.delete(key);
    state(data);
   };
   this.worker.onerror=event=>{event.preventDefault?.();this.fail();};
   this.worker.onmessageerror=()=>this.fail();
   this.loading=setTimeout(()=>this.fail(),6000);
   this.watch=setInterval(()=>{const first=this.pending.values().next().value;if(first!==undefined&&performance.now()-first>1500)this.fail();},500);
  }catch{queueMicrotask(()=>this.fail());}
 }
 send(message){
  if(this.closed||!this.ready)return;
  const sequence=++this.sequence;this.pending.set(sequence,performance.now());
  try{this.worker.postMessage({...message,generation:this.generation,sequence});}catch{this.fail();}
 }
 reset(payload){this.generation++;this.pending.clear();this.send({type:'reset',...payload});}
 step(tick,input){this.send({type:'step',tick,input});}
 fail(){if(this.closed)return;this.dispose();this.callbacks.fallback();}
 dispose(){this.closed=true;clearTimeout(this.loading);clearInterval(this.watch);this.worker?.terminate();this.pending.clear();}
}
