// Copies the ringu-rebirth edge function graph into rebirth/edge-dist with ?v= query suffixes
// stripped, so a deployed entry can import one immutable commit of the server code.
import {readFile,writeFile,mkdir,rm} from 'node:fs/promises';
const root=new URL('../rebirth/',import.meta.url),out=new URL('edge-dist/',root),seen=new Set();
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
async function copy(name){
 if(seen.has(name))return;seen.add(name);
 const source=await readFile(new URL(name,root),'utf8');
 const deps=[...source.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+\.mjs)(?:\?[^'"]*)?['"]/g)].map(m=>m[1].slice(2));
 await writeFile(new URL(name,out),source.replace(/(['"])(\.\/[^'"]+\.mjs)\?v=[^'"]*\1/g,'$1$2$1'));
 for(const d of new Set(deps))await copy(d);
}
await copy('edge.ts');
console.log('edge-dist files',seen.size);
