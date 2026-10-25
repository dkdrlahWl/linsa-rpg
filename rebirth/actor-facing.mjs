// Movement owns the walking pose, including while an automatic attack or a
// lingering skill animation is active. Combat aiming stays in the simulation.
export function actorFacing({moving,moveDir,idleDir=6,casting=false,castDir,attacking=false,attackDir,poseDir}){
 if(moving)return {dir:moveDir??idleDir,acting:false};
 return {dir:poseDir??(casting?castDir??idleDir:attacking?attackDir??idleDir:idleDir),acting:poseDir!=null||casting||attacking};
}
