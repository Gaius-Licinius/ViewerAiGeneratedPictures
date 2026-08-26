import struct


def read_png_dimensions(filepath):
    """Read the image width/height from the PNG IHDR chunk. Returns (width, height) or (None, None)."""
    try:
        with open(filepath, "rb") as f:
            sig = f.read(8)
            if sig != b"\x89PNG\r\n\x1a\n":
                return None, None
            length_bytes = f.read(4)
            chunk_type = f.read(4)
            if len(length_bytes) < 4 or len(chunk_type) < 4:
                return None, None
            length = struct.unpack(">I", length_bytes)[0]
            if chunk_type != b"IHDR" or length < 8:
                return None, None
            data = f.read(length)
            width, height = struct.unpack(">II", data[:8])
            return width, height
    except Exception:
        return None, None


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
