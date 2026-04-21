---
name: itcl-seo-pack
description: ITCL 홈페이지 페이지에 SEO·AIEO 메타 패키지(title, description, OG, Twitter Card, JSON-LD, canonical, sitemap, robots.txt)를 생성·주입할 때 반드시 사용. 페이지 추가 후 메타 삽입, sitemap 갱신, JSON-LD 구조화 데이터, AI 엔진 최적화 요청 시 활성화.
---

# ITCL SEO & AIEO 패키지

## 1. 페이지별 메타 블록 템플릿

각 페이지 `<head>`에 삽입 (seo 에이전트가 frontend에 diff로 전달):

```html
<!-- Primary Meta -->
<title>페이지 제목 · ITCL IT커뮤니케이션연구소</title>
<meta name="description" content="130~160자의 페이지 요약. 주요 키워드 자연스럽게 포함." />
<link rel="canonical" href="https://itcl.kr/pages/<slug>.html" />

<!-- Open Graph -->
<meta property="og:type" content="website" /> <!-- article | website -->
<meta property="og:site_name" content="ITCL" />
<meta property="og:title" content="페이지 제목" />
<meta property="og:description" content="한 줄 요약" />
<meta property="og:url" content="https://itcl.kr/pages/<slug>.html" />
<meta property="og:image" content="https://itcl.kr/assets/og/<slug>.png" />
<meta property="og:locale" content="ko_KR" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="페이지 제목" />
<meta name="twitter:description" content="한 줄 요약" />
<meta name="twitter:image" content="https://itcl.kr/assets/og/<slug>.png" />

<!-- JSON-LD: 페이지 유형별 삽입 (아래 2번 참조) -->
<script type="application/ld+json">{...}</script>
```

## 2. JSON-LD 스니펫 (페이지 유형별)

### index.html (Organization + EducationalOrganization)
```json
{
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  "name": "IT커뮤니케이션연구소",
  "alternateName": "ITCL",
  "url": "https://itcl.kr/",
  "logo": "https://itcl.kr/assets/logo.png",
  "description": "생성형 AI 교육 전문 연구소",
  "founder": {"@type": "Person", "name": "김덕진"},
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "월드컵로 190, 이안상암2 12층 1205호",
    "addressLocality": "마포구",
    "addressRegion": "서울",
    "addressCountry": "KR"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+82-2-6953-3379",
    "contactType": "customer service",
    "email": "info@itcl.kr",
    "availableLanguage": ["Korean"]
  }
}
```

### leaders.html (Person - 김덕진)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "김덕진",
  "alternateName": "Kim Dukjin",
  "jobTitle": "IT커뮤니케이션연구소 소장",
  "worksFor": {"@type": "Organization", "name": "IT커뮤니케이션연구소"},
  "description": "기술의 번역자. AI 교육·방송·집필 15년.",
  "sameAs": []
}
```

### insights-detail.html (Article)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "<title>",
  "description": "<excerpt>",
  "author": {"@type": "Person", "name": "김덕진"},
  "publisher": {"@type": "Organization", "name": "ITCL"},
  "datePublished": "<published_at>",
  "image": "https://itcl.kr/assets/og/<slug>.png"
}
```

### programs.html (Course 목록)
각 프로그램마다 Course 객체 배열.

### services.html (Service)
4대 서비스 각각 Service 객체.

## 3. sitemap.xml (루트)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://itcl.kr/</loc><lastmod>2026-04-19</lastmod><priority>1.0</priority></url>
  <url><loc>https://itcl.kr/pages/about.html</loc><lastmod>2026-04-19</lastmod><priority>0.8</priority></url>
  <!-- 12 페이지 전부 나열 -->
</urlset>
```

## 4. robots.txt (루트)

```
User-agent: *
Allow: /
Disallow: /pages/admin/

Sitemap: https://itcl.kr/sitemap.xml
```

## 5. AIEO (AI Engine Optimization) 보강

AI 엔진(ChatGPT, Claude, Perplexity)이 인용·답변하기 좋은 구조:

1. **첫 문단 요약형 리드** — 페이지 목적·타겟·핵심 주장을 3문장 안에
2. **FAQPage JSON-LD** (contact, services 페이지에 특히 유용)
3. **Author/Organization 신뢰 신호** — 저서·방송·수상 명시
4. **명시적 Q→A 구조** — h2에 "왜 ITCL인가?" 같은 질문, 그 아래 답
5. **수치·연도·고유명사** 풍부하게

### FAQPage 예시
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "ITCL 교육은 어떤 규모부터 신청 가능한가요?",
      "acceptedAnswer": {"@type": "Answer", "text": "20명 이하 소규모부터 전사 대상까지…"}
    }
  ]
}
```

## 6. 이미지 규격

- og:image: **1200x630px**, 2MB 이하, PNG/JPG
- 모든 `<img>`: `alt`, `width`, `height`, `loading="lazy"` (LCP 예외)
- og 이미지 파일 경로: `assets/og/<slug>.png` (실물 없으면 공통 기본 이미지)

## 7. 검증

- Google Rich Results Test: https://search.google.com/test/rich-results
- Twitter Card Validator
- OG Debugger (Facebook)
- Lighthouse SEO 점수 (로컬에서 `npx lighthouse http://localhost:8080 --view`)

## 8. 체크리스트 (페이지 1개 기준)

- [ ] title 50~60자
- [ ] description 130~160자, 중복 X
- [ ] canonical 절대 URL
- [ ] og: 4종(title/description/image/url)
- [ ] twitter: card + 3종
- [ ] JSON-LD 페이지 유형 맞게 1개 이상
- [ ] sitemap.xml에 URL + lastmod 업데이트
