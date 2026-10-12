"""Server-only CMS. No Git shell, arbitrary sync, or desktop dependencies."""
import io
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
import yaml
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, Request, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel, Field, ValidationError
from .auth import COOKIE, verify_origin, require_admin, verify_password, create_session, hash_password
from .models import ArticleInput, MomentInput, OperationBatch, validate_config, validate_collection
from .storage import safe_path, read_json, write_json, atomic_write, recycle, lock

PUBLIC_KEYS = {'title','faviconUrl','authorName','bio','navTitle','navSuffix','navAfter','avatarUrl','useGradient','themeColors','bgImages','defaultPostCover','photoWallImage','cloudMusicIds','social','counts','chatterTitle','chatterDescription','danmakuList','gitalkConfig','buildDate','footerBadges','icpConfig','geminiConfig','friendLinkApplyFormat','enableLevelSystem','enableEffects','siteUrl'}

def document(path: Path, kind: str):
    raw=path.read_text(encoding='utf8'); metadata={}; body=raw
    if raw.startswith('---'):
        parts=raw.split('---',2)
        if len(parts)==3:
            metadata=yaml.safe_load(parts[1]) or {}; body=parts[2].lstrip('\n')
    return {**metadata,'id':path.stem,'type':kind,'content':body}

def serialize(data: dict):
    return '---\n'+yaml.safe_dump({k:v for k,v in data.items() if k not in ['content','type']},allow_unicode=True,sort_keys=False)+'---\n\n'+data['content']

def create_app(content_root: Path | None=None, secrets_root: Path | None=None, admin_origin: str | None=None):
    app=FastAPI(title='Xuhu Personal Site CMS',docs_url=None,redoc_url=None,openapi_url=None)
    runtime=Path(__file__).resolve().parents[2]/'runtime'
    app.state.content=Path(content_root or os.environ.get('CONTENT_ROOT',runtime/'content')).resolve()
    app.state.secrets=Path(secrets_root or os.environ.get('SECRETS_ROOT',runtime/'secrets')).resolve()
    app.state.admin_origin=admin_origin or os.environ.get('ADMIN_ORIGIN','http://localhost:18081')
    app.state.login_attempts={}; root=app.state.content; root.mkdir(parents=True,exist_ok=True)

    @app.middleware('http')
    async def boundary(request: Request, call_next):
        from fastapi.responses import JSONResponse
        if request.method in ['POST','PUT','DELETE','PATCH'] and request.url.path.startswith('/api/'):
            try: verify_origin(request)
            except HTTPException as error: return JSONResponse({'detail':error.detail},status_code=error.status_code)
        try: length=int(request.headers.get('content-length','0') or '0')
        except ValueError: return JSONResponse({'detail':'Invalid length'},status_code=400)
        if length>12_000_000: return JSONResponse({'detail':'Request too large'},status_code=413)
        return await call_next(request)

    @app.get('/health')
    def health(): return {'status':'ok'}

    class Credentials(BaseModel):
        username: str=Field(max_length=100)
        password: str=Field(max_length=1000)

    @app.post('/api/auth/login')
    def login(payload: Credentials, request: Request):
        admin=read_json(app.state.secrets/'admin.json')
        if not admin: raise HTTPException(503,'Administrator initialization required')
        failures=[t for t in app.state.login_attempts.get('global',[]) if t>time.time()-900]
        if len(failures)>=10: raise HTTPException(429,'Too many login attempts; try again later')
        if payload.username!=admin['username'] or not verify_password(payload.password,admin['password']):
            failures.append(time.time()); app.state.login_attempts['global']=failures
            raise HTTPException(401,'Incorrect username or password')
        app.state.login_attempts['global']=[]
        from fastapi.responses import JSONResponse
        response=JSONResponse({'success':True})
        response.set_cookie(COOKIE,create_session(app.state.secrets),httponly=True,samesite='strict',secure=app.state.admin_origin.startswith('https://'),max_age=43200,path='/')
        return response

    @app.get('/api/auth/session')
    def session(user=Depends(require_admin)): return {'success':True,'username':user}

    @app.post('/api/auth/logout')
    def logout(request: Request,user=Depends(require_admin)):
        with lock(app.state.secrets):
            sessions=read_json(app.state.secrets/'sessions.json',{})
            sessions.pop(request.cookies.get(COOKIE,'').split('.')[0],None)
            write_json(app.state.secrets/'sessions.json',sessions)
        from fastapi.responses import JSONResponse
        response=JSONResponse({'success':True}); response.delete_cookie(COOKIE); return response

    class PasswordChange(BaseModel):
        currentPassword: str=Field(max_length=1000)
        newPassword: str=Field(min_length=12,max_length=1000)

    @app.post('/api/auth/password')
    def password_change(payload: PasswordChange,user=Depends(require_admin)):
        with lock(app.state.secrets):
            admin=read_json(app.state.secrets/'admin.json')
            if not verify_password(payload.currentPassword,admin['password']): raise HTTPException(401,'Incorrect current password')
            admin['password']=hash_password(payload.newPassword)
            write_json(app.state.secrets/'admin.json',admin)
            write_json(app.state.secrets/'sessions.json',{})
        return {'success':True}

    @app.get('/api/config')
    def config(user=Depends(require_admin)): return {'success':True,'data':read_json(root/'site.json',{})}

    @app.put('/api/config')
    def update_config(payload: dict,user=Depends(require_admin)):
        if set(payload)-PUBLIC_KEYS: raise HTTPException(422,'Unknown or secret config field')
        try: validate_config(payload)
        except (ValueError,ValidationError,TypeError): raise HTTPException(422,'Invalid setting types or unsafe values') from None
        for key in ['bgImages','themeColors','cloudMusicIds','danmakuList','footerBadges']:
            if key in payload and not isinstance(payload[key],list): raise HTTPException(422,f'{key} must be an array')
        if 'themeColors' in payload and not payload['themeColors']: raise HTTPException(422,'At least one theme color is required')
        gemini=payload.get('geminiConfig')
        if gemini is not None and (not isinstance(gemini,dict) or not 0<=gemini.get('temperature',0.85)<=2 or not 1<=gemini.get('maxOutputTokens',150)<=4096):
            raise HTTPException(422,'Invalid AI configuration')
        with lock(root):
            current=read_json(root/'site.json',{}); current.update(payload); write_json(root/'site.json',current)
        return {'success':True}

    def collection_name(name):
        if name not in ['albums','friends','projects']: raise HTTPException(404,'Unknown collection')

    @app.get('/api/collections/{name}')
    def get_collection(name: str,user=Depends(require_admin)):
        collection_name(name); return {'success':True,'data':read_json(root/f'{name}.json',[])}

    @app.put('/api/collections/{name}')
    def put_collection(name: str,payload: list[dict],user=Depends(require_admin)):
        collection_name(name)
        if len(payload)>2000: raise HTTPException(422,'Collection too large')
        try: normalized=validate_collection(name,payload)
        except (ValueError,ValidationError):raise HTTPException(422,'Invalid collection structure or URL') from None
        with lock(root): write_json(root/f'{name}.json',normalized)
        return {'success':True}

    @app.get('/api/drafts')
    def drafts(user=Depends(require_admin)): return {'success':True,'data':[read_json(p) for p in sorted((root/'drafts').glob('*.json'))]}

    def draft_path(identifier: str,kind: str):
        if kind not in ['post','chatter','about']:raise ValueError('Invalid draft type')
        safe_path(root,'drafts',identifier,'.json')
        path=safe_path(root,'drafts',kind+'-'+identifier,'.json')
        legacy=safe_path(root,'drafts',identifier,'.json')
        if not path.exists() and legacy.exists() and read_json(legacy).get('type','post')==kind:return legacy
        return path

    @app.post('/api/drafts')
    def save_draft(payload: ArticleInput,user=Depends(require_admin)):
        with lock(root): write_json(draft_path(payload.id,payload.type),payload.model_dump())
        return {'success':True,'id':payload.id}

    @app.get('/api/drafts/{identifier}')
    def get_draft(identifier: str,type: str='post',user=Depends(require_admin)):
        try: data=read_json(draft_path(identifier,type))
        except ValueError: raise HTTPException(422,'Invalid ID') from None
        if data is None: raise HTTPException(404,'Draft not found')
        return {'success':True,'data':data}

    @app.delete('/api/drafts/{identifier}')
    def delete_draft(identifier: str,type: str='post',user=Depends(require_admin)):
        try: path=draft_path(identifier,type)
        except ValueError: raise HTTPException(422,'Invalid ID') from None
        with lock(root):
            if path.exists(): recycle(root,path)
        return {'success':True}

    @app.get('/api/articles')
    def articles(user=Depends(require_admin)):
        data=[]
        for folder,kind in [('posts','post'),('chatters','chatter')]: data.extend(document(p,kind) for p in (root/folder).glob('*.md'))
        if (root/'about.md').exists(): data.append(document(root/'about.md','about'))
        return {'success':True,'data':data}

    def article_path(identifier,kind):
        if kind not in ['post','chatter','about']: raise HTTPException(422,'Invalid type')
        if kind=='about': return root/'about.md'
        try: return safe_path(root,'posts' if kind=='post' else 'chatters',identifier,'.md')
        except ValueError: raise HTTPException(422,'Invalid ID') from None

    @app.get('/api/articles/{identifier}')
    def article(identifier: str,type: str='post',user=Depends(require_admin)):
        path=article_path(identifier,type)
        if not path.exists(): raise HTTPException(404,'Article not found')
        return {'success':True,'data':document(path,type)}

    @app.delete('/api/articles/{identifier}')
    def delete_article(identifier: str,type: str='post',user=Depends(require_admin)):
        path=article_path(identifier,type)
        with lock(root):
            if path.exists(): recycle(root,path)
        return {'success':True}

    @app.post('/api/operations')
    def operations(payload: OperationBatch,user=Depends(require_admin)):
        results=[]
        with lock(root):
            completed=read_json(root/'.operations.json',{})
            for operation in payload.operations:
                try:
                    data=ArticleInput.model_validate(operation.payload)
                    if data.id!=operation.resourceId: raise ValueError('Resource ID mismatch')
                    if operation.operationId not in completed:
                        value=data.model_dump()
                        if not value['date']: value['date']=datetime.now(timezone.utc).isoformat()
                        atomic_write(article_path(data.id,data.type),serialize(value))
                        completed[operation.operationId]=data.id; write_json(root/'.operations.json',completed)
                        current_draft=draft_path(data.id,data.type)
                        if current_draft.exists() and read_json(current_draft)==data.model_dump():recycle(root,current_draft)
                    results.append({'operationId':operation.operationId,'success':True})
                except (ValueError,ValidationError,HTTPException):
                    results.append({'operationId':operation.operationId,'success':False,'message':'Invalid content; operation was not published'})
        return {'success':all(r['success'] for r in results),'results':results}

    @app.get('/api/moments')
    def moments(user=Depends(require_admin)): return {'success':True,'data':[document(p,'moment') for p in (root/'moments').glob('*.md')]}

    @app.post('/api/moments')
    def save_moment(payload: MomentInput,user=Depends(require_admin)):
        value=payload.model_dump()
        if not value['date']: value['date']=datetime.now(timezone.utc).isoformat()
        with lock(root): atomic_write(safe_path(root,'moments',payload.id,'.md'),serialize(value))
        return {'success':True}

    @app.delete('/api/moments/{identifier}')
    def delete_moment(identifier: str,user=Depends(require_admin)):
        try: path=safe_path(root,'moments',identifier,'.md')
        except ValueError: raise HTTPException(422,'Invalid ID') from None
        with lock(root):
            if path.exists(): recycle(root,path)
        return {'success':True}

    @app.post('/api/uploads')
    async def upload(file: UploadFile=File(...),user=Depends(require_admin)):
        data=await file.read(8_000_001)
        if len(data)>8_000_000: raise HTTPException(413,'Image exceeds 8 MB')
        try:
            image=Image.open(io.BytesIO(data)); image.verify()
            if image.format not in ['JPEG','PNG','WEBP','GIF'] or image.width*image.height>40_000_000: raise ValueError()
        except (UnidentifiedImageError,ValueError,OSError,Image.DecompressionBombError): raise HTTPException(422,'Invalid image') from None
        extension={'JPEG':'.jpg','PNG':'.png','WEBP':'.webp','GIF':'.gif'}[image.format]
        identifier=uuid.uuid4().hex; path=safe_path(root,'uploads',identifier,extension)
        path.parent.mkdir(parents=True,exist_ok=True); path.write_bytes(data)
        return {'success':True,'url':f'/uploads/{identifier}{extension}'}

    return app
