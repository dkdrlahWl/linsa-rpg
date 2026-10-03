import layouts from './costume-motion-layout.mjs?v=costume-motion-111';

// Canvas facing: E, SE, S, SW, W, NW, N, NE. Left views mirror right views.
export function costumeMotionFrame(classId,dir,moving,acting,age=0,walk=0,costumeKey=null){
 const layout=layouts[costumeKey]||layouts[classId];if(!layout)return null;
 const facing=Number.isInteger(dir)&&dir>=0&&dir<8?dir:6;
 const direction=[2,1,0,1,2,3,4,3][facing];
 // The priest sheet combines diagonal-front and side attacks into one row.
 const attackRow=classId==='priest'?[5,6,6,7,8][direction]:direction+5;
 const row=acting?attackRow:direction;
 const phase=acting?Math.min(7,Math.max(0,Math.floor((Number(age)||0)*9))):moving?((Math.floor((Number(walk)||0)*1.05)%8)+8)%8:0;
 // Keep the warrior facing the target through the whole swing; a few painted
 // cells in the side-attack row turn their back to the target.
 let cell=phase;
 if(acting&&classId==='warrior'&&direction===2)cell=[0,0,0,7,7,7,0,0][phase];
 if(acting&&classId==='warrior'&&direction===1&&phase===4)cell=3;
 return {layout,frame:layout.frames[row*8+cell],row,phase,flip:[3,4,5].includes(facing)?-1:1};
}

// Atlas poses were painted at slightly different body sizes. Match each pose
// to the standing size while retaining an intentional costume size override.
export function costumeMotionScale(pose,bodySize,renderBodyHeight){
 const reference=renderBodyHeight||pose.layout.bodyHeight;
 const frameBody=pose.frame.body>0?pose.frame.body:pose.layout.bodyHeight;
 return bodySize/reference*pose.layout.bodyHeight/frameBody;
}
