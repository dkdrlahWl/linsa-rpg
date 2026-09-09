process.env.QA_PHASE??='after';
const {PGlite}=await import(process.env.QA_PGLITE_MODULE||'@electric-sql/pglite');
import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {once} from 'node:events';import {createRequire} from 'node:module';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const db=new PGlite(),users=new Map(),tokens=new Map();let serial=0,queue=Promise.resolve();
await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users(id),created_at timestamptz default now());create function auth.uid() returns uuid language sql as $$select nullif(current_setting('test.uid',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql as $$select jsonb_build_object('session_id',current_setting('test.sid',true))$$;`);
for(const file of ['01-account-storage.sql','02-ranking-party.sql'])await db.exec(await readFile(new URL('fixtures/'+file,import.meta.url),'utf8'));
async function service(req){
 const path=new URL(req.url()).pathname,body=req.postDataJSON()||{};
 if(path==='/auth/v1/settings')return {mailer_autoconfirm:true};
 if(path==='/auth/v1/signup'||path==='/auth/v1/token'){
  let u=users.get(body.email);if(!u){u={id:randomUUID(),email:body.email,user_metadata:body.data};users.set(body.email,u);await db.query('insert into auth.users values($1)',[u.id]);}
  const sid=randomUUID(),t=randomUUID();await db.query('insert into auth.sessions values($1,$2,$3)',[sid,u.id,new Date(Date.now()+ ++serial).toISOString()]);tokens.set(t,{u,sid});return {access_token:t,refresh_token:t,expires_at:Date.now()/1000+3600,user:u};
 }
 const entry=tokens.get(req.headers().authorization?.replace('Bearer ',''));if(!entry)throw Error('LOGIN_REQUIRED');
 await db.query("select set_config('test.uid',$1,false),set_config('test.sid',$2,false)",[entry.u.id,entry.sid]);
 if(path==='/auth/v1/logout'){await db.query('delete from auth.sessions where id=$1',[entry.sid]);return {};}
 const name=path.split('/').at(-1);
 if(name==='ringu_admin_status')return {currencyFloor:0};
 assert.ok(['ringu_account','ringu_party','ringu_claim_party','ringu_ranking'].includes(name));
 const entries=Object.entries(body);assert.ok(entries.every(([k])=>/^p_[a-z_]+$/.test(k)));
 const args=entries.map(([k],i)=>k+'=> $'+(i+1));
 return (await db.query('select public.'+name+'('+args.join(',')+') as result',entries.map(([,v])=>typeof v==='object'&&v!==null?JSON.stringify(v):v))).rows[0].result;
}
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(req.url.split('?')[0]);if(!path.startsWith('/linsa-rpg/')||path.includes('..'))throw Error();const file=path.slice('/linsa-rpg/'.length)||'index.html';const data=await readFile(new URL('../'+file,import.meta.url));res.setHeader('Content-Type',file.endsWith('.html')?'text/html':/\.(js|mjs)$/.test(file)?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.webp')?'image/webp':'image/png');res.end(data);}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port+'/linsa-rpg/',browser=await chromium.launch({channel:'msedge',headless:true}),contexts=[],pages=[],errors=[];
async function reload(p){await p.evaluate(()=>RinguSession.flush());await p.reload();await p.waitForFunction(()=>document.getElementById('heroCanvas')||document.body.textContent.includes('서버 기록으로 시작'));const b=p.getByRole('button',{name:'서버 기록으로 시작',exact:true});if(await b.count())await b.click();await p.locator('#heroCanvas').waitFor({state:'attached'});}
const out=new URL('../test-artifacts/'+(process.env.QA_PHASE||'before')+'/',import.meta.url);
const {mkdir,writeFile}=await import('node:fs/promises');await mkdir(out,{recursive:true});
try{
 const c=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});contexts.push(c);
 await c.route('https://ekgihnyojihpearcudtd.supabase.co/**',route=>{queue=queue.then(async()=>{try{await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(await service(route.request()))});}catch(e){await route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({message:e.message})});}});return queue;});
 const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()===404)errors.push('404 '+r.url())});
 await p.goto(base);await p.locator('#register-tab').click();await p.locator('#username').fill('presentationqa');await p.locator('#password').fill('PresentationQA2026!');await p.locator('#password-confirm').fill('PresentationQA2026!');await p.locator('#submit-button').click();await p.locator('#heroCanvas').waitFor({state:'attached'});
 await p.waitForFunction(()=>RinguArt.__weaponPoseV5&&window.__ringuPetAttackNerfV1);await p.evaluate(()=>{RinguCore.state.autoBattle=false;});
 const previewBefore=await p.evaluate(()=>({essence:RinguCore.state.essence,power:RinguCore.fn.getPower(),equipment:RinguCore.state.equipped,inventory:RinguCore.state.inventory}));
 for(const width of [320,1440]){
  await p.setViewportSize({width,height:900});await p.evaluate(()=>openAuraShop());await p.locator('#costumePreviewTab').click();
  for(const id of ['kael','serin']){
   await p.locator('#costumePreview [data-costume="'+id+'"]').click();await p.waitForFunction(id=>RinguCostumeArt.isReady(id),id);
   await p.locator('#costumePreview [data-pose="battle"]').click();await p.waitForTimeout(300);
   const box=await p.locator('#costumePreview').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1);
   assert.ok(await p.locator('#costumePreview button:disabled').count());
   await p.locator('#costumePreview').screenshot({path:decodeURIComponent(new URL('costume-'+id+'-'+width+'.png',out).pathname).replace(/^\//,'')});
  }
  await p.locator('#costumePreview [data-close]').click();await p.evaluate(()=>closeAuraShop());
 }
 assert.deepEqual(await p.evaluate(()=>({essence:RinguCore.state.essence,power:RinguCore.fn.getPower(),equipment:RinguCore.state.equipped,inventory:RinguCore.state.inventory})),previewBefore);
 for(const width of [320,360,390,412,768,1440]){
  await p.setViewportSize({width,height:900});await p.evaluate(()=>document.querySelector('[data-target="character"]').click());await p.waitForTimeout(150);
  await p.screenshot({path:decodeURIComponent(new URL('character-'+width+'.png',out).pathname).replace(/^\//,'')});
 }
 await p.evaluate(()=>{const s=RinguCore.state;const id=Object.keys(PET_DATA).sort()[0];s.ownedPets=[{uid:'qa-pet-1',petId:id,level:1,locked:false},{uid:'qa-pet-2',petId:id,level:1,locked:false}];s.equippedPet='qa-pet-1';refreshPetUI();openPetPanel();});
 await p.setViewportSize({width:390,height:844});await p.screenshot({path:decodeURIComponent(new URL('pets.png',out).pathname).replace(/^\//,'')});
 const checks=[];
 if(process.env.QA_PHASE==='after'){
 await p.evaluate(()=>closePetPanel());
 const portraitPolicy=await p.evaluate(()=>{
  const g=RinguCore,a=RinguArt,result=[];
  for(const gender of ['male','female']){
   const state={playerGender:gender,equippedAura:-1,equippedPet:null};
   const render=(equipment,battle=false,pose=0)=>{const cv=document.createElement('canvas');cv.width=640;cv.height=780;const c=cv.getContext('2d');if(battle)a.battleHero(c,state,equipment,g.fn.itemIndex,0,320,710,600,{pose});else a.hero(c,state,equipment,g.fn.itemIndex,0,320,710,640);return cv.toDataURL();};
   const bare=render({}),weapons=[0,3,6,7].map(i=>({'무기':{slot:'무기',rarity:0,name:g.fn.itemName('무기',0,i)}}));
   result.push({gender,portraitIndependent:weapons.every(e=>render(e)===bare),combatWeapons:Array.from({length:6},(_,pose)=>render(weapons[0],true,pose)!==render({},true,pose))});
  }return result;
 });assert.ok(portraitPolicy.every(r=>r.portraitIndependent&&r.combatWeapons.every(Boolean)));checks.push({portraitPolicy});
 const towerCutouts=await p.evaluate(()=>{
  const cv=document.createElement('canvas');cv.id='qaTowerSheet';cv.width=1200;cv.height=1050;cv.style='position:fixed;inset:0;width:1200px;height:1050px;z-index:999999;background:#17232b';document.body.append(cv);
  const c=cv.getContext('2d');return Array.from({length:30},(_,i)=>{const f=RinguArt.frame('tower',i,6,5);if(!f)return {i,missing:true};const x=i%6*200,y=Math.floor(i/6)*210,scale=Math.min(188/f.w,182/f.h);c.drawImage(f.im,x+(200-f.w*scale)/2,y+186-f.h*scale,f.w*scale,f.h*scale);c.fillStyle='white';c.font='13px sans-serif';c.fillText((i+1)+'층',x+85,y+204);return {i,w:f.w,h:f.h};});
 });
 console.log(JSON.stringify({towerCutouts}));
 assert.ok(towerCutouts.every(x=>!x.missing&&x.w>40&&x.h>80),'all thirty isolated tower silhouettes exist');
 await p.setViewportSize({width:1200,height:1050});await p.locator('#qaTowerSheet').screenshot({path:decodeURIComponent(new URL('tower-cutouts.png',out).pathname).replace(/^\//,'')});await p.evaluate(()=>document.getElementById('qaTowerSheet').remove());
 const goldNames=await p.evaluate(()=>{const g=RinguCore;g.dungeonType='gold';g.fn.renderDungeon();return g.goldDungeonStages.map((d,i)=>({name:d.name,expected:g.bossRegions[Math.floor(d.artIndex/6)].bosses[d.artIndex%6].name,label:document.querySelectorAll('.dungeon-stage strong')[i]?.textContent}));});
 console.log(JSON.stringify({goldNames}));assert.equal(goldNames.length,20);assert.ok(goldNames.every(d=>d.name===d.expected&&d.label.includes(d.name)));
 for(const stage of [1,10,20]){
  await p.evaluate(stage=>{const g=RinguCore;g.activeDungeon={type:'gold',stage,hp:1000000000,maxHp:1000000000,elapsed:0};g.fn.renderDungeonBattle();},stage);
  await p.waitForFunction(stage=>document.getElementById('dungeonBossArt').dataset.enemyImage==='monsters:'+(stage-1),stage);
  assert.equal(await p.locator('#dungeonBossArt').getAttribute('data-enemy-image'),'monsters:'+(stage-1));
  assert.ok(await p.locator('#dungeonBattleTitle').textContent().then(x=>x.includes(goldNames[stage-1].name)));
 }
 await p.evaluate(()=>{RinguCore.activeDungeon=null;RinguCore.fn.closeDungeon();});
 await p.setViewportSize({width:1440,height:900});await p.locator('#rmFeatureNav').screenshot({path:decodeURIComponent(new URL('menu-plaques.png',out).pathname).replace(/^\//,'')});
 checks.push({towerCutouts,goldNames});
 const attacks=await p.evaluate(()=>{
 const g=RinguCore,s=g.state,result=[];function check(label){g.fn.renderAll();const value=g.fn.getPlayerStats().attack,display=document.getElementById('rmPortraitAttack').textContent;result.push({label,value,power:g.fn.getPower(),display,gear:g.fn.getPlayerStats().equipmentAtk});}
 check('pet-equipped');unequipPet();check('pet-unequipped');equipPet('qa-pet-1');check('pet-reequipped');levelUpPet('qa-pet-1');check('pet-level-up');
 const it={id:s.uid++,slot:'무기',rarity:0,name:g.fn.itemName('무기',0,0),baseAtk:g.fn.fixedBaseAtk('무기',0,0),enhance:0,transcend:0,optionRolls:[1,1]};
 s.inventory.push(it);s.equipped['무기']=it.id;check('weapon');it.enhance=5;check('enhanced');it.transcend=1;check('transcended');s.ownedAuras=[0];s.equippedAura=0;check('aura');return result;});
 for(const x of attacks){assert.equal(x.power,x.value);assert.equal(x.display,'⚔ 공격력 '+x.value.toLocaleString('en-US'));}checks.push({attacks});
 const immediate=await p.evaluate(()=>{unequipPet();const off=document.getElementById('rmPortraitAttack').textContent;equipPet('qa-pet-1');return {off,on:document.getElementById('rmPortraitAttack').textContent,expected:'⚔ 공격력 '+RinguCore.fn.getPower().toLocaleString('en-US')}});assert.equal(immediate.on,immediate.expected);assert.notEqual(immediate.off,immediate.on);
 await p.evaluate(()=>{const cv=document.createElement('canvas');cv.id='qaMonsters';cv.width=1200;cv.height=1200;cv.style='position:fixed;inset:0;width:1200px;height:1200px;z-index:999999;background:#17232b';document.body.append(cv);const c=cv.getContext('2d');RinguArt.monsterFrames.forEach((im,i)=>{const x=i%6*200,y=Math.floor(i/6)*200;RinguArt.monster(c,i,x+100,y+174,184,160);c.fillStyle='white';c.font='14px sans-serif';c.fillText(RinguCore.bossRegions[Math.floor(i/6)].bosses[i%6].name,x+12,y+193);});});
 await p.setViewportSize({width:1200,height:1200});await p.locator('#qaMonsters').screenshot({path:decodeURIComponent(new URL('all-monsters.png',out).pathname).replace(/^\//,'')});await p.evaluate(()=>document.getElementById('qaMonsters').remove());
 await p.evaluate(()=>{const cv=document.createElement('canvas');cv.id='qaSheet';cv.width=1500;cv.height=1000;cv.style='position:fixed;inset:0;width:1500px;height:1000px;z-index:999999;background:#17232b';document.body.append(cv);const c=cv.getContext('2d');for(let gender=0;gender<2;gender++)for(let i=0;i<5;i++){const g=RinguCore,it={slot:'무기',rarity:i===4?5:0,name:g.fn.itemName('무기',i===4?5:0,[0,3,6,7,0][i])};RinguArt.hero(c,{...g.state,playerGender:gender?'female':'male',equippedAura:-1,equippedPet:null},{'무기':it},g.fn.itemIndex,0,i*300+150,gender*500+470,420);}});
 await p.setViewportSize({width:1500,height:1000});await p.locator('#qaSheet').screenshot({path:decodeURIComponent(new URL('weapon-poses.png',out).pathname).replace(/^\//,'')});await p.evaluate(()=>document.getElementById('qaSheet').remove());
 for(let region=0;region<6;region++){await p.evaluate(region=>{RinguCore.state.regionIndex=region;RinguCore.fn.renderBosses();},region);assert.equal(await p.locator('#bossList img.rm-monster-icon').count(),6);assert.equal(await p.locator('#bossList img').evaluateAll(list=>list.every(im=>im.complete&&im.naturalWidth>0)),true);}
 checks.push('36 isolated monster image elements loaded');
 const sockets=await p.evaluate(()=>{const g=RinguCore,rows=[];for(let grade=0;grade<7;grade++)for(let i=0;i<(grade===6?2:10);i++)for(const gender of ['male','female']){const cv=document.createElement('canvas');cv.width=640;cv.height=780;const it={slot:'무기',rarity:grade,name:g.fn.itemName('무기',grade,i)},socket=RinguArt.weaponSocket(it,g.fn.itemIndex);RinguArt.hero(cv.getContext('2d'),{playerGender:gender,equippedAura:-1},{'무기':it},g.fn.itemIndex,0,320,710,640);const pixels=cv.getContext('2d').getImageData(0,0,640,780).data;let edges=0;for(let y=0;y<780;y++)if(pixels[y*640*4+3]>64||pixels[(y*640+639)*4+3]>64)edges++;rows.push({grade,i,gender,alpha:socket.pivotAlpha,edges});}return rows;});await writeFile(new URL('weapon-sockets.json',out),JSON.stringify(sockets,null,2));checks.push({weaponCases:sockets.length,edgeFailures:sockets.filter(x=>x.edges>0),transparentPivots:sockets.filter(x=>!x.alpha)});
 for(const count of [5,10]){
 await p.evaluate(count=>{const g=RinguCore;g.state.gold=100000;g.state.discovered={};const orig=g.fn.makeItem;g.fn.makeItem=()=>({id:g.state.uid++,slot:'무기',rarity:0,name:g.fn.itemName('무기',0,0),baseAtk:16,enhance:0,transcend:0});g.fn.drawItems(count);g.fn.makeItem=orig;},count);
 for(const width of [320,360,390,412,768,1440]){await p.setViewportSize({width,height:600});const columns=await p.locator('#drawResultGrid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);assert.equal(columns,5);assert.equal(await p.locator('.rm-drop-card').count(),count);await p.locator('#drawResultModal .modal-actions button').scrollIntoViewIfNeeded();}
 await p.locator('#drawResultModal .modal-actions button').click();}checks.push('5/10 summon, six widths, confirmation reachable');
 await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{RinguCore.state.sfxOn=true;RinguCore.state.bgmOn=false;RinguAudio.mix();});
 await p.locator('[data-target="character"]').click();await p.waitForTimeout(70);
 let n=await p.evaluate(()=>RinguAudio.diagnostics.events.filter(x=>x==='click').length);await p.locator('[data-target="inventory"]').focus();await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>RinguAudio.diagnostics.events.filter(x=>x==='click').length),n+1);
 const sfx=await p.evaluate(()=>{RinguCore.fn.playHitSound(false);RinguCore.fn.playHitSound(true);RinguCore.fn.playDefeatSound();return RinguAudio.diagnostics.events.slice(-3)});assert.deepEqual(sfx,['hit','critical','reward']);
 await p.waitForTimeout(70);n=await p.evaluate(()=>RinguAudio.diagnostics.events.filter(x=>x==='click').length);await p.locator('[data-target="character"]').tap();assert.equal(await p.evaluate(()=>RinguAudio.diagnostics.events.filter(x=>x==='click').length),n+1);
 await p.evaluate(()=>{const b=document.createElement('button');b.id='qaDynamic';b.textContent='동적 테스트';b.style='position:fixed;top:200px;left:0;z-index:999999';document.body.append(b);});await p.waitForTimeout(70);n=await p.evaluate(()=>RinguAudio.diagnostics.events.filter(x=>x==='click').length);await p.locator('#qaDynamic').click();assert.equal(await p.evaluate(()=>RinguAudio.diagnostics.events.filter(x=>x==='click').length),n+1);
 await p.evaluate(()=>{document.getElementById('qaDynamic').disabled=true;document.getElementById('qaDynamic').dispatchEvent(new MouseEvent('click',{bubbles:true}));});assert.equal(await p.evaluate(()=>RinguAudio.diagnostics.events.filter(x=>x==='click').length),n+1);await p.evaluate(()=>document.getElementById('qaDynamic').remove());
 await p.evaluate(()=>{RinguCore.state.sfxOn=false;RinguAudio.mix();});const before=await p.evaluate(()=>RinguAudio.diagnostics.events.length);await p.locator('[data-target="character"]').click();assert.equal(await p.evaluate(()=>RinguAudio.diagnostics.events.length),before);checks.push('keyboard/touch/dynamic click once; disabled silent; hit/critical/reward distinct; muted no events');
 for(const width of [320,360,390,412,768,1440]){
 await p.setViewportSize({width,height:620});
 for(const [open,close] of [['openTower','closeTower'],['openDungeon','closeDungeon'],['openAuraShop','closeAuraShop'],['openCollection','closeCollection'],['openSettings','closeSettings'],['openProfile','closeProfile'],['openPetPanel','closePetPanel'],['openItemInventory','closeItemInventory'],['openMailbox','closeMailbox']]){
 const exists=await p.evaluate(open=>typeof window[open]==='function',open);if(!exists){checks.push('not exposed: '+open);continue;}await p.evaluate(open=>window[open](),open);await p.waitForTimeout(25);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'overflow '+open+' '+width);await p.evaluate(close=>{if(typeof window[close]==='function')window[close]();else document.querySelectorAll('.modal-bg.show').forEach(el=>el.classList.remove('show'));},close);
 }}
 checks.push('nine modal families opened/closed at six widths, no document overflow');
 for(const count of [0,1,12]){await p.evaluate(count=>{const s=RinguCore.state,id=Object.keys(PET_DATA).sort()[0];s.ownedPets=Array.from({length:count},(_,i)=>({uid:'layout-pet-'+i,petId:id,level:1,locked:!!(i%2)}));s.equippedPet=count?'layout-pet-0':null;PET_DATA[id].name='아주 긴 이름을 가진 고대의 숲 수호 토끼';openPetPanel();},count);
 for(const width of [320,390,768]){await p.setViewportSize({width,height:480});assert.equal(await p.evaluate(()=>document.getElementById('petBody').scrollWidth>document.getElementById('petBody').clientWidth+1),false);const buttons=await p.locator('.pet-management .pet-actions button').evaluateAll(list=>list.map(el=>({h:el.getBoundingClientRect().height,whiteSpace:getComputedStyle(el).whiteSpace})));assert.ok(buttons.every(b=>b.h>=44&&b.whiteSpace==='nowrap'));}
 await p.evaluate(()=>closePetPanel());}checks.push('0/1/12 pets, long names, narrow/short viewport, 44px buttons');
 await p.setViewportSize({width:844,height:390});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.setViewportSize({width:1440,height:900});
 await p.evaluate(()=>{RinguCore.state.sfxOn=true;RinguCore.state.bgmOn=false;RinguAudio.mix();RinguCore.fn.stopBgm();});
 for(const success of [true,false]){
 const start=await p.evaluate(success=>{const g=RinguCore,it=g.state.inventory[0];it.enhance=5;it.transcend=0;g.state.gold=100000;g.state.useProtect=false;g.fn.openEnhance(it.id);const before=g.state.gold,cost=g.fn.enhanceCost(it),old=Math.random;Math.random=()=>success?0:.999999;try{g.fn.tryEnhance();g.fn.tryEnhance();}finally{Math.random=old;}const hammer=document.querySelector('.enhance-hammer');for(const a of hammer.getAnimations()){a.pause();a.currentTime=140;}return {before,cost,after:g.state.gold,animation:getComputedStyle(hammer).animationName,background:getComputedStyle(hammer).backgroundImage};},success);
 assert.equal(start.after,start.before-start.cost,'charge once despite double activation');assert.equal(start.animation,'rm-forge-hammer');assert.ok(start.background.includes('forge-hammer-v1.webp'));assert.equal(await p.locator('#enhanceBtn').isDisabled(),true);
 if(success)await p.locator('#enhanceStage').screenshot({path:decodeURIComponent(new URL('forge-strike.png',out).pathname).replace(/^\//,'')});
 await p.waitForFunction(()=>!RinguCore.enhanceBusy);assert.equal(await p.evaluate(()=>RinguCore.state.inventory[0].enhance),success?6:4);assert.equal(await p.evaluate(()=>RinguAudio.diagnostics.events.at(-1)),success?'forge-success':'forge-failure');await p.evaluate(()=>RinguCore.fn.closeEnhance());
 }
 checks.push('forge success/failure, two-strike animation, distinct result sounds, double-charge prevention');
 await p.waitForTimeout(6000);assert.equal(await p.evaluate(()=>RinguAudio.diagnostics.voices),0);checks.push('audio voices return to zero');
 await p.evaluate(async()=>{RinguCore.state.gold=2468;RinguCore.fn.save();await RinguSession.flush();});await reload(p);assert.equal(await p.evaluate(()=>RinguCore.state.gold),2468);checks.push('isolated account save/reload preserved gold');
 }
 const metrics=await p.evaluate(()=>({power:RinguCore.fn.getPower(),stats:RinguCore.fn.getPlayerStats().attack,portrait:document.getElementById('rmPortraitAttack')?.textContent,petBase:PET_DATA[Object.keys(PET_DATA).sort()[0]].baseStats.attack,overflow:document.documentElement.scrollWidth>innerWidth,monsterFrames:RinguArt.monsterFrames.length}));
 await writeFile(new URL('metrics.json',out),JSON.stringify({metrics,checks,errors},null,2));console.log(JSON.stringify({metrics,checks,errors}));assert.deepEqual(errors,[]);
}finally{await browser.close();server.close();await db.close();}
