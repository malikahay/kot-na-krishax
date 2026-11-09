#!/usr/bin/env python3
"""Локальный сервер для разработки: отдаёт файлы без кэширования, чтобы браузер всегда видел свежую версию."""
import http.server, sys
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
print(f'Кот на крышах: http://localhost:{port}')
http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
