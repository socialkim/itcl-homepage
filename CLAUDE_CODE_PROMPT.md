# ITCL 홈페이지 — Claude Code 인수인계 프롬프트

이 문서는 **Claude Code (개발 도구) 에게 이 프로젝트를 넘겨줄 때 붙여넣을 프롬프트 템플릿**입니다.
처음 Claude Code 를 열었을 때 그대로 복사해서 사용하세요.

---

## 🟢 인수인계 프롬프트 (복사해서 사용)

```
안녕하세요. ITCL(IT커뮤니케이션연구소) 공식 홈페이지 프로젝트입니다.
디자이너가 HTML/CSS/JS 로 먼저 만든 초안을 기반으로, 앞으로 운영·기능 개발을
함께 진행할 예정입니다. 먼저 아래 구조와 현황을 파악해주세요.

## 🗂 프로젝트 개요
- 정적 HTML + Supabase 구조의 기업 홈페이지
- 프론트엔드: 빌드 도구 없음, 순수 HTML/CSS/JS
- 백엔드: Supabase (문의 폼 저장용)
- 총 12개 페이지 (index 1 + pages/ 11)
- 공통 nav/footer 는 assets/layout.js 가 동적 주입
- 공통 스타일은 assets/styles.css 단일 파일

## 📂 꼭 먼저 읽어야 할 파일
1. README.md                    전체 구조·배포·Supabase 설정 가이드
2. assets/styles.css            디자인 시스템 토큰 (색상, 타이포, 간격)
3. assets/layout.js             공통 nav + footer + navItems 배열
4. assets/supabase.js           Supabase REST 어댑터 (키 삽입 필요)
5. schema.sql                   Supabase 테이블 + RLS 정책
6. index.html                   메인 페이지 (가장 많은 섹션 참고 가능)
7. pages/contact.html           Supabase 연동 예제
8. pages/insights.html + insights-detail.html  게시판 패턴
9. pages/cases.html + cases-detail.html         게시판 패턴 (stats 포함)

## 🎨 디자인 시스템 규칙 (반드시 지켜주세요)
- 색상은 :root 변수만 사용 — 하드코딩 금지
  · --accent (#635bff · 인디고) · primary
  · --accent-2 (#00d4b4 · 민트) · secondary
  · --accent-3 (#ff7d5c · 산호) · highlight
  · --ink / --ink-soft / --ink-mid / --muted · 텍스트
  · --bg / --bg-soft · 배경
  · --border / --border-2 · 테두리
- 타이포 스택: Inter + Pretendard(한글) + JetBrains Mono(숫자·라벨)
- container max-width 1280px / padding 40px
- 모든 전환 transition:all 0.15~0.25s
- hover 상태는 translateY(-2~4px) + border-color 변경 패턴

## 🧩 페이지 추가 시 체크리스트
1. 새 HTML 은 pages/ 아래 생성
2. <head> 에 동일한 fonts + styles.css 링크
3. <body> 최상단에:
   <script>window.ITCL_PAGE='새페이지id';window.ITCL_BASE='..';</script>
4. <body> 최하단에 <script src="../assets/layout.js"></script>
5. assets/layout.js 의 navItems 배열에 메뉴 추가 (원하면)
6. 페이지 고유 스타일은 <style> in-page — 공통 스타일은 styles.css 확장

## 🔌 Supabase 사용 규칙
- anon key 만 프론트에서 사용 (RLS 가 INSERT 만 허용)
- service_role key 는 절대 프론트에 넣지 말 것
- 새 테이블 만들 때 반드시 RLS enable + 명시적 policy 작성
- 관리자용 CRUD 가 필요하면 Supabase Edge Function 또는 별도 admin 페이지
  (service_role 키는 서버에서만 사용)

## 🧪 로컬 실행
  python3 -m http.server 8080
  # → http://localhost:8080

## ✅ 일반적인 첫 작업 예시
- "Supabase URL/Key 를 환경변수 방식으로 리팩터링해줘" → .env + 빌드 스텝 도입 필요 여부 논의
- "인사이트/사례를 Supabase 에서 fetch 하도록 동적화해줘" → insights_posts/cases_posts 테이블 활용
- "관리자 페이지 추가" → /admin/ 라우트 + Supabase Auth 로그인 + service_role 은 Edge Function 뒤로
- "반응형 개선" → 960px/768px/560px breakpoint 확인
- "SEO 메타 태그 추가" → Open Graph, Twitter Card, sitemap.xml
- "다국어(영문) 지원" → /en/ 디렉터리 + i18n 전략 논의
- "Google Analytics · 광고 픽셀" → index.html <head> 에 주입

## ❗ 하지 말아야 할 것
- 빌드 도구(Vite/Next 등) 를 임의로 도입하지 말 것 — 먼저 논의
- 색상·간격 하드코딩 금지 — 반드시 :root 변수 확장
- React/Vue 로의 대규모 전환 금지 — 현재 HTML 순수 구조가 유지보수 편의를 위한 선택
- service_role key 를 HTML 에 넣지 말 것
- 대표강사 프로필 사진이 아직 없는데, 임의로 AI 이미지·스톡 사진을 넣지 말고
  플레이스홀더 유지 (고객이 실제 사진 제공 예정)

## 🎯 첫 턴에 해주세요
1. README.md 를 읽고
2. pages/ 폴더 전체 파일명과 각 페이지 목적을 요약
3. assets/styles.css 의 :root 변수를 정리한 표
4. assets/layout.js 의 navItems 구조 파악
5. 궁금한 점 3~5개 질문

감사합니다!
```

---

## 📝 사용 팁

- Claude Code 를 열고 이 프로젝트 폴더에서 위 블록을 그대로 첫 메시지로 붙여넣으면, Claude Code 가 구조를 먼저 파악한 뒤 작업을 시작합니다.
- 팀원이 바뀔 때마다 이 프롬프트를 그대로 쓰면 됩니다.
- 새 기능을 자주 추가한다면 이 파일 맨 아래에 **변경 이력** 섹션을 덧붙이세요.

## 🔄 변경 이력

- **2026-04** 초기 12 페이지 + Supabase contact form + schema.sql 완성 · 디자이너 초안
