---
name: itcl-page-build
description: ITCL 홈페이지에 새 HTML 페이지를 추가하거나 기존 페이지를 수정할 때 반드시 사용. 디자인 토큰(:root 변수) 확장, nav/footer 자동 주입 규약, 반응형 브레이크포인트, 섹션 관용구를 모두 담은 빌더. 페이지 생성, 페이지 수정, 반응형 개선, 스타일 확장 요청 시 활성화.
---

# ITCL 페이지 빌더

ITCL 홈페이지(`C:/Users/kimdu/claude/itcl/`)의 페이지를 만들 때 따르는 규약.

## 1. 새 페이지 스켈레톤 (반드시 복사)

```html
<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>페이지 제목 · ITCL</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css" rel="stylesheet" />
  <link rel="stylesheet" href="../assets/styles.css" />
  <!-- seo 에이전트가 주입할 메타 블록 영역 -->
</head>
<body>
  <script>window.ITCL_PAGE='<페이지id>';window.ITCL_BASE='..';</script>

  <section class="page-hero">
    <div class="mesh"></div>
    <div class="page-hero-inner">
      <div class="crumb"><a href="../index.html">Home</a><span class="sep">/</span><span>페이지명</span></div>
      <h1 class="page-title">헤드라인 <span class="grad">강조</span></h1>
      <p class="page-lead">리드 문장 1~2줄.</p>
    </div>
  </section>

  <section class="sec">
    <div class="container">
      <!-- 섹션 본문 -->
    </div>
  </section>

  <script src="../assets/layout.js"></script>
</body>
</html>
```

**체크**: `window.ITCL_PAGE`는 `assets/layout.js`의 `navItems[].id` 중 하나 또는 새 id. nav 메뉴에 노출하려면 `navItems` 배열에 추가.

## 2. 사용 가능한 디자인 토큰

색상 (assets/styles.css:2-9):
- 텍스트: `--ink` / `--ink-soft` / `--ink-mid` / `--muted` / `--muted-2`
- 배경: `--bg` / `--bg-soft` / `--bg-softer`
- 테두리: `--border` / `--border-2`
- 강조: `--accent`(#635bff) / `--accent-deep` / `--accent-2`(#00d4b4 민트) / `--accent-3`(#ff7d5c 산호) / `--yellow` / `--success`

타이포: Inter + Pretendard(한글) + JetBrains Mono(숫자/라벨·`mono` 클래스)

## 3. 재사용 가능한 공통 클래스

- `.container` — max-width 1280px, padding 0 40px (반응형 20px)
- `.sec` — 섹션 패딩 100px 40px (반응형 72px 20px)
- `.sec-kicker` / `.sec-title` / `.sec-lead` — 섹션 헤더 세트
- `.pill` / `.pill-tag` — 상단 배지
- `.btn-primary` / `.btn-outline` / `.btn-pill-sm` / `.view-all` / `.chip`
- `.grid-2` / `.grid-3` — 반응형 그리드
- `.grad` — 그라디언트 텍스트
- `.mesh` / `.mesh-grid` — 히어로 배경 장식

**원칙**: 새 스타일은 먼저 공통 클래스 조합으로 시도 → 부족하면 in-page `<style>`에서 확장 → 반복 재사용 패턴은 `styles.css`로 승격.

## 4. 반응형 규칙

```css
@media (max-width:960px) { /* nav 모바일 토글 */ }
@media (max-width:900px) { /* 섹션 패딩 축소 */ }
@media (max-width:768px) { /* 2열 → 1열 */ }
@media (max-width:560px) { /* 3열 → 1열, footer 1열 */ }
```

## 5. 인터랙션 관용구

```css
.card {
  transition: all 0.2s;
  border: 1px solid var(--border);
}
.card:hover {
  transform: translateY(-3px);
  border-color: var(--ink);
}
```

## 6. 빌드 전 체크리스트

- [ ] 하드코딩 HEX 없음 (`grep -nE '#[0-9a-fA-F]{3,6}' 새파일` → :root 블록 외 0건)
- [ ] `window.ITCL_PAGE` / `window.ITCL_BASE` 설정
- [ ] layout.js 스크립트 태그 body 끝
- [ ] 모든 `<img>`에 alt, width, height
- [ ] nav 메뉴 노출 시 `navItems` 배열 업데이트
- [ ] 4개 브레이크포인트에서 테스트

## 금지 사항

- Vite/Webpack/Next/Tailwind 등 빌드 도구 도입
- 외부 CSS 프레임워크(Bootstrap, Tailwind CDN) 추가
- 대표강사·파트너에 AI 이미지/스톡 사진 삽입 (플레이스홀더 유지)
- React/Vue/Svelte 도입

## 로컬 실행

```bash
cd C:/Users/kimdu/claude/itcl
python3 -m http.server 8080
# → http://localhost:8080
```
