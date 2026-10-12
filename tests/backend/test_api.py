from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from cms_core.main import create_app
from cms_core.auth import initialize_admin

@pytest.fixture
def client(tmp_path):
    initialize_admin(tmp_path / 'secrets', 'owner', 'long-enough-test-password')
    app = create_app(tmp_path / 'content', tmp_path / 'secrets', admin_origin='http://testserver')
    with TestClient(app) as c:
        yield c

def login(client):
    response = client.post('/api/auth/login', json={'username':'owner','password':'long-enough-test-password'}, headers={'Origin':'http://testserver'})
    assert response.status_code == 200
    assert 'HttpOnly' in response.headers['set-cookie']

def test_auth_and_csrf(client):
    assert client.get('/api/config').status_code == 401
    login(client)
    assert client.get('/api/config').status_code == 200
    assert client.put('/api/config', json={'title':'hacked'}, headers={'Origin':'http://evil.test'}).status_code == 403
    client.post('/api/auth/logout', headers={'Origin':'http://testserver'})
    assert client.get('/api/config').status_code == 401

def test_config_roundtrip_and_secrets(client):
    login(client)
    payload={'title':'say "hello"','bgImages':['/a.png'],'cloudMusicIds':['123'],'geminiConfig':{'modelId':'m','temperature':0.85,'maxOutputTokens':150,'systemPrompt':'one\ntwo'}}
    assert client.put('/api/config',json=payload,headers={'Origin':'http://testserver'}).status_code == 200
    assert client.get('/api/config').json()['data']['geminiConfig'] == payload['geminiConfig']
    assert client.put('/api/config',json={'picBedToken':'secret'},headers={'Origin':'http://testserver'}).status_code == 422

def test_publish_idempotency_draft_isolation_and_paths(client):
    login(client)
    headers={'Origin':'http://testserver'}
    draft={'id':'sample','type':'post','title':'Title','content':'# Heading\n\n> Quote\n\n```python\nprint(1)\n```'}
    assert client.post('/api/drafts',json=draft,headers=headers).status_code == 200
    assert client.get('/api/articles').json()['data'] == []
    operation={'operationId':'operation-1','kind':'publish','resourceId':'sample','payload':draft}
    for _ in range(2):
        assert client.post('/api/operations',json={'operations':[operation]},headers=headers).json()['results'][0]['success']
    articles=client.get('/api/articles').json()['data']
    assert len(articles)==1
    assert client.get('/api/articles/sample?type=post').json()['data']['content'] == draft['content']
    assert client.post('/api/drafts',json={**draft,'id':'../../escape'},headers=headers).status_code == 422
    assert client.get('/api/deploy/config').status_code == 404

def test_unknown_operation_and_partial_failure(client):
    login(client)
    response=client.post('/api/operations',json={'operations':[
        {'operationId':'good','kind':'publish','resourceId':'one','payload':{'id':'one','title':'ok','content':'body','type':'post'}},
        {'operationId':'bad','kind':'publish','resourceId':'two','payload':{'id':'../../escape','title':'no','type':'post'}}
    ]},headers={'Origin':'http://testserver'})
    assert [r['success'] for r in response.json()['results']]==[True,False]

def test_upload_validation(client):
    login(client)
    response=client.post('/api/uploads',files={'file':('bad.png',b'not-an-image','image/png')},headers={'Origin':'http://testserver'})
    assert response.status_code==422

def test_config_rejects_invalid_types_and_urls(client):
    login(client)
    for payload in [{'title':123},{'gitalkConfig':'broken'},{'geminiConfig':{'temperature':'hot'}},{'avatarUrl':'javascript:alert(1)'},{'footerBadges':[{'name':'bad','svg':'<script>bad</script>','color':'x'}]}]:
        assert client.put('/api/config',json=payload,headers={'Origin':'http://testserver'}).status_code==422

def test_password_change_revokes_sessions(client):
    login(client)
    response=client.post('/api/auth/password',json={'currentPassword':'long-enough-test-password','newPassword':'different-long-password'},headers={'Origin':'http://testserver'})
    assert response.status_code==200
    assert client.get('/api/auth/session').status_code==401

def test_collection_schema_validation(client):
    login(client)
    for name,value in [('friends',[{'name':'broken'}]),('projects',[{'id':'id','name':'bad','tags':'wrong'}]),('albums',[{'id':'id','photos':'wrong'}])]:
        assert client.put('/api/collections/'+name,json=value,headers={'Origin':'http://testserver'}).status_code==422

def test_old_publish_retry_preserves_newer_draft(client):
    login(client);headers={'Origin':'http://testserver'}
    draft={'id':'sample','type':'post','title':'original','content':'original'}
    operation={'operationId':'retry','kind':'publish','resourceId':'sample','payload':draft}
    client.post('/api/drafts',json=draft,headers=headers)
    client.post('/api/operations',json={'operations':[operation]},headers=headers)
    client.post('/api/drafts',json={**draft,'title':'new edit','content':'new edit'},headers=headers)
    client.post('/api/operations',json={'operations':[operation]},headers=headers)
    assert client.get('/api/drafts/sample').json()['data']['content']=='new edit'

def test_drafts_are_isolated_by_content_type(client):
    login(client);headers={'Origin':'http://testserver'}
    for kind in ['post','chatter']:
        client.post('/api/drafts',json={'id':'same','type':kind,'title':kind,'content':kind},headers=headers)
    assert len(client.get('/api/drafts').json()['data'])==2
    assert client.get('/api/drafts/same?type=post').json()['data']['content']=='post'
    client.delete('/api/drafts/same?type=post',headers=headers)
    assert client.get('/api/drafts/same?type=chatter').json()['data']['content']=='chatter'
