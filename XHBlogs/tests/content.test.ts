import { describe,it,expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readPublicConfig, getContentRoot, contentPath } from '../lib/content';
describe('runtime content',()=>{
 it('reads updated config and never exposes secret fields',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'xh-content-'));
  process.env.CONTENT_ROOT=root;
  fs.writeFileSync(path.join(root,'site.json'),JSON.stringify({title:'first',picBedToken:'private',gitalkConfig:{clientID:'id',clientSecret:'secret'}}));
  expect(readPublicConfig().title).toBe('first');
  expect(JSON.stringify(readPublicConfig())).not.toContain('secret');
  fs.writeFileSync(path.join(root,'site.json'),JSON.stringify({title:'second'}));
  expect(readPublicConfig().title).toBe('second');
  expect(()=>contentPath('posts','../../escape')).toThrow();
  delete process.env.CONTENT_ROOT;
  fs.rmSync(root,{recursive:true});
 });
});
