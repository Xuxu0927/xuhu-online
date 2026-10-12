'use client';
import {createContext,useContext} from 'react';
import type {ReactNode} from 'react';
import type {siteData} from '../lib/content';
type Data=ReturnType<typeof siteData>;
const Context=createContext<Data|null>(null);
export function SiteConfigProvider({data,children}:{data:Data;children:ReactNode}){
 return <Context.Provider value={data}>{children}</Context.Provider>;
}
export function useSiteData(){const data=useContext(Context);if(!data)throw new Error('Missing site data provider');return data;}
export function useSiteConfig(){return useSiteData().config;}
