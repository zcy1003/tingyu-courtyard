import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import RAPIER from '@dimforge/rapier3d-compat';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('docs/preproduction/references.json', root), 'utf8'));
for (const ref of [...manifest.images, ...manifest.legacyBaseline.files]) {
  const data = await readFile(new URL(ref.path, root));
  assert.equal(createHash('sha256').update(data).digest('hex'), ref.sha256, `Changed baseline: ${ref.path}`);
  if (ref.width) {
    assert.equal(data.readUInt32BE(16), ref.width);
    assert.equal(data.readUInt32BE(20), ref.height);
  }
}
assert.equal(THREE.REVISION, '186');
assert.equal(typeof new GLTFLoader().loadAsync, 'function');
await RAPIER.init();
const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.step();
world.free();
console.log(`OK: 5 references, 8 legacy files, Three r${THREE.REVISION}, GLTFLoader, Rapier ${RAPIER.version()}`);
console.log(`Root: ${fileURLToPath(root)}`);
