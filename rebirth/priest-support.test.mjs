import assert from 'node:assert/strict';
import {beginPriest,stepPriest,supportTick,absorbDamage,holyDamage} from './priest.mjs';
const actor=(id='p',hp=10000)=>({id,classId:'priest',x:0,y:0,hp:100,power:{hp,attack:1000,level:200,firstJob:true,advancement:3},advancement:3});
const cast=(a,slot,t,members)=>{assert.ok(beginPriest(a,{x:0,y:0},t,slot));stepPriest(a,[],t,slot,()=>{});supportTick(members,t);};
{
 const p=actor(),ally=actor('ally',20000),outside={...actor('out'),x:2000},dead={...actor('dead'),hp:0};
 cast(p,2,0,[p,ally,outside,dead]);assert.equal(p.hp,2100);assert.equal(ally.hp,2100);assert.equal(outside.hp,100);assert.equal(dead.hp,0);
 cast(p,3,0,[p,ally]);cast(p,3,240,[p,ally]);assert.equal(ally.shield,5000);
 const saved=JSON.parse(JSON.stringify(ally));supportTick([saved],100000);assert.equal(saved.shield,5000);
 assert.equal(absorbDamage(saved,3000,100000),0);assert.equal(saved.shield,2000);
 assert.equal(absorbDamage(saved,2700,100001),700);assert.equal(saved.shield,0);
}
{
 const p=actor(),ally=actor('a',50000);cast(p,4,0,[p,ally]);
 for(let t=1;t<80;t++){stepPriest(p,[],t,4,()=>{});supportTick([p,ally],t);}
 assert.equal(ally.hp,4100);assert.equal(holyDamage(ally,1000,79),1100);
 ally.x=2000;supportTick([p,ally],79);assert.equal(holyDamage(ally,1000,79),1000);
 ally.x=0;supportTick([p,ally],79);assert.equal(holyDamage(ally,1000,79),1100);
 supportTick([p,ally],80);assert.equal(holyDamage(ally,1000,80),1000);
}
{
 const p=actor(),ally=actor('a',50000);cast(p,5,0,[p,ally]);assert.equal(ally.hp,10100);assert.equal(p.hp,10000);
 for(let t=1;t<80;t++){stepPriest(p,[],t,5,()=>{});supportTick([p,ally],t);}
 assert.equal(ally.hp,10100);assert.equal(absorbDamage(ally,1000,79),850);
 ally.x=2000;supportTick([p,ally],79);assert.equal(absorbDamage(ally,1000,79),1000);
 p.x=2000;supportTick([p,ally],79);assert.equal(absorbDamage(ally,1000,79),850);
 supportTick([p,ally],80);assert.equal(absorbDamage(ally,1000,80),1000);
}
{
 const p=actor(),q=actor('q',20000),a=actor('a',50000);cast(p,4,0,[p,q,a]);cast(q,4,0,[p,q,a]);assert.equal(a.hp,1100);assert.equal(holyDamage(a,1000,0),1100);
 cast(p,3,0,[p,q,a]);cast(q,3,0,[p,q,a]);assert.equal(a.shield,7500);
 p.hp=0;q.hp=0;supportTick([p,q,a],1);assert.equal(holyDamage(a,1000,1),1000);assert.equal(a.shield,7500);
}
console.log('PASS priest: immediate 20% heal, additive persistent shields, 5% x8 healing, 10% attack aura, one 100% heal, 15% reduction, range/death/expiry and serialization');
