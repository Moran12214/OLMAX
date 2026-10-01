"""Create a consistent SQLite backup and preserve uploaded images."""
from datetime import datetime, timezone
import os
from pathlib import Path
import sqlite3
import sys
import tarfile
import tempfile

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root))
from main import DB, MEDIA

destination = Path(sys.argv[1] if len(sys.argv) > 1 else root/'backups')
destination.mkdir(parents=True, exist_ok=True)
if not DB.exists():
    raise SystemExit('Database does not exist; start OLMAX first.')
archive = destination/('olmax-'+datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')+'.tar.gz')
with tempfile.TemporaryDirectory() as temp:
    snapshot = Path(temp)/'cars.db'
    with sqlite3.connect(f'file:{DB}?mode=ro', uri=True) as source, sqlite3.connect(snapshot) as target:
        source.backup(target)
    # Session cookies and rate-limit counters are not needed for disaster recovery.
    with sqlite3.connect(snapshot) as conn:
        conn.execute('DELETE FROM sessions')
        conn.execute('DELETE FROM rate_limits')
    fd = os.open(archive, os.O_CREAT|os.O_EXCL|os.O_WRONLY, 0o600)
    with os.fdopen(fd, 'wb') as file, tarfile.open(fileobj=file, mode='w:gz') as tar:
        tar.add(snapshot, arcname='cars.db')
        if MEDIA.exists():
            tar.add(MEDIA, arcname='media')
print(archive)
