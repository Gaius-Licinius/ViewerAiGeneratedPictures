import json
import os
import socket

COLLECTION_ROOT = None
CONFIG_DIR = os.path.dirname(os.path.abspath(__file__))
VIEWER_DIR = os.path.dirname(CONFIG_DIR)
CONFIG_FILE = os.path.join(CONFIG_DIR, "config.json")
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


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(0)
        s.connect(("10.254.254.254", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None
