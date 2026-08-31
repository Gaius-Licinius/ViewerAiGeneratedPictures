import json


def parse_workflow(raw):
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
                pos_prompt = _resolve_text_value(wf, pos_text)
            else:
                pos_prompt = _resolve_clip_text(wf, pos_node_id)

        # Trace negative prompt connection
        neg_conn = inputs.get("negative")
        if neg_conn and isinstance(neg_conn, list) and len(neg_conn) > 0:
            neg_node_id = neg_conn[0]
            if neg_node_id in clips:
                neg_text = clips[neg_node_id].get("inputs", {}).get("text", "")
                neg_prompt = _resolve_text_value(wf, neg_text)
            else:
                neg_prompt = _resolve_clip_text(wf, neg_node_id)

        sampler = inputs.get("sampler_name", "")
        cfg_val = inputs.get("cfg")
        steps_val = inputs.get("steps")
        seed_val = inputs.get("seed")
        if cfg_val is not None:
            cfg = _resolve_sampler_number(wf, cfg_val)
        if steps_val is not None:
            steps = _resolve_sampler_number(wf, steps_val)
        if seed_val is not None:
            seed = _resolve_text_value(wf, seed_val) if isinstance(seed_val, list) else str(seed_val)

    # Fallback: use _meta.title if KSampler trace didn't find clips
    if not pos_prompt and not neg_prompt:
        for node in clips.values():
            title = node.get("_meta", {}).get("title", "")
            text = _resolve_text_value(wf, node.get("inputs", {}).get("text", ""))
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
        elif isinstance(node.get("inputs", {}).get("ckpt_name"), str):
            model_name = node["inputs"]["ckpt_name"] or model_name

    # Fallback: CLIP loader only if no model found yet
    if not model_name:
        for node in wf.values():
            if not isinstance(node, dict):
                continue
            if node.get("class_type", "") == "CLIPLoader":
                model_name = node.get("inputs", {}).get("clip_name", "") or model_name

    # Extract LORAs from LoraLoader / LoraLoaderModelOnly nodes
    loras = []
    for node in wf.values():
        if not isinstance(node, dict):
            continue
        ct = node.get("class_type", "")
        inp = node.get("inputs", {})

        if ct in ("LoraLoader", "LoraLoaderModelOnly"):
            name = inp.get("lora_name", "")
            if name and name != "None":
                loras.append({
                    "name": str(name),
                    "model_strength": float(inp.get("strength_model", 1.0)),
                    "clip_strength": float(inp.get("strength_clip", 1.0)),
                })

        if ct == "Lora Loader Stack (rgthree)":
            for i in (1, 2, 3, 4):
                si = f"0{i}"
                name = inp.get(f"lora_{si}", "")
                strength = float(inp.get(f"strength_{si}", 1.0))
                if name and name != "None":
                    loras.append({
                        "name": str(name),
                        "model_strength": strength,
                        "clip_strength": strength,
                    })

        if ct == "Power Lora Loader (rgthree)":
            for key, slot in inp.items():
                if not key.startswith("lora_") or not isinstance(slot, dict):
                    continue
                name = slot.get("lora", "")
                if not name or name == "None":
                    continue
                if slot.get("on") is False:
                    continue
                try:
                    strength = float(slot.get("strength", 1.0))
                except (TypeError, ValueError):
                    strength = 1.0
                loras.append({
                    "name": str(name),
                    "model_strength": strength,
                    "clip_strength": strength,
                })

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
        "loras": loras,
    }


_TEXT_KEYS = ("value", "text", "string", "prompt", "seed", "user_prompt", "system_prompt")


def _resolve_text_value(wf, value, depth=0):
    """Resolve a text value, following node references through arbitrary
    intermediate nodes (PrimitiveStringMultiline, PreviewAny, ComfySwitchNode,
    StringConcatenate, etc.)."""
    if depth > 60:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, bool):
        return ""
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, list) and len(value) > 0:
        return _resolve_node(wf, value[0], depth + 1)
    return ""


def _resolve_sampler_number(wf, value, depth=0):
    """Resolve a numeric KSampler input (steps/cfg), following node references
    and output slots (e.g. StepsAndCfg where slot 0 is steps and slot 1 is cfg)."""
    if depth > 60:
        return ""
    if isinstance(value, bool):
        return ""
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list) and len(value) > 0:
        node = wf.get(value[0])
        slot = value[1] if len(value) > 1 else 0
        if isinstance(node, dict):
            inp = node.get("inputs", {})
            if node.get("class_type", "") == "StepsAndCfg":
                key = "cfg" if slot == 1 else "steps"
                if key in inp:
                    return _resolve_sampler_number(wf, inp[key], depth + 1)
            for key in ("value", "steps", "cfg", "seed", "float", "int"):
                if key in inp:
                    return _resolve_sampler_number(wf, inp[key], depth + 1)
    return ""


def _resolve_node(wf, node_id, depth=0):
    """Resolve the text produced by a node, walking its inputs graph."""
    if depth > 60:
        return ""
    node = wf.get(node_id)
    if not isinstance(node, dict):
        return ""
    ct = node.get("class_type", "")
    inp = node.get("inputs", {})

    # Zeroed-out conditioning means "no prompt" (used as negative by Krea2).
    if ct == "ConditioningZeroOut":
        return ""

    # Direct string/number fields win immediately.
    for key in _TEXT_KEYS:
        v = inp.get(key)
        if isinstance(v, str):
            return v
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            return str(v)

    # Switch nodes: evaluate the boolean switch and follow the chosen branch.
    if "switch" in inp and ("on_true" in inp or "on_false" in inp):
        branch = _resolve_bool(wf, inp.get("switch"))
        target = inp.get("on_true" if branch else "on_false")
        return _resolve_text_value(wf, target, depth + 1)

    # Pass-through / reference-holding nodes.
    for key in ("source", "string_a", "string_b", "positive", "negative",
                "text", "clip", "conditioning", "prompt"):
        conn = inp.get(key)
        if isinstance(conn, list) and len(conn) > 0:
            text = _resolve_text_value(wf, conn, depth + 1)
            if text:
                return text

    return ""


def _resolve_bool(wf, value, depth=0):
    """Resolve a boolean value, following node references (PrimitiveBoolean)."""
    if depth > 30:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, list) and len(value) > 0:
        node = wf.get(value[0])
        if isinstance(node, dict):
            inp = node.get("inputs", {})
            for key in ("value", "switch", "on", "enable"):
                if key in inp:
                    return _resolve_bool(wf, inp.get(key), depth + 1)
    return False


def _resolve_lumina2_prompt(wf, node):
    """Extract the combined system + user prompt from a Lumina2 text encoder."""
    inp = node.get("inputs", {})
    parts = []
    for key in ("system_prompt", "user_prompt"):
        value = _resolve_text_value(wf, inp.get(key, ""))
        if value:
            parts.append(value)
    return " ".join(parts)


def _resolve_clip_text(wf, node_id):
    """Trace through intermediate nodes to find CLIPTextEncode text."""
    node = wf.get(node_id)
    if not isinstance(node, dict):
        return ""
    ct = node.get("class_type", "")
    if ct == "CLIPTextEncode":
        raw = node.get("inputs", {}).get("text", "")
        return _resolve_text_value(wf, raw)
    if ct == "CLIPTextEncodeLumina2":
        return _resolve_lumina2_prompt(wf, node)
    if ct == "ConditioningZeroOut":
        return ""
    for key in ("positive", "text", "clip", "conditioning"):
        conn = node.get("inputs", {}).get(key)
        if isinstance(conn, list) and len(conn) > 0:
            text = _resolve_clip_text(wf, conn[0])
            if text:
                return text
    return ""
