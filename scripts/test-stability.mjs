import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const duration=Number(process.argv[2]||600);
const output=new URL('../test-results/stability.json',import.meta.url);
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
const executable=process.env.TINGYU_BROWSER||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(executable,'Chromium browser is required.');
const server=await createServer({configFile:fileURLToPath(new URL('../vite.config.ts',import.meta.url)),server:{port:5176,host:'127.0.0.1',strictPort:true}});await server.listen();
const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--ignore-gpu-blocklist','--enable-precise-memory-info']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[],samples=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
  await page.goto('http://127.0.0.1:5176/');await page.waitForFunction(()=>window.__tingyu);await page.click('#start');await page.waitForTimeout(800);
  const shots=[[-52,1.3,-53,0],[-24,1.3,-19,-.7],[11,3.5,-38,-1.57],[37,1.3,-4,.3],[11,1.9,44,1.57],[-22,1.3,44,2],[-52,1.65,-63.1,0]];
  const start=Date.now();let lastFrame=0,previous=Date.now();
  for(let i=0;Date.now()-start<duration*1000;i++){
    if(i%3===0)await page.evaluate(a=>{window.__tingyu.teleport(a[0],a[1],a[2]);window.__tingyu.camera(a[3],.23,4.8);},shots[Math.floor(i/3)%shots.length]);
    await page.waitForTimeout(Math.min(10000,duration*1000-(Date.now()-start)));
    const s=await page.evaluate(()=>({...window.__tingyu.state(),heap:performance.memory?.usedJSHeapSize,hidden:document.hidden}));
    const now=Date.now();samples.push({seconds:(now-start)/1000,fps:i?(s.frame-lastFrame)/((now-previous)/1000):null,...s});lastFrame=s.frame;previous=now;
    assert(s.position[1]>.95,'Player fell through a surface during the soak.');assert(!s.hidden,'Test page unexpectedly became hidden.');
    if(i%6===5)console.log(`Stability ${Math.round((now-start)/1000)}s: frames=${s.frame}, geometries=${s.geometries}, textures=${s.textures}, errors=${errors.length}`);
  }
  assert.equal(errors.length,0,'No errors are permitted during stability run.');
  const warmed=samples.filter(s=>s.seconds>220),first=warmed.slice(0,7),last=warmed.slice(-7);
  const maximum=(a,key)=>Math.max(...a.map(s=>s[key]));
  const geometryGrowth=first.length?maximum(last,'geometries')-maximum(first,'geometries'):null;
  const textureGrowth=first.length?maximum(last,'textures')-maximum(first,'textures'):null;
  if(geometryGrowth!==null)assert(geometryGrowth<=8,'Unexpected geometry growth after the first full circuit.');
  if(textureGrowth!==null)assert(textureGrowth<=4,'Unexpected texture growth after the first full circuit.');
  const report={passed:true,browser:await browser.version(),durationSeconds:(Date.now()-start)/1000,geometryGrowthAfterWarmup:geometryGrowth,textureGrowthAfterWarmup:textureGrowth,errors,samples};
  await writeFile(output,JSON.stringify(report,null,2));console.log(`PASS ${duration}s stability run`);
}catch(error){await writeFile(output,JSON.stringify({passed:false,error:String(error),errors,samples},null,2));throw error;}
finally{await browser.close();await server.close();}
