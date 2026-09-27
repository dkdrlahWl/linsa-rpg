import {scheduleCombatSkill,stepCombatSkills,SECOND_SKILLS} from './combat-skills.mjs?v=skill-sequence-21';
import {drawSecondSequence} from './second-effects.mjs?v=skill-sequence-21';
let atlas;
// The compact boss screen uses the same VFX timeline as movement battles.
export function playSecondOverlay(arena,classId){
 atlas||=Object.assign(new Image(),{src:new URL('./tower/second-sequence-atlas-v1.png',import.meta.url).href});
 const canvas=document.createElement('canvas');canvas.width=800;canvas.height=700;canvas.className='skill-sequence-overlay';canvas.setAttribute('aria-hidden','true');arena.append(canvas);
 const g=canvas.getContext('2d'),a={classId,x:250,y:490},target={x:425,y:235},effects=[],started=performance.now();scheduleCombatSkill(a,target,0,2);
 let tick=-1;
 const frame=now=>{const time=(now-started)/100;if(!canvas.isConnected||time>SECOND_SKILLS[classId].seconds*10+12){canvas.remove();return;}while(tick<Math.floor(time))stepCombatSkills(a,[target],++tick,()=>{},e=>effects.push(e));g.clearRect(0,0,800,700);for(const e of effects)if(time>=e.start&&time<e.end)drawSecondSequence(g,e,time,atlas);requestAnimationFrame(frame);};requestAnimationFrame(frame);
}
