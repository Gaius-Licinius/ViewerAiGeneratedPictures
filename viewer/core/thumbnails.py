import os
import io


class ThumbnailGenerator:
    def __init__(self, collection_root):
        self.collection_root = collection_root
        self.width = 300

    def generate(self, abs_path):
        try:
            from PIL import Image
            img = Image.open(abs_path)
            img.thumbnail((self.width, self.width), Image.LANCZOS)
            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return buf.getvalue()
        except ImportError:
            return None
