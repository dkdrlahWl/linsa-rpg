const cache=new WeakMap();
export function healthSegments(actor){
 const hp=Math.max(0,Number(actor.hp)||0),shield=Math.max(0,Number(actor.shield)||0),maxHp=Math.max(1,Number(actor.power?.hp)||Number(actor.maxHp)||1);
 const capacity=Math.max(maxHp,hp+shield);
 return {hp,shield,maxHp,health:Math.min(100,hp/capacity*100),shieldWidth:Math.min(100,shield/capacity*100)};
}
export function paintHealthBar(host,actor,format=n=>Math.round(n).toLocaleString('ko-KR')){
 let nodes=cache.get(host);if(!nodes){nodes={health:host.querySelector('#tower-player-bar'),shield:host.querySelector('#tower-player-shield'),label:host.querySelector('#tower-player-hp')};cache.set(host,nodes);}
 const p=healthSegments(actor);
 if(nodes.health){nodes.health.style.transform='none';nodes.health.style.width=p.health+'%';}
 if(nodes.shield){nodes.shield.style.left=p.health+'%';nodes.shield.style.width=p.shieldWidth+'%';}
 const text=format(p.hp)+' / '+format(p.maxHp)+(p.shield?' · 보호막 '+format(p.shield):'');
 if(nodes.label&&nodes.label.textContent!==text)nodes.label.textContent=text;
 return p;
}
