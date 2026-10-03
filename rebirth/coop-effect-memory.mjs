const key=e=>[e.owner||'',e.kind,e.id,e.start,e.slot??'',e.pulse??''].join(':');
// Retain a short effect created between worker snapshots; never restart a
// lasting sanctuary or replay a skill that the player has already seen.
export class CoopEffectMemory{
 constructor(since=0){this.since=since;this.seen=new Map();this.pending=new Map();}
 remember(journal,time){
  for(const e of journal||[]){
   const id=key(e);if(this.seen.has(id))continue;this.seen.set(id,Math.max(time,e.end));
   if(e.start<this.since)continue;
   if(e.end>time){this.pending.set(id,{...e});continue;}
   if(e.kind==='fifth-field'||(e.kind==='priest'&&e.slot===5))continue;
   const shift=time-e.start,copy={...e};
   for(const field of ['start','end','impact','at'])if(Number.isFinite(copy[field]))copy[field]+=shift;
   this.pending.set(id,copy);
  }
 }
 compose(effects,time){
  const active=new Set();
  for(const e of effects){const id=key(e);active.add(id);this.seen.set(id,Math.max(time,e.end));}
  const extra=[];
  for(const [id,e] of this.pending){if(e.end<=time)this.pending.delete(id);else if(!active.has(id))extra.push(e);}
  for(const [id,end] of this.seen)if(end<time-100)this.seen.delete(id);
  return extra.length?[...effects,...extra]:effects;
 }
}
