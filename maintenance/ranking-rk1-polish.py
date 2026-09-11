from pathlib import Path
import re
p=Path('ranking-ui.js');s=p.read_text()
laurel='''<svg class="rk-laurel" viewBox="0 0 72 68" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.2"><path d="M28 62C9 52 7 30 18 15M44 62c19-10 21-32 10-47"/></g><g fill="currentColor"><path d="M20 57C9 54 7 48 7 44c8 3 11 7 13 13ZM15 46C5 41 4 34 6 31c6 4 8 9 9 15ZM13 33C6 26 8 19 11 16c3 6 4 11 2 17ZM16 22c-2-8 1-13 6-17 0 8-3 13-6 17ZM24 61c-5-6-5-10-4-14 6 4 7 9 4 14Z"/><path transform="translate(72 0) scale(-1 1)" d="M20 57C9 54 7 48 7 44c8 3 11 7 13 13ZM15 46C5 41 4 34 6 31c6 4 8 9 9 15ZM13 33C6 26 8 19 11 16c3 6 4 11 2 17ZM16 22c-2-8 1-13 6-17 0 8-3 13-6 17ZM24 61c-5-6-5-10-4-14 6 4 7 9 4 14Z"/></g></svg>'''
s,n=re.subn(r" const laurel='.*?';",lambda m:" const laurel='"+laurel+"';",s);assert n==1
old="list.setAttribute('aria-busy','true');pending=";assert s.count(old)==1
s=s.replace(old,"list.setAttribute('aria-busy','true');status.textContent='랭킹 기록을 불러오는 중…';pending=",1)
old='finally{render();';assert s.count(old)==1
s=s.replace(old,"finally{if(status.textContent==='랭킹 기록을 불러오는 중…')status.textContent='랭킹 연결을 확인해 주세요. 이전 기록을 표시합니다.';status.classList.toggle('error',/연결/.test(status.textContent));render();",1)
p.write_text(s)
p=Path('ranking-ui.css');p.write_text(p.read_text()+'''
/* Final spacing: more visible rows, no laurel/number overlap, reachable footer. */
#profileModal.rk-ready .rk-footer{display:grid;grid-template-columns:minmax(0,1fr) 76px;gap:6px 9px;align-items:center}
#profileModal.rk-ready #rkMyRank{min-height:44px!important;min-width:0}
#profileModal.rk-ready #rankingNote{grid-column:1/-1;order:2;margin:2px 0 0!important}
#profileModal.rk-ready .rk-watermark{opacity:.035;right:23%;top:0}
#profileModal.rk-ready .rk-watermark>.rk-icon{width:90px;height:82px}
#profileModal.rk-ready .rk-rank{font-size:30px;position:relative}
@media(max-width:600px){
 #profileModal.rk-ready .rk-rank{font-size:26px}
 #profileModal.rk-ready .rk-name{font-size:16px}
 #profileModal.rk-ready button.rk-row{min-height:71px}
 #profileModal.rk-ready .rk-rule{height:10px;margin:5px 0 8px}
}
''')
p=Path('test/ranking-ui.test.mjs');s=p.read_text();old="await page.locator('#rankStatus').textContent,/연결/";assert s.count(old)==1;p.write_text(s.replace(old,"await page.locator('#rankStatus').textContent(),/연결/",1))
Path('RANKING-UI-RK1.md').write_text('''# RK1 — 공격력 · 시련의 탑 랭킹 화면

두 랭킹 화면에 금색·남색 판타지 디자인, 성채 배경, 왕관과 월계수 메달을 적용했습니다.
1~3위는 금·은·동 색상으로 구분하고, 로그인한 계정은 이름 옆 ‘나’와 밝은 테두리로 표시합니다.
순위·닉네임·공격력·최고 클리어 층·UID는 기존 게임 데이터로 표시합니다. 시안의 숫자를 저장하거나 삽입하지 않습니다.
탑 랭킹은 기존대로 1층 이상, 최고 층 우선·동일 층에서 공격력 우선입니다.
목록은 별도로 스크롤되며 상단 탭과 하단 닫기 버튼은 고정됩니다. UID 복사와 내 순위로 이동 기능을 제공합니다.
정렬된 탑 랭킹에서 캐릭터를 열 때 화면상의 순번 대신 원래 계정 ID와 연결해 정확한 사람을 표시합니다.
기존 닉네임 저장·캐릭터 정보·랭킹 조회 API와 자동 갱신 주기를 유지합니다. 새 서버 쓰기나 추가 주기 호출은 없습니다.
운영 DB·유저 재화·장비·던전 HP·암시장 가격과 확률·경매장 규칙은 변경하지 않습니다.

검증: 실제 페이지와 기존 전송 코드를 이용한 독립 브라우저 테스트. 모든 원격 응답과 계정은 테스트용입니다.
320~1440px 및 짧은 가로 화면 9종에서 두 탭의 위치·스크롤, 정렬 후 올바른 캐릭터, 긴 이름과 큰 숫자, 빈 랭킹, 복사·저장·닫기 및 연결 실패 상태를 검사합니다.
''')
