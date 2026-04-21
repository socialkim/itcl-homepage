// ITCL · 관리자 API 통합 핸들러 (Vercel catch-all 라우트)
// /api/admin/* 모든 요청을 이 파일에서 경로별로 분기.
//
// 구조: req.query.path = ['login'] 또는 ['insights'] 등 경로 세그먼트 배열.
//
// 엔드포인트:
//   POST /api/admin/login
//   POST /api/admin/logout
//   GET  /api/admin/session
//   GET/PUT    /api/admin/config
//   GET/POST/PUT/DELETE /api/admin/emails
//   GET/PUT    /api/admin/sections
//   GET/POST/PUT/DELETE /api/admin/insights
//   GET/POST/PUT/DELETE /api/admin/cases
//   GET/PATCH/DELETE    /api/admin/submissions
//   GET  /api/admin/stats

import crypto from 'node:crypto';
import {
  createSession, setSessionCookie, clearSessionCookie,
  parseCookies, verifySession, comparePassword,
} from '../../lib/admin-session.js';
import {
  sbSelect, sbInsert, sbUpdate, sbUpsert, sbDelete,
} from '../../lib/supabase-rest.js';

function requireAuth(req, res) {
  const cookies = parseCookies(req);
  const session = verifySession(cookies.itcl_admin);
  if (!session) {
    res.status(401).json({ error: '인증이 필요합니다.' });
    return null;
  }
  return session;
}

function isEmail(s) {
  return typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

function slugify(s, prefix = 'post') {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w가-힣\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || `${prefix}-${Date.now()}`;
}

export default async function handler(req, res) {
  // URL 파싱으로 리소스 추출 (Vercel catch-all의 req.query.path가 불안정한 경우 대비)
  let resource = '';
  try {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const parts = u.pathname.split('/').filter(Boolean); // ['api','admin','login'] 등
    const idx = parts.indexOf('admin');
    if (idx >= 0 && parts[idx + 1]) resource = parts[idx + 1];
  } catch {}
  if (!resource) {
    const segs = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);
    resource = segs[0] || '';
  }

  try {
    switch (resource) {
      // --- 인증 관련 (세션 없이 호출 가능) ---
      case 'login':        return await handleLogin(req, res);
      case 'logout':       return await handleLogout(req, res);
      case 'session':      return await handleSession(req, res);

      // --- 인증 필요 ---
      case 'config':       { if (!requireAuth(req, res)) return; return await handleConfig(req, res); }
      case 'emails':       { if (!requireAuth(req, res)) return; return await handleEmails(req, res); }
      case 'sections':     { if (!requireAuth(req, res)) return; return await handleSections(req, res); }
      case 'insights':     { if (!requireAuth(req, res)) return; return await handleInsights(req, res); }
      case 'cases':        { if (!requireAuth(req, res)) return; return await handleCases(req, res); }
      case 'submissions':  { if (!requireAuth(req, res)) return; return await handleSubmissions(req, res); }
      case 'stats':        { if (!requireAuth(req, res)) return; return await handleStats(req, res); }
      case 'upload':       { if (!requireAuth(req, res)) return; return await handleUpload(req, res); }

      default:
        return res.status(404).json({ error: `unknown resource: ${resource}` });
    }
  } catch (err) {
    console.error(`[admin/${resource}] error:`, err);
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
}

// ============================================================
// LOGIN / LOGOUT / SESSION
// ============================================================
async function handleLogin(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const password = (req.body?.password || '').trim();
  const expected = (process.env.ADMIN_PASSWORD || '').trim();
  if (!expected) return res.status(500).json({ error: '서버 설정 오류' });
  if (!password || !comparePassword(password, expected)) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
    return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
  }
  setSessionCookie(res, createSession());
  return res.status(200).json({ ok: true });
}

async function handleLogout(req, res) {
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}

async function handleSession(req, res) {
  const cookies = parseCookies(req);
  const session = verifySession(cookies.itcl_admin);
  if (!session) return res.status(200).json({ authenticated: false });
  return res.status(200).json({ authenticated: true, expiresAt: session.exp });
}

// ============================================================
// SITE CONFIG
// ============================================================
async function handleConfig(req, res) {
  if (req.method === 'GET') {
    const rows = await sbSelect('site_config', {
      order: 'display_order.asc',
      select: 'key,value,label,description,type,display_order,updated_at',
    });
    return res.status(200).json({ items: rows });
  }
  if (req.method === 'PUT') {
    const body = req.body || {};
    const items = Array.isArray(body.items) ? body.items : null;
    if (!items) return res.status(400).json({ error: 'items 배열이 필요합니다.' });
    const payload = items
      .filter((i) => i && typeof i.key === 'string')
      .map((i) => ({ key: i.key, value: String(i.value ?? '') }));
    if (!payload.length) return res.status(400).json({ error: '업데이트할 항목이 없습니다.' });
    const result = await sbUpsert('site_config', payload, { onConflict: 'key' });
    return res.status(200).json({ ok: true, updated: result.length });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================
// ADMIN EMAILS
// ============================================================
async function handleEmails(req, res) {
  const { id } = req.query || {};

  if (req.method === 'GET') {
    const rows = await sbSelect('admin_emails', { order: 'display_order.asc' });
    return res.status(200).json({ items: rows });
  }
  if (req.method === 'POST') {
    const { email, label, display_order, is_active } = req.body || {};
    if (!isEmail(email)) return res.status(400).json({ error: '유효한 이메일이 아닙니다.' });
    const created = await sbInsert('admin_emails', {
      email: email.trim().toLowerCase(),
      label: label || null,
      display_order: display_order ?? 100,
      is_active: is_active ?? true,
    });
    return res.status(201).json({ item: created[0] });
  }
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    const { email, label, display_order, is_active } = req.body || {};
    const updates = {};
    if (email !== undefined) {
      if (!isEmail(email)) return res.status(400).json({ error: '유효한 이메일이 아닙니다.' });
      updates.email = email.trim().toLowerCase();
    }
    if (label !== undefined) updates.label = label;
    if (display_order !== undefined) updates.display_order = display_order;
    if (is_active !== undefined) updates.is_active = is_active;
    const result = await sbUpdate('admin_emails', `id=eq.${id}`, updates);
    return res.status(200).json({ item: result[0] });
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    await sbDelete('admin_emails', `id=eq.${id}`);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================
// PAGE SECTIONS (CMS)
// ============================================================
async function handleSections(req, res) {
  const { page } = req.query || {};

  if (req.method === 'GET') {
    if (page) {
      const rows = await sbSelect('page_sections', { filter: `page_key=eq.${page}` });
      if (!rows.length) return res.status(404).json({ error: '해당 페이지가 없습니다.' });
      return res.status(200).json({ item: rows[0] });
    }
    const rows = await sbSelect('page_sections', {
      select: 'page_key,label,updated_at',
      order: 'page_key.asc',
    });
    return res.status(200).json({ items: rows });
  }
  if (req.method === 'PUT') {
    if (!page) return res.status(400).json({ error: 'page 쿼리 파라미터가 필요합니다.' });
    const { content, label } = req.body || {};
    if (!content || typeof content !== 'object') return res.status(400).json({ error: 'content는 객체여야 합니다.' });
    const row = { page_key: page, content };
    if (label !== undefined) row.label = label;
    const result = await sbUpsert('page_sections', row, { onConflict: 'page_key' });
    return res.status(200).json({ item: result[0] });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================
// INSIGHTS POSTS
// ============================================================
async function handleInsights(req, res) {
  const { id, slug } = req.query || {};

  if (req.method === 'GET') {
    if (id) {
      const rows = await sbSelect('insights_posts', { filter: `id=eq.${id}` });
      if (!rows.length) return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
      return res.status(200).json({ item: rows[0] });
    }
    if (slug) {
      const rows = await sbSelect('insights_posts', { filter: `slug=eq.${slug}` });
      if (!rows.length) return res.status(404).json({ error: '게시물을 찾을 수 없습니다.' });
      return res.status(200).json({ item: rows[0] });
    }
    const rows = await sbSelect('insights_posts', {
      order: 'published_at.desc.nullslast,created_at.desc',
    });
    return res.status(200).json({ items: rows });
  }
  if (req.method === 'POST') {
    const d = req.body || {};
    if (!d.title) return res.status(400).json({ error: 'title은 필수입니다.' });
    const row = {
      slug: d.slug?.trim() || slugify(d.title, 'post'),
      category: d.category || 'trend',
      title: d.title,
      excerpt: d.excerpt || null,
      body_md: d.body_md || '',
      author_name: d.author_name || '김덕진',
      author_init: d.author_init || 'KD',
      read_min: d.read_min ?? 5,
      featured: d.featured ?? false,
      published: d.published ?? false,
      published_at: d.published ? (d.published_at || new Date().toISOString()) : null,
    };
    const created = await sbInsert('insights_posts', row);
    return res.status(201).json({ item: created[0] });
  }
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    const d = req.body || {};
    const updates = {};
    const allowed = ['slug','category','title','excerpt','body_md','author_name','author_init','read_min','featured','published','published_at'];
    for (const k of allowed) if (d[k] !== undefined) updates[k] = d[k];
    if (updates.published === true && !updates.published_at) {
      const existing = await sbSelect('insights_posts', { filter: `id=eq.${id}` });
      if (existing.length && !existing[0].published_at) updates.published_at = new Date().toISOString();
    }
    const result = await sbUpdate('insights_posts', `id=eq.${id}`, updates);
    return res.status(200).json({ item: result[0] });
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    await sbDelete('insights_posts', `id=eq.${id}`);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================
// CASES POSTS
// ============================================================
async function handleCases(req, res) {
  const { id, slug } = req.query || {};

  if (req.method === 'GET') {
    if (id) {
      const rows = await sbSelect('cases_posts', { filter: `id=eq.${id}` });
      if (!rows.length) return res.status(404).json({ error: '사례를 찾을 수 없습니다.' });
      return res.status(200).json({ item: rows[0] });
    }
    if (slug) {
      const rows = await sbSelect('cases_posts', { filter: `slug=eq.${slug}` });
      if (!rows.length) return res.status(404).json({ error: '사례를 찾을 수 없습니다.' });
      return res.status(200).json({ item: rows[0] });
    }
    const rows = await sbSelect('cases_posts', {
      order: 'published_at.desc.nullslast,created_at.desc',
    });
    return res.status(200).json({ items: rows });
  }
  if (req.method === 'POST') {
    const d = req.body || {};
    if (!d.title || !d.client) return res.status(400).json({ error: 'title, client는 필수입니다.' });
    const row = {
      slug: d.slug?.trim() || slugify(`${d.client}-${d.title}`, 'case'),
      client: d.client,
      industry: d.industry || '기타',
      title: d.title,
      excerpt: d.excerpt || null,
      challenge: d.challenge || null,
      approach: d.approach || null,
      result: d.result || null,
      quote_body: d.quote_body || null,
      quote_author: d.quote_author || null,
      stats: d.stats || null,
      tags: Array.isArray(d.tags) ? d.tags : null,
      published: d.published ?? false,
      published_at: d.published ? (d.published_at || new Date().toISOString()) : null,
    };
    const created = await sbInsert('cases_posts', row);
    return res.status(201).json({ item: created[0] });
  }
  if (req.method === 'PUT') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    const d = req.body || {};
    const updates = {};
    const allowed = ['slug','client','industry','title','excerpt','challenge','approach','result','quote_body','quote_author','stats','tags','published','published_at'];
    for (const k of allowed) if (d[k] !== undefined) updates[k] = d[k];
    if (updates.published === true && !updates.published_at) {
      const existing = await sbSelect('cases_posts', { filter: `id=eq.${id}` });
      if (existing.length && !existing[0].published_at) updates.published_at = new Date().toISOString();
    }
    const result = await sbUpdate('cases_posts', `id=eq.${id}`, updates);
    return res.status(200).json({ item: result[0] });
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    await sbDelete('cases_posts', `id=eq.${id}`);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================
// CONTACT SUBMISSIONS
// ============================================================
async function handleSubmissions(req, res) {
  const { id, status } = req.query || {};

  if (req.method === 'GET') {
    if (id) {
      const rows = await sbSelect('contact_submissions', { filter: `id=eq.${id}` });
      if (!rows.length) return res.status(404).json({ error: '문의를 찾을 수 없습니다.' });
      return res.status(200).json({ item: rows[0] });
    }
    const filter = status ? `status=eq.${status}` : '';
    const rows = await sbSelect('contact_submissions', {
      filter, order: 'created_at.desc', limit: 200,
    });
    return res.status(200).json({ items: rows });
  }
  if (req.method === 'PATCH') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    const d = req.body || {};
    const updates = {};
    for (const k of ['status','assigned_to','note']) if (d[k] !== undefined) updates[k] = d[k];
    if (updates.status && !['new','in_progress','resolved','archived'].includes(updates.status)) {
      return res.status(400).json({ error: '유효하지 않은 status 값입니다.' });
    }
    const result = await sbUpdate('contact_submissions', `id=eq.${id}`, updates);
    return res.status(200).json({ item: result[0] });
  }
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id가 필요합니다.' });
    await sbDelete('contact_submissions', `id=eq.${id}`);
    return res.status(200).json({ ok: true });
  }
  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================
// FILE UPLOAD → GITHUB REPOSITORY
// ============================================================
//
// env vars 필요:
//   GITHUB_TOKEN  : Personal Access Token (repo scope)
//   GITHUB_OWNER  : GitHub username (예: kimdukjin)
//   GITHUB_REPO   : 리포지토리 이름 (예: itcl)
//   GITHUB_BRANCH : (선택) 기본 'main'
//
// 파일 저장 경로: uploads/logos/{timestamp}-{safe-filename}
// 반환 URL: https://raw.githubusercontent.com/{owner}/{repo}/{branch}/uploads/...

async function handleUpload(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || 'main';

  if (!token || !owner || !repo) {
    return res.status(500).json({
      error: 'GitHub 업로드 설정 누락',
      detail: 'Vercel 환경변수에 GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO를 추가해야 합니다.',
      missing: {
        GITHUB_TOKEN: !token,
        GITHUB_OWNER: !owner,
        GITHUB_REPO: !repo,
      },
    });
  }

  const { filename, base64, contentType, folder } = req.body || {};
  if (!filename || !base64) {
    return res.status(400).json({ error: 'filename, base64 필수' });
  }

  // 파일명 안전화 (한글/특수문자 → dash, 영숫자·점·dash·underscore만 남김)
  const ext = (filename.match(/\.[^.]+$/) || [''])[0].toLowerCase();
  const allowedExt = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
  if (!allowedExt.has(ext)) {
    return res.status(400).json({ error: `허용되지 않는 확장자: ${ext}. (png/jpg/gif/svg/webp만 가능)` });
  }

  const base = filename.slice(0, filename.length - ext.length)
    .toLowerCase()
    .replace(/[^\w\-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'file';

  const ts = Date.now();
  const safePath = `${folder || 'uploads/logos'}/${ts}-${base}${ext}`;

  // base64 용량 체크 (디코딩 후 원본 크기 = base64 길이 * 3/4)
  const rawSize = Math.ceil(base64.length * 0.75);
  const MAX_SIZE = 3 * 1024 * 1024; // 3MB
  if (rawSize > MAX_SIZE) {
    return res.status(400).json({ error: `파일이 너무 큽니다 (${Math.round(rawSize/1024)}KB, 최대 3MB).` });
  }

  // GitHub Contents API로 커밋
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${safePath}`;
    const body = {
      message: `chore(admin): upload ${safePath}`,
      content: base64,
      branch,
    };
    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'ITCL-Admin-Uploader',
      },
      body: Buffer.from(JSON.stringify(body), 'utf-8'),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[upload] GitHub API error:', resp.status, text);
      return res.status(502).json({
        error: `GitHub 업로드 실패: HTTP ${resp.status}`,
        detail: text.slice(0, 300),
      });
    }

    const data = await resp.json();
    // raw URL: 해당 브랜치의 파일 직접 접근
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${safePath}`;

    return res.status(201).json({
      ok: true,
      url: rawUrl,
      path: safePath,
      sha: data.content?.sha,
      commit_sha: data.commit?.sha,
    });
  } catch (err) {
    console.error('[upload] error:', err);
    return res.status(500).json({ error: err.message || '업로드 실패' });
  }
}

// ============================================================
// DASHBOARD STATS
// ============================================================
async function handleStats(req, res) {
  const [allSubs, newOnes, inProgress, resolved, insights, cases, admins] = await Promise.all([
    sbSelect('contact_submissions', { select: 'id' }).catch(() => []),
    sbSelect('contact_submissions', { select: 'id', filter: 'status=eq.new' }).catch(() => []),
    sbSelect('contact_submissions', { select: 'id', filter: 'status=eq.in_progress' }).catch(() => []),
    sbSelect('contact_submissions', { select: 'id', filter: 'status=eq.resolved' }).catch(() => []),
    sbSelect('insights_posts', { select: 'id,published' }).catch(() => []),
    sbSelect('cases_posts', { select: 'id,published' }).catch(() => []),
    sbSelect('admin_emails', { select: 'id,is_active' }).catch(() => []),
  ]);

  return res.status(200).json({
    submissions: {
      total: allSubs.length,
      new: newOnes.length,
      in_progress: inProgress.length,
      resolved: resolved.length,
    },
    insights: {
      total: insights.length,
      published: insights.filter(r => r.published).length,
      drafts: insights.filter(r => !r.published).length,
    },
    cases: {
      total: cases.length,
      published: cases.filter(r => r.published).length,
      drafts: cases.filter(r => !r.published).length,
    },
    admin_emails: {
      total: admins.length,
      active: admins.filter(r => r.is_active).length,
    },
  });
}
