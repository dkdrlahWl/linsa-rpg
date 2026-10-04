import {buildBot,simulateArena,gearSpec} from '../rebirth/arena-model.mjs';
import {makeItem} from '../rebirth/engine.mjs';
import {CLASSES} from '../rebirth/data.mjs';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const jobs=['warrior','mage','archer','rogue','pirate','priest'], results=[];
const groups=[];
for(const [level,advancement,stars,grade] of [[30,0,10,3],[60,1,12,4],[100,2,15,4],[150,3,17,5],[200,4,20,5]]){
 const states=Object.fromEntries(jobs.map(job=>{const s=buildBot({id:1,classId:job,score:1800});s.level=level;s.advancement=advancement;s.firstAdvancement=true;s.stats={STR:4,DEX:4,INT:4,LUK:4};s.stats[CLASSES.find(c=>c.id===job).stat]+=5*(level-1);s.items=Array.from({length:9},(_,slot)=>{const i=makeItem(level,job,slot,true,{random:()=>.52,now:0,uuid:()=>crypto.randomUUID()},0);i.stars=stars;i.grade=grade;i.potentialUnlocked=true;i.lines=Array.from({length:2},()=>({key:job==='priest'?'hp':'attack',value:grade===5?12:grade===4?10:5,grade}));return i;});s.equipped=Object.fromEntries(s.items.map((i,slot)=>[slot,i.id]));return[job,s];}));groups.push({name:'level-'+level,states});
}
for(const score of [1200,1800,2200,2500,2600,2900,3400,4000])groups.push({name:'score-'+score,states:Object.fromEntries(jobs.map(classId=>[classId,buildBot({id:1,classId,score})]))});
for(const group of groups){
 const stats=Object.fromEntries(jobs.map(job=>[job,{wins:0,n:0,vs:{}}]));let total=0;
 for(let i=0;i<6;i++)for(let j=i+1;j<6;j++)for(let seed=0;seed<80;seed++)for(const side of [0,1]){
  const ja=jobs[i],jb=jobs[j],r=side?simulateArena(group.states[jb],group.states[ja],createHash('sha256').update('final-heldout-v2:'+seed).digest('hex')):simulateArena(group.states[ja],group.states[jb],createHash('sha256').update('final-heldout-v2:'+seed).digest('hex')),w=side?!r.won:r.won;total++;
  for(const [job,other,won] of [[ja,jb,w],[jb,ja,!w]]){const m=stats[job];m.wins+=+won;m.n++;m.vs[other]??={wins:0,n:0};m.vs[other].wins+=+won;m.vs[other].n++;}
 }
 const rates=Object.fromEntries(jobs.map(job=>[job,+(100*stats[job].wins/stats[job].n).toFixed(2)]));
 const result={group:group.name,total,rates,stats};results.push(result);console.log(JSON.stringify({group:group.name,total,rates}));for(const job of jobs){const r=rates[job];assert(r>=35&&r<=65,group.name+' '+job+' has excessive overall win rate');const matchups=Object.values(stats[job].vs).map(v=>v.wins/v.n);assert(!matchups.every(v=>v>.55)&&!matchups.every(v=>v<.45),group.name+' '+job+' has a universal advantage/disadvantage');}
}

// Priest HP potential must keep a defensive benefit, and simulations must not mutate character data.
for(const score of [1200,2200,2600,3400]){
 const hp=buildBot({id:1,classId:'priest',score}),atk=structuredClone(hp);atk.items.forEach(i=>i.lines.forEach(l=>l.key='attack'));
 const before=structuredClone(hp);let wins=0;
 for(let i=0;i<40;i++){const seed=createHash('sha256').update('hp-build:'+i).digest('hex');wins+=+simulateArena(hp,atk,seed).won;wins+=+!simulateArena(atk,hp,seed).won;}
 assert(wins>=60,'HP potential must stay preferable to equal attack potential');assert.deepEqual(hp,before);
}
console.log('PASS 31,200 held-out class battles, five job stages, eight equipment bands, counters and HP build preference.');
