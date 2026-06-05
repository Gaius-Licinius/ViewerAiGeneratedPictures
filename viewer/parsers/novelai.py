import json


def parse_chunks(chunks):
    """Extract prompt from NovelAI PNG metadata format."""
    prompt = ""
    neg_prompt = ""
    model = ""

    if "Description" in chunks:
        prompt = chunks["Description"].strip()

    if not prompt and "Comment" in chunks:
        try:
            comment = json.loads(chunks["Comment"])
            prompt = comment.get("prompt", "")
            if "uc" in comment:
                neg_prompt = comment["uc"]
        except (json.JSONDecodeError, ValueError):
            prompt = chunks["Comment"].strip()

    if "Source" in chunks:
        model = chunks["Source"].strip()

    return {
        "prompt": prompt,
        "negative_prompt": neg_prompt,
        "model": model,
        "steps": "",
        "sampler": "",
        "cfg_scale": "",
        "seed": "",
        "size": "",
        "model_hash": "",
        "version": "",
        "loras": [],
    }
