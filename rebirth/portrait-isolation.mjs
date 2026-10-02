// Extract exactly one portrait and discard detached pieces from adjacent cells.
const cache=new Map();
async function isolated(src,index=null){
 const key=src+'|'+index;if(cache.has(key))return cache.get(key);
 const work=(async()=>{
  const im=new Image();im.src=src;await im.decode();
  const cols=index===null?1:5,w=Math.round(im.naturalWidth/cols),h=im.naturalHeight;
  const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const g=canvas.getContext('2d',{willReadFrequently:true});g.drawImage(im,index===null?0:Math.round(index*im.naturalWidth/5),0,w,h,0,0,w,h);
  const pixels=g.getImageData(0,0,w,h),data=pixels.data,labels=new Int32Array(w*h),queue=new Int32Array(w*h),groups=[null];

  // The mage's left edge contains a touching red warrior cape, not a detached group.
  if(src.includes('mage-portrait-v1.webp'))for(let y=Math.floor(h*.4);y<Math.ceil(h*.76);y++)for(let x=0;x<Math.ceil(w*.1);x++){const p=(y*w+x)*4;if(data[p]>data[p+1]*1.35&&data[p]>data[p+2]*1.15)data[p+3]=0;}
  for(let start=0;start<w*h;start++){
   if(labels[start]||data[start*4+3]<=8)continue;
   const id=groups.length,group={size:0,left:w,right:0,top:h,bottom:0};groups.push(group);let first=0,last=0;queue[last++]=start;labels[start]=id;
   while(first<last){const p=queue[first++],x=p%w,y=Math.floor(p/w);group.size++;group.left=Math.min(group.left,x);group.right=Math.max(group.right,x);group.top=Math.min(group.top,y);group.bottom=Math.max(group.bottom,y);
    for(const q of [x?p-1:-1,x<w-1?p+1:-1,y?p-w:-1,y<h-1?p+w:-1])if(q>=0&&!labels[q]&&data[q*4+3]>8){labels[q]=id;queue[last++]=q;}
   }
  }
  let main=1;for(let i=2;i<groups.length;i++)if(groups[i].size>groups[main].size)main=i;
  if(groups[main]){const keep=groups.map((v,i)=>i===main||v&&v.size>=groups[main].size*((v.left<8||v.right>w-9)? .28:.012));for(let p=0;p<w*h;p++)if(labels[p]&&!keep[labels[p]])data[p*4+3]=0;g.putImageData(pixels,0,0);}
  return canvas.toDataURL('image/png');
 })();cache.set(key,work);work.catch(()=>cache.delete(key));return work;
}
export function installPortraitIsolation(){
 const process=root=>{
  if(root.nodeType!==1)return;
  const nodes=[...(root.matches('.costume-card img,.field-costume,.portrait')?[root]:[]),...root.querySelectorAll('.costume-card img,.field-costume,.portrait')];
  for(const node of nodes){
   if(node.dataset.portraitIsolated)continue;
   if(node.tagName==='IMG'){const src=node.getAttribute('src');if(!src?.startsWith('costumes/'))continue;node.dataset.portraitIsolated='1';isolated(src).then(url=>{if(node.isConnected)node.src=url;}).catch(()=>{});continue;}
   const bg=node.style.backgroundImage,match=bg.match(/url\(["']?(costumes\/[^"')]+)["']?\)/);
   let src=match?.[1],index=null;
   if(!src&&!node.classList.contains('priest-portrait')){src='characters-transparent-v1.png';index=Math.max(0,Math.min(4,Math.round(parseFloat(node.style.backgroundPosition||'0')/25)));}
   if(!src)continue;node.dataset.portraitIsolated='1';isolated(src,index).then(url=>{if(node.isConnected){node.style.setProperty('background-image',`url("${url}")`,'important');node.style.setProperty('background-size','contain','important');node.style.setProperty('background-position','center','important');}}).catch(()=>{});
  }
 };
 const observer=new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)process(n);});
 process(document.body);observer.observe(document.body,{childList:true,subtree:true});
}
