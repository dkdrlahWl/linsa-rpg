# 투자 칭호 확장 (2026-10-26)

`큰손 투자자` 조건 문구를 실제 판정과 맞게 "투자 누적 **순수익** 1억 G"로 변경. 판정은 원래부터 거래내역의 총 PnL(판매 수수료 반영 후 수익 − 손실)이다.

| ID | 칭호 | 등급 | 조건 | 통계 키 |
| --- | --- | --- | --- | --- |
| invest1 | 첫 수익 실현 | 일반 | 코인 판매로 첫 수익 실현 | investWins ≥ 1 |
| investLiq | 깡통의 추억 | 일반 | 포지션 첫 청산 | investLiquidations ≥ 1 |
| invest100 | 차트 중독자 | 희귀 | 코인 거래 100회 완료 (초기화 환급 제외) | investTrades ≥ 100 |
| invest10m | 개미 투자자 | 희귀 | 순수익 1,000만 G | investProfit ≥ 1e7 |
| investShort | 하락의 예언자 | 영웅 | 숏으로 수익 실현 30회 | investShortWins ≥ 30 |
| investX2 | 한 방의 미학 | 영웅 | 단일 거래 수익률 +100% | investBestRate ≥ 1 |
| invest | 큰손 투자자 | 전설 | 순수익 1억 G | investProfit ≥ 1e8 |
| invest1b | 시장의 지배자 | 신화 | 순수익 10억 G | investProfit ≥ 1e9 |

서버 통계는 `titles-invest.sql`의 `title_stats()`(기존 키 유지 + 투자 키 추가). 지급·보유 효과(칭호당 치명타 피해 +0.5%p)는 기존 방식 그대로.
명패는 `큰손 투자자` 그림을 등급색으로 재채색한 임시본(`titles-src/plates/<id>.webp`). GPT 그림으로 교체하려면 같은 이름 WebP를 덮어쓰고 `node titles-src/export.mjs && python3 titles-src/build_plates.py` 후 새 SVG만 커밋.
