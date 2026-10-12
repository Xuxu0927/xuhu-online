import importlib.util
import json
import subprocess
from pathlib import Path
import pytest

def load_deployer():
    path=Path(__file__).resolve().parents[2]/'deploy/deploy.py'
    spec=importlib.util.spec_from_file_location('site_deployer',path)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    return module

def test_failed_build_and_retry_preserve_last_working_image_pair(tmp_path):
    (tmp_path/'deploy').mkdir();(tmp_path/'deploy/compose.yaml').write_text('name: test')
    state={'stable':{'api':'old-api','web':'old-web'},'previous':{}}
    (tmp_path/'deploy/.release-state.json').write_text(json.dumps(state))
    tags={};fail=True
    def run(args,env):
        nonlocal fail
        if 'build' in args and any(value.startswith('xhblogs-web:') for value in args) and fail:
            fail=False;raise subprocess.CalledProcessError(1,args)
        if args[:3]==['docker','image','inspect']:
            return 'new-api' if 'api:' in args[-1] else 'new-web'
        if args[:2]==['docker','tag']:tags[args[-1]]=args[-2]
        return ''
    module=load_deployer()
    with pytest.raises(subprocess.CalledProcessError):module.deploy(tmp_path,run)
    assert not tags
    assert json.loads((tmp_path/'deploy/.release-state.json').read_text())==state
    module.deploy(tmp_path,run)
    assert tags['xhblogs-api:previous']=='old-api'
    assert tags['xhblogs-web:previous']=='old-web'

def test_rollback_updates_committed_stable_pair(tmp_path):
    (tmp_path/'deploy').mkdir();(tmp_path/'deploy/compose.yaml').write_text('name: test')
    state={'stable':{'api':'new-api','web':'new-web'},'previous':{'api':'old-api','web':'old-web'}}
    (tmp_path/'deploy/.release-state.json').write_text(json.dumps(state))
    tags={}
    def run(args,env):
        if args[:2]==['docker','tag']:tags[args[-1]]=args[-2]
        return ''
    load_deployer().rollback(tmp_path,run)
    result=json.loads((tmp_path/'deploy/.release-state.json').read_text())
    assert result['stable']==state['previous']
    assert tags['xhblogs-api:current']=='old-api'
