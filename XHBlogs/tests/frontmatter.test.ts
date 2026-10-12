import {it,expect} from 'vitest';
import matter from '../lib/frontmatter';
it('reads front matter without evaluating custom YAML tags',()=>{
 const value=matter('---\ntitle: "quoted title"\ntags: [one, two]\ndate: 2026-10-12\n---\n\n# Heading');
 expect(value.data.title).toBe('quoted title');expect(value.content.trim()).toBe('# Heading');
 expect(()=>matter('---\na: !!js/function "function(){return 1}"\n---\nbody')).toThrow();
});
