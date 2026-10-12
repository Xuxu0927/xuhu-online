'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {cmsFetch} from '@/components/admin/cms-client';
export default function Login(){
 const [username,setUsername]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const router=useRouter();
 async function submit(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');
  try{await cmsFetch('auth/login',{method:'POST',body:JSON.stringify({username,password})});setPassword('');router.replace('/admin');}
  catch(error){setError(error instanceof Error?error.message:'登录失败');}finally{setBusy(false);}
 }
 return <div className="min-h-screen flex items-center justify-center p-6"><form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-8 shadow-xl space-y-5"><h1 className="text-2xl font-bold">登录网站管理</h1><label className="block">用户名<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} required className="admin-input"/></label><label className="block">密码<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required className="admin-input"/></label><p role="alert" className="text-red-500">{error}</p><button disabled={busy} className="admin-button w-full">{busy?'登录中…':'登录'}</button><p className="text-sm text-slate-500">公网 IP 测试阶段请通过 SSH 隧道访问后台。</p></form></div>;
}
