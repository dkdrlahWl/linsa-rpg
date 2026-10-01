let summary={news:[],unread:0};
export const investmentNewsSummary=()=>summary;
export const investmentNewsUnread=()=>Math.max(0,Number(summary.unread)||0);
export const newsUnreadBadge=()=>`<b data-news-unread class="fantasy-mail-count invest-news-unread" ${investmentNewsUnread()?'':'hidden'}>${investmentNewsUnread()}</b>`;
export function setNewsNotifications(next){summary=next||{news:[],unread:0};for(const el of document.querySelectorAll('[data-news-unread]')){el.textContent=String(investmentNewsUnread());el.hidden=!investmentNewsUnread();}}
export const resetNewsNotifications=()=>setNewsNotifications(null);
