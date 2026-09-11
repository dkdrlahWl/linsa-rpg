// AU2 presentation acceptance: actual page, assets, transport, and item calculations.
// All remote requests are intercepted; synthetic accounts only. No production writes.
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {once} from 'node:events';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {execute,initialState,balance} from '../supabase/functions/_shared/tower-hp-restored.mjs';
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const phase=process.env.QA_PHASE||'after',beforeDir=process.env.QA_BEFORE_DIR;
const user={id:randomUUID(),username:'auction_ui_fixture'};
let state=initialState(Date.now()),revision=1,activeCount=3;
Object.assign(state,{autoBattle:false,gold:10000,essence:1000,playerName:'독립 UI 테스트',playerUid:'AU2QA'});
const originalRows=Array.from({length:27},(_,i)=>({id:randomUUID(),uid:'TEST'+i,name:['링구','재원','망고','모험가'][i]||'기사 '+(i+1),power:[765,703,574,534][i]||490-i*9,tower:[2,10,5,0][i]??i%6,gender:'male',equipment:[],equippedAura:-1}));
let rankingRows=structuredClone(originalRows),rankingFailure=false;
state.towerCleared=3;state.playerName='도현';state.playerUid='RK1-TEST-UID';
const costume=()=>({schemaVersion:1,owned:[],equipped:null,costumeRevision:0,revision,essence:state.essence,purchasesEnabled:false});
const snapshot=()=>({account:user,state:structuredClone(state),revision,economyReady:true,costume:costume()});
const requests=[],errors=[],unexpected=[];
async function remote(request){
 const name=new URL(request.url()).pathname.split('/').at(-1),body=request.postDataJSON()||{};requests.push({name,body});
 switch(name){
  case 'ringu_admin_status':return {currencyFloor:0};
  case 'ringu_account':return body.p_action==='ping'?{ok:true}:snapshot();
  case 'ringu-economy':{
   const result=execute(state,body.command,body.args||{},{now:Date.now(),itemIds:Array.from({length:10},(_,i)=>1000+i),random:()=>.5,uuid:randomUUID,adminFloor:0,costumePercent:0,partyBusy:false});
   state=result.state;revision++;return {state,revision,result:{events:result.events},requestId:body.requestId};
  }
  case 'ringu_save_preferences':state={...state,...body.p_preferences};revision++;return {revision,state};
  case 'ringu_claim_party':return {revision,state,stoneAward:0};
  case 'ringu_costume':return costume();
  case 'ringu_ranking':if(rankingFailure)throw Error('QA_RANKING_UNAVAILABLE');return {rows:rankingRows};
  case 'ringu_party':return {room:null,rooms:[],remaining:2,pending:0};
  default:unexpected.push(name);throw Error('Unexpected mocked endpoint: '+name);
 }
}
const root=new URL('../',import.meta.url);
const server=createServer(async(req,res)=>{
 try{
  const path=decodeURIComponent(req.url.split('?')[0]);assert.ok(path.startsWith('/linsa-rpg/')&&!path.includes('..'));
  const file=path.slice('/linsa-rpg/'.length)||'index.html';
  const url=phase==='before'&&beforeDir&&['index.html','auction.js','auction.css'].includes(file)?new URL('file://'+beforeDir+'/'+file):new URL(file,root);
  const data=await readFile(url);
  const mime=file.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':file.endsWith('.png')?'image/png':'application/octet-stream';
  res.writeHead(200,{'Content-Type':mime});res.end(data);
 }catch(e){res.writeHead(404);res.end();}
});
server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port+'/linsa-rpg/';
const browser=await chromium.launch({headless:true,...(process.env.QA_CHROMIUM_EXECUTABLE?{executablePath:process.env.QA_CHROMIUM_EXECUTABLE}:{})});
const out=new URL('../test-output/ranking-RK1/',import.meta.url);await mkdir(out,{recursive:true});
let queue=Promise.resolve(),activePage;
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 await context.addInitScript(({user})=>localStorage.setItem('ringu.supabase.v1.ekgihnyojihpearcudtd.supabase.co',JSON.stringify({access_token:'synthetic-rk1',refresh_token:'synthetic-rk1',expires_at:Date.now()/1000+3600,user:{id:user.id,email:'fixture@test.invalid',user_metadata:{username:user.username}}})),{user});
 await context.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.hostname==='127.0.0.1')return route.continue();
  if(u.hostname==='ekgihnyojihpearcudtd.supabase.co'){
   queue=queue.then(async()=>{try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(await remote(route.request()))});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:e.message,message:e.message})});}});return queue;
  }
  unexpected.push(u.origin);return route.abort();
 });
 const page=await context.newPage();activePage=page;page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.RinguRanking&&RinguSession.active);await page.evaluate(()=>RinguArt.ready);
 // Synthetic display state only, not real player records.
 await page.evaluate(()=>{RinguCore.fn.getPower=()=>676;});
 await page.locator('.profile-button').click();await page.waitForFunction(()=>document.querySelectorAll('.rk-row').length===28);
 assert.equal(await page.locator('#rankingTitle').textContent(),'전체 공격력 랭킹');assert.equal(await page.locator('#profileUid').textContent(),'RK1-TEST-UID');
 const getRows=()=>page.locator('.rk-row').evaluateAll(rows=>rows.map(r=>({id:r.dataset.rkProfile,source:r.dataset.rkSource,name:r.querySelector('.rk-name').textContent,rank:r.querySelector('.rk-rank').textContent,value:r.querySelector('.rk-value').textContent,me:r.classList.contains('rk-me'),medal:[1,2,3].find(n=>r.classList.contains('rk-medal-'+n))})));
 let rows=await getRows();assert.deepEqual(rows.slice(0,3).map(r=>r.name),['링구','재원','도현']);assert.deepEqual(rows.slice(0,3).map(r=>r.medal),[1,2,3]);assert.equal(rows[2].me,true);assert.equal(rows[2].value,'676');
 const dimensions=[];
 for(const [width,height]of [[320,640],[360,640],[390,844],[412,915],[540,720],[768,800],[1440,1000],[844,390],[390,390]]){
  await page.setViewportSize({width,height});
  for(const mode of ['power','tower']){
   await page.locator(mode==='power'?'#powerRankTab':'#towerRankTab').click();
   const before=await page.locator('#profileModal').evaluate(el=>{const shell=el.querySelector('.rk-shell'),list=el.querySelector('#rankList'),head=el.querySelector('.rk-header'),footer=el.querySelector('.rk-footer');const b=x=>{const r=x.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};return {shell:b(shell),list:b(list),header:b(head),footer:b(footer),overflow:list.scrollWidth>list.clientWidth+1,rows:[...list.querySelectorAll('.rk-row')].filter(x=>x.scrollWidth>x.clientWidth+1).length};});
   assert.ok(before.shell.x>=0&&before.shell.right<=width+1&&before.shell.y>=0&&before.shell.bottom<=height+1,JSON.stringify({width,height,mode,before}));assert.ok(before.list.height>50);assert.equal(before.overflow,false);assert.equal(before.rows,0);
   await page.locator('#rankList').evaluate(el=>el.scrollTop=el.scrollHeight);
   const after=await page.locator('#profileModal').evaluate(el=>({header:el.querySelector('.rk-header').getBoundingClientRect().y,footer:el.querySelector('.rk-footer').getBoundingClientRect().y,top:el.querySelector('#rankList').scrollTop}));assert.equal(after.header,before.header.y);assert.equal(after.footer,before.footer.y);assert.ok(after.top>0);
   assert.equal(await page.locator(mode==='power'?'#powerRankTab':'#towerRankTab').getAttribute('aria-pressed'),'true');dimensions.push({width,height,mode,...before});
   await page.locator('#rankList').evaluate(el=>el.scrollTop=0);
   if((width===390&&height===844)||width===1440||width===320)await page.screenshot({path:new URL(mode+'-'+width+'.png',out).pathname});
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#towerRankTab').click();
 rows=await getRows();assert.equal(rows[0].name,'재원');assert.equal(rows[0].value,'10');assert.ok(rows.every(r=>Number(r.value)>=1));
 await page.locator('.rk-row').first().click();await page.waitForFunction(()=>document.querySelector('#playerEquipTitle').textContent==='재원의 캐릭터');
 assert.ok(await page.locator('#playerEquipModal').isVisible());await page.keyboard.press('Escape');assert.ok(await page.locator('#profileModal').isVisible());
 await page.locator('#rkMyRank').click();assert.equal(await page.locator('.rk-me').evaluate(el=>el===document.activeElement),true);
 await page.evaluate(()=>RinguCore.fn.syncRanking());assert.equal(await page.evaluate(()=>RinguRanking.mode),'tower');assert.equal((await getRows())[0].name,'재원');
 rankingRows=[{...originalRows[0],name:'<img src=x onerror="window.__rkXss=1">',power:Number.MAX_SAFE_INTEGER,tower:30},...originalRows.slice(1)];
 await page.evaluate(()=>RinguCore.fn.syncRanking());await page.locator('#powerRankTab').click();
 assert.equal(await page.locator('#rankList img,#rankList script').count(),0);assert.equal(await page.evaluate(()=>window.__rkXss),undefined);assert.equal((await getRows())[0].name,rankingRows[0].name);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});assert.ok(await page.locator('.rk-row').first().evaluate(el=>el.scrollWidth<=el.clientWidth+1));}
 rankingRows=originalRows.map(r=>({...r,tower:0}));state.towerCleared=0;await page.evaluate(()=>{RinguCore.state.towerCleared=0;});await page.evaluate(()=>RinguCore.fn.syncRanking());await page.locator('#towerRankTab').click();
 assert.equal(await page.locator('.rk-row').count(),0);assert.ok(await page.locator('.rk-empty').isVisible());assert.ok(await page.locator('#rkMyRank').isDisabled());
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:new URL('tower-empty-390.png',out).pathname});
 await page.evaluate(()=>{window.__copied=[];Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async value=>window.__copied.push(value)}});});
 await page.locator('.rk-copy').click();assert.deepEqual(await page.evaluate(()=>window.__copied),['RK1-TEST-UID']);
 await page.locator('#nicknameInput').fill('새로운기사');await page.locator('.rk-save-name').click();assert.equal(await page.evaluate(()=>RinguCore.state.playerName),'새로운기사');assert.equal(await page.locator('#nicknameInput').getAttribute('maxlength'),'12');
 await page.evaluate(()=>RinguCore.fn.syncRanking());rankingFailure=true;await page.evaluate(()=>RinguCore.fn.syncRanking());assert.match(await page.locator('#rankStatus').textContent(),/연결/);rankingFailure=false;
 await page.locator('.rk-close').click();assert.ok(await page.locator('#profileModal').isHidden());await page.locator('.profile-button').click();assert.ok(await page.locator('#profileModal').isVisible());await page.keyboard.press('Escape');assert.ok(await page.locator('#profileModal').isHidden());
 assert.deepEqual(errors,[]);assert.deepEqual(unexpected,[]);
 await writeFile(new URL('report.json',out),JSON.stringify({suite:'RK1',checks:['live attack/tower rows and exact values','medals and own-account highlight','correct character inspection after tower reorder','nine viewport sizes and fixed header/footer scroll','safe untrusted names','large-number containment','empty/zero-floor state','UID copy only on click','nickname control unchanged','refresh mode/error state','close/reopen/escape'],dimensions,productionDataUsed:false,errors},null,2));
 console.log('PASS RK1: both ranking tabs, 18 mobile/desktop/landscape layouts, correct profile mapping, navigation, own rank, safe names, UID copy, nickname save and error/empty states. Remote requests mocked.');

}catch(e){if(activePage){console.log('RK1_DIAGNOSTIC',errors,unexpected,await activePage.locator('body').innerText().then(s=>s.slice(-1800)));await activePage.screenshot({path:new URL('failure.png',out).pathname}).catch(()=>{});}throw e;}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
