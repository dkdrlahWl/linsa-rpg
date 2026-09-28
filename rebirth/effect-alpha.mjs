// Convert a black-backed light-effect atlas to true alpha once after loading.
// Screen blending inside a transparent overlay does not remove source alpha:
// the page would otherwise composite its opaque black rectangles over terrain.
const cache=new WeakMap();
export function unmatteBlack(data){
 for(let i=0;i<data.length;i+=4){
  const peak=Math.max(data[i],data[i+1],data[i+2]);
  if(!peak||!data[i+3]){data[i]=data[i+1]=data[i+2]=data[i+3]=0;continue;}
  data[i+3]=Math.round(data[i+3]*peak/255);
  data[i]=Math.round(data[i]*255/peak);
  data[i+1]=Math.round(data[i+1]*255/peak);
  data[i+2]=Math.round(data[i+2]*255/peak);
 }
 return data;
}
export function transparentEffectAtlas(image){
 if(!image?.complete||!image.naturalWidth)return null;
 if(cache.has(image))return cache.get(image);
 const canvas=document.createElement('canvas');
 canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const g=canvas.getContext('2d',{willReadFrequently:true});
 g.drawImage(image,0,0);
 const pixels=g.getImageData(0,0,canvas.width,canvas.height);
 unmatteBlack(pixels.data);g.putImageData(pixels,0,0);
 cache.set(image,canvas);return canvas;
}
