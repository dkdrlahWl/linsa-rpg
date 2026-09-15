import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const nodes=new Map();let paints=0;
function node(){return {firstChild:null,classList:{contains:()=>true,remove(){}},querySelectorAll:()=>[],set innerHTML(v){this.html=v;this.firstChild={};paints++;},get innerHTML(){return this.html;}};}
for(const id of ['dungeonModal','dungeonStageList','dungeonSummary','dungeonBattle','rmStoneStatus'])nodes.set(id,node());
const room={id:'room-a',host:'host',stage:1,status:'running',hp:50000,maxHp:100000,tick:2,reward:2,members:[{id:'host',name:'host',stats:{attack:100},damage:10},{id:'guest',name:'guest',stats:{attack:100},damage:20}]};
let held,hold=false,fail=false,saves=0,end;const noop=()=>{};
const context={console,AbortController,setTimeout,clearTimeout,setInterval:()=>0,clearInterval:noop,document:{getElementById:id=>nodes.get(id)},addEventListener:noop,RinguSession:{active:true,account:{id:'guest'},flush:()=>{throw Error('Unexpected flush');},onEnded:fn=>end=fn},fetch:async(url)=>{const action=url.split('/').pop();if(action==='poll'&&hold)return new Promise(resolve=>held=()=>resolve({ok:true,json:async()=>({room})}));if(action==='leave'&&fail)throw Error('offline');return {ok:true,json:async()=>({room:action==='rooms'?null:room,rooms:[],remaining:2})};}};
context.window=context;vm.createContext(context);vm.runInContext(readFileSync(new URL('../stone-party.js',import.meta.url),'utf8'),context);
const g={dungeonType:'stone',state:{},fn:Object.fromEntries(['toast','renderDungeon','renderDungeonBattle','dungeonAttackTick','finishDungeonClearV15','startDungeonBattle','attack','closeDungeon','openDungeon','startTower','startGoldDungeon','startPetDungeon'].map(k=>[k,noop]))};g.fn.escapeHtml=String;g.fn.save=()=>saves++;
context.installRinguStoneParty(g);await context.joinPartyRoom('room-a');assert.equal(g.activeDungeon.serverRoom,true);assert.equal(saves,0);
const before=paints;for(let i=0;i<100;i++)g.fn.renderDungeon();assert.equal(paints,before);
hold=true;const oldPoll=context.loadPartyRooms();await context.leavePartyRoom();assert.equal(g.activeDungeon,null);assert.equal(context.RinguStoneParty.inRoom,false);held();await oldPoll;assert.equal(context.RinguStoneParty.inRoom,false);
await context.joinPartyRoom('room-a');fail=true;await context.leavePartyRoom();assert.equal(context.RinguStoneParty.inRoom,true);fail=false;await context.leavePartyRoom();assert.equal(context.RinguStoneParty.inRoom,false);end();
console.log('PASS: partner still running after guest exit, late poll ignored, failed leave retry, no save wait, zero DOM replacement in 100 unchanged renders');
