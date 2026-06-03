#!/usr/bin/env python3
"""AI Image Viewer — local web app for browsing AI-generated images with metadata."""

import http.server
import json
import struct
import os
import pathlib
import urllib.parse
import threading

COLLECTION_ROOT = None
VIEWER_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(VIEWER_DIR, "config.json")
INDEX_FILE = os.path.join(VIEWER_DIR, "index.json")
PORT = 8080
HOST = "0.0.0.0"


def load_config():
    global COLLECTION_ROOT
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            cfg = json.load(f)
        COLLECTION_ROOT = cfg.get("collection_root", r"C:\IA\Collection")
    except Exception:
        COLLECTION_ROOT = r"C:\IA\Collection"


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

    def end_headers(self):
        path = urllib.parse.urlparse(self.path).path
        if not path.startswith("/images/") and not path.startswith("/thumb/"):
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def serve_image(self, path):
        rel = path[len("/images/"):]
        safe_path = os.path.normpath(rel)
        abs_path = os.path.normpath(os.path.join(COLLECTION_ROOT, safe_path))
        safe_root = os.path.normpath(os.path.abspath(COLLECTION_ROOT))

        if not abs_path.startswith(safe_root):
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
        abs_path = os.path.normpath(os.path.join(COLLECTION_ROOT, safe_path))
        safe_root = os.path.normpath(os.path.abspath(COLLECTION_ROOT))
        width = 300

        if not abs_path.startswith(safe_root):
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


def read_all_text_chunks(filepath):
    """Read all tEXt chunks from a PNG file, return dict of key->value."""
    chunks = {}
    try:
        with open(filepath, "rb") as f:
            sig = f.read(8)
            if sig != b"\x89PNG\r\n\x1a\n":
                return chunks
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
                    try:
                        null_pos = data.index(0)
                        key = data[:null_pos].decode("ascii", errors="replace")
                        value = data[null_pos + 1:].decode("latin-1", errors="replace")
                        chunks[key] = value
                    except Exception:
                        pass
    except Exception:
        pass
    return chunks


def parse_parameters_a1111(raw):
    """Parse A1111/SDNext 'parameters' string."""
    lines = raw.strip().split("\n")
    prompt = lines[0].strip() if lines else ""

    negative_prompt = ""
    fields = {}

    param_lines = []
    for line in lines[1:]:
        if "Negative prompt:" in line:
            _, np = line.split("Negative prompt:", 1)
            negative_prompt = np.strip()
        else:
            param_lines.append(line)

    param_text = " ".join(param_lines)

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
        except Exception:
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
    }


def parse_comfyui_json(raw):
    """Parse ComfyUI workflow JSON to extract prompts and model."""
    try:
        wf = json.loads(raw)
    except (json.JSONDecodeError, ValueError):
        return None

    pos_prompt = ""
    neg_prompt = ""
    model_name = ""
    sampler = ""
    cfg = ""
    steps = ""
    seed = ""

    # Find KSampler (or variant) to trace positive/negative node connections
    ksampler = None
    for node_id, node in wf.items():
        if not isinstance(node, dict):
            continue
        ct = node.get("class_type", "")
        inp = node.get("inputs", {})
        if ct == "KSampler" or ("positive" in inp and "negative" in inp and "model" in inp):
            ksampler = (node_id, node)
            break

    # Collect all CLIPTextEncode nodes indexed by node_id
    clips = {}
    for node_id, node in wf.items():
        if not isinstance(node, dict):
            continue
        ct = node.get("class_type", "")
        if ct == "CLIPTextEncode":
            clips[node_id] = node

    if ksampler:
        _ks_id, ks_node = ksampler
        inputs = ks_node.get("inputs", {})

        # Trace positive prompt connection
        pos_conn = inputs.get("positive")
        if pos_conn and isinstance(pos_conn, list) and len(pos_conn) > 0:
            pos_node_id = pos_conn[0]
            if pos_node_id in clips:
                pos_text = clips[pos_node_id].get("inputs", {}).get("text", "")
                pos_prompt = resolve_text_value(wf, pos_text)
            else:
                pos_prompt = resolve_clip_text(wf, pos_node_id)

        # Trace negative prompt connection
        neg_conn = inputs.get("negative")
        if neg_conn and isinstance(neg_conn, list) and len(neg_conn) > 0:
            neg_node_id = neg_conn[0]
            if neg_node_id in clips:
                neg_text = clips[neg_node_id].get("inputs", {}).get("text", "")
                neg_prompt = resolve_text_value(wf, neg_text)
            else:
                neg_prompt = resolve_clip_text(wf, neg_node_id)

        sampler = inputs.get("sampler_name", "")
        cfg_val = inputs.get("cfg")
        steps_val = inputs.get("steps")
        seed_val = inputs.get("seed")
        if cfg_val is not None:
            cfg = str(cfg_val)
        if steps_val is not None:
            steps = str(steps_val)
        if seed_val is not None:
            seed = resolve_text_value(wf, seed_val) if isinstance(seed_val, list) else str(seed_val)

    # Fallback: use _meta.title if KSampler trace didn't find clips
    if not pos_prompt and not neg_prompt:
        for node in clips.values():
            title = node.get("_meta", {}).get("title", "")
            text = resolve_text_value(wf, node.get("inputs", {}).get("text", ""))
            if "Negative" in title:
                neg_prompt = neg_prompt or text
            else:
                pos_prompt = pos_prompt or text

    # Model from checkpoint/UNET loaders (preferred)
    for node in wf.values():
        if not isinstance(node, dict):
            continue
        ct = node.get("class_type", "")
        if ct in ("CheckpointLoaderSimple", "CheckpointLoader"):
            model_name = node.get("inputs", {}).get("ckpt_name", "") or model_name
        elif ct == "UNETLoader":
            model_name = node.get("inputs", {}).get("unet_name", "") or model_name

    # Fallback: CLIP loader only if no model found yet (text encoder, not the image model)
    if not model_name:
        for node in wf.values():
            if not isinstance(node, dict):
                continue
            if node.get("class_type", "") == "CLIPLoader":
                model_name = node.get("inputs", {}).get("clip_name", "") or model_name

    if not pos_prompt and not neg_prompt:
        return None

    return {
        "prompt": str(pos_prompt) if pos_prompt else "",
        "negative_prompt": str(neg_prompt) if neg_prompt else "",
        "model": str(model_name) if model_name else "",
        "sampler": str(sampler) if sampler else "",
        "cfg_scale": str(cfg) if cfg else "",
        "steps": str(steps) if steps else "",
        "seed": str(seed) if seed else "",
        "size": "",
        "model_hash": "",
        "version": "",
    }


def resolve_text_value(wf, value):
    """Resolve a text value, following node references (e.g. PrimitiveStringMultiline)."""
    if isinstance(value, str):
        return value
    if isinstance(value, list) and len(value) > 0:
        ref_node_id = value[0]
        ref_node = wf.get(ref_node_id)
        if isinstance(ref_node, dict):
            inp = ref_node.get("inputs", {})
            for key in ("value", "text", "prompt", "string", "seed"):
                v = inp.get(key)
                if v is not None:
                    result = resolve_text_value(wf, v)
                    if result:
                        return result
    if isinstance(value, (int, float)):
        return str(value)
    return ""


def resolve_clip_text(wf, node_id):
    """Trace through intermediate nodes (like wildcard/conditioning) to find CLIPTextEncode text."""
    node = wf.get(node_id)
    if not isinstance(node, dict):
        return ""
    ct = node.get("class_type", "")
    if ct == "CLIPTextEncode":
        raw = node.get("inputs", {}).get("text", "")
        return resolve_text_value(wf, raw)
    for key in ("positive", "text", "clip", "conditioning"):
        conn = node.get("inputs", {}).get(key)
        if isinstance(conn, list) and len(conn) > 0:
            text = resolve_clip_text(wf, conn[0])
            if text:
                return text
    return ""


def parse_novelai(chunks):
    """Extract prompt from NovelAI PNG metadata format."""
    prompt = ""
    neg_prompt = ""
    model = ""
    steps = ""
    sampler = ""
    cfg = ""
    seed = ""

    # Get prompt from Description (plain text)
    if "Description" in chunks:
        prompt = chunks["Description"].strip()

    # Or from Comment JSON
    if not prompt and "Comment" in chunks:
        try:
            comment = json.loads(chunks["Comment"])
            prompt = comment.get("prompt", "")
            if "uc" in comment:
                neg_prompt = comment["uc"]
        except (json.JSONDecodeError, ValueError):
            prompt = chunks["Comment"].strip()

    # Model from Source
    if "Source" in chunks:
        model = chunks["Source"].strip()

    return {
        "prompt": prompt,
        "negative_prompt": neg_prompt,
        "model": model,
        "steps": steps,
        "sampler": sampler,
        "cfg_scale": cfg,
        "seed": seed,
        "size": "",
        "model_hash": "",
        "version": "",
    }


def extract_metadata(filepath):
    """Extract metadata from a PNG file, auto-detecting the format."""
    chunks = read_all_text_chunks(filepath)
    if not chunks:
        return empty_metadata()

    # Format 1: A1111 parameters
    if "parameters" in chunks:
        return parse_parameters_a1111(chunks["parameters"])

    # Format 2: ComfyUI prompt JSON
    if "prompt" in chunks and chunks["prompt"].strip().startswith("{"):
        result = parse_comfyui_json(chunks["prompt"])
        if result and (result["prompt"] or result["negative_prompt"]):
            return result

    # Format 3: NovelAI (Description/Comment/Source)
    if "Description" in chunks or "Comment" in chunks:
        return parse_novelai(chunks)

    # Format 4: Fallback - try any raw text in chunks
    for key in ("Description", "Comment", "Title", "prompt"):
        if key in chunks:
            return {
                "prompt": chunks[key].strip(),
                "negative_prompt": "",
                "model": chunks.get("Source", chunks.get("Software", "")),
                "steps": "", "sampler": "", "cfg_scale": "",
                "seed": "", "size": "", "model_hash": "", "version": "",
            }

    return empty_metadata()


def empty_metadata():
    return {
        "prompt": "", "negative_prompt": "",
        "model": "", "steps": "", "sampler": "", "cfg_scale": "",
        "seed": "", "size": "", "model_hash": "", "version": "",
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

            parsed = extract_metadata(full_path)

            prompt_val = parsed["prompt"]
            neg_val = parsed["negative_prompt"]
            if not isinstance(prompt_val, str):
                prompt_val = str(prompt_val[0]) if isinstance(prompt_val, list) and prompt_val else ""
            if not isinstance(neg_val, str):
                neg_val = str(neg_val[0]) if isinstance(neg_val, list) and neg_val else ""

            entries.append({
                "id": len(entries),
                "filename": fname,
                "folder": folder,
                "rel_path": rel_path.replace("\\", "/"),
                "prompt": prompt_val,
                "negative_prompt": neg_val,
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

    # Sort newest first: by folder (date) descending, then filename descending
    entries.sort(key=lambda e: (e["folder"], e["filename"]), reverse=True)

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
    load_config()

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
