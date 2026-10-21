"""Verify the delivered ZIP and serve its extracted build on localhost."""
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import Path
import gzip
import json
import re
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent.parent


def main():
    version = json.loads((ROOT / 'package.json').read_text(encoding='utf-8'))['version']
    archive_path = ROOT / 'release' / f'tingyu-town-v{version}.zip'
    output = ROOT / 'test-results'
    output.mkdir(exist_ok=True)
    expected = {'启动听雨小镇.cmd', 'README-游玩说明.md', 'scripts/play.py', 'THIRD_PARTY_NOTICES.md'}
    expected.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'licenses').glob('*LICENSE'))
    expected.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'dist/game').rglob('*') if p.is_file())
    with tempfile.TemporaryDirectory(prefix='package-', dir=output) as temporary:
        with zipfile.ZipFile(archive_path) as archive:
            names = archive.namelist()
            assert len(names) == len(set(names)), 'Duplicate ZIP entries'
            assert set(names) == {'tingyu-town/' + p for p in expected}, 'Unexpected or missing ZIP files'
            for relative in expected:
                assert archive.read('tingyu-town/' + relative) == (ROOT / relative).read_bytes(), relative
            archive.extractall(temporary)
        extracted = Path(temporary) / 'tingyu-town'
        with socket.socket() as probe:
            probe.bind(('127.0.0.1', 0))
            port = probe.getsockname()[1]
        server = subprocess.Popen(
            [sys.executable, str(extracted / 'scripts/play.py'), '--port', str(port), '--no-browser'],
            cwd=extracted, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        )
        base = f'http://127.0.0.1:{port}/'
        try:
            deadline = time.monotonic() + 10
            while True:
                try:
                    with urllib.request.urlopen(base, timeout=1) as response:
                        html = response.read().decode('utf-8')
                    break
                except OSError:
                    if server.poll() is not None or time.monotonic() >= deadline:
                        raise RuntimeError('Extracted game server failed to start')
                    time.sleep(.1)
            assert '听雨小镇' in html
            script = re.search(r'src="([^"]+\.js)"', html).group(1)
            request = urllib.request.Request(base + script.removeprefix('./'), headers={'Accept-Encoding': 'gzip'})
            with urllib.request.urlopen(request, timeout=10) as response:
                assert response.headers.get('Content-Encoding') == 'gzip'
                compressed = response.read()
            assert gzip.decompress(compressed) == (extracted / 'dist/game' / script.removeprefix('./')).read_bytes()
            # A running server must serve refreshed HTML after a production rebuild.
            index = extracted / 'dist/game/index.html'
            original = index.read_bytes()
            marker = b'<!-- rebuild-cache-check -->'
            index.write_bytes(original + marker)
            refreshed = urllib.request.Request(base, headers={'Accept-Encoding': 'gzip'})
            with urllib.request.urlopen(refreshed, timeout=10) as response:
                assert gzip.decompress(response.read()).endswith(marker), 'Stale compressed HTML after rebuild'
            index.write_bytes(original)
        finally:
            server.terminate()
            server.communicate(timeout=10)
    report = {
        'date': datetime.now(timezone.utc).isoformat(), 'passed': True, 'files': len(names),
        'archiveBytes': archive_path.stat().st_size, 'sha256': sha256(archive_path.read_bytes()).hexdigest(),
        'allFilesByteIdentical': True, 'extractedServerWorks': True, 'gzipBundleBytes': len(compressed),
        'gzipCacheTracksFileChanges': True,
    }
    (output / 'package-smoke.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'release/SHA256SUMS').write_text(report['sha256'] + '  ' + archive_path.name + '\n', encoding='utf-8')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
