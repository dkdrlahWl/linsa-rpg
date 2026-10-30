export const BANK_DAY=43200000; // 2026-10-31: 이자 지급 주기 24시간 → 12시간 (1%씩 복리)
export const BANK_LIMIT=9000000000000;
export function bankTotal(bank){return (bank?.lots||[]).reduce((n,l)=>n+l.gold,0);}
export function settleBank(s,now){
 if(!Number.isSafeInteger(now)||now<0)throw Error('INVALID_BANK_TIME');
 const b=s.bank&&typeof s.bank==='object'?s.bank:{lots:[],interest:0};
 b.lots=Array.isArray(b.lots)?b.lots:[];b.interest=Number.isSafeInteger(b.interest)&&b.interest>=0?b.interest:0;
 let total=bankTotal(b);
 for(const lot of b.lots){
  if(!Number.isSafeInteger(lot.gold)||lot.gold<0||!Number.isSafeInteger(lot.at))throw Error('INVALID_BANK_STATE');
  let days=Math.floor(Math.max(0,now-lot.at)/BANK_DAY);
  while(days-->0){const gain=Math.min(Math.floor(lot.gold/100),BANK_LIMIT-total);if(gain>0){lot.gold+=gain;total+=gain;b.interest=Math.min(Number.MAX_SAFE_INTEGER,b.interest+gain);}if(gain===0)break;}
  lot.at+=Math.floor(Math.max(0,now-lot.at)/BANK_DAY)*BANK_DAY;
 }
 s.bank=b;return b;
}
export function bankCommand(s,command,args,now){
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
