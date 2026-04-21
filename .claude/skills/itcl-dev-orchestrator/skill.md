---
name: itcl-dev-orchestrator
description: ITCL 홈페이지(C:/Users/kimdu/claude/itcl/)의 모든 개발·콘텐츠·배포 요청을 조율하는 오케스트레이터. 5명의 전문 에이전트(frontend, backend, content, seo, qa)를 구성하여 작업 유형별로 적절한 흐름을 실행한다. 'ITCL 홈페이지', 'ITCL 페이지 추가', 'ITCL 문의 폼', 'ITCL 인사이트', 'ITCL 배포', 'ITCL CMS' 등 ITCL 사이트 관련 모든 요청 시 반드시 이 스킬을 사용.
---

# ITCL Dev Orchestrator

## 실행 모드

**에이전트 팀 모드.** 5명의 전문가가 SendMessage/TaskCreate로 자체 조율하며, 파일 기반(`_workspace/`) 산출물 전달.

## 팀 구성 (.claude/agents/)

| 에이전트 | 타입 | 스킬 | 역할 |
|---|---|---|---|
| `itcl-frontend` | general-purpose | itcl-page-build | HTML/CSS/JS 페이지, 디자인 토큰, 반응형 |
| `itcl-backend` | general-purpose | itcl-supabase-ops | Supabase 스키마/RLS, Edge Function, 관리자 |
| `itcl-content` | general-purpose | itcl-content-kim-style | 김덕진 문체 칼럼·사례·카피 |
| `itcl-seo` | general-purpose | itcl-seo-pack | 메타/OG/JSON-LD/sitemap/AIEO |
| `itcl-qa` | general-purpose | itcl-qa-review | 경계면 교차 검증 (incremental) |

모든 Agent 호출 시 `model: "opus"` 명시.

## 작업 유형별 흐름

### 흐름 1: 새 페이지 추가
```
1. content    → 본문 원고 작성 (_workspace/content_<slug>.md)
2. frontend   → HTML 페이지 생성 + styles 확장 + navItems 등록
3. qa (1차)   → 토큰/링크/반응형 검증 → 수정
4. seo        → 메타/OG/JSON-LD 주입 + sitemap 갱신
5. qa (2차)   → 메타 유효성 + 전체 경계면 재확인
```

### 흐름 2: Supabase 연동 확장 (CMS 동적화 / 관리자 페이지)
```
1. backend    → 스키마 변경 + RLS + schema.sql 업데이트
2. frontend   → fetch 코드 추가 또는 admin UI 구축
3. qa         → RLS 실효성(curl 테스트) + shape 매칭 + service_role 미유출 확인
```

### 흐름 3: SEO 패키지 추가 (기존 페이지 전체)
```
1. seo        → 페이지별 메타 블록 생성 + sitemap/robots
2. frontend   → 각 페이지 <head>에 diff 적용
3. qa         → JSON-LD 유효성, 글자 수, 경로 검증
```

### 흐름 4: 반응형 개선
```
1. frontend   → 브레이크포인트 수정
2. qa         → 4개 breakpoint 수동 체크리스트 실행
```

### 흐름 5: 인사이트/사례 콘텐츠 추가
```
1. content    → 원고 (디지털 김덕진 프로필 참조)
2. frontend   → 정적 삽입 또는 backend 경유 동적 저장
3. seo        → 개별 페이지 메타
4. qa         → 전체 검증
```

### 흐름 6: 배포 (Vercel)
오케스트레이터가 직접 처리 (에이전트 불필요):
```
1. git 상태 확인 → 미커밋 변경 사항 확인
2. 로컬 http.server로 전체 12페이지 육안 확인 요청 (사용자)
3. vercel.json 필요 시 생성 (정적 사이트라 대부분 불필요)
4. Vercel CLI 또는 Git 연동 배포 가이드 제시
```

## 조율 프로토콜

### 작업 시작 시
1. 사용자 요청을 위 흐름 중 하나로 분류 (또는 복합 흐름 설계)
2. `TeamCreate`로 필요한 에이전트만 팀에 포함 (전체 5명 매번 부를 필요 없음)
3. `TaskCreate`로 의존성 있는 작업 목록 생성
4. 각 에이전트에게 역할과 입력 경로 전달

### 팀원 간 통신
- 실시간 조율 → `SendMessage`
- 산출물 전달 → `_workspace/` 파일 (규칙: `<phase>_<agent>_<artifact>.<ext>`)
- 진행 상황 → `TaskUpdate`

### Incremental QA
QA는 파이프라인 끝 1회가 아니라 **각 에이전트 산출 직후** 호출. QA가 FAIL 반환 시 원 에이전트에 SendMessage로 직접 되돌리고, 2회 재실패 시 오케스트레이터에 에스컬레이션.

## 데이터 전달 규약

### 작업 디렉토리
```
C:/Users/kimdu/claude/itcl/_workspace/
├── spec_<task>.md                  # 요구사항 명세
├── content_<slug>.md                # 콘텐츠 원고
├── <phase>_<agent>_<artifact>.<ext> # 중간 산출물
├── qa_report_<phase>.md             # QA 리포트
└── orchestrator_log.md              # 오케스트레이터 진행 로그
```

`_workspace/`는 보존 (감사 추적·재현성). `.gitignore`에 추가는 선택사항.

### 최종 산출물 위치
- HTML/CSS/JS: 기존 구조 그대로 (`pages/`, `assets/`, `index.html`)
- SQL: `schema.sql`
- SEO 메타: 각 페이지 `<head>` + 루트 `sitemap.xml`, `robots.txt`
- 콘텐츠: 정적 주입 시 해당 페이지 내부 / 동적 시 Supabase 테이블

## 에러 핸들링

| 상황 | 처리 |
|---|---|
| 에이전트가 제약 위반 결과 제출 (예: 빌드 도구 제안) | QA가 CRITICAL로 반려 → 1회 재시도 → 재실패 시 사용자 확인 |
| Supabase 접근 정보 없음 | backend가 dev 폴백으로 진행 + 사용자에게 키 설정 요청 안내 |
| 디지털-김덕진 프로필 파일 미존재 | content가 작성 중단 + 경로 확인 요청 |
| 이미지 자산 필요한데 없음 | frontend는 플레이스홀더 유지 + 리포트에 "HOLD" 표시 (AI 이미지 금지) |
| QA가 2회 FAIL 반환 | 오케스트레이터가 사용자 판단 요청 (에이전트 간 충돌) |

## 글로벌 제약 (모든 흐름에서 강제)

1. **빌드 도구 금지** — Vite/Next/Tailwind/Webpack 도입 요청 거부
2. **디자인 토큰 전용** — 하드코딩 HEX는 :root에 토큰으로 추가 후 var() 사용
3. **service_role 프론트 금지** — Edge Function 경계 뒤에만
4. **AI 이미지·스톡 사진 금지** — 대표강사/파트너는 플레이스홀더
5. **React/Vue 전환 금지** — 순수 HTML 구조 유지
6. **.claude/ 폴더 외부(`C:/Users/kimdu/claude/.claude/`) 건드리지 말 것**

## 테스트 시나리오

### 정상 흐름: "대표강사 김덕진 프로필에 저서 섹션 추가"
1. 오케스트레이터: 흐름 1(페이지 수정) 판단
2. content: 저서 3권(AI 2024/2025/2026)에 대한 짧은 설명 작성 → `_workspace/content_leaders_books.md`
3. frontend: `pages/leaders.html`에 섹션 추가, 기존 `.grid-3` 패턴 재사용 → QA 요청
4. qa: 디자인 토큰 확인, 모바일 레이아웃 검증 → PASS
5. seo: leaders.html의 JSON-LD(Person)에 `author` 확장 + sitemap lastmod 갱신
6. qa: 최종 확인 → 완료 리포트

### 에러 흐름: "Supabase에 뉴스레터 구독 테이블 추가"
1. backend: `subscribers(email, subscribed_at)` 테이블 + RLS(insert anon)
2. frontend: 구독 폼 UI 추가, supabase.js에 fetcher
3. qa: RLS가 SELECT 차단하는지 curl 테스트 → **FAIL: SELECT policy 실수로 public으로 열려있음**
4. qa → backend SendMessage: 정책 수정 요청
5. backend: policy 재작성 → qa 재검증 → PASS
6. seo: 해당 페이지(예: index.html 하단 섹션) 메타 업데이트

## 오케스트레이터 진행 로그 템플릿

```md
# <작업 이름> — <날짜>
사용자 요청: ...
판단한 흐름: 흐름 <N>
팀 구성: [agent1, agent2, ...]

## Phase 진행
- [x] Phase 1: content → content_X.md 생성 (5분)
- [x] Phase 2: frontend → pages/X.html 생성 (8분)
- [x] Phase 3: qa 1차 → PASS
- [ ] Phase 4: seo → 진행중
- [ ] Phase 5: qa 2차

## 이슈
- MEDIUM: OG 이미지 실물 없음 → 공통 기본 이미지로 fallback

## 최종 산출물
- pages/X.html
- sitemap.xml (갱신)
- schema.sql (해당 시)
```

## 첫 호출 시 확인할 것

1. `_workspace/` 디렉토리 생성 (없으면)
2. 기존 `schema.sql`, `assets/styles.css`, `assets/layout.js` 재확인 (변경 있었을 수 있음)
3. 사용자 요청 분류 후 팀 구성 발표 → 사용자 승인 후 실행
