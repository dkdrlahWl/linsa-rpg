import assert from 'node:assert/strict';
import {access,readFile} from 'node:fs/promises';
import {SKILL_LOOKS} from './skill-looks.mjs';
import {skillLookDesign,skillLookArtPath,skillLookPreviewPath} from './skill-look-designs.mjs';
import {skillLookAtlasURL,skillLookIllustration} from './skill-look-effects.mjs';
import {arenaEffectArt} from './arena-effects.mjs';
const revised=['violet-moon','dawn-seraph','galaxy-waltz','pearl-tide','peacock-plume','starlit-deer'];
for(const c of SKILL_LOOKS){
 const revision=revised.includes(c.id)?3:2;
 assert.equal(skillLookDesign(c.id).revision,revision);
 assert.ok(skillLookAtlasURL(c.id).endsWith(skillLookArtPath(c.id)));
 assert.ok(skillLookIllustration(c).includes(skillLookPreviewPath(c.id)));
 assert.equal(arenaEffectArt(c.classId,5,c.id).url,skillLookArtPath(c.id));
 await access(new URL('./'+skillLookArtPath(c.id),import.meta.url));
 await access(new URL('./'+skillLookPreviewPath(c.id),import.meta.url));
 if(revision===3){
  const current=await readFile(new URL('./'+skillLookArtPath(c.id),import.meta.url));
  const previous=await readFile(new URL(`./skill-looks/${c.id}-native-v2.webp`,import.meta.url));
  assert.ok(!current.equals(previous),'revised theme must have new painted artwork');
 }
}
assert.notEqual(skillLookDesign('peacock-plume').color,skillLookDesign('starlit-deer').color);
assert.notEqual(skillLookDesign('peacock-plume').identity,skillLookDesign('starlit-deer').identity);
console.log('PASS six revised themes: distinct artwork, matching shop/combat/arena paths, preserved 12 existing themes');
