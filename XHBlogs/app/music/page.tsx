import {runtimeSiteConfig as siteConfig} from "@/lib/content";
import MusicClient from "./MusicClient";

// 🌟 这里是服务端渲染，完美支持 metadata
export function generateMetadata(){ return {
  title: "音乐馆 | " + siteConfig.title,
}; }

export default function MusicPage() {
  return <MusicClient />;
}
export const dynamic="force-dynamic";
