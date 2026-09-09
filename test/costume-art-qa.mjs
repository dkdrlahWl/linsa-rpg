import {createRequire} from 'node:module';import {createServer} from 'node:http';import {readFile,mkdir,writeFile} from 'node:fs/promises';import {once} from 'node:events';import assert from 'node:assert/strict';
const {chromium}=createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT_MODULE||'playwright');
const server=createServer(async(req,res)=>{try{const path=decodeURIComponent(req.url.split('?')[0]);if(!path.startsWith('/linsa-rpg/')||path.includes('..'))throw Error();const file=path.slice(11);res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':file.endsWith('.webp')?'image/webp':'image/png');res.end(await readFile(new URL('../'+file,import.meta.url)));}catch{res.writeHead(404);res.end();}});server.listen(0,'127.0.0.1');await once(server,'listening');
const browser=await chromium.launch({channel:'msedge',headless:true});try{const p=await browser.newPage({viewport:{width:1712,height:1020}}),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/linsa-rpg/test/costume-art.html');const poses=await p.evaluate(()=>qaReady);assert.equal(poses.length,14);
const checks=await p.evaluate(()=>{const rows=[];for(const id of ['kael','serin'])for(let pose=0;pose<6;pose++)for(const mirror of [false,true])for(const height of [180,350,500]){const cv=document.createElement('canvas');cv.width=1600;cv.height=1200;const x=800,y=900,f=RinguCostumeArt.definitions[id].frames[pose+1],scale=height/RinguCostumeArt.definitions[id].height;const r=RinguCostumeArt.draw(cv.getContext('2d'),id,{x,y,height,pose,mirror,equipment:{'무기':{slot:'무기',rarity:0,name:'낡은 장검'}},indexOf:()=>0});rows.push({id,pose,mirror,height,aligned:Math.abs(r.handX-(x+(mirror?-1:1)*(f.hand[0]-f.root[0])*scale))<.001&&Math.abs(r.handY-(y+(f.hand[1]-f.root[1])*scale))<.001});}return rows;});assert.ok(checks.every(x=>x.aligned));assert.deepEqual(errors,[]);
const failureChecks=await p.evaluate(()=>{
 const result=[];
 for(const failureAt of [1,2,3]){
  const cv=document.createElement('canvas'),ctx=cv.getContext('2d');ctx.translate(7,11);ctx.scale(1.2,.8);
  const before=Array.from(ctx.getTransform().toFloat64Array()),draw=ctx.drawImage.bind(ctx);let calls=0,failed=false;
  ctx.drawImage=(...args)=>{if(++calls===failureAt)throw Error('INJECTED_DRAW_FAILURE');return draw(...args);};
  try{RinguCostumeArt.draw(ctx,'kael',{x:200,y:500,height:350,pose:0,equipment:{'무기':{slot:'무기',rarity:0,name:'낡은 장검'}},indexOf:()=>0});}catch(e){failed=e.message==='INJECTED_DRAW_FAILURE';}
  result.push({failureAt,failed,restored:JSON.stringify(before)===JSON.stringify(Array.from(ctx.getTransform().toFloat64Array()))});
 }
 return result;
});assert.ok(failureChecks.every(r=>r.failed&&r.restored));
await mkdir(new URL('../test-artifacts/costumes/',import.meta.url),{recursive:true});await p.locator('#sheet').screenshot({path:decodeURIComponent(new URL('../test-artifacts/costumes/poses.png',import.meta.url).pathname).replace(/^\//,'')});await writeFile(new URL('../test-artifacts/costumes/art-checks.json',import.meta.url),JSON.stringify({checks,failureChecks,errors},null,2));console.log(JSON.stringify({cases:checks.length,failureChecks,errors}));
}finally{await browser.close();server.close();}
