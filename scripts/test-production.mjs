import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium, request } from 'playwright-core';

const base=process.env.TINGYU_PLAY_URL||'http://127.0.0.1:8001/';
const output=new URL('../test-results/',import.meta.url);await mkdir(output,{recursive:true});
const api=await request.newContext();
const html=await api.get(base);assert.equal(html.status(),200);const source=await html.text();assert(source.includes('听雨小镇'));
const script=source.match(/src="([^"]+\.js)"/)[1];
const bundle=await api.get(new URL(script,base).href,{headers:{'Accept-Encoding':'gzip'}});assert.equal(bundle.status(),200);assert.equal(bundle.headers()['content-encoding'],'gzip');
const escaped=await api.get(new URL('%2e%2e/%2e%2e/package.json',base).href);assert.equal(escaped.status(),404);
assert.equal((await api.get(new URL('assets/',base).href)).status(),404);
const head=await api.head(base);assert.equal(head.status(),200);assert.equal((await head.body()).length,0);
await api.dispose();
const results=[];
for(const [name,path]of [['Chrome','C:/Program Files/Google/Chrome/Application/chrome.exe'],['Edge','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe']]){
  const browser=await chromium.launch({executablePath:path,headless:true,args:['--no-sandbox','--ignore-gpu-blocklist']});
  const page=await browser.newPage({viewport:{width:1366,height:768},deviceScaleFactor:1,acceptDownloads:true});
  const errors=[],external=[],failed=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('response',r=>{if(r.status()>=400)failed.push(r.url());});
  await page.route('**/*',route=>{const url=route.request().url();if(url.startsWith(base)||url.startsWith('data:')||url.startsWith('blob:'))route.continue();else{external.push(url);route.abort();}});
  try{
    await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>!document.getElementById('start').disabled,{timeout:90000});
    assert.equal(await page.evaluate(()=>typeof window.__tingyu),'undefined');
    await page.click('#start');await page.waitForTimeout(900);assert(await page.locator('#hud').isVisible());
    await page.keyboard.down('s');await page.waitForTimeout(10500);await page.keyboard.up('s');
    assert.equal(await page.locator('#place-name').innerText(),'青石巷');
    await page.keyboard.press('m');assert(await page.locator('#map-panel').isVisible());await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');await page.selectOption('#quality','high');await page.selectOption('#quality','low');await page.selectOption('#quality','standard');await page.click('#resume');
    await page.click('#audio');assert.equal(await page.locator('#audio').getAttribute('aria-pressed'),'true');await page.click('#audio');
    await page.keyboard.press('p');const downloadPromise=page.waitForEvent('download');await page.click('#save-photo');const download=await downloadPromise;await download.saveAs(fileURLToPath(new URL(`production-${name.toLowerCase()}-photo.png`,output)));assert(!(await download.failure()));
    const png=await readFile(fileURLToPath(new URL(`production-${name.toLowerCase()}-photo.png`,output)));assert(png.length>20000);assert.equal(png.toString('hex',0,8),'89504e470d0a1a0a');
    await page.keyboard.press('p');await page.keyboard.press('r');await page.waitForTimeout(500);assert.equal(await page.locator('#place-name').innerText(),'听雨小院');
    await page.setViewportSize({width:1100,height:720});await page.waitForTimeout(200);await page.screenshot({path:fileURLToPath(new URL(`production-${name.toLowerCase()}.png`,output))});
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failed,[]);
    results.push({name,version:await browser.version(),passed:true,errors,externalRequests:external,failedRequests:failed});console.log(`PASS ${name}: production movement, map, photo, audio, all quality settings, reset, resize, no external requests or debug interface`);
  }finally{await browser.close();}
}
await writeFile(new URL('production.json',output),JSON.stringify({date:new Date().toISOString(),base,gzip:true,pathTraversalBlocked:true,directoryListingBlocked:true,head:true,browsers:results},null,2));
