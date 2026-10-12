import { it,expect } from 'vitest';
import { enqueue, removeCompleted } from '../lib/operations';
it('deduplicates by resource identity and retains failed tasks',()=>{
 const first={operationId:'one',kind:'publish' as const,resourceId:'a',payload:{title:'Same',type:'post'}};
 const second={...first,operationId:'two',resourceId:'b'};
 const list=enqueue(enqueue([],first),second);
 expect(list).toHaveLength(2);
 expect(enqueue(list,{...first,operationId:'three'})).toHaveLength(2);
 expect(removeCompleted(list,[{operationId:'one',success:true},{operationId:'two',success:false}])).toEqual([second]);
});
