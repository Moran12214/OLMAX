"""Start the ASGI server on the platform-provided port."""
import os
from pathlib import Path
import sys

import uvicorn

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)

if __name__ == '__main__':
    uvicorn.run('main:app', host='0.0.0.0', port=int(os.getenv('PORT', '8000')))
