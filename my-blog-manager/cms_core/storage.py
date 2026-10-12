import json
import os
import re
import tempfile
import uuid
from pathlib import Path
from filelock import FileLock

IDENTIFIER = re.compile(r'^[\w-]{1,120}$', re.UNICODE)
CATEGORIES = {'posts', 'chatters', 'moments', 'drafts', 'uploads'}

def safe_path(root: Path, category: str, item_id: str, suffix: str) -> Path:
    if category not in CATEGORIES or not IDENTIFIER.fullmatch(item_id):
        raise ValueError('Invalid content identifier')
    root = root.resolve()
    path = (root / category / (item_id + suffix)).resolve()
    if not path.is_relative_to(root):
        raise ValueError('Content path escapes its root')
    return path

def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, name = tempfile.mkstemp(prefix='.write-', dir=path.parent)
    try:
        with os.fdopen(descriptor, 'w', encoding='utf8', newline='\n') as stream:
            stream.write(content); stream.flush(); os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name): os.unlink(name)

def read_json(path: Path, default=None):
    return json.loads(path.read_text(encoding='utf8')) if path.exists() else default

def write_json(path: Path, value) -> None:
    atomic_write(path, json.dumps(value, ensure_ascii=False, indent=2))

def lock(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    return FileLock(str(root / '.write.lock'), timeout=15)

def recycle(root: Path, path: Path) -> Path:
    root = root.resolve()
    if not path.resolve().is_relative_to(root): raise ValueError('Deletion escapes content root')
    destination = root / '.trash' / (uuid.uuid4().hex + '-' + path.name)
    destination.parent.mkdir(parents=True, exist_ok=True)
    os.replace(path, destination)
    return destination
