# 망각의 탑 · 경험치 2.5배

- 일반 필드의 온라인/오프라인 처치 경험치를 기존 값의 정확히 2.5배로 변경. 필요 경험치, 골드, 재화 확률, 한 번의 오프라인 6시간 상한은 유지.
- 보유/착용/보관함 장비는 동기화 시 1·10·20…200레벨로 자동 정규화. 중간 레벨은 아래 10단위로 내림. 아이템 ID, 강화, 잠재, 잠금 유지. 신규 장비의 고정 기본 수치는 기존 범위 내 상대 위치를 보존하여 조정하며, 구형 장비는 변경된 레벨로 기존 능력치 공식을 적용.
- 보스 메뉴 → 탑 · 10층. 층 순서대로 해금, 레벨 강제 제한 없음, 각 층 180초, 최초 클리어 보상 1회, 재도전 무제한.
- 현재 캐릭터 공격력·HP·방어·치명타·보스 피해·직업 효과를 입장 시 고정. 이동·직접 공격·직업별 액티브·무적 회피·보호/회복 가호.
- 모바일 이동 패드와 4개 조작 버튼. PC WASD/방향키, J 공격, K 스킬, Space 회피, L 가호.
- 서버와 클라이언트가 동일한 고정 간격 전투 모델 사용. 서버는 입력만 받고 위치·쿨타임·충돌·피해·보상 재계산. 서버 시각으로 처리 가능한 입력량 및 제한 시간 제한. 저장 요청은 기존 인증·세션·revision·requestId 처리를 사용.
- 탑 중 사냥 정지, 결과 확정 후 사냥 재개. 브라우저를 닫아도 탑 자동 클리어/오프라인 보상 없음.
- 기존 characters-transparent-v1.png의 5직업 외형을 참조하여 4개 동작을 추가한 투명 atlas. 기존 캐릭터 선택/초상화 이미지는 변경하지 않음.
- 보스 10종은 각 3개 동작 이미지. 돌진·탄막·범위 공격·독 바닥·회전 광선·복합 광폭화 패턴.
- 신규 이미지 17개를 rebirth/tower/에 WebP로 저장. 배경과 투명 효과 atlas 포함. 생성은 built-in imagegen 사용.
- 사용자 요청대로 테스트 실행과 별도 화면 검증은 하지 않음. 배포 결과 상태만 확인.

## 이미지 제작 프롬프트 구성

보스: `Production animation sprite strip for a polished Korean fantasy action RPG. Exactly three equal cells in one horizontal row. Same full-body boss, idle / windup / attack. Transparent alpha, orthographic three-quarter view, hand-painted materials, no labels, no grid, no scenery.` 이끼 돌 거인·달나방 여왕·수정 게·용암 늑대·망령 기사·얼음 마녀·황금 전갈·타락 성상·태엽룡·공허왕의 개별 외형 명세를 각각 적용.

캐릭터: `Edit/derive animation poses of the existing character in characters-transparent-v1.png. Preserve face, hair, outfit, colors, weapon and chibi proportions. Four equal cells in a 2x2 transparent atlas: idle / run / weapon attack / skill.` 각 직업의 원본 위치와 외형을 지정.

배경: `Ruined ancient tower arena, portrait, high orthographic view, unobstructed stone playing floor, aged gold inlays, broken pillars only at edges, teal ambient light and brass lamps. No actors, HUD, text.`

효과: `2x2 transparent combat VFX atlas: golden crescent slash, cyan projectile, fiery impact, ornate crimson warning sigil. Detailed painterly particle art, no labels or grid.`
