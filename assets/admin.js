// ITCL Admin · 공통 클라이언트 헬퍼
// - 세션 체크 (비인증 시 /pages/admin 로 리다이렉트)
// - API 호출 래퍼 (401이면 로그인 페이지로)
// - 사이드바 렌더링
// - 토스트 알림

(function () {
  // 절대경로 사용 — clean URL 환경에서 상대경로 resolution이 깨지는 문제 회피
  const ADMIN_BASE = '/pages/admin';
  const API_BASE = '/api/admin';

  // 사이드바 항목 정의
  const NAV = [
    { section: '대시보드' },
    { id: 'dashboard', label: '홈', href: `${ADMIN_BASE}/dashboard.html`, ico: '◎' },

    { section: '콘텐츠 관리' },
    { id: 'home',      label: '메인 페이지',  href: `${ADMIN_BASE}/section.html?page=home`,     ico: '◉' },
    { id: 'clients',   label: '클라이언트 기업', href: `${ADMIN_BASE}/clients.html`,             ico: '◉' },
    { id: 'about',     label: '회사 소개',    href: `${ADMIN_BASE}/section.html?page=about`,    ico: '◉' },
    { id: 'services',  label: '4대 서비스',   href: `${ADMIN_BASE}/section.html?page=services`, ico: '◉' },
    { id: 'leaders',   label: '대표강사',     href: `${ADMIN_BASE}/section.html?page=leaders`,  ico: '◉' },
    { id: 'partners',  label: '파트너 강사',  href: `${ADMIN_BASE}/section.html?page=partners`, ico: '◉' },
    { id: 'programs',  label: '교육 프로그램', href: `${ADMIN_BASE}/section.html?page=programs`, ico: '◉' },
    { id: 'resources', label: '리소스',       href: `${ADMIN_BASE}/section.html?page=resources`,ico: '◉' },

    { section: '게시물' },
    { id: 'insights',    label: '인사이트 칼럼', href: `${ADMIN_BASE}/insights.html`,    ico: '✎' },
    { id: 'cases',       label: '교육 사례',    href: `${ADMIN_BASE}/cases.html`,       ico: '✎' },

    { section: '운영' },
    { id: 'submissions', label: '문의 관리',    href: `${ADMIN_BASE}/submissions.html`, ico: '✉' },
    { id: 'emails',      label: '관리자 이메일', href: `${ADMIN_BASE}/emails.html`,      ico: '@' },
    { id: 'settings',    label: '사이트 설정',   href: `${ADMIN_BASE}/settings.html`,    ico: '⚙' },
    { id: 'domain',      label: '도메인·배포',  href: `${ADMIN_BASE}/domain.html`,       ico: '⚐' },
  ];

  // 사이드바 삽입
  window.ITCL_renderShell = function (activeId) {
    const sidebar = document.createElement('aside');
    sidebar.className = 'admin-sidebar';
    sidebar.innerHTML = `
      <div class="brand">
        <span class="logo-mark"></span>
        ITCL 관리자
      </div>
      <nav>
        ${NAV.map((it) => {
          if (it.section) return `<div class="section-label">${it.section}</div>`;
          return `<a href="${it.href}" class="${it.id === activeId ? 'active' : ''}"><span class="ico">${it.ico || '·'}</span>${it.label}</a>`;
        }).join('')}
      </nav>
      <div class="sidebar-footer">
        <button class="logout-btn" id="itclLogoutBtn">로그아웃 →</button>
      </div>
    `;
    document.body.classList.add('admin');
    document.body.insertBefore(sidebar, document.body.firstChild);

    const shell = document.createElement('div');
    shell.className = 'admin-shell';
    document.body.appendChild(shell);
    // main은 페이지가 직접 넣음. 사이드바는 shell의 동기지만 fixed position이라 main만 margin-left로 해결

    document.getElementById('itclLogoutBtn').addEventListener('click', async () => {
      await fetch(`${API_BASE}/logout`, { method: 'POST' });
      location.href = `${ADMIN_BASE}/`;
    });
  };

  // 토스트
  window.ITCL_toast = function (msg, kind = '') {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = `toast ${kind}`;
    t.textContent = msg;
    wrap.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      setTimeout(() => t.remove(), 300);
    }, 3200);
  };

  // API 래퍼
  window.ITCL_api = async function (path, { method = 'GET', body, query } = {}) {
    const url = new URL(path, location.origin);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      }
    }
    const opts = {
      method,
      headers: {},
      credentials: 'same-origin',
    };
    if (body !== undefined) {
      opts.headers['Content-Type'] = 'application/json; charset=utf-8';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url.pathname + url.search, opts);
    if (res.status === 401) {
      location.href = `${ADMIN_BASE}/`;
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  };

  // 세션 체크
  window.ITCL_checkSession = async function () {
    try {
      const res = await fetch(`${API_BASE}/session`, { credentials: 'same-origin' });
      const data = await res.json();
      if (!data.authenticated) {
        location.href = `${ADMIN_BASE}/`;
        return false;
      }
      return true;
    } catch {
      location.href = `${ADMIN_BASE}/`;
      return false;
    }
  };

  // HTML escape 헬퍼 (목록 렌더링용)
  window.ITCL_esc = function (s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  // KST timestamp formatting
  window.ITCL_fmtDate = function (iso) {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return iso;
    }
  };
})();
