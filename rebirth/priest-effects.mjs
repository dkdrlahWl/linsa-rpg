export function drawHoly(g,e,time,atlas){if(!atlas?.complete||!atlas.naturalWidth)return;const age=Math.max(0,Math.min(1,(time-e.start)/(e.end-e.start))),size=Math.min(1300,e.size||500),sw=atlas.width/4,sh=atlas.height/2;
 const tile=(n,x,y,w,h,alpha=1)=>{g.save();g.globalAlpha=alpha;g.drawImage(atlas,n%4*sw,Math.floor(n/4)*sh,sw,sh,x-w/2,y-h/2,w,h);g.restore();};
 if(e.slot===1){tile(0,e.x,e.y-80,Math.min(400,size),260,1-age*.7);tile(6,e.x,e.y-30,320*(.6+age),260,1-age);}
 else if(e.slot===2){tile(1,e.x,e.y,size*.85,size*.65,Math.sin(age*Math.PI)*.7);tile(6,e.x,e.y-100,480,480,(1-age)*.8);}
 else if(e.slot===3){tile(3,e.x,e.y,size,size*.72,.5*(1-age));tile(2,e.x,e.y-220,640,600,Math.sin(age*Math.PI)*.8);}
 else {tile(3,e.x,e.y,size,size*.8,.36);tile(4,e.x,e.y-330,size*.68,size*.7,Math.sin(age*Math.PI)*.55);for(let i=0;i<5;i++){const phase=(age+i*.17)%1,a=(i*2.399+(e.pulse||0)*.7),r=size*.28*Math.sqrt((i+1)/5),x=e.x+Math.cos(a)*r,y=e.y+Math.sin(a)*r;tile(5,x,y-160,240,560,Math.sin(phase*Math.PI)*.6);tile(6,x,y,260,190,Math.max(0,phase-.5));}}
}
