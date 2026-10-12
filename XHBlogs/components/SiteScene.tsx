'use client';
import {usePathname} from 'next/navigation';
import type {ReactNode} from 'react';
import {useSiteConfig} from './SiteConfigProvider';
import BackgroundEffects from './BackgroundEffects';
import BackgroundSlider from './BackgroundSlider';
import {MusicProvider} from './MusicProvider';
import FloatingPlayer from './FloatingPlayer';
import ClickEffect from './ClickEffect';
import GlobalToolbox from './GlobalToolbox';
import SplashScreen from './SplashScreen';
import DanmakuBackground from './DanmakuBackground';
import MobileBackButton from './MobileBackButton';
import CyberCat from './CyberCat';
export default function SiteScene({children}:{children:ReactNode}){
 const pathname=usePathname(),config=useSiteConfig();
 if(pathname.startsWith('/admin'))return <main className="min-h-screen bg-slate-100 dark:bg-slate-950">{children}</main>;
 return <MusicProvider>
  <SplashScreen/>
  <div id="app-mount-root" className="min-h-screen relative">
   <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none" style={{background:`linear-gradient(135deg, ${config.themeColors.join(',')})`}}>
    {!config.useGradient&&<BackgroundSlider/>}
    <div className="absolute inset-0 bg-white/40 dark:bg-slate-950/50"/>
    {config.enableEffects&&<BackgroundEffects/>}
   </div>
   {config.enableEffects&&<DanmakuBackground/>}
   {children}
   <FloatingPlayer/><GlobalToolbox/><MobileBackButton/><CyberCat/>
   {config.enableEffects&&<ClickEffect/>}
  </div>
 </MusicProvider>;
}
