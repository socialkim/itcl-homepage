# ITCL 프로젝트 — Claude Code 세션 인수인계 백업

> **목적**: 이 문서는 Claude Code CMD 창이 꺼지거나 컨텍스트가 날아갔을 때, 새 세션에서 이 파일 하나만으로 작업을 이어받을 수 있게 하는 기술 백업이다.
>
> **사용법**: 새 Claude Code 세션에서 `C:/Users/kimdu/claude/itcl/HANDOFF.md` 를 읽게 하고 "이 문서 기준으로 다음 작업 이어줘"라고 지시하면 된다.

**최종 업데이트**: 2026-04-23 (Part 5 — GitHub 연동 완료 + Blocked 해결 + 업로드 end-to-end 성공)
**작업 폴더**: `C:\Users\kimdu\claude\itcl\`
**사용자**: 김덕진 (Kim Dukjin, IT커뮤니케이션연구소 소장)

## 🚨 덕진님이 깨어나시면 제일 먼저 할 것

1. **`schema-admin.sql` Supabase에서 실행** (1분) — 관리자 페이지 DB 준비.
   - 메모장으로 이미 열려있음. 전체 복사 → https://supabase.com/dashboard/project/sxvhyrubjzqebmpeeqws/sql → 붙여넣기 → Run.
2. **`ADMIN-CREDENTIALS.md` 확인** — 관리자 로그인 비밀번호.
3. **관리자 페이지 접속**: 최신 URL/pages/admin (현재: `https://itcl.vercel.app/pages/admin`)

---

## 1. 프로젝트 정체

- **대상**: ITCL(IT커뮤니케이션연구소) 공식 홈페이지
- **구조**: 정적 HTML 12페이지 + Supabase 백엔드 (문의 폼) + Vercel Serverless 1개
- **빌드 도구 없음**: 순수 HTML/CSS/JS (디자이너 의도)
- **디자인 시스템**: Clean Tech v3 — `:root` CSS 변수 기반 (`--accent` #635bff, `--accent-2` #00d4b4, `--accent-3` #ff7d5c)
- **공통 레이아웃**: `assets/layout.js`가 nav + footer 동적 주입

### 페이지 목록
- `index.html` (메인)
- `pages/about.html` (회사 소개)
- `pages/services.html` (4대 핵심 서비스)
- `pages/leaders.html` (대표강사 김덕진·김아람)
- `pages/partners.html` (파트너 강사진 16명)
- `pages/programs.html` (교육 프로그램)
- `pages/process.html` (의뢰 프로세스 6단계)
- `pages/insights.html` + `insights-detail.html` (칼럼)
- `pages/cases.html` + `cases-detail.html` (사례, 이미지 `uploads/` 사용)
- `pages/resources.html` (저서·미디어)
- `pages/contact.html` (문의 폼)

---

## 2. 배포 상태 (작동 중)

### Vercel
- 프로젝트 slug: `socialkim0211-3722s-projects/itcl`
- **고정 프로덕션 URL: `https://itcl.vercel.app`** (Part 4에서 GitHub 연동으로 획득)
- Git 저장소: `socialkim/itcl-homepage` (Vercel 자동 배포 연결됨)
- 배포 트리거: `git push origin main` → 1~2분 내 자동 반영
- 이전 배포 URL들도 유효 (히스토리 접근 가능)
- 함수 수: **3개** (Hobby 플랜 12개 한도 대비 여유) — 기존 16개에서 catch-all 통합으로 축소
  - `api/contact.js`: 문의 폼 + Resend 이메일
  - `api/admin/[...path].js`: 모든 관리자 엔드포인트 통합
  - `api/public/[...path].js`: 모든 공개 엔드포인트 통합
  - ⚠️ 매 배포마다 새 해시 URL 생성. `vercel ls itcl` 로 현재 목록 확인 가능
  - ⚠️ 안정 URL을 원하면 `vercel alias` 설정 또는 커스텀 도메인 연결
- Deployment Protection(SSO): **비활성화됨** (공개 접근 가능). API로 `ssoProtection: null` 설정
- 빌드: 정적 + `/api/` 자동 서버리스 (Node.js)
- 파일별 헤더: `vercel.json`에 cleanUrls, 보안 헤더, `/assets/*` 1년 immutable 캐시

### Supabase
- Project Ref: `sxvhyrubjzqebmpeeqws`
- URL: `https://sxvhyrubjzqebmpeeqws.supabase.co`
- Region: Seoul (ap-northeast-2)
- 테이블: `contact_submissions`, `insights_posts`, `cases_posts` (모두 RLS 활성화)
- **중요**: 이 프로젝트는 **신 API 키 체계만 활성** (`sb_publishable_...` / `sb_secret_...`). 레거시 JWT (`eyJhbGciOi...`)는 존재하지 않음
- Dashboard: https://supabase.com/dashboard/project/sxvhyrubjzqebmpeeqws

### Vercel 환경변수 (Production)
- `SUPABASE_SECRET_KEY` : Supabase service_role 키 (sb_secret_...)
- `RESEND_API_KEY` : Resend API 키 (re_...)
- `ADMIN_PASSWORD` : 관리자 로그인 비밀번호 (ADMIN-CREDENTIALS.md 참조)
- `ADMIN_SESSION_SECRET` : 세션 쿠키 HMAC 서명 시크릿 (64자 hex)
- `GITHUB_TOKEN` : PAT (`socialkim/itcl-homepage` contents:write)
- `GITHUB_OWNER` : `socialkim`
- `GITHUB_REPO` : `itcl-homepage`
- ⚠️ 모든 키는 절대 프론트 파일·Git·채팅에 반영 금지
- ⚠️ `echo "val" | vercel env add` 는 trailing `\n` 저장됨 → 코드에서 반드시 `.trim()` 처리
- ⚠️ Preview 환경 누락 시 Preview 배포에서 API 에러 발생할 수 있음 — 필요하면 수동 추가

### GitHub 연동 (Part 4~5)
- **Repo**: `https://github.com/socialkim/itcl-homepage` (Public)
- **Vercel 연결**: `git push origin main` → 자동 배포 (1~2분)
- **고정 URL**: `https://itcl.vercel.app`
- ⚠️ **Repo는 반드시 Public 유지** — Private 전환 시 Vercel Hobby 플랜 제약으로 배포 Blocked
- Pro 플랜 ($20/월) 업그레이드하면 Private 가능

### Resend (이메일 발송)
- 계정: socialkim0211 가입 (Gmail OAuth)
- 도메인: `itcl.kr` **Verified** (2026-04-19)
  - DKIM: `resend._domainkey.itcl.kr` TXT
  - MX: `send.itcl.kr` → `feedback-smtp.ap-northeast-1.amazonses.com` (Priority 10)
  - SPF: `send.itcl.kr` TXT → `v=spf1 include:amazonses.com ~all`
  - DMARC: `_dmarc.itcl.kr` (optional, may not be added)
- Region: ap-northeast-1 (Tokyo)
- From: `ITCL 연구소 <noreply@itcl.kr>`
- 무료 플랜: 3,000통/월, 100통/일

### itcl.kr DNS 관리
- 레지스트라/DNS: **호스팅.kr** (ns1~ns4.hosting.co.kr)
- Dashboard URL: https://www.hosting.kr/ → 마이페이지 → 도메인 관리 → itcl.kr → 네임서버/DNS
- Google Workspace MX: 5개 (aspmx.l.google.com 계열) — **절대 건드리지 말 것**
- 포워딩 설정: 현재 `litt.ly/kimdukjin`으로 활성 — 홈페이지 도메인 연결 시 해제 필요

### 문의 폼 end-to-end 작동 확인 (2026-04-19)
브라우저 폼 제출 → `/api/contact` (Vercel Serverless) → 
(1) Supabase service_role INSERT → DB 저장 
(2) Resend 병렬 이메일 3통:
  - 관리자 알림 → `itcl_sns@itcl.kr`, `kimdukjin@itcl.kr` (Reply-To: 문의자)
  - 문의자 확인 → 제출한 이메일 (Reply-To: itcl_sns@itcl.kr)
모든 한글 정상 렌더링 확인됨.

---

## 3. 아키텍처 결정 (히스토리 중요)

### 3-1. Supabase INSERT 경로 — 왜 Serverless 프록시인가

**원래 설계**: 클라이언트 → Supabase REST (publishable key + RLS 정책)

**문제**: 신 API 키(`sb_publishable_...`)가 이 프로젝트에서 RLS role 매핑이 안 됨. 어떤 정책(`to anon`, `to authenticated`, `to public`, 심지어 `to` 절 없는 정책)도 매칭 안 됨. `42501 new row violates row-level security policy` 지속 발생. SQL Editor에서 superuser INSERT는 성공 (테이블 구조·제약·데이터 문제 아님).

**피벗**: 클라이언트 → `/api/contact` (Vercel Serverless) → Supabase service_role INSERT
- service_role은 RLS 우회 + 서버 환경변수로만 관리 (프론트 노출 제로)
- 더 안전하고 확장 가능 (rate limit, 이메일 알림, spam 필터 추가 용이)
- Part 2에서 이메일 알림도 이 서버리스 함수 안에 통합됨

**보안 모델**:
- `sb_publishable_...` 는 더 이상 코드에 없음 (assets/supabase.js에서 제거됨)
- `sb_secret_...`, `RESEND_API_KEY` 는 Vercel env var로만 존재
- RLS는 그대로 유지 (defense in depth)

### 3-3. 이메일 발송 경로 (Part 2 추가)

**흐름**: Vercel Serverless → Resend REST → SMTP → 수신자

**중요 결정**:
- Gmail SMTP 대신 Resend 선택 (개발자 친화, 3,000통 무료, Vercel 최적화)
- 이메일 실패해도 요청은 성공 반환 (DB 저장이 주 작업, 이메일은 부수 효과)
- `Promise.allSettled`로 2통 병렬 전송 (한쪽 실패해도 다른 쪽 진행)
- Reply-To 분리:
  · 관리자 메일 → Reply-To: 문의자 이메일 (답장 시 문의자에게 직접)
  · 문의자 메일 → Reply-To: itcl_sns@itcl.kr (답장 시 운영팀으로)

### 3-4. UTF-8 인코딩 함정 (Part 2에서 발견)

**증상**: Resend로 보낸 이메일에서 하드코딩 한글은 정상 렌더링 되지만 
`data.topic`, `data.name` 같은 req.body 유래 동적 한글이 mojibake로 깨짐.

**원인**: Node.js `fetch()`에 `Content-Type: application/json` (charset 명시 X)로 
`body: JSON.stringify(...)` 전송 시, 중간 HTTP 계층이 일부 환경에서 
UTF-8 바이트를 Latin-1로 해석 → 한글 바이트 손상.

**해결** (api/contact.js의 sendEmail):
```js
const body = Buffer.from(JSON.stringify(payload), 'utf-8');
fetch('...', {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length.toString(),
  },
  body,
});
```

**교훈**: Node.js fetch에서 한글/비ASCII 데이터 전송 시 반드시 charset=utf-8 명시 
+ Buffer로 바이트 고정.

### 3-2. 의도적으로 채택한 제약 (절대 위반 금지)
1. 빌드 도구 금지 (Vite/Next/Webpack/Tailwind 등)
2. 디자인 토큰 전용 (하드코딩 HEX 금지 — `:root`에 먼저 추가 후 사용)
3. service_role 키 프론트 반입 금지
4. 대표강사·파트너에 AI 이미지/스톡 사진 금지 (플레이스홀더 유지, 실제 사진 대기)
5. React/Vue/Svelte 전환 금지
6. `C:/Users/kimdu/claude/.claude/`(상위 폴더 .claude) 건드리지 말 것. `itcl/.claude/`는 OK.

---

## 4. 생성된 파일 목록

### 하네스 (`.claude/`)
```
.claude/
├── agents/
│   ├── itcl-frontend.md       # HTML/CSS/JS, 디자인 토큰, 반응형
│   ├── itcl-backend.md        # Supabase, RLS, Edge Function
│   ├── itcl-content.md        # 김덕진 문체 콘텐츠
│   ├── itcl-seo.md            # 메타/OG/JSON-LD/sitemap/AIEO
│   └── itcl-qa.md             # 경계면 교차 검증 (incremental)
└── skills/
    ├── itcl-dev-orchestrator/skill.md  # 메인 오케스트레이터 (6종 흐름 정의)
    ├── itcl-page-build/skill.md         # 페이지 생성·수정 규약
    ├── itcl-supabase-ops/skill.md       # Supabase 운영 (새 키 포맷 반영됨)
    ├── itcl-content-kim-style/skill.md  # 김덕진 문체
    ├── itcl-seo-pack/skill.md           # SEO·AIEO 패키지
    └── itcl-qa-review/skill.md          # QA 검증 체크리스트
```

모든 에이전트 `model: opus`. 실행 모드: **에이전트 팀** (SendMessage/TaskCreate로 자체 조율).

### 배포 설정
- `vercel.json` — cleanUrls, 보안 헤더, 캐시
- `.vercelignore` — `.claude/`, `_workspace/`, `schema.sql`, 디자이너 초안 HTML 등 제외

### Serverless
- `api/contact.js` — 문의 폼 프록시 + 이메일 알림 (POST, 입력 검증, Supabase insert, Resend 이메일 2통 발송)

### 중간 산출물
- `_workspace/` — 에이전트 간 산출물 교환 + 세션 스크린샷들 저장됨
- `supabase-fix-policy.sql` — RLS 정책 수정 SQL (레퍼런스, 최종 해결에는 쓰이지 않음)
- `vercel-env-setup.txt` — SUPABASE_SECRET_KEY env var 설정 가이드 (기념용)
- `dns-records-for-hosting.txt` — Resend 도메인 인증용 4개 DNS 레코드 값 (호스팅.kr 입력용, Part 2)
- `schema-admin.sql` — 관리자 CMS용 추가 스키마 (site_config, admin_emails, page_sections, admin_audit_log) — Part 3
- `ADMIN-CREDENTIALS.md` — 관리자 비밀번호 (Git 제외됨) — Part 3
- `_workspace/inject-seo.js` — SEO meta 주입 스크립트 (도메인 변경 시 재실행) — Part 3

### Part 3 추가 파일들
```
api/admin/[...path].js       # 관리자 API 통합 (login/config/emails/sections/insights/cases/submissions/stats)
api/public/[...path].js      # 공개 API 통합 (config/section/insights/cases)
lib/admin-session.js          # 세션 쿠키 HMAC 서명·검증
lib/supabase-rest.js          # service_role REST 래퍼 (UTF-8 안전)
pages/admin/index.html        # 로그인
pages/admin/dashboard.html    # 통계 대시보드
pages/admin/settings.html     # 사이트 설정 (로고, 회사명, 연락처)
pages/admin/emails.html       # 관리자 이메일 CRUD
pages/admin/section.html      # 페이지 콘텐츠 편집 (?page=about 등)
pages/admin/insights.html     # 인사이트 CRUD (마크다운 에디터)
pages/admin/cases.html        # 교육사례 CRUD
pages/admin/submissions.html  # 문의 관리 (상태 변경, 메모, 담당자)
pages/admin/domain.html       # 도메인·배포 상태 뷰
assets/admin.css               # 관리자 전용 스타일
assets/admin.js                # 관리자 쉘·사이드바·API 래퍼
assets/favicon.svg             # 그라디언트 파비콘
assets/og-default.svg          # OG 이미지 (소셜 미리보기)
sitemap.xml                    # 11개 페이지 URL 목록
robots.txt                     # admin/api 차단 + sitemap 선언
```

### 기존 파일 (수정됨)
- `assets/supabase.js` — `/api/contact` 호출하도록 재작성
- `assets/styles.css`, `assets/layout.js` — 변경 없음
- `schema.sql` — 변경 없음 (RLS 정책 세트 여러 버전 시도되었으나 서비스 경로에 영향 없음)

### 제외된 파일 (배포에 포함 안 됨)
- `ITCL Hero 비교 시안.html`, `ITCL 홈페이지 v3 Clean Tech.html` (디자이너 초안)
- `uploads/itcl_homepage_step2_guide.md`, `uploads/itcl_homepage_v2.html`
- `.claude/`, `_workspace/`, `schema.sql`, `CLAUDE_CODE_PROMPT.md`

---

## 5. 사용자 맥락 (새 Claude가 알아야 할 것)

### 환경
- Windows 11 Home, Claude Code (Opus 4.7, 1M context)
- 멀티 모니터: 주 모니터 2560x1440, 보조 1440x900 (x=-2880에 위치)
- Shell: bash (Claude Code 내), Python 3.12, Node 24, npm 11, Vercel CLI 51.7.0
- Git repo는 `C:/Users/kimdu/claude/` (상위 폴더). itcl은 하위 폴더로 포함됨 — Git 관리 대상

### 사용자 작업 스타일
- **CMD 복붙 이슈**: 이 사용자는 CMD에서 Ctrl+V 등이 동작하지 않는 경우가 많다. 복잡한 값을 복사시켜야 할 땐 notepad 파일로 만들어서 열어주거나, **브라우저↔브라우저 경로**로 설계해라. 채팅에 긴 값 붙여넣기도 번거로워 한다.
- **스크린샷 불가**: Claude Code가 CMD에서 돌아가서 이미지 첨부 불가. 대신 **PowerShell로 내가 직접 캡처**해서 Read 툴로 해석하는 방식 사용:
  ```bash
  powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; \$bmp=New-Object System.Drawing.Bitmap 2560,1440; \$g=[System.Drawing.Graphics]::FromImage(\$bmp); \$g.CopyFromScreen(0,0,0,0,(New-Object System.Drawing.Size 2560,1440)); \$bmp.Save('C:\Users\kimdu\claude\itcl\_workspace\screen.png'); \$g.Dispose(); \$bmp.Dispose()"
  ```
  특정 영역 크롭은 `CopyFromScreen(x,y,0,0,size)` 첫 2개 인자 조정.
- **브라우저 자동 열기**: `start "" "URL"` 로 기본 브라우저에 URL 오픈 가능 (Windows)

### 사용자 정체·문체
- 김덕진 (Kim Dukjin) — IT커뮤니케이션연구소 소장, AI 교육·방송·집필 15년 경력
- 디지털 김덕진 시스템이 `C:/Users/kimdu/claude/디지털-김덕진/`에 구축되어 있음
- `itcl-content` 에이전트가 콘텐츠 쓸 때 반드시 참조: `profile/02-voice-style.md`, `profile/05-topic-positions.md`
- 문체: 구어체, "~것이지요", 역사 비유 → 데이터 → 의미 → 미래의 4단 구조, "AI는 써본 만큼 보인다"

---

## 6. 작업 완료 상태

### Part 1 (DB 저장)
- [x] 하네스 엔지니어링 — 에이전트 팀 5명 + 스킬 6개 설계
- [x] 로컬 서버 (`python http.server`) 동작
- [x] Vercel 공개 배포 (SSO 해제, clean URLs, 보안 헤더)
- [x] Supabase 프로젝트 연결
- [x] `contact_submissions` 테이블 + RLS
- [x] Vercel Serverless Function 프록시 (`/api/contact`)
- [x] Supabase Secret Key를 Vercel env var로 안전 저장
- [x] 실제 브라우저 폼 → DB 저장 end-to-end 검증

### Part 2 (이메일 알림)
- [x] Resend 계정 생성 + API Key 발급
- [x] `RESEND_API_KEY` Vercel env var 등록
- [x] api/contact.js에 이메일 2종 발송 로직 통합
- [x] 이메일 HTML 템플릿 2종 (관리자 알림 + 문의자 확인, 브랜드 컬러)
- [x] Reply-To 분리 설계 (관리자→문의자 / 문의자→운영팀)
- [x] `itcl.kr` 도메인을 Resend에 DNS 레코드로 인증 (호스팅.kr)
- [x] From 주소 업그레이드: onboarding@resend.dev → noreply@itcl.kr
- [x] UTF-8 인코딩 함정 발견 및 수정 (Buffer + charset=utf-8)
- [x] 실제 폼 → 3개 메일함 수신 + 한글 정상 렌더링 확인

### Part 5 (2026-04-23 — Blocked 해결 + 업로드 end-to-end 성공)
- [x] Vercel env vars 3종 등록 (GITHUB_TOKEN/OWNER/REPO) — UI 오류 → CLI 우회
- [x] Git 푸시 후 배포 Blocked 문제 진단 — Hobby 플랜 private repo 제약
- [x] `socialkim/itcl-homepage` Public 전환 → Blocked 해제
- [x] env var 줄바꿈 trim 처리 (handleUpload에서 `.trim()`)
- [x] 실제 업로드 테스트 통과: `https://itcl.vercel.app/api/admin/upload` → GitHub commit → raw URL 정상
- [x] 보안: 클립보드 PAT 자동 정리, 클립보드 기반 env 등록 패턴 확립

### Part 4 (2026-04-21 — GitHub 연동 + 클라이언트 CMS + 파일 업로드)
- [x] 메인 페이지 "Trusted by" 섹션 CMS화 — 관리자에서 기업명/로고/순서/활성 편집
- [x] `pages/admin/clients.html` 신설 (15개 기본 기업 seed 버튼 포함)
- [x] `api/public/[...path].js`에 `clients` page_key 화이트리스트 추가
- [x] `index.html` 동적 렌더링 (fallback 하드코딩 15개 유지)
- [x] 파일 업로드 기능 — base64 → GitHub Contents API → raw URL
- [x] `api/admin/upload` 엔드포인트 (GITHUB_TOKEN/OWNER/REPO env 필요)
- [x] **GitHub repo 생성 및 push** — `https://github.com/socialkim/itcl-homepage`
- [x] **Vercel Git 연동** — `itcl.vercel.app` 고정 URL + git push 자동 배포
- [x] `.gitignore` 정비 (ADMIN-CREDENTIALS, _workspace, 수파베이스 메모 등 제외)

### Part 3 후속 (2026-04-20 아침 — 404 버그 수정 + 동작 검증)
- [x] 로그인 후 404 발생 버그 진단 — Vercel cleanUrls + 상대경로 리다이렉트 충돌
- [x] `pages/admin/index.html` 로그인 리다이렉트 절대경로 전환
- [x] `assets/admin.js` 전체 네비게이션/API 호출 절대경로 전환 (`ADMIN_BASE`, `API_BASE` 상수화)
- [x] 덕진님 로그인 → 대시보드 정상 렌더 확인 (문의 7건, 인사이트 3편, 사이드바 14개 메뉴 모두 동작)

### Part 3 (관리자 CMS + SEO + 콘텐츠, 새벽 자동 작업 2026-04-19→04-20)
- [x] 관리자 인증 시스템 (패스워드 + HMAC 서명 세션 쿠키, ADMIN_PASSWORD/ADMIN_SESSION_SECRET env)
- [x] 관리자 Supabase 스키마 설계: `site_config`, `admin_emails`, `page_sections`, `admin_audit_log` (schema-admin.sql)
- [x] 관리자 API 11종 통합 catch-all 엔드포인트 (Hobby 12함수 한도 대응)
  - login/logout/session, config, emails, sections, insights (CRUD), cases (CRUD), submissions, stats
- [x] 공개 API catch-all: config/section/insights/cases (layout.js에서 사용)
- [x] 관리자 페이지 10개: 로그인, 대시보드, 사이트설정, 이메일, 섹션편집(페이지별), 인사이트, 사례, 문의관리, 도메인·배포
- [x] 관리자 UI 자산: `assets/admin.css`, `assets/admin.js` (공통 쉘 + 사이드바 + 토스트 + API 래퍼)
- [x] `assets/layout.js` 동적화: /api/public/config로 사이트 설정 fetch 후 nav/footer 재렌더
- [x] `api/contact.js` 동적화: admin_emails 테이블에서 수신자 읽기 (fallback 유지)
- [x] SEO 패키지: 13개 페이지에 canonical/OG/Twitter/favicon meta 주입 + index.html Organization JSON-LD
- [x] sitemap.xml + robots.txt (관리자 페이지 disallow)
- [x] 샘플 favicon.svg + og-default.svg (그라디언트 브랜드 컬러)
- [x] 김덕진 문체 샘플 인사이트 3편:
  - `ai-adoption-language-gap` (AI 도입 격차는 언어의 문제)
  - `genai-governance-5-questions` (CEO가 답해야 할 거버넌스 5대 질문)
  - `ai-agent-reality-2026` (AI 에이전트 과장과 현실)

---

## 7. 다음 작업 목록 (우선순위 순)

Part 3 종료 시점 **1, 3, 4, 6, 7번 완료**. 남은 작업 2개:

### ▶ 최우선: schema-admin.sql 실행 (사용자 1분)
SQL Editor에서 schema-admin.sql 실행해야 관리자 CMS가 완전 작동함.
실행하지 않아도 기존 사이트와 문의 폼·이메일은 정상 작동 (fallback 구조).

### 2. 도메인 연결 (다음 대기)
- 후보: `itcl.kr` / `www.itcl.kr` / 새 도메인 구매 / `itcl.vercel.app` 무료 서브도메인
- Vercel Domains에 추가 + 호스팅.kr DNS 레코드 설정
- 도메인 연결 후 체크리스트:
  · `api/contact.js`의 `SITE_URL` 상수 업데이트
  · `_workspace/inject-seo.js` 스크립트의 `SITE_URL` 상수 업데이트 후 재실행
  · `sitemap.xml` URL 업데이트
  · 호스팅.kr의 `litt.ly/kimdukjin` 포워딩 비활성화
  · Resend는 이미 itcl.kr 인증되어 있어 도메인 변경 시 재작업 없음

### 5. 이메일 템플릿/문구 미세 튜닝 (미뤄둠)

### 8. 프로필 이미지 (대표강사·파트너) 업로드 UI (TODO)
- 현재 plan: admin/leaders.html에 URL 입력 필드만 있음
- 향후: Supabase Storage 연동으로 직접 업로드 지원
- 실제 사진은 고객이 제공 예정 (지금은 플레이스홀더)

### (ARCHIVED) 4. 관리자 페이지 — Part 3에서 완료
- `pages/admin/` 하위 페이지들 또는 `pages/admin.html` 단일 페이지
- Supabase Auth email/password 로그인
- 문의 목록 조회·검색·상태 변경 (new → in_progress → resolved → archived)
- 주의사항:
  · `sb_publishable_...` RLS 매핑 이슈 지속 → 관리자 기능도 `api/admin-*.js` 서버 프록시 패턴 권장
  · 인증 확인은 `supabase-js` 클라이언트로 JWT 획득 후 api에 전달, 서버에서 service_role로 DB 조회
- 설계 포인트:
  · 상단: 전체 문의 수, 미처리 수, 오늘 접수 수 대시보드
  · 리스트: 테이블 형태, 상태별 필터, 날짜 정렬
  · 상세: 모달 또는 별도 페이지, 상태 변경, 담당자 지정, 내부 메모
  · 반응형: 모바일도 관리 가능하도록

### 5. 이메일 템플릿/문구 미세 튜닝 (선택)
- 도메인 연결 후 SITE_URL 하드코딩 값 업데이트 필요 (api/contact.js L14)
- 이메일 하단 푸터 링크 실제 도메인으로
- 관리자 메일 디자인/문구 추가 개선 여지

### 6. SEO 패키지 12페이지 전체 주입
- `itcl-seo` 에이전트 활용
- 메타/OG/Twitter Card/canonical
- JSON-LD: Organization, Person, Article, Course, Service, FAQPage
- `sitemap.xml` + `robots.txt`
- 도메인 연결 후 실행 (canonical URL 필요)

### 7. 인사이트 칼럼 콘텐츠 추가
- `itcl-content` 에이전트 (김덕진 문체)
- 주제 후보: "AI 도입 격차", "생성형 AI 거버넌스", "AI 에이전트 현실"
- 정적으로 pages/insights-detail.html에 주입 또는 Supabase insights_posts 동적화

### 8. 도메인 연결 (최종 단계)
- 사용자가 결정해야 할 것: 어떤 도메인 쓸지 (이미 소유 / 새로 구매 / Vercel 서브도메인)
- 후보:
  · itcl.kr 자체를 홈페이지로 (호스팅.kr의 litt.ly 포워딩 해제 필요)
  · lab.itcl.kr, www.itcl.kr 같은 서브도메인
  · 새 도메인 구매
- Vercel CLI: `vercel domains add <domain>` 또는 Dashboard에서 추가
- DNS 레코드 (A 또는 CNAME) 호스팅.kr에서 설정
- 도메인 연결 후 체크:
  · api/contact.js의 `SITE_URL` 상수 업데이트
  · Resend는 이미 itcl.kr 인증되어 있어서 도메인 변경 시 재작업 없음

---

## 8. 알려진 이슈 & 주의사항

### 알려진 함정 (Part 3 아침에 발견·수정)
**Vercel cleanUrls + 상대경로 = 404 버그**
- 증상: `/pages/admin`에서 `location.href = 'dashboard.html'` 하면 `/pages/dashboard`로 이동해서 404
- 원인: cleanUrls가 활성화된 상태에서 브라우저는 URL의 `admin`을 파일로 취급하여 상대 URL resolution 시 경로 교체
- 해결: 관리자 영역의 모든 네비게이션·API 호출을 절대경로로 전환 (`/pages/admin/...`, `/api/admin/...`)
- 교훈: SPA가 아닌 정적 HTML + cleanUrls 환경에서는 절대경로 원칙

### 잠재적 이슈
1. **`sb_publishable_...` RLS 매핑**: 이 프로젝트에선 영영 안 될 수도 있음. 신규 동적화 작업은 전부 serverless 프록시로 가는 것을 권장.
2. **Deployment URL 변동**: 매 배포마다 URL 해시 바뀜. 사용자에게 안정 주소 줘야 한다면 도메인 연결 또는 alias 필수.
3. **`vercel env add` 대화형 프롬프트**: 사용자 CMD 복붙 이슈 때문에 CLI로 env 추가보다는 Dashboard UI 권장.
4. **테스트 row 여러개**: `contact_submissions`에 curl 테스트 + SQL Editor 테스트 + 이메일 테스트 등 다수 row 누적. 실서비스 시작 전에 정리 권장.
5. **Resend 일일 한도**: 무료 100통/일. 문의 폭주 시 유료 전환 검토.
6. **SITE_URL 하드코딩**: `api/contact.js` (이메일 푸터 링크) + `_workspace/inject-seo.js` (SEO canonical/OG)에 임시 URL `https://itcl.kr` 하드코딩됨. 실제 도메인 결정 후 반드시 업데이트 + SEO 재주입.
7. **호스팅.kr 포워딩**: `itcl.kr → litt.ly/kimdukjin` 포워딩 현재 활성. 홈페이지 도메인 연결 시 비활성화 필요.
8. **OG 이미지 PNG 없음**: `assets/og-default.svg` 생성됨. 대부분의 SNS는 SVG 지원하지 않으므로 **PNG 변환 필요** (1200x630). Figma/Canva/온라인 변환기 사용.
9. **Vercel Hobby 12함수 한도**: 현재 3함수 사용. 신규 엔드포인트 추가 시 catch-all 패턴에 통합 권장.
10. **샘플 파트너 강사 데이터 placeholder**: schema-admin.sql에서 partners 섹션은 플레이스홀더 2개만 seed. 실제 16명 데이터는 관리자 UI에서 입력 필요.
11. **이미지 업로드 UI 부재**: 대표강사/파트너 사진은 URL 필드만 있음. Supabase Storage 연동은 미구현.

### 절대 하지 말 것
- Vercel dashboard에서 Deployment Protection 다시 켜기 (공개 접근 깨짐)
- `SUPABASE_SECRET_KEY`, `RESEND_API_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` 값을 코드/주석/Git에 남기기
- `ADMIN-CREDENTIALS.md` 파일을 Git에 커밋 (이미 `.gitignore`에 있음, 확인 필수)
- 레거시 JWT 키 복원 시도 (이 프로젝트엔 없음)
- 디자인 토큰 무시하고 HEX 하드코딩
- `.claude/` 상위 폴더(`C:/Users/kimdu/claude/.claude/`) 수정
- 호스팅.kr의 Google Workspace MX 레코드(aspmx.l.google.com 5개) 건드리기 → Gmail 수신 끊김
- 호스팅.kr의 기존 A 레코드 건드리기 → 포워딩 깨짐
- 기존 Supabase 테이블(contact_submissions/insights_posts/cases_posts) 구조 변경 — 프록시 API가 의존

---

## 9. 빠른 재개 명령

```bash
# 로컬 서버 (필요 시)
cd "C:/Users/kimdu/claude/itcl" && python -m http.server 8080

# Vercel 재배포
cd "C:/Users/kimdu/claude/itcl" && vercel --prod --yes

# Vercel 배포 상태
vercel ls itcl

# 현재 배포 URL curl 테스트 (한글 포함)
curl -s -X POST "https://itcl.vercel.app/api/contact" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary @"C:/Users/kimdu/claude/itcl/_workspace/test_payload.json"

# 관리자 로그인 (비밀번호는 ADMIN-CREDENTIALS.md 참조)
curl -s -X POST "<URL>/api/admin/login" \
  -H "Content-Type: application/json" \
  --data-binary '{"password":"<PW>"}' \
  -c cookie.txt

# 관리자 통계 (로그인 후)
curl -s "<URL>/api/admin/stats" -b cookie.txt

# 공개 콘텐츠
curl -s "<URL>/api/public/config"
curl -s "<URL>/api/public/insights"
curl -s "<URL>/api/public/cases"

# Supabase REST 읽기 (publishable key로)
curl -s "https://sxvhyrubjzqebmpeeqws.supabase.co/rest/v1/contact_submissions?select=id,created_at,topic,name&order=created_at.desc&limit=5" \
  -H "apikey: sb_publishable_cwEurYYO5tyCoyPto9xKxQ_cBhuAwO5"
# (SELECT는 RLS로 빈 배열 반환 예상 — 이 키로는 읽을 수 없음)

# 스크린 캡처 (사용자 화면 디버깅)
powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; \$bmp=New-Object System.Drawing.Bitmap 2560,1440; \$g=[System.Drawing.Graphics]::FromImage(\$bmp); \$g.CopyFromScreen(0,0,0,0,(New-Object System.Drawing.Size 2560,1440)); \$bmp.Save('C:\Users\kimdu\claude\itcl\_workspace\screen.png'); \$g.Dispose(); \$bmp.Dispose()"

# Windows 클립보드 읽기 (사용자가 뭔가 복사한 뒤 값 확인)
powershell -NoProfile -Command "Get-Clipboard"

# DNS 레코드 전파 확인
nslookup -type=TXT resend._domainkey.itcl.kr 8.8.8.8
nslookup -type=MX send.itcl.kr 8.8.8.8
```

---

## 10. 새 Claude 세션에서 이어받는 법

1. 이 `HANDOFF.md` 파일을 Read 툴로 읽는다.
2. 필요하면 `강의용-대화로그-20260419.txt`도 참고 (맥락 더 풍부)
3. 사용자가 지정한 작업 번호(2~6)부터 시작한다.
4. 사용자 요청 전 오케스트레이터 스킬 `itcl-dev-orchestrator` 사용 고려 — 다수 에이전트 협업이 필요한 작업이면 팀 구성.
5. CMD 복붙 이슈 대비 브라우저↔브라우저 경로 선호. 시크릿 값은 Vercel env var 권장.
6. 스크린샷이 필요하면 PowerShell 캡처 명령 위에서 언제든 사용 가능.

**끝.**
