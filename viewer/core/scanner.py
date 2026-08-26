import os
import json
import pathlib
from parsers.router import extract_metadata
from parsers.png_chunks import read_png_dimensions


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

            width, height = read_png_dimensions(full_path)
            if width is not None and height is not None:
                size = f"{width}x{height}"
            else:
                size = parsed["size"]

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
                "size": size,
                "model_hash": parsed["model_hash"],
                "model": parsed["model"],
                "version": parsed["version"],
                "loras": parsed.get("loras", []),
            })

            scanned += 1
            if scanned % 100 == 0:
                print(f"  Scanned {scanned}/{total} images...")

    entries.sort(key=lambda e: (e["folder"], e["filename"]), reverse=True)

    with open(index_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False)

    print(f"  Index written: {len(entries)} images in {index_path}")
    return entries


def index_needs_update(collection_root, index_path):
    """Check if index.json needs regeneration."""
    if not os.path.exists(index_path):
        print("  index.json missing, needs generation.")
        return True
    index_mtime = os.path.getmtime(index_path)

    try:
        with open(index_path, "r", encoding="utf-8") as f:
            entries = json.load(f)
    except Exception:
        print("  index.json corrupted, needs regeneration.")
        return True

    disk_count = 0
    newer_found = False
    for dirpath, _, filenames in os.walk(collection_root):
        for fname in filenames:
            if fname.lower().endswith(".png"):
                disk_count += 1
                fpath = os.path.join(dirpath, fname)
                if os.path.getmtime(fpath) > index_mtime:
                    newer_found = True

    if newer_found:
        print(f"  Newer files detected on disk, index needs update.")
        return True

    if disk_count != len(entries):
        print(f"  Count mismatch: {disk_count} PNGs on disk vs {len(entries)} in index, needs update.")
        return True

    if _parser_sources_newer_than(index_mtime):
        print("  Parser/scanner sources changed, index needs update.")
        return True

    print(f"  Index up to date ({disk_count} images).")
    return False


def _parser_sources_newer_than(index_mtime):
    """Return True if any parser/scanner source file changed after the index was written."""
    core_dir = os.path.dirname(os.path.abspath(__file__))
    viewer_dir = os.path.dirname(core_dir)
    source_files = [os.path.join(core_dir, "scanner.py")]
    parsers_dir = os.path.join(viewer_dir, "parsers")
    if os.path.isdir(parsers_dir):
        source_files.extend(
            os.path.join(parsers_dir, name)
            for name in os.listdir(parsers_dir)
            if name.endswith(".py")
        )
    for path in source_files:
        if os.path.exists(path) and os.path.getmtime(path) > index_mtime:
            return True
    return False
