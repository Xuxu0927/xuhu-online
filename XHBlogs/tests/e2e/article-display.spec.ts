import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const contentRoot=path.resolve('../.backups/e2e/content');
const code='const message = "copy me";\nconsole.log(message);';
test.beforeAll(()=>{
 if(process.env.E2E_BASE_URL&&!process.env.E2E_BASE_URL.includes('localhost'))throw new Error('This fixture is only for the isolated local site');
 for(const folder of ['posts','chatters']){
  fs.mkdirSync(path.join(contentRoot,folder),{recursive:true});
  fs.writeFileSync(path.join(contentRoot,folder,'article-display-test.md'),'---\ntitle: Display acceptance\ndate: 2026-10-12\n---\n# Heading\n\nParagraph with $x^2$.\n\n```javascript\n'+code+'\n```\n\n| Column | Value |\n| --- | --- |\n| Test | Works |\n');
 }
});
test.afterAll(()=>{for(const folder of ['posts','chatters'])fs.rmSync(path.join(contentRoot,folder,'article-display-test.md'),{force:true});});
for(const route of ['posts','chatter'])test('readable '+route+' with HTTP clipboard fallback',async({page})=>{
 await page.addInitScript(()=>{
  Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});
  document.execCommand=(command:string)=>{(window as unknown as {copied:string}).copied=command==='copy'?(document.activeElement as HTMLTextAreaElement).value:'';return true;};
 });
 await page.goto('/'+route+'/article-display-test');
 const body=page.locator('.article-content');
 await expect(body).toBeVisible();
 await expect(body.locator('pre')).toHaveCSS('background-color','rgb(255, 255, 255)');
 await expect(body.locator('p').first()).toHaveCSS('font-size','16px');
 const copy=body.getByRole('button',{name:'复制代码',exact:true});
 await copy.click();await expect(body.getByRole('button',{name:'已复制',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>(window as unknown as {copied:string}).copied)).toBe(code+'\n');
 await expect(body.locator('.katex')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
test('copy failure reports failure instead of success',async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:undefined,configurable:true});document.execCommand=()=>false;});
 await page.goto('/posts/article-display-test');
 await page.getByRole('button',{name:'复制代码',exact:true}).click();
 await expect(page.getByRole('button',{name:'复制失败，请手动选择'})).toBeVisible();
});
