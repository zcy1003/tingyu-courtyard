# Third-party notices

## Tingyu Town game (game/ and dist/game/)

- Three.js 0.186.1 / r186, installed from the official `three` npm package. MIT license, reproduced in `licenses/THREE-LICENSE`.
- Rapier 3D compatibility package 0.21.0 (`@dimforge/rapier3d-compat`), official JavaScript/WebAssembly bindings by Dimforge. Apache-2.0 license, reproduced from the installed package in `licenses/RAPIER-LICENSE`. Upstream: https://github.com/dimforge/rapier and https://rapier.rs/.
- Vite, TypeScript, type declarations, and Playwright Core are development/test dependencies recorded in `package.json` and `package-lock.json`; their tooling is not shipped in the local game ZIP.

Game geometry, foliage masks, materials, signs, the traveler, animation, water shading, and synthesized ambience were created in project code. No external model, image, font, music, or sound-effect library is loaded at runtime. System Chinese fonts are used for page text and generated signs. The five images under `yuanxingtu/` were supplied by the user as design references and are not copied into the runtime or the standalone game ZIP.

The original scene below retains its own r160 runtime and build. The two Three.js versions are separate applications and are not loaded together.

## Original courtyard: Three.js

- Package version: 0.160.1 (runtime revision r160).
- Upstream: https://github.com/mrdoob/three.js
- Vendored runtime: https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js
- Vendored reflection source: https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/objects/Reflector.js
- License: MIT; see `vendor/three/LICENSE`.

The vendored files are preserved as downloaded. `scripts/build.py` converts the Reflector ES-module import/export to use the global THREE namespace in the generated single-file HTML, and changes its fragment output to a translucent cool-tinted reflection for wet paving. The runtime is embedded without modification.

The project uses system Chinese fonts when generating canvas text; it does not redistribute font files. Models and textures are generated procedurally. Python scripts use the standard library only. Historical files in `archive/` may contain additional copies of this same Three.js runtime.
