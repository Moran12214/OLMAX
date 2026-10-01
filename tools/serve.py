"""Start the ASGI server on the platform-provided port."""
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
os.chdir(ROOT)


def prepare_volume_and_drop_privileges():
    """Bootstrap root-owned mounts, then irreversibly drop server privileges."""
    if os.geteuid() != 0:
        return
    import pwd

    account = pwd.getpwnam('olmax')
    data = Path(os.getenv('DATA_DIR', '/data'))
    # Only the container's dedicated data mount may be changed by this bootstrap.
    if data != Path('/data') or data.is_symlink():
        raise RuntimeError('Root bootstrap requires DATA_DIR=/data without a symlink')
    data.mkdir(parents=True, exist_ok=True)
    paths = [data, data / 'media', data / 'cars.db',
             data / 'cars.db-wal', data / 'cars.db-shm']
    for path in paths:
        if path.is_symlink():
            raise RuntimeError('Symlinks are not allowed in volume bootstrap paths')
        if path.exists():
            os.chown(path, account.pw_uid, account.pw_gid, follow_symlinks=False)
    os.setgroups([])
    os.setgid(account.pw_gid)
    os.setuid(account.pw_uid)
    if os.geteuid() == 0:
        raise RuntimeError('Refusing to start the web server as root')


if __name__ == '__main__':
    prepare_volume_and_drop_privileges()
    import uvicorn

    uvicorn.run('main:app', host='0.0.0.0', port=int(os.getenv('PORT', '8000')))
