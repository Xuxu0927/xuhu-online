import pytest
from cms_core.storage import safe_path, atomic_write, recycle

@pytest.mark.parametrize('identifier', ['../escape', '/tmp/file', 'a/b', 'a\\b', '..', ''])
def test_rejects_path_escape(tmp_path, identifier):
    with pytest.raises(ValueError):
        safe_path(tmp_path, 'posts', identifier, '.md')

def test_atomic_roundtrip_and_recycle(tmp_path):
    target = safe_path(tmp_path, 'posts', 'hello-world', '.md')
    atomic_write(target, '中文与 "quotes"')
    assert target.read_text(encoding='utf8') == '中文与 "quotes"'
    destination = recycle(tmp_path, target)
    assert not target.exists()
    assert destination.read_text(encoding='utf8') == '中文与 "quotes"'

def test_rejects_symlink_escape(tmp_path):
    outside = tmp_path.parent / (tmp_path.name + '-outside')
    outside.mkdir()
    try:
        (tmp_path / 'posts').symlink_to(outside, target_is_directory=True)
    except OSError:
        pytest.skip('Host does not permit creating symlinks')
    with pytest.raises(ValueError):
        safe_path(tmp_path, 'posts', 'hello', '.md')

def test_failed_replace_preserves_previous_content(tmp_path,monkeypatch):
    import cms_core.storage as storage
    path=safe_path(tmp_path,'posts','article','.md');atomic_write(path,'old')
    def fail(*args):raise OSError('Simulated disk failure')
    monkeypatch.setattr(storage.os,'replace',fail)
    with pytest.raises(OSError):atomic_write(path,'new')
    assert path.read_text()=='old'

