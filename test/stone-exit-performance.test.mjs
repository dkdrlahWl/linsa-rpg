import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true});
try {
 const page=await browser.newPage();
 await page.setContent('<div id="dungeonModal" class="show"><div id="dungeonSummary"></div><div id="dungeonBattle"></div><div id="dungeonStageList"></div></div>');
 await page.evaluate(()=>{
  window.calls=[];window.held=[];window.holdPoll=false;window.failLeave=false;window.saves=0;
  window.fixture={id:'room-a',host:'host',stage:1,status:'running',hp:50000,maxHp:100000,tick:2,reward:2,members:[{id:'host',name:'방장',stats:{attack:100},damage:10},{id:'guest',name:'손님',stats:{attack:100},damage:20}]};
  window.fetch=async(url,opts={})=>{const action=url.split('/').pop();calls.push(action);if(action==='poll'&&holdPoll)return new Promise(resolve=>held.push(()=>resolve({ok:true,json:async()=>({room:fixture})})));if(action==='leave'&&failLeave)throw Error('연결 실패');return {ok:true,json:async()=>({room:action==='rooms'?null:fixture,rooms:[],remaining:2})};};
  window.RinguSession={active:true,account:{id:'guest'},flush:()=>{throw Error('must not wait for saves');},onEnded:fn=>window.end=fn};
  const noop=()=>{};window.g={dungeonType:'stone',state:{},stoneDungeonStages:[],fn:{escapeHtml:String,save:()=>saves++,toast:noop,renderDungeon:noop,renderDungeonBattle:noop,dungeonAttackTick:noop,finishDungeonClearV15:noop,startDungeonBattle:noop,attack:noop,closeDungeon:noop,openDungeon:noop,startTower:noop,startGoldDungeon:noop,startPetDungeon:noop}};
 });
 await page.addScriptTag({path:new URL('../stone-party.js',import.meta.url).pathname});
 await page.evaluate(()=>installRinguStoneParty(g));
 await page.evaluate(()=>joinPartyRoom('room-a'));
 assert.equal(await page.evaluate(()=>g.activeDungeon?.serverRoom),true);
 assert.equal(await page.evaluate(()=>saves),0);
 // Repeated economy paints must preserve the existing buttons and DOM.
 assert.equal(await page.evaluate(()=>{const node=document.querySelector('[data-stone="leave"]');for(let i=0;i<100;i++)g.fn.renderDungeon();return node===document.querySelector('[data-stone="leave"]');}),true);
 // Hold an old poll across leave; a late response must not revive the room.
 await page.evaluate(()=>{holdPoll=true;void loadPartyRooms();});
 await page.waitForFunction(()=>held.length>0);
 await page.evaluate(()=>leavePartyRoom());
 assert.equal(await page.evaluate(()=>g.activeDungeon),null);
 assert.equal(await page.locator('[data-stone="create"]').count(),6);
 await page.evaluate(async()=>{held.forEach(fn=>fn());await Promise.resolve();});
 assert.equal(await page.evaluate(()=>RinguStoneParty.inRoom),false);
 // A rejected leave keeps server membership and enables retry.
 await page.evaluate(()=>joinPartyRoom('room-a'));
 await page.evaluate(()=>{failLeave=true;return leavePartyRoom();});
 assert.equal(await page.evaluate(()=>RinguStoneParty.inRoom),true);
 assert.equal(await page.locator('[data-stone="leave"]').isEnabled(),true);
 await page.evaluate(()=>{failLeave=false;return leavePartyRoom();});
 assert.equal(await page.evaluate(()=>RinguStoneParty.inRoom),false);
 await page.evaluate(()=>end());
 console.log('PASS: successful guest leave while partner runs, stale poll rejection, failed leave retry, zero save waits, stable DOM across 100 paints');
} finally {await browser.close();}
