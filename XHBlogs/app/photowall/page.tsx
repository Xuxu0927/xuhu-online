import {runtimeSiteConfig as siteConfig} from "@/lib/content";
import PhotoWallClient from "./PhotoWallClient";

export function generateMetadata(){ return {
  title: "照片墙 | " + siteConfig.title,
}; }

export default function PhotoWallPage() {
  return <PhotoWallClient />;
}
export const dynamic="force-dynamic";
