# Third-party notices

## Three.js

- Package version: 0.160.1 (runtime revision r160).
- Upstream: https://github.com/mrdoob/three.js
- Vendored runtime: https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.min.js
- Vendored reflection source: https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/objects/Reflector.js
- License: MIT; see `vendor/three/LICENSE`.

The vendored files are preserved as downloaded. `scripts/build.py` converts the Reflector ES-module import/export to use the global THREE namespace in the generated single-file HTML, and changes its fragment output to a translucent cool-tinted reflection for wet paving. The runtime is embedded without modification.

The project uses system Chinese fonts when generating canvas text; it does not redistribute font files. Models and textures are generated procedurally. Python scripts use the standard library only. Historical files in `archive/` may contain additional copies of this same Three.js runtime.
