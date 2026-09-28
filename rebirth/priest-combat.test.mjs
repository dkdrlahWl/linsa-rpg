import assert from 'node:assert/strict';
import {fixture,setLines} from './priest-balance.mjs';
import {power} from './engine.mjs';
import {startCoop,advanceCoopRaw} from './coop-model.mjs';
import {newTowerBattle,towerStep} from './tower-model.mjs';
const p=power(setLines(fixture('priest'),{hp:27}));
for(const mode of ['rift','raid','wave','advancement'])for(const [bits,kind] of [[2,'heal'],[16,'shield'],[64,'sanctuary']]){
 let w=startCoop({id:'test',mode,tier:0,status:'waiting',members:[{id:'p',classId:'priest',power:p,advanced:true,advancement:3},{id:'a',classId:'warrior',power:{...p,hp:p.hp*2},advanced:true}]},0);
 w.entryWaiting=false;w.started=0;w.hp=w.maxHp=1e12;w.nextBasic=w.nextPattern=w.nextCorruption=w.nextJudgment=1e9;
 for(const m of w.members)Object.assign(m,{hp:1,x:1600,y:1600});
 if(w.enemy)Object.assign(w.enemy,{x:1600,y:600});
 if(w.monsters)w.monsters=[];
 w=advanceCoopRaw(w,'p',null,100,[{tick:0,user:'p',input:[0,0,bits]}]);
 const a=w.members[1];
 if(kind==='heal')assert.equal(a.hp,1+Math.round(p.hp*.2),mode+' immediate heal');
 if(kind==='shield'){assert.equal(a.shield,Math.round(p.hp*.25),mode+' shield');assert.equal(a.shieldPermanent,true);}
 if(kind==='sanctuary'){assert.equal(a.hp,1+p.hp,mode+' initial sanctuary heal');assert.equal(a.holyReductionUntil,mode==='advancement'?81:80);}
}
for(const [bits,kind] of [[2,'heal'],[16,'shield'],[64,'sanctuary']]){
 const b=newTowerBattle(10,'priest',p,0,'test',1,true);b.hp=1;b.enemyHp=1e12;b.nextPattern=1e9;
 towerStep(b,[0,0,bits]);
 if(kind==='heal')assert.equal(b.hp,1+Math.round(p.hp*.2));
 if(kind==='shield'){assert.equal(b.shield,Math.round(p.hp*.25));assert.equal(b.shieldPermanent,true);}
 if(kind==='sanctuary')assert.equal(b.hp,p.hp);
}
console.log('PASS real combat integration: tower, rift, raid, wave, advancement co-op');
