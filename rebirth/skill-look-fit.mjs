// Priest paintings contain faces, bodies and feathered wings. Use one scale
// for both axes instead of deforming them into the native sheet's 3:4 cell.
// Preserve native height, vertical position and horizontal center, so this
// fixes stretching without shrinking the visible spell or moving its origin.
export function skillLookDestination(look,paint,dest){
 if(look?.classId!=='priest'||!paint.w||!paint.h||!dest[2]||!dest[3])return dest;
 const [x,y,w,h]=dest,width=paint.w*Math.abs(h)/paint.h*Math.sign(w);
 return [x+(w-width)/2,y,width,h];
}
