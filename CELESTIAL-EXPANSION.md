# 천사 등급 · 주간보스 2단계 · 초월석 던전 확장

- 천사 장비: 무기, 투구, 갑옷, 바지, 신발, 반지, 귀걸이 각 1종. 순백색 실버 외형과 발광 프레임.
- 천사 소환: Lv.16 / 17 / 18에서 0.001% / 0.002% / 0.003%. 기존 타락 확률 유지. 일반 등급에서 해당 확률만 이전. 확률표 공개.
- 소환 연출: 0~2.2초 성광, 2.2초 날개 전개, 4초 장비 강림, 5초 상세 표시, 6초 확인 활성화. 전용 상승 화음·날개·종소리. 음소거 및 효과음 볼륨 적용. 모션 감소 설정에서도 6초 유지.
- 주간보스 2단계: 성천의 심판자 아우리엘, HP 8,400,000. 패턴 피해가 1단계의 정확히 2배. 서로 다른 기하 형태의 신규 11패턴. 모든 칸에서 두 걸음 이내 안전칸 보장. 기존 이동속도·7분 제한·부활·단계 공통 주 3회 보상 유지.
- 초월석 7단계: 백야의 수정정원, HP 1,139,062, 초월석 8개.
- 초월석 8단계: 천공의 광휘제단, HP 1,708,593, 초월석 9개.
- 신규 던전은 기존과 같이 1~2인, 15초, 하루 2회 보상 규칙을 사용.

## 검증

`node --test test/economy.test.mjs test/angel-economy.test.mjs test/summon50.test.mjs test/world-boss-model.test.cjs`: 25개 통과.

`node test/celestial-db.test.mjs`: 기존 1단계 회귀, 새 보스 방 생성·공격·보상 우편·횟수, 11종 패턴의 피해·좌표·안전칸, 초월석 7/8단계, 비공개 함수 권한 검증.

`node test/celestial-browser.test.mjs`: 실제 페이지와 격리 계정으로 7종 장비의 표시/서버 공격력 일치, 확률표, 320/390/1280px 소환, 6초 확인 잠금, Escape, 모션 감소, 정리 검증.

`node test/celestial-raid-browser.test.mjs`: 두 브라우저와 격리 PostgreSQL로 단계 선택·참가·시작·신규 패턴·이동·승리·퇴장 및 3개 화면 크기 검증.

기존 `gear-sets.test.mjs`, `tower-hp-restored.test.mjs`의 34개 실패는 수정 전 cdb124e에서도 동일하게 재현된다. 오래된 기대값이며 이 변경의 완료 기준으로 사용하지 않았다.

기존 서버 보안 검사에는 비공개 테이블의 의도적인 RLS 무정책 및 기존 인증 RPC 알림이 있다. 신규 패턴 함수는 비공개이며 public/anon/authenticated 실행 권한이 없다. 기존 유출 비밀번호 차단 비활성 알림은 이 변경 범위 밖이다. 안내: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

## 아트

보스와 전장: 내장 이미지 생성 도구 사용. 저장 경로 `art/celestial/auriel-arena.png`. 장비 7종과 던전 2종은 프로젝트 SVG 자산 `art/celestial/gear-0.svg`~`gear-6.svg`, `stone-7.svg`, `stone-8.svg`.

생성 프롬프트: Create a finished premium Korean fantasy RPG boss arena illustration, landscape 3:2 composition, no text no UI no letters. A colossal six-winged faceless celestial judge in luminous ivory-silver full armor with circular floating halo and long white crystalline sword, suspended at the upper center of a ruined floating white marble cathedral above a dark blue sea of clouds. Majestic ominous radiant white and pale cyan, intricate feather layers and silver filigree. Keep lower 55 percent an unobstructed square marble combat platform seen from a slightly elevated front perspective, subtle tiled floor, clear playable area. Boss occupies upper 40 percent, large readable silhouette. Strong depth, painterly AAA fantasy game key art, exceptional detailed lighting, high contrast but no blown out white, no dragon, no humans in foreground. This is the actual game background for a new harder weekly boss stage.
