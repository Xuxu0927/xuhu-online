export interface Operation{operationId:string;kind:'publish';resourceId:string;payload:Record<string,unknown>}
export function enqueue(list:Operation[],next:Operation):Operation[]{
 return [...list.filter(op=>!(op.kind===next.kind&&op.resourceId===next.resourceId&&op.payload.type===next.payload.type)),next];
}
export function removeCompleted(list:Operation[],results:{operationId:string;success:boolean}[]):Operation[]{
 const done=new Set(results.filter(r=>r.success).map(r=>r.operationId));return list.filter(op=>!done.has(op.operationId));
}
