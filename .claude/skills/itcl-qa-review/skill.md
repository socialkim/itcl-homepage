---
name: itcl-qa-review
description: ITCL 홈페이지 변경사항에 대한 품질 검증(디자인 토큰 준수, 보안, 반응형, 링크 무결성, 프론트-백엔드 데이터 shape 매칭, SEO 메타 유효성)을 수행할 때 반드시 사용. 각 에이전트 작업 완료 직후 실행하여 이슈를 되돌린다. QA, 검증, 리뷰, 체크 요청 시 활성화.
---

# ITCL QA 리뷰

## 1. 검증 원칙

- **존재 확인이 아니라 경계면 비교** — "파일 있음/없음"보다 "프론트가 기대하는 shape ↔ 백엔드가 주는 shape" 매칭
- **Incremental** — 각 모듈 완료 직후 실행 (파이프라인 끝 1회 X)
- **구체적 리포트** — `파일:라인` + 위반 규칙 + 수정 제안

## 2. 검증 카테고리

### A. 디자인 토큰 준수

```bash
# 새로 추가된 HEX 색상 찾기 (:root 외 위치)
grep -nE '#[0-9a-fA-F]{3,6}' pages/*.html assets/styles.css | grep -v "^.*:root"
```

- 새 HEX가 발견되면: `:root`에 토큰 추가 후 var() 참조로 바꿔야 함
- 폰트·간격도 하드코딩 여부 검토

### B. 보안 (CRITICAL — 최우선)

```bash
# service_role key 프론트 유출 검사
grep -rnE "service_role|eyJhbGciOi" pages/ assets/ index.html
```

- 발견 시: **즉시 CRITICAL 리포트**, 해당 커밋 차단
- Supabase anon key는 존재해도 OK (RLS 정책이 보호)
- `.env`, `secrets.json` 같은 파일이 Git에 커밋되지 않았는지 확인

### C. RLS 정책 실효성 (Supabase 변경 시)

```bash
# anon으로 차단되어야 할 동작 확인
curl -s "$SUPABASE_URL/rest/v1/contact_submissions?select=*" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
# 기대: [] 또는 permission denied
```

### D. 반응형

- 960px(nav 모바일), 900px(섹션 패딩), 768px, 560px(1열)에서 검사
- 수동 리뷰: DevTools responsive mode
- 자동: `grep -n "@media"` 로 브레이크포인트 일관성 확인

### E. 링크 무결성

```bash
# 페이지 내 모든 a href 추출 후 파일 존재 확인
grep -rEoh 'href="[^"]+"' pages/ index.html | sort -u
```

- `../pages/<slug>.html` 파일 존재 여부
- `layout.js`의 `navItems[].href` 모두 실존
- 끊어진 링크 발견 시 HIGH

### F. 데이터 경계면 (프론트-백엔드)

- 프론트 fetch 코드의 기대 필드와 schema.sql 컬럼 교차 확인
  - 예: 프론트가 `row.author_init`를 읽는데 테이블은 `author_initials`이면 버그
- 응답 배열/객체 shape 매칭 (Supabase REST는 기본 배열 반환)
- 날짜 포맷: timestamptz는 ISO 8601 문자열로 옴

### G. SEO 메타

- `<title>` 글자 수: 50~60
- `<meta name="description">` 130~160
- canonical URL 절대 경로
- og:image 경로 실존 또는 기본 이미지로 fallback
- JSON-LD 유효성: `@context`와 `@type` 필수

JSON-LD 파싱 검증:
```bash
node -e "const $=require('cheerio').load(require('fs').readFileSync('pages/about.html','utf8')); $('script[type=\"application/ld+json\"]').each((_,el)=>{try{JSON.parse($(el).html());console.log('OK')}catch(e){console.error('INVALID:',e.message)}})"
```

### H. 접근성 (기본)

- `<img>` alt 속성 누락
- 버튼이 `<button>` 또는 `<a role="button">`인지
- 색 대비 (디자인 토큰 체계 내에서는 기본 확보됨)
- 키보드 포커스 스타일(`:focus-visible`)

## 3. 심각도 기준

| 등급 | 정의 | 예시 |
|---|---|---|
| **CRITICAL** | 보안 사고 / 서비스 다운 | service_role 유출, RLS 누락, 페이지 렌더 실패 |
| **HIGH** | 핵심 기능 고장 | 문의 폼 미전송, 끊어진 메인 nav 링크, 경계면 shape 불일치 |
| **MEDIUM** | UX 저하 | 모바일 깨짐, SEO 메타 누락, 반응형 어긋남 |
| **LOW** | 사소한 개선 | alt 누락 1개, 색 미세조정 |

## 4. 리포트 포맷

`_workspace/qa_report_<phase>.md`:

```md
# QA Report — <Phase 이름>
일시: YYYY-MM-DD HH:mm
검증 대상: [파일 목록]

## CRITICAL
- (없음) 또는:
- `pages/admin.html:42` — service_role key 하드코딩 발견. Edge Function으로 이관 필요.

## HIGH
- ...

## MEDIUM
- ...

## LOW
- ...

## 판정: PASS / FAIL
FAIL 시 담당 에이전트:
- itcl-frontend: [이슈 번호]
- itcl-backend: [이슈 번호]
```

## 5. 재검증 프로토콜

1. 1차 FAIL → 담당 에이전트에 SendMessage로 직접 되돌림
2. 수정 완료 시 재검증
3. 2회 연속 FAIL → 오케스트레이터에 에스컬레이션 (사용자 판단 필요)

## 6. 자주 발견되는 버그 패턴

- **토큰 하드코딩**: 디자이너가 새 색 필요해서 임시로 `#ff00aa` 박아둠
- **navItems 누락**: 새 페이지 만들고 메뉴 업데이트 깜빡
- **ITCL_BASE 누락**: 페이지 최상단 스크립트 없이 복붙 → nav 경로 깨짐
- **RLS policy 우회**: 새 테이블에 enable만 하고 policy 없음 → anon 전부 막힘(의도?) 또는 정책 없어 모두 허용(기본값 아님 — 막힘이 기본)
- **필드명 불일치**: 프론트 camelCase vs DB snake_case 매핑 누락
- **OG 이미지 경로**: 상대 경로로 넣어서 SNS에서 미리보기 깨짐
