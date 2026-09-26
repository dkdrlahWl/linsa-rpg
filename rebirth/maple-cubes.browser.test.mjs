import {chromium} from 'playwright';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {initialState,execute} from './engine.mjs';
import {normalizePotentialState,CUBES} from './data.mjs';
const root=path.resolve('.');
const server=http.createServer((req,res)=>{try{let p=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!p.startsWith(root+path.sep))throw Error();if(fs.statSync(p).isDirectory())p=path.join(p,'index.html');res.setHeader('Content-Type',p.endsWith('.mjs')||p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.svg')?'image/svg+xml':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(p));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,channel:'msedge'});
fs.mkdirSync('reports/cube-uniform-artifacts',{recursive:true});
let rng=20260925;const random=()=>((rng=(Math.imul(rng,1664525)+1013904223)>>>0)/2**32);
try{for(const width of [390,1280]){
 let state=initialState('mage','큐브검증',{now:Date.now(),random,uuid:randomUUID});state.hunting=false;state.gold=1e7;state.level=200;
 const it=state.items[0];it.potentialUnlocked=true;it.level=200;it.grade=5;it.lines=[{key:'INT',value:12,grade:5},{key:'INT',value:9,grade:4},{key:'attack',value:9,grade:4}];
 for(const k of Object.keys(CUBES))state.materials[k]=100;
 normalizePotentialState(state);
 const page=await browser.newPage({viewport:{width,height:900}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ringu_rebirth_session',JSON.stringify({access_token:'local-test-only',refresh_token:'local-test-refresh',user:{id:'local-test'},expires_at:Date.now()/1000+3600})));
 await page.route('https://*.supabase.co/**',async route=>{
 const req=route.request();
 if(req.url().includes('/functions/v1/ringu-rebirth')){
  const body=req.postDataJSON();
  try{const result=execute(state,body.command,body.args||{},{now:Date.now(),random,uuid:randomUUID});state=result.state;await route.fulfill({json:{state,revision:1,result:{events:result.events}}});}
  catch(e){await route.fulfill({status:400,json:{error:e.message}});}return;
 }
 await route.fulfill({json:[]});
 });
 await page.goto('http://127.0.0.1:'+server.address().port+'/rebirth/');
 await page.locator('.bottom [data-arg="gear"]').click();
 await page.locator('[data-action="itemGroup"]').first().click();
 await page.locator('[data-action="itemMode"][data-arg$=":potential"]').click();
 await page.locator('[data-action="cubeKind"][data-arg="highCube"]').click();
 assert.ok(await page.locator('.cube-card').count()>=3);
 await page.locator('[data-action="cubeUse"]').click();
 await page.locator('[data-action="cubeChoose"][data-arg="no"]').waitFor();
 assert.ok(state.pendingCube);
 await page.screenshot({path:'reports/cube-uniform-artifacts/cube-choice-'+width+'.png'});
 await page.locator('[data-action="cubeChoose"][data-arg="no"]').click();
 assert.equal(state.pendingCube,null);
 await page.locator('[data-action="cubeKind"][data-arg="cube"]').click();
 await page.locator('[data-action="cubeUse"]').click();
 await page.locator('[data-action="cubeUse"]').waitFor();
 await page.waitForFunction(()=>!document.querySelector('[data-action="cubeUse"]').disabled);
 assert.equal(state.pendingCube,null);
 await page.locator('[data-action="cubeKind"][data-arg="primeCube"]').click();
 const first=structuredClone(state.items[0].lines[0]);
 await page.locator('[data-action="cubeUse"]').click();
 await page.waitForFunction(()=>!document.querySelector('[data-action="cubeUse"]').disabled);
 assert.ok(state.items[0].lines.every(l=>l.grade===state.items[0].grade));assert.ok(state.items[0].grade>=3);
 await page.locator('.cube-probabilities > summary').first().click();
 await page.screenshot({path:'reports/cube-uniform-artifacts/cube-panel-'+width+'.png',fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 assert.doesNotMatch(await page.locator('dialog').innerText(),/undefined|NaN|품질/);
 assert.deepEqual(errors,[]);
 await page.close();console.log('PASS browser',width,'cube selection, black choice, red immediate, prime same-grade reroll, probabilities, no overflow/errors');
}}finally{await browser.close();server.close();}

