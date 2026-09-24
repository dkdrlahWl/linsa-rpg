# 망각의 탑 · 경험치 2.5배

## 2026-09-24 전장 확장·직업별 이미지 모션 (tower-motion-30)

- 탑 전장을 1000×1200에서 3200×3200으로 확장하고 새 탑 배경 이미지를 적용했다. 카메라, 시작 위치, 이동 범위, 보스 공격 좌표를 함께 조정했다.
- 기존 8방향 캐릭터·보스 이미지와 직업별 스킬을 유지한다. 전사·마법사·궁수·도적·해적은 좌우 이동과 공격에 각 직업의 연속 이미지 시트를 사용한다. 다른 방향은 8방향 이미지를 계속 사용한다.
- 검격·마법탄·폭발·보스 광선에 연속 이미지 효과를 적용하고, 타격 때 파편·충격파·화면 흔들림·섬광·소리를 표시한다.
- 진행 중인 구형 탑 전투는 첫 입력 전에 새 좌표로 한 번 변환한다. 피해량, 보상, 제한 시간은 유지한다.
- 전장 경계·구형 전투 변환을 포함한 탑 입력 검사 10개 통과. PC와 모바일 미리보기에서 배경·전투 화면과 브라우저 오류를 확인했다.

## 2026-09-22 조작·화면 개선 (tower-smooth-21)

- 기존 서버의 100ms 입력 규약을 유지하면서 화면 갱신/입력 이벤트마다 이동량을 적분한다. 서버 틱 사이의 캐릭터 이동, 보스/투사체 위치, 피해 숫자와 효과를 연속 렌더링한다.
- 짧은 공격·회피 입력 보존, 한글 IME와 무관한 물리 키 코드, 조이스틱 중앙 데드존, 다중 터치 입력 해제 처리. 선택형 연속 공격 버튼 추가.
- 서버 확인 후 남은 입력만 재현하고 위치 보정을 부드럽게 처리한다. 입력 전송은 350ms 간격, 연결 지연 시 최대 25개 입력까지만 예측한다.
- PC는 전투장과 오른쪽 조작부, 모바일은 고정 체력/하단 조작부. 화면 높이에 맞춰 배치하며 전투 카메라가 플레이어를 따라간다.
- 이미지 캐릭터·보스 확대, 발밑 식별 표시, 회피 잔상, 타격 모션, 적 탄환 색 구분. 공격 위험 영역은 실제 판정과 동일한 범위를 표시하고 고리 내부 안전 영역은 비워둔다.
- 체험 페이지는 같은 전투 컨트롤러로 직접 플레이하는 10층/5직업 선택 화면으로 변경. 예시 능력치를 사용하며 계정이나 보상을 저장하지 않는다.
- 검증: 입력/이동/네트워크 재현 관련 8개 검사 통과, 변경 모듈 문법 확인. 브라우저에서 스킬 입력/HP 감소 확인, 1280×720·390×844·320×568·844×390 배치 및 8층 고리 안전 영역 확인. 실제 휴대폰 성능 및 운영 계정 전투는 별도 측정하지 않았다.
- 피해량·쿨타임·보스 보상 및 운영 서버 규칙 변경 없음. 아래 기록의 검증 미실행 문구는 최초 탑 배포 시점의 상태다.

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
