import {it,expect} from 'vitest';
import {POST} from '../app/api/chat/route';
it('rejects invalid chat input and handles an unconfigured provider',async()=>{
 expect((await POST(new Request('http://localhost/api/chat',{method:'POST',body:JSON.stringify({message:'x'.repeat(2001)})}))).status).toBe(400);
 delete process.env.GEMINI_API_KEY;
 expect((await POST(new Request('http://localhost/api/chat',{method:'POST',body:JSON.stringify({message:'hello'})}))).status).toBe(503);
});
