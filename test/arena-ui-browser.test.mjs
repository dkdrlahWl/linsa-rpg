import {chromium} from 'playwright';
import {writeFile,unlink,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {tmpdir} from 'node:os';
import {existsSync} from 'node:fs';
import assert from 'node:assert/strict';
import {arenaView} from '../rebirth/arena-ui.mjs';
import {arenaProfile,buildBot,botScore} from '../rebirth/arena-model.mjs';
import {initialState} from '../rebirth/engine.mjs';
import {fantasyHeader} from '../rebirth/fantasy-ui.mjs';

const root=resolve('rebirth'),preview=join(root,'arena-preview.html'),output=process.env.ARENA_QA_DIR||join(tmpdir(),'ringu-arena-qa');
await mkdir(output,{recursive:true});
const self=initialState('warrior','검사',{now:0,uuid:()=>crypto.randomUUID()});
const top100=Array.from({length:100},(_,i)=>({id:`bot:${i+1}`,name:`투사${String(i+1).padStart(4,'0')}`,classId:['warrior','mage','archer','rogue','pirate','priest'][i%6],score:botScore(i+1),rank:i+1}));
const offers=[1,2,3,4].map((n)=>arenaProfile(buildBot({id:1000+n,score:1200+n}),1200+n,1000+n,`bot:${1000+n}`));
const data={score:1250,rank:1100,wins:3,losses:1,offers,top100,seasonEndsAt:new Date(Date.now()+3*86400000).toISOString(),nextRefreshAt:new Date(Date.now()+7200000).toISOString(),history:[]};
assert(arenaView({data:null,error:'서버 오류'}).includes('data-action="arenaRetry"'));
const battle={self:arenaProfile(self,1250,1100,'self'),opponent:offers[0],battle:{won:true,leftMaxHp:10000,rightMaxHp:10000,frames:[{at:0,side:0,type:'basic',damage:200,crit:false,leftHp:10000,rightHp:9800}]} ,delta:120,scoreAfter:1370};
const chrome='C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser=await chromium.launch({headless:true,...(process.env.ARENA_BROWSER||existsSync(chrome)?{executablePath:process.env.ARENA_BROWSER||chrome}:{})});
try{
 for(const [key,screen,result] of [['home','home',null],['opponents','opponents',null],['battle','battle',battle],['result','result',battle],['ranking','ranking',null],['rewards','rewards',null]]){
  const content=arenaView({data,page:screen,self,battle:result});
  const footer=['battle','result'].includes(screen)?'':'<nav class="pvp-dock"><button>⌂<span>홈</span></button><button class="active"><img src="ui/arena-emblem.svg" alt=""><span>아레나</span></button><button>▣<span>가방</span></button><button>☰<span>메뉴</span></button></nav>';
  await writeFile(preview,`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="style.css"><link rel="stylesheet" href="fantasy-theme.css"><link rel="stylesheet" href="arena.css"><body><div class="shell fantasy-shell">${fantasyHeader(self,'arena')}<div class="fantasy-player-strip"><span>검사 · Lv.1 전사</span><span>전투력 500</span></div><main class="fantasy-content" data-screen="arena">${content}</main>${footer}</div></body></html>`);
  const page=await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
  await page.goto(pathToFileURL(preview).href);await page.screenshot({path:join(output,`implemented-${key}.png`),fullPage:true});
  assert.equal(await page.locator('.fantasy-arena-entry').count(),1);
  assert.equal(await page.locator('.fantasy-arena-entry img').evaluate(img=>img.complete&&img.naturalWidth>0),true);
  assert((await page.locator('.pvp-screen').count())===1);
  if(key==='opponents'){
   assert.equal(await page.locator('.pvp-opponent').count(),4);
   assert.equal(await page.locator('.pvp-opponent button[data-action="arenaChallenge"]').count(),4);
   const text=await page.locator('.pvp-opponents').innerText();assert(!text.includes('AI')&&!text.includes('유저')&&!text.includes('장비'));
  }
  if(key==='ranking')assert.equal(await page.locator('.pvp-ranking-row').count(),100);
  if(key==='rewards'){
   assert.equal(await page.locator('.pvp-reward-group').count(),9);
   assert.equal(await page.locator('.pvp-reward-row').count(),27);
   assert((await page.locator('.pvp-reward-hero').innerText()).includes('골드'));
   assert.equal(await page.locator('.pvp-screen img[src*="gold."]').count(),0);
   await page.locator('.pvp-reward-group').evaluateAll(groups=>groups.forEach(group=>group.open=true));
  }
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=390,`${key} horizontal overflow`);
  await page.setViewportSize({width:320,height:700});
  assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=320,`${key} horizontal overflow at 320px`);
  await page.close();
 }
 console.log('PASS arena mobile UI at 320px and 390px: six screens, four clean opponent cards, top 100, 27 rewards, no gold icons or horizontal overflow.');
}finally{await browser.close();await unlink(preview).catch(()=>{});}
