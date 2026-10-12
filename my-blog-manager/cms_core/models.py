from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator
from .storage import IDENTIFIER

class ArticleInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str
    type: Literal['post','chatter','about']='post'
    title: str = Field(default='',max_length=300)
    content: str = Field(default='',max_length=1_000_000)
    description: str = Field(default='',max_length=2000)
    date: str=''
    tags: list[str]=Field(default_factory=list,max_length=50)
    cover: str=''
    mood: str=''
    @field_validator('id')
    @classmethod
    def bounded_id(cls,value):
        if not IDENTIFIER.fullmatch(value): raise ValueError('Invalid content identifier')
        return value

class MomentInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str
    date: str=''
    content: str=Field(default='',max_length=100000)
    location: str=Field(default='',max_length=200)
    images: list[str]=Field(default_factory=list,max_length=20)
    @field_validator('id')
    @classmethod
    def bounded_id(cls,value): return ArticleInput.bounded_id(value)

class OperationInput(BaseModel):
    model_config=ConfigDict(extra='forbid')
    operationId: str=Field(pattern=r'^[\w-]{1,120}$')
    kind: Literal['publish']
    resourceId: str=Field(pattern=r'^[\w-]{1,120}$')
    payload: dict

class OperationBatch(BaseModel):
    operations: list[OperationInput]=Field(max_length=100)

class Friend(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str
    name: str
    url: str
    description: str=''
    avatar: str=''
    themeColor: str='rgba(99,102,241,0.5)'

class Project(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str
    name: str
    description: str=''
    icon: str=''
    githubUrl: str=''
    tags: list[str]=Field(default_factory=list)

class Photo(BaseModel):
    model_config=ConfigDict(extra='forbid')
    url: str
    caption: str=''

class Album(BaseModel):
    model_config=ConfigDict(extra='forbid')
    id: str
    title: str
    description: str=''
    cover: str=''
    date: str=''
    photos: list[Photo]=Field(default_factory=list,max_length=5000)

def validate_collection(name: str, values: list[dict]):
    model={'albums':Album,'friends':Friend,'projects':Project}[name]
    result=[]
    for item in values:
        normalized=model.model_validate(item).model_dump()
        for key in ['url','githubUrl','avatar','cover']:
            url=normalized.get(key,'')
            if url and not url.startswith(('https://','http://','/uploads/')):raise ValueError('Unsafe collection URL')
        if name=='albums':
            for photo in normalized['photos']:
                if not photo['url'].startswith(('https://','http://','/uploads/')):raise ValueError('Unsafe image URL')
        result.append(normalized)
    return result

class GeminiConfig(BaseModel):
    model_config=ConfigDict(extra='forbid')
    modelId: str=Field(pattern=r'^[A-Za-z0-9.-]+$',max_length=100)
    systemPrompt: str=Field(max_length=10000)
    maxOutputTokens: int=Field(ge=1,le=4096)
    temperature: float=Field(ge=0,le=2)

def validate_config(payload: dict):
    import re
    strings={'title','faviconUrl','authorName','bio','navTitle','navSuffix','navAfter','avatarUrl','defaultPostCover','photoWallImage','chatterTitle','chatterDescription','buildDate','friendLinkApplyFormat','siteUrl'}
    for key in strings & payload.keys():
        if not isinstance(payload[key],str) or len(payload[key])>20000: raise ValueError('Invalid string setting')
    for key in {'useGradient','enableLevelSystem','enableEffects'} & payload.keys():
        if not isinstance(payload[key],bool): raise ValueError('Invalid boolean setting')
    for key in {'bgImages','themeColors','cloudMusicIds','danmakuList'} & payload.keys():
        if not isinstance(payload[key],list) or len(payload[key])>1000 or not all(isinstance(v,str) and len(v)<2000 for v in payload[key]): raise ValueError('Invalid list setting')
    def safe_url(value):
        if value and not (value.startswith('https://') or value.startswith('http://') or (value.startswith('/') and not value.startswith('//'))): raise ValueError('Unsafe URL')
    for key in {'faviconUrl','avatarUrl','defaultPostCover','photoWallImage','siteUrl'} & payload.keys(): safe_url(payload[key])
    for value in payload.get('bgImages',[]): safe_url(value)
    for key in {'social','counts','gitalkConfig','icpConfig','geminiConfig'} & payload.keys():
        if not isinstance(payload[key],dict): raise ValueError('Invalid object setting')
    if 'geminiConfig' in payload: GeminiConfig.model_validate(payload['geminiConfig'])
    if 'gitalkConfig' in payload:
        value=payload['gitalkConfig']
        if set(value)-{'clientID','repo','owner','admin'}: raise ValueError('Unknown comment setting')
        for key in ['clientID','repo','owner']:
            if key in value and not isinstance(value[key],str): raise ValueError('Invalid comment setting')
        if 'admin' in value and (not isinstance(value['admin'],list) or not all(isinstance(v,str) for v in value['admin'])): raise ValueError('Invalid administrators')
    if 'footerBadges' in payload:
        if not isinstance(payload['footerBadges'],list): raise ValueError('Invalid badges')
        for badge in payload['footerBadges']:
            if not isinstance(badge,dict) or not all(isinstance(badge.get(key,''),str) for key in ['name','color','svg']): raise ValueError('Invalid badge')
            svg=badge.get('svg','')
            if re.search(r'<\s*(?!/?(?:path|circle|rect|line|polyline|polygon|g)\b)[a-z]',svg,re.I) or re.search(r'\bon\w+\s*=|href\s*=|style\s*=',svg,re.I): raise ValueError('Unsafe badge SVG')
