import {skillLookArtPath,skillLookPreviewPath} from './skill-look-designs.mjs';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {initialState,execute,power} from './engine.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
import {simulateArena} from './arena-model.mjs';
import {arenaEffectArt} from './arena-effects.mjs';
import {SKILL_LOOKS,SKILL_LOOK_CLASSES,equippedSkillLook,normalizeSkillLooks} from './skill-looks.mjs';
import {SKILL_LOOKS as SERVER_LOOKS} from './edge-dist/skill-looks.mjs';
import {skillLookForEffect,skillLookIllustration,skillLookFrame,skillLookTier} from './skill-look-effects.mjs';
import {shopView} from './shop-ui.mjs';
const ctx={now:0,random:()=>.5,uuid:()=> 'look-test'};
assert.equal(SKILL_LOOKS.length,18);assert.equal(new Set(SKILL_LOOKS.map(c=>c.id)).size,18);
assert.equal(new Set(SKILL_LOOKS.map(c=>c.motif)).size,18);
assert.deepEqual(SKILL_LOOKS,SERVER_LOOKS);
for(const classId of Object.keys(SKILL_LOOK_CLASSES))assert.equal(SKILL_LOOKS.filter(c=>c.classId===classId).length,3);
let replays=0;
for(const c of SKILL_LOOKS){
 let base=initialState(c.classId,'스킬외형검수',ctx);base.hunting=false;base.gold=40_000_000;base.level=200;base.advancement=4;
 base=execute(base,'sync',{},ctx).state;
 const bought=execute(base,'skillLookBuy',{id:c.id},ctx).state;
 assert.equal(bought.gold,20_000_000);assert.deepEqual(bought.skillLooks,[c.id]);
 assert.equal(equippedSkillLook(bought),null,'purchase does not equip');
 assert.throws(()=>execute(bought,'skillLookBuy',{id:c.id},ctx),/SKILL_LOOK_OWNED/);
 assert.throws(()=>execute({...base,gold:19_999_999},'skillLookBuy',{id:c.id},ctx),/INSUFFICIENT_GOLD/);
 assert.throws(()=>execute(base,'skillLookEquip',{id:c.id},ctx),/SKILL_LOOK_NOT_OWNED/);
 assert.throws(()=>execute({...bought,classId:c.classId==='mage'?'warrior':'mage'},'skillLookEquip',{id:c.id},ctx),/SKILL_LOOK_CLASS_MISMATCH/);
 for(const command of ['skillLookBuy','skillLookEquip','skillLookUnequip'])for(const field of ['battle','coopRoom','partyRoom'])assert.throws(()=>execute({...bought,[field]:{kind:'boss'}},command,{id:c.id},ctx),/BATTLE_IN_PROGRESS|PARTY_IN_PROGRESS/);
 const worn=execute(bought,'skillLookEquip',{id:c.id},ctx).state;
 assert.equal(worn.gold,bought.gold);
 const other=c.classId==='mage'?'warrior':'mage';
 const switched=execute(worn,'changeClass',{classId:other},ctx).state;
 assert.equal(equippedSkillLook(switched),null);
 assert.equal(equippedSkillLook(execute(switched,'changeClass',{classId:c.classId},ctx).state).id,c.id,'per-job equip survives switching');
 assert.equal(equippedSkillLook(normalizeSkillLooks(JSON.parse(JSON.stringify(worn)))).id,c.id);
 // 2026-10-25: 보유 효과 치명타 피해 +1%p/종. 장착 여부는 능력치에 영향 없음.
 const off=execute(worn,'skillLookUnequip',{},ctx).state;
 assert.ok(Math.abs(power(bought).critDamage-power(base).critDamage-.01)<1e-9,'ownership adds +1%p crit damage');
 const naked=power(off),skinned=power(worn);
 assert.equal(skinned.skillLookId,c.id);delete naked.skillLookId;delete skinned.skillLookId;
 assert.deepEqual(naked,skinned,'equipping does not change stats beyond ownership');
 assert.equal(equippedSkillLook(off),null);assert.deepEqual(off.skillLooks,[c.id]);assert.equal(off.gold,bought.gold);
 // Every skin replays 60 seconds with all five skills. Full world state (including
 // damage, hit areas, target selection, healing, cooldowns and timing) must match.
 const stats={...power(base),hp:1e9,attack:100,firstJob:true,advancement:4};
 const a=newTowerBattle(50,c.classId,stats,0,'same-run',71,true),b=structuredClone(a);
 b.power.skillLookId=c.id;
 for(let tick=0;tick<600;tick++){const input=[0,0,1|8|2|16|32|64];towerStep(a,input);towerStep(b,input);}
 delete a.power.skillLookId;delete b.power.skillLookId;assert.deepEqual(a,b,`${c.id}: cosmetic must not alter simulation`);replays++;
 assert.deepEqual(simulateArena(off,base,'skin-parity'),simulateArena(worn,base,'skin-parity'),'equipping does not change arena damage and timings');
 for(let slot=1;slot<=5;slot++){
  const e={kind:c.classId==='priest'?'priest':['','first','second-sequence','third','fourth','fifth'][slot],slot,start:0,end:28};
  assert.equal(skillLookTier(e),slot);
  assert.deepEqual([1,12,26].map(time=>skillLookFrame(e,time).column),[0,1,2]);
  const art=arenaEffectArt(c.classId,slot,c.id);assert.equal(art.row,slot-1);assert.equal(art.cols,4);
 }
 await access(new URL(`./${skillLookArtPath(c.id)}`,import.meta.url));
 await access(new URL(`./${skillLookPreviewPath(c.id)}`,import.meta.url));
 const self={classId:c.classId,actorId:'self',power:{skillLookId:c.id},allies:[{id:'ally',classId:c.classId,power:{}}]};
 const effect={owner:'self',classId:c.classId};assert.equal(skillLookForEffect(self,effect)?.id,c.id);
 assert.equal(skillLookForEffect(self,{...effect,owner:'ally'}),null,'no local skin leaking onto another actor');
 assert.equal(skillLookForEffect(self,{...effect,hostile:true}),null);
 assert.equal(skillLookForEffect(self,{...effect,owner:'missing'}),null);
 assert.ok(skillLookIllustration(c).includes(c.name));
 const html=shopView(worn,{},()=>'', 'skilllook',c.classId);
 assert.ok(html.includes(c.name));assert.ok(html.includes('20,000,000 G'));assert.ok(html.includes('skillLookUnequip'));assert.ok(html.includes('skillLookPreview'));
}
const broken=normalizeSkillLooks({classId:'warrior',skillLooks:['rose-oath','rose-oath','made-up'],equippedSkillLooks:{warrior:'made-up',mage:'rose-oath'}});
assert.deepEqual(broken.skillLooks,['rose-oath']);assert.deepEqual(broken.equippedSkillLooks,{});
const c=SKILL_LOOKS[0],base=initialState(c.classId,'관리자검수',ctx);base.hunting=false;
assert.equal(execute(base,'skillLookBuy',{id:c.id},{...ctx,admin:true}).state.gold,999999999999);
const old=initialState('warrior','이전저장',ctx);delete old.skillLooks;delete old.equippedSkillLooks;
assert.deepEqual(execute(old,'sync',{},ctx).state.skillLooks,[]);
const source=await readFile(new URL('./app.mjs',import.meta.url),'utf8');assert.ok(source.includes("'skilllook'"));
console.log(`PASS 18 skins / 6 jobs: exact 20M transactions, no duplicate debit, ownership persistence, job/battle guards, +1% crit damage per owned look (equip is cosmetic), ${replays} identical 60s all-skill combat replays, owner isolation and shop previews.`);
