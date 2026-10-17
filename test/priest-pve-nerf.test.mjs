import assert from 'node:assert/strict';
import {beginPriest,stepPriest,supportTick,holyDamage,absorbDamage} from '../rebirth/priest.mjs';
import {arenaAbsorbDamage} from '../rebirth/arena-balance.mjs';

// Priest remake: no max-HP damage; skills carry the priest's lower damage (basic attack/power are standard).
const totalHpRatios=[0,0,0,0,0,0];
const attackTotals=[0,1.08,3.35,8.15,8.5,20.6];
const near=(actual,expected)=>assert(Math.abs(actual-expected)<1e-8,`${actual} != ${expected}`);
for(const hp of [1000,100000])for(let slot=1;slot<=5;slot++){
 const a={id:'caster',classId:'priest',x:0,y:0,hp:1,advancement:4,power:{hp,attack:100,level:200,firstJob:true,advancement:4}};
 const ally={id:'ally',classId:'warrior',x:100,y:0,hp:1,power:{hp}};
 assert(beginPriest(a,{x:100,y:0},0,slot));
 let flat=0,attack=0,total=0;
 for(let tick=0;tick<80;tick++){
  supportTick([a,ally],tick);
  stepPriest(a,[{x:100,y:0}],tick,slot,scale=>{flat+=a.holyFlatDamage;attack+=scale;total+=holyDamage(a,100*scale,tick);});
  supportTick([a,ally],tick);
 }
 near(flat,hp*totalHpRatios[slot]);near(attack,attackTotals[slot]);
 assert(total>=flat+100*attackTotals[slot]-1e-8);
 if(slot===2){near(a.hp,1+.15*hp);near(ally.hp,a.hp);}
 if(slot===3){near(a.shield,.2*hp);near(ally.shield,a.shield);}
 if(slot===4){near(a.hp,1+.24*hp);near(ally.hp,a.hp);}
 if(slot===5){near(a.hp,hp);near(ally.hp,hp);}
}
// Shared shields protect both the caster and allies, including the breaking hit.
for(const classId of ['priest','warrior']){
 const a={classId,shield:300,shieldPermanent:true};
 near(absorbDamage(a,100,1),0);near(a.shield,210);
 near(absorbDamage(a,300,2),60);near(a.shield,0);
 near(absorbDamage(a,100,3),100);
}
// Preserve the established arena rule: priest shields give no damage reduction.
const arena={classId:'priest',shield:300,shieldPermanent:true};
near(arenaAbsorbDamage(arena,100,1),0);near(arena.shield,200);
// Sanctuary shields stack only up to 40% of each receiver's own max HP.
{
 const a={id:'caster',classId:'priest',x:0,y:0,hp:1000,advancement:4,power:{hp:1000,attack:100,level:200,firstJob:true,advancement:4}};
 const ally={id:'ally',classId:'warrior',x:100,y:0,hp:3000,power:{hp:3000}};
 for(let cast=0;cast<4;cast++){a.thirdReady=0;assert(beginPriest(a,{x:100,y:0},cast*300,3));for(let t=cast*300;t<cast*300+20;t++){supportTick([a,ally],t);stepPriest(a,[{x:100,y:0}],t,3,()=>{});supportTick([a,ally],t);}}
 near(a.shield,400);near(ally.shield,1200);
}
console.log('PASS all five skill rotations, no HP damage, attack coefficients, ally-HP based support, caster/ally support, 10% shield mitigation and existing arena shield rule.');
