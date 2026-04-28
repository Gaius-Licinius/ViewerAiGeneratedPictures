#!/usr/bin/env python3
"""AI Image Viewer — local web app for browsing AI-generated images with metadata."""

import http.server
import json
import os
import struct
import pathlib
import urllib.parse
import time
import threading

COLLECTION_ROOT = r"C:\IA\Collection"
VIEWER_DIR = os.path.dirname(os.path.abspath(__file__))
INDEX_FILE = os.path.join(VIEWER_DIR, "index.json")
PORT = 8080
HOST = "0.0.0.0"


class ViewerHandler(http.server.SimpleHTTPRequestHandler):
    """Custom HTTP handler that serves static files and images from the collection."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=VIEWER_DIR, **kwargs)

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path

        if path.startswith("/images/"):
            self.serve_image(path)
        elif path.startswith("/thumb/"):
            self.serve_thumbnail(path)
        else:
            super().do_GET()

    def serve_image(self, path):
        rel = path[len("/images/"):]
        safe_path = os.path.normpath(rel)
        abs_path = os.path.join(COLLECTION_ROOT, safe_path)

        if not abs_path.startswith(os.path.abspath(COLLECTION_ROOT)):
            self.send_error(403)
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
        safe_path = os.path.normpath(rel)
        abs_path = os.path.join(COLLECTION_ROOT, safe_path)
        width = 300

        if not abs_path.startswith(os.path.abspath(COLLECTION_ROOT)):
            self.send_error(403)
            return
        if not os.path.isfile(abs_path):
            self.send_error(404)
            return

        try:
            from PIL import Image
            import io
            img = Image.open(abs_path)
            img.thumbnail((width, width), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            data = buf.getvalue()
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.send_header("Cache-Control", "public, max-age=86400")
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except ImportError:
            self.serve_image(path)

    def log_message(self, format, *args):
        pass  # suppress noisy logs


def read_png_metadata(filepath):
    """Extract the 'parameters' tEXt chunk from a PNG file."""
    try:
        with open(filepath, "rb") as f:
            sig = f.read(8)
            if sig != b"\x89PNG\r\n\x1a\n":
                return None

            while True:
                length_bytes = f.read(4)
                if len(length_bytes) < 4:
                    break
                length = struct.unpack(">I", length_bytes)[0]
                chunk_type = f.read(4)
                if len(chunk_type) < 4:
                    break
                data = f.read(length)
                f.read(4)  # CRC

                if chunk_type == b"tEXt":
                    null_pos = data.index(0)
                    key = data[:null_pos].decode("ascii", errors="replace")
                    value = data[null_pos + 1:].decode("latin-1", errors="replace")
                    if key == "parameters":
                        return value
    except Exception:
        return None
    return None


def parse_parameters(raw):
    """Parse SD parameter string into structured fields."""
    raw = raw.strip()
    lines = raw.split("\n")
    prompt = lines[0].strip() if lines else ""

    negative_prompt = ""
    fields = {}

    # Parameters can be comma-separated on one line, or multi-line
    param_lines = []
    for line in lines[1:]:
        if "Negative prompt:" in line:
            _, np = line.split("Negative prompt:", 1)
            negative_prompt = np.strip()
        else:
            param_lines.append(line)

    param_text = " ".join(param_lines)

    # Split by ", " and also by "| " (Fooocus format uses |)
    if "| " in param_text:
        parts = [p.strip() for p in param_text.split("| ")]
    else:
        parts = [p.strip() for p in param_text.split(", ")]

    for part in parts:
        if ":" in part:
            k, _, v = part.partition(":")
            key = k.strip().lower().replace(" ", "_")
            fields[key] = v.strip()

    if "Negative prompt" in raw:
        try:
            neg_start = raw.index("Negative prompt:") + len("Negative prompt:")
            neg_end = raw.index("\nSteps:", neg_start) if "\nSteps:" in raw[neg_start:] else len(raw)
            negative_prompt = raw[neg_start:neg_end].strip()
        except:
            pass

    return {
        "prompt": prompt,
        "negative_prompt": negative_prompt,
        "steps": fields.get("steps", ""),
        "sampler": fields.get("sampler", ""),
        "cfg_scale": fields.get("cfg_scale", ""),
        "seed": fields.get("seed", ""),
        "size": fields.get("size", ""),
        "model_hash": fields.get("model_hash", ""),
        "model": fields.get("model", ""),
        "version": fields.get("version", ""),
        "raw_fields": fields,
    }


def scan_collection(root, index_path):
    """Walk the collection, extract metadata, write index.json."""
    entries = []
    root_abs = os.path.abspath(root)
    total = sum(1 for _ in pathlib.Path(root).rglob("*.png"))
    scanned = 0

    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            if not fname.lower().endswith(".png"):
                continue
            full_path = os.path.join(dirpath, fname)
            rel_path = os.path.relpath(full_path, root_abs)
            folder = rel_path.split(os.sep)[0] if os.sep in rel_path else ""

            raw = read_png_metadata(full_path)
            parsed = parse_parameters(raw) if raw else {
                "prompt": "", "negative_prompt": "", "steps": "", "sampler": "",
                "cfg_scale": "", "seed": "", "size": "", "model_hash": "",
                "model": "", "version": "", "raw_fields": {}
            }

            entries.append({
                "id": len(entries),
                "filename": fname,
                "folder": folder,
                "rel_path": rel_path.replace("\\", "/"),
                "prompt": parsed["prompt"],
                "negative_prompt": parsed["negative_prompt"],
                "steps": parsed["steps"],
                "sampler": parsed["sampler"],
                "cfg_scale": parsed["cfg_scale"],
                "seed": parsed["seed"],
                "size": parsed["size"],
                "model_hash": parsed["model_hash"],
                "model": parsed["model"],
                "version": parsed["version"],
            })

            scanned += 1
            if scanned % 100 == 0:
                print(f"  Scanned {scanned}/{total} images...")

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False)

    print(f"  Index written: {len(entries)} images in {index_path}")
    return entries


def index_needs_update(collection_root, index_path):
    """Check if index.json needs regeneration."""
    if not os.path.exists(index_path):
        return True
    index_mtime = os.path.getmtime(index_path)
    for dirpath, _, filenames in os.walk(collection_root):
        for fname in filenames:
            if fname.lower().endswith(".png"):
                fpath = os.path.join(dirpath, fname)
                if os.path.getmtime(fpath) > index_mtime:
                    return True
    return False


def main():
    print("AI Image Viewer — starting...")
    print(f"  Collection: {COLLECTION_ROOT}")

    if index_needs_update(COLLECTION_ROOT, INDEX_FILE):
        print("  Scanning collection for metadata...")
        scan_collection(COLLECTION_ROOT, INDEX_FILE)
    else:
        print("  Index up to date, skipping scan.")

    server = http.server.HTTPServer((HOST, PORT), ViewerHandler)
    local_ip = f"http://localhost:{PORT}"
    print(f"\n  Viewer running at {local_ip}")
    print("  Press Ctrl+C to stop.\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Shutting down.")
        server.server_close()


if __name__ == "__main__":
    main()
