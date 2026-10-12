import type {MetadataRoute} from 'next';
import {readPublicConfig} from '@/lib/content';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/admin/','/api/']},sitemap:`${readPublicConfig().siteUrl}/sitemap.xml`};}
