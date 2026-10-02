const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
import {spawn} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
const server=spawn('python',['-m','http.server','8771'],{stdio:'ignore'});
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 for(const [width,height] of [[360,800],[1280,900]]){
  const ctx={now:Date.now(),random:()=>.5,uuid:randomUUID};let state=initialState('warrior','코스튬검증',ctx);state.hunting=false;state.gold=10000000;
  const page=await browser.newPage({viewport:{width,height}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'local-only',refresh_token:'local-only',user:{id:'local-qa'},expires_at:Date.now()/1000+3600})));
  await page.route('https://*.supabase.co/**',async route=>{if(route.request().url().includes('ringu-rebirth')){const b=route.request().postDataJSON();try{const r=execute(state,b.command,b.args,{...ctx,now:Date.now()});state=r.state;return route.fulfill({json:{state,revision:1,result:{events:r.events}}});}catch(e){return route.fulfill({status:400,json:{error:e.message}});}}return route.fulfill({status:401,json:{error:'LOCAL_ONLY'}});});
  await page.goto('http://127.0.0.1:8771/rebirth/');await page.locator('.fantasy-dock').waitFor();await page.locator('.fantasy-dock>button').last().click();
  await page.locator('.costume-card').first().waitFor();assert.equal(await page.locator('.costume-card').count(),6);
  await page.locator('.costume-card img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await page.screenshot({path:`/workspace/scratch/4d36c0164395/costume-shop-${width}.png`,fullPage:true});
  await page.locator('[data-action="costumeBuyPick"][data-arg="crimson-dragon"]').click();await page.locator('[data-action="costumeBuyConfirm"]').click();
  await page.locator('[data-action="costumeEquip"][data-arg="crimson-dragon"]').waitFor();assert.equal(state.gold,5000000);
  await page.locator('[data-action="costumeEquip"][data-arg="crimson-dragon"]').click();await page.locator('.costume-card.equipped').waitFor();assert.equal(state.equippedCostume,'crimson-dragon');
  await page.reload();await page.locator('.fantasy-dock').waitFor();assert.equal(state.equippedCostume,'crimson-dragon');
  const compared=await page.evaluate(async()=>{
   const {TowerRenderer,image,asset}=await import('./tower-renderer.mjs?v=costume-104');const {COSTUMES}=await import('./costumes.mjs?v=costume-104');
   const paths=COSTUMES.flatMap(c=>[c.atlas,c.classId==='priest'?'tower/priest-motion-v1.png':asset('hero-'+c.classId+'-motion-v4')]);paths.push('costumes/warrior-east-v1.webp',asset('hero-warrior-east-v4'));
   await Promise.all(paths.map(src=>image(src).decode()));let count=0;
   for(const mobile of [false,true])for(const c of COSTUMES)for(let dir=0;dir<8;dir++)for(const mode of ['idle','walk','attack']){
    const canvas=document.createElement('canvas'),g=canvas.getContext('2d'),r=Object.create(TowerRenderer.prototype);r.g=g;r.mobileActors={matches:mobile};
    let calls=[];const original=g.drawImage.bind(g);g.drawImage=(...args)=>{calls.push(args.slice(1));original(...args);};
    r.actor(c.classId,dir,mode==='walk',mode==='attack',.5,2,500,300,1);const base=JSON.stringify(calls);calls=[];
    r.actor(c.classId,dir,mode==='walk',mode==='attack',.5,2,500,300,1,c.id);if(JSON.stringify(calls)!==base)throw Error(c.classId+' size or anchor changed');count++;
   }return count;
  });assert.equal(compared,288);assert.deepEqual(errors,[]);await page.close();console.log(`PASS ${width}: 6 images, purchase, equip, persisted reload, no overflow, 288 matching sprite sizes/anchors.`);
 }
}finally{await browser.close();server.kill();}
