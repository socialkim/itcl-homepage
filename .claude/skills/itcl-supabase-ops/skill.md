---
name: itcl-supabase-ops
description: ITCL 홈페이지의 Supabase 테이블, RLS 정책, Edge Function, 관리자 페이지, 클라이언트 fetch 어댑터를 설계·구현할 때 반드시 사용. anon key와 service_role key의 경계를 엄격히 지키는 규약과 기존 스키마 확장 패턴을 담고 있다. Supabase, 문의 폼, CMS 동적화, 관리자 페이지, RLS 요청 시 활성화.
---

# ITCL Supabase 운영 규약

## 1. 키 분리 원칙 (타협 불가)

2025년 말 Supabase가 API 키 체계를 **새 포맷**으로 개편했다. 레거시/신규 둘 다 호환되며 동일하게 작동.

| 용도 | 레거시 포맷 | 신규 포맷 | 위치 | 권한 |
|---|---|---|---|---|
| 공개용 | `anon` (`eyJhbGci...` JWT) | `sb_publishable_...` | `assets/supabase.js` (프론트 OK) | RLS로 제한된 최소 권한 |
| 슈퍼유저 | `service_role` (`eyJhbGci...`) | `sb_secret_...` | Edge Function / 서버만 | RLS 우회 (슈퍼유저) |

코드 변수명은 `SUPABASE_PUBLISHABLE_KEY`로 통일한다(구 `SUPABASE_ANON_KEY`에서 rename). 둘 다 authenticate 되는 role은 동일하게 `anon`이므로 기존 `to anon` RLS 정책과 호환된다.

**절대 금지**: `sb_secret_...` / `service_role`을 `pages/*.html`, `assets/*.js`, `index.html`, 또는 공개 Git 저장소에 넣기.

필요하면 Supabase Edge Function으로 감싸고 publishable 측에서는 Edge Function endpoint만 호출.

## 1-A. Supabase 대시보드에서 키 찾는 위치 (2026년 기준 UI)

⚠️ **구 위치**: Project Settings → API — **더 이상 이 경로 아님**

✅ **신 위치**:
1. 프로젝트 대시보드 우측 상단의 **`Connect`** 버튼 클릭
2. 탭에서 **App Frameworks** 또는 **Direct Access** 선택
3. 아래 두 값을 복사:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```
   프리픽스 `NEXT_PUBLIC_`은 Next.js 예시 포맷일 뿐. 값(`=` 뒤)만 사용한다.

4. **`sb_secret_...`** 탭이 같은 UI에 있음 — 절대 복사/공유하지 말 것.

## 1-B. `schema.sql` 실행 시 "destructive operations" 경고 대응

SQL Editor에서 schema.sql을 실행하면 `drop policy if exists ...` 구문 때문에 Supabase가 "destructive operations" 경고를 띄운다. 이는 **안전한 idempotent 가드**이므로 그대로 **"Run Destructive Query"** 버튼을 눌러 확정 실행해야 한다. 취소하면 `create policy` 구문들이 실행되지 않아 **RLS 정책이 누락된 채 테이블만 생성**되는 증상이 발생한다 (INSERT 시도 시 `42501 new row violates row-level security policy` 에러).

이 증상이 나오면 아래 최소 수정 스니펫만 재실행:
```sql
drop policy if exists "Allow anonymous insert" on public.contact_submissions;
create policy "Allow anonymous insert"
  on public.contact_submissions
  for insert to anon, authenticated
  with check (true);
```

## 2. 기존 스키마 (schema.sql)

```
contact_submissions    INSERT(anon) / SELECT·UPDATE·DELETE(service_role)
insights_posts         SELECT published=true (anon) / 쓰기 service_role
cases_posts            SELECT published=true (anon) / 쓰기 service_role
```

인덱스: `created_at desc`, `published_at desc where published=true`, `status`, `topic`, `category`, `industry`

## 3. 새 테이블 추가 템플릿

```sql
create table if not exists public.<table> (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- ...
);

create index if not exists <table>_<col>_idx
  on public.<table> (<col>);

alter table public.<table> enable row level security;

drop policy if exists "<name>" on public.<table>;
create policy "<name>"
  on public.<table>
  for <select|insert|update|delete>
  to <anon|authenticated>
  <using (...) | with check (...)>;
```

**기본 결정 트리**:
- 공개 읽기 전용 (블로그/사례): `for select to anon using (published = true)`
- 공개 쓰기 (폼): `for insert to anon with check (true)` + 서버 검증
- 인증 사용자 쓰기 (관리자): `for all to authenticated using (auth.uid() = owner_id)`
- 완전 비공개 (감사 로그): 정책 없음 → service_role만 접근 가능

## 4. 클라이언트 fetch 템플릿

```js
// SELECT
const res = await fetch(`${SUPABASE_URL}/rest/v1/insights_posts?published=eq.true&order=published_at.desc&limit=10`, {
  headers: {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  },
});
const rows = await res.json();

// INSERT
const res = await fetch(`${SUPABASE_URL}/rest/v1/contact_submissions`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Prefer: 'return=minimal',
  },
  body: JSON.stringify(data),
});
```

## 5. Dev 폴백 유지

`assets/supabase.js`의 기존 dev 폴백(키가 placeholder이면 console.warn하고 ok 반환)은 프론트 개발 편의를 위해 **절대 제거하지 않는다**.

## 6. 관리자 페이지 아키텍처

**올바른 패턴**:
1. `pages/admin/login.html` — Supabase Auth email/password 또는 magic link
2. 로그인 성공 후 JWT는 localStorage에 저장 (Supabase SDK가 처리)
3. 관리자 페이지는 authenticated 사용자로 RLS 정책을 통과하며 CRUD
4. service_role이 필요한 작업(예: 배치 삭제, 유저 관리)은 Edge Function 뒤에 두고 Edge Function 안에서만 service_role 사용

**틀린 패턴 (절대 금지)**:
- 프론트 JS에 service_role 직접 삽입
- "숨겨진 URL"로 관리자 페이지 보호하고 인증 스킵
- localStorage에 service_role 저장

## 7. CMS 동적 전환 체크리스트

정적 `POSTS = [...]` → Supabase 동적으로 바꿀 때:
- [ ] `insights_posts` 테이블에 데이터 마이그레이션
- [ ] 목록 페이지: fetch + 로딩/에러/빈 상태 UI
- [ ] 상세 페이지: `?slug=...` 파라미터 추출 후 `?slug=eq.xxx` 쿼리
- [ ] 404 처리: 결과 없을 때 "글을 찾을 수 없습니다" 표시
- [ ] SEO: 동적이지만 소셜 봇은 JS 실행 못 함 → Edge Function으로 서버 렌더 또는 prerender 서비스 고려

## 8. 스키마 변경 후 동작 확인

```bash
# 1. Supabase Dashboard SQL Editor에서 schema.sql 전체 재실행
# 2. 연동 페이지에서 실제 요청 테스트
# 3. anon으로 차단되어야 할 동작이 진짜 차단되는지 확인:
curl -X GET "$URL/rest/v1/contact_submissions" -H "apikey: $ANON_KEY"
# → [] 또는 403이어야 함 (SELECT 불가)
```
