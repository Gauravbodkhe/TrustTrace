"""
TrustTrace Root Entrypoint
Allows running uvicorn directly from the project root directory on Render/cloud platforms:
    uvicorn main:app --host 0.0.0.0 --port 8000
"""
import sys
import os

# Add backend directory to sys.path so 'app' package is discoverable
BACKEND_DIR = os.path.join(os.path.dirname(__file__), "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.main import app

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
