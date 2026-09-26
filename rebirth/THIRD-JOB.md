# 2차·3차 전직 업데이트

- 보스 → 전직 보스: 2차 Lv.60, 3차 Lv.100 + 2차 완료. 90초 직접 이동 전투.
- 2차 계승의 심판관 아르켄: HP 220,000 / 공격력 2,200.
- 3차 각성의 군주 에클립스: HP 700,000 / 공격력 6,500.
- 전직 보스는 처치 시 전직만 지급하며 탑 보상·일일 탑 과제·주간 횟수를 변경하지 않음. 실패 재도전 가능. 기존 2차 유지.
- 각 전직 공격력·HP ×1.1. 2·3차 누적 ×1.21. 기존 2차 공격력 +8%를 +10%로 상향.
- 3차 공통 쿨타임 24초, 모든 타격 적중 시 합계 1,800% (치명·보공·스킬 버프 적용).

| 직업 | 스킬 | 타격 | 특성 |
|---|---|---|---|
| 전사 | 천공 참렬 | 300% × 6 | 넓은 검기 연속 폭발 |
| 마법사 | 아스트라 폴 | 180% × 10 | 지정 지역 4.5초 폭풍 |
| 궁수 | 실피드 레인 | 200% × 9 | 장거리 추적 화살 연사 |
| 도적 | 팬텀 블레이드 | 150% × 12 | 빠른 칼날 연격 |
| 해적 | 오비탈 캐논 | 300% × 6 | 대형 범위 연속 포격 |

모바일 스킬 버튼, PC I키. 일반 보스·탑·주간·전직 보스·협동 균열에서 사용. 3차 전직 전에는 잠김.

## 확인한 범위

- 레벨/선행 전직 제한, 실패 시 미전직, 승리 시 전직, 중복 전직 차단, 누적 능력치, 3차 공격 잠금/재사용, 협동 입력 확인.
- 60레벨 보스 장비 10성·에픽 유효 잠재: 피격·이동 손실 없는 2차 시험 평균 63.5~69.4초 (5직업 각 10회).
- 100레벨 보스 장비 15성·유니크 유효 잠재: 같은 조건 3차 시험 평균 약 68~71초. 실제 회피로 공격 손실이 생기므로 더 어렵다.
- 100레벨 동일 장비·유효 잠재 3차 직업의 90초 이상적 총 피해량 177.5만~184.9만. 단일 전투 난수 비교에서 최대/최소 약 4.2% 차이. 모든 장비·이동 패턴에 대한 균형을 보장하는 수치는 아님.
- 360px/1280px 전투 화면에서 3차 버튼과 이펙트 표시, 자바스크립트 오류 없음. 모바일 스킬 3개 동시 표시.

## 이미지

기본 내장 image_gen 도구로 제작. 게임 파일 `tower/third-job-atlas.webp` (투명 배경, 5열 × 4행).
최종 프롬프트: Korean fantasy RPG VFX atlas, transparent background, 5 columns (warrior golden crimson sword shockwave; mage blue violet meteor vortex; archer emerald seven-arrow storm; rogue violet scarlet spectral dagger spiral; pirate cyan orange cannon barrage) × 4 animation rows (anticipation/release/peak/dissipate), top-down painted effects, isolated padded cells, no text, no characters or scenery.
