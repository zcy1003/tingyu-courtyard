"""Serve only the built courtyard page and preview; no directory listings."""
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
import argparse

ROOT=Path(__file__).resolve().parent.parent
ROUTES={
    '/':('index.html','text/html; charset=utf-8'),
    '/index.html':('index.html','text/html; charset=utf-8'),
    '/assets/preview.png':('assets/preview.png','image/png'),
}

class Handler(BaseHTTPRequestHandler):
    def do_HEAD(self):self.respond(False)
    def do_GET(self):self.respond(True)
    def respond(self,body):
        entry=ROUTES.get(self.path.split('?',1)[0])
        if entry is None:self.send_error(404);return
        target=ROOT/entry[0]
        if not target.is_file():self.send_error(404,'Run python scripts/build.py first');return
        data=target.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type',entry[1])
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-cache')
        self.end_headers()
        if body:self.wfile.write(data)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--host',default='127.0.0.1')
    parser.add_argument('--port',default=8000,type=int)
    args=parser.parse_args()
    server=ThreadingHTTPServer((args.host,args.port),Handler)
    print(f'Courtyard viewer: http://{args.host}:{args.port}/',flush=True)
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()
