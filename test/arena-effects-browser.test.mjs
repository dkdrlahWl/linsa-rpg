import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const server=createServer(async(req,res)=>{
 try{
  const p=new URL(req.url,'http://127.0.0.1').pathname;
  if(p==='/'){res.setHeader('Content-Type','text/html');res.end('<div class="pvp-stage"><div data-arena-log></div></div>');return;}
  const data=await readFile(new URL('..'+p,import.meta.url));
  res.setHeader('Content-Type',p.endsWith('.mjs')?'text/javascript':'application/octet-stream');res.end(data);
 }catch{res.statusCode=404;res.end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,...(process.env.ARENA_BROWSER?{executablePath:process.env.ARENA_BROWSER}:{})});
try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}`);
 const results=await page.evaluate(async()=>{
  const {prepareArenaEffect,drawArenaEffect}=await import('/rebirth/arena-effects.mjs');
  const results=[];
  for(const classId of ['warrior','mage','archer','rogue','pirate','priest'])for(let slot=1;slot<=5;slot++){
   const frame=await prepareArenaEffect(classId,slot),cached=await prepareArenaEffect(classId,slot);
   if(!frame){results.push({classId,slot,missing:true});continue;}
   const pixels=frame.getContext('2d').getImageData(0,0,frame.width,frame.height).data;
   let transparent=0,visible=0;
   for(let i=3;i<pixels.length;i+=4){transparent+=+(pixels[i]<10);visible+=+(pixels[i]>40);}
   const corners=[pixels[3],pixels[(frame.width-1)*4+3],pixels[(frame.width*(frame.height-1))*4+3],pixels.at(-1)];
   const canvas=document.createElement('canvas');await drawArenaEffect(canvas,classId,slot);
   results.push({classId,slot,transparent,visible,total:pixels.length/4,corners,cached:frame===cached,width:canvas.width,height:canvas.height});
  }
  const {startArenaReplay}=await import('/rebirth/arena-ui.mjs');
  const result={self:{classId:'mage',name:'나'},opponent:{classId:'warrior',name:'상대'},battle:{leftMaxHp:100,rightMaxHp:100,frames:[
   {at:0,side:0,type:'cast',slot:2,skill:'프리즘 창',leftHp:100,rightHp:100},
   {at:2000,side:1,type:'cast',slot:2,skill:'균열 참격',leftHp:100,rightHp:100}
  ]}};
  window.controller=startArenaReplay(result,()=>{});return results;
 });
 for(const r of results){
  assert(!r.missing,`${r.classId} ${r.slot} missing`);
  assert(r.visible>100,`${r.classId} ${r.slot} lost effect detail`);
  assert(r.transparent>r.total*.01,`${r.classId} ${r.slot} has opaque background`);
  assert(r.cached);assert(r.width>0&&r.height>0);
  if(r.slot===2&&r.classId!=='priest')assert(r.corners.every(a=>a<10),`${r.classId} second skill still has black corners: ${r.corners}`);
 }
 await page.waitForSelector('canvas.pvp-skill-vfx');
 assert.equal(await page.locator('div.pvp-skill-vfx').count(),0);
 assert(await page.locator('canvas.pvp-skill-vfx').first().evaluate(c=>c.width>0&&c.height>0));
 await page.evaluate(()=>window.controller.stop());assert.equal(await page.locator('.pvp-skill-vfx').count(),0);
 assert.deepEqual(errors,[]);
 console.log('PASS 30 skill renderers: real alpha, removed opaque black second-job backgrounds, preserved visible effects, cached frames, canvas replay and cleanup.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
