import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createServer } from 'vite';

const output = new URL('../test-results/art-review/', import.meta.url);
await mkdir(output, { recursive: true });
const server = await createServer({ configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)), server: { port: 5176, host: '127.0.0.1', strictPort: true } });
await server.listen();
const executablePath = process.env.TINGYU_BROWSER || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
assert(executablePath, 'Set TINGYU_BROWSER to a Chromium browser executable.');
const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
const errors = [], views = [], qualityChecks = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
try {
  await page.goto('http://127.0.0.1:5176/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__tingyu && !document.getElementById('start').disabled, { timeout: 90000 });
  await page.screenshot({ path: fileURLToPath(new URL('title.png', output)) });
  await page.locator('#intro').evaluate(el => el.style.visibility='hidden');
  await page.screenshot({ path: fileURLToPath(new URL('overview.png', output)) });
  await page.locator('#intro').evaluate(el => el.style.visibility='');
  await page.click('#start'); await page.waitForTimeout(1600);
  await page.screenshot({ path: fileURLToPath(new URL('courtyard.png', output)) });
  await page.keyboard.press('p');
  await page.addStyleTag({ content: '#photo-ui,#toast,#arrival{visibility:hidden!important}' });
  for (const [name, x, y, z, yaw, pitch, distance] of [
    ['courtyard-clean', -13, 1.26, -12.5, 0, .24, 4.7],
    ['character-front', -13, 1.26, -12.5, Math.PI, .10, 2.8],
    ['square', -10, 1.26, -3, .60, .22, 4.4],
    ['river', 2.5, 1.26, -3, -1.15, .22, 4.5],
    ['stone-bridge', 7, 2.14, -3, -1.57, .20, 4.0],
    ['bamboo', 15, 1.26, 5, -1.57, .24, 4.6],
    ['tea-room', -13, 1.60, -18.9, 0, .16, 3.0],
    ['willow', -1, 1.26, 18, -2.1, .22, 4.5],

  ]) {
    await page.evaluate(a => { window.__tingyu.teleport(a.x, a.y, a.z); window.__tingyu.camera(a.yaw, a.pitch, a.distance); }, { x, y, z, yaw, pitch, distance });
    await page.waitForTimeout(550);
    await page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
    views.push({ name, state: await page.evaluate(() => window.__tingyu.state()) });
  }
  // A fixed clear-sky crop catches an accidental second tone mapping pass or a
  // missing output transform when switching between direct and offscreen rendering.
  await page.evaluate(() => { window.__tingyu.teleport(-13, 1.26, -12.5); window.__tingyu.camera(Math.PI, -.04, 3.6); });
  for (const quality of ['low', 'standard', 'high']) {
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.selectOption('#quality', quality); await page.click('#resume'); await page.keyboard.press('p');
    await page.waitForTimeout(350);
    const sky = await page.screenshot({ clip: { x: 560, y: 20, width: 320, height: 80 } });
    const luminance = await page.evaluate(async base64 => {
      const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let total = 0; for (let i = 0; i < pixels.length; i += 4) total += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
      return total / (pixels.length / 4) / 255;
    }, sky.toString('base64'));
    assert(luminance > .005 && luminance < .60, `Visible sky in ${quality} quality`);
    qualityChecks.push({ quality, skyLuminance: luminance });
  }
  assert(Math.max(...qualityChecks.map(q => q.skyLuminance)) - Math.min(...qualityChecks.map(q => q.skyLuminance)) < .035, 'Sky brightness stays consistent across quality settings');
  for (const quality of ['high', 'low', 'standard']) {
    await page.keyboard.press('Escape'); await page.keyboard.press('Escape');
    await page.selectOption('#quality', quality); await page.click('#resume'); await page.keyboard.press('p');
    await page.evaluate(() => { window.__tingyu.teleport(2.5, 1.26, -3); window.__tingyu.camera(-1.16, .23, 5.5); });
    await page.waitForTimeout(350);
    await page.screenshot({ path: fileURLToPath(new URL(`river-${quality}.png`, output)) });
  }
  for (const [width, height] of [[1000, 900], [1600, 720]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(350);
    await page.mouse.move(width * .6, height * .6); await page.mouse.down();
    await page.mouse.move(width * .3, height * .6, { steps: 20 }); await page.mouse.up();
    await page.waitForTimeout(250);
    await page.screenshot({ path: fileURLToPath(new URL(`river-resize-${width}.png`, output)) });
  }
  assert.deepEqual(errors, []);
  await writeFile(new URL('report.json', output), JSON.stringify({ date: new Date().toISOString(), errors, views, qualityChecks }, null, 2));
  console.log(JSON.stringify({ errors, qualityChecks, views: views.map(v => ({ name: v.name, triangles: v.state.triangles, calls: v.state.calls })) }));
} finally { await browser.close(); await server.close(); }
