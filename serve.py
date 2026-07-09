#!/usr/bin/env python3
"""
Local static file server for the CCCWA site.

Plain `python -m http.server` guesses MIME types from the OS's registry,
which on many systems (especially Windows) has no mapping for .yml/.yaml —
some browsers then refuse to let Decap CMS's local backend read
admin/config.yml correctly. This server pins the content types that matter
for Decap CMS explicitly, with a UTF-8 charset so Chinese content never
gets mojibake'd.

Usage:
    python serve.py [port]      (default port: 8080)

For local CMS editing you also need decap-server running in a second
terminal — see docs/SOP.md "Local development" section.
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080

EXTRA_MIME_TYPES = {
    ".yml": "text/yaml; charset=utf-8",
    ".yaml": "text/yaml; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/markdown; charset=utf-8",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, **EXTRA_MIME_TYPES}

    def end_headers(self):
        # Local dev only — avoids stale cached content/news.json while editing.
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving CCCWA site at http://localhost:{PORT}  (Ctrl+C to stop)")
        print(f"Admin panel:          http://localhost:{PORT}/admin/")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nStopped.")
