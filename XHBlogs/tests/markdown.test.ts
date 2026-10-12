import { it,expect } from 'vitest';
import { renderMarkdown } from '../lib/markdown';
it('cleans scripts and dangerous urls while preserving article formatting',async()=>{
 const html=await renderMarkdown('# Heading\n\n> Quote\n\n[link](https://example.com)\n\n<script>alert(1)</script><img src="x" onerror="alert(1)"><a href="javascript:alert(1)">bad</a>\n\n```python\nprint(1)\n```\n\n$x^2$');
 expect(html).not.toContain('<script');
 expect(html).not.toContain('onerror');
 expect(html).not.toContain('javascript:');
 expect(html).toContain('<blockquote>');
 expect(html).toContain('katex');
 expect(html).toContain('print');
});
