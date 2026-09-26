import assert from 'node:assert/strict';
import {BattleAudioTracker,eventAudio,AUDIO_IDS} from './game-audio.mjs';
assert.equal(AUDIO_IDS.size,52);
for(const cls of ['warrior','mage','archer','rogue','pirate']){
 const ids=[],t=new BattleAudioTracker(id=>ids.push(id));const b={runId:cls,classId:cls,hp:100,tick:0,attackReady:0,skillReady:0,ultimateReady:0,thirdReady:0,dashReady:0};t.observe(b);
 for(const [key,id] of [['attackReady',cls+'-attack'],['ultimateReady',cls+'-skill-1'],['skillReady',cls+'-skill-2'],['thirdReady',cls+'-skill-3'],['fourthReady',cls+'-skill-4'],['dashReady','battle-dash']]){b[key]=100;t.observe(b);assert.equal(ids.at(-1),id);const n=ids.length;t.observe(b);t.observe({...b,[key]:0});t.observe(b);assert.equal(ids.length,n,'prediction replay');}
 b.won=true;b.ended=true;t.observe(b);assert.equal(ids.at(-1),'battle-victory');const n=ids.length;t.observe(b);assert.equal(ids.length,n);
 for(let slot=1;slot<=4;slot++)assert.deepEqual(eventAudio({type:'skill',slot},cls),[cls+'-skill-'+slot]);
}
assert.deepEqual(eventAudio({type:'cube',kind:'highCube',up:true}),['cube-black','cube-rankup']);
assert.deepEqual(eventAudio({type:'cube',kind:'primeCube'}),['cube-prime']);
assert.deepEqual(eventAudio({type:'star',outcome:'keep'}),['enhance-fail']);
assert.deepEqual(eventAudio({type:'star',outcome:'success'}),['enhance-success']);
console.log('PASS 52 audio ids, all classes/skills, cooldown replay deduplication, cube and enhancement routing');
