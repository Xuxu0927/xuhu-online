const allowed=/^(auth\/(login|logout|session|password)|config|collections\/(albums|friends|projects)|articles(?:\/[\p{L}\p{N}_-]+)?|drafts(?:\/[\p{L}\p{N}_-]+)?|moments(?:\/[\p{L}\p{N}_-]+)?|operations|uploads)$/u;
export async function proxyCms(request:Request,segments:string[]):Promise<Response>{
 const route=segments.join('/');
 if(!allowed.test(route))return Response.json({detail:'Unknown management route'},{status:404});
 const length=Number(request.headers.get('content-length')||0);
 if(length>12_000_000)return Response.json({detail:'Request too large'},{status:413});
 const headers=new Headers();
 for(const key of ['cookie','content-type','origin']){const value=request.headers.get(key);if(value)headers.set(key,value);}
 const source=new URL(request.url);
 const target=new URL(`/api/${route}${source.search}`,process.env.CMS_INTERNAL_URL||'http://127.0.0.1:8000');
 try{
  const response=await fetch(target,{method:request.method,headers,body:['GET','HEAD'].includes(request.method)?undefined:await request.arrayBuffer(),signal:AbortSignal.timeout(15000),cache:'no-store',redirect:'manual'});
  const resultHeaders=new Headers({'Content-Type':response.headers.get('content-type')||'application/json','Cache-Control':'no-store'});
  for(const cookie of response.headers.getSetCookie())resultHeaders.append('Set-Cookie',cookie);
  return new Response(response.body,{status:response.status,headers:resultHeaders});
 }catch{return Response.json({detail:'Content service unavailable'},{status:503});}
}
