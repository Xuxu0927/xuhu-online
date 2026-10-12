export async function cmsFetch<T>(path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(`/api/cms/${path}`,{...init,headers:{...(init.body instanceof FormData?{}:{'Content-Type':'application/json'}),...init.headers},cache:'no-store'});
 const data=await response.json();
 if(!response.ok)throw new Error(data.detail||'操作失败');
 return data as T;
}
