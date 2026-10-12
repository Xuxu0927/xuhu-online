import fs from 'node:fs';
import path from 'node:path';
import defaults from '../data/default-site.json';
import { albums as defaultAlbums } from '../data/albums';
import { friendsData as defaultFriends } from '../data/friends';
import { projectsData as defaultProjects } from '../data/projects';

export type PublicSiteConfig = typeof defaults;
export function getContentRoot(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.CONTENT_ROOT || path.join(process.cwd(),'..','runtime','content'));
}
export function contentPath(category:string, identifier?:string):string {
  if(!['posts','chatters','moments','uploads','drafts'].includes(category)) throw new Error('Invalid category');
  if(identifier!==undefined && !/^[\p{L}\p{N}_-]{1,120}$/u.test(identifier)) throw new Error('Invalid content ID');
  const root=getContentRoot();
  const result=path.join(root,category,identifier?`${identifier}.md`:'');
  if(fs.existsSync(result) && !fs.realpathSync(result).startsWith(fs.realpathSync(root)+path.sep)) throw new Error('Content escapes root');
  return result;
}
export function readPublicConfig():PublicSiteConfig {
  const file=path.join(getContentRoot(),'site.json');
  const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
  const config={...defaults};
  for(const key of Object.keys(defaults) as (keyof PublicSiteConfig)[]) {
    if(data[key]!==undefined) (config as Record<string,unknown>)[key]=data[key];
  }
  config.gitalkConfig={clientID:config.gitalkConfig.clientID||'',repo:config.gitalkConfig.repo||'',owner:config.gitalkConfig.owner||'',admin:config.gitalkConfig.admin||[]};
  return config;
}
export const runtimeSiteConfig=new Proxy(defaults,{get(_target,key){return readPublicConfig()[key as keyof PublicSiteConfig];}});
export function readCollection<T>(name:'albums'|'friends'|'projects'):T[] {
  const file=path.join(getContentRoot(),`${name}.json`);
  const data=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{albums:defaultAlbums,friends:defaultFriends,projects:defaultProjects}[name];
  if(!Array.isArray(data)) throw new Error('Invalid collection');
  return data as T[];
}
export function siteData(){return {config:readPublicConfig(),albums:readCollection<typeof defaultAlbums[number]>('albums'),friends:readCollection<typeof defaultFriends[number]>('friends'),projects:readCollection<typeof defaultProjects[number]>('projects')};}
