-- =====================================================================
-- ITCL · IT커뮤니케이션연구소 홈페이지
-- Supabase Schema (PostgreSQL)
-- =====================================================================
-- 실행 방법:
-- 1. Supabase Dashboard → SQL Editor 로 이동
-- 2. 이 파일 전체를 복사해 붙여넣기 후 "Run"
-- 3. 실행 후 Project Settings → API 에서 URL과 anon key를 복사해
--    assets/supabase.js 의 placeholder 값을 대체
-- =====================================================================

-- 1. 문의하기 테이블 (Contact Form 제출 저장)
-- ---------------------------------------------------------------------
create table if not exists public.contact_submissions (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  submitted_at timestamptz,
  topic        text not null,              -- 교육 의뢰 / 강사 섭외 / 컨설팅 / 미디어·방송 / 파트너십 / 기타
  name         text not null,              -- 담당자 이름
  company      text not null,              -- 소속·회사
  email        text not null,
  phone        text,
  audience     text,                       -- C-Level / 리더 / 실무자 / 전 직원 / 기타
  headcount    text,                       -- 20명 이하 / 20~50명 / 50~100명 / 100명 이상
  message      text not null,              -- 문의 내용 (필수)
  status       text not null default 'new',-- new / in_progress / resolved / archived
  assigned_to  text,                       -- 담당자 (운영용)
  note         text,                       -- 내부 메모 (운영용)
  ip_hint      text,                       -- 선택: Edge Function 으로 채울 경우
  constraint contact_submissions_email_format check (email like '%@%.%'),
  constraint contact_submissions_status_check check (status in ('new','in_progress','resolved','archived'))
);

create index if not exists contact_submissions_created_at_idx
  on public.contact_submissions (created_at desc);
create index if not exists contact_submissions_status_idx
  on public.contact_submissions (status);
create index if not exists contact_submissions_topic_idx
  on public.contact_submissions (topic);

-- 2. Row Level Security (RLS)
-- ---------------------------------------------------------------------
-- anon key 로는 INSERT 만 허용. SELECT/UPDATE/DELETE 는 service_role(서버)에서만.
alter table public.contact_submissions enable row level security;

-- 혹시 기존에 같은 이름 정책이 있으면 삭제
drop policy if exists "Allow anonymous insert" on public.contact_submissions;
drop policy if exists "No anonymous select"    on public.contact_submissions;

create policy "Allow anonymous insert"
  on public.contact_submissions
  for insert
  to anon, authenticated
  with check (true);

-- (참고) service_role 은 기본적으로 RLS 를 우회하므로, 관리자 페이지/백오피스는
-- service_role key 로 서버에서 호출하거나 Supabase Dashboard → Table Editor 에서 확인.

-- =====================================================================
-- 3. (선택) 게시판 — Insights 칼럼용 테이블
--    현재는 정적 데이터로 렌더링되지만, 운영 CMS 가 필요해지면 사용
-- =====================================================================
create table if not exists public.insights_posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  category    text not null,              -- trend / tool / case / strategy / research
  title       text not null,
  excerpt     text,
  body_md     text,                       -- Markdown 본문
  author_name text not null,
  author_init text,                       -- 아바타 이니셜 (예: 'KD')
  read_min    int default 5,
  featured    boolean default false,
  published   boolean default false,
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists insights_posts_published_at_idx
  on public.insights_posts (published_at desc) where published = true;
create index if not exists insights_posts_category_idx
  on public.insights_posts (category);

alter table public.insights_posts enable row level security;

drop policy if exists "Public read published posts" on public.insights_posts;
create policy "Public read published posts"
  on public.insights_posts
  for select
  to anon, authenticated
  using (published = true);

-- =====================================================================
-- 4. (선택) 게시판 — Cases 교육 사례용 테이블
-- =====================================================================
create table if not exists public.cases_posts (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  client      text not null,
  industry    text not null,              -- 대기업 / 금융 / 공공 / 제조 / 교육 ...
  title       text not null,
  excerpt     text,
  challenge   text,
  approach    text,
  result      text,
  quote_body  text,
  quote_author text,
  stats       jsonb,                      -- [{v:'96%', l:'만족도'}, ...]
  tags        text[],
  published   boolean default false,
  published_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists cases_posts_published_at_idx
  on public.cases_posts (published_at desc) where published = true;
create index if not exists cases_posts_industry_idx
  on public.cases_posts (industry);

alter table public.cases_posts enable row level security;

drop policy if exists "Public read published cases" on public.cases_posts;
create policy "Public read published cases"
  on public.cases_posts
  for select
  to anon, authenticated
  using (published = true);

-- =====================================================================
-- 5. (선택) updated_at 자동 갱신 트리거
-- =====================================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.insights_posts;
create trigger set_updated_at
  before update on public.insights_posts
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.cases_posts;
create trigger set_updated_at
  before update on public.cases_posts
  for each row execute function public.handle_updated_at();

-- =====================================================================
-- 완료.
-- 다음 단계:
--   1) Project Settings → API 에서 URL + anon key 복사
--   2) assets/supabase.js 의 SUPABASE_URL, SUPABASE_ANON_KEY 교체
--   3) pages/contact.html 에서 폼 제출 테스트
--   4) Table Editor → contact_submissions 에서 데이터 확인
-- =====================================================================
