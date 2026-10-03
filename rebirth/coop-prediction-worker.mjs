import {CoopPredictionCore} from './coop-prediction-core.mjs?v=worker-138';
const prediction=new CoopPredictionCore();let generation=0;
self.onmessage=({data})=>{
 try{
  let result;
  if(data.type==='reset'){generation=data.generation;result=prediction.reset(data);}
  else if(data.type==='step'&&data.generation===generation)result=prediction.step(data.tick,data.input);
  if(result)self.postMessage({type:'state',generation,sequence:data.sequence,reconciled:data.type==='reset',...result});
 }catch(error){self.postMessage({type:'failed',generation,reason:String(error?.message||error)});}
};
self.postMessage({type:'ready'});
