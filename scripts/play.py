"""Serve the built Tingyu game on localhost and open it in a browser."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
import argparse
import gzip
import mimetypes
import threading
import urllib.request
import webbrowser

ROOT = Path(__file__).resolve().parent.parent / 'dist' / 'game'


class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.respond(True)

    def do_HEAD(self):
        self.respond(False)

    def respond(self, body):
        route = unquote(urlsplit(self.path).path)
        target = (ROOT / (route.lstrip('/') or 'index.html')).resolve()
        if not target.is_relative_to(ROOT.resolve()) or not target.is_file():
            self.send_error(404)
            return
        content_type = mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
        if target.suffix == '.js':
            content_type = 'text/javascript'
        data = target.read_bytes()
        compress = 'gzip' in self.headers.get('Accept-Encoding', '') and target.suffix in ('.js', '.css', '.html', '.json')
        if compress:
            stamp = target.stat()
            cache_key = (str(target), stamp.st_mtime_ns, stamp.st_size)
            cached = self.server.compressed.get(cache_key)
            if cached is None:
                cached = gzip.compress(data, compresslevel=6)
                # Rebuilding replaces asset hashes while the play server stays open.
                # Invalidate older entries for this path, including cached index.html.
                for key in tuple(self.server.compressed):
                    if key[0] == str(target):
                        del self.server.compressed[key]
                self.server.compressed[cache_key] = cached
            data = cached
        self.send_response(200)
        self.send_header('Content-Type', content_type + ('; charset=utf-8' if target.suffix in ('.html', '.js', '.css', '.json') else ''))
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-cache')
        self.send_header('Vary', 'Accept-Encoding')
        self.send_header('X-Content-Type-Options', 'nosniff')
        if compress:
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        if body:
            self.wfile.write(data)

    def log_message(self, fmt, *args):
        if args and str(args[1] if len(args) > 1 else '') not in ('200', '304'):
            super().log_message(fmt, *args)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8001)
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    if not (ROOT / 'index.html').is_file():
        parser.exit(1, 'Game build missing. Run npm.cmd run build first.\n')
    url = f'http://127.0.0.1:{args.port}/'
    try:
        server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    except OSError:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                same_game = '听雨小镇' in response.read().decode('utf-8')
        except Exception:
            same_game = False
        if not same_game:
            parser.exit(1, f'Port {args.port} is occupied. Choose another port with --port.\n')
        if not args.no_browser:
            webbrowser.open(url)
        print(f'Tingyu is already running: {url}')
        return
    server.compressed = {}
    print(f'Tingyu town: {url}\nKeep this window open while playing. Ctrl+C to stop.', flush=True)
    if not args.no_browser:
        threading.Timer(0.4, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
