import {createServer} from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
const baseDir=resolve('.'),errors=[];
const server=createServer(async(req,res)=>{try{const p=resolve(baseDir,'.'+new URL(req.url,'http://localhost').pathname);if(!p.startsWith(baseDir+sep))throw Error('path');res.setHeader('Content-Type',({'.html':'text/html','.css':'text/css','.js':'text/javascript','.png':'image/png','.webp':'image/webp'})[extname(p)]||'text/plain');res.end(await readFile(p));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'msedge'}:{})});
const p=await browser.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errors.push(e.message));
const pause=ms=>new Promise(r=>setTimeout(r,ms));const pos=()=>p.evaluate(()=>({...fixtureRoom.members[0]}));
await mkdir('test-output/world-boss',{recursive:true});
try{
 await p.goto(base+'/test/world-boss-fixture.html');await p.getByRole('button',{name:'월드보스',exact:true}).click();await p.getByRole('button',{name:'방 만들기',exact:true}).click();await p.locator('#wb-arena').waitFor({state:'visible'});await p.waitForFunction(()=>document.querySelector('#wb-screen').getAttribute('aria-busy')==='false');
 await p.keyboard.down('d');await pause(410);await p.keyboard.up('d');await pause(250);let before=await pos();assert.ok(before.x>=2);
 await p.keyboard.down('w');await pause(45);await p.keyboard.down('a');await pause(45);await p.keyboard.up('a');await p.keyboard.up('w');await pause(430);let after=await pos();assert.equal(after.y,before.y-1);assert.equal(after.x,before.x-1,'next input survives release while moving');
 before=after;await p.keyboard.down('w');await pause(35);await p.keyboard.down('s');await pause(400);await p.keyboard.up('s');await p.keyboard.up('w');await pause(240);after=await pos();assert.ok(after.y>=before.y,'opposite last key wins');
 await p.keyboard.down('w');await pause(1400);await p.keyboard.up('w');await pause(250);assert.equal((await pos()).y,0);
 const geometry=await p.evaluate(()=>{const a=document.querySelector('#wb-arena').getBoundingClientRect(),f=document.querySelector('#wb-fx').getBoundingClientRect();return {topMargin:a.top-f.top,cell:a.width/8};});assert.ok(geometry.topMargin>geometry.cell,'top-row hero and attacks have room outside board');
 await p.screenshot({path:'test-output/world-boss/WB3-top-row.png'});
 await p.keyboard.down('d');await pause(220);await p.evaluate(()=>window.dispatchEvent(new Event('blur')));await pause(220);before=await pos();await pause(500);assert.equal((await pos()).seq,before.seq,'blur clears held movement');await p.keyboard.up('d');
 // Fixture-only authoritative hit for visual inspection, no production API.
 await p.evaluate(()=>{fixtureRoom.members[0].lastHit={id:900,damage:12864,crit:true,at:Date.now()};});await pause(900);await p.screenshot({path:'test-output/world-boss/WB3-critical.png'});
 // Verify the actual portrait CSS against the production modal structure.
 await p.goto(base+'/test/world-boss-fixture.html');await p.addStyleTag({url:base+'/remodel.css'});await p.evaluate(()=>{document.body.dataset.remodel='';document.body.innerHTML='<div id="playerEquipModal" class="modal-bg show"><section class="modal"><h3>KFC의 캐릭터</h3><p>공격력 · 장비 확인</p><div id="playerEquipGrid"><canvas id="rmRankHero" width="520" height="720"></canvas><div class="rm-rank-equipment">'+Array.from({length:7},()=>'<div class="rm-rank-item"><span>장비 이름<small>공격력 1,484</small></span></div>').join('')+'</div><button>닫기</button></section></div>';});
 const sizes=await p.evaluate(()=>{const a=document.querySelector('#rmRankHero').getBoundingClientRect(),b=document.querySelector('.rm-rank-equipment').getBoundingClientRect();return {w:a.width,h:a.height,right:a.right,equipLeft:b.left,bottom:a.bottom};});assert.ok(sizes.w<=260&&sizes.h<=460);assert.ok(sizes.equipLeft>=sizes.right);assert.ok(sizes.bottom<900);
 assert.deepEqual(errors,[]);console.log('PASS WB3: held movement, W then A queued tap, opposite last key, top-row overflow, blur stop, desktop portrait bounds.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
