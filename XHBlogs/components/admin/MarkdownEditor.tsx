'use client';
import {useState,useEffect} from 'react';
import {EditorContent,useEditor} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {Markdown} from '@tiptap/markdown';
import {TableKit} from '@tiptap/extension-table';
import Image from '@tiptap/extension-image';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Mathematics from '@tiptap/extension-mathematics';

function RichEditor({content,onChange}:{content:string;onChange:(value:string)=>void}){
 const editor=useEditor({extensions:[StarterKit,Markdown,TableKit,Image,TaskList,TaskItem.configure({nested:true}),Mathematics],content,contentType:'markdown',immediatelyRender:false,onUpdate:({editor})=>onChange(editor.getMarkdown()),editorProps:{attributes:{class:'prose dark:prose-invert max-w-none min-h-80 p-5 outline-none'}}});
 useEffect(()=>{
  if(editor&&editor.getMarkdown()!==content)editor.commands.setContent(content,{contentType:'markdown',emitUpdate:false});
 },[editor,content]);
 if(!editor)return <p>正在载入编辑器…</p>;
 return <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"><div className="flex flex-wrap gap-2 p-3 border-b border-slate-200 dark:border-slate-700">
  <button type="button" onClick={()=>editor.chain().focus().toggleBold().run()}>粗体</button>
  <button type="button" onClick={()=>editor.chain().focus().toggleItalic().run()}>斜体</button>
  <button type="button" onClick={()=>editor.chain().focus().toggleHeading({level:2}).run()}>标题</button>
  <button type="button" onClick={()=>editor.chain().focus().toggleBlockquote().run()}>引用</button>
  <button type="button" onClick={()=>editor.chain().focus().toggleBulletList().run()}>列表</button>
  <button type="button" onClick={()=>editor.chain().focus().toggleCodeBlock().run()}>代码</button>
  <button type="button" onClick={()=>editor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run()}>表格</button>
  <button type="button" onClick={()=>editor.chain().focus().undo().run()}>撤销</button>
  <button type="button" onClick={()=>editor.chain().focus().redo().run()}>重做</button>
 </div><EditorContent editor={editor}/></div>;
}
export default function MarkdownEditor({content,onChange}:{content:string;onChange:(value:string)=>void}){
 const [rich,setRich]=useState(false);
 return <div><div className="flex justify-between mb-2"><label htmlFor="markdown-body">Markdown 正文</label><button type="button" onClick={()=>setRich(!rich)} className="text-indigo-500">{rich?'切换 Markdown':'切换富文本'}</button></div>
  {rich?<RichEditor content={content} onChange={onChange}/>:<textarea id="markdown-body" value={content} onChange={e=>onChange(e.target.value)} className="admin-input min-h-96 font-mono text-sm"/>}
 </div>;
}
