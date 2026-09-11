// SG1: 10,000 safe-integer item IDs fit in 192 KiB; normal commands retain 16k.
// Bound the stream before parsing, and never accept a client-supplied state/price.
export const MAX_SELL_REQUEST_BYTES=192*1024;
export const MAX_NORMAL_REQUEST_LENGTH=16000;
export async function readEconomyRequest(request){
 const reader=request.body?.getReader();
 const decoder=new TextDecoder();let text='',bytes=0;
 if(reader){
  try{
   while(true){
    const {done,value}=await reader.read();if(done)break;
    bytes+=value.byteLength;
    if(bytes>MAX_SELL_REQUEST_BYTES){await reader.cancel().catch(()=>{});return {error:'REQUEST_TOO_LARGE',status:413};}
    text+=decoder.decode(value,{stream:true});
   }
   text+=decoder.decode();
  }finally{reader.releaseLock();}
 }
 let body;try{body=JSON.parse(text);}catch{return {error:'INVALID_ARGUMENTS',status:400};}
 if(!body||typeof body!=='object'||Array.isArray(body))return {error:'INVALID_ARGUMENTS',status:400};
 const equipmentRemoval=body.command==='sell'||body.command==='dismantle';
 if(!equipmentRemoval&&text.length>MAX_NORMAL_REQUEST_LENGTH)return {error:'REQUEST_TOO_LARGE',status:413};
 // Large bodies are useful only for a bounded ID list, not arbitrary JSON.
 if(equipmentRemoval&&(!Array.isArray(body.args?.ids)||!body.args.ids.length||body.args.ids.length>10000))return {error:'INVALID_ARGUMENTS',status:400};
 return {body};
}
