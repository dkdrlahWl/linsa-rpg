// Stop waiting immediately when a screen/account is disposed. The underlying
// shared token refresh may continue, but it cannot apply an obsolete response.
export function abortable(promise,signal){
  if(!signal)return promise;
  return new Promise((resolve,reject)=>{
    const abort=()=>reject(signal.reason||new DOMException('Aborted','AbortError'));
    const finish=fn=>value=>{signal.removeEventListener('abort',abort);fn(value);};
    Promise.resolve(promise).then(finish(resolve),finish(reject));
    if(signal.aborted)abort();else signal.addEventListener('abort',abort,{once:true});
  });
}
