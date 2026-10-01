from pathlib import Path
from types import SimpleNamespace
import pwd

import pytest

from tools import serve


def root_bootstrap(monkeypatch, tmp_path):
    events = []
    identity = [0]
    monkeypatch.setenv('DATA_DIR', '/data')
    monkeypatch.setattr(serve, 'Path', lambda value: tmp_path if value == '/data' else Path(value))
    monkeypatch.setattr(pwd, 'getpwnam', lambda name: SimpleNamespace(pw_uid=10001, pw_gid=10001))
    monkeypatch.setattr(serve.os, 'geteuid', lambda: identity[0])
    monkeypatch.setattr(serve.os, 'chown', lambda p, u, g, **kw: events.append(('chown', p.name, u, g, kw)))
    monkeypatch.setattr(serve.os, 'setgroups', lambda groups: events.append(('groups', groups)))
    monkeypatch.setattr(serve.os, 'setgid', lambda gid: events.append(('gid', gid)))

    def setuid(uid):
        identity[0] = uid
        events.append(('uid', uid))

    monkeypatch.setattr(serve.os, 'setuid', setuid)
    return events, identity


def test_root_bootstrap_drops_privileges_after_fixing_existing_volume(monkeypatch, tmp_path):
    events, identity = root_bootstrap(monkeypatch, tmp_path)
    (tmp_path / 'media').mkdir()
    (tmp_path / 'cars.db').write_bytes(b'existing database')
    serve.prepare_volume_and_drop_privileges()
    assert identity[0] == 10001
    assert events[-3:] == [('groups', []), ('gid', 10001), ('uid', 10001)]
    assert {event[1] for event in events[:-3]} == {tmp_path.name, 'media', 'cars.db'}
    assert all(event[4] == {'follow_symlinks': False} for event in events[:-3])
    assert (tmp_path / 'cars.db').read_bytes() == b'existing database'


def test_root_bootstrap_rejects_symlink(monkeypatch, tmp_path):
    root_bootstrap(monkeypatch, tmp_path)
    (tmp_path / 'media').symlink_to(tmp_path, target_is_directory=True)
    with pytest.raises(RuntimeError, match='Symlinks'):
        serve.prepare_volume_and_drop_privileges()


def test_root_bootstrap_fails_closed_when_privilege_drop_fails(monkeypatch, tmp_path):
    root_bootstrap(monkeypatch, tmp_path)
    monkeypatch.setattr(serve.os, 'setuid', lambda uid: None)
    with pytest.raises(RuntimeError, match='Refusing'):
        serve.prepare_volume_and_drop_privileges()


def test_nonroot_startup_does_not_change_permissions(monkeypatch):
    monkeypatch.setattr(serve.os, 'geteuid', lambda: 10001)
    monkeypatch.setattr(pwd, 'getpwnam', lambda name: pytest.fail('Nonroot startup should not bootstrap'))
    serve.prepare_volume_and_drop_privileges()
