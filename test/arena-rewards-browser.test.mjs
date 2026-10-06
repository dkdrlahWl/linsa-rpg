import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {readFile,writeFile,unlink,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {arenaView,arenaTierIcon} from '../rebirth/arena-ui.mjs';
import {initialState} from '../rebirth/engine.mjs';
import {fantasyHeader} from '../rebirth/fantasy-ui.mjs';
import {portraitStyle} from '../rebirth/costume-ui.mjs';
import * as D from '../rebirth/data.mjs';
const root=resolve('rebirth'),preview=join(root,'arena-rewards-preview.html'),out=process.env.ARENA_QA_DIR||'/tmp/ringu-arena-qa';
await mkdir(out,{recursive:true});
const self=initialState('mage','링구',{now:Date.now(),uuid:()=>crypto.randomUUID()});
const data={seasonStart:'2026-10-04T15:00:00Z',seasonEndsAt:'2026-10-11T15:00:00Z',score:1900,rank:100,seasonMatches:5,wins:5,losses:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=v=>Math.floor(Number(v)||0).toLocaleString('ko-KR');
const app=await readFile(new URL('../rebirth/app.mjs',import.meta.url),'utf8');
const start=app.indexOf('function rankings() {'),end=app.indexOf('\n}',start)+2,source=app.slice(start,end);
const fixtures=[['링구',1900,100],['김민정',450,1750],['망고',810,1400],['처음접속한모험가',null,null]].map(([name,arenaScore,arenaRank],i)=>({id:'user-'+i,name,classId:['mage','priest','rogue','archer'][i],level:180-i*10,xp:0,advancement:3,combatPower:1000000-i*1000,arenaScore,arenaRank,levelRank:i+1,combatRank:i+1,total:4,isMe:i===0}));
const renderRanking=new Function('rankingMode','rankingRows','state','rankingLoading','rankingError','rankingUpdated','D','portraitStyle','portraitPosition','header','btn','fmt','esc','arenaTierIcon',source+'\nreturn rankings();');
const ranking=mode=>renderRanking(mode,fixtures,self,false,'',Date.now(),D,portraitStyle,id=>Math.max(0,['warrior','mage','archer','rogue','pirate'].indexOf(id))*25,title=>`<h2>${title}</h2>`,(label,action,arg='',cls='')=>`<button class="${cls}" data-action="${action}" data-arg="${esc(arg)}">${label}</button>`,fmt,esc,arenaTierIcon);
const shell=content=>`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${['style.css','enhancement.css','fantasy-theme.css','priest-raid.css','arena.css'].map(s=>`<link rel="stylesheet" href="${s}">`).join('')}<body><div class="shell fantasy-shell">${fantasyHeader(self,'arena')}<main class="fantasy-content">${content}</main></div></body></html>`;
const browser=await chromium.launch({headless:true,...(process.env.ARENA_BROWSER?{executablePath:process.env.ARENA_BROWSER}:{}),args:['--no-sandbox']});
try{
 for(const width of [320,390,768]){
  const page=await browser.newPage({viewport:{width,height:844}});
  await writeFile(preview,shell(arenaView({data,page:'rewards'})));await page.goto(pathToFileURL(preview).href);
  assert.equal(await page.locator('.pvp-reward-group').count(),9);assert.equal(await page.locator('.pvp-reward-row').count(),27);
  assert((await page.locator('.pvp-reward-hero').innerText()).includes('지급 조건 달성'));
  assert((await page.locator('.pvp-reward-hero').innerText()).includes('1,500,000'));
  assert.equal(await page.locator('.pvp-reward-hero img[src*="gold"]').count(),0);
  await page.locator('.pvp-reward-group').evaluateAll(groups=>groups.forEach(g=>g.open=true));
  assert(await page.locator('.pvp-reward-row').evaluateAll(rows=>rows.every(r=>r.getBoundingClientRect().width>0)));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`rewards overflow ${width}`);
  assert(await page.locator('.pvp-reward-group summary img,.pvp-reward-heading img,.pvp-reward-amount img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
  if(width===390){await page.locator('.pvp-reward-group').evaluateAll(groups=>groups.forEach(g=>g.open=g.classList.contains('is-current')));await page.screenshot({path:join(out,'season-rewards-390.png'),fullPage:true});}
  for(const mode of ['level','combat']){
   await writeFile(preview,shell(ranking(mode)));await page.goto(pathToFileURL(preview).href);
   assert.equal(await page.locator('.rank-person .rank-arena-icon').count(),4);
   assert.equal(await page.locator('.rank-podium .rank-arena-icon').count(),3);
   assert.equal(await page.locator('.rank-my-card .rank-arena-icon').count(),1);
   assert.equal(await page.locator('.rank-person .rank-arena-icon img[src*="unranked"]').count(),1);
   assert(await page.locator('.rank-arena-icon img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0)));
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mode} ranking overflow ${width}`);
   if(width===390&&mode==='level')await page.screenshot({path:join(out,'ranking-tier-icons-390.png'),fullPage:true});
  }
  await page.close();
 }
 console.log('PASS rewards and both real ranking templates at 320/390/768px: all 27 tiers, loaded cube/crest art, participant status, name icons and no horizontal overflow.');
}finally{await browser.close();await unlink(preview).catch(()=>{});}
