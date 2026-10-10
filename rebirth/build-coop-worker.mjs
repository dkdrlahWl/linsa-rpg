import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=dirname(fileURLToPath(import.meta.url)),version='exploration-steady-212',visited=new Set();
await mkdir(resolve(root,'worker-sim'),{recursive:true});
async function copy(name){
 if(visited.has(name))return;visited.add(name);
 let source=await readFile(resolve(root,name),'utf8');
 const dependencies=[...source.matchAll(/(?:from\s*|import\s*)['"](\.\/[^'"]+\.mjs)(?:\?[^'"]*)?['"]/g)].map(m=>m[1].slice(2));
 source=source.replace(/(['"])(\.\/[^'"]+\.mjs)(?:\?[^'"]*)?\1/g,(_,quote,path)=>quote+path+'?v='+version+quote);
 await writeFile(resolve(root,'worker-sim',name),source);
 await Promise.all([...new Set(dependencies)].map(copy));
}
await copy('coop-model.mjs');
console.log('Built '+visited.size+' worker simulation modules. Run again after editing combat rules.');
