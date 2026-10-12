import hashlib
import hmac
import secrets
import time
from pathlib import Path
from fastapi import HTTPException, Request
from .storage import lock, read_json, write_json

COOKIE = 'xh_session'

def hash_password(password: str) -> str:
    if len(password) < 12: raise ValueError('Password must contain at least 12 characters')
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
    return salt + ':' + digest

def verify_password(password: str, encoded: str) -> bool:
    try:
        salt, expected = encoded.split(':')
        actual = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1).hex()
        return hmac.compare_digest(expected, actual)
    except (ValueError, TypeError): return False

def initialize_admin(root: Path, username: str, password: str):
    root.mkdir(parents=True, exist_ok=True)
    with lock(root):
        if (root / 'admin.json').exists(): raise ValueError('Administrator already initialized')
        write_json(root / 'admin.json', {'username':username,'password':hash_password(password),'signingKey':secrets.token_hex(32)})
        (root / 'admin.json').chmod(0o600)

def create_session(root: Path) -> str:
    admin = read_json(root / 'admin.json'); identifier = secrets.token_urlsafe(32)
    expires = int(time.time()) + 43200; body = f'{identifier}.{expires}'
    signature = hmac.new(admin['signingKey'].encode(),body.encode(),hashlib.sha256).hexdigest()
    with lock(root):
        sessions=read_json(root/'sessions.json', {})
        sessions={k:v for k,v in sessions.items() if v>time.time()}; sessions[identifier]=expires
        write_json(root/'sessions.json',sessions)
    return body+'.'+signature

def require_admin(request: Request) -> str:
    root=request.app.state.secrets; token=request.cookies.get(COOKIE, '')
    try:
        identifier, expiry, signature=token.split('.'); admin=read_json(root/'admin.json')
        expected=hmac.new(admin['signingKey'].encode(),f'{identifier}.{expiry}'.encode(),hashlib.sha256).hexdigest()
        sessions=read_json(root/'sessions.json',{})
        if int(expiry)<=time.time() or not hmac.compare_digest(signature,expected) or sessions.get(identifier)!=int(expiry): raise ValueError()
        return admin['username']
    except (ValueError, TypeError, KeyError, AttributeError): raise HTTPException(401,'Please sign in') from None

def verify_origin(request: Request):
    if request.headers.get('origin') != request.app.state.admin_origin: raise HTTPException(403,'Untrusted request origin')
