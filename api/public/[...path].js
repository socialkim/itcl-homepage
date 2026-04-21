// ITCL · 공개 API 통합 핸들러 (Vercel catch-all 라우트)
// /api/public/* 모든 요청.
//
// 엔드포인트:
//   GET /api/public/config           - 공개 사이트 설정
//   GET /api/public/section?page=X   - 페이지 콘텐츠
//   GET /api/public/insights          - 게시된 인사이트 목록
//   GET /api/public/insights?slug=X   - 인사이트 단건
//   GET /api/public/cases             - 게시된 사례 목록
//   GET /api/public/cases?slug=X      - 사례 단건

import { sbSelect } from '../../lib/supabase-rest.js';

const PUBLIC_CONFIG_KEYS = new Set([
  'company_name_ko', 'company_name_en', 'company_short', 'tagline',
  'logo_url', 'phone', 'email', 'address', 'biz_reg_no', 'site_url',
  'sns_instagram', 'sns_youtube', 'sns_linkedin', 'founded_year',
]);

const ALLOWED_PAGES = new Set(['home','about','services','leaders','partners','programs','resources','clients']);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let resource = '';
  try {
    const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const parts = u.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('public');
    if (idx >= 0 && parts[idx + 1]) resource = parts[idx + 1];
  } catch {}
  if (!resource) {
    const segs = Array.isArray(req.query.path) ? req.query.path : (req.query.path ? [req.query.path] : []);
    resource = segs[0] || '';
  }

  try {
    switch (resource) {
      case 'config':   return await handleConfig(req, res);
      case 'section':  return await handleSection(req, res);
      case 'insights': return await handleInsights(req, res);
      case 'cases':    return await handleCases(req, res);
      default:
        return res.status(404).json({ error: `unknown resource: ${resource}` });
    }
  } catch (err) {
    console.error(`[public/${resource}] error:`, err);
    return res.status(500).json({ error: err.message || '서버 오류' });
  }
}

async function handleConfig(req, res) {
  try {
    const rows = await sbSelect('site_config', { select: 'key,value' });
    const out = {};
    for (const r of rows) if (PUBLIC_CONFIG_KEYS.has(r.key)) out[r.key] = r.value;
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json(out);
  } catch (err) {
    // fallback
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).json({
      company_name_ko: 'IT커뮤니케이션연구소',
      company_short: 'ITCL',
      tagline: '사람과 AI의 연결을 만드는 전문 교육 파트너',
      phone: '02-6953-3379',
      email: 'info@itcl.kr',
      address: '서울 마포구 월드컵로 190, 이안상암2 12층 1205호',
    });
  }
}

async function handleSection(req, res) {
  const page = (req.query && req.query.page) || '';
  if (!ALLOWED_PAGES.has(page)) return res.status(400).json({ error: '유효하지 않은 page' });

  const rows = await sbSelect('page_sections', {
    filter: `page_key=eq.${page}`, select: 'content,updated_at',
  });
  if (!rows.length) {
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(404).json({ error: '콘텐츠가 없습니다.' });
  }
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json(rows[0]);
}

async function handleInsights(req, res) {
  const { slug, id, limit } = req.query || {};

  if (slug) {
    const rows = await sbSelect('insights_posts', { filter: `slug=eq.${slug}&published=eq.true` });
    if (!rows.length) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    return res.status(200).json({ item: rows[0] });
  }
  if (id) {
    const rows = await sbSelect('insights_posts', { filter: `id=eq.${id}&published=eq.true` });
    if (!rows.length) return res.status(404).json({ error: '글을 찾을 수 없습니다.' });
    return res.status(200).json({ item: rows[0] });
  }
  const rows = await sbSelect('insights_posts', {
    filter: 'published=eq.true',
    order: 'published_at.desc',
    limit: Math.min(parseInt(limit) || 50, 100),
    select: 'id,slug,category,title,excerpt,author_name,author_init,read_min,featured,published_at',
  });
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ items: rows });
}

async function handleCases(req, res) {
  const { slug, id, limit } = req.query || {};

  if (slug) {
    const rows = await sbSelect('cases_posts', { filter: `slug=eq.${slug}&published=eq.true` });
    if (!rows.length) return res.status(404).json({ error: '사례를 찾을 수 없습니다.' });
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    return res.status(200).json({ item: rows[0] });
  }
  if (id) {
    const rows = await sbSelect('cases_posts', { filter: `id=eq.${id}&published=eq.true` });
    if (!rows.length) return res.status(404).json({ error: '사례를 찾을 수 없습니다.' });
    return res.status(200).json({ item: rows[0] });
  }
  const rows = await sbSelect('cases_posts', {
    filter: 'published=eq.true', order: 'published_at.desc',
    limit: Math.min(parseInt(limit) || 50, 100),
  });
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  return res.status(200).json({ items: rows });
}
