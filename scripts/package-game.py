"""Package the standalone local game build without development dependencies."""
from pathlib import Path
import json
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def main():
    build = ROOT / 'dist' / 'game'
    if not (build / 'index.html').is_file():
        raise SystemExit('Run npm.cmd run build before packaging.')
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    target = ROOT / 'release' / f'tingyu-town-v{version}.zip'
    target.parent.mkdir(exist_ok=True)
    included = [ROOT / '启动听雨小镇.cmd', ROOT / 'README-游玩说明.md', ROOT / 'scripts/play.py', ROOT / 'THIRD_PARTY_NOTICES.md']
    included += sorted((ROOT / 'licenses').glob('*LICENSE'))
    included += sorted(p for p in build.rglob('*') if p.is_file())
    with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in included:
            archive.write(path, 'tingyu-town/' + path.relative_to(ROOT).as_posix())
    print(f'Packaged: {target} ({target.stat().st_size:,} bytes, {len(included)} files)')


if __name__ == '__main__':
    main()
