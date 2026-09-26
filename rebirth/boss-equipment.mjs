import * as D from './data.mjs?v=fourth-fall-5';
const bossesFor=level=>D.BOSSES.filter(b=>b.weekly?[b.gearLevel-10,b.gearLevel].includes(level):b.gearLevel===level);
const option=(value,label)=>'<option value="'+value+'">'+label+'</option>';
document.querySelector('#class').innerHTML+=D.CLASSES.map(c=>option(c.id,c.name)).join('');
document.querySelector('#level').innerHTML+=Array.from({length:20},(_,i)=>option((i+1)*10,(i+1)*10)).join('');
document.querySelector('#slot').innerHTML+=D.SLOTS.map((s,i)=>option(i,s)).join('');
function draw(){const cl=document.querySelector('#class').value,level=document.querySelector('#level').value,slot=document.querySelector('#slot').value,q=document.querySelector('#search').value.trim();
const rows=D.EQUIPMENT_CATALOG.filter(it=>it.boss&&(!cl||it.classId===cl)&&(!level||it.level===+level)&&(!slot||it.slot===+slot)).map(it=>({it,bosses:bossesFor(it.level)})).filter(({it,bosses})=>!q||D.gearName(it).includes(q)||bosses.some(b=>b.name.includes(q)));
document.querySelector('#count').textContent=rows.length+'종 · 보스 장비가 나왔을 때 직업·부위별 종류는 1종입니다.';
document.querySelector('#rows').innerHTML=rows.map(({it,bosses})=>'<tr><td>'+it.level+'</td><td>'+D.CLASSES.find(c=>c.id===it.classId).name+'</td><td>'+D.SLOTS[it.slot]+'</td><td>'+D.gearName(it)+'</td><td>'+bosses.map(b=>b.name+(b.weekly?' (주간 상자)':'')).join('<br>')+'</td><td>'+bosses.map(b=>b.weekly?'장비 25% × 해당 레벨 50%':'장비 10%').join('<br>')+'</td></tr>').join('');}
for(const id of ['class','level','slot','search'])document.getElementById(id).addEventListener('input',draw);draw();

