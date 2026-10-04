import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {writeFile,mkdir,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import assert from 'node:assert/strict';
import {arenaView} from '../rebirth/arena-ui.mjs';
import {buildBot,botScore,arenaProfile,simulateArena} from '../rebirth/arena-model.mjs';
import {botName} from '../rebirth/arena-names.mjs';
import {fantasyHeader} from '../rebirth/fantasy-ui.mjs';
const self=buildBot({id:1,classId:'warrior'});self.name='도현';self.gold=8787764;
const top100=Array.from({length:100},(_,i)=>({id:`bot:${i+1}`,name:botName(i+1),classId:['warrior','mage','archer','rogue','pirate','priest'][i%6],score:botScore(i+1),rank:i+1}));
const offers=[['priest',1],['mage',2],['warrior',3],['rogue',4]].map(([cls,n])=>arenaProfile(buildBot({id:n,classId:cls}),botScore(n),n,`bot:${n}`));
const data={score:1250,rank:1100,offers,top100,seasonEndsAt:new Date(Date.now()+7200000).toISOString(),nextRefreshAt:new Date(Date.now()+7200000).toISOString(),history:[]};
const enemy=buildBot({id:1,classId:'priest'}),result={self:arenaProfile(self,1250,1100,'self'),opponent:arenaProfile(enemy,3000,1,'bot:1'),battle:simulateArena(self,enemy,'qa'),delta:120,scoreAfter:1370};
const output=process.env.ARENA_QA_DIR||join(tmpdir(),'ringu-arena-polish-qa');await mkdir(output,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=new URL(req.url,'http://127.0.0.1').pathname;const data=await readFile('.'+path);res.setHeader('Content-Type',path.endsWith('.mjs')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.html')?'text/html':path.endsWith('.svg')?'image/svg+xml':'application/octet-stream');res.end(data);}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.ARENA_BROWSER?{executablePath:process.env.ARENA_BROWSER}:{})});
try{
 for(const screen of ['home','opponents','ranking','battle','result','rewards']){
  const html=arenaView({data:screen==='home'?{...data,score:null,rank:null}:data,page:screen,self,battle:result});
  const footer=['battle','result'].includes(screen)?'':`<nav class="pvp-dock" aria-label="아레나 하단 메뉴"><button data-illustrated="1" data-action="tab" data-arg="hunt"><span class="pvp-dock-icon" aria-hidden="true">⌂</span><span>홈</span></button><button data-illustrated="1" data-action="arenaOpen" class="active"><img src="ui/arena-emblem.svg" alt=""><span>아레나</span></button><button data-illustrated="1" data-action="tab" data-arg="gear"><span class="pvp-dock-icon" aria-hidden="true">▣</span><span>가방</span></button><button data-illustrated="1" data-action="gameMenu"><span class="pvp-dock-icon" aria-hidden="true">☰</span><span>메뉴</span></button></nav>`;
  const styles=['style','adventure','priest-raid','journey-mobile','fantasy-theme','arena'].map(s=>`<link rel="stylesheet" href="${s}.css">`).join('');
  await writeFile('rebirth/arena-polish-preview.html',`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles}<body><div class="shell fantasy-shell">${fantasyHeader(self,'arena').replaceAll(/file:[^"']+gold.svg/g,'currencies/gold.svg')}<div class="fantasy-player-strip"><span>도현 · Lv.200 전사</span><span>전투력 26,507</span></div><main class="fantasy-content" data-screen="arena">${html}</main>${footer}</div><script type="module">import {installPortraitIsolation} from './portrait-isolation.mjs';import {installMenuIcons} from './menu-icons.mjs';import {startArenaReplay} from './arena-ui.mjs';installPortraitIsolation();installMenuIcons();window.replay=()=>startArenaReplay(${JSON.stringify(result)},()=>{});window.ready=true;</script></body></html>`);
  const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}/rebirth/arena-polish-preview.html`);await page.waitForFunction(()=>window.ready);await page.waitForTimeout(850);
  assert.deepEqual(errors,[]);
  for(const width of [320,360,390,430,768]){
   await page.setViewportSize({width,height:844});assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=width,`${screen} overflow at ${width}`);
   assert.equal(await page.locator('.pvp-screen button>.menu-art').count(),0);
   assert.equal(await page.locator('.pvp-screen button').first().evaluate(b=>getComputedStyle(b,'::before').content), 'none');
  }
  await page.setViewportSize({width:390,height:844});
  if(screen==='home')assert.equal(await page.locator('.pvp-crest img').evaluate(im=>im.complete&&im.naturalWidth>0),true);
  if(screen==='opponents')assert.equal(await page.locator('.pvp-opponent').count(),4);
  if(screen==='ranking')assert.equal(await page.locator('.pvp-ranking-row').count(),100);
  if(screen==='battle'){
   await page.evaluate(()=>window.controller=window.replay());
   await page.waitForFunction(()=>document.querySelector('[data-arena-log]')?.textContent.includes('시전'),{},{timeout:10000});
   assert((await page.locator('[data-arena-log]').innerText()).includes('시전'));
   assert.deepEqual(errors,[]);
   await page.evaluate(()=>window.controller.stop());
  }
  await page.screenshot({path:`${output}/${screen}.png`,fullPage:screen!=='ranking'});await page.close();
 }
 console.log('PASS six screens at 320/360/390/430/768px, no overflow, no automatic menu decorations, loaded crest and live replay.');
}finally{await browser.close();await new Promise(r=>server.close(r));await unlink('rebirth/arena-polish-preview.html').catch(()=>{});}
