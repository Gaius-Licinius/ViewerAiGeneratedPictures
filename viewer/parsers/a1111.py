import re


def parse_parameters(raw):
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

    loras = []
    for m in re.finditer(r"<lora:([^:>]+):([^>]+)>", raw, re.IGNORECASE):
        name = m.group(1).strip()
        weight = m.group(2).strip()
        if name:
            try:
                w = float(weight)
            except ValueError:
                w = 1.0
            loras.append({"name": name, "model_strength": w, "clip_strength": w})

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
        "loras": loras,
    }
