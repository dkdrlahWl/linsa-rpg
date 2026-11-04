export const BANK_DAY=3600000; // 2026-11-03 도현: 10억 기준 하루 약 1,000만(하루 1%) — 1시간마다 0.0415%씩 복리.
// 정밀도를 위해 100만분율(ppm)로 계산. 9조 × 415 < Number.MAX_SAFE_INTEGER.
export const BANK_RATE_PPM=415;
export const BANK_LIMIT=9000000000000;
export function bankTotal(bank){return (bank?.lots||[]).reduce((n,l)=>n+l.gold,0);}
// 2026-11-04 도현: 정기예금(하루 복리). 만기 때 원금+이자가 보유 골드로 자동 지급. 중도 해지는 이자 없이 원금의 95%.
export const BANK_DAY_MS=86400000,BANK_TERM_CANCEL_KEEP=0.95;
export const BANK_TERMS=Object.freeze([
 Object.freeze({id:'d3',name:'3일 정기예금',days:3,ratePpm:30000,limit:50000000000}),
 Object.freeze({id:'d7',name:'7일 정기예금',days:7,ratePpm:36000,limit:30000000000}),
 Object.freeze({id:'d14',name:'14일 정기예금',days:14,ratePpm:42000,limit:20000000000}),
]);
export const bankTerm=id=>BANK_TERMS.find(t=>t.id===id);
// 하루마다 복리(골드 정수 내림).
export function bankTermPayout(gold,product){let g=gold;for(let d=0;d<product.days;d++)g+=Math.floor(g*product.ratePpm/1000000);return g;}
export function bankTermUsed(bank,id){return (bank?.terms||[]).filter(t=>t.product===id).reduce((n,t)=>n+t.gold,0);}
function settleTerms(s,b,now){
 b.terms=Array.isArray(b.terms)?b.terms.filter(t=>t&&bankTerm(t.product)&&Number.isSafeInteger(t.gold)&&t.gold>0&&Number.isSafeInteger(t.at)):[];
 b.termInterest=Number.isSafeInteger(b.termInterest)&&b.termInterest>=0?b.termInterest:0;
 b.terms=b.terms.filter(t=>{
  const product=bankTerm(t.product);if(now<t.at+product.days*BANK_DAY_MS)return true;
  const payout=bankTermPayout(t.gold,product);
  if(s.gold+payout>BANK_LIMIT)return true; // 보유 한도 초과 시 공간이 생길 때 지급
  s.gold+=payout;b.termInterest=Math.min(Number.MAX_SAFE_INTEGER,b.termInterest+payout-t.gold);
  b.lastMatured={product:t.product,gold:t.gold,payout,at:now};return false;
 });
}
export function settleBank(s,now){
 if(!Number.isSafeInteger(now)||now<0)throw Error('INVALID_BANK_TIME');
 const b=s.bank&&typeof s.bank==='object'?s.bank:{lots:[],interest:0};
 b.lots=Array.isArray(b.lots)?b.lots:[];b.interest=Number.isSafeInteger(b.interest)&&b.interest>=0?b.interest:0;
 let total=bankTotal(b);
 for(const lot of b.lots){
  if(!Number.isSafeInteger(lot.gold)||lot.gold<0||!Number.isSafeInteger(lot.at))throw Error('INVALID_BANK_STATE');
  let days=Math.floor(Math.max(0,now-lot.at)/BANK_DAY);
  while(days-->0){const gain=Math.min(Math.floor(lot.gold*BANK_RATE_PPM/1000000),BANK_LIMIT-total);if(gain>0){lot.gold+=gain;total+=gain;b.interest=Math.min(Number.MAX_SAFE_INTEGER,b.interest+gain);}if(gain===0)break;}
  lot.at+=Math.floor(Math.max(0,now-lot.at)/BANK_DAY)*BANK_DAY;
 }
 settleTerms(s,b,now);
 s.bank=b;return b;
}
export function bankCommand(s,command,args,now){
 if(command==='bankTermOpen'||command==='bankTermCancel')return bankTermCommand(s,command,args,now);
 const b=settleBank(s,now),total=bankTotal(b),deposit=command==='bankDeposit';
 if(!deposit&&command!=='bankWithdraw')throw Error('INVALID_BANK_COMMAND');
 const available=deposit?s.gold:total;
 const amount=args.amount==='all'?Math.min(available,deposit?BANK_LIMIT-total:BANK_LIMIT-s.gold):args.amount;
 if(!Number.isSafeInteger(amount)||amount<=0)throw Error('금액을 1골드 이상 입력해 주세요.');
 if(amount>available)throw Error(deposit?'보유 골드가 부족해요.':'예금이 부족해요.');
 if(deposit&&total+amount>BANK_LIMIT||!deposit&&s.gold+amount>BANK_LIMIT)throw Error('골드 보유 한도를 초과해요.');
 if(deposit){s.gold-=amount;const same=b.lots.find(l=>l.at===now);if(same)same.gold+=amount;else b.lots.push({gold:amount,at:now});}
 else{let left=amount;for(let i=b.lots.length-1;i>=0&&left>0;i--){const n=Math.min(left,b.lots[i].gold);b.lots[i].gold-=n;left-=n;}b.lots=b.lots.filter(l=>l.gold>0);s.gold+=amount;}
 return {type:command,amount};
}
function bankTermCommand(s,command,args,now){
 const b=settleBank(s,now);
 if(command==='bankTermOpen'){
  const product=bankTerm(args?.product);if(!product)throw Error('INVALID_BANK_TERM');
  const room=product.limit-bankTermUsed(b,product.id);
  const amount=args.amount==='all'?Math.min(s.gold,room):args.amount;
  if(!Number.isSafeInteger(amount)||amount<=0)throw Error(room<=0?'INVALID_BANK_TERM_LIMIT':'INVALID_BANK_TERM_AMOUNT');
  if(amount>room)throw Error('INVALID_BANK_TERM_LIMIT');
  if(amount>s.gold)throw Error('INSUFFICIENT_GOLD');
  s.gold-=amount;const id=product.id+'-'+now+'-'+b.terms.length;
  b.terms.push({id,product:product.id,gold:amount,at:now});
  return {type:command,id,product:product.id,amount,payout:bankTermPayout(amount,product),maturity:now+product.days*BANK_DAY_MS};
 }
 const index=b.terms.findIndex(t=>t.id===args?.id);if(index<0)throw Error('INVALID_BANK_TERM');
 const term=b.terms[index],refund=Math.floor(term.gold*BANK_TERM_CANCEL_KEEP);
 if(s.gold+refund>BANK_LIMIT)throw Error('INVALID_BANK_TERM_GOLD_LIMIT');
 b.terms.splice(index,1);s.gold+=refund;
 return {type:command,id:term.id,product:term.product,amount:term.gold,refund};
}
