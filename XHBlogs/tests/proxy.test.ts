import {it,expect,vi} from 'vitest';
import {proxyCms} from '../lib/cms-proxy';
it('rejects unsafe management targets and propagates failures',async()=>{
 expect((await proxyCms(new Request('http://localhost/api/cms/deploy/config'),['deploy','config'])).status).toBe(404);
 const fetch=vi.spyOn(globalThis,'fetch').mockResolvedValue(new Response('{"detail":"unauthorized"}',{status:401}));
 expect((await proxyCms(new Request('http://localhost/api/cms/config'),['config'])).status).toBe(401);
 fetch.mockRestore();
});
