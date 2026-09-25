import {initialState,makeItem,power,huntingRate} from './engine.mjs?v=journey-2';
import {TIERS,STAGES,xpNeeded,BOSSES} from './data.mjs?v=journey-2';
// Optimistic level curve: immediately available level-appropriate gear, no drop delays.
// This deliberately reports a lower bound, not a measured player completion time.
const ctx={now:0,uuid:()=>crypto.randomUUID()};
let total=0;const milestones=[];
for(let level=1;level<200;level++){
 let s=initialState('rogue','모험가',ctx);s.level=level;s.stats.LUK=4+(level-1)*5;
 const tier=TIERS.filter(t=>t<=level).at(-1),r=Math.min(9,Math.floor(level/20));
 s.items=Array.from({length:9},(_,slot)=>({...makeItem(tier,'rogue',slot,true,ctx),stars:Math.min(15,3+r),lines:[{key:'LUK',value:3}]}));s.equipped=Object.fromEntries(s.items.map(i=>[i.slot,i.id]));
 const p=power(s);const candidates=STAGES.filter(st=>st.level<=level&&st.star<=p.stars);
 let best;for(const st of candidates){s.stage=st.id;const rate=huntingRate(s);if(!best||rate.xp/rate.seconds>best.xp/best.seconds)best={...rate,id:st.id};}
 total+=xpNeeded(level)/(best.xp/best.seconds);
 if([19,39,59,79,99,119,139,159,179,199].includes(level))milestones.push({level:level+1,days12h:Number((total/43200).toFixed(2)),stage:best.id});
}
console.log(JSON.stringify({assumptions:'Ideal immediate equipment, 12 credited hours/day, no boss or farming delays',milestones,idealDays24h:Number((total/86400).toFixed(2))},null,2));
