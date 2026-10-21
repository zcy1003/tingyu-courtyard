import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const output=new URL('../test-results/climate/',import.meta.url);
await mkdir(output,{recursive:true});
const executable=process.env.TINGYU_BROWSER||['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(executable,'A Chromium browser is required.');
const server=await createServer({configFile:fileURLToPath(new URL('../vite.config.ts',import.meta.url)),server:{port:5177,host:'127.0.0.1',strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1,acceptDownloads:true});
const errors=[],checks=[],combinations=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>window.__tingyu.state());
const check=(name,ok)=>{assert(ok,name);checks.push(name);console.log('PASS',name);};
const ready=()=>page.waitForFunction(()=>window.__tingyu&&!document.getElementById('start').disabled,{timeout:90000});
const settled=()=>page.waitForFunction(()=>!window.__tingyu.state().climate.transitioning,{timeout:20000});
const snap=name=>page.screenshot({path:fileURLToPath(new URL(`${name}.png`,output))});
try{
  await page.goto('http://127.0.0.1:5177/',{waitUntil:'networkidle'});await ready();await page.click('#start');await page.waitForTimeout(950);
  check('New players start in the original drizzly night',(await state()).climate.weather==='drizzle'&&(await state()).climate.timeOfDay==='night');
  await page.click('#environment-button');check('Scene controls open from the HUD',(await state()).mode==='environment');
  const before=await state();await page.keyboard.down('w');await page.waitForTimeout(400);await page.keyboard.up('w');
  check('Controls pause movement',Math.hypot(...(await state()).position.map((v,i)=>v-before.position[i]))<.02);
  await snap('controls');
  await page.evaluate(()=>{window.__tingyu.teleport(-13,1.26,-12.5);window.__tingyu.camera(0,.24,4.7);});
  for(const time of ['dawn','day','sunset','night']){
    await page.selectOption('#time-of-day',time);
    for(const weather of ['clear','cloudy','drizzle','rain']){
      await page.selectOption('#weather',weather);await settled();
      const s=await state();
      assert.equal(s.climate.timeOfDay,time);assert.equal(s.climate.weather,weather);
      assert.equal(s.rainVisible,weather==='drizzle'||weather==='rain');
      assert(Math.abs(s.rainAudio-s.climate.rain)<.004);
      assert(weather!=='clear'||(!s.floorReflection&&s.pavingRoughness>.80));
      await page.locator('#environment-panel').evaluate(el=>el.style.visibility='hidden');
      const png=await page.locator('#world canvas').screenshot();
      await page.locator('#environment-panel').evaluate(el=>el.style.visibility='');
      const colors=await page.evaluate(async base64=>{
        const im=new Image();im.src=`data:image/png;base64,${base64}`;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
        const context=c.getContext('2d');context.drawImage(im,0,0);const pixels=context.getImageData(0,0,c.width,c.height).data,totals=[0,0,0];
        for(let i=0;i<pixels.length;i+=4)for(let channel=0;channel<3;channel++)totals[channel]+=pixels[i+channel];
        const mean=totals.map(n=>n/(pixels.length/4)/255);return{mean,luma:mean[0]*.2126+mean[1]*.7152+mean[2]*.0722};
      },png.toString('base64'));
      await writeFile(new URL(`${time}-${weather}.png`,output),png);
      combinations.push({time,weather,colors,state:s});
    }
    console.log(`PASS ${time}: four weather combinations rendered without rain in dry weather`);
  }
  const shot=(time,weather)=>combinations.find(x=>x.time===time&&x.weather===weather);
  check('Daytime is visibly brighter than night',shot('day','clear').colors.luma>shot('night','clear').colors.luma*1.18);
  const warmth=x=>x.colors.mean[0]/x.colors.mean[2];
  check('Sunset has a warmer palette than daytime',warmth(shot('sunset','clear'))>warmth(shot('day','clear'))*1.08);
  check('Heavy rain has more streaks than drizzle',shot('day','rain').state.rainCount>shot('day','drizzle').state.rainCount);
  check('Night lighting turns down in daylight',shot('day','clear').state.climate.lampStrength<shot('night','clear').state.climate.lampStrength*.2);
  const stable=await state();
  for(let i=0;i<12;i++){await page.selectOption('#time-of-day',['day','sunset','night'][i%3]);await page.selectOption('#weather',['clear','drizzle','rain'][i%3]);await page.waitForTimeout(80);}
  await settled();const repeated=await state();
  check('Rapid switching does not create growing geometry or texture counts',repeated.geometries<=stable.geometries+2&&repeated.textures<=stable.textures+2);
  await page.selectOption('#time-of-day','night');await page.check('#time-cycle');
  const frozen=(await state()).climate.hour;await page.waitForTimeout(700);
  check('Automatic clock pauses while the controls are open',Math.abs((await state()).climate.hour-frozen)<.00001);
  await page.click('#close-environment');await page.waitForTimeout(1600);
  check('Automatic clock advances during exploration',(await state()).climate.hour>frozen+.04);
  await page.keyboard.press('Escape');const paused=(await state()).climate.hour;await page.waitForTimeout(700);
  check('Automatic clock pauses in the pause menu',Math.abs((await state()).climate.hour-paused)<.00001);
  await page.click('#pause-environment');await page.selectOption('#time-of-day','day');
  check('Manual time selection disables the automatic cycle',!(await state()).climate.automatic);
  await page.selectOption('#weather','rain');await settled();await page.click('#close-environment');await page.click('#audio');
  check('Rain audio starts at the selected weather intensity',(await state()).audioEnabled&&(await state()).audioRainGain>.95);
  await page.keyboard.press('t');await page.selectOption('#weather','clear');await settled();
  check('Rain sound fades away in clear weather',(await state()).audioRainGain<.01);
  await page.click('#close-environment');await page.click('#audio');
  await page.keyboard.press('p');await page.click('#photo-environment');await page.selectOption('#time-of-day','sunset');await settled();await page.click('#close-environment');
  check('Returning from scene controls preserves photo mode',(await state()).mode==='photo'&&await page.locator('#photo-ui').isVisible());
  const downloadReady=page.waitForEvent('download');await page.click('#save-photo');const download=await downloadReady;
  await download.saveAs(fileURLToPath(new URL('sunset-photo.png',output)));check('Changed time is included in saved photos',!(await download.failure()));
  await page.reload();await ready();
  check('Weather and time preferences survive reload',(await state()).climate.weather==='clear'&&(await state()).climate.timeOfDay==='sunset'&&!(await state()).climate.automatic);
  await page.evaluate(()=>localStorage.setItem('tingyu-climate-v1','{"hour":-500,"weather":"__proto__","automatic":"yes"}'));await page.reload();await ready();
  check('Invalid saved preferences safely fall back to defaults',(await state()).climate.weather==='drizzle'&&(await state()).climate.hour===22&&!(await state()).climate.automatic);
  check('No runtime or shader errors across the environment checks',errors.length===0);
  await writeFile(new URL('report.json',output),JSON.stringify({date:new Date().toISOString(),passed:true,checks,combinations,errors},null,2));
  console.log(`PASS ${checks.length} climate checks and ${combinations.length} visual combinations`);
}catch(error){await snap('failure').catch(()=>{});await writeFile(new URL('failure.json',output),JSON.stringify({error:String(error),errors,state:await state().catch(()=>null),checks,combinations},null,2));throw error;}
finally{await browser.close();await server.close();}
