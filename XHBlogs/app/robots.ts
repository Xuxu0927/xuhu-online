import type {MetadataRoute} from 'next';
import {readPublicConfig} from '@/lib/content';
export default function robots():MetadataRoute.Robots{return {rules:{userAgent:'*',allow:'/',disallow:['/admin/','/api/']},sitemap:`${readPublicConfig().siteUrl}/sitemap.xml`};}
