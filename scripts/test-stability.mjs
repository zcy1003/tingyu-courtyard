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
  await page.click('#environment-button');await page.selectOption('#time-of-day','night');await page.check('#time-cycle');await page.click('#close-environment');
  const startHour=(await page.evaluate(()=>window.__tingyu.state())).climate.hour;
  const shots=[[-13,1.3,-12.5,0],[-10,1.3,-3,.6],[8,2.3,-3,-1.57],[15,1.3,5,-1.57],[8,1.9,18,1.57],[-1,1.3,18,-2.1],[-13,1.65,-18.9,0]];
  const start=Date.now();let lastFrame=0,previous=Date.now();
  for(let i=0;Date.now()-start<duration*1000;i++){
    if(i%6===0){await page.click('#environment-button');await page.selectOption('#weather',['drizzle','clear','cloudy','rain'][Math.floor(i/6)%4]);await page.click('#close-environment');}
    if(i%3===0)await page.evaluate(a=>{window.__tingyu.teleport(a[0],a[1],a[2]);window.__tingyu.camera(a[3],.23,4.8);},shots[Math.floor(i/3)%shots.length]);
    await page.waitForTimeout(Math.min(10000,duration*1000-(Date.now()-start)));
    const s=await page.evaluate(()=>({...window.__tingyu.state(),heap:performance.memory?.usedJSHeapSize,hidden:document.hidden}));
    const now=Date.now();samples.push({seconds:(now-start)/1000,fps:i?(s.frame-lastFrame)/((now-previous)/1000):null,...s});lastFrame=s.frame;previous=now;
    assert(s.position[1]>.95,'Player fell through a surface during the soak.');assert(!s.hidden,'Test page unexpectedly became hidden.');
    if(i%6===5)console.log(`Stability ${Math.round((now-start)/1000)}s: frames=${s.frame}, geometries=${s.geometries}, textures=${s.textures}, errors=${errors.length}`);
  }
  assert.equal(errors.length,0,'No errors are permitted during stability run.');
  assert(samples.every(s=>s.climate.automatic),'Automatic time must stay enabled while changing weather.');
  if(duration>=480)assert.equal(new Set(samples.map(s=>s.climate.timeOfDay)).size,4,'A full automatic cycle visits all four times of day.');
  const warmed=samples.filter(s=>s.seconds>220),first=warmed.slice(0,7),last=warmed.slice(-7);
  const maximum=(a,key)=>Math.max(...a.map(s=>s[key]));
  const geometryGrowth=first.length?maximum(last,'geometries')-maximum(first,'geometries'):null;
  const textureGrowth=first.length?maximum(last,'textures')-maximum(first,'textures'):null;
  if(geometryGrowth!==null)assert(geometryGrowth<=8,'Unexpected geometry growth after the first full circuit.');
  if(textureGrowth!==null)assert(textureGrowth<=4,'Unexpected texture growth after the first full circuit.');
  const endHour=samples.at(-1).climate.hour;
  const report={passed:true,browser:await browser.version(),durationSeconds:(Date.now()-start)/1000,startHour,endHour,automaticCycle:true,weatherChanges:Math.ceil(samples.length/6),geometryGrowthAfterWarmup:geometryGrowth,textureGrowthAfterWarmup:textureGrowth,errors,samples};
  await writeFile(output,JSON.stringify(report,null,2));console.log(`PASS ${duration}s stability run`);
}catch(error){await writeFile(output,JSON.stringify({passed:false,error:String(error),errors,samples},null,2));throw error;}
finally{await browser.close();await server.close();}
