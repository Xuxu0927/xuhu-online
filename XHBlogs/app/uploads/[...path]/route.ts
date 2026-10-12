import fs from 'node:fs';
import path from 'node:path';
import {getContentRoot} from '@/lib/content';
export async function GET(_request:Request,context:{params:Promise<{path:string[]}>}){
 const segments=(await context.params).path;
 if(segments.length!==1||!/^\w{32}\.(jpg|png|webp|gif)$/.test(segments[0]))return new Response('Not found',{status:404});
 const root=path.join(getContentRoot(),'uploads'),file=path.join(root,segments[0]);
 if(!fs.existsSync(file)||!fs.realpathSync(file).startsWith(fs.realpathSync(root)+path.sep))return new Response('Not found',{status:404});
 const ext=path.extname(file).slice(1),type={jpg:'image/jpeg',png:'image/png',webp:'image/webp',gif:'image/gif'}[ext];
 return new Response(fs.readFileSync(file),{headers:{'Content-Type':type||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'public,max-age=86400'}});
}
