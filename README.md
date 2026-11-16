# Ripe Weekly

궁금한 분야를 한 줄로 적으면, AI가 매주 많은 글을 읽고 지금 뜨는 것만 3분짜리 리포트로 보내 주는 앱.

## 구조

```
supabase/
  migrations/        DB 스키마 (ripe)
  functions/
    _shared/         공용 코드: DB 연결, 인증, Claude 호출, 다음 실행 시각 계산
    ripe-create/     사용자가 한 말 → 리포트 설정 + AI 지시문 (부족하면 질문 하나)
    ripe-run/        리포트 한 회차 만들기: 공용 조사 → 사람별로 쓰기 → 저장
app/                 실제 앱 (예정)
```

## 리포트가 만들어지는 흐름

1. `ripe-create`: 사용자의 요청과 입장으로 지시문(prompt), 조사 지역, 눈높이, 아이콘, 요일·시간을 정한다. 지시문은 서버만 쓸 수 있다.
2. `ripe-run`
   - 공용 조사: 같은 `research_key`(주제 + 지역)는 20시간 안의 조사 결과를 다시 쓴다. 웹 검색은 한 번만 한다.
   - 쓰기: 조사 결과를 사용자의 지시문(입장·눈높이·언어)에 맞춰 다시 쓴다.
   - 저장: 리포트, 추적 항목, 항목별 단계 기록(4주 흐름 그래프용), 검색 수, 비용.
3. 예약 실행: pg_cron이 `ripe-run`에 `{ "due": true }`를 보내면 시간이 된 리포트를 돌린다 (설정 예정).

## 설정

| 이름 | 위치 | 설명 |
|---|---|---|
| `RIPE_ANTHROPIC_API_KEY` | Edge Functions → Secrets | Claude API 키 |
| `ripe_cron_secret` | Vault (DB 안) | 예약 실행·내부 호출 확인용. 마이그레이션이 랜덤으로 만든다 |

## 배포

```bash
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy ripe-create
supabase functions deploy ripe-run
```

지금은 다른 앱과 같은 Supabase 프로젝트(camtrip) 안에 `ripe` 스키마로 분리돼 있다. 출시 전에 전용 프로젝트로 옮긴다 (로그인 계정·로그인 설정이 프로젝트 단위로 공유되기 때문).

## 비용 (첫 테스트, 2026-11-16)

- 새로 조사할 때: 검색 6회, 글 53개, 약 70초, $0.078
- 같은 주제를 다른 사람이 받을 때(조사 재사용): 약 5초, $0.0007
