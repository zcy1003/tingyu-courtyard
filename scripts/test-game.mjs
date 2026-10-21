import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=new URL('../test-results/',import.meta.url);
await mkdir(output,{recursive:true});
const executable=process.env.TINGYU_BROWSER || ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(executable,'Set TINGYU_BROWSER to a Chromium browser executable.');
const server=await createServer({configFile:fileURLToPath(new URL('../vite.config.ts',import.meta.url)),server:{port:5175,host:'127.0.0.1',strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--ignore-gpu-blocklist','--enable-precise-memory-info']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
const errors=[],requests=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
page.on('response',r=>{if(r.status()>=400)requests.push({url:r.url(),status:r.status()});});
const state=()=>page.evaluate(()=>window.__tingyu.state());
const snap=name=>page.screenshot({path:fileURLToPath(new URL(`${name}.png`,output))});
const check=(name,value)=>{assert(value,name);checks.push(name);console.log('PASS',name);};
let report;
try{
  await page.goto('http://127.0.0.1:5175/',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>window.__tingyu && !document.getElementById('start').disabled,{timeout:90000});
  await snap('title');
  await page.click('#start');await page.waitForTimeout(950);
  check('Start enters the game',(await state()).mode==='playing');
  await snap('courtyard');
  const start=await state();await page.keyboard.down('w');await page.waitForTimeout(1300);await page.keyboard.up('w');await page.waitForTimeout(200);
  const moved=await state();const distance=Math.hypot(moved.position[0]-start.position[0],moved.position[2]-start.position[2]);
  check('Real keyboard moves the player',distance>2 && distance<3.6);
  await page.mouse.move(800,500);await page.mouse.down();await page.mouse.move(1000,510,{steps:10});await page.mouse.up();
  check('Mouse drag rotates the camera',Math.abs((await state()).yaw)>.4);
  await page.keyboard.down('w');await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await page.keyboard.up('w');
  check('Blur pauses and clears movement',(await state()).mode==='paused');await page.click('#resume');
  const stationary=await state();await page.waitForTimeout(400);const stationaryAfter=await state();
  check('No stuck keys after blur',Math.hypot(stationaryAfter.position[0]-stationary.position[0],stationaryAfter.position[2]-stationary.position[2])<.35);
  await page.keyboard.press('m');check('Map opens',(await state()).mode==='map');await snap('map');await page.keyboard.press('m');
  await page.keyboard.press('p');check('Photo mode hides HUD',(await page.locator('#hud').isHidden())&&(await state()).mode==='photo');
  const downloadPromise=page.waitForEvent('download');await page.click('#save-photo');const download=await downloadPromise;await download.saveAs(fileURLToPath(new URL('photo.png',output)));check('Photo download succeeds',!(await download.failure()));await page.keyboard.press('p');
  await page.keyboard.press('Escape');await page.selectOption('#quality','low');await page.selectOption('#quality','standard');await page.click('#resume');
  await page.keyboard.press('r');await page.waitForTimeout(200);check('Reset returns to the courtyard',Math.hypot((await state()).position[0]+52,(await state()).position[2]+53)<.2);
  await page.keyboard.press('Escape');
  const routes=await page.evaluate(()=>{
    const g=window.__tingyu, output=[];
    function walk(target){let last=Infinity,stuck=0;for(let i=0;i<1800;i++){const s=g.state(),[x,,z]=s.position;const d=Math.hypot(target[0]-x,target[1]-z);if(d<.31)break;if(Math.abs(last-d)<.0003)stuck++;else stuck=0;if(stuck>25)break;last=d;g.simulate(['KeyW'],5,Math.atan2(x-target[0],z-target[1]));}const s=g.state();output.push({target,position:s.position,error:Math.hypot(s.position[0]-target[0],s.position[2]-target[1])});}
    const forward=[[-52,-40],[-50,-20],[-24,-19],[-3,-38],[11,-38],[25,-38],[37,-4],[27,44],[11,44],[-5,44],[-22,44],[-48,25],[-50,-20],[-52,-40],[-52,-53]];
    const reverse=[[-52,-40],[-50,-20],[-48,25],[-22,44],[-5,44],[11,44],[27,44],[37,-4],[25,-38],[11,-38],[-3,-38],[-24,-19],[-50,-20],[-52,-40],[-52,-53]];
    g.teleport(-52,1.3,-53);forward.forEach(walk);reverse.forEach(walk);
    g.teleport(37,1.3,-4);[[49,-51],[37,-4]].forEach(walk);
    g.teleport(-22,1.3,44);[[-65,48],[-22,44]].forEach(walk);
    return output;
  });
  check('Both directions of the full loop and both branches are walkable',routes.every(r=>r.error<.5 && r.position[1]>.95));
  const collisions=await page.evaluate(()=>{
    const g=window.__tingyu;g.teleport(-57,1.3,1);const house=g.simulate(['KeyW'],600,Math.PI/2);
    g.teleport(0,1.3,0);const river=g.simulate(['KeyW'],600,-Math.PI/2);
    g.teleport(11,3.5,-38);const rail=g.simulate(['KeyS'],600,0);
    g.teleport(-86,1.3,80);const edge=g.simulate(['KeyW'],600,Math.PI/2);
    g.teleport(-52,1.3,-53);const room=g.simulate(['KeyW'],290,0);const table=g.simulate(['KeyW'],500,0);
    g.teleport(-56,1.3,-60.5);g.camera(Math.PI,.1,6);const camera=g.state();
    const measure=keys=>{g.teleport(-70,1.3,70);const end=g.simulate(keys,120,0);return Math.hypot(end.position[0]+70,end.position[2]-70);};
    const forward=measure(['KeyW']),diagonal=measure(['KeyW','KeyD']);
    return{house,river,rail,edge,room,table,camera,forward,diagonal};
  });
  check('House wall blocks the player',collisions.house.position[0]>-59.7);
  check('River bank blocks falling into water',collisions.river.position[0]<2.7 && collisions.river.position[1]>1);
  check('Bridge railing is solid',collisions.rail.position[2]<-35.8 && collisions.rail.position[1]>2.8);
  check('World edge is contained',collisions.edge.position[0]>-87.4);
  check('Tea room steps can be climbed',collisions.room.position[2]<-62.8 && collisions.room.position[1]>1.5);
  check('Tea table blocks the player',collisions.table.position[2]>-65.7);
  check('Camera avoids the front wall',collisions.camera.cameraDistance<2 && collisions.camera.cameraDistance>.3);
  check('Diagonal walking has normalized speed',Math.abs(collisions.diagonal-collisions.forward)<.15);
  await page.evaluate(()=>{window.__tingyu.teleport(-52,1.65,-63.1);window.__tingyu.camera(0,.18,3.8);});await page.keyboard.press('Escape');await page.waitForTimeout(300);await snap('tea-room');
  for(const [name,x,y,z,yaw,pitch,d]of [['square',-24,1.3,-19,-.7,.22,4.8],['stone-bridge',7,3.5,-38,-1.57,.18,4.8],['bamboo',37,1.3,-4,-.4,.25,4.8],['wood-bridge',11,1.9,44,1.57,.18,4.8]]){
    await page.evaluate(a=>{window.__tingyu.teleport(a.x,a.y,a.z);window.__tingyu.camera(a.yaw,a.pitch,a.d);},{x,y,z,yaw,pitch,d});await page.waitForTimeout(400);await snap(name);
  }
  await page.evaluate(()=>{window.__tingyu.teleport(-24,1.3,-19);window.__tingyu.camera(-.7,.22,4.8);});await page.waitForTimeout(500);
  const performance=await page.evaluate(async()=>{
    const samples=[];let previous=performance.now();
    await new Promise(resolve=>{const frame=now=>{samples.push(now-previous);previous=now;if(samples.length<240)requestAnimationFrame(frame);else resolve();};requestAnimationFrame(frame);});
    samples.sort((a,b)=>a-b);const gl=document.querySelector('#world canvas').getContext('webgl2'),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return{averageFrameMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95FrameMs:samples[Math.floor(samples.length*.95)],gpu:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):'unknown',state:window.__tingyu.state()};
  });
  check('No browser runtime or shader errors',errors.length===0 && requests.length===0);
  report={date:new Date().toISOString(),browser:await browser.version(),viewport:{width:1440,height:900,pixelRatio:1},checks,routes,collisions,performance,errors,requests};
  await writeFile(new URL('report.json',output),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:checks.length,performance},null,2));
}catch(error){await snap('failure').catch(()=>{});await writeFile(new URL('failure.json',output),JSON.stringify({error:String(error),errors,requests,state:await state().catch(()=>null)},null,2));throw error;}
finally{await browser.close();await server.close();}
