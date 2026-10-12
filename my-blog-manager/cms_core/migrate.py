"""Parse legacy constants without executing TypeScript source."""
import re
import shutil
from pathlib import Path
import json5
from .storage import write_json

def constant_data(path: Path, symbol: str):
    source = path.read_text(encoding='utf8')
    match = re.search(r'export\s+const\s+' + re.escape(symbol) + r'(?:\s*:[^=]+)?\s*=\s*([\s\S]+)', source)
    if not match: raise ValueError(f'Cannot parse {symbol} in {path.name}')
    return json5.loads(match.group(1).strip().rstrip(';'))

def migrate_sources(manager: Path, blog: Path, target: Path) -> dict:
    target.mkdir(parents=True, exist_ok=True)
    marker = target / '.migration.json'
    if marker.exists(): return {'alreadyMigrated': True, 'conflicts': []}
    conflicts = []
    def preserve_json(label, value):
        destination=target/'.migration-conflicts'/blog.name/(label+'.json')
        write_json(destination,value);conflicts.append(str(destination.relative_to(target)))
    def public_config(source):
        value=constant_data(source/'siteConfig.ts','siteConfig')
        for key in ['picBedName','picBedUrl','picBedToken']:value.pop(key,None)
        value.get('gitalkConfig',{}).pop('clientSecret',None)
        return value
    for source in [manager, blog]:
        for category in ['posts', 'chatters', 'moments']:
            for path in sorted((source / category).glob('*.md')):
                destination = target / category / path.name
                destination.parent.mkdir(parents=True, exist_ok=True)
                if destination.exists():
                    if path.read_bytes() != destination.read_bytes():
                        backup = target / '.migration-conflicts' / source.name / category / path.name
                        backup.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(path, backup)
                        conflicts.append(str(backup.relative_to(target)))
                else: shutil.copy2(path, destination)
        about = source / 'app/about/about.md'
        if about.exists():
            if not (target/'about.md').exists():shutil.copy2(about,target/'about.md')
            elif about.read_bytes()!=(target/'about.md').read_bytes():
                destination=target/'.migration-conflicts'/source.name/'about.md'
                destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(about,destination);conflicts.append(str(destination.relative_to(target)))
        for draft in (source/'manager_data/drafts').glob('*.json'):
            from .storage import read_json,safe_path
            from .models import ArticleInput
            value=read_json(draft)
            known={key:value.get(key) for key in ArticleInput.model_fields if key in value}
            try:
                data=ArticleInput.model_validate(known)
                destination=safe_path(target,'drafts',data.type+'-'+data.id,'.json')
                if not destination.exists():write_json(destination,data.model_dump())
            except ValueError:
                destination=target/'.migration-conflicts'/source.name/'drafts'/draft.name
                destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(draft,destination);conflicts.append(str(destination.relative_to(target)))
    config_path = manager / 'siteConfig.ts'
    if not config_path.exists(): config_path = blog / 'siteConfig.ts'
    config = public_config(config_path.parent)
    write_json(target / 'site.json', config)
    if (blog/'siteConfig.ts').exists():
        other=public_config(blog)
        if other!=config:preserve_json('site',other)
    for file, symbol in [('albums','albums'), ('friends','friendsData'), ('projects','projectsData')]:
        source = manager / f'data/{file}.ts'
        if not source.exists(): source = blog / f'data/{file}.ts'
        value=constant_data(source,symbol) if source.exists() else []
        write_json(target / f'{file}.json',value)
        other_source=blog/f'data/{file}.ts'
        if other_source.exists():
            other=constant_data(other_source,symbol)
            if other!=value:preserve_json(file,other)
    report = {'version':1, 'conflicts':conflicts}; write_json(marker, report)
    return report
