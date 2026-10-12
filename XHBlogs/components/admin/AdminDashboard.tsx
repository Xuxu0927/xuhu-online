'use client';
import {useEffect,useState,useRef} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {cmsFetch} from './cms-client';
import MarkdownEditor from './MarkdownEditor';
import PasswordSettings from './PasswordSettings';
import {enqueue,removeCompleted,type Operation} from '@/lib/operations';
type Article={id:string;type:'post'|'chatter'|'about';title:string;content:string;description:string;date:string;tags:string[];cover:string;mood:string};
type Moment={id:string;date:string;content:string;location:string;images:string[]};
type Section='articles'|'drafts'|'editor'|'moments'|'settings'|'albums'|'friends'|'projects';
type Result<T>={data:T;success:boolean};
const emptyArticle=(type:Article['type']='post'):Article=>({id:type==='about'?'about':`article-${crypto.randomUUID()}`,type,title:'',content:'',description:'',date:new Date().toISOString(),tags:[],cover:'',mood:''});
export default function AdminDashboard({initialSection='articles'}:{initialSection?:Section}){
 const router=useRouter();
 const [ready,setReady]=useState(false),[section,setSection]=useState<Section>(initialSection);
 const [articles,setArticles]=useState<Article[]>([]),[drafts,setDrafts]=useState<Article[]>([]),[moments,setMoments]=useState<Moment[]>([]);
 const [article,setArticle]=useState<Article|null>(null),[moment,setMoment]=useState<Moment|null>(null);
 const [queue,setQueue]=useState<Operation[]>([]),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 const queueRef=useRef<Operation[]>([]);
 const [json,setJson]=useState(''),[config,setConfig]=useState<Record<string,unknown>>({});
 async function refresh(){
  const [a,d,m]=await Promise.all([cmsFetch<Result<Article[]>>('articles'),cmsFetch<Result<Article[]>>('drafts'),cmsFetch<Result<Moment[]>>('moments')]);
  setArticles(a.data);setDrafts(d.data);setMoments(m.data);
 }
 useEffect(()=>{
  let active=true;
  cmsFetch('auth/session').then(async()=>{await refresh();if(initialSection==='editor')setArticle(emptyArticle());if(initialSection==='settings')await changeSection('settings');if(active){setReady(true);try{const saved=JSON.parse(localStorage.getItem('xh-publish-queue')||'[]');if(Array.isArray(saved)){queueRef.current=saved;setQueue(saved);}}catch{localStorage.removeItem('xh-publish-queue');}}}).catch(()=>router.replace('/admin/login'));
  return ()=>{active=false;};
 },[router,initialSection]);
 function persist(next:Operation[]){queueRef.current=next;setQueue(next);localStorage.setItem('xh-publish-queue',JSON.stringify(next));}
 async function action(run:()=>Promise<void>){setBusy(true);setMessage('');try{await run();}catch(error){setMessage(error instanceof Error?error.message:'操作失败');}finally{setBusy(false);}}
 function edit(item:Article){setArticle({...emptyArticle(item.type),...item});setSection('editor');}
 async function changeSection(next:Section){
  setSection(next);setMessage('');
  if(next==='settings'){
   const data=await cmsFetch<Result<Record<string,unknown>>>('config');setConfig(data.data);setJson(JSON.stringify(data.data,null,2));
  }else if(['albums','friends','projects'].includes(next)){
   const data=await cmsFetch<Result<unknown[]>>(`collections/${next}`);setJson(JSON.stringify(data.data,null,2));
  }
 }
 async function publish(){await action(async()=>{
  const response=await cmsFetch<{results:{operationId:string;success:boolean}[]}>('operations',{method:'POST',body:JSON.stringify({operations:queue})});
  const remaining=removeCompleted(queueRef.current,response.results);persist(remaining);await refresh();setMessage(response.results.some(item=>!item.success)?'部分任务失败，已保留待重试任务':remaining.length?'发布成功，另有新加入的任务等待发布':'发布成功，网站内容已更新');
 });}
 async function upload(file:File){const form=new FormData();form.append('file',file);return (await cmsFetch<{url:string}>('uploads',{method:'POST',body:form})).url;}
 if(!ready)return <p className="p-10 text-slate-500">正在验证登录…</p>;
 return <div className="max-w-7xl mx-auto p-4 md:p-8"><header className="flex flex-wrap justify-between items-center gap-4 mb-6"><div><h1 className="text-3xl font-black">网站管理</h1><p className="text-slate-500 mt-1">编辑内容，保存草稿，发布到你的个人网站。</p></div><div className="flex gap-3"><Link href="/" target="_blank" className="admin-secondary">查看网站</Link><button className="admin-secondary" onClick={()=>action(async()=>{await cmsFetch('auth/logout',{method:'POST'});localStorage.removeItem('xh-publish-queue');router.replace('/admin/login');})}>退出登录</button></div></header>
 <div className="flex flex-wrap gap-2 mb-5">{([['articles','文章与杂谈'],['drafts','草稿箱'],['moments','说说'],['settings','网站设置'],['albums','相册'],['friends','友链'],['projects','项目']] as [Section,string][]).map(([key,label])=><button key={key} onClick={()=>action(()=>changeSection(key))} className={section===key?'admin-button':'admin-secondary'}>{label}</button>)}<button className="admin-button" onClick={()=>edit(emptyArticle())}>新建文章</button><button className="admin-secondary" onClick={()=>edit(emptyArticle('chatter'))}>新建杂谈</button><button className="admin-secondary" onClick={()=>edit(articles.find(a=>a.type==='about')||emptyArticle('about'))}>编辑关于</button></div>
 <p role="status" className="min-h-6 mb-3 text-indigo-600 dark:text-indigo-300">{message}</p>
 <div className="rounded-3xl bg-white/80 dark:bg-slate-900/80 p-5 md:p-8 shadow-lg">
 {(section==='articles'||section==='drafts')&&<div className="space-y-3">{(section==='articles'?articles:drafts).map(item=><div key={`${item.type}-${item.id}`} className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 py-3 gap-3"><div><h2 className="font-bold">{item.title||'无标题'}</h2><p className="text-sm text-slate-500">{item.type} · {item.date}</p></div><div className="flex gap-2"><button aria-label={`编辑 ${item.title}`} className="admin-secondary" onClick={()=>edit(item)}>编辑</button><button className="text-red-500" onClick={()=>{if(confirm('移到回收区？'))action(async()=>{await cmsFetch(`${section}/${encodeURIComponent(item.id)}?type=${item.type}`,{method:'DELETE'});await refresh();setMessage('已移到回收区');});}}>删除</button></div></div>)}{!(section==='articles'?articles:drafts).length&&<p className="text-slate-500">暂无内容。</p>}</div>}
 {section==='editor'&&article&&<div className="space-y-4">
  <label className="block">标题<input className="admin-input" value={article.title} onChange={e=>setArticle({...article,title:e.target.value})}/></label>
  <div className="grid md:grid-cols-2 gap-4"><label>标签（逗号分隔）<input className="admin-input" value={article.tags.join(',')} onChange={e=>setArticle({...article,tags:e.target.value.split(',').map(v=>v.trim()).filter(Boolean)})}/></label><label>发布日期<input className="admin-input" value={article.date} onChange={e=>setArticle({...article,date:e.target.value})}/></label></div>
  <label className="block">摘要<input className="admin-input" value={article.description} onChange={e=>setArticle({...article,description:e.target.value})}/></label>
  <label className="block">封面地址<input className="admin-input" value={article.cover} onChange={e=>setArticle({...article,cover:e.target.value})}/></label>
  <MarkdownEditor key={`${article.type}-${article.id}`} content={article.content} onChange={content=>setArticle(previous=>previous?{...previous,content}:previous)}/>
  <label className="admin-secondary inline-block cursor-pointer">上传正文图片<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)action(async()=>{const url=await upload(file);setArticle(previous=>previous?{...previous,content:previous.content+`\n\n![图片](${url})\n`}:previous);});}}/></label>
  <div className="flex gap-3"><button disabled={busy} className="admin-secondary" onClick={()=>action(async()=>{await cmsFetch('drafts',{method:'POST',body:JSON.stringify(article)});await refresh();setMessage('草稿已保存');})}>保存草稿</button><button className="admin-button" disabled={!article.title.trim()&&article.type!=='about'} onClick={()=>{persist(enqueue(queueRef.current,{operationId:crypto.randomUUID(),kind:'publish',resourceId:article.id,payload:article}));setMessage('已加入发布队列');}}>加入发布队列</button></div>
 </div>}
 {section==='moments'&&<div className="space-y-4"><button className="admin-button" onClick={()=>setMoment({id:`moment-${crypto.randomUUID()}`,date:new Date().toISOString(),content:'',location:'',images:[]})}>新建说说</button>{moment&&<div className="space-y-3"><label className="block">说说内容<textarea className="admin-input min-h-40" value={moment.content} onChange={e=>setMoment({...moment,content:e.target.value})}/></label><label className="block">位置<input className="admin-input" value={moment.location} onChange={e=>setMoment({...moment,location:e.target.value})}/></label><label className="block">图片地址（每行一个）<textarea className="admin-input" value={moment.images.join('\n')} onChange={e=>setMoment({...moment,images:e.target.value.split('\n').filter(Boolean)})}/></label><button className="admin-button" onClick={()=>action(async()=>{await cmsFetch('moments',{method:'POST',body:JSON.stringify(moment)});setMoment(null);await refresh();setMessage('说说已发布');})}>发布说说</button></div>}{moments.map(item=><div key={item.id} className="border-b py-3"><p className="whitespace-pre-wrap">{item.content}</p><button className="admin-secondary mt-2" onClick={()=>setMoment(item)}>编辑</button><button className="ml-4 text-red-500" onClick={()=>{if(confirm('删除这条说说？'))action(async()=>{await cmsFetch(`moments/${item.id}`,{method:'DELETE'});await refresh();});}}>删除</button></div>)}</div>}
 {section==='settings'&&<div className="space-y-4"><div className="grid md:grid-cols-2 gap-4">{(['title','authorName','bio','navTitle','navSuffix','navAfter','avatarUrl','faviconUrl','siteUrl'] as const).map(key=><label key={key}>{({title:'网站标题',authorName:'作者名称',bio:'个人简介',navTitle:'导航名称',navSuffix:'导航分隔符',navAfter:'导航后缀',avatarUrl:'头像地址',faviconUrl:'网站图标',siteUrl:'网站地址'})[key]}<input className="admin-input" value={String(config[key]||'')} onChange={e=>{const next={...config,[key]:e.target.value};setConfig(next);setJson(JSON.stringify(next,null,2));}}/></label>)}</div><label className="block">完整公开配置（JSON）<textarea className="admin-input min-h-96 font-mono text-sm" value={json} onChange={e=>setJson(e.target.value)}/></label><button className="admin-button" disabled={busy} onClick={()=>action(async()=>{await cmsFetch('config',{method:'PUT',body:JSON.stringify(JSON.parse(json))});router.refresh();setMessage('设置已保存，网站已更新');})}>保存网站设置</button></div>}
 {['albums','friends','projects'].includes(section)&&<div className="space-y-4"><p className="text-slate-500">在下方编辑集合 JSON，保存后网站立即读取新内容。</p><textarea aria-label="集合内容" className="admin-input min-h-96 font-mono text-sm" value={json} onChange={e=>setJson(e.target.value)}/><button className="admin-button" disabled={busy} onClick={()=>action(async()=>{const value=JSON.parse(json);if(!Array.isArray(value))throw new Error('集合必须是数组');await cmsFetch(`collections/${section}`,{method:'PUT',body:JSON.stringify(value)});router.refresh();setMessage('集合已保存');})}>保存集合</button></div>}
 </div>
 {section==='settings'&&<PasswordSettings/>}
 {queue.length>0&&<aside className="mt-5 p-5 rounded-3xl bg-indigo-100 dark:bg-indigo-950"><h2 className="font-bold mb-3">待发布：{queue.length} 项</h2>{queue.map(op=><div key={op.operationId} className="flex justify-between py-1"><span>{String(op.payload.title||'关于')}</span><button onClick={()=>persist(queueRef.current.filter(item=>item.operationId!==op.operationId))}>移除</button></div>)}<button disabled={busy} className="admin-button mt-3" onClick={publish}>执行发布（{queue.length}）</button></aside>}
 </div>;
}
