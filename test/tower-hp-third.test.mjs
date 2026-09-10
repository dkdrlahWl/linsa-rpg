// TH3: synthetic states only; no network or player accounts.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import vm from 'node:vm';
import {execute,initialState,balance} from '../supabase/functions/_shared/economy.mjs';
const NOW=Date.UTC(2026,8,10,10);
const OLD_HP=[7500,12000,18000,27000,37500,51000,67500,87000,105000,127500,157500,187500,217500,247500,285000,322500,360000,405000,450000,495000,540000,585000,630000,690000,750000,780000,810000,840000,870000,900000];
const run=(s,c='sync',args={},now=NOW)=>execute(s,c,args,{now,random:()=>.99,itemIds:[],uuid:randomUUID,adminFloor:0,costumePercent:0});
const seed=floor=>({...initialState(NOW),autoBattle:false,towerCleared:floor-1});
test('TH3: all thirty server HP values are exactly one-third; unrelated balance unchanged',()=>{
 assert.equal(balance.towerFloors.length,30);
 for(const [i,f] of balance.towerFloors.entries())assert.equal(f.hp,OLD_HP[i]/3);
 const restored=structuredClone(balance);for(const f of restored.towerFloors)f.hp*=3;
 assert.equal(createHash('sha256').update(JSON.stringify(restored)).digest('hex'),'af3880971cbc92cd74ebe74627a72375d6bbde5a362ed151f2a04b99f7539699');
});
test('TH3: final frontend override and server match on every floor, including rewards',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const table=html.match(/const RINGU_TOWER_BALANCE_V2=(\[[\s\S]*?\n\]);/);assert.ok(table);
 const line=html.split('\n').find(l=>l.startsWith('towerFloors.splice(0,towerFloors.length,...RINGU_TOWER_BALANCE_V2.map'));
 assert.ok(line);const ctx={towerFloors:[],RINGU_TOWER_BALANCE_V2:JSON.parse(table[1]),RINGU_TOWER_NAMES_V2:balance.towerFloors.map(f=>f.name)};
 vm.runInNewContext(line,ctx);
 const actual=JSON.parse(JSON.stringify(ctx.towerFloors));for(const f of actual)f.gold*=10;
 assert.deepEqual(actual,balance.towerFloors);
});
test('TH3: all thirty actual starts use reduced HP and do not divide twice',()=>{
 for(const f of balance.towerFloors){const s=seed(f.floor),before=structuredClone(s);let r=run(s,'startDungeon',{type:'tower',stage:f.floor});
 assert.deepEqual(s,before);assert.equal(r.state.serverBattle.hp,f.hp);assert.equal(r.state.serverBattle.hpVersion,'TH3');
 r=run(r.state);assert.equal(r.state.serverBattle.hp,f.hp);assert.equal(r.state.serverBattle.elapsed,0);
 }
});
test('TH3: ongoing old fights migrate once, retain timer and do not award or heal',()=>{
 for(const f of balance.towerFloors){const s=seed(f.floor);s.serverBattle={type:'tower',stage:f.floor,hp:OLD_HP[f.floor-1]-333,elapsed:4,lastTick:NOW};
 const first=run(s),b=first.state.serverBattle;assert.equal(b.hp,Math.floor(s.serverBattle.hp/3));assert.equal(b.elapsed,4);assert.equal(b.lastTick,NOW);assert.equal(first.state.towerCleared,s.towerCleared);assert.equal(first.state.gold,0);assert.deepEqual(first.events,[]);
 const again=run(first.state);assert.deepEqual(again.state.serverBattle,b);
 const tick=run(again.state,'sync',{},NOW+1000);assert.equal(tick.state.serverBattle.hp,b.hp-50);assert.equal(tick.state.serverBattle.elapsed,5);
 }
});
test('TH3: low remaining HP rounds to one, cancellation works, unrelated battles stay intact',()=>{
 const s=seed(1);s.serverBattle={type:'tower',stage:1,hp:2,elapsed:14,lastTick:NOW};assert.equal(run(s).state.serverBattle.hp,1);assert.equal(run(s,'cancelBattle').state.serverBattle,null);
 for(const type of ['gold','pet']){const x=seed(1);x.serverBattle={type,stage:1,hp:1000,elapsed:3,lastTick:NOW};assert.deepEqual(run(x).state.serverBattle,x.serverBattle);}
});
test('TH3: thirty wins keep exact rewards, sequential access and no duplicate payouts',()=>{
 for(const f of balance.towerFloors){const s=seed(f.floor);s.inventory=[{...balance.gear[0],id:1,baseAtk:1000000,enhance:0,optionRolls:[1,1]}];s.equipped['무기']=1;
 let r=run(s,'startDungeon',{type:'tower',stage:f.floor});r=run(r.state,'sync',{},NOW+1000);
 assert.equal(r.state.towerCleared,f.floor);assert.equal(r.state.serverBattle,null);
 for(const [key,col] of [['gold','gold'],['essence','essence'],['transcendStone','stone'],['downgradeProtect','protect'],['petStone','petStone']])assert.equal(r.state[key],f[col]||0);
 const again=run(r.state,'sync',{},NOW+1000);assert.deepEqual(again.state,r.state);
 assert.throws(()=>run(r.state,'startDungeon',{type:'tower',stage:f.floor},NOW+1000),/DUNGEON_LOCKED/);
 }
 assert.throws(()=>run(seed(1),'startDungeon',{type:'tower',stage:2}),/DUNGEON_LOCKED/);
 assert.throws(()=>run(seed(1),'startDungeon',{type:'tower',stage:1,hp:1}),/INVALID_ARGUMENTS/);
});
