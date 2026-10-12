import tarfile
from pathlib import Path

def backup(root: Path, archive: Path):
    root=root.resolve();archive=archive.resolve()
    if archive.is_relative_to(root):raise ValueError('Backup archive must be outside the source')
    archive.parent.mkdir(parents=True,exist_ok=True)
    with tarfile.open(archive,'w:gz') as tar:
        for file in root.rglob('*'):
            if file.is_symlink():raise ValueError('Symlinks are not supported in backups')
            if file.is_file() and not file.name.endswith('.lock'):tar.add(file,arcname=file.relative_to(root).as_posix())
    archive.chmod(0o600)

def restore(archive: Path,target: Path):
    target=target.resolve()
    if target.exists():raise ValueError('Restore into a new, empty directory')
    with tarfile.open(archive,'r:gz') as tar:
        for member in tar.getmembers():
            destination=(target/member.name).resolve()
            if not destination.is_relative_to(target) or not (member.isfile() or member.isdir()):raise ValueError('Unsafe archive entry')
        target.mkdir(parents=True)
        tar.extractall(target,filter='data')
