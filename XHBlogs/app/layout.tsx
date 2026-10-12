import "katex/dist/katex.min.css";
import "./globals.css";
import {ThemeProvider} from "../components/ThemeProvider";
import {ToastProvider} from "../components/ToastProvider";
import {SiteConfigProvider} from "../components/SiteConfigProvider";
import SiteScene from "../components/SiteScene";
import {siteData,readPublicConfig} from "../lib/content";
export const dynamic="force-dynamic";
export function generateMetadata(){const config=readPublicConfig();return {title:config.title,description:config.bio,icons:{icon:config.faviconUrl}};}
export default function RootLayout({children}:{children:React.ReactNode}){
 const data=siteData();
 return <html lang="zh-CN" suppressHydrationWarning><body className="min-h-screen font-serif text-slate-900 dark:text-slate-100"><SiteConfigProvider data={data}><ThemeProvider><ToastProvider><SiteScene>{children}</SiteScene></ToastProvider></ThemeProvider></SiteConfigProvider></body></html>;
}
