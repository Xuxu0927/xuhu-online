from cms_core.backup import backup,restore
def test_backup_restores_contents_and_rejects_unsafe_archive(tmp_path):
 import tarfile,io,pytest
 root=tmp_path/'source';root.mkdir();(root/'article.md').write_text('中文',encoding='utf8')
 archive=tmp_path/'backup.tar.gz';backup(root,archive)
 target=tmp_path/'restored';restore(archive,target)
 assert (target/'article.md').read_text(encoding='utf8')=='中文'
 bad=tmp_path/'bad.tar.gz'
 with tarfile.open(bad,'w:gz') as tar:
  info=tarfile.TarInfo('../escape');info.size=1;tar.addfile(info,io.BytesIO(b'x'))
 with pytest.raises(ValueError):restore(bad,tmp_path/'other')
