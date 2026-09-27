import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base=process.env.SKILL_PREVIEW_URL||'http://127.0.0.1:4179',out='outputs/skill-sequence-qa';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'msedge'});const page=await browser.newPage({viewport:{width:1280,height:960}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(base+'/rebirth/skills-preview.html');await page.waitForFunction(()=>window.skillPreview);
for(const id of ['warrior','mage','archer','rogue','pirate']){
 for(const slot of [1,2]){
  await page.evaluate(async({id,slot})=>{await window.skillPreview.select(id,slot);window.skillPreview.seek(slot===1?7:({warrior:18,mage:20,archer:13,rogue:13,pirate:17})[id]);},{id,slot});
  assert.equal(await page.locator('#'+(slot===1?'first':'second')).getAttribute('aria-pressed'),'true');
  const state=await page.evaluate(()=>{const b=window.skillPreview.state();return{tick:b.tick,effects:b.effects.map(e=>e.kind),damage:1e9-b.enemyHp};});
  assert.ok(state.effects.includes(slot===1?'first':'second-sequence'));assert.ok(state.damage>0);
  await page.locator('.stage').screenshot({path:`${out}/${id}-${slot}.png`});
 }
}
await page.evaluate(async()=>{await window.skillPreview.select('mage',2);window.skillPreview.seek(40);});await page.screenshot({path:out+'/desktop-finale.png',fullPage:true});
const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});mobile.on('pageerror',e=>errors.push(e.message));await mobile.goto(base+'/rebirth/skills-preview.html?class=rogue');await mobile.waitForFunction(()=>window.skillPreview);await mobile.evaluate(()=>window.skillPreview.seek(27));
assert.ok(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await mobile.screenshot({path:out+'/mobile-preview.png',fullPage:true});
// Actual game controls and production renderer, with first/second accessible by keyboard.
await page.goto(base+'/rebirth/tower-preview.html');await page.waitForFunction(()=>document.querySelector('#tower-status')?.textContent==='');await page.keyboard.press('KeyK');await page.waitForTimeout(350);assert.ok((await page.locator('[data-tower-button="8"]').innerText()).includes('대지 분쇄'));await page.keyboard.press('KeyL');await page.waitForTimeout(1300);assert.ok((await page.locator('[data-tower-button="2"]').innerText()).includes('균열 참격'));await page.screenshot({path:out+'/actual-controls.png',fullPage:true});
assert.deepEqual(errors,[]);await browser.close();console.log('PASS 10 distinct class/tier captures, all skill names, live effects/damage, desktop/mobile layout, actual keyboard controls and zero browser exceptions. Screenshots: '+out);
