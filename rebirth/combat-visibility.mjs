// Presentation only: never mutate the shared simulation or remove damage/healing.
export function localSkillView(b){
 if(!b.localSkillsOnly)return b;
 const me=b.actorId??b.id;
 return {...b,effects:(b.effects||[]).filter(e=>e.hostile||!e.owner||e.owner===me)};
}
export function ownPriestAura(actor,time){
 const slots=new Set((actor.holyAreas||[]).filter(a=>a.start<=time&&a.end>time).map(a=>a.slot));
 return {...actor,shield:actor.shieldOwner===actor.id?actor.shield:0,purifiedUntil:slots.has(2)?actor.purifiedUntil:0,holyAttackUntil:slots.has(4)?actor.holyAttackUntil:0,holyReductionUntil:slots.has(5)?actor.holyReductionUntil:0};
}
