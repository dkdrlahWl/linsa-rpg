// 200레벨 보스장비 등급별 아이콘 생성.
// 무기: 직업별 5등급(160~200 보스무기 원화 + 등급 광채), 나머지 8부위: 전 직업 공통 3등급(기사 세트 180·190·200 원화 + 등급 광채).
import {readFile,writeFile} from 'node:fs/promises';
const dir=new URL('../rebirth/equipment/reforged/',import.meta.url);
const CLASSES=['warrior','mage','archer','rogue','pirate','priest'];
const WEAPON=[{src:160,glow:'#5df08a'},{src:170,glow:'#4ea8ff'},{src:180,glow:'#b46bff'},{src:190,glow:'#ff4f64'},{src:200,glow:'#ffd35a'}];
const ARMOR=[{src:180,glow:'#b46bff'},{src:190,glow:'#ff4f64'},{src:200,glow:'#ffd35a'}];
const href=async name=>{const svg=await readFile(new URL(name,dir),'utf8');const m=svg.match(/href="(data:image\/[^"]+)"/);if(!m)throw Error('no image '+name);return m[1];};
const pips=(count,color)=>Array.from({length:count},(_,i)=>{const x=238-i*21,y=240;return `<path d="M${x} ${y-9}L${x+9} ${y}L${x} ${y+9}L${x-9} ${y}Z" fill="${color}" stroke="#1a1208" stroke-width="1.5"/>`;}).join('');
const icon=(data,glow,count)=>`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><filter id="aura" x="-25%" y="-25%" width="150%" height="150%"><feGaussianBlur in="SourceAlpha" stdDeviation="5" result="b"/><feFlood flood-color="${glow}" flood-opacity=".85"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><image x="14" y="10" width="228" height="228" href="${data}" filter="url(#aura)"/>${pips(count,glow)}</svg>\n`;
let n=0;
for(const classId of CLASSES)for(const [tier,t] of WEAPON.entries()){await writeFile(new URL(`200-t${tier}-${classId}-0.svg`,dir),icon(await href(`${t.src}-2-${classId}-0.svg`),t.glow,tier+1));n++;}
for(let slot=1;slot<=8;slot++)for(const [tier,t] of ARMOR.entries()){await writeFile(new URL(`200-common-t${tier}-${slot}.svg`,dir),icon(await href(`${t.src}-2-warrior-${slot}.svg`),t.glow,tier+1));n++;}
console.log('tiered boss icons',n);
