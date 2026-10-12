import {parseDocument} from 'yaml';
interface Metadata{title:string;description:string;date:string;tags:string[];cover:string;image:string;mood:string;id:string;location:string;images:string[]}
export default function matter(source:string):{data:Metadata;content:string}{
 const match=source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
 let input:Record<string,unknown>={};
 if(match){
  const document=parseDocument(match[1],{schema:'core',uniqueKeys:true});
  if(document.errors.length||document.warnings.length)throw new Error('Invalid YAML front matter');
  const value=document.toJS({maxAliasCount:50});
  if(value&&typeof value==='object'&&!Array.isArray(value))input=value;
 }
 const text=(key:string)=>typeof input[key]==='string'?input[key] as string:'';
 const list=(key:string)=>Array.isArray(input[key])?(input[key] as unknown[]).filter((v):v is string=>typeof v==='string'):[];
 return {data:{title:text('title'),description:text('description'),date:text('date'),tags:list('tags'),cover:text('cover'),image:text('image'),mood:text('mood'),id:text('id'),location:text('location'),images:list('images')},content:match?source.slice(match[0].length):source};
}
