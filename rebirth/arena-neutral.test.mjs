// node rebirth/arena-neutral.test.mjs — 2026-11-09 아레나: 직업 특성 제거 + 공통 스킬 틱이면 같은 장비·같은 잠재에서 직업 승률이 모두 50%±12%
import assert from 'node:assert/strict';
import {simulateArena,ARENA_CLASSES} from './arena-model.mjs';
import {arenaPower,ARENA_NEUTRAL_CLASSES,ARENA_UNIFORM_SKILLS} from './arena-balance.mjs';
import {initialState,makeItem} from './engine.mjs';
import {CLASSES,rollBaseStats,bossTierCount} from './data.mjs';
assert.ok(ARENA_NEUTRAL_CLASSES&&ARENA_UNIFORM_SKILLS);
let serial=0;
function build(classId,lines){const ctx={now:0,random:()=>.999999,uuid:()=>'p'+(++serial)},cl=CLASSES.find(c=>c.id===classId),s=initialState(classId,'완벽200',ctx);Object.assign(s,{level:300,firstAdvancement:true,advancement:6,items:[],equipped:{},name:classId});s.stats[cl.stat]=4+299*5;for(let slot=0;slot<9;slot++){const i=makeItem(200,classId,slot,true,ctx,2);Object.assign(i,{design:2,stars:25,grade:5,potentialVersion:5,potentialUnlocked:true,bonusPct:5});i.bossTier=bossTierCount(i)-1;i.baseStats=rollBaseStats(i,()=>.999999);i.lines=lines.slice(slot*3,slot*3+3).map(key=>({key,value:key==='boss'?35:12,grade:5}));s.items.push(i);s.equipped[slot]=i.id;}return s;}
const mix=(a,h,c)=>[...Array(a).fill('attack'),...Array(h).fill('hp'),...Array(c).fill('crit')];
// 1) 같은 장비면 직업과 무관하게 아레나 스탯이 같다(주스탯·치피·크리·공속·HP).
for(const lines of [mix(27,0,0),mix(9,12,6)]){const ps=ARENA_CLASSES.map(c=>arenaPower(build(c,lines)));for(const p of ps){assert.ok(Math.abs(p.attack-ps[0].attack)<2);assert.ok(Math.abs(p.hp-ps[0].hp)<4);assert.equal(p.cadence,1);assert.ok(Math.abs(p.critDamage-ps[0].critDamage)<1e-9);assert.ok(Math.abs(p.crit-ps[0].crit)<1e-9);}}
// 2) 직업별 승률 50%±12% (두 세팅, N=12)
const N=30,wr=(a,b)=>{let w=0;for(let s=0;s<N;s++)w+=simulateArena(a,b,`${a.name}-${b.name}-${s}`).won?1:0;return w/N;};
for(const lines of [mix(27,0,0),mix(12,9,6)]){const v=ARENA_CLASSES.map(c=>build(c,lines));const t={};for(const a of v)for(const b of v){if(a===b)continue;t[a.name]=(t[a.name]||0)+(wr(a,b)+1-wr(b,a))/2;}for(const c of ARENA_CLASSES){const r=t[c]/5;assert.ok(r>.36&&r<.64,`${c} ${r}`);}}
// 3) 전투는 모든 스킬이 한 바퀴 돌 정도로 길다(10초 이상)
const r=simulateArena(build('warrior',mix(27,0,0)),build('mage',mix(27,0,0)),'len');assert.ok(r.duration>=10000,String(r.duration));
console.log('PASS arena neutral');
