#!/usr/bin/env -S python3 -E
"""NetDraw Share Server - minimal JSON relay with rate limiting and timeouts"""
import json, os, time, hashlib, collections, threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

SHARE_DIR = '/var/www/html/shares'
MAX_AGE = 24 * 3600
MAX_SIZE = 2 * 1024 * 1024
RATE_LIMIT = 10
RATE_WINDOW = 3600
REQ_TIMEOUT = 10  # seconds per request
os.makedirs(SHARE_DIR, exist_ok=True)

_rate_map = collections.defaultdict(list)
_rate_lock = threading.Lock()

def check_rate_limit(ip):
    with _rate_lock:
        now = time.time()
        _rate_map[ip] = [t for t in _rate_map[ip] if now - t < RATE_WINDOW]
        if len(_rate_map[ip]) >= RATE_LIMIT:
            return False
        _rate_map[ip].append(now)
        return True

def clean_old():
    """Remove files older than MAX_AGE"""
    now = time.time()
    try:
        for f in os.listdir(SHARE_DIR):
            fp = os.path.join(SHARE_DIR, f)
            if now - os.path.getmtime(fp) > MAX_AGE:
                try: os.unlink(fp)
                except: pass
    except: pass

def clean_rate_map():
    with _rate_lock:
        now = time.time()
        stale = [ip for ip, ts in _rate_map.items() if not ts or now - ts[-1] > RATE_WINDOW * 2]
        for ip in stale:
            del _rate_map[ip]

# Background cleanup thread - runs every 30 minutes
def cleanup_loop():
    while True:
        time.sleep(1800)
        clean_old()
        clean_rate_map()

class Handler(BaseHTTPRequestHandler):
    timeout = REQ_TIMEOUT

    def _cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _json(self, code, data):
        self.send_response(code)
        self._cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self.end_headers()

    def do_POST(self):
        if self.path != '/api/share':
            self._json(404, {'error': 'not found'})
            return
        # Rate limit
        client_ip = self.headers.get('X-Real-IP') or self.headers.get('X-Forwarded-For', '').split(',')[0].strip() or self.client_address[0]
        if not check_rate_limit(client_ip):
            self._json(429, {'error': 'rate limit exceeded', 'message': '每小时最多分享10次'})
            return
        # Size check
        length = int(self.headers.get('Content-Length', 0))
        if length > MAX_SIZE:
            self._json(413, {'error': 'payload too large'})
            return
        if length == 0:
            self._json(400, {'error': 'empty body'})
            return
        # Read with timeout
        try:
            body = self.rfile.read(length)
        except Exception:
            self._json(408, {'error': 'read timeout'})
            return
        # Validate JSON
        try:
            json.loads(body)
        except:
            self._json(400, {'error': 'invalid json'})
            return
        # Save
        share_id = hashlib.md5(os.urandom(16)).hexdigest()[:8]
        with open(os.path.join(SHARE_DIR, share_id + '.json'), 'wb') as f:
            f.write(body)
        self._json(200, {'id': share_id, 'url': 'https://draw.pepcn.com/?share=' + share_id})

    def do_GET(self):
        if not self.path.startswith('/api/share/'):
            self._json(404, {'error': 'not found'})
            return
        share_id = self.path.split('/api/share/')[1].split('?')[0]
        # Sanitize: only allow hex chars
        if not all(c in '0123456789abcdef' for c in share_id) or len(share_id) > 16:
            self._json(404, {'error': 'not found'})
            return
        fp = os.path.join(SHARE_DIR, share_id + '.json')
        if os.path.exists(fp):
            try:
                with open(fp, 'rb') as f:
                    data = f.read()
                self.send_response(200)
                self._cors()
                self.send_header('Content-Type', 'application/json')
                self.send_header('Cache-Control', 'public, max-age=3600')
                self.end_headers()
                self.wfile.write(data)
            except:
                self._json(500, {'error': 'read error'})
        else:
            self._json(404, {'error': 'not found'})

    def do_DELETE(self):
        if not self.path.startswith('/api/share/'):
            self._json(404, {'error': 'not found'})
            return
        share_id = self.path.split('/api/share/')[1]
        if not all(c in '0123456789abcdef' for c in share_id) or len(share_id) > 16:
            self._json(404, {'error': 'not found'})
            return
        fp = os.path.join(SHARE_DIR, share_id + '.json')
        try:
            os.unlink(fp)
            self._json(200, {'ok': True})
        except:
            self._json(404, {'error': 'not found'})

    def log_message(self, *a):
        pass

if __name__ == '__main__':
    # Start background cleanup
    threading.Thread(target=cleanup_loop, daemon=True).start()
    clean_old()  # initial cleanup
    print('NetDraw share server on :3100 (threaded, timeout=%ds)' % REQ_TIMEOUT)
    ThreadingHTTPServer(('127.0.0.1', 3100), Handler).serve_forever()
