// Stable oldest-to-newest rows; a new hit replaces the oldest visible row.
export function damageRows(numbers,time,limit=10){
 return numbers.filter(n=>n.end>time&&n.kind!=='incoming'&&n.kind!=='heal')
  .sort((a,b)=>a.start-b.start||a.id-b.id).slice(-limit);
}
