'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import {cmsFetch} from './cms-client';
export default function PasswordSettings(){
 const router=useRouter();
 const [current,setCurrent]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState('');
 async function submit(event:React.FormEvent){event.preventDefault();try{await cmsFetch('auth/password',{method:'POST',body:JSON.stringify({currentPassword:current,newPassword:password})});setCurrent('');setPassword('');router.replace('/admin/login');}catch(error){setMessage(error instanceof Error?error.message:'修改失败');}}
 return <form onSubmit={submit} className="border-t mt-8 pt-6 space-y-3"><h2 className="font-bold">修改管理员密码</h2><label className="block">当前密码<input type="password" autoComplete="current-password" value={current} onChange={e=>setCurrent(e.target.value)} className="admin-input" required/></label><label className="block">新密码<input type="password" minLength={12} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} className="admin-input" required/></label><p role="alert">{message}</p><button className="admin-secondary">修改密码并重新登录</button></form>;
}
