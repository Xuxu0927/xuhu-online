"use client";
import {useSiteConfig} from './SiteConfigProvider';
export default function Comments(){
 const {gitalkConfig}=useSiteConfig();
 if(!gitalkConfig.owner||!gitalkConfig.repo)return <p className="mt-12 text-sm text-slate-500">评论暂未配置。</p>;
 const url=`https://github.com/${encodeURIComponent(gitalkConfig.owner)}/${encodeURIComponent(gitalkConfig.repo)}/issues`;
 return <div className="mt-12 rounded-3xl bg-white/40 dark:bg-slate-900/50 p-6"><h3 className="font-bold mb-2">交流与留言</h3><a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-500 underline">前往 GitHub 留言</a></div>;
}
