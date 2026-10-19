from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

page = Path(__file__).resolve().parent.parent / 'outputs' / 'tingyu-courtyard.html'

class CourtyardHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        route=self.path.split('?',1)[0]
        if route not in ('/','/tingyu-courtyard.html'):
            self.send_error(404)
            return
        data=page.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type','text/html; charset=utf-8')
        self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-cache')
        self.end_headers()
        self.wfile.write(data)

if __name__=='__main__':
    server=ThreadingHTTPServer(('0.0.0.0',8788),CourtyardHandler)
    print('Courtyard phone viewer listening on port 8788',flush=True)
    server.serve_forever()
