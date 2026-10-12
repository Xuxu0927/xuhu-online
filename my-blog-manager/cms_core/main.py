"""Server entry point; legacy desktop endpoints are not exposed."""
from .server import create_app
app = create_app()
