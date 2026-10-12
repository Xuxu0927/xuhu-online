import argparse
import getpass
import os
from pathlib import Path
from .auth import initialize_admin
from .migrate import migrate_sources

def main():
    parser=argparse.ArgumentParser(description='Personal website administration')
    parser.add_argument('command',choices=['init-admin','migrate','backup','restore'])
    parser.add_argument('--username',default='admin')
    parser.add_argument('--source',default=str(Path(__file__).resolve().parents[2]))
    parser.add_argument('--archive')
    parser.add_argument('--target')
    args=parser.parse_args()
    runtime=Path(args.source)/'runtime'
    if args.command=='init-admin':
        password=getpass.getpass('New administrator password (12+ characters): ')
        if password!=getpass.getpass('Confirm password: '): raise SystemExit('Passwords differ')
        initialize_admin(Path(os.environ.get('SECRETS_ROOT',runtime/'secrets')),args.username,password)
        print('Administrator initialized; no password written to logs.')
    elif args.command=='migrate':
        root=Path(args.source)
        result=migrate_sources(root/'my-blog-manager',root/'XHBlogs',Path(os.environ.get('CONTENT_ROOT',runtime/'content')))
        print(f'Migration completed. Conflicts preserved: {len(result["conflicts"])}')
    elif args.command=='backup':
        from .backup import backup
        from .storage import lock
        if not args.archive:parser.error('--archive required')
        content=Path(os.environ.get('CONTENT_ROOT',runtime/'content'))
        with lock(content):backup(content.parent,Path(args.archive))
        print('Backup saved.')
    else:
        from .backup import restore
        if not args.archive or not args.target:parser.error('--archive and --target required')
        restore(Path(args.archive),Path(args.target))
        print('Backup restored into isolated target.')

if __name__=='__main__': main()
