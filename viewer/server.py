#!/usr/bin/env python3
"""AI Image Viewer — local web app for browsing AI-generated images with metadata."""

import http.server
import json
import os
import subprocess
import urllib.parse
import socketserver

import config
from scanner import scan_collection, index_needs_update
from thumbnails import ThumbnailGenerator

thumbnail_gen = ThumbnailGenerator(None)


class ViewerHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler that serves static files and images from the collection."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=config.VIEWER_DIR, **kwargs)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path

        if path == "/rescan":
            self.serve_rescan()
        elif path.startswith("/open-folder/"):
            self.serve_open_folder(path)
        elif path.startswith("/images/"):
            self.serve_image(path)
        elif path.startswith("/thumb/"):
            self.serve_thumbnail(path)
        else:
            super().do_GET()

    def end_headers(self):
        path = urllib.parse.urlparse(self.path).path
        if not path.startswith("/images/") and not path.startswith("/thumb/"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def serve_rescan(self):
        print("  Rescan requested, scanning collection...")
        entries = scan_collection(config.COLLECTION_ROOT, config.INDEX_FILE)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        body = json.dumps({"ok": True, "count": len(entries)}).encode("utf-8")
        self.wfile.write(body)

    def serve_open_folder(self, path):
        rel = path[len("/open-folder/"):]
        abs_path = self._resolve_path(rel)
        if not abs_path:
            return

        if not os.path.isfile(abs_path):
            print(f"  Open folder: file not found: {abs_path}")
            self.send_error(404)
            return

        try:
            print(f"  Opening folder for: {abs_path}")
            subprocess.Popen(f'explorer /select,"{abs_path}"', shell=True)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
        except Exception as exc:
            print(f"  Open folder error: {exc}")
            self.send_error(500)

    def serve_image(self, path):
        rel = path[len("/images/"):]
        abs_path = self._resolve_path(rel)
        if not abs_path:
            return

        if not os.path.isfile(abs_path):
            self.send_error(404)
            return

        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Cache-Control", "public, max-age=3600")
        self.send_header("Content-Length", str(os.path.getsize(abs_path)))
        self.end_headers()
        with open(abs_path, "rb") as f:
            self.wfile.write(f.read())

    def serve_thumbnail(self, path):
        rel = path[len("/thumb/"):]
        abs_path = self._resolve_path(rel)
        if not abs_path:
            return

        if not os.path.isfile(abs_path):
            self.send_error(404)
            return

        data = thumbnail_gen.generate(abs_path)
        if data is None:
            self.serve_image(path)
            return

        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Cache-Control", "public, max-age=86400")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _resolve_path(self, rel):
        safe_path = os.path.normpath(rel)
        abs_path = os.path.normpath(os.path.join(config.COLLECTION_ROOT, safe_path))
        safe_root = os.path.normpath(os.path.abspath(config.COLLECTION_ROOT))
        if not abs_path.startswith(safe_root):
            self.send_error(403)
            return None
        return abs_path

    def log_message(self, format, *args):
        pass


class ThreadingHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


def main():
    config.load_config()
    thumbnail_gen.collection_root = config.COLLECTION_ROOT

    print("AI Image Viewer — starting...")
    print(f"  Collection: {config.COLLECTION_ROOT}")

    if index_needs_update(config.COLLECTION_ROOT, config.INDEX_FILE):
        print("  Scanning collection for metadata...")
        scan_collection(config.COLLECTION_ROOT, config.INDEX_FILE)
    else:
        print("  Index up to date, skipping scan.")

    server = ThreadingHTTPServer((config.HOST, config.PORT), ViewerHandler)
    print(f"\n  Viewer running at http://localhost:{config.PORT}")
    net_ip = config.get_local_ip()
    if net_ip:
        print(f"  Mobile / network: http://{net_ip}:{config.PORT}")
    print("  Press Ctrl+C to stop.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
