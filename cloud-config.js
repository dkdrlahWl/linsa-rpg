window.RinguCloudConfig={"url":"https://ekgihnyojihpearcudtd.supabase.co","publishableKey":"sb_publishable_BFHu6ptjoT4JzYaXE_qs0g_euqsXOKe","base":"/linsa-rpg/"};

(()=>{'use strict';
 const BUILD='20260909-pages-boot-hotfix-1';
 let ready=false,recovering=false,lastError='';
 const text=e=>String(e?.message||e?.reason?.message||e?.reason||e||'알 수 없는 시작 오류').slice(0,500);
 function notice(message,error=false){
  const run=()=>{
   let el=document.getElementById('ringu-boot-hotfix');
   if(!el){el=document.createElement('div');el.id='ringu-boot-hotfix';Object.assign(el.style,{position:'fixed',left:'12px',right:'12px',bottom:'12px',zIndex:'2147483646',padding:'10px 12px',border:'1px solid #8d7959',borderRadius:'8px',background:'#0b101af2',color:'#ead8b8',font:'12px/1.55 system-ui,sans-serif',boxShadow:'0 8px 30px #0009'});document.body.append(el);}
   el.textContent=message;el.style.borderColor=error?'#b95b55':'#8d7959';
   if(!error)setTimeout(()=>el?.remove(),5000);
  };
  if(document.body)run();else document.addEventListener('DOMContentLoaded',run,{once:true});
 }
 window.addEventListener('ringu-ready',()=>{ready=true;document.getElementById('ringu-boot-hotfix')?.remove();},{once:true});
 window.addEventListener('error',e=>{if(ready)return;lastError=text(e.error||e.message);console.error('[Ringu boot '+BUILD+']',e.error||e.message);});
 window.addEventListener('unhandledrejection',e=>{if(ready)return;lastError=text(e.reason);console.error('[Ringu boot '+BUILD+']',e.reason);});
 async function recover(){
  if(ready||recovering)return;
  const session=window.RinguSession,core=window.RinguCore;
  if(!session||!core?.fn?.load)return;
  if(!session.active){
   const phase=session.status?.phase;
   if(phase&&phase!=='loading')notice('게임 시작 실패: '+(session.status?.message||lastError||phase),true);
   return;
  }
  recovering=true;
  try{
   if(!core.state)core.fn.load();else core.fn.renderAll?.();
   if(!window.__ringuBootRecoveryTimers){
    window.__ringuBootRecoveryTimers=true;
    window.addEventListener('pointerdown',()=>{if(window.RinguSession?.active)core.fn.initAudio?.()},{once:true});
    window.addEventListener('keydown',()=>{if(window.RinguSession?.active)core.fn.initAudio?.()},{once:true});
    setInterval(()=>{if(window.RinguSession?.active&&core.state)core.fn.attack?.()},1000);
    setInterval(()=>{if(window.RinguSession?.active&&core.state)core.fn.save?.(false)},5000);
   }
   ready=true;window.dispatchEvent(new Event('ringu-ready'));
   notice(lastError?'시작 오류를 우회해 게임을 복구했습니다: '+lastError:'게임 시작을 복구했습니다.');
  }catch(e){lastError=text(e);notice('게임 시작 오류: '+lastError,true);console.error('[Ringu boot recovery '+BUILD+']',e);}
  finally{recovering=false;}
 }
 setTimeout(recover,2500);setTimeout(recover,6000);setTimeout(recover,12000);
})();
