import {readPublicConfig} from "../../../lib/content";
export const runtime="nodejs";
let calls:number[]=[];
export async function POST(request:Request){
 try{
  const {message}=await request.json();
  if(typeof message!=="string"||!message.trim()||message.length>2000)return Response.json({error:"消息长度应为 1–2000 字"},{status:400});
  const key=(process.env.GEMINI_API_KEY||"").trim();
  if(!key)return Response.json({error:"AI 助理暂未配置"},{status:503});
  calls=calls.filter(t=>t>Date.now()-60000);
  if(calls.length>=20)return Response.json({error:"稍后再试"},{status:429});
  calls.push(Date.now());
  const config=readPublicConfig().geminiConfig;
  if(!/^[a-zA-Z0-9.-]+$/.test(config.modelId))return Response.json({error:"模型配置无效"},{status:503});
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${config.modelId}:generateContent`,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},signal:AbortSignal.timeout(15000),body:JSON.stringify({system_instruction:{parts:[{text:config.systemPrompt}]},contents:[{parts:[{text:message}]}],generationConfig:{maxOutputTokens:Math.min(config.maxOutputTokens,1000),temperature:config.temperature}})});
  if(!response.ok)return Response.json({error:"AI 服务暂时不可用"},{status:502});
  const result=await response.json();return Response.json({reply:result.candidates?.[0]?.content?.parts?.map((part:{text?:string})=>part.text||"").join("")||"暂时无法回答，请稍后重试。"});
 }catch{return Response.json({error:"请求失败，请稍后再试"},{status:502});}
}
export async function GET(){return Response.json({configured:!!process.env.GEMINI_API_KEY});}
