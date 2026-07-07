#!/usr/bin/env python3
"""NetDraw Share Server - minimal JSON relay with IP rate limiting"""
import json, os, time, hashlib, collections
from http.server import HTTPServer, BaseHTTPRequestHandler

SHARE_DIR = '/var/www/html/shares'
MAX_AGE = 24 * 3600  # 24 hours
MAX_SIZE = 2 * 1024 * 1024  # 2MB - reject oversized payloads
RATE_LIMIT = 10  # max shares per IP per hour
RATE_WINDOW = 3600  # 1 hour window
os.makedirs(SHARE_DIR, exist_ok=True)

# IP → list of timestamps
_rate_map = collections.defaultdict(list)

def check_rate_limit(ip):
    """Return True if IP is within rate limit, False if exceeded."""
    now = time.time()
    # Prune old entries
    _rate_map[ip] = [t for t in _rate_map[ip] if now - t < RATE_WINDOW]
    if len(_rate_map[ip]) >= RATE_LIMIT:
        return False
    _rate_map[ip].append(now)
    return True

# Periodic cleanup of stale IP entries
def clean_rate_map():
    now = time.time()
    stale = [ip for ip, ts in _rate_map.items() if not ts or now - ts[-1] > RATE_WINDOW * 2]
    for ip in stale:
        del _rate_map[ip]

set_interval_counter = 0

def clean_old():
    """Remove files older than MAX_AGE"""
    now = time.time()
    for f in os.listdir(SHARE_DIR):
        fp = os.path.join(SHARE_DIR, f)
        if now - os.path.getmtime(fp) > MAX_AGE:
            try:
                os.unlink(fp)
            except:
                pass


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        clean_old()
        clean_rate_map()
        if self.path == '/api/share':
            # Rate limit check
            client_ip = self.headers.get('X-Real-IP') or self.headers.get('X-Forwarded-For', '').split(',')[0].strip() or self.client_address[0]
            if not check_rate_limit(client_ip):
                self.send_response(429)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Retry-After', '3600')
                self.end_headers()
                self.wfile.write(b'{"error":"rate limit exceeded","message":"每小时最多分享10次"}')
                return
            length = int(self.headers.get('Content-Length', 0))
            if length > MAX_SIZE:
                self.send_response(413)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"payload too large"}')
                return
            body = self.rfile.read(length)
            try:
                json.loads(body)  # validate
            except:
                self.send_response(400)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"invalid json"}')
                return
            share_id = hashlib.md5(str(time.time()).encode()).hexdigest()[:8]
            with open(os.path.join(SHARE_DIR, share_id + '.json'), 'wb') as f:
                f.write(body)
            self.send_response(200)
            self._cors()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            resp = json.dumps({'id': share_id, 'url': 'https://draw.pepcn.com/?share=' + share_id})
            self.wfile.write(resp.encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        clean_old()
        if self.path.startswith('/api/share/'):
            share_id = self.path.split('/api/share/')[1].split('?')[0]
            fp = os.path.join(SHARE_DIR, share_id + '.json')
            if os.path.exists(fp):
                with open(fp, 'rb') as f:
                    data = f.read()
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'public, max-age=3600')
                self.end_headers()
                self.wfile.write(data)
            else:
                self.send_response(404)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"not found"}')
        else:
            self.send_response(404)
            self.end_headers()

    def do_DELETE(self):
        if self.path.startswith('/api/share/'):
            share_id = self.path.split('/api/share/')[1]
            fp = os.path.join(SHARE_DIR, share_id + '.json')
            try:
                os.unlink(fp)
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"ok":true}')
            except:
                self.send_response(404)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(b'{"error":"not found"}')
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        pass  # suppress logs


if __name__ == '__main__':
    print('NetDraw share server on :3100')
    HTTPServer(('127.0.0.1', 3100), Handler).serve_forever()
