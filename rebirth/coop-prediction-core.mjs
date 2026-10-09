import {predictCoopStep,indexCoopFrames} from './worker-sim/coop-model.mjs?v=exploration-190';
export const effectKey=e=>[e.owner||'',e.kind,e.id,e.start,e.slot??'',e.pulse??''].join(':');
const positions=w=>({enemy:{...w.enemy},members:w.members.map(m=>({id:m.id,x:m.x,y:m.y})),monsters:(w.monsters||[]).map(m=>({id:m.id,x:m.x,y:m.y}))});
export class CoopPredictionCore{
 reset({room,frames=[],target=room.tick,forceCurrent=false}){
  this.user=room.me;const base=!forceCurrent&&room.predictionBase||room;
  this.world=structuredClone(base);delete this.world.predictionBase;delete this.world.predictionInputs;
  if(room.protocol===2&&base!==room)for(const actor of this.world.members){
   const current=room.members.find(m=>m.id===actor.id);
   if(current)for(const key of ['power','name','classId','advanced'])actor[key]=structuredClone(current[key]);
  }
  this.remote=indexCoopFrames(room.predictionInputs||[]);
  this.frames=new Map(frames.map(f=>[f.tick,f.input]));this.journal=new Map();this.previous=positions(this.world);this.capture();
  while(this.world.tick<target&&this.world.status==='fighting'&&!this.world.entryWaiting){
   const tick=this.world.tick,input=this.frames.get(tick)||this.world.members.find(m=>m.id===this.user)?.input||[0,0,0];
   this.advance(input);if(this.world.tick<=tick)break;
  }
  return this.result();
 }
 capture(){
  for(const e of this.world.effects||[])if(!e.owner||e.owner===this.user||e.hostile){
   const key=effectKey(e);if(!this.journal.has(key))this.journal.set(key,structuredClone(e));
  }
 }
 advance(input){
  this.previous=positions(this.world);
  this.world=predictCoopStep(this.world,this.user,input,true,this.remote.get(this.world.tick)||[]);
  this.capture();
 }
 step(tick,input){
  if(!this.world)return null;
  this.journal=new Map();
  if(this.world.status==='fighting'&&!this.world.entryWaiting){
   if(tick<this.world.tick)return this.result();
   // Messages are ordered. A gap can only follow a rebase: replay retained input.
   while(this.world.tick<tick&&this.world.status==='fighting'){
    const before=this.world.tick;this.advance(this.frames.get(before)||this.world.members.find(m=>m.id===this.user)?.input||[0,0,0]);
    if(this.world.tick<=before)break;
   }
   this.frames.set(tick,input);
  }
  this.advance(input);
  for(const key of this.frames.keys())if(key<this.world.tick-40)this.frames.delete(key);
  for(const key of this.remote.keys())if(key<this.world.tick-40)this.remote.delete(key);
  return this.result();
 }
 result(){return {world:this.world,previous:this.previous,journal:[...this.journal.values()]};}
}
