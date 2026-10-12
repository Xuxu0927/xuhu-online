"""Build candidates; preserve the last verified image pair until healthy promotion."""
import json
import os
import subprocess
import uuid
import argparse
from pathlib import Path

def execute(args,env):
    result=subprocess.run(args,env=env,text=True,check=True,stdout=subprocess.PIPE)
    if result.stdout:print(result.stdout,end='',flush=True)
    return result.stdout.strip()

def deploy(root: Path,run=execute):
    root=root.resolve();compose=root/'deploy/compose.yaml'
    if not compose.exists():raise ValueError('Deployment root has no compose.yaml')
    for relative in ['runtime/content','runtime/secrets','backups']:(root/relative).mkdir(parents=True,exist_ok=True)
    (root/'runtime/secrets').chmod(0o700);(root/'backups').chmod(0o700)
    state_file=root/'deploy/.release-state.json'
    state=json.loads(state_file.read_text()) if state_file.exists() else {'stable':{},'previous':{}}
    candidate='candidate-'+uuid.uuid4().hex[:12]
    env={**os.environ,'RELEASE_TAG':candidate}
    command=['docker','compose','--project-directory',str(root/'deploy'),'-f',str(compose)]
    run(command+['config','--quiet'],env)
    running_api=run(command+['ps','-q','api'],env)
    if running_api:run(command+['exec','-T','api','python','-m','cms_core.cli','backup','--archive','/backups/pre-'+candidate+'.tar.gz'],env)
    # Build never changes current/previous tags or the committed release manifest.
    build_env={**env,'DOCKER_BUILDKIT':'0'}
    for service in ['api','web']:
        run(['docker','build','--memory','1024m','--memory-swap','1536m','--cpu-period','100000','--cpu-quota','100000','-f',str(root/f'deploy/Dockerfile.{service}'),'-t',f'xhblogs-{service}:{candidate}',str(root)],build_env)
    try:
        run(command+['up','-d','--wait','--wait-timeout','120'],env)
    except subprocess.CalledProcessError:
        if set(state.get('stable',{}))=={'api','web'}:
            for service,image in state['stable'].items():run(['docker','tag',image,'xhblogs-'+service+':current'],env)
            run(command+['up','-d','--no-build','--wait','--wait-timeout','120'],{**env,'RELEASE_TAG':'current'})
        raise
    stable={service:run(['docker','image','inspect','--format','{{.Id}}',f'xhblogs-{service}:{candidate}'],env) for service in ['api','web']}
    if set(state.get('stable',{}))=={'api','web'}:
        for service,image in state['stable'].items():run(['docker','tag',image,'xhblogs-'+service+':previous'],env)
    for service in ['api','web']:run(['docker','tag',f'xhblogs-{service}:{candidate}',f'xhblogs-{service}:current'],env)
    updated={'stable':stable,'previous':state.get('stable',{}),'release':candidate}
    temporary=state_file.with_suffix('.tmp');temporary.write_text(json.dumps(updated,indent=2)+'\n');temporary.chmod(0o600);os.replace(temporary,state_file)
    return updated

def rollback(root: Path,run=execute):
    root=root.resolve();state_file=root/'deploy/.release-state.json'
    state=json.loads(state_file.read_text())
    previous=state.get('previous',{})
    if set(previous)!={'api','web'}:raise ValueError('No previous verified release exists')
    env={**os.environ,'RELEASE_TAG':'current'}
    for service,image in previous.items():run(['docker','tag',image,'xhblogs-'+service+':current'],env)
    run(['docker','compose','--project-directory',str(root/'deploy'),'-f',str(root/'deploy/compose.yaml'),'up','-d','--no-build','--wait','--wait-timeout','120'],env)
    updated={'stable':previous,'previous':state['stable'],'release':'rollback'}
    temporary=state_file.with_suffix('.tmp');temporary.write_text(json.dumps(updated,indent=2)+'\n');temporary.chmod(0o600);os.replace(temporary,state_file)
    return updated

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--rollback',action='store_true');args=parser.parse_args()
    (rollback if args.rollback else deploy)(Path(__file__).resolve().parents[1])
    print('Application healthy. Verify the independent Nginx entry.')
