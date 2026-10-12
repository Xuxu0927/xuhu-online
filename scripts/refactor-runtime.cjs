const fs=require('fs'),path=require('path'),ts=require('../XHBlogs/node_modules/typescript');
const root=path.resolve(__dirname,'../XHBlogs');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
for(const file of [...walk(path.join(root,'components')),...walk(path.join(root,'app'))].filter(f=>f.endsWith('.tsx')||f.endsWith('.ts'))){
 if(file.includes('SiteConfigProvider')||file.endsWith('layout.tsx'))continue;
 let source=fs.readFileSync(file,'utf8');
 const client=/^[\s]*["']use client["']/.test(source);
 if(client){
  const bindings=[];
  if(/import\s*\{\s*siteConfig\s*\}\s*from[^;]+;/.test(source)){
   source=source.replace(/import\s*\{\s*siteConfig\s*\}\s*from[^;]+;/,'');bindings.push('const siteConfig=useSiteData().config;');
  }
  for(const [name,key] of [['albums','albums'],['friendsData','friends'],['projectsData','projects']]){
   const regexp=new RegExp('import\\s*\\{\\s*'+name+'([^}]*)\\}\\s*from[^;]+;');
   if(regexp.test(source)){
    source=source.replace(regexp,(whole,extra)=>extra.trim()?whole.replace(name+',','').replace(name,''): '');
    bindings.push(`const ${name}=useSiteData().${key};`);
   }
  }
  if(bindings.length){
   const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.body&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.ExportKeyword));
   if(!fn)throw new Error('No exported component in '+file);
   const index=fn.body.getStart(ast)+1;
   source=source.slice(0,index)+'\n  '+bindings.join('\n  ')+'\n'+source.slice(index);
   source=source.replace(/(["']use client["'];?)/,'$1\nimport {useSiteData} from "@/components/SiteConfigProvider";');
  }
 }else{
  source=source.replace(/import\s*\{\s*siteConfig\s*\}\s*from[^;]+;/,'import {runtimeSiteConfig as siteConfig} from "@/lib/content";');
  if(source.includes('process.cwd()')){
   source='import {getContentRoot,contentPath} from "@/lib/content";\n'+source;
   source=source.replaceAll('process.cwd()', 'getContentRoot()').replace("path.join(getContentRoot(), 'app', 'about', 'about.md')","path.join(getContentRoot(), 'about.md')");
   source=source.replace(/path.join\(getContentRoot\(\), '(posts|chatters)', `\$\{slug\}\.md`\)/g,(_,category)=>`contentPath('${category}',slug)`);
  }
  source=source.replace(/import\s*\{\s*albums\s*\}\s*from[^;]+;/,'import {readCollection} from "@/lib/content";\nimport type {Album} from "@/data/albums";');
  if(source.includes('readCollection')&&source.includes('albums.'))source=source.replace(/(export default (?:async )?function [^(]+\([^)]*\)\s*\{)/,'$1\n const albums=readCollection<Album>("albums");');
  source=source.replace(/export const metadata = (\{[\s\S]*?\});/,'export function generateMetadata(){ return $1; }');
 }
 if(file.endsWith('page.tsx')&&!client)source+='\nexport const dynamic="force-dynamic";\n';
 if(source.includes('const processedContent = await unified()')){
  source='import {renderMarkdown} from "@/lib/markdown";\n'+source;
  source=source.replace(/const processedContent = await unified\(\)[\s\S]*?\.process\(content\);/,'const processedContent = await renderMarkdown(content);');
 }
 fs.writeFileSync(file,source);
}
