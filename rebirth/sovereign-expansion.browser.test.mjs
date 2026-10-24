
import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
const {chromium}=await import(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const root=resolve(fileURLToPath(new URL('../',import.meta.url))),out=process.env.QA_OUTPUT||resolve(root,'test-artifacts/sovereign');
await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path.endsWith('/'))path+='index.html';const file=resolve(root,'.'+path);if(!file.startsWith(root))throw Error();const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[extname(file)]||'application/octet-stream'));res.end(data);}catch{res.statusCode=404;res.end('missing');}});
await new Promise(r=>server.listen(8776,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
try{
 for(const [width,height] of [[360,800],[1280,900]].filter(([w])=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH))){
  const ctx={now:Date.now(),random:()=>.5,uuid:randomUUID};let state=initialState('warrior','확장검수',ctx);state.hunting=false;state.gold=50000000;
  console.log('START browser',width);const page=await browser.newPage({viewport:{width,height}}),errors=[],missing=[];page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()===404)missing.push(r.url());});
  await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'local-only',refresh_token:'local-only',user:{id:'local-qa'},expires_at:Date.now()/1000+3600})));
  await page.route('https://*.supabase.co/**',async route=>{if(route.request().url().includes('ringu-rebirth')){const b=route.request().postDataJSON();try{const r=execute(state,b.command,b.args,{...ctx,now:Date.now()});state=r.state;return route.fulfill({json:{state,revision:1,result:{events:r.events}}});}catch(e){return route.fulfill({status:400,json:{error:e.message}});}}return route.fulfill({status:401,json:{error:'LOCAL_ONLY'}});});
  console.log('OPEN',width);await page.goto('http://127.0.0.1:8776/rebirth/');console.log('LOADED',width);await page.locator('[data-arg="shop"]:visible').first().waitFor();await page.locator('[data-arg="shop"]:visible').first().click();await page.locator('[data-action="shopCategory"][data-arg="costume"]').click();
  await page.locator('.costume-card').first().waitFor();assert.equal(await page.locator('.costume-card').count(),24);
  await page.locator('.costume-card img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'shop overflow');
  await page.locator('[data-action="costumeBuyPick"][data-arg="sunrose-empress"]').click();await page.locator('[data-action="costumeBuyConfirm"]').click();
  await page.locator('[data-action="costumeEquip"][data-arg="sunrose-empress"]').waitFor();assert.equal(state.gold,40000000);
  await page.locator('[data-action="costumeEquip"][data-arg="sunrose-empress"]').click();await page.locator('.costume-card.equipped').waitFor();assert.equal(state.equippedCostume,'sunrose-empress');
  await page.reload();await page.locator('[data-arg="shop"]:visible').first().waitFor();assert.equal(state.equippedCostume,'sunrose-empress');
  await page.evaluate(async()=>{
   const D=await import('./data.mjs');const {COSTUMES}=await import('./costumes.mjs');const {TowerRenderer,prepareCombatArt}=await import('./tower-renderer.mjs');const {newTowerBattle,towerStep}=await import('./tower-model.mjs');const {towerLobby}=await import('./tower-client.mjs');
   const {costumeShop}=await import('./costume-ui.mjs');window.qa={D,COSTUMES,TowerRenderer,prepareCombatArt,newTowerBattle,towerStep,towerLobby,costumeShop};
   document.querySelector('#app').innerHTML='<h1>새로운 여섯 가지 외형</h1>'+costumeShop({classId:'warrior',costumes:[]});
  });
  await page.locator('.costume-card img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));
  await page.screenshot({path:resolve(out,'costumes-'+width+'.png'),fullPage:true});
  const sampled=await page.evaluate(async()=>{
   const {COSTUMES,TowerRenderer,prepareCombatArt}=qa;const list=COSTUMES.slice(18);await prepareCombatArt(list.map(c=>c.classId),'sovereign-50',list.map(c=>c.id));
   document.querySelector('#app').innerHTML='<h1>전용 의상 · 실제 전투 스프라이트</h1><div id="sprites" style="display:flex;flex-wrap:wrap;gap:12px"></div>';let count=0;
   for(const c of list){const card=document.createElement('div');card.style='background:#182639;border:1px solid #b89956;border-radius:16px;padding:12px';card.innerHTML='<h3>'+c.name+'</h3>';const canvas=document.createElement('canvas');canvas.width=280;canvas.height=300;card.append(canvas);document.querySelector('#sprites').append(card);const r=Object.create(TowerRenderer.prototype);r.g=canvas.getContext('2d');r.mobileActors={matches:false};
    for(let dir=0;dir<8;dir++)for(const acting of [false,true])for(let phase=0;phase<8;phase++){r.g.clearRect(0,0,280,300);r.actor(c.classId,dir,true,acting,phase/9,phase/1.05,140,270,1,c.id);const data=r.g.getImageData(0,0,280,300).data;let filled=0;for(let p=3;p<data.length;p+=4)filled+=data[p]>0; if(filled<100)throw Error('Empty costume frame '+c.id+'/'+dir+'/'+phase);count++;}
    r.g.clearRect(0,0,280,300);r.actor(c.classId,2,false,false,0,0,140,270,1,c.id);
   }return count;
  });assert.equal(sampled,768);await page.screenshot({path:resolve(out,'sprites-'+width+'.png'),fullPage:true});
  await page.evaluate(()=>{const fields=qa.D.STAGES.slice(39);document.querySelector('#app').innerHTML='<h1>네 개의 챕터 · 열두 사냥터</h1><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">'+fields.map(s=>'<article style="padding:14px;border:1px solid #b89956;border-radius:16px"><h3>'+s.name+' · Lv.'+s.level+'</h3><div style="height:230px;background:center/cover url('+s.background+');display:flex;justify-content:center;align-items:end"><img style="height:190px;width:200px;object-fit:contain" src="'+qa.D.fieldMonster(s.id).art+'"></div></article>').join('')+'</div>';});
  await page.locator('#app img').evaluateAll(imgs=>Promise.all(imgs.map(img=>{img.loading='eager';return img.decode();})));await page.screenshot({path:resolve(out,'chapters-'+width+'.png'),fullPage:true});
  await page.evaluate(()=>{document.querySelector('#app').innerHTML=qa.towerLobby({classId:'warrior',advancement:4,tower:{cleared:[]}});});
  assert.equal(await page.locator('.tower-floor').count(),50);assert.equal(await page.locator('[data-action="towerStart"][data-arg="50"]').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'tower overflow');
  await page.locator('.tower-floor').last().scrollIntoViewIfNeeded();await page.screenshot({path:resolve(out,'tower50-lobby-'+width+'.png')});
  await page.evaluate(async()=>{
   const {TowerRenderer,prepareCombatArt,newTowerBattle,towerStep}=qa;document.querySelector('#app').innerHTML='<h1>50F · 월식의 절대황 아우렐리아</h1><canvas id="qa-battle" style="width:100%;height:650px"></canvas>';
   const b=newTowerBattle(50,'warrior',{hp:1e12,attack:1,defense:0,boss:1,crit:0,critDamage:1.5,cadence:1,costumeId:'sunrose-empress'},0,'qa',42);
   for(let i=0;i<35;i++)towerStep(b,[0,0,0]);await prepareCombatArt(['warrior'],'sovereign-50',['sunrose-empress']);window.renderer=new TowerRenderer(document.querySelector('#qa-battle'));await new Promise(r=>setTimeout(r,200));renderer.draw(b,b,b.player,0,performance.now(),[0,0,0],{});
  });await page.screenshot({path:resolve(out,'tower50-combat-'+width+'.png')});
  await page.evaluate(()=>renderer.dispose());assert.deepEqual(errors,[]);assert.deepEqual(missing.filter(u=>!u.endsWith('favicon.ico')),[]);await page.close();console.log('PASS browser '+width+': 24 shop portraits, new costume buy/equip/reload, 768 directional frames, 12 chapter previews, 50-floor lobby and actual combat, no JS errors or missing assets');
 }
}catch(error){console.error('BROWSER QA ERROR',error);throw error;}finally{server.closeAllConnections();await new Promise(r=>server.close(r));await browser.close();}
