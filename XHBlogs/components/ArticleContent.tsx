'use client';
import {useEffect,useRef} from 'react';
import './article-content.css';

async function copyText(text:string):Promise<boolean>{
 if(window.isSecureContext&&navigator.clipboard){
  try{await navigator.clipboard.writeText(text);return true;}catch{/* Fall back for denied clipboard permissions. */}
 }
 const previous=document.activeElement as HTMLElement|null;
 const input=document.createElement('textarea');
 input.value=text;input.readOnly=true;
 input.style.cssText='position:fixed;left:-9999px;top:0;opacity:0';
 document.body.append(input);input.focus();input.select();
 try{return document.execCommand('copy');}catch{return false;}
 finally{input.remove();previous?.focus({preventScroll:true});}
}

export default function ArticleContent({html}:{html:string}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const cleanups:(()=>void)[]=[];
  for(const pre of root.current?.querySelectorAll('pre')||[]){
   const code=pre.querySelector('code');if(!code)continue;
   let wrapper=pre.parentElement;
   if(!wrapper?.classList.contains('article-code-block')){
    wrapper=document.createElement('div');wrapper.className='article-code-block';pre.before(wrapper);wrapper.append(pre);
    const toolbar=document.createElement('div');toolbar.className='article-code-toolbar';
    const language=document.createElement('span');language.textContent=Array.from(code.classList).find(name=>name.startsWith('language-'))?.slice(9)||'text';
    const button=document.createElement('button');button.type='button';button.textContent='复制代码';button.setAttribute('aria-live','polite');
    toolbar.append(language,button);wrapper.prepend(toolbar);
   }
   const button=wrapper.querySelector('button');if(!button)continue;
   let timer:ReturnType<typeof setTimeout>|undefined;
   const copy=async()=>{
    button.disabled=true;
    const success=await copyText(code.textContent||'');
    button.textContent=success?'已复制':'复制失败，请手动选择';button.disabled=false;
    if(timer)clearTimeout(timer);
    timer=setTimeout(()=>{button.textContent='复制代码';},2500);
   };
   button.addEventListener('click',copy);
   cleanups.push(()=>{button.removeEventListener('click',copy);if(timer)clearTimeout(timer);});
  }
  return ()=>cleanups.forEach(cleanup=>cleanup());
 },[html]);
 return <div id="article-content" ref={root} className="article-content prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{__html:html}}/>;
}
