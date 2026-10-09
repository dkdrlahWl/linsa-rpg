import {CoopPredictionCore,effectKey} from './coop-prediction-core.mjs?v=exploration-dungeon-192';
const prediction=new CoopPredictionCore();let generation=0;
self.onmessage=({data})=>{
 try{
  let result;
  if(data.type==='reset'){generation=data.generation;result=prediction.reset(data);}
  else if(data.type==='step'&&data.generation===generation)result=prediction.step(data.tick,data.input);
  else if(data.type==='steps'&&data.generation===generation){
   const journal=new Map();
   for(const frame of data.frames){result=prediction.step(frame.tick,frame.input);for(const e of result?.journal||[])journal.set(effectKey(e),e);}
   if(result)result={...result,journal:[...journal.values()]};
  }
  if(result)self.postMessage({type:'state',generation,sequence:data.sequence,reconciled:data.type==='reset',...result});
 }catch(error){self.postMessage({type:'failed',generation,reason:String(error?.message||error)});}
};
self.postMessage({type:'ready'});
