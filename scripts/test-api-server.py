"""Isolated browser-test backend. Never uses production content or credentials."""
import sys
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'my-blog-manager'))
from cms_core.auth import initialize_admin
from cms_core.migrate import migrate_sources
from cms_core.main import create_app
import uvicorn
folder=root/'.backups/e2e'
migrate_sources(root/'my-blog-manager',root/'XHBlogs',folder/'content')
if not (folder/'secrets/admin.json').exists(): initialize_admin(folder/'secrets','test-admin','local-e2e-password-123')
uvicorn.run(create_app(folder/'content',folder/'secrets',admin_origin='http://localhost:18081'),host='127.0.0.1',port=8000)
