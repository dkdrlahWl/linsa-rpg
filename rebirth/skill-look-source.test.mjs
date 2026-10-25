import assert from 'node:assert/strict';
import {SKILL_LOOK_SOURCE,drawSkillLookSource} from './skill-look-source.mjs';
import {prepareSkillLookArt,skillLookContext} from './skill-look-material.mjs';
import {skillLookById} from './skill-looks.mjs';
import {skillLookSourceAngle} from './skill-look-orientation.mjs';
globalThis.Image=class{complete=true;naturalWidth=1536;naturalHeight=1920;decode(){return Promise.resolve();}};
const dest=[-400,-220,800,440];
for(const id of ['peacock-plume','sakura-breeze','starlit-deer']){
 await prepareSkillLookArt(id);const calls=[],g={drawImage:(...args)=>calls.push(args)};
 const ctx=skillLookContext(g,skillLookById(id),{kind:'fifth-field',classId:'archer'});
 assert.equal(typeof ctx[Symbol.for('rebirth.skillLook.paintedSource')],'function');
 assert.equal(drawSkillLookSource(ctx,5,0,dest),true,'live bow drawing must select equipped artwork even without a registered native canvas');
 assert.equal(calls.length,1);assert.deepEqual(calls[0].slice(5),dest);
 assert.equal(Boolean(skillLookSourceAngle(id,5,0)),id!=='sakura-breeze');
}
assert.equal(drawSkillLookSource({drawImage(){throw Error('should use original bow');}},5,0,dest),false);
assert.equal(SKILL_LOOK_SOURCE,Symbol.for('rebirth.skillLook.paintedSource'));
console.log('PASS live celestial bow source selection for all three archer looks without WeakMap registration; original fallback and destination preserved');
