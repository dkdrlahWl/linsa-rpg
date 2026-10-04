import {readFile,writeFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const version=process.argv[2]||'raid-steady-160';
if(!/^[a-zA-Z0-9_-]+$/.test(version))throw Error('Invalid worker version');
const root=new URL('../rebirth/',import.meta.url),dir=new URL('worker-sim/',root);
for(const name of await readdir(dir))if(name.endsWith('.mjs')){
 const source=await readFile(new URL(name,root),'utf8');
 const worker=source.replace(/(['"])(\.\/[^'"]+\.mjs)(?:\?v=[^'"]*)?\1/g,(_,quote,path)=>quote+path+'?v='+version+quote);
 await writeFile(new URL(name,dir),worker);
}
console.log('Synced cooperative worker graph:',version,fileURLToPath(dir));
