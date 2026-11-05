import assert from 'node:assert/strict';
import {FISHING_SKINS,fishingSkin} from './fishing-skins.mjs';
import {fishingDockLayout,FISHING_DOCKS,fishingSceneMotion} from './fishing-motion.mjs';
import {normalizeFishing,fishingCommand} from './fishing-model.mjs';
const now=Date.now(),ctx={now,random:()=>.5,uuid:()=>String(Math.random())};
const state={gold:1000};normalizeFishing(state,now);
for(const skin of FISHING_SKINS){fishingCommand(state,'fishSkinEquip',{skin:skin.id},ctx);assert.equal(state.fishing.skin,skin.id);assert.equal(normalizeFishing(structuredClone(state),now).skin,skin.id);}
assert.throws(()=>fishingCommand(state,'fishSkinEquip',{skin:'invalid'},ctx),/INVALID_FISHING_SKIN/);
state.fishing.cast={id:'active',expires:now+10000};assert.throws(()=>fishingCommand(state,'fishSkinEquip',{skin:'default'},ctx),/FISHING_CAST_ACTIVE/);
for(const [width,height] of [[320,520],[390,700],[768,650],[980,600]])for(const site of Object.keys(FISHING_DOCKS))for(const skin of FISHING_SKINS){
 const iw=1536,ih=1024;
 const l=fishingDockLayout({width,height,imageWidth:iw,imageHeight:ih,site,skin:skin.id});
 const seat=fishingSkin(skin.id).seat;
 assert.ok(Math.abs(l.angler.left+l.angler.size*seat[0]-l.dock.x)<1e-6);
 assert.ok(Math.abs(l.angler.top+l.angler.size*seat[1]-l.dock.y)<1e-6);
 assert.ok(l.image.left<=0&&l.image.top<=0&&l.image.left+l.image.width>=width-.001&&l.image.top+l.image.height>=height-.001);
 assert.ok(l.angler.left>=0&&l.angler.top>=0&&l.angler.left+l.angler.size<=width&&l.angler.top+l.angler.size<=height);
 for(let pose=0;pose<6;pose++){const m=fishingSceneMotion({width,height,angler:{...l.angler,seat},phase:'waiting',pose,tips:skin.tips});assert.ok(m.tip.x>=0&&m.tip.x<=width&&m.tip.y>=0&&m.tip.y<=height);assert.ok(m.end.x-l.dock.x>width*.39,'float stays well beyond the dock edge');}
}
console.log('PASS skin equip persistence, invalid/active-cast protection, dock contact and 6 rod anchors across all 8 maps at 4 viewport sizes');
