-- =====================================================================
-- ITCL · 관리자 페이지 / CMS 스키마 확장
-- 기존 schema.sql에 이어서 실행 (2026-04-20)
-- 실행 방법: Supabase SQL Editor → 전체 붙여넣기 → Run
-- =====================================================================

-- =====================================================================
-- 1. 사이트 설정 (키-값 쌍, 관리자가 편집하는 전역 설정)
-- =====================================================================
create table if not exists public.site_config (
  key          text primary key,
  value        text,
  label        text,                       -- 관리자 UI에 표시할 한국어 라벨
  description  text,                       -- 도움말
  type         text default 'text',        -- text | url | email | phone | textarea | image_url | html
  display_order int default 100,
  updated_at   timestamptz not null default now()
);

alter table public.site_config enable row level security;
-- 정책 없음 → anon 접근 불가. service_role은 RLS 우회.

-- 초기 설정 값 (기존 사이트의 하드코딩된 값들)
insert into public.site_config (key, value, label, description, type, display_order) values
  ('company_name_ko', 'IT커뮤니케이션연구소', '회사명 (한글)', '푸터·이메일·메타 태그에 노출', 'text', 10),
  ('company_name_en', 'IT Communication Lab', '회사명 (영문)', '영문 표기, 푸터 copyright 등', 'text', 20),
  ('company_short',  'ITCL', '회사 축약어', '로고 옆 브랜드명', 'text', 30),
  ('tagline',        '사람과 AI의 연결을 만드는 전문 교육 파트너', '태그라인', '푸터·메타 설명', 'textarea', 40),
  ('logo_url',       '', '로고 이미지 URL', '빈 값이면 기본 SVG 로고 사용. 이미지 URL 입력 시 해당 이미지로 대체', 'image_url', 50),
  ('phone',          '02-6953-3379', '대표 전화', '푸터·연락처', 'phone', 60),
  ('email',          'info@itcl.kr', '대표 이메일', '푸터·연락처', 'email', 70),
  ('address',        '서울 마포구 월드컵로 190, 이안상암2 12층 1205호', '주소', '푸터·연락처', 'textarea', 80),
  ('biz_reg_no',     '735-87-03405', '사업자등록번호', '', 'text', 90),
  ('site_url',       'https://itcl.kr', '사이트 URL', 'canonical, OG url, 이메일 푸터 링크', 'url', 100),
  ('sns_instagram',  '', 'Instagram URL', '', 'url', 110),
  ('sns_youtube',    '', 'YouTube URL', '', 'url', 120),
  ('sns_linkedin',   '', 'LinkedIn URL', '', 'url', 130),
  ('founded_year',   '2019', '설립 연도', '', 'text', 140)
on conflict (key) do nothing;


-- =====================================================================
-- 2. 관리자 이메일 (문의 알림 수신자 목록)
-- =====================================================================
create table if not exists public.admin_emails (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  label       text,                        -- "운영팀", "소장" 등 구분용 라벨
  is_active   boolean default true,
  display_order int default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.admin_emails enable row level security;
-- 정책 없음

-- 초기 데이터 (현재 하드코딩된 2개 이메일)
insert into public.admin_emails (email, label, display_order) values
  ('itcl_sns@itcl.kr', '운영팀 대표 (SNS)', 10),
  ('kimdukjin@itcl.kr', '김덕진 소장', 20)
on conflict (email) do nothing;


-- =====================================================================
-- 3. 페이지별 콘텐츠 (JSONB로 유연하게)
-- =====================================================================
create table if not exists public.page_sections (
  page_key    text primary key,           -- 'about', 'services', 'leaders', 'partners', 'programs', 'resources', 'home'
  content     jsonb not null default '{}',
  label       text,                       -- "회사 소개", "4대 서비스" 등
  updated_at  timestamptz not null default now()
);

alter table public.page_sections enable row level security;
-- 정책 없음 (관리자는 service_role, 공개는 별도 읽기 엔드포인트)

-- 초기 데이터: 각 페이지의 대표 필드만 (세부 구조는 관리자 UI에서 확장)
insert into public.page_sections (page_key, label, content) values
  ('home', '메인 페이지', '{
    "hero_kicker": "AI Education · Consulting · Broadcasting",
    "hero_title_html": "복잡한 기술을<br/>사람의 언어로 번역합니다",
    "hero_subtitle": "사람과 AI의 연결을 만드는 전문 교육 파트너. 대기업·공공기관 임원부터 실무자까지, 조직이 AI를 실제로 쓸 수 있게 만듭니다.",
    "primary_cta_text": "강의 문의하기",
    "primary_cta_href": "pages/contact.html",
    "secondary_cta_text": "서비스 살펴보기",
    "secondary_cta_href": "pages/services.html"
  }'::jsonb),
  ('about', '회사 소개', '{
    "hero_title": "기술의 속도와 사람의 언어 사이",
    "hero_subtitle": "IT커뮤니케이션연구소는 새로운 기술을 일반인·조직이 이해하고 실제로 활용할 수 있도록 돕는 전문 교육 파트너입니다.",
    "mission": "복잡한 기술을 누구나 이해할 수 있는 언어로 번역한다.",
    "vision": "모든 조직이 AI와 함께 더 나은 의사결정을 할 수 있는 시대를 만든다.",
    "values": [
      {"title": "정확성", "desc": "과장 없이 사실 기반으로"},
      {"title": "실용성", "desc": "이론보다 실전 활용에"},
      {"title": "지속성", "desc": "1회성 강의가 아닌 변화"}
    ],
    "stats": [
      {"value": "15+", "label": "년 경력"},
      {"value": "3,733", "label": "방송 출연 대본"},
      {"value": "500+", "label": "누적 교육 세션"}
    ]
  }'::jsonb),
  ('services', '4대 핵심 서비스', '{
    "hero_title": "조직의 AI 전환, 4가지 방향에서 돕습니다",
    "hero_subtitle": "강의부터 제작, 전략 자문까지. 조직이 필요한 깊이와 넓이에 맞춰 서비스를 조합합니다.",
    "services": [
      {
        "id": "education",
        "kicker": "01 / Education",
        "title": "기업 교육",
        "desc": "C-Level부터 실무자까지, 조직 맞춤형 AI 역량 강화 프로그램.",
        "features": ["조직 진단 기반 커리큘럼", "단발성 특강 ~ 장기 과정", "온/오프라인 블렌디드"]
      },
      {
        "id": "lecturer",
        "kicker": "02 / Lecturer",
        "title": "강사 섭외",
        "desc": "김덕진 소장 + 16명 전문 파트너 강사진. 주제·청중·규모에 맞춰 매칭.",
        "features": ["검증된 강사 풀", "주제별 전문성 매칭", "후기 기반 품질 관리"]
      },
      {
        "id": "consulting",
        "kicker": "03 / Consulting",
        "title": "AI 전략 컨설팅",
        "desc": "AI 도입 로드맵, 조직 변화 설계, 거버넌스 수립.",
        "features": ["AI 성숙도 진단", "도입 우선순위 설계", "실행 지원"]
      },
      {
        "id": "media",
        "kicker": "04 / Media",
        "title": "미디어 · 방송 출연",
        "desc": "KBS·MBC 등 15년 방송 경력. 기업 미디어 콘텐츠 자문·출연.",
        "features": ["방송·팟캐스트 출연", "사내 미디어 자문", "콘텐츠 기획"]
      }
    ]
  }'::jsonb),
  ('leaders', '대표강사', '{
    "hero_title": "기술의 번역자, 현장의 전문가",
    "hero_subtitle": "15년 방송·집필·강의로 검증된 실력과 시대를 읽는 통찰.",
    "leaders": [
      {
        "id": "kimdukjin",
        "name_ko": "김덕진",
        "name_en": "Kim Dukjin",
        "role": "소장 / 대표강사",
        "tagline": "기술의 번역자. AI 시대의 공용어를 만듭니다.",
        "bio": "KBS 세상의모든정보, MBC 손에잡히는경제 등 15년 방송 경력. AI 2024, AI 2025, AI 2026 저자. 대기업·공공기관 C-Level 대상 500회 이상 강의.",
        "photo_url": "",
        "specialties": ["생성형 AI", "AI 에이전트", "AI 거버넌스", "디지털 변환"]
      },
      {
        "id": "kimaram",
        "name_ko": "김아람",
        "name_en": "Kim Aram",
        "role": "대표강사",
        "tagline": "조직 변화를 설계하는 AI 전략 전문가.",
        "bio": "(소개 문구 편집 필요)",
        "photo_url": "",
        "specialties": ["AI 전략", "조직 변화", "리더십"]
      }
    ]
  }'::jsonb),
  ('partners', '파트너 강사진', '{
    "hero_title": "16명의 전문 파트너 강사진",
    "hero_subtitle": "주제·규모·청중에 맞춰 최적의 강사를 매칭합니다.",
    "partners": [
      {"name": "(강사 1)", "role": "전문 분야", "bio": ""},
      {"name": "(강사 2)", "role": "전문 분야", "bio": ""}
    ]
  }'::jsonb),
  ('programs', '교육 프로그램', '{
    "hero_title": "Flagship + 7 Short 프로그램",
    "hero_subtitle": "4시간 특강부터 6개월 장기 과정까지. 조직 상황에 맞춰.",
    "flagship": {
      "title": "AI 리더십 Flagship",
      "duration": "6개월",
      "audience": "C-Level, 임원",
      "desc": "전사 AI 전략 수립부터 실행까지 동반 설계"
    },
    "short_programs": [
      {"title": "AI 101 기초", "duration": "4시간", "audience": "전 직원"},
      {"title": "AI 에이전트 실무", "duration": "1일", "audience": "실무자"},
      {"title": "생성형 AI 도입", "duration": "2일", "audience": "리더"}
    ]
  }'::jsonb),
  ('resources', '리소스', '{
    "hero_title": "저서 · 미디어 · 강의 자료",
    "hero_subtitle": "15년간 축적된 AI 커뮤니케이션 지식 자산.",
    "books": [
      {"title": "AI 2024", "year": "2023", "publisher": "스마트북스", "link": ""},
      {"title": "AI 2025", "year": "2024", "publisher": "스마트북스", "link": ""},
      {"title": "AI 2026", "year": "2025", "publisher": "스마트북스", "link": ""}
    ],
    "media": [
      {"name": "KBS 세상의모든정보", "role": "고정 출연", "period": "2016~"},
      {"name": "MBC 손에잡히는경제", "role": "고정 출연", "period": "2018~"}
    ]
  }'::jsonb)
on conflict (page_key) do nothing;


-- =====================================================================
-- 4. 관리자 작업 로그 (감사 추적)
-- =====================================================================
create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  action      text not null,              -- 'login', 'update_config', 'create_post' 등
  entity      text,                       -- 'site_config', 'insights_posts' 등
  entity_id   text,                       -- key 또는 uuid
  changes     jsonb,                      -- diff 또는 payload
  ip_hint     text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists admin_audit_log_created_at_idx on public.admin_audit_log (created_at desc);
create index if not exists admin_audit_log_action_idx    on public.admin_audit_log (action);

alter table public.admin_audit_log enable row level security;
-- 정책 없음


-- =====================================================================
-- 5. updated_at 자동 갱신 트리거 (공용)
-- =====================================================================
drop trigger if exists set_updated_at on public.site_config;
create trigger set_updated_at
  before update on public.site_config
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.admin_emails;
create trigger set_updated_at
  before update on public.admin_emails
  for each row execute function public.handle_updated_at();

drop trigger if exists set_updated_at on public.page_sections;
create trigger set_updated_at
  before update on public.page_sections
  for each row execute function public.handle_updated_at();


-- =====================================================================
-- 완료. 다음 단계는 덕진님이 관리자 페이지에서 진행:
--  /pages/admin 로 로그인 → 각 탭에서 콘텐츠 편집
-- =====================================================================
