import fs from 'node:fs';
import type {MetadataRoute} from 'next';
import {readPublicConfig,contentPath} from '@/lib/content';
export const dynamic='force-dynamic';
export default function sitemap():MetadataRoute.Sitemap{
 const base=readPublicConfig().siteUrl.replace(/\/$/,'');
 const entries:MetadataRoute.Sitemap=['','/about','/timeline','/chatter','/moments','/photowall','/projects','/friends','/music','/tree'].map(route=>({url:base+route}));
 for(const category of ['posts','chatters']){
  const dir=contentPath(category);
  if(fs.existsSync(dir))for(const name of fs.readdirSync(dir).filter(f=>f.endsWith('.md'))){entries.push({url:`${base}/${category==='posts'?'posts':'chatter'}/${encodeURIComponent(name.slice(0,-3))}`,lastModified:fs.statSync(contentPath(category,name.slice(0,-3))).mtime});}
 }
 return entries;
}
