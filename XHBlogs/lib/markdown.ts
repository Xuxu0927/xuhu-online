import {unified} from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeSanitize from 'rehype-sanitize';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
export async function renderMarkdown(markdown:string):Promise<string>{
 const html=await unified().use(remarkParse).use(remarkGfm).use(remarkMath)
  .use(remarkRehype,{allowDangerousHtml:true}).use(rehypeRaw).use(rehypeSanitize)
  .use(rehypeSlug).use(rehypeHighlight).use(rehypeKatex).use(rehypeStringify).process(markdown);
 return String(html);
}
