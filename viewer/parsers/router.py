from parsers.png_chunks import read_all_text_chunks
from parsers.comfyui import parse_workflow
from parsers.a1111 import parse_parameters
from parsers.novelai import parse_chunks


def extract_metadata(filepath):
    """Extract metadata from a PNG file, auto-detecting the format."""
    chunks = read_all_text_chunks(filepath)
    if not chunks:
        return _empty_metadata()

    # Format 1: ComfyUI prompt JSON (preferred, has full workflow including LORAs)
    if "prompt" in chunks and chunks["prompt"].strip().startswith("{"):
        result = parse_workflow(chunks["prompt"])
        if result and (result["prompt"] or result["negative_prompt"]):
            return result

    # Format 2: A1111 parameters
    if "parameters" in chunks:
        return parse_parameters(chunks["parameters"])

    # Format 3: NovelAI (Description/Comment/Source)
    if "Description" in chunks or "Comment" in chunks:
        return parse_chunks(chunks)

    # Format 4: Fallback - try any raw text in chunks
    for key in ("Description", "Comment", "Title", "prompt"):
        if key in chunks:
            value = chunks[key].strip()
            # Never expose a raw JSON workflow as a prompt.
            if value.startswith("{") or value.startswith("["):
                continue
            return {
                "prompt": chunks[key].strip(),
                "negative_prompt": "",
                "model": chunks.get("Source", chunks.get("Software", "")),
                "steps": "", "sampler": "", "cfg_scale": "",
                "seed": "", "size": "", "model_hash": "", "version": "",
                "loras": [],
            }

    return _empty_metadata()


def _empty_metadata():
    return {
        "prompt": "", "negative_prompt": "",
        "model": "", "steps": "", "sampler": "", "cfg_scale": "",
        "seed": "", "size": "", "model_hash": "", "version": "",
        "loras": [],
    }
