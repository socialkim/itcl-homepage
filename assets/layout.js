// ITCL shared nav + footer loader — include on every page.
// Set window.ITCL_PAGE = 'services' (etc.) BEFORE this script loads to mark the active nav link.
//
// Site-wide settings (company name, logo, tagline, phone, address, etc.) are fetched
// from /api/public/config once on page load and applied dynamically.

(function () {
  const base = (window.ITCL_BASE || '').replace(/\/$/, '');
  const page = window.ITCL_PAGE || 'home';
  const navItems = [
    { id: 'about',     label: '회사 소개',     href: `${base}/pages/about.html` },
    { id: 'services',  label: '서비스',        href: `${base}/pages/services.html` },
    { id: 'leaders',   label: '대표강사',      href: `${base}/pages/leaders.html` },
    { id: 'partners',  label: '강사진',        href: `${base}/pages/partners.html` },
    { id: 'programs',  label: '프로그램',      href: `${base}/pages/programs.html` },
    { id: 'insights',  label: '인사이트',      href: `${base}/pages/insights.html` },
    { id: 'cases',     label: '교육 사례',     href: `${base}/pages/cases.html` },
    { id: 'resources', label: '리소스',        href: `${base}/pages/resources.html` },
  ];
  const homeHref = `${base}/index.html`;
  const contactHref = `${base}/pages/contact.html`;

  // --- 기본 fallback 값 (DB 로딩 전, 혹은 DB 실패 시 사용) ---
  const DEFAULT = {
    company_short: 'ITCL',
    company_name_ko: 'IT커뮤니케이션연구소',
    company_name_en: 'IT Communication Lab',
    tagline: '사람과 AI의 연결을 만드는 전문 교육 파트너. IT커뮤니케이터 김덕진이 설립한, 생성형 AI 교육 전문 연구소입니다.',
    phone: '02-6953-3379',
    email: 'info@itcl.kr',
    address: '서울 마포구 월드컵로 190<br/>이안상암2 12층 1205호',
    biz_reg_no: '735-87-03405',
    logo_url: '',
    founded_year: '2026',
  };

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function buildLogoHtml(cfg) {
    if (cfg.logo_url) {
      return `<img src="${esc(cfg.logo_url)}" alt="${esc(cfg.company_short || 'ITCL')}" style="height:24px;width:auto;display:block;" />`;
    }
    return `<span class="logo-mark"></span>`;
  }

  function render(cfg) {
    // NAV
    const nav = document.createElement('nav');
    nav.className = 'top';
    nav.innerHTML = `
      <a href="${homeHref}" class="logo">
        ${buildLogoHtml(cfg)}
        ${cfg.logo_url ? '' : esc(cfg.company_short || 'ITCL')}
      </a>
      <ul class="nav-links" id="itclNavLinks">
        ${navItems.map(i => `<li><a href="${i.href}" ${i.id===page?'class="active"':''}>${i.label}</a></li>`).join('')}
      </ul>
      <div class="nav-right">
        <button class="nav-mobile" id="itclNavToggle" aria-label="메뉴">☰</button>
        <a href="${contactHref}" class="btn-pill-sm">강의 문의 →</a>
      </div>
    `;
    document.body.insertBefore(nav, document.body.firstChild);

    const tgl = document.getElementById('itclNavToggle');
    const links = document.getElementById('itclNavLinks');
    if (tgl) tgl.addEventListener('click', () => links.classList.toggle('open'));

    // FOOTER
    const year = new Date().getFullYear();
    const addressHtml = esc(cfg.address || '').replace(/,\s*/, ',<br/>');
    const footer = document.createElement('footer');
    footer.innerHTML = `
      <div class="footer-inner">
        <div class="footer-grid">
          <div class="footer-brand">
            <a href="${homeHref}" class="logo">${buildLogoHtml(cfg)}${cfg.logo_url ? '' : esc(cfg.company_short || 'ITCL')}</a>
            <p class="footer-tagline">${esc(cfg.tagline || '')}</p>
          </div>
          <div class="footer-col">
            <h5>Navigate</h5>
            <ul>
              <li><a href="${base}/pages/about.html">회사 소개</a></li>
              <li><a href="${base}/pages/services.html">핵심 서비스</a></li>
              <li><a href="${base}/pages/leaders.html">대표강사</a></li>
              <li><a href="${base}/pages/partners.html">교육 파트너</a></li>
              <li><a href="${base}/pages/programs.html">교육 프로그램</a></li>
              <li><a href="${base}/pages/process.html">의뢰 프로세스</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h5>Content</h5>
            <ul>
              <li><a href="${base}/pages/insights.html">인사이트</a></li>
              <li><a href="${base}/pages/cases.html">교육 사례</a></li>
              <li><a href="${base}/pages/resources.html">저서 · 미디어</a></li>
              <li><a href="${contactHref}">강의 문의</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h5>Contact</h5>
            <ul>
              <li><a href="mailto:${esc(cfg.email || 'info@itcl.kr')}">${esc(cfg.email || 'info@itcl.kr')}</a></li>
              <li><a href="tel:${esc((cfg.phone || '').replace(/[^0-9]/g, ''))}">${esc(cfg.phone || '')}</a></li>
              <li>${addressHtml}</li>
              <li>사업자등록 ${esc(cfg.biz_reg_no || '')}</li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>© ${year} ${esc(cfg.company_name_en || 'IT Communication Lab')}. All rights reserved.</span>
          <span>Designed with intention.</span>
        </div>
      </div>
    `;
    document.body.appendChild(footer);
  }

  // 기본 fallback으로 먼저 렌더 (fast paint)
  render(DEFAULT);

  // 백그라운드에서 DB 값 fetch 후 덮어쓰기
  fetch(`${base}/api/public/config`, { credentials: 'omit' })
    .then((r) => (r.ok ? r.json() : null))
    .then((cfg) => {
      if (!cfg || typeof cfg !== 'object') return;
      // 값이 있는 필드만 머지 (빈 값은 fallback 유지)
      const merged = { ...DEFAULT };
      for (const [k, v] of Object.entries(cfg)) {
        if (v) merged[k] = v;
      }
      // 기존 nav/footer 지우고 재렌더
      const oldNav = document.querySelector('nav.top');
      const oldFooter = document.querySelector('footer');
      if (oldNav) oldNav.remove();
      if (oldFooter) oldFooter.remove();
      render(merged);
    })
    .catch(() => { /* silent — fallback already rendered */ });
})();

// Toast helper (기존 API 보존)
window.ITCL_toast = function (msg, type) {
  const el = document.createElement('div');
  el.className = 'toast ' + (type || '');
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 3200);
};
