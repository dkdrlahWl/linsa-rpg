// A shared symbol keeps the live renderer independent of temporary atlas canvas
// identities and duplicate module instances after a cache/version transition.
export const SKILL_LOOK_SOURCE=Symbol.for('rebirth.skillLook.paintedSource');
export function drawSkillLookSource(g,tier,part,dest){
 const paint=g[SKILL_LOOK_SOURCE]?.(tier,part);
 if(!paint)return false;
 g.drawImage(paint.image,paint.x,paint.y,paint.w,paint.h,...dest);return true;
}
