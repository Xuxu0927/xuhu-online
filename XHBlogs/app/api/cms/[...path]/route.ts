import {proxyCms} from '@/lib/cms-proxy';
type Context={params:Promise<{path:string[]}>};
async function handle(request:Request,context:Context){return proxyCms(request,(await context.params).path);}
export {handle as GET,handle as POST,handle as PUT,handle as DELETE};
