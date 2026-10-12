import json
from cms_core.migrate import migrate_sources

def test_preserves_conflicts_and_is_idempotent(tmp_path):
    manager, blog, target = [tmp_path / x for x in ['manager', 'blog', 'content']]
    for folder, body in [(manager, 'manager version'), (blog, 'blog version')]:
        (folder / 'posts').mkdir(parents=True)
        (folder / 'posts/a.md').write_text(body, encoding='utf8')
        (folder / 'siteConfig.ts').write_text('export const siteConfig = {title:"test", bgImages:["a"], geminiConfig:{temperature:0.85}, picBedToken:"private",gitalkConfig:{clientID:"id",clientSecret:"secret"}};', encoding='utf8')
    result = migrate_sources(manager, blog, target)
    assert result['conflicts']
    assert (target / 'posts/a.md').read_text() == 'manager version'
    assert 'private' not in (target / 'site.json').read_text()
    assert 'secret' not in (target / 'site.json').read_text()
    (target / 'posts/a.md').write_text('edited')
    migrate_sources(manager, blog, target)
    assert (target / 'posts/a.md').read_text() == 'edited'
    assert json.loads((target / 'site.json').read_text())['bgImages'] == ['a']

def test_preserves_about_and_collection_conflicts(tmp_path):
    manager,blog,target=[tmp_path/x for x in ['manager','blog','content']]
    for source,text in [(manager,'manager'),(blog,'blog')]:
        (source/'app/about').mkdir(parents=True);(source/'data').mkdir()
        (source/'app/about/about.md').write_text(text)
        (source/'siteConfig.ts').write_text('export const siteConfig={title:"'+text+'"};')
        (source/'data/friends.ts').write_text('export const friendsData=[{name:"'+text+'"}];')
    result=migrate_sources(manager,blog,target)
    assert any('about.md' in conflict for conflict in result['conflicts'])
    assert any('friends' in conflict for conflict in result['conflicts'])
    assert any('site' in conflict for conflict in result['conflicts'])

